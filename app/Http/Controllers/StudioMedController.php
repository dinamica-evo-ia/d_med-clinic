<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use Carbon\Carbon;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudioMedController extends Controller
{
    public function index()
    {
        return Inertia::render('StudioMed/Index', [
            'patients' => Patient::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function token(Request $r)
    {
        $patient = $r->pacienteId && $r->pacienteId !== 'teste'
            ? Patient::findOrFail($r->pacienteId) : null;

        $sexo = $patient ? match (strtolower((string) $patient->gender)) {
            'm', 'male', 'masculino'  => 'M',
            'f', 'female', 'feminino' => 'F',
            default                   => 'Outro',
        } : null;

        $jwt = JWT::encode([
            'tenant'     => tenant('id'),
            'pacienteId' => (string) ($patient->id ?? 'teste'),
            'medicoId'   => (string) auth()->id(),
            'paciente'   => [
                'nome'       => $patient->name ?? 'Paciente de teste',
                'nascimento' => $patient && $patient->birth_date ? Carbon::parse($patient->birth_date)->format('Y-m-d') : null,
                'sexo'       => $sexo,
            ],
            'iat' => time(),
            'exp' => time() + 3600,
        ], config('services.dmed.secret'), 'HS256');

        return response()->json([
            'studioUrl' => rtrim(config('services.dmed.studio_url'), '/') . '/embed?token=' . $jwt,
            'teste'     => $patient === null,
        ]);
    }

    public function salvarAnamneseIa(Request $r)
    {
        $d = $r->validate([
            'pacienteId'  => ['required'],
            'resumo'      => ['nullable', 'string'],
            'anamnese'    => ['required', 'array'],
            'transcricao' => ['nullable', 'array'],
        ]);

        if ($d['pacienteId'] === 'teste') {
            return response()->json(['ok' => true, 'teste' => true]);
        }

        $a = $d['anamnese'];

        // Resolve doctor_id — match by email or pick first active doctor
        $doctor = Doctor::where('email', auth()->user()->email)->first()
            ?? Doctor::where('is_active', true)->first();
        $doctorId = $doctor?->id;

        $rec = MedicalRecord::create([
            'patient_id'     => $d['pacienteId'],
            'doctor_id'      => $doctorId,
            'appointment_id' => null,
            'anamnesis' => [
                'hda'                     => trim(($a['queixa_principal'] ?? '') . "\n\n" . ($a['historia_doenca_atual'] ?? '')),
                'medicines'               => $a['medicamentos_em_uso'] ?? '',
                'allergies'               => $a['alergias'] ?? '',
                'family_history'          => $a['antecedentes_familiares'] ?? '',
                'antecedentes_pessoais'   => $a['antecedentes_pessoais'] ?? '',
                'habitos_de_vida'         => $a['habitos_de_vida'] ?? '',
                'revisao_de_sistemas'     => $a['revisao_de_sistemas'] ?? '',
                'resumo'                  => $d['resumo'] ?? '',
                'alertas'                 => $a['alertas'] ?? [],
            ],
            'physical_exam' => [
                'PA' => '', 'FC' => '', 'FR' => '', 'Temp' => '', 'SpO2' => '',
                'Peso' => '', 'Altura' => '', 'IMC' => '',
                'description' => $a['exame_fisico'] ?? '',
            ],
            'diagnosis' => ($a['hipoteses_diagnosticas'] ?? '') !== '' ? [[
                'type'        => 'principal',
                'code'        => '',
                'description' => $a['hipoteses_diagnosticas'],
                'notes'       => 'Sugerido pela IA — revisar e codificar (CID)',
            ]] : [],
            'prescriptions' => [],
            'notes'         => $a['conduta'] ?? '',
            'transcricao'   => $d['transcricao'] ?? [],
            'origem'        => 'studio_med',
        ]);

        return response()->json(['ok' => true, 'id' => $rec->id]);
    }
}
