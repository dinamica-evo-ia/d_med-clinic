<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\AttendantConversation;
use App\Models\AttendantKnowledge;
use App\Models\AttendantMessage;
use App\Models\AttendantSetting;
use App\Models\Doctor;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Cérebro do "D_Med Atende": lê a conversa, usa Claude (com ferramentas de agenda) pra
 * responder o paciente no WhatsApp e, se autorizado, marcar a consulta na agenda do CRM.
 * Roda dentro do tenant já inicializado (chamado pelo webhook).
 */
class AttendantAI
{
    private const TZ = 'America/Sao_Paulo';

    public function __construct(
        private AttendantSetting $s,
        private AttendantConversation $conv,
    ) {}

    /** Responde se as condições permitirem (ligado, conectado, autonomia, chave configurada). */
    public static function maybeRespond(AttendantConversation $conv): void
    {
        // Humano assumiu (handoff) ou conversa fechada → a IA não responde.
        if (in_array($conv->status, ['handoff', 'closed'], true)) {
            return;
        }

        $s = AttendantSetting::current();
        if (! $s->enabled || ! $s->isWhatsappConnected() || $s->autonomy === 'suggest' || ! Claude::configured()) {
            return; // suggest = humano responde; sem chave/desligado = não faz nada
        }

        try {
            (new self($s, $conv))->respond();
        } catch (\Throwable $e) {
            Log::warning('AttendantAI falhou: '.$e->getMessage());
        }
    }

    public function respond(): void
    {
        Carbon::setLocale('pt_BR');
        $tools = $this->tools();
        $messages = $this->history();
        $reply = null;

        for ($i = 0; $i < 5; $i++) { // limite de rodadas de ferramenta
            $resp = Claude::messages([
                'system' => $this->systemPrompt(),
                'messages' => $messages,
                'tools' => $tools,
                'max_tokens' => 1024,
            ]);

            $content = $resp['content'] ?? [];
            if (($resp['stop_reason'] ?? 'end_turn') === 'tool_use') {
                $messages[] = ['role' => 'assistant', 'content' => $content];
                $results = [];
                foreach ($content as $block) {
                    if (($block['type'] ?? null) === 'tool_use') {
                        $out = $this->runTool($block['name'], $block['input'] ?? []);
                        $results[] = [
                            'type' => 'tool_result',
                            'tool_use_id' => $block['id'],
                            'content' => json_encode($out, JSON_UNESCAPED_UNICODE),
                        ];
                    }
                }
                $messages[] = ['role' => 'user', 'content' => $results];
                continue;
            }

            $reply = trim(implode("\n", array_map(
                fn ($b) => $b['text'] ?? '',
                array_filter($content, fn ($b) => ($b['type'] ?? null) === 'text')
            )));
            break;
        }

        if ($reply !== null && $reply !== '') {
            Waduck::sendText($this->s, $this->conv->contact_phone, $reply);
            AttendantMessage::create([
                'conversation_id' => $this->conv->id,
                'direction' => 'out',
                'author_type' => 'ai',
                'body' => $reply,
            ]);
            $this->conv->update(['last_message_at' => now()]);
        }
    }

    // ---------- prompt ----------

