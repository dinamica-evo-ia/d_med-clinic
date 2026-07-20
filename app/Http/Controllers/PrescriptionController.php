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

    /**
     * Monta o PDF da receita (dompdf). Papel A5 paisagem (padrão) ou A4 retrato,
     * conforme o modelo de impressão do médico. Cabeçalho reusa PrintSettings::forDoctor.
     */
    protected function buildPdf(Prescription $prescription)
    {
        $prescription->loadMissing(['patient', 'doctor']);

        $settings = $prescription->doctor
            ? PrintSettings::forDoctor($prescription->doctor)
            : PrintSettings::defaults();

        [$size, $orientation] = PrintSettings::paperFor($settings);
        // Compacto por FORMATO escolhido (inclui A5-em-A4, onde a folha é A4 mas o conteúdo é A5).
        $compact = PrintSettings::isCompact($settings);

        $logoAbs = ! empty($settings['header']['logo_path'])
            && Storage::disk('public')->exists($settings['header']['logo_path'])
            ? Storage::disk('public')->path($settings['header']['logo_path'])
            : null;

        // Evita "Dr. Dr. Fulano" quando o nome já vem com o prefixo.
        $doctorName = trim((string) ($prescription->doctor->name ?? ''));
        $prefixo = trim((string) ($settings['header']['prefix'] ?? ''));
        if ($prefixo !== '' && str_starts_with(mb_strtolower($doctorName), mb_strtolower($prefixo))) {
            $prefixo = '';
        }

        $clinic = \App\Models\ClinicProfile::first();
        $endereco = trim(implode(', ', array_filter([
            $settings['header']['address'] ?: ($clinic->street ?? null),
            $settings['header']['city'] && $settings['header']['state']
                ? $settings['header']['city'].'/'.$settings['header']['state']
                : ($clinic && $clinic->city ? $clinic->city.'/'.$clinic->state : null),
        ])));

        $patient = $prescription->patient;
        $addr = (array) ($patient->address ?? []);
        $patientEndereco = trim(implode(', ', array_filter([
            $addr['street'] ?? null, $addr['number'] ?? null,
            $addr['neighborhood'] ?? $addr['district'] ?? null, $addr['city'] ?? null,
        ])), ', ');

        $cidade = $settings['header']['city'] ?: ($clinic->city ?? '');
        $cidadeData = trim(($cidade ? $cidade.', ' : '').$prescription->created_at->format('d/m/Y'));

        $footerText = ! empty($settings['footer']['enabled']) && ! empty($settings['footer']['text'])
            ? $settings['footer']['text']
            : trim(collect([$clinic->legal_name ?? tenant()?->name, $clinic->whatsapp ?? $clinic->phone ?? null, $endereco])->filter()->implode(' · '));

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.prescription', [
            'h' => $settings['header'],
            'compact' => $compact,
            'logoAbs' => $logoAbs,
            'doctorName' => $doctorName,
            'prefixo' => $prefixo,
            'endereco' => $endereco,
            'title' => $settings['title'] ?: 'Receita Médica',
            'showTitle' => (bool) $settings['show_title'],
            'controlEspecial' => false, // gancho p/ receita de controlado (Portaria 344) — ainda não ativo
            'cidadeData' => $cidadeData,
            'patientEnabled' => (bool) $settings['patient_data']['enabled'],
            'pf' => $settings['patient_data']['fields'],
            'patient' => [
                'name' => $patient->name ?? '',
                'document' => $patient->document ?? '',
                'rg' => $patient->rg ?? '',
                'prontuario' => $patient ? substr($patient->id, 0, 8) : '',
                'contato' => $patient->phone ?? $patient->whatsapp ?? '',
                'endereco' => $patientEndereco,
            ],
            'bodyLivre' => trim((string) $prescription->body),
            'prescTitle' => trim((string) $prescription->title),
            'medicines' => $prescription->medicines ?? [],
            'notes' => trim((string) $prescription->notes),
            'signature' => (bool) $settings['signature'],
            'footerText' => $footerText,
            'assinaturaDigital' => null, // preenchido quando a assinatura ICP-Brasil (VIDaaS) entrar
        ])->setPaper($size, $orientation);

        return $pdf;
    }

    protected function pdfFileName(Prescription $prescription): string
    {
        $nome = str($prescription->patient->name ?? 'paciente')->slug('-')->limit(40, '');

        return 'Receita-'.$nome.'-'.$prescription->created_at->format('d-m-Y').'.pdf';
    }

    /** Abre/baixa o PDF da receita. ?download=1 força download; senão, exibe inline. */
    public function pdf(Request $request, Prescription $prescription)
    {
        $pdf = $this->buildPdf($prescription);
        $file = $this->pdfFileName($prescription);

        return $request->boolean('download')
            ? $pdf->download($file)
            : $pdf->stream($file);
    }

    /** Envia o PDF da receita para o WhatsApp do paciente (mesma conexão do Atendente IA). */
    public function enviarPdf(Prescription $prescription)
    {
        $prescription->loadMissing('patient');

        $phone = preg_replace('/\D/', '', (string) ($prescription->patient->whatsapp ?: $prescription->patient->phone));
        if (strlen($phone) < 10) {
            return response()->json(['error' => 'O paciente não tem WhatsApp/telefone válido no cadastro.'], 422);
        }
        if (strlen($phone) <= 11) {
            $phone = '55'.$phone; // BR sem DDI
        }

        $s = \App\Models\AttendantSetting::current();
        if (! $s->isWhatsappConnected()) {
            return response()->json(['error' => 'O WhatsApp da clínica não está conectado. Conecte em Atendente IA → WhatsApp.'], 422);
        }

        $pdf = $this->buildPdf($prescription);
        $file = $this->pdfFileName($prescription);
        $primeiroNome = explode(' ', trim($prescription->patient->name ?? ''))[0] ?: 'paciente';
        $caption = "Olá, {$primeiroNome}! Segue a sua receita de {$prescription->created_at->format('d/m/Y')}. Qualquer dúvida, estamos à disposição. 💙";

        try {
            \App\Support\Whatsapp\Whatsapp::sendDocument($s, $phone, base64_encode($pdf->output()), $file, $caption);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Falha no envio pelo WhatsApp: '.$e->getMessage()], 500);
        }

        return response()->json(['ok' => true, 'phone' => $phone]);
    }

    public function destroy(Prescription $prescription)
    {
        $prescription->delete();

        return redirect()->route('prescriptions.index')
            ->with('success', 'Receita removida com sucesso.');
    }
}
