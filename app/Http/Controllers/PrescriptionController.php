<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Support\PrintSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PrescriptionController extends Controller
{
    public function index(Request $request)
    {
        $query = Prescription::with(['patient:id,name', 'doctor:id,name'])
            ->orderBy('created_at', 'desc');

        if ($search = $request->get('search')) {
            $query->whereHas('patient', fn($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($patientId = $request->get('patient_id')) {
            $query->where('patient_id', $patientId);
        }

        return Inertia::render('Prescriptions/Index', [
            'prescriptions' => $query->paginate(15),
            'filters' => ['search' => $search, 'patient_id' => $patientId ?? null],
            'patientName' => $patientId ? optional(Patient::find($patientId))->name : null,
        ]);
    }

    public function create()
    {
        return Inertia::render('Prescriptions/Form', [
            'prescription' => null,
            'patients' => Patient::orderBy('name')->get(['id', 'name']),
            'doctors' => Doctor::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'medicines' => 'required|array|min:1',
            'medicines.*.medication' => 'required|string|max:255',
            'medicines.*.dosage' => 'nullable|string|max:255',
            'medicines.*.route' => 'nullable|string|max:100',
            'medicines.*.frequency' => 'nullable|string|max:255',
            'medicines.*.duration' => 'nullable|string|max:255',
            'medicines.*.quantity' => 'nullable|string|max:255',
            'medicines.*.notes' => 'nullable|string|max:500',
            'notes' => 'nullable|string',
        ]);

        $prescription = Prescription::create($validated);

        if ($request->has('print') && $request->boolean('print')) {
            return redirect()->route('prescriptions.print', $prescription);
        }

        return redirect()->route('prescriptions.index')
            ->with('success', 'Receita criada com sucesso.');
    }

    public function show(Prescription $prescription)
    {
        $prescription->load(['patient:id,name,document', 'doctor']);

        return Inertia::render('Prescriptions/Show', [
            'prescription' => $prescription,
        ]);
    }

    public function print(Prescription $prescription)
    {
        $prescription->load(['patient', 'doctor']);

        // Template configurado em Conta → Configurações → Impressão da receita (por médico).
        $settings = $prescription->doctor
            ? PrintSettings::forDoctor($prescription->doctor)
            : PrintSettings::defaults();
        $settings['header']['logo_url'] = ! empty($settings['header']['logo_path'])
            ? Storage::disk('public')->url($settings['header']['logo_path'])
            : null;

        return Inertia::render('Prescriptions/Print', [
            'prescription' => $prescription,
            'settings' => $settings,
        ]);
    }

    public function destroy(Prescription $prescription)
    {
        $prescription->delete();

        return redirect()->route('prescriptions.index')
            ->with('success', 'Receita removida com sucesso.');
    }
}
