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

    public function create(Request $request)
    {
        // Pré-preenchimento a partir de uma consulta gravada (Studio Med):
        // /prescriptions/create?patient_id=X&from_record=Y carrega os medicamentos
        // que a IA extraiu da fala do médico. Sempre revisáveis antes de salvar.
        $prefill = null;
        if ($recordId = $request->get('from_record')) {
            $record = \App\Models\MedicalRecord::find($recordId);
            if ($record) {
                $meds = collect($record->prescriptions ?? [])
                    ->filter(fn ($p) => ! empty($p['ai_suggested']) && ! empty($p['medication']))
                    ->map(fn ($p) => [
                        'medication' => $p['medication'],
                        'dosage'     => $p['dosage'] ?? '',
                        'route'      => $p['route'] ?? '',
                        'frequency'  => $p['frequency'] ?? '',
                        'duration'   => $p['duration'] ?? '',
                        'quantity'   => '',
                        'notes'      => $p['notes'] ?? '',
                    ])->values()->all();
                if (count($meds) > 0) {
                    $prefill = [
                        'patient_id' => $record->patient_id,
                        'doctor_id'  => $record->doctor_id,
                        'medicines'  => $meds,
                    ];
                }
            }
        } elseif ($patientId = $request->get('patient_id')) {
            $prefill = ['patient_id' => $patientId, 'doctor_id' => null, 'medicines' => null];
        }

        return Inertia::render('Prescriptions/Form', [
            'prescription' => null,
            'patients' => Patient::orderBy('name')->get(['id', 'name']),
            'doctors' => Doctor::orderBy('name')->get(['id', 'name']),
            'prefill' => $prefill,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'title' => 'nullable|string|max:255',
            'body' => 'nullable|string',
            'medicines' => 'nullable|array',
            'medicines.*.medication' => 'required|string|max:255',
            'medicines.*.dosage' => 'nullable|string|max:255',
            'medicines.*.route' => 'nullable|string|max:100',
            'medicines.*.frequency' => 'nullable|string|max:255',
            'medicines.*.duration' => 'nullable|string|max:255',
            'medicines.*.quantity' => 'nullable|string|max:255',
            'medicines.*.notes' => 'nullable|string|max:500',
            'notes' => 'nullable|string',
        ], [], ['body' => 'receita']);

        // Precisa ter ao menos o corpo da receita OU medicamentos (retrocompat).
        if (empty(trim((string) ($validated['body'] ?? ''))) && empty($validated['medicines'])) {
            return back()->withErrors(['body' => 'Escreva a receita.'])->withInput();
        }

        $validated['medicines'] = $validated['medicines'] ?? []; // coluna é NOT NULL

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
