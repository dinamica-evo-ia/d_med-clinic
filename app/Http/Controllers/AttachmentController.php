<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function upload(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:10240',
            'attachable_id' => 'required|string',
            'attachable_type' => 'required|string',
            'notes' => 'nullable|string|max:500',
        ]);

        $file = $request->file('file');
        $filename = uniqid() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('attachments/' . $validated['attachable_type'], $filename);

        $attachment = Attachment::create([
            'attachable_id' => $validated['attachable_id'],
            'attachable_type' => $validated['attachable_type'],
            'filename' => $filename,
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'disk' => 'local',
            'notes' => $validated['notes'] ?? null,
            'uploaded_by' => auth()->id(),
        ]);

        return redirect()->back()->with('success', 'Arquivo anexado com sucesso.');
    }

    public function download(Attachment $attachment)
    {
        $path = 'attachments/' . $attachment->attachable_type . '/' . $attachment->filename;

        if (!Storage::disk('local')->exists($path)) {
            return redirect()->back()->with('error', 'Arquivo não encontrado.');
        }

        return Storage::disk('local')->download($path, $attachment->original_name);
    }

    public function destroy(Attachment $attachment)
    {
        $path = 'attachments/' . $attachment->attachable_type . '/' . $attachment->filename;
        Storage::disk('local')->delete($path);
        $attachment->delete();

        return redirect()->back()->with('success', 'Anexo removido com sucesso.');
    }
}
