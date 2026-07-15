<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\AttendantConversation;
use App\Models\AttendantMessage;
use App\Models\AttendantSetting;
use App\Support\Whatsapp\Whatsapp;
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

    /**
     * A recepção mudou o horário. NÃO é aviso fechado: pergunta se serve e abre espaço pra
     * remarcar — quem mudou foi a clínica, então a palavra final é do paciente. Se ele
     * responder que não pode, o AttendantAI assume e remarca (ferramenta remarcar_consulta).
     */
    public static function rescheduled(Appointment $appt, $oldStart): void
    {
        self::notify($appt, function ($nome, $quando, $medico) use ($oldStart) {
            $de = $oldStart ? Carbon::parse($oldStart)->setTimezone(self::TZ)->isoFormat('ddd D/MM [às] HH:mm') : null;

            return "Olá{$nome}! Precisamos mudar sua consulta".($medico ? " com {$medico}" : '')
                .($de ? " de {$de} para *{$quando}*." : " para *{$quando}*.")
                ."\n\nConsegue nesse horário? Se não puder, me diz qual *dia* e *período* ficam "
                .'melhor pra você que eu vejo o que tem livre. 🙂';
        });
    }

    /** Lembrete de 24h. Confirma a presença e deixa a porta aberta pra remarcar. */
    public static function reminder(Appointment $appt): void
    {
        self::notify($appt, fn ($nome, $quando, $medico) =>
            "Olá{$nome}! Passando pra lembrar da sua consulta *amanhã*, {$quando}"
            .($medico ? " com {$medico}" : '').".\n\n"
            .'Está tudo certo pra você vir? Se precisar remarcar ou cancelar, é só me avisar por aqui. 🙂'
        );
    }

    private static function notify(Appointment $appt, \Closure $build): void
    {
        try {
            Carbon::setLocale('pt_BR');

            $s = AttendantSetting::current();
            // Atendente desligado = não fala com ninguém, mesmo com o WhatsApp conectado.
            if (! $s->enabled || ! $s->isWhatsappConnected()) {
                return;
            }

            $appt->loadMissing('patient', 'doctor');
            $patient = $appt->patient;
            $phone = $patient?->whatsapp ?: $patient?->phone;
            $phone = $phone ? preg_replace('/\D/', '', $phone) : null;
            if (! $phone) {
                return;
            }

            /*
             * Antes só avisava quem já tinha conversa aberta ou tinha agendado pelo bot — quem
             * foi cadastrado na recepção nunca era avisado de mudança na PRÓPRIA consulta.
             * Agora avisa qualquer paciente com WhatsApp: é sobre a consulta dele, mudada pela
             * clínica. O porteiro é o `enabled` acima.
             *
             * A conversa é criada quando não existe — sem ela a mensagem não entra no histórico
             * e a IA não teria contexto nenhum quando o paciente respondesse "não posso nesse dia".
             */
            $conv = AttendantConversation::where('contact_phone', $phone)->latest('id')->first();
            if (! $conv) {
                $conv = AttendantConversation::create([
                    'patient_id' => $patient?->id,
                    'contact_phone' => $phone,
                    'contact_name' => $patient?->name,
                    'status' => 'open',
                ]);
            } elseif (! $conv->patient_id && $patient) {
                $conv->update(['patient_id' => $patient->id]);
            }

            $nome = $patient?->name ? ' '.strtok($patient->name, ' ') : '';
            $quando = Carbon::parse($appt->starts_at)->setTimezone(self::TZ)->isoFormat('dddd, D [de] MMMM [às] HH:mm');
            $medico = $appt->doctor?->name ? 'Dr(a). '.$appt->doctor->name : null;

            $text = $build($nome, $quando, $medico);
            Whatsapp::sendText($s, $phone, $text);

            // Registra no inbox: a secretária vê que o paciente foi avisado, e a IA ganha o
            // contexto pra continuar o assunto se ele responder.
            AttendantMessage::create([
                'conversation_id' => $conv->id,
                'direction' => 'out',
                'author_type' => 'system',
                'body' => $text,
            ]);
            $conv->update(['last_message_at' => now()]);
        } catch (\Throwable $e) {
            Log::warning('AttendantNotifier falhou: '.$e->getMessage());
        }
    }
}
