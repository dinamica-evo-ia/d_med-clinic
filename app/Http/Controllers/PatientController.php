<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $query = Patient::query();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('document', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Patients/Index', [
            'patients' => $query->orderBy('created_at', 'desc')
                ->paginate(15)
                ->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Patients/Form', [
            'patient' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'document' => 'nullable|string|max:14|unique:patients,document',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|in:male,female,other',
            'address' => 'nullable|array',
            'insurance' => 'nullable|array',
            'emergency_contact' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        Patient::create($validated);

        return redirect()->route('patients.index')
            ->with('success', 'Paciente cadastrado com sucesso.');
    }

    public function show(Patient $patient)
    {
        $patient->load(['appointments' => function ($q) {
            $q->latest()->limit(10);
        }, 'medicalRecords' => function ($q) {
            $q->latest()->limit(5);
        }, 'attachments']);

        return Inertia::render('Patients/Show', [
            'patient' => $patient,
        ]);
    }

    public function edit(Patient $patient)
    {
        return Inertia::render('Patients/Form', [
            'patient' => $patient,
        ]);
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'document' => 'nullable|string|max:14|unique:patients,document,' . $patient->id,
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|in:male,female,other',
            'address' => 'nullable|array',
            'insurance' => 'nullable|array',
            'emergency_contact' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $patient->update($validated);

        return redirect()->route('patients.index')
            ->with('success', 'Paciente atualizado com sucesso.');
    }

    public function destroy(Patient $patient)
    {
        $patient->delete();
        return redirect()->route('patients.index')
            ->with('success', 'Paciente removido com sucesso.');
    }

    public function search(Request $request)
    {
        $search = $request->get('q', '');
        $patients = Patient::where('name', 'like', "%{$search}%")
            ->orWhere('email', 'like', "%{$search}%")
            ->orWhere('phone', 'like', "%{$search}%")
            ->limit(20)
            ->get(['id', 'name', 'email', 'phone', 'document']);

        return response()->json($patients);
    }
}
