<?php

namespace App\Console\Commands;

use App\Models\AttendantSetting;
use App\Models\Patient;
use App\Models\Tenant;
use App\Support\AttendantNotifier;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Parabéns de aniversário pelo WhatsApp, em nome da clínica.
 *
 * Roda junto com o lembrete (scheduler, a cada 15 min) e dispara a partir da hora escolhida
 * pela clínica — 07:00 por padrão, antes de abrir. "A partir de" e não "exatamente às": se o
 * servidor estiver fora do ar às 7h, a rodada seguinte ainda manda no mesmo dia.
 *
 * Nasce DESLIGADO. É mensagem que sai sozinha pra base inteira de pacientes; ligar é decisão
 * do dono da clínica, não default de sistema.
 *
 * `patients.birthday_greeted_at` impede o envio duplo no mesmo dia — e, por guardar a data,
 * volta a valer no ano seguinte sem precisar de reset.
 */
class SendBirthdayGreetings extends Command
{
    private const TZ = 'America/Sao_Paulo';

    protected $signature = 'patients:send-birthday-greetings
                            {--tenant= : Só esta clínica (id ou slug)}
                            {--dry : Só mostra pra quem mandaria}';

    protected $description = 'Envia os parabéns de aniversário do dia (WhatsApp), em nome da clínica';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');
        $tenants = $this->option('tenant')
            ? Tenant::where('id', $this->option('tenant'))->orWhere('data->slug', $this->option('tenant'))->get()
            : Tenant::all();

        $enviados = 0;

        foreach ($tenants as $tenant) {
            tenancy()->initialize($tenant);
            try {
                $s = AttendantSetting::current();

                if (! $s->birthday_enabled || ! $s->enabled || ! $s->isWhatsappConnected()) {
                    continue;
                }

                $hoje = Carbon::now(self::TZ);
                if ($hoje->format('H:i') < $s->horaDoParabens()) {
                    continue; // ainda não deu a hora
                }

                /*
                 * Dia e mês, ignorando o ano — e em texto, porque o SQLite guarda a data como
                 * string ("1980-07-23 00:00:00") e não tem função de mês/dia confiável entre
                 * versões. 29/02: em ano sem 29, ninguém recebe; preferi isso a mandar no dia
                 * errado sem a pessoa esperar.
                 */
                $diaMes = $hoje->format('-m-d');

                $aniversariantes = Patient::whereNotNull('birth_date')
                    ->where('status', 'active')
                    ->where(function ($q) {
                        $q->whereNotNull('whatsapp')->orWhereNotNull('phone');
                    })
                    ->get()
                    ->filter(fn ($p) => $p->birth_date && $p->birth_date->format('-m-d') === $diaMes)
                    // já parabenizado HOJE (rodada anterior do mesmo dia)
                    ->filter(fn ($p) => ! $p->birthday_greeted_at || ! $p->birthday_greeted_at->isSameDay($hoje));

                foreach ($aniversariantes as $patient) {
                    // ->age (int); diffInYears no Carbon novo devolve float (40.0009…)
                    $idade = $patient->birth_date->age;
                    $this->line(($dry ? '[dry] ' : '')."{$tenant->name}: {$patient->name} ({$idade} anos)");

                    if ($dry) {
                        continue;
                    }

                    AttendantNotifier::birthday($patient, $s->textoDoParabens($patient->name));
                    // marca mesmo se o envio falhar: o notifier engole o erro pra nunca quebrar
                    // nada, e sem a marca a próxima rodada tentaria de novo, em loop.
                    $patient->update(['birthday_greeted_at' => $hoje->toDateString()]);
                    $enviados++;
                }
            } finally {
                tenancy()->end();
            }
        }

        $this->info(($dry ? '[DRY] ' : '')."parabéns enviados: {$enviados}");

        return self::SUCCESS;
    }
}
