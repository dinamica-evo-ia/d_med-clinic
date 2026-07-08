<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\AttendantConversation;
use App\Models\AttendantMessage;
use App\Models\AttendantSetting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Fase 5: quando a recepção cancela/remarca uma consulta no CRM, avisa o paciente no
 * WhatsApp. Só dispara pra quem já se relaciona pela clínica no WhatsApp (agendou pelo bot
 * ou tem conversa aberta) — evita mensagem-surpresa. NUNCA quebra a ação do CRM (try/catch).
 */
class AttendantNotifier
{
    private const TZ = 'America/Sao_Paulo';

    public static function cancelled(Appointment $appt): void
    {
        self::notify($appt, fn ($nome, $quando, $medico) =>
            "Olá{$nome}! Sua consulta de *{$quando}*".($medico ? " com {$medico}" : '')." foi *cancelada*. "
            .'Se quiser remarcar, é só me chamar por aqui. 🙂'
        );
    }

    public static function rescheduled(Appointment $appt, $oldStart): void
    {
        self::notify($appt, function ($nome, $quando, $medico) use ($oldStart) {
            $de = $oldStart ? Carbon::parse($oldStart)->setTimezone(self::TZ)->isoFormat('ddd D/MM [às] HH:mm') : null;

            return "Olá{$nome}! Sua consulta".($medico ? " com {$medico}" : '')
                .($de ? " foi *remarcada* de {$de} para *{$quando}*." : " foi *remarcada* para *{$quando}*.")
                .' Qualquer coisa, estou por aqui. 🙂';
        });
    }

    private static function notify(Appointment $appt, \Closure $build): void
    {
        try {
            Carbon::setLocale('pt_BR');

            $s = AttendantSetting::current();
            if (! $s->isWhatsappConnected()) {
                return;
            }

            $appt->loadMissing('patient', 'doctor');
            $patient = $appt->patient;
            $phone = $patient?->whatsapp ?: $patient?->phone;
            $phone = $phone ? preg_replace('/\D/', '', $phone) : null;
            if (! $phone) {
                return;
            }

            // Só avisa quem já se relaciona por WhatsApp (agendou pelo bot ou tem conversa).
            $conv = AttendantConversation::where('contact_phone', $phone)->latest('id')->first();
            if ($appt->source !== 'atende' && ! $conv) {
                return;
            }

            $nome = $patient?->name ? ' '.strtok($patient->name, ' ') : '';
            $quando = Carbon::parse($appt->starts_at)->setTimezone(self::TZ)->isoFormat('dddd, D [de] MMMM [às] HH:mm');
            $medico = $appt->doctor?->name ? 'Dr(a). '.$appt->doctor->name : null;

            $text = $build($nome, $quando, $medico);
            Waduck::sendText($s, $phone, $text);

            // Registra no inbox (se houver conversa) pra secretária ver que o paciente foi avisado.
            if ($conv) {
                AttendantMessage::create([
                    'conversation_id' => $conv->id,
                    'direction' => 'out',
                    'author_type' => 'system',
                    'body' => $text,
                ]);
                $conv->update(['last_message_at' => now()]);
            }
        } catch (\Throwable $e) {
            Log::warning('AttendantNotifier falhou: '.$e->getMessage());
        }
    }
}
