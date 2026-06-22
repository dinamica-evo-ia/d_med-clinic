<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\Doctor;
use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CertificateController extends Controller
{
    public function index(Request $request)
    {
        $query = Certificate::with(['patient:id,name', 'doctor:id,name'])
            ->orderBy('created_at', 'desc');

        if ($search = $request->get('search')) {
            $query->whereHas('patient', fn($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($patientId = $request->get('patient_id')) {
            $query->where('patient_id', $patientId);
        }

        return Inertia::render('Certificates/Index', [
            'certificates' => $query->paginate(15),
            'filters' => ['search' => $search, 'patient_id' => $patientId ?? null],
            'patientName' => $patientId ? optional(Patient::find($patientId))->name : null,
        ]);
    }

    public function create()
    {
        return Inertia::render('Certificates/Form', [
            'certificate' => null,
            'patients' => Patient::orderBy('name')->get(['id', 'name']),
            'doctors' => Doctor::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'type' => 'required|string|in:medical_certificate,attendance_declaration,medical_report,other',
            'cid_code' => 'nullable|string|max:20',
            'description' => 'required|string',
            'days' => 'nullable|integer|min:0|max:365',
            'valid_from' => 'required|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
        ]);

        $certificate = Certificate::create($validated);

        if ($request->has('print') && $request->boolean('print')) {
            return redirect()->route('certificates.print', $certificate);
        }

        return redirect()->route('certificates.index')
            ->with('success', 'Atestado criado com sucesso.');
    }

    public function show(Certificate $certificate)
    {
        $certificate->load(['patient', 'doctor']);

        return Inertia::render('Certificates/Show', [
            'certificate' => $certificate,
        ]);
    }

    public function print(Certificate $certificate)
    {
        $certificate->load(['patient', 'doctor']);

        return Inertia::render('Certificates/Print', [
            'certificate' => $certificate,
        ]);
    }

    public function destroy(Certificate $certificate)
    {
        $certificate->delete();

        return redirect()->route('certificates.index')
            ->with('success', 'Atestado removido com sucesso.');
    }
}
