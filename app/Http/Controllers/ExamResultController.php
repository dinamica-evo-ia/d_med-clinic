<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Doctor;
use App\Models\ExamResult;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * Resultados de exame — a aba irmã de "Solicitar" (ExamRequestController).
 * Solicitar = o que a clínica PEDE. Resultados = o que VOLTA do laboratório.
 */
class ExamResultController extends Controller
{
    public function index(Request $request)
    {
        $q = ExamResult::with(['patient:id,name', 'doctor:id,name'])
            ->withCount('attachments');

        if ($busca = trim((string) $request->get('search'))) {
            $q->where(function ($w) use ($busca) {
                $w->where('title', 'like', "%{$busca}%")
                    ->orWhereHas('patient', fn ($p) => $p->search($busca)); // sem acento (ver Patient)
            });
        }
        if ($pid = $request->get('patient_id')) {
            $q->where('patient_id', $pid);
        }

        return Inertia::render('ExamResults/Index', [
            'results' => $q->orderByDesc('result_date')->orderByDesc('created_at')->paginate(15)
                ->through(fn ($r) => [
                    'id' => $r->id,
                    'title' => $r->title,
                    'patient' => $r->patient?->name,
                    'doctor' => $r->doctor?->name,
                    'result_date' => $r->result_date?->format('d/m/Y'),
                    'anexos' => $r->attachments_count,
                ])
                ->withQueryString(),
            'filters' => ['search' => $request->get('search', '')],
        ]);
    }

    public function create(Request $request)
    {
        $pre = $request->get('patient_id');

        return Inertia::render('ExamResults/Form', [
            // só o pré-selecionado: quem escolhe é o PatientPicker, que busca sob demanda
            'patients' => $pre ? Patient::where('id', $pre)->get(['id', 'name', 'phone']) : collect(),
            'doctors' => Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:20000'],
            'result_date' => ['nullable', 'date'],
            'files' => ['nullable', 'array', 'max:10'],
            'files.*' => ['file', 'max:10240'], // 10MB por arquivo
        ]);

        $result = ExamResult::create([
            'patient_id' => $data['patient_id'],
            'doctor_id' => $data['doctor_id'] ?? null,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'result_date' => $data['result_date'] ?? now()->toDateString(),
        ]);

        foreach ($request->file('files', []) as $file) {
            $this->anexar($result, $file);
        }

        return redirect()->route('exam-results.show', $result)
            ->with('success', 'Resultado salvo.');
    }

    public function show(ExamResult $examResult)
    {
        $examResult->load(['patient:id,name', 'doctor:id,name', 'attachments']);

        return Inertia::render('ExamResults/Show', [
            'result' => [
                'id' => $examResult->id,
                'title' => $examResult->title,
                'description' => $examResult->description,
                'result_date' => $examResult->result_date?->format('Y-m-d'),
                'patient' => ['id' => $examResult->patient?->id, 'name' => $examResult->patient?->name],
                'doctor' => $examResult->doctor?->name,
                'attachments' => $examResult->attachments->map(fn ($a) => [
                    'id' => $a->id,
                    'name' => $a->original_name,
                    'size' => $a->size,
                    'mime' => $a->mime,
                    'url' => route('attachments.download', $a),
                ])->values(),
            ],
        ]);
    }

    /** Anexar laudo depois de salvo (arrastar mais arquivos na tela do resultado). */
    public function addFiles(Request $request, ExamResult $examResult)
    {
        $request->validate([
            'files' => ['required', 'array', 'max:10'],
            'files.*' => ['file', 'max:10240'],
        ]);

        foreach ($request->file('files', []) as $file) {
            $this->anexar($examResult, $file);
        }

        return back()->with('success', 'Arquivo(s) anexado(s).');
    }

    public function destroy(ExamResult $examResult)
    {
        // some com os laudos junto: arquivo de exame sem o resultado é lixo órfão no disco
        foreach ($examResult->attachments as $a) {
            Storage::disk($a->disk ?: 'local')->delete('attachments/'.ExamResult::class.'/'.$a->filename);
            $a->delete();
        }
        $examResult->delete();

        return redirect()->route('exam-results.index')->with('success', 'Resultado removido.');
    }

    private function anexar(ExamResult $result, $file): void
    {
        $filename = uniqid().'_'.$file->getClientOriginalName();
        $file->storeAs('attachments/'.ExamResult::class, $filename);

        Attachment::create([
            'attachable_id' => $result->id,
            'attachable_type' => ExamResult::class,
            'filename' => $filename,
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'disk' => 'local',
            'uploaded_by' => auth()->id(),
        ]);
    }
}
