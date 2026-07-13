<?php

namespace App\Http\Controllers;

use App\Models\PharmacySubmission;
use Illuminate\Http\Request;
use Inertia\Inertia;

/*
 * Página PÚBLICA de parceria com farmácias de manipulação (/parceria-farmacias).
 * O laboratório se cadastra e envia o PDF/planilha das fórmulas, autorizando a indicação
 * aos pacientes. Sem auth, sem tenancy — intake global no banco central.
 */
class PharmacyPartnerController extends Controller
{
    public function show()
    {
        return Inertia::render('Public/PharmacyPartner');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'lab_name' => 'required|string|max:255',
            'responsible_name' => 'required|string|max:255',
            'contact_email' => 'required_without:contact_phone|nullable|email|max:255',
            'contact_phone' => 'required_without:contact_email|nullable|string|max:40',
            'file' => 'required|file|mimes:pdf,xls,xlsx,csv,doc,docx|max:20480',
            'authorized' => 'accepted',
            'notes' => 'nullable|string|max:2000',
        ], [
            'authorized.accepted' => 'É preciso autorizar a indicação das fórmulas para continuar.',
            'contact_email.required_without' => 'Informe um e-mail ou um telefone de contato.',
            'contact_phone.required_without' => 'Informe um telefone ou um e-mail de contato.',
            'file.required' => 'Anexe o arquivo com as fórmulas (PDF, Excel ou planilha).',
        ]);

        $file = $request->file('file');
        $path = $file->store('pharmacy-submissions');

        PharmacySubmission::create([
            'lab_name' => $data['lab_name'],
            'responsible_name' => $data['responsible_name'],
            'contact_email' => $data['contact_email'] ?? null,
            'contact_phone' => $data['contact_phone'] ?? null,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'authorized' => true,
            'notes' => $data['notes'] ?? null,
            'status' => 'new',
        ]);

        return back()->with('success', 'Recebemos suas fórmulas! Nossa equipe vai revisar e cadastrar no sistema. Obrigado pela parceria. 💙');
    }
}
