<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\ExamRequest;
use App\Models\ExamType;
use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExamRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = ExamRequest::with(['patient:id,name', 'doctor:id,name', 'items.examType'])
            ->orderBy('created_at', 'desc');

        if ($search = $request->get('search')) {
            $query->whereHas('patient', fn($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($patientId = $request->get('patient_id')) {
            $query->where('patient_id', $patientId);
        }

        return Inertia::render('ExamRequests/Index', [
            'examRequests' => $query->paginate(15),
            'filters' => ['search' => $search, 'status' => $status, 'patient_id' => $patientId ?? null],
            'patientName' => $patientId ? optional(Patient::find($patientId))->name : null,
        ]);
    }

    public function create()
    {
        return Inertia::render('ExamRequests/Form', [
            'examRequest' => null,
            'patients' => Patient::orderBy('name')->get(['id', 'name']),
            'doctors' => Doctor::orderBy('name')->get(['id', 'name']),
            'examTypes' => ExamType::orderBy('category')->orderBy('name')->get(['id', 'code', 'name', 'category']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'notes' => 'nullable|string',
            'requested_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.exam_type_id' => 'required|exists:exam_types,id',
            'items.*.observation' => 'nullable|string|max:500',
        ]);

        $examRequest = ExamRequest::create([
            'patient_id' => $validated['patient_id'],
            'doctor_id' => $validated['doctor_id'],
            'status' => 'requested',
            'notes' => $validated['notes'] ?? null,
            'requested_date' => $validated['requested_date'],
        ]);

        foreach ($validated['items'] as $item) {
            $examRequest->items()->create([
                'exam_type_id' => $item['exam_type_id'],
                'observation' => $item['observation'] ?? null,
            ]);
        }

        return redirect()->route('exam-requests.show', $examRequest)
            ->with('success', 'Solicitação de exames criada com sucesso.');
    }

    public function show(ExamRequest $examRequest)
    {
        $examRequest->load(['patient', 'doctor', 'items.examType']);

        return Inertia::render('ExamRequests/Show', [
            'examRequest' => $examRequest,
        ]);
    }

    public function updateStatus(Request $request, ExamRequest $examRequest)
    {
        $validated = $request->validate([
            'status' => 'required|in:requested,performed,cancelled',
            'performed_date' => 'nullable|date|required_if:status,performed',
            'result' => 'nullable|string',
        ]);

        $examRequest->update($validated);

        return redirect()->back()->with('success', 'Status atualizado com sucesso.');
    }

    public function destroy(ExamRequest $examRequest)
    {
        $examRequest->delete();

        return redirect()->route('exam-requests.index')
            ->with('success', 'Solicitação removida com sucesso.');
    }

    public function print(ExamRequest $examRequest)
    {
        $examRequest->load(['patient', 'doctor', 'items.examType']);

        return Inertia::render('ExamRequests/Print', [
            'examRequest' => $examRequest,
        ]);
    }
}
