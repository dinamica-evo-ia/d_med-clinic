<?php

namespace App\Http\Controllers;

use App\Models\AnamneseTemplate;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use Carbon\Carbon;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class StudioMedController extends Controller
{
    public function index()
    {
        $doctor = $this->resolveDoctor();
        $templates = $doctor
            ? AnamneseTemplate::where('doctor_id', $doctor->id)
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(['id', 'name', 'description', 'fields', 'is_default'])
            : collect();

        return Inertia::render('StudioMed/Index', [
            'patients' => Patient::orderBy('name')->get(['id', 'name']),
            'templates' => $templates->values(),
            'defaultTemplateId' => $templates->firstWhere('is_default', true)?->id,
        ]);
    }

    public function token(Request $r)
    {
        $r->validate([
            'pacienteId' => ['required'],
            'templateId' => ['nullable', 'string'],
            'acompanhante' => ['nullable', 'array'],
            'acompanhante.nome' => ['nullable', 'string', 'max:120'],
            'acompanhante.vinculo' => ['nullable', 'string', 'max:60'],
        ]);

        $acompanhante = null;
        if ($r->input('acompanhante.nome')) {
            $acompanhante = [
                'nome' => trim((string) $r->input('acompanhante.nome')),
                'vinculo' => trim((string) ($r->input('acompanhante.vinculo') ?: 'Acompanhante')),
            ];
        }

        $patient = $r->pacienteId && $r->pacienteId !== 'teste'
            ? Patient::findOrFail($r->pacienteId) : null;

        $sexo = $patient ? match (strtolower((string) $patient->gender)) {
            'm', 'male', 'masculino'  => 'M',
            'f', 'female', 'feminino' => 'F',
            default                   => 'Outro',
        } : null;

        // Resolve template: o escolhido, ou o padrão do médico logado, ou o padrão do sistema
        $doctor = $this->resolveDoctor();
        $template = null;
        if ($r->templateId) {
            $template = AnamneseTemplate::find($r->templateId);
        }
        if (! $template && $doctor) {
            $template = AnamneseTemplate::where('doctor_id', $doctor->id)
                ->orderByDesc('is_default')
                ->orderBy('created_at')
                ->first();
            // Se o médico não tem nenhum, cria o padrão do sistema on-the-fly
            if (! $template) {
                $template = AnamneseTemplate::create([
                    'doctor_id' => $doctor->id,
                    'name' => 'Anamnese padrão',
                    'description' => 'Modelo padrão do sistema — 10 campos clínicos gerais.',
                    'fields' => AnamneseTemplate::defaultFields(),
                    'is_default' => true,
                ]);
            }
        }

        $templateFields = $template
            ? array_map(fn ($f) => array_intersect_key($f, array_flip(['key', 'label', 'hint'])), $template->fields ?: [])
            : AnamneseTemplate::defaultFields();

        $jwt = JWT::encode([
            'tenant'     => tenant('id'),
            'pacienteId' => (string) ($patient->id ?? 'teste'),
            'medicoId'   => (string) auth()->id(),
            'paciente'   => [
                'nome'       => $patient->name ?? 'Paciente de teste',
                'nascimento' => $patient && $patient->birth_date ? Carbon::parse($patient->birth_date)->format('Y-m-d') : null,
                'sexo'       => $sexo,
            ],
            'template'   => [
                'id' => $template?->id,
                'name' => $template?->name,
                'fields' => $templateFields,
            ],
            'acompanhante' => $acompanhante, // null quando não há
            'iat' => time(),
            'exp' => time() + 3600,
        ], config('services.dmed.secret'), 'HS256');

        return response()->json([
            'studioUrl' => rtrim(config('services.dmed.studio_url'), '/') . '/embed?token=' . $jwt,
            'teste'     => $patient === null,
            'templateSnapshot' => $templateFields,
            'templateName' => $template?->name,
            'acompanhanteSnapshot' => $acompanhante, // devolve pro front pra ele mandar no salvamento
        ]);
    }

    public function salvarAnamneseIa(Request $r)
    {
        $d = $r->validate([
            'pacienteId'       => ['required'],
            'resumo'           => ['nullable', 'string'],
            'anamnese'         => ['required', 'array'],
            'transcricao'      => ['nullable', 'array'],
            'templateSnapshot' => ['nullable', 'array'],
            'templateId'       => ['nullable', 'string'],
            'templateName'     => ['nullable', 'string', 'max:150'],
            'acompanhanteSnapshot' => ['nullable', 'array'],
            'acompanhanteSnapshot.nome' => ['nullable', 'string', 'max:120'],
            'acompanhanteSnapshot.vinculo' => ['nullable', 'string', 'max:60'],
            'terceiraVozNaoIdentificada' => ['nullable', 'boolean'],
            'prescricoes'                  => ['nullable', 'array'],
            'prescricoes.*.medicamento'    => ['required_with:prescricoes', 'string', 'max:255'],
            'prescricoes.*.posologia'      => ['nullable', 'string', 'max:255'],
            'prescricoes.*.via'            => ['nullable', 'string', 'max:60'],
            'prescricoes.*.duracao'        => ['nullable', 'string', 'max:120'],
            'prescricoes.*.observacoes'    => ['nullable', 'string', 'max:500'],
            'prescricoes.*.confianca'      => ['nullable', 'in:alta,media,baixa'],
        ]);

        if ($d['pacienteId'] === 'teste') {
            return response()->json(['ok' => true, 'teste' => true]);
        }

        $a = $d['anamnese'];
        $snapshot = $d['templateSnapshot'] ?? null;

        // Robustez: se o front não mandou o snapshot mas mandou o templateId,
        // reconstrói o snapshot a partir do template (nunca fica sem saber o modelo).
        if ((! is_array($snapshot) || count($snapshot) === 0) && ! empty($d['templateId'])) {
            $tpl = AnamneseTemplate::find($d['templateId']);
            if ($tpl && is_array($tpl->fields)) {
                $snapshot = array_map(fn ($f) => array_intersect_key($f, array_flip(['key', 'label', 'hint'])), $tpl->fields);
            }
        }

        // Resolve doctor_id — match by email ou primeiro médico ativo
        $doctor = Doctor::where('email', auth()->user()->email)->first()
            ?? Doctor::where('is_active', true)->first();

        // Constrói anamnesis: guarda resumo + alertas + TODOS os campos do template como vieram.
        // Isso permite templates customizados sem hardcode do CRM.
        $anamnesis = [
            'resumo'  => $d['resumo'] ?? '',
            'alertas' => $a['alertas'] ?? [],
        ];

        if ($snapshot && is_array($snapshot) && count($snapshot) > 0) {
            // Fluxo NOVO (template dinâmico): usa as keys do snapshot
            foreach ($snapshot as $f) {
                $k = $f['key'] ?? null;
                if (! $k) continue;
                $anamnesis[$k] = $a[$k] ?? '';
            }
        } else {
            // Fluxo LEGADO (retrocompatível — 10 campos fixos do EVO original):
            // mapeia queixa_principal + historia_doenca_atual -> hda, etc.
            $anamnesis = array_merge($anamnesis, [
                'hda'                     => trim(($a['queixa_principal'] ?? '') . "\n\n" . ($a['historia_doenca_atual'] ?? '')),
                'medicines'               => $a['medicamentos_em_uso'] ?? '',
                'allergies'               => $a['alergias'] ?? '',
                'family_history'          => $a['antecedentes_familiares'] ?? '',
                'antecedentes_pessoais'   => $a['antecedentes_pessoais'] ?? '',
                'habitos_de_vida'         => $a['habitos_de_vida'] ?? '',
                'revisao_de_sistemas'     => $a['revisao_de_sistemas'] ?? '',
            ]);
        }

        // Nome do modelo usado — pro prontuário mostrar "Modelo: X" (meta, não é campo clínico).
        if (! empty($d['templateName'])) {
            $anamnesis['_template_nome'] = $d['templateName'];
        }

        // Camada 5: alerta se EVO detectou 3+ vozes sem acompanhante informado
        if (! empty($d['terceiraVozNaoIdentificada']) && empty($d['acompanhanteSnapshot'])) {
            $anamnesis['_terceira_voz_alerta'] = true;
        }

        // Extrai campos "especiais" (exame físico, diagnóstico, conduta) — ficam em suas colunas próprias
        // além de continuar em anamnesis pra retrocompat.
        $exameFisico = $a['exame_fisico'] ?? '';
        $hipoteses = $a['hipoteses_diagnosticas'] ?? '';
        $conduta = $a['conduta'] ?? '';

        // N2 — prescrições que o médico VERBALIZOU na consulta (extraídas pela IA).
        // Entram como RASCUNHO (ai_suggested) — a emissão da receita é sempre manual.
        $prescricoesIa = collect($d['prescricoes'] ?? [])
            ->filter(fn ($p) => ! empty($p['medicamento']))
            ->map(fn ($p) => [
                'medication'   => $p['medicamento'],
                'dosage'       => '',
                'route'        => $p['via'] ?? '',
                'frequency'    => $p['posologia'] ?? '',
                'duration'     => $p['duracao'] ?? '',
                'notes'        => $p['observacoes'] ?? '',
                'ai_suggested' => true,
                'confianca'    => $p['confianca'] ?? 'baixa',
            ])->values()->all();

        $rec = MedicalRecord::create([
            'patient_id'     => $d['pacienteId'],
            'doctor_id'      => $doctor?->id,
            'appointment_id' => null,
            'anamnesis'      => $anamnesis,
            'physical_exam'  => [
                'PA' => '', 'FC' => '', 'FR' => '', 'Temp' => '', 'SpO2' => '',
                'Peso' => '', 'Altura' => '', 'IMC' => '',
                'description' => $exameFisico,
            ],
            'diagnosis' => $hipoteses !== '' ? [[
                'type'        => 'principal',
                'code'        => '',
                'description' => $hipoteses,
                'notes'       => 'Sugerido pela IA — revisar e codificar (CID)',
            ]] : [],
            'prescriptions' => $prescricoesIa,
            'notes'         => $conduta,
            'transcricao'   => $d['transcricao'] ?? [],
            'anamnese_template_snapshot' => $snapshot,
            'acompanhante_snapshot' => $d['acompanhanteSnapshot'] ?? null,
            'origem'        => 'studio_med',
            'type'          => 'anamnese', // gravação gera história estruturada = anamnese
        ]);

        return response()->json(['ok' => true, 'id' => $rec->id]);
    }

    protected function resolveDoctor(): ?Doctor
    {
        $email = auth()->user()?->email;
        return Doctor::where('email', $email)->first()
            ?? Doctor::where('is_active', true)->orderBy('name')->first();
    }
}