    private function systemPrompt(): string
    {
        Carbon::setLocale('pt_BR');
        $clinic = tenant()?->name ?? 'a clínica';
        $bot = $this->s->bot_name ?: 'Atendente';
        $today = Carbon::now(self::TZ)->isoFormat('dddd, D [de] MMMM [de] YYYY, HH:mm');

        $patient = $this->conv->patient_id ? Patient::find($this->conv->patient_id) : null;
        $pctx = $patient
            ? "O paciente JÁ É CADASTRADO: {$patient->name} (id {$patient->id}). Trate pelo nome."
            : "O contato ainda não está vinculado a um cadastro. Telefone: {$this->conv->contact_phone}.";

        $faq = AttendantKnowledge::where('is_active', true)->get(['title', 'content'])
            ->map(fn ($k) => "- {$k->title}: {$k->content}")->implode("\n");
        $faqBlock = $faq ? "\n\nBase de conhecimento da clínica:\n{$faq}" : '';

        $bookRule = $this->s->autonomy === 'auto_schedule'
            ? 'Você PODE marcar consultas. Confirme médico, dia e horário com o paciente ANTES de chamar agendar_consulta.'
            : 'Você NÃO deve marcar consultas sozinho. Pode informar horários livres, mas peça pro paciente aguardar a confirmação da secretária.';

        $persona = $this->s->persona ? "\n\nInstruções da clínica:\n{$this->s->persona}" : '';
        $tone = $this->s->tone ? " Tom: {$this->s->tone}." : '';

        return <<<TXT
Você é {$bot}, atendente virtual de {$clinic} no WhatsApp. Fale em português do Brasil, curto e natural (é WhatsApp, sem textão).{$tone}

Agora é {$today} (fuso America/Sao_Paulo).
{$pctx}

Objetivo: entender o que o paciente precisa e, quando for agendamento, oferecer horários REAIS (ferramenta consultar_horarios — nunca invente horários) e conduzir a marcação. {$bookRule}

Regras:
- Nunca invente horários, médicos nem informações; use as ferramentas.
- Ao oferecer horários, dê poucas opções claras (dia + hora).
- Não peça dados que já tem. Se precisar cadastrar, peça só o nome.
- Se não souber algo, seja honesto e ofereça falar com a secretária.{$persona}{$faqBlock}
TXT;
    }

    /** Histórico → mensagens Claude (funde mensagens seguidas do mesmo papel). */
    private function history(): array
    {
        $msgs = $this->conv->messages()->latest('id')->limit(20)->get()->reverse();
        $out = [];
        foreach ($msgs as $m) {
            $role = $m->direction === 'in' ? 'user' : 'assistant';
            $body = trim((string) $m->body);
            if ($body === '') {
                continue;
            }
            if ($out && end($out)['role'] === $role) {
                $out[count($out) - 1]['content'] .= "\n".$body;
            } else {
                $out[] = ['role' => $role, 'content' => $body];
            }
        }
        while ($out && $out[0]['role'] !== 'user') {
            array_shift($out);
        }

        return $out ?: [['role' => 'user', 'content' => '(o paciente iniciou a conversa)']];
    }

    // ---------- ferramentas ----------

