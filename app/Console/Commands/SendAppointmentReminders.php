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
 * Lembrete de 24h da consulta. Roda pelo scheduler a cada 15 min (ver routes/console.php).
 *
 * WhatsApp é o canal principal; e-mail só sai se o SMTP estiver configurado (por muito tempo
 * este comando era só e-mail e nunca enviou nada, porque MAIL_* está vazio — ver pendência 0b
 * no handoff).
 *
 * Janela 23h–25h: pega a consulta quando ela entra na faixa de "amanhã"; com cron de 15 em 15
 * min sobra folga, então uma rodada que falhe não perde o lembrete. Quem marca com MENOS de
 * 23h de antecedência não recebe — acabou de agendar, já sabe.
 *
 * `reminded_at` evita reenvio: sem ele toda rodada dentro da janela mandaria de novo.
 */
class SendAppointmentReminders extends Command
{
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

                $appointments = Appointment::with(['patient', 'doctor'])
                    ->whereNull('reminded_at')
                    ->whereIn('status', ['scheduled', 'confirmed'])
                    ->whereBetween('starts_at', [Carbon::now()->addHours(23), Carbon::now()->addHours(25)])
                    ->get();

                foreach ($appointments as $appointment) {
                    $quem = $appointment->patient?->name ?? '?';
                    $quando = Carbon::parse($appointment->starts_at)->format('d/m H:i');
                    $this->line(($dry ? '[dry] ' : '')."{$tenant->name}: {$quem} — {$quando}");

                    if ($dry) {
                        continue;
                    }

                    if ($podeZap) {
                        AttendantNotifier::reminder($appointment); // engole erro por dentro
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
            } finally {
                tenancy()->end();
            }
        }

        $this->info(($dry ? '[DRY] ' : '')."lembretes — whatsapp: {$zap} · e-mail: {$mail}");

        return self::SUCCESS;
    }

    private function mailConfigurado(): bool
    {
        return filled(config('mail.mailers.smtp.host')) && config('mail.default') !== 'log';
    }
}
