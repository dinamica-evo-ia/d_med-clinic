<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\Prescription;
use App\Models\ExamRequest;
use App\Models\Certificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PatientController extends Controller
{
    private function rules(?Patient $patient = null): array
    {
        return [
            'name' => 'required|string|max:255',
            'social_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'whatsapp' => 'nullable|string|max:20',
            'document' => 'nullable|string|max:14|unique:patients,document,' . ($patient?->id ?? 'NULL'),
            'is_foreign' => 'sometimes|boolean',
            'rg' => 'nullable|string|max:20',
            'rg_issuer' => 'nullable|string|max:20',
            'rg_state' => 'nullable|string|max:2',
            'rg_issued_at' => 'nullable|date',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|in:male,female,other',
            'marital_status' => 'nullable|string|max:30',
            'mother_name' => 'nullable|string|max:255',
            'father_name' => 'nullable|string|max:255',
            'spouse_name' => 'nullable|string|max:255',
            'address' => 'nullable|array',
            'insurance' => 'nullable|array',
            'emergency_contact' => 'nullable|array',
            'notes' => 'nullable|string',
        ];
    }

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
        $validated = $request->validate($this->rules() + ['photo' => 'nullable|image|max:4096']);
        $photo = $request->file('photo');
        unset($validated['photo']);

        $patient = Patient::create($validated);

        if ($photo) {
            $patient->update(['photo_path' => $this->storePhotoFile($patient, $photo)]);
        }

        return redirect()->route('patients.index')
            ->with('success', 'Paciente cadastrado com sucesso.');
    }

    public function show(Patient $patient)
    {
        $patient->load([
            'appointments' => fn ($q) => $q->latest('starts_at')->limit(12),
            'medicalRecords' => fn ($q) => $q->with('doctor:id,name')->latest()->limit(50),
            'attachments',
            'allergies',
            'bodyCompositions',
        ]);

        $prescriptions = Prescription::with('doctor:id,name')->where('patient_id', $patient->id)->latest()->limit(50)->get();
        $exams = ExamRequest::where('patient_id', $patient->id)->latest()->limit(50)->get();
        $certificates = Certificate::where('patient_id', $patient->id)->latest()->limit(50)->get();

        // Agrega CIDs unicos a partir dos diagnosticos das evolucoes
        $cids = [];
        foreach ($patient->medicalRecords as $rec) {
            $diag = is_array($rec->diagnosis) ? $rec->diagnosis : (json_decode($rec->diagnosis ?? '[]', true) ?: []);
            foreach ($diag as $d) {
                $code = $d['code'] ?? null;
                $desc = $d['description'] ?? null;
                $key = $code ?: $desc;
                if ($key && ! isset($cids[$key])) {
                    $cids[$key] = ['code' => $code, 'description' => $desc, 'date' => optional($rec->created_at)->toDateString()];
                }
            }
        }

        return Inertia::render('Patients/Show', [
            'patient' => $patient,
            'prescriptions' => $prescriptions,
            'exams' => $exams,
            'certificates' => $certificates,
            'cids' => array_values($cids),
            'counts' => [
                'prescriptions' => $prescriptions->count(),
                'exams' => $exams->count(),
                'certificates' => $certificates->count(),
                'records' => $patient->medicalRecords->count(),
                'cids' => count($cids),
            ],
        ]);
    }

    public function updateNotes(Request $request, Patient $patient)
    {
        $data = $request->validate(['notes' => 'nullable|string']);
        $patient->update(['notes' => $data['notes'] ?? null]);

        return back()->with('success', 'Anotações salvas.');
    }

    public function edit(Patient $patient)
    {
        return Inertia::render('Patients/Form', [
            'patient' => $patient,
        ]);
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate($this->rules($patient) + ['photo' => 'nullable|image|max:4096']);
        $photo = $request->file('photo');
        unset($validated['photo']);

        if ($photo) {
            $validated['photo_path'] = $this->storePhotoFile($patient, $photo);
        }

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

    public function uploadPhoto(Request $request, Patient $patient)
    {
        $request->validate(['photo' => 'required|image|max:4096']);

        $patient->update(['photo_path' => $this->storePhotoFile($patient, $request->file('photo'))]);

        return back()->with('success', 'Foto atualizada.');
    }

    private function storePhotoFile(Patient $patient, $file): string
    {
        if ($patient->photo_path) {
            Storage::disk('public')->delete($patient->photo_path);
        }

        return $file->storeAs('patients', $patient->id.'_'.time().'.'.$file->extension(), 'public');
    }

    public function destroyPhoto(Patient $patient)
    {
        if ($patient->photo_path) {
            Storage::disk('public')->delete($patient->photo_path);
            $patient->update(['photo_path' => null]);
        }

        return back()->with('success', 'Foto removida.');
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
