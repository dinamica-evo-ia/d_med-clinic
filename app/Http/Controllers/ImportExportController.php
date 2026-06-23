<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Prescription;
use App\Support\CsvImport;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

/*
 * Hub "Importar & Exportar" (Conta → Configurações). Cada tópico (Anamneses, Receitas, ...)
 * segue o mesmo fluxo de 3 passos do import de Pacientes (PatientImportController):
 *   1) GET form  2) POST preview (parseia e mostra o que vai acontecer, não salva)  3) POST store (salva)
 * Pensado para, no futuro, ganhar um botão "Exportar" simétrico em cada tópico sem mudar a estrutura.
 *
 * Anamneses/Receitas legadas referenciam paciente e médico só pelo NOME (não há FK/ID compatível
 * com o UUID do CRM) — por isso a resolução é por nome (case-insensitive). Pacientes não encontrados
 * são pulados com aviso (importe Pacientes primeiro); médicos não encontrados são criados automaticamente
 * (clínicas legadas normalmente têm 1-2 profissionais e não vale travar a importação por isso).
 */
class ImportExportController extends Controller
{
    private const MEDICAL_RECORD_ALIASES = [
        'paciente' => 'patient_name',
        'profissional' => 'doctor_name',
        'data de criação' => 'created_at',
        'data de criacao' => 'created_at',
        // a maioria dos exports de "anamneses" só tem metadados; se um dia vier com o texto, mapeia direto
        'conteúdo' => 'content',
        'conteudo' => 'content',
        'anamnese' => 'content',
        'texto' => 'content',
        'descrição' => 'content',
        'descricao' => 'content',
    ];

    private const PRESCRIPTION_ALIASES = [
        'paciente' => 'patient_name',
        'profissional' => 'doctor_name',
        'conteúdo' => 'content',
        'conteudo' => 'content',
        'observações' => 'notes',
        'observacoes' => 'notes',
        'data de criação' => 'created_at',
        'data de criacao' => 'created_at',
    ];

    public function index()
    {
        return Inertia::render('Account/Settings/ImportExport/Index', [
            'counts' => [
                'patients' => Patient::count(),
                'medical_records' => MedicalRecord::count(),
                'prescriptions' => Prescription::count(),
            ],
        ]);
    }

    // ---------- Anamneses (medical_records) ----------

    public function medicalRecordsForm()
    {
        return Inertia::render('Account/Settings/ImportExport/MedicalRecords', [
            'existing' => MedicalRecord::count(),
        ]);
    }

    public function medicalRecordsPreview(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);
        $parsed = CsvImport::parse($request->file('file')->getRealPath(), self::MEDICAL_RECORD_ALIASES);

        $rows = [];
        foreach ($parsed['rows'] as $row) {
            if (empty($row['patient_name'])) continue;
            $rows[] = [
                'patient_name' => $row['patient_name'],
                'doctor_name' => $row['doctor_name'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'has_content' => ! empty($row['content']),
                'patient_found' => $this->findPatientId($row['patient_name']) !== null,
            ];
        }

        return response()->json([
            'total' => count($rows),
            'without_content' => count(array_filter($rows, fn ($r) => ! $r['has_content'])),
            'unmatched_patients' => count(array_filter($rows, fn ($r) => ! $r['patient_found'])),
            'rows' => array_slice($rows, 0, 50),
        ]);
    }

    public function medicalRecordsStore(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);
        $parsed = CsvImport::parse($request->file('file')->getRealPath(), self::MEDICAL_RECORD_ALIASES);
        $ok = 0; $skip = 0; $errors = []; $createdDoctors = [];

        foreach ($parsed['rows'] as $row) {
            $line = $row['_line'];
            if (empty($row['patient_name'])) { $skip++; continue; }

            $patientId = $this->findPatientId($row['patient_name']);
            if (! $patientId) {
                $skip++;
                $errors[] = "Linha $line: paciente \"{$row['patient_name']}\" não encontrado (importe Pacientes antes).";
                continue;
            }
            $doctorId = $this->resolveDoctorId($row['doctor_name'] ?? null, $createdDoctors);
            $when = $this->parseLegacyDate($row['created_at'] ?? null);

            if (MedicalRecord::where('patient_id', $patientId)->where('doctor_id', $doctorId)->where('created_at', $when)->exists()) {
                $skip++;
                $errors[] = "Linha $line: registro já importado anteriormente (mesmo paciente/médico/data).";
                continue;
            }

            $content = $row['content'] ?? null;
            $record = new MedicalRecord([
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'anamnesis' => $content ?: 'Registro histórico importado do sistema anterior — este export não trazia o texto da anamnese, apenas a referência de que a consulta ocorreu.',
                'origem' => 'importado',
            ]);
            $record->timestamps = false;
            $record->created_at = $when;
            $record->updated_at = $when;
            $record->save();
            $ok++;
        }

