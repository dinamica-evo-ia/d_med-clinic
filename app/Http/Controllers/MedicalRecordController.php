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
        return Inertia::render('MedicalRecords/Show', [
            'patient' => $patient->only(['id', 'name']),
            'record' => $record,
        ]);
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
