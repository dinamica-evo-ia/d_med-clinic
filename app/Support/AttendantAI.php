<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\AttendantConversation;
use App\Models\AttendantKnowledge;
use App\Models\AttendantMessage;
use App\Models\AttendantSetting;
use App\Models\ClinicProfile;
use App\Models\Doctor;
use App\Models\InsurancePlan;
use App\Models\Patient;
use App\Support\Whatsapp\Whatsapp;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

// (DoctorNotifier e WebPush vivem no mesmo namespace App\Support — sem import, ver a
// armadilha de namespace documentada em docs/MODULO_ATENDE.md)

/**
 * Cérebro do "D_Med Atende": lê a conversa, usa Claude (com ferramentas de agenda) pra
 * responder o paciente no WhatsApp e, se autorizado, marcar a consulta na agenda do CRM.
 * Roda dentro do tenant já inicializado (chamado pelo webhook).
 */
class AttendantAI
{
    private const TZ = 'America/Sao_Paulo';

    /** Chaves de DoctorSchedule::DAYS em português, pro prompt. */
    private const DIA_PT = [
        'mon' => 'segunda', 'tue' => 'terça', 'wed' => 'quarta', 'thu' => 'quinta',
        'fri' => 'sexta', 'sat' => 'sábado', 'sun' => 'domingo',
    ];

    public function __construct(
        private AttendantSetting $s,
        private AttendantConversation $conv,
    ) {}

    /**
     * Formas de pagamento que a clínica aceita (config da secretária). O prompt, o schema da
     * ferramenta e a trava do agendar_consulta leem TODOS daqui — se divergirem, a IA pergunta
     * uma coisa e o backend exige outra, e a conversa trava sem o paciente entender por quê.
     */
    private function pagamentosAceitos(): array
    {
        return ClinicProfile::current()->aceita();
    }

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

        // Fora do horário de atendimento → manda a mensagem de fora-do-horário (com anti-spam) e não aciona a IA.
        if (! $s->isWithinBusinessHours()) {
            self::sendOffHours($s, $conv);
            return;
        }

