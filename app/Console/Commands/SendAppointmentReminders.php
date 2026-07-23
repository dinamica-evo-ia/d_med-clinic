<?php

namespace App\Console\Commands;

use App\Mail\AppointmentReminder;
use App\Models\Appointment;
use App\Models\AttendantSetting;
use App\Models\Tenant;
use App\Support\AttendantNotifier;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Lembrete da consulta + confirmação do paciente. Roda pelo scheduler a cada 15 min
 * (ver routes/console.php).
 *
 * Duas passadas, ambas configuráveis por clínica em /atendente:
 *
 *  1) LEMBRETE — no dia (D − `reminder_days_before`), a partir de `reminder_hour`.
 *     Marca `reminded_at`, que é o que deixa a consulta 🟡 na agenda.
 *  2) INSISTÊNCIA — `insist_hours_before` horas antes da consulta, UMA vez, só pra quem
 *     não confirmou. Marca `insisted_at`.
 *
 * A hora fixa substituiu a antiga janela de 23h–25h: com a janela, quem tinha consulta às
 * 7h da manhã recebia o lembrete às 7h da manhã do dia anterior. Agora todo mundo é avisado
 * no mesmo horário civilizado, escolhido pela clínica.
 *
 * "A partir de" (e não "exatamente às"): se o servidor estiver fora do ar na hora certa, a
 * rodada seguinte ainda pega o lembrete no mesmo dia em vez de perdê-lo em silêncio.
 *
 * WhatsApp é o canal principal; e-mail só sai se o SMTP estiver configurado (por muito tempo
 * este comando era só e-mail e nunca enviou nada, porque MAIL_* está vazio — pendência 0b).
 */
class SendAppointmentReminders extends Command
{
    /** Tudo aqui raciocina na hora de parede da clínica, não na do servidor. */
    private const TZ = 'America/Sao_Paulo';

    protected $signature = 'appointments:send-reminders
                            {--tenant= : Só esta clínica (id ou slug)}
                            {--dry : Só mostra o que enviaria}';

    protected $description = 'Envia o lembrete de 24h das consultas (WhatsApp + e-mail se houver SMTP)';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');
        $tenants = $this->option('tenant')
            ? Tenant::where('id', $this->option('tenant'))->orWhere('data->slug', $this->option('tenant'))->get()
            : Tenant::all();

        $zap = 0;
        $mail = 0;
        $insistidos = 0;

        foreach ($tenants as $tenant) {
            tenancy()->initialize($tenant);
            try {
                $s = AttendantSetting::current();
                $podeZap = $s->enabled && $s->isWhatsappConnected();

                // Sem canal nenhum: sai FORA em vez de marcar reminded_at. Marcar aqui
                // engoliria o lembrete em silêncio — e quando o WhatsApp fosse conectado,
                // a consulta já estaria marcada como avisada e ninguém receberia nada.
                if (! $podeZap && ! $this->mailConfigurado()) {
                    continue;
                }
                if (! $s->reminder_enabled) {
                    continue; // clínica desligou o lembrete
                }

                $agora = Carbon::now(self::TZ);
                $dias = $s->diasDeAntecedencia();
                $hora = $s->horaDoLembrete();

                /*
                 * PASSADA 1 — lembrete. Só depois da hora escolhida, e só pras consultas do
                 * dia-alvo. `reminded_at` evita reenvio: sem ele, toda rodada mandaria de novo.
                 */
                if ($agora->format('H:i') >= $hora) {
                    $alvo = $agora->copy()->addDays($dias);

                    $appointments = Appointment::with(['patient', 'doctor'])
                        ->whereNull('reminded_at')
                        ->whereIn('status', ['scheduled', 'confirmed'])
                        ->whereBetween('starts_at', [$alvo->copy()->startOfDay(), $alvo->copy()->endOfDay()])
                        ->get();

                    foreach ($appointments as $appointment) {
                        $quem = $appointment->patient?->name ?? '?';
                        $quando = Carbon::parse($appointment->starts_at)->format('d/m H:i');
                        $this->line(($dry ? '[dry] ' : '')."{$tenant->name}: lembrete → {$quem} — {$quando}");

                        if ($dry) {
                            continue;
                        }

                        if ($podeZap) {
                            AttendantNotifier::reminder($appointment, $dias); // engole erro por dentro
                            $zap++;
                        }

                        if ($this->mailConfigurado() && $appointment->patient?->email) {
                            try {
                                Mail::to($appointment->patient->email)->send(new AppointmentReminder($appointment));
                                $mail++;
                            } catch (\Throwable $e) {
                                $this->warn("e-mail falhou ({$appointment->patient->email}): ".$e->getMessage());
                            }
                        }

                        // marca mesmo se um canal falhar: o notifier engole o erro pra nunca quebrar
                        // o CRM, e sem a marca a próxima rodada tentaria de novo, em loop.
                        $appointment->update(['reminded_at' => now()]);
                    }
                }

                /*
                 * PASSADA 2 — insistência. UMA vez, perto da consulta, só pra quem foi avisado
                 * e não respondeu (status ainda 'scheduled'). Quem já confirmou não é cobrado
                 * de novo, e quem nunca recebeu o 1º aviso também não — seria estranho a
                 * primeira mensagem da clínica ser uma cobrança.
                 */
                if ($podeZap && $s->reminder_insist) {
                    $limite = $agora->copy()->addHours($s->horasParaInsistir());

                    $pendentes = Appointment::with(['patient', 'doctor'])
                        ->whereNotNull('reminded_at')
                        ->whereNull('insisted_at')
                        ->where('status', 'scheduled')          // 'confirmed' já respondeu
                        ->whereBetween('starts_at', [$agora, $limite])
                        ->get();

                    foreach ($pendentes as $appointment) {
                        $quem = $appointment->patient?->name ?? '?';
                        $quando = Carbon::parse($appointment->starts_at)->format('d/m H:i');
                        $this->line(($dry ? '[dry] ' : '')."{$tenant->name}: insiste → {$quem} — {$quando}");

                        if ($dry) {
                            continue;
                        }
                        AttendantNotifier::insist($appointment);
                        $appointment->update(['insisted_at' => now()]);
                        $insistidos++;
                    }
                }
            } finally {
                tenancy()->end();
            }
        }

        $this->info(($dry ? '[DRY] ' : '')
            ."lembretes — whatsapp: {$zap} · e-mail: {$mail} · 2ª tentativa: {$insistidos}");

        return self::SUCCESS;
    }

    private function mailConfigurado(): bool
    {
        return filled(config('mail.mailers.smtp.host')) && config('mail.default') !== 'log';
    }
}