        $msg = "Importação concluída: $ok anamnese(s) adicionada(s), $skip ignorada(s).";
        if ($createdDoctors) {
            $msg .= ' Médico(s) criado(s) automaticamente: '.implode(', ', array_unique($createdDoctors)).'.';
        }

        return back()->with('success', $msg)->with('importErrors', array_slice($errors, 0, 20));
    }

    // ---------- Receitas (prescriptions) ----------

    public function prescriptionsForm()
    {
        return Inertia::render('Account/Settings/ImportExport/Prescriptions', [
            'existing' => Prescription::count(),
        ]);
    }

    public function prescriptionsPreview(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);
        $parsed = CsvImport::parse($request->file('file')->getRealPath(), self::PRESCRIPTION_ALIASES);

        $rows = [];
        foreach ($parsed['rows'] as $row) {
            if (empty($row['patient_name'])) continue;
            $rows[] = [
                'patient_name' => $row['patient_name'],
                'doctor_name' => $row['doctor_name'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'content_preview' => $this->htmlToText($row['content'] ?? '', 120),
                'patient_found' => $this->findPatientId($row['patient_name']) !== null,
            ];
        }

        return response()->json([
            'total' => count($rows),
            'unmatched_patients' => count(array_filter($rows, fn ($r) => ! $r['patient_found'])),
            'rows' => array_slice($rows, 0, 50),
        ]);
    }

    public function prescriptionsStore(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);
        $parsed = CsvImport::parse($request->file('file')->getRealPath(), self::PRESCRIPTION_ALIASES);
        $ok = 0; $skip = 0; $errors = []; $createdDoctors = [];

        foreach ($parsed['rows'] as $row) {
            $line = $row['_line'];
            if (empty($row['patient_name'])) { $skip++; continue; }

            $patientId = $this->findPatientId($row['patient_name']);
            if (! $patientId) {
                $skip++;
                $errors[] = "Linha $line: paciente \"{$row['patient_name']}\" não encontrado (importe Pacientes antes).";
                continue;
            }
            $doctorId = $this->resolveDoctorId($row['doctor_name'] ?? null, $createdDoctors);
            $when = $this->parseLegacyDate($row['created_at'] ?? null);

            if (Prescription::where('patient_id', $patientId)->where('doctor_id', $doctorId)->where('created_at', $when)->exists()) {
                $skip++;
                $errors[] = "Linha $line: receita já importada anteriormente (mesmo paciente/médico/data).";
                continue;
            }

            $prescription = new Prescription([
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'medicines' => [[
                    'medication' => 'Receita importada (sistema anterior)',
                    'notes' => $this->htmlToText($row['content'] ?? '') ?: null,
                ]],
                'notes' => $row['notes'] ?? null,
            ]);
            $prescription->timestamps = false;
            $prescription->created_at = $when;
            $prescription->updated_at = $when;
            $prescription->save();
            $ok++;
        }

        $msg = "Importação concluída: $ok receita(s) adicionada(s), $skip ignorada(s).";
        if ($createdDoctors) {
            $msg .= ' Médico(s) criado(s) automaticamente: '.implode(', ', array_unique($createdDoctors)).'.';
        }

        return back()->with('success', $msg)->with('importErrors', array_slice($errors, 0, 20));
    }

    // ---------- helpers compartilhados ----------

    private array $patientCache = [];

    private function findPatientId(string $name): ?string
    {
        $key = mb_strtolower(trim($name));
        if (! array_key_exists($key, $this->patientCache)) {
            $this->patientCache[$key] = Patient::whereRaw('LOWER(name) = ?', [$key])->value('id');
        }
        return $this->patientCache[$key];
    }

    private array $doctorCache = [];

    private function resolveDoctorId(?string $name, array &$createdDoctors): string
    {
        $name = trim((string) $name) ?: 'Profissional não identificado';
        $key = mb_strtolower($name);
        if (isset($this->doctorCache[$key])) {
            return $this->doctorCache[$key];
        }

        $doctor = Doctor::whereRaw('LOWER(name) = ?', [$key])->first();
        if (! $doctor) {
            $doctor = Doctor::create(['name' => $name, 'is_active' => true]);
            $createdDoctors[] = $name;
        }
        $this->doctorCache[$key] = $doctor->id;
        return $doctor->id;
    }

    private function parseLegacyDate(?string $v): string
    {
        if (! $v) return now()->toDateTimeString();
        try {
            return Carbon::parse($v)->toDateTimeString();
        } catch (\Throwable $e) {
            return now()->toDateTimeString();
        }
    }

    private function htmlToText(string $html, ?int $limit = null): string
    {
        $text = preg_replace('/<br\s*\/?>/i', "\n", $html);
        $text = preg_replace('/<\/(p|div)>/i', "\n", $text);
        $text = trim(html_entity_decode(strip_tags($text), ENT_QUOTES, 'UTF-8'));
        $text = preg_replace("/\n{3,}/", "\n\n", $text);
        if ($limit && mb_strlen($text) > $limit) {
            $text = mb_substr($text, 0, $limit).'…';
        }
        return $text;
    }
}