        try {
            (new self($s, $conv))->respond();
        } catch (\Throwable $e) {
            Log::warning('AttendantAI falhou: '.$e->getMessage());
        }
    }

    /** Envia a mensagem de fora-do-horário, no máx. 1x a cada 30 min por conversa. */
    private static function sendOffHours(AttendantSetting $s, AttendantConversation $conv): void
    {
        $msg = trim((string) $s->offhours_message);
        if ($msg === '') {
            return;
        }
        $recent = $conv->messages()
            ->where('direction', 'out')->where('author_type', 'system')
            ->where('body', $msg)->where('created_at', '>=', now()->subMinutes(30))->exists();
        if ($recent) {
            return;
        }
        try {
            Whatsapp::sendText($s, $conv->contact_phone, $msg);
            AttendantMessage::create([
                'conversation_id' => $conv->id, 'direction' => 'out',
                'author_type' => 'system', 'body' => $msg,
            ]);
            $conv->update(['last_message_at' => now()]);
        } catch (\Throwable $e) {
            Log::warning('AttendantAI off-hours falhou: '.$e->getMessage());
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
                $messages[] = ['role' => 'assistant', 'content' => $this->fixToolInputs($content)];
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
            Whatsapp::sendText($this->s, $this->conv->contact_phone, $reply);
            AttendantMessage::create([
                'conversation_id' => $this->conv->id,
                'direction' => 'out',
                'author_type' => 'ai',
                'body' => $reply,
            ]);
            $this->conv->update(['last_message_at' => now()]);
        }
    }

    /**
     * Ao devolver os blocos tool_use pro Claude, um input vazio `{}` que o PHP decodificou
     * como `[]` re-serializa como array JSON e a API recusa ("Input should be an object").
     * Força objeto nos inputs vazios.
     */
    private function fixToolInputs(array $content): array
    {
        return array_map(function ($b) {
            if (($b['type'] ?? null) === 'tool_use' && empty($b['input'])) {
                $b['input'] = (object) [];
            }
            return $b;
        }, $content);
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

        // Médicos direto no prompt: o histórico é remontado do banco a cada mensagem e NÃO
        // guarda tool_use/tool_result — sem isso a IA perde o medico_id entre uma mensagem e
        // outra e não consegue chamar agendar_consulta quando o paciente confirma.
        //
        // Os DIAS DE ATENDIMENTO também vão aqui: sem isso a IA oferecia "segunda, terça..."
        // pra um médico que só atende quarta. A regra está no CRM, ela não tinha como saber.
        $medicos = Doctor::where('is_active', true)->orderBy('name')->get()
            ->map(function ($d) {
                $cfg = DoctorSchedule::normalize($d->schedule);
                $dias = [];
                foreach ($cfg['days'] as $k => $c) {
                    if (! empty($c['active'])) {
                        // Períodos, não "abre–fecha": senão a IA oferece 12:30 pra quem
                        // atende 08:00–12:00 e 14:00–18:00 (o almoço sumia da descrição).
                        $dias[] = self::DIA_PT[$k].' '.DoctorSchedule::describeDay($c);
                    }
                }
                $agenda = $dias ? implode('; ', $dias) : 'sem dias configurados';

                // Convênios deste médico: nem todo médico da clínica atende os mesmos.
                $conv = InsurancePlan::aceitosPor($d->id);
                $linhaConv = $conv ? "\n  convênios: ".implode(', ', $conv) : '';

                return "- {$d->name}".($d->specialty ? " ({$d->specialty})" : '')."\n"
                    ."  medico_id: {$d->id}\n"
                    ."  atende: {$agenda}"
                    .$linhaConv;
            })->implode("\n");
        $medicosBlock = $medicos ? "\n\nMédicos ativos:\n{$medicos}" : '';

        /*
         * Convênio só entra na conversa se a clínica aceitar convênio. Nutricionista/psicólogo
         * que só atende particular não tem por que perguntar isso em 100% das conversas — e o
         * paciente que responde "convênio" pra quem não aceita só gera frustração.
         */
        $aceitos = $this->pagamentosAceitos();
        if (count($aceitos) > 1) {
            $pagamentoRule = <<<'P'
- 🔴 SEMPRE pergunte se a consulta é **particular** ou por **convênio** (e QUAL convênio) antes
  de marcar. Não chute nem assuma particular — a recepção confia nesse dado.
  - Se identificar_paciente trouxe `convenio_no_cadastro`, CONFIRME em vez de perguntar do
    zero: "Vejo que você tem Unimed — a consulta é por ele ou particular?". Ter convênio no
    cadastro NÃO quer dizer que hoje é por ele.
  - Sem convênio no cadastro, pergunte aberto: "A consulta é particular ou por convênio?".
P;
        } elseif ($aceitos[0] === 'particular') {
            $pagamentoRule = <<<'P'
- 🔴 Esta clínica atende **somente particular** — NÃO aceita convênio. Não pergunte "particular
  ou convênio?": já marque como particular. Se o paciente perguntar sobre convênio ou disser o
  nome de um plano, avise com educação que o atendimento é particular e siga com a marcação se
  ele quiser.
P;
        } else {
            $pagamentoRule = <<<'P'
- 🔴 Esta clínica atende **somente por convênio** — não faz atendimento particular. Não pergunte
  "particular ou convênio?"; pergunte apenas QUAL é o convênio do paciente antes de marcar.
P;
        }

        $persona = $this->s->persona ? "\n\nInstruções da clínica:\n{$this->s->persona}" : '';
        $tone = $this->s->tone ? " Tom: {$this->s->tone}." : '';
        $welcome = trim((string) $this->s->welcome_message) !== ''
            ? "\n\nSaudação de apresentação (use no primeiro contato, ou algo no mesmo espírito): \"".trim($this->s->welcome_message).'"'
            : '';

        return <<<TXT
Você é {$bot}, atendente virtual de {$clinic} no WhatsApp. Fale em português do Brasil, curto e natural (é WhatsApp, sem textão).{$tone}

Agora é {$today} (fuso America/Sao_Paulo).
{$pctx}

Objetivo: entender o que o paciente precisa e, quando for agendamento, oferecer horários REAIS (ferramenta consultar_horarios — nunca invente horários) e conduzir a marcação. {$bookRule}

Regras:
- Nunca invente horários, médicos nem informações; use as ferramentas.
- 🔴 NUNCA diga que a consulta foi marcada/confirmada/agendada sem que a ferramenta
  agendar_consulta tenha respondido com sucesso NESTA MESMA resposta. Se você só escreveu
  texto, NADA foi marcado — o paciente vai aparecer na clínica e não vai ter consulta.
  Quando o paciente confirmar, CHAME a ferramenta; só depois avise que está marcado.
- 🔴 Ao listar horários, escreva SÓ o que a ferramenta devolveu, com o dia e a hora exatos.
  Não invente rótulo de período: não escreva "de manhã", "à tarde" ou "à noite" por conta
  própria — olhe a hora. Antes de 12:00 é manhã.
- 🔴 NUNCA calcule data nem dia da semana de cabeça. Você erra (já ofereceu "segunda (22/07)"
  quando 22/07 era quarta). O campo "quando" de consultar_horarios já vem com o dia da semana
  escrito — copie dali. Se o paciente pedir "semana que vem" ou "outro dia", chame
  consultar_horarios com dias=21 e ofereça o que voltar; não deduza as datas sozinho.
- Antes de dizer que não tem vaga, confira os dias de atendimento do médico (estão abaixo) e
  chame consultar_horarios com uma janela maior. Médico que atende 1x por semana precisa de
  janela grande — não conclua "não tem horário" a partir de uma busca curta.
- Antes de marcar, você precisa de NOME COMPLETO e CPF pra chamar identificar_paciente. Muita
  gente já é paciente da clínica e o cadastro antigo não tem telefone — sem o CPF você cria um
  cadastro duplicado. Se encontrar, trate a pessoa pelo nome do cadastro e siga.
- Peça UM dado por vez (é WhatsApp): primeiro o nome, na mensagem seguinte o CPF. Não peça os
  dois de uma vez — a pessoa responde só um e você acaba perguntando de novo.
{$pagamentoRule}
- Ao oferecer horários, dê poucas opções claras (dia + hora).
- Não peça dados que já tem.
- Mensagens entre colchetes como [Áudio recebido] ou [Imagem recebida] significam que o paciente mandou uma mídia que você NÃO consegue ver/ouvir — peça gentilmente que ele escreva em texto.
- Se não souber algo, seja honesto e ofereça falar com a secretária.{$medicosBlock}{$welcome}{$persona}{$faqBlock}
TXT;
    }

    /** Histórico → mensagens Claude (funde mensagens seguidas do mesmo papel). */
    private function history(): array
    {
        // ordena por id (não por created_at: só tem precisão de segundo e empata quando o
        // paciente manda duas seguidas). Pega as 20 mais novas, devolve da mais velha pra
        // mais nova — que é como o Claude espera ler a conversa.
        $msgs = $this->conv->messages()->orderByDesc('id')->limit(20)->get()->reverse()->values();
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
                'description' => 'Consulta horários livres de um médico nos próximos dias. Use antes de oferecer '
                    .'horários. Devolve o dia da semana já escrito em cada horário — use esse texto, não calcule '
                    .'datas por conta própria.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'medico_id' => ['type' => 'string', 'description' => 'ID do médico. Se omitido, usa o primeiro ativo.'],
                        'dias' => ['type' => 'integer', 'description' => 'Dias à frente (padrão 21, máx 90). '
                            .'Aumente se vier pouco horário: médico que atende 1x por semana precisa de janela grande.'],
                    ],
                ],
            ],
            [
                'name' => 'identificar_paciente',
                'description' => 'Procura o cadastro do paciente pelo CPF. Use SEMPRE antes de marcar, '
                    .'pra não criar cadastro duplicado de quem já é paciente da clínica.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'cpf' => ['type' => 'string', 'description' => 'CPF do paciente, só números ou com pontuação.'],
                        'nome' => ['type' => 'string', 'description' => 'Nome completo, como o paciente informou.'],
                    ],
                    'required' => ['cpf'],
                ],
            ],
        ];

        if ($this->s->autonomy === 'auto_schedule') {
            // O enum acompanha o que a clínica aceita: numa clínica só-particular o campo some do
            // schema, então a IA não tem nem como mandar "convenio" — e "pagamento" sai do
            // required, senão ela ficaria obrigada a perguntar o que o prompt manda não perguntar.
            $aceitos = $this->pagamentosAceitos();
            $props = [
                'medico_id' => ['type' => 'string'],
                'inicio' => ['type' => 'string', 'description' => 'Início em ISO 8601, ex 2026-07-10T14:30:00. '
                    .'Use exatamente o campo "inicio" que consultar_horarios devolveu.'],
                'duracao_min' => ['type' => 'integer', 'description' => 'Duração em minutos (padrão 30).'],
                'nome_paciente' => ['type' => 'string', 'description' => 'Nome completo, se ainda não cadastrado.'],
                'cpf' => ['type' => 'string', 'description' => 'CPF do paciente. Evita cadastro duplicado.'],
            ];
            $required = ['medico_id', 'inicio'];

            if (count($aceitos) > 1) {
                $props['pagamento'] = ['type' => 'string', 'enum' => $aceitos,
                    'description' => 'Como o paciente vai pagar. PERGUNTE — não chute.'];
                $required[] = 'pagamento';
            }
            if (in_array('convenio', $aceitos, true)) {
                $props['convenio'] = ['type' => 'string', 'description' => count($aceitos) > 1
                    ? 'Nome do convênio. Obrigatório quando pagamento=convenio.'
                    : 'Nome do convênio do paciente. Obrigatório — a clínica só atende por convênio.'];

                /*
                 * Enum com os convênios cadastrados (Configurações → Convênios): sem isso a IA
                 * aceitava qualquer nome que o paciente falasse e marcava a consulta por um
                 * convênio que a clínica não atende. Lista vazia = clínica que ainda não
                 * cadastrou; aí segue texto livre, como era antes.
                 */
                if ($convenios = InsurancePlan::aceitosPor(null)) {
                    $props['convenio']['enum'] = $convenios;
                    $props['convenio']['description'] .= ' SÓ estes: '.implode(', ', $convenios)
                        .'. Se o paciente citar outro, diga que a clínica não atende por ele e ofereça particular.';
                }

                if (count($aceitos) === 1) {
                    $required[] = 'convenio';
                }
            }

            $tools[] = [
                'name' => 'agendar_consulta',
                'description' => 'Marca a consulta na agenda DE VERDADE. Só depois de o paciente confirmar '
                    .'médico, dia e horário. A consulta só existe se esta ferramenta devolver sucesso.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => $props,
                    'required' => $required,
                ],
            ];
            $tools[] = [
                'name' => 'minhas_consultas',
                'description' => 'Lista as próximas consultas do paciente da conversa (id, quando, médico). Use antes de cancelar ou remarcar.',
                'input_schema' => ['type' => 'object', 'properties' => (object) []],
            ];
            $tools[] = [
                'name' => 'cancelar_consulta',
                'description' => 'Cancela uma consulta do paciente. Confirme com ele antes. Passe o consulta_id obtido em minhas_consultas.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => ['consulta_id' => ['type' => 'string']],
                    'required' => ['consulta_id'],
                ],
            ];
            $tools[] = [
                'name' => 'remarcar_consulta',
                'description' => 'Remarca uma consulta do paciente para um novo horário. Confirme o novo horário antes. consulta_id de minhas_consultas + novo início.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'consulta_id' => ['type' => 'string'],
                        'novo_inicio' => ['type' => 'string', 'description' => 'Novo início em ISO 8601.'],
                    ],
                    'required' => ['consulta_id', 'novo_inicio'],
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
            'identificar_paciente' => $this->toolIdentificarPaciente($input),
            'agendar_consulta' => $this->toolAgendarConsulta($input),
            'minhas_consultas' => $this->toolMinhasConsultas(),
            'cancelar_consulta' => $this->toolCancelarConsulta($input),
            'remarcar_consulta' => $this->toolRemarcarConsulta($input),
            default => ['erro' => "Ferramenta desconhecida: {$name}"],
        };
    }

    /** Paciente da conversa (vinculado ou achado por telefone). */
    private function resolvePatient(): ?Patient
    {
        if ($this->conv->patient_id) {
            return Patient::find($this->conv->patient_id);
        }
        $phone = $this->conv->contact_phone;

        return Patient::where('phone', $phone)->orWhere('whatsapp', $phone)->first();
    }

    /** CPF só com dígitos — é assim que a coluna `document` guarda (import veio sem máscara). */
    private static function cpfDigits(?string $cpf): string
    {
        return preg_replace('/\D/', '', (string) $cpf);
    }

    /** Acha o paciente pelo CPF e vincula à conversa. Nome sozinho NÃO identifica (homônimo). */
    private function toolIdentificarPaciente(array $input): array
    {
        $cpf = self::cpfDigits($input['cpf'] ?? '');
        if (strlen($cpf) !== 11) {
            return ['erro' => 'CPF precisa ter 11 dígitos. Peça de novo ao paciente.'];
        }

        $patient = Patient::whereRaw(
            "REPLACE(REPLACE(REPLACE(COALESCE(document,''), '.', ''), '-', ''), ' ', '') = ?",
            [$cpf]
        )->first();

        if (! $patient) {
            return [
                'encontrado' => false,
                'mensagem' => 'Não achei cadastro com esse CPF. Confirme o nome completo e a data '
                    .'de nascimento pra eu cadastrar antes de marcar.',
            ];
        }

        // vincula a conversa e aproveita pra completar o WhatsApp, que o import não trouxe
        $this->conv->update([
            'patient_id' => $patient->id,
            'contact_name' => $patient->name,
        ]);
        if (blank($patient->whatsapp)) {
            $patient->update(['whatsapp' => $this->conv->contact_phone]);
        }

        return [
            'encontrado' => true,
            'paciente' => [
                'id' => $patient->id,
                'nome' => $patient->name,
                'nascimento' => $patient->birth_date
                    ? Carbon::parse($patient->birth_date)->format('d/m/Y')
                    : null,
                // convênio do CADASTRO: serve pra CONFIRMAR ("é pelo Unimed?"), não pra decidir.
                // O paciente pode ter convênio registrado e querer vir particular hoje.
                'convenio_no_cadastro' => $patient->insurance['name'] ?? null,
            ],
        ];
    }

    private function toolMinhasConsultas(): array
    {
        Carbon::setLocale('pt_BR');
        $patient = $this->resolvePatient();
        if (! $patient) {
            return ['erro' => 'Não encontrei seu cadastro pelo telefone.'];
        }

        $appts = Appointment::where('patient_id', $patient->id)
            ->where('status', '!=', 'cancelled')
            ->where('starts_at', '>=', Carbon::now(self::TZ))
            ->orderBy('starts_at')->with('doctor')->limit(10)->get();

        return ['consultas' => $appts->map(fn ($a) => [
            'id' => $a->id,
            'quando' => Carbon::parse($a->starts_at)->setTimezone(self::TZ)->isoFormat('ddd D/MM [às] HH:mm'),
            'medico' => $a->doctor?->name,
        ])->all()];
    }

    private function toolCancelarConsulta(array $input): array
    {
        $patient = $this->resolvePatient();
        $appt = $patient ? Appointment::where('id', $input['consulta_id'] ?? '')
            ->where('patient_id', $patient->id)->where('status', '!=', 'cancelled')->first() : null;
        if (! $appt) {
            return ['erro' => 'Consulta não encontrada ou já cancelada.'];
        }

        $appt->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => 'Cancelado pelo paciente via WhatsApp',
        ]);

        // 🔴 Avisa o médico: sem isto o paciente cancela às 22h e o médico aparece na clínica
        // no dia seguinte esperando atender.
        DoctorNotifier::consultaCancelada($appt->fresh(['doctor', 'patient']));

        return ['ok' => true, 'cancelada' => [
            'quando' => Carbon::parse($appt->starts_at)->setTimezone(self::TZ)->isoFormat('dddd, D [de] MMMM [às] HH:mm'),
        ]];
    }

    private function toolRemarcarConsulta(array $input): array
    {
        Carbon::setLocale('pt_BR');
        $patient = $this->resolvePatient();
        $appt = $patient ? Appointment::where('id', $input['consulta_id'] ?? '')
            ->where('patient_id', $patient->id)->where('status', '!=', 'cancelled')->first() : null;
        if (! $appt) {
            return ['erro' => 'Consulta não encontrada.'];
        }
        if (empty($input['novo_inicio'])) {
            return ['erro' => 'Informe o novo horário.'];
        }

        try {
            $start = Carbon::parse($input['novo_inicio'], self::TZ);
        } catch (\Throwable $e) {
            return ['erro' => 'Data/hora inválida.'];
        }
        $dur = max(5, Carbon::parse($appt->starts_at)->diffInMinutes(Carbon::parse($appt->ends_at)) ?: 30);
        $end = $start->copy()->addMinutes($dur);

        $doctor = Doctor::find($appt->doctor_id);
        if ($doctor && ($violation = DoctorSchedule::violation($doctor, $start, $end))) {
            return ['erro' => $violation];
        }
        $conflict = Appointment::where('doctor_id', $appt->doctor_id)
            ->where('id', '!=', $appt->id)->where('status', '!=', 'cancelled')
            ->where('starts_at', '<', $end)->where('ends_at', '>', $start)->exists();
        if ($conflict) {
            return ['erro' => 'Esse horário já está ocupado. Ofereça outro.'];
        }

        // Guarda o horário ANTES do update — depois dele o valor antigo já se perdeu, e é ele
        // que faz o aviso dizer "de/para" em vez de só "mudou".
        $horarioAntigo = $appt->getOriginal('starts_at');
        $appt->update(['starts_at' => $start, 'ends_at' => $end]);

        DoctorNotifier::consultaRemarcada($appt->fresh(['doctor', 'patient']), $horarioAntigo);

        return ['ok' => true, 'remarcada' => [
            'quando' => $start->isoFormat('dddd, D [de] MMMM [às] HH:mm'),
        ]];
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
        /*
         * Padrão 21 dias, não 7. Com 7, a partir de uma quarta a janela vai de 15/07 a 21/07
         * e PARA NA TERÇA — a quarta seguinte (22/07) fica de fora por um dia. Pra um médico
         * que atende só às quartas, a ferramenta devolvia apenas os horários de hoje e a IA
         * não tinha como ver "a semana que vem". 21 dias garante ~3 ocorrências de qualquer
         * dia da semana.
         */
        $days = max(1, min(90, (int) ($input['dias'] ?? 21)));
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

        /*
         * Agrupa por DIA e corta em dias inteiros — nunca no meio de um dia.
         *
         * Antes era um ->take(20) na lista achatada: com 3 quartas de 8 horários (24), a IA
         * recebia o último dia com só 4 e achava que ele acabava às 09:30. Diria isso ao
         * paciente com toda a confiança, e é mentira — o dia vai até 11:30.
         *
         * `mais_dias` diz quantos dias ficaram de fora, pra IA saber que existe mais coisa em
         * vez de concluir "acabou".
         */
        $porDia = collect(DoctorSchedule::freeSlots($doctor, $from, $days, $busy))
            ->groupBy(fn ($s) => Carbon::parse($s['start'])->setTimezone(self::TZ)->isoFormat('ddd D/MM'));

        $maxDias = 4;
        $mostrar = $porDia->take($maxDias);

        return [
            'medico' => ['id' => $doctor->id, 'nome' => $doctor->name],
            'dias' => $mostrar->map(fn ($slots, $dia) => [
                'dia' => $dia,
                'horarios' => collect($slots)->map(fn ($s) => [
                    'hora' => Carbon::parse($s['start'])->setTimezone(self::TZ)->format('H:i'),
                    'inicio' => $s['start'], // ISO — é ISTO que vai pro agendar_consulta
                ])->values()->all(),
            ])->values()->all(),
            'mais_dias' => max(0, $porDia->count() - $mostrar->count()),
            'janela_dias' => $days,
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

        // Paciente: vinculado → por CPF → por telefone → cria.
        // A ordem importa: a base importada tem CPF em quase todo mundo e telefone em quase
        // ninguém (1521 de 2466 com CPF, 15 com telefone na Clínica RF). Procurar só por
        // telefone criava cadastro DUPLICADO de quem já era paciente.
        $patient = $this->conv->patient_id ? Patient::find($this->conv->patient_id) : null;

        $cpf = self::cpfDigits($input['cpf'] ?? '');
        if (! $patient && strlen($cpf) === 11) {
            $patient = Patient::whereRaw(
                "REPLACE(REPLACE(REPLACE(COALESCE(document,''), '.', ''), '-', ''), ' ', '') = ?",
                [$cpf]
            )->first();
        }
        if (! $patient) {
            $phone = $this->conv->contact_phone;
            $patient = Patient::where('phone', $phone)->orWhere('whatsapp', $phone)->first();
        }
        if (! $patient) {
            $nome = trim($input['nome_paciente'] ?? '') ?: ($this->conv->contact_name ?? '');
            if ($nome === '') {
                return ['erro' => 'Preciso do nome do paciente pra cadastrar antes de marcar.'];
            }
            if (strlen($cpf) !== 11) {
                return ['erro' => 'Preciso do CPF pra conferir se já existe cadastro antes de criar um novo.'];
            }
            $patient = Patient::create([
                'name' => $nome,
                'document' => $cpf,
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

        /*
         * Particular ou convênio. Sem esta trava, o Appointment::create caía no default
         * 'particular' do banco e toda consulta marcada pelo WhatsApp aparecia como particular
         * sem ninguém ter perguntado: dado que PARECE preenchido, e a recepção confia. Pior que
         * vazio. Prompt sozinho não segura isso — por isso valida aqui também.
         *
         * Quando a clínica aceita UMA forma só, não há o que perguntar nem o que validar: a
         * resposta é conhecida, então preenche. Exigir a pergunta aí seria travar a marcação por
         * um dado que a própria clínica já respondeu na configuração.
         */
        $aceitos = $this->pagamentosAceitos();
        $unico = count($aceitos) === 1 ? $aceitos[0] : null;
        $pagamento = $unico ?? ($input['pagamento'] ?? null);

        if (! in_array($pagamento, $aceitos, true)) {
            return ['erro' => 'Pergunte ao paciente se a consulta é PARTICULAR ou por CONVÊNIO antes de marcar.'];
        }
        $convenio = trim((string) ($input['convenio'] ?? ''));
        if ($pagamento === 'convenio' && $convenio === '') {
            return ['erro' => 'Pergunte QUAL é o convênio do paciente antes de marcar.'];
        }

        /*
         * O convênio precisa estar cadastrado E ser atendido por ESTE médico. O enum do schema
         * já orienta, mas orientação não é trava: sem isto a IA marcaria por um convênio que a
         * clínica não atende, e quem descobre é o paciente no balcão.
         * Clínica que ainda não cadastrou nada segue aceitando texto livre.
         */
        if ($pagamento === 'convenio' && ($aceitosConv = InsurancePlan::aceitosPor($doctor->id))) {
            $casado = InsurancePlan::casar($convenio, $doctor->id);
            if (! $casado) {
                return ['erro' => "{$doctor->name} não atende por \"{$convenio}\". Convênios aceitos: "
                    .implode(', ', $aceitosConv).'. Ofereça um destes ou particular.'];
            }
            $convenio = $casado; // grava com a grafia do cadastro
        }

        $appt = Appointment::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'user_id' => null,
            'starts_at' => $start,
            'ends_at' => $end,
            'status' => 'scheduled',
            'type' => 'consultation',
            'payment_type' => $pagamento,
            'insurance_name' => $pagamento === 'convenio' ? $convenio : null,
            'source' => 'atende',
            'external_ref' => 'wa:'.$this->conv->contact_phone,
        ]);

        // Avisa o médico no celular. É AQUI que isso mais importa: a IA marca sozinha, a
        // qualquer hora, e sem o push o médico só descobriria abrindo o CRM.
        DoctorNotifier::consultaMarcada($appt->fresh(['doctor', 'patient']));

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