    private function tools(): array
    {
        $tools = [
            [
                'name' => 'listar_medicos',
                'description' => 'Lista os médicos ativos da clínica (id, nome, especialidade).',
                'input_schema' => ['type' => 'object', 'properties' => (object) []],
            ],
            [
                'name' => 'consultar_horarios',
                'description' => 'Consulta horários livres de um médico nos próximos dias. Use antes de oferecer horários.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'medico_id' => ['type' => 'string', 'description' => 'ID do médico. Se omitido, usa o primeiro ativo.'],
                        'dias' => ['type' => 'integer', 'description' => 'Dias à frente (padrão 7, máx 30).'],
                    ],
                ],
            ],
        ];

        if ($this->s->autonomy === 'auto_schedule') {
            $tools[] = [
                'name' => 'agendar_consulta',
                'description' => 'Marca a consulta na agenda. Só depois de o paciente confirmar médico, dia e horário.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'medico_id' => ['type' => 'string'],
                        'inicio' => ['type' => 'string', 'description' => 'Início em ISO 8601, ex 2026-07-10T14:30:00.'],
                        'duracao_min' => ['type' => 'integer', 'description' => 'Duração em minutos (padrão 30).'],
                        'nome_paciente' => ['type' => 'string', 'description' => 'Nome, se ainda não cadastrado.'],
                    ],
                    'required' => ['medico_id', 'inicio'],
                ],
            ];
        }

        return $tools;
    }

    private function runTool(string $name, array $input): array
    {
        return match ($name) {
            'listar_medicos' => $this->toolListarMedicos(),
            'consultar_horarios' => $this->toolConsultarHorarios($input),
            'agendar_consulta' => $this->toolAgendarConsulta($input),
            default => ['erro' => "Ferramenta desconhecida: {$name}"],
        };
    }

    private function toolListarMedicos(): array
    {
        return [
            'medicos' => Doctor::where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'specialty'])
                ->map(fn ($d) => ['id' => $d->id, 'nome' => $d->name, 'especialidade' => $d->specialty])
                ->all(),
        ];
    }

    private function toolConsultarHorarios(array $input): array
    {
        Carbon::setLocale('pt_BR');
        $days = max(1, min(30, (int) ($input['dias'] ?? 7)));
        $from = Carbon::now(self::TZ);
        $doctor = ! empty($input['medico_id'])
            ? Doctor::find($input['medico_id'])
            : Doctor::where('is_active', true)->orderBy('name')->first();
        if (! $doctor) {
            return ['erro' => 'Nenhum médico ativo na clínica.'];
        }

        $rangeEnd = $from->copy()->addDays($days)->endOfDay();
        $busy = Appointment::where('doctor_id', $doctor->id)
            ->where('status', '!=', 'cancelled')
            ->where('starts_at', '<', $rangeEnd)->where('ends_at', '>', $from)
            ->get(['starts_at', 'ends_at'])
            ->map(fn ($a) => ['start' => $a->starts_at, 'end' => $a->ends_at])->all();

        $slots = collect(DoctorSchedule::freeSlots($doctor, $from, $days, $busy))
            ->take(20)
            ->map(fn ($s) => [
                'inicio' => $s['start'],
                'quando' => Carbon::parse($s['start'])->setTimezone(self::TZ)->isoFormat('ddd D/MM HH:mm'),
            ])->all();

        return [
            'medico' => ['id' => $doctor->id, 'nome' => $doctor->name],
            'horarios_livres' => $slots,
        ];
    }

    private function toolAgendarConsulta(array $input): array
    {
        if ($this->s->autonomy !== 'auto_schedule') {
            return ['erro' => 'Agendamento automático está desligado.'];
        }
        $doctor = ! empty($input['medico_id']) ? Doctor::find($input['medico_id']) : null;
        if (! $doctor) {
            return ['erro' => 'Médico inválido.'];
        }
        if (empty($input['inicio'])) {
            return ['erro' => 'Informe o horário de início.'];
        }

        try {
            $start = Carbon::parse($input['inicio'], self::TZ);
        } catch (\Throwable $e) {
            return ['erro' => 'Data/hora inválida.'];
        }
        $end = $start->copy()->addMinutes((int) ($input['duracao_min'] ?? 30));

        // Paciente: vinculado → por telefone → cria com o nome informado.
        $patient = $this->conv->patient_id ? Patient::find($this->conv->patient_id) : null;
        if (! $patient) {
            $phone = $this->conv->contact_phone;
            $patient = Patient::where('phone', $phone)->orWhere('whatsapp', $phone)->first();
        }
        if (! $patient) {
            $nome = trim($input['nome_paciente'] ?? '') ?: ($this->conv->contact_name ?? '');
            if ($nome === '') {
                return ['erro' => 'Preciso do nome do paciente pra cadastrar antes de marcar.'];
            }
            $patient = Patient::create([
                'name' => $nome,
                'phone' => $this->conv->contact_phone,
                'whatsapp' => $this->conv->contact_phone,
                'status' => 'active',
            ]);
        }
        if (! $this->conv->patient_id) {
            $this->conv->update([
                'patient_id' => $patient->id,
                'contact_name' => $this->conv->contact_name ?: $patient->name,
            ]);
        }

        // Porteiro único: expediente + conflito (mesma regra da recepção/AgentController).
        if ($violation = DoctorSchedule::violation($doctor, $start, $end)) {
            return ['erro' => $violation];
        }
        $conflict = Appointment::where('doctor_id', $doctor->id)
            ->where('status', '!=', 'cancelled')
            ->where('starts_at', '<', $end)->where('ends_at', '>', $start)->exists();
        if ($conflict) {
            return ['erro' => 'Esse horário acabou de ficar ocupado. Ofereça outro.'];
        }

        $appt = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'user_id' => null,
            'starts_at' => $start,
            'ends_at' => $end,
            'status' => 'scheduled',
            'type' => 'consultation',
            'source' => 'atende',
            'external_ref' => 'wa:'.$this->conv->contact_phone,
        ]);

        return [
            'ok' => true,
            'consulta' => [
                'id' => $appt->id,
                'paciente' => $patient->name,
                'medico' => $doctor->name,
                'quando' => $start->isoFormat('dddd, D [de] MMMM [às] HH:mm'),
            ],
        ];
    }
}
