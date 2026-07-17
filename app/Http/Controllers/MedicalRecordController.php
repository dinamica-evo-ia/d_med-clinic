<?php

namespace App\Http\Controllers;

use App\Models\MedicalRecord;
use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MedicalRecordController extends Controller
{
    public function index(Patient $patient)
    {
        $records = $patient->medicalRecords()
            ->with('doctor:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('MedicalRecords/Index', [
            'patient' => $patient->only(['id', 'name']),
            'records' => $records,
        ]);
    }

    public function create(Request $request, Patient $patient)
    {
        $doctors = \App\Models\Doctor::where('is_active', true)->get(['id', 'name']);
        $type = $request->query('type') === 'anamnese' ? 'anamnese' : 'evolucao';

        return Inertia::render('MedicalRecords/Form', [
            'patient' => $patient->only(['id', 'name']),
            'record' => null,
            'doctors' => $doctors,
            'type' => $type,
        ]);
    }

    public function edit(Patient $patient, MedicalRecord $record)
    {
        $doctors = \App\Models\Doctor::where('is_active', true)->get(['id', 'name']);

        return Inertia::render('MedicalRecords/Form', [
            'patient' => $patient->only(['id', 'name']),
            'record' => $record->load('doctor:id,name'),
            'doctors' => $doctors,
        ]);
    }

    public function store(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'chief_complaint' => 'nullable|string',
            'anamnesis' => 'nullable|array',
            'physical_exam' => 'nullable|array',
            'diagnosis' => 'nullable|array',
            'prescriptions' => 'nullable|array',
            'exam_requests' => 'nullable|array',
            'certificates' => 'nullable|array',
            'notes' => 'nullable|string',
            'type' => 'nullable|in:anamnese,evolucao',
        ]);

        $validated['patient_id'] = $patient->id;
        $validated['type'] = $validated['type'] ?? 'evolucao';

        // If doctor_id not set, use the logged user's doctor profile
        if (empty($validated['doctor_id'])) {
            $doctor = \App\Models\Doctor::where('user_id', auth()->id())->first();
            $validated['doctor_id'] = $doctor?->id;
        }

        MedicalRecord::create($validated);

        // Update appointment status if linked
        if (!empty($validated['appointment_id'])) {
            \App\Models\Appointment::where('id', $validated['appointment_id'])
                ->where('status', '!=', 'completed')
                ->update(['status' => 'completed']);
        }

        return redirect()->route('patients.records.index', $patient->id)
            ->with('success', 'Prontuário salvo com sucesso.');
    }

    public function show(Patient $patient, MedicalRecord $record)
    {
        $record->load(['doctor:id,name', 'appointment:id,starts_at']);

        // O botão "Configurar modelo de PDF" só aparece enquanto o médico ainda
        // não salvou o modelo de impressão (cabeçalho) — depois disso, some.
        $doctorFull = $record->doctor_id ? \App\Models\Doctor::find($record->doctor_id) : null;
        $pdfModeloConfigurado = ! is_null($doctorFull?->print_settings);

        return Inertia::render('MedicalRecords/Show', [
            'patient' => $patient->only(['id', 'name', 'phone', 'whatsapp']),
            'record' => $record,
            'pdfModeloConfigurado' => $pdfModeloConfigurado,
        ]);
    }

    /**
     * Envia o Resumo da Consulta como PDF pro WhatsApp do paciente.
     * Usa a mesma conexão de WhatsApp do Atendente (AttendantSetting) e o
     * cabeçalho do modelo de impressão do médico (print_settings).
     */
    public function enviarResumo(Patient $patient, MedicalRecord $record)
    {
        $record->load('doctor');

        $resumo = trim((string) data_get($record->anamnesis, 'resumo', ''));
        if ($resumo === '') {
            return response()->json(['error' => 'Este prontuário não tem resumo para enviar.'], 422);
        }

        $phone = preg_replace('/\D/', '', (string) ($patient->whatsapp ?: $patient->phone));
        if (strlen($phone) < 10) {
            return response()->json(['error' => 'O paciente não tem WhatsApp/telefone válido no cadastro.'], 422);
        }
        if (strlen($phone) <= 11) {
            $phone = '55'.$phone; // BR sem DDI
        }

        $s = \App\Models\AttendantSetting::current();
        if (! $s->isWhatsappConnected()) {
            return response()->json(['error' => 'O WhatsApp da clínica não está conectado. Conecte em Atendente IA → WhatsApp.'], 422);
        }

        // Cabeçalho: modelo de impressão do médico + dados da clínica
        $settings = $record->doctor
            ? \App\Support\PrintSettings::forDoctor($record->doctor)
            : \App\Support\PrintSettings::defaults();
        $logoAbs = ! empty($settings['header']['logo_path'])
            && \Illuminate\Support\Facades\Storage::disk('public')->exists($settings['header']['logo_path'])
            ? \Illuminate\Support\Facades\Storage::disk('public')->path($settings['header']['logo_path'])
            : null;

        $clinic = \App\Models\ClinicProfile::first();
        $endereco = $clinic
            ? trim(implode(', ', array_filter([$clinic->street, $clinic->number, $clinic->district, $clinic->city ? $clinic->city.'/'.$clinic->state : null])))
            : '';

        $nasc = $patient->birth_date ? \Carbon\Carbon::parse($patient->birth_date) : null;

        // Evita "Dr. Dr. Fulano" quando o nome do médico já vem com o prefixo.
        $medicoNome = trim((string) ($record->doctor->name ?? ''));
        $prefixo = trim((string) ($settings['header']['prefix'] ?? ''));
        if ($prefixo !== '' && str_starts_with(mb_strtolower($medicoNome), mb_strtolower($prefixo))) {
            $prefixo = '';
        }

        $alertas = array_values(array_filter((array) data_get($record->anamnesis, 'alertas', [])));

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.patient-summary', [
            'clinicName' => $clinic->legal_name ?? tenant()?->name ?? 'Clínica',
            'clinicEndereco' => $endereco,
            'clinicFone' => $clinic->whatsapp ?? $clinic->phone ?? '',
            'logoAbs' => $logoAbs,
            'medicoNome' => $medicoNome,
            'medicoPrefixo' => $prefixo,
            'medicoEspecialidade' => $settings['header']['specialty'] ?? '',
            'pacienteNome' => $patient->name,
            'pacienteIdade' => $nasc ? (int) $nasc->diffInYears(now()) : null,
            'dataConsulta' => $record->created_at->format('d/m/Y'),
            'horaConsulta' => $record->created_at->format('H:i'),
            'resumo' => $resumo,
            'alertas' => $alertas,
            'conduta' => trim((string) $record->notes),
        ])->setPaper('a4');

        $nomeArquivo = 'Resumo-Consulta-'.$record->created_at->format('d-m-Y').'.pdf';
        $primeiroNome = explode(' ', trim($patient->name))[0] ?: 'paciente';
        $caption = "Olá, {$primeiroNome}! Segue o resumo da sua consulta de {$record->created_at->format('d/m/Y')}. Qualquer dúvida, estamos à disposição. 💙";

        try {
            \App\Support\Whatsapp\Whatsapp::sendDocument($s, $phone, base64_encode($pdf->output()), $nomeArquivo, $caption);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Falha no envio pelo WhatsApp: '.$e->getMessage()], 500);
        }

        return response()->json(['ok' => true, 'phone' => $phone]);
    }

    // Página imprimível de "Resumo para o paciente" — o médico entrega no final da consulta
    // pra o paciente levar pra casa/mostrar aos familiares. Sem dados clínicos técnicos.
    public function patientSummary(Patient $patient, MedicalRecord $record)
    {
        $record->load(['doctor:id,name', 'appointment:id,starts_at']);
        $tenant = tenant();
        return Inertia::render('MedicalRecords/PatientSummary', [
            'patient' => $patient->only(['id', 'name', 'birth_date']),
            'record' => $record,
            'clinic' => [
                'name' => $tenant?->name,
            ],
        ]);
    }

    public function update(Request $request, Patient $patient, MedicalRecord $record)
    {
        $validated = $request->validate([
            'chief_complaint' => 'nullable|string',
            'anamnesis' => 'nullable|array',
            'physical_exam' => 'nullable|array',
            'diagnosis' => 'nullable|array',
            'prescriptions' => 'nullable|array',
            'exam_requests' => 'nullable|array',
            'certificates' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $record->update($validated);

        return redirect()->route('patients.records.show', [$patient->id, $record->id])
            ->with('success', 'Prontuário atualizado com sucesso.');
    }
}
