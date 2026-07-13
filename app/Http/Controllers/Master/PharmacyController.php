<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\PharmacySubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/*
 * Painel Master → Farmácias Parceiras.
 * Lista os envios da página pública /parceria-farmacias (banco central) e permite
 * baixar o arquivo de fórmulas de cada laboratório, marcar como importado e remover.
 */
class PharmacyController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $status = $request->query('status');

        $submissions = PharmacySubmission::query()
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($w) use ($search) {
                    $w->where('lab_name', 'like', "%{$search}%")
                        ->orWhere('responsible_name', 'like', "%{$search}%")
                        ->orWhere('contact_email', 'like', "%{$search}%")
                        ->orWhere('contact_phone', 'like', "%{$search}%");
                });
            })
            ->when(in_array($status, ['new', 'imported'], true), fn ($q) => $q->where('status', $status))
            ->latest()
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'lab_name' => $s->lab_name,
                'responsible_name' => $s->responsible_name,
                'contact_email' => $s->contact_email,
                'contact_phone' => $s->contact_phone,
                'file_name' => $s->file_name,
                'has_file' => $s->file_path && Storage::exists($s->file_path),
                'authorized' => (bool) $s->authorized,
                'notes' => $s->notes,
                'status' => $s->status,
                'created_at' => $s->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Master/Farmacias/Index', [
            'submissions' => $submissions,
            'filters' => ['search' => $search, 'status' => $status ?: ''],
            'counts' => [
                'total' => PharmacySubmission::count(),
                'new' => PharmacySubmission::where('status', 'new')->count(),
            ],
        ]);
    }

    public function download(PharmacySubmission $submission)
    {
        abort_unless($submission->file_path && Storage::exists($submission->file_path), 404);

        return Storage::download($submission->file_path, $submission->file_name);
    }

    public function updateStatus(Request $request, PharmacySubmission $submission)
    {
        $data = $request->validate(['status' => 'required|in:new,imported']);
        $submission->update(['status' => $data['status']]);

        return back()->with('success', 'Status atualizado.');
    }

    public function destroy(PharmacySubmission $submission)
    {
        if ($submission->file_path && Storage::exists($submission->file_path)) {
            Storage::delete($submission->file_path);
        }
        $submission->delete();

        return back()->with('success', 'Envio removido.');
    }
}
