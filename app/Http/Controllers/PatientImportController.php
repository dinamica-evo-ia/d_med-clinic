<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Support\CsvImport;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;

/*
 * Importar pacientes via CSV.
 * Fluxo: 1) GET form -> 2) POST preview (parseia, não salva) -> 3) POST confirm (salva).
 *
 * Colunas esperadas (separador vírgula OU ponto-e-vírgula; primeira linha = cabeçalhos;
 * UTF-8 ou ISO-8859-1, detectado automaticamente): name, email, phone, document, birth_date, gender.
 * Também reconhece o layout de export de sistemas legados (ex.: "Clientes.csv"): CEP/Bairro/
 * Endereço/Número/Complemento → address (JSON); Plano de saúde/Número do plano → insurance
 * (JSON); RG/Estado civil/Mãe/Pai/Cônjuge/WhatsApp → campos próprios do cadastro completo.
 * Profissão/Profissional/Observações/Status não têm coluna própria → ficam anexados a notes.
 */
class PatientImportController extends Controller
{
    private const HEADER_ALIASES = [
        'nome' => 'name',
        'name' => 'name',
        'nome social' => 'social_name',
        'e-mail' => 'email',
        'email' => 'email',
        'telefone' => 'phone',
        'celular' => 'phone',
        'phone' => 'phone',
        'whatsapp' => 'whatsapp',
        'cpf' => 'document',
        'documento' => 'document',
        'document' => 'document',
        'data_nascimento' => 'birth_date',
        'data de nascimento' => 'birth_date',
        'nascimento' => 'birth_date',
        'birth_date' => 'birth_date',
        'genero' => 'gender',
        'gênero' => 'gender',
        'sexo' => 'gender',
        'gender' => 'gender',
        'estado civil' => 'marital_status',
        'rg' => 'rg',
        'mãe' => 'mother_name',
        'mae' => 'mother_name',
        'pai' => 'father_name',
        'cônjuge' => 'spouse_name',
        'conjuge' => 'spouse_name',
        // endereço → vira JSON em address
        'cep' => 'addr_zip',
        'bairro' => 'addr_neighborhood',
        'endereço' => 'addr_street',
        'endereco' => 'addr_street',
        'número' => 'addr_number',
        'numero' => 'addr_number',
        'complemento' => 'addr_complement',
        'cidade' => 'addr_city',
        // convênio → vira JSON em insurance
        'plano de saúde' => 'ins_name',
        'plano de saude' => 'ins_name',
        'número do plano' => 'ins_number',
        'numero do plano' => 'ins_number',
        // informativo → anexado a notes (sem coluna própria no model hoje)
        'profissão' => 'note_occupation',
        'profissao' => 'note_occupation',
        'profissional' => 'note_doctor_name',
        'observações' => 'note_legacy_notes',
        'observacoes' => 'note_legacy_notes',
        'status' => 'note_status',
    ];

    public function form()
    {
        return Inertia::render('Patients/Import', [
            'existing' => Patient::count(),
        ]);
    }

    public function preview(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);
        $rows = $this->parseCsv($request->file('file')->getRealPath());

        return response()->json([
            'total' => count($rows['rows']),
            'mapped_columns' => $rows['map'],
            'rows' => array_slice($rows['rows'], 0, 50), // preview até 50
            'errors' => $rows['errors'],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);
        $parsed = $this->parseCsv($request->file('file')->getRealPath());
        $ok = 0; $skip = 0; $dup = 0; $errors = [];

        // Índice de deduplicação: chaves normalizadas de quem JÁ existe na clínica.
        // Reimportar a mesma lista não duplica — mesmo sem CPF, ou com CPF formatado diferente.
        $seen = [];
        foreach (Patient::get(['name', 'document', 'birth_date', 'phone']) as $p) {
            $seen[$this->dedupeKey($p->name, $p->document, $p->birth_date?->toDateString(), $p->phone)] = true;
        }

        foreach ($parsed['rows'] as $i => $row) {
            $patientData = $this->toPatientFields($row);

            $v = Validator::make($patientData, [
                'name' => 'required|string|max:255',
                'email' => 'nullable|email|max:255',
                'phone' => 'nullable|string|max:32',
                'document' => 'nullable|string|max:32',
                'birth_date' => 'nullable|date',
                'gender' => 'nullable|string|max:20',
            ]);
            if ($v->fails()) {
                $skip++;
                $errors[] = "Linha ".($i+2).": ".implode('; ', $v->errors()->all());
                continue;
            }

            // Já existe (na clínica ou repetido no próprio arquivo)? Pula em vez de duplicar.
            $key = $this->dedupeKey($patientData['name'], $patientData['document'], $patientData['birth_date'], $patientData['phone']);
            if (isset($seen[$key])) {
                $dup++;
                continue;
            }

            Patient::create($patientData + ['id' => (string) Str::uuid()]);
            $seen[$key] = true;
            $ok++;
        }

        // O front confirma via axios (mesmo mecanismo do preview, que comprovadamente funciona),
        // então respondemos JSON. Mantém o redirect Inertia como fallback se vier sem XHR.
        if ($request->ajax() || $request->wantsJson()) {
            return response()->json([
                'imported' => $ok,
                'skipped' => $skip,
                'duplicates' => $dup,
                'errors' => array_slice($errors, 0, 20),
            ]);
        }

        return back()->with('success', "Importação: $ok novo(s), $dup já existente(s) ignorado(s), $skip com erro.")
            ->with('importErrors', array_slice($errors, 0, 20));
    }

    /**
     * Chave estável de deduplicação de paciente. Prioriza CPF (só dígitos); sem CPF,
     * usa nome+nascimento; depois nome+telefone; por último só nome. Como é estável
     * entre importações, reimportar a mesma lista não cria duplicados.
     */
    private function dedupeKey(?string $name, ?string $document, ?string $birthDate, ?string $phone): string
    {
        $doc = preg_replace('/\D/', '', (string) $document);
        if ($doc !== '') return 'doc:'.$doc;

        $nm = Str::lower(Str::squish((string) $name));
        if (! empty($birthDate)) return 'nmdob:'.$nm.'|'.$birthDate;

        $ph = preg_replace('/\D/', '', (string) $phone);
        if ($ph !== '') return 'nmph:'.$nm.'|'.$ph;

        return 'nm:'.$nm;
    }

    /** Monta os campos reais do model Patient a partir da linha já mapeada (junta endereço/convênio/notas extras em JSON/texto). */
    private function toPatientFields(array $row): array
    {
        $address = array_filter([
            'zip' => $row['addr_zip'] ?? null,
            'neighborhood' => $row['addr_neighborhood'] ?? null,
            'street' => $row['addr_street'] ?? null,
            'number' => $row['addr_number'] ?? null,
            'complement' => $row['addr_complement'] ?? null,
            'city' => $row['addr_city'] ?? null,
        ]);

        $insurance = array_filter([
            'name' => $row['ins_name'] ?? null,
            'number' => $row['ins_number'] ?? null,
        ]);

        $extraNotes = array_filter([
            $row['note_doctor_name'] ?? null ? "Profissional (sistema anterior): {$row['note_doctor_name']}" : null,
            $row['note_occupation'] ?? null ? "Profissão: {$row['note_occupation']}" : null,
            $row['note_status'] ?? null ? "Status (sistema anterior): {$row['note_status']}" : null,
            $row['note_legacy_notes'] ?? null,
        ]);

        return [
            'name' => $row['name'] ?? null,
            'social_name' => $row['social_name'] ?? null,
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
            'whatsapp' => $row['whatsapp'] ?? null,
            'document' => $row['document'] ?? null,
            'rg' => $row['rg'] ?? null,
            'birth_date' => $row['birth_date'] ?? null,
            'gender' => $row['gender'] ?? null,
            'marital_status' => $row['marital_status'] ?? null,
            'mother_name' => $row['mother_name'] ?? null,
            'father_name' => $row['father_name'] ?? null,
            'spouse_name' => $row['spouse_name'] ?? null,
            'address' => $address ?: null,
            'insurance' => $insurance ?: null,
            'notes' => $extraNotes ? implode("\n", $extraNotes) : null,
        ];
    }

    private function parseCsv(string $path): array
    {
        $parsed = CsvImport::parse($path, self::HEADER_ALIASES);
        $rows = [];
        $errors = [];

        foreach ($parsed['rows'] as $row) {
            $line = $row['_line'];
            unset($row['_line']);

            if (! empty($row['birth_date'])) {
                try {
                    $row['birth_date'] = $this->parseDate($row['birth_date']);
                } catch (\Throwable $e) {
                    $errors[] = "Linha $line: data inválida \"{$row['birth_date']}\"";
                    $row['birth_date'] = null;
                }
            }
            if (! empty($row['gender'])) {
                $row['gender'] = $this->normalizeGender($row['gender']);
            }
            if (! empty($row['name'])) {
                $rows[] = $row;
            }
        }

        return ['rows' => $rows, 'map' => $parsed['map'], 'errors' => $errors];
    }

    private function parseDate(string $v): string
    {
        // dd/mm/yyyy ou yyyy-mm-dd
        if (preg_match('/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/', $v, $m)) {
            return Carbon::createFromFormat('Y-m-d', "{$m[3]}-{$m[2]}-{$m[1]}")->toDateString();
        }
        return Carbon::parse($v)->toDateString();
    }

    private function normalizeGender(string $v): string
    {
        $v = strtolower($v);
        if (in_array($v, ['m', 'masculino', 'male', 'h', 'homem'])) return 'M';
        if (in_array($v, ['f', 'feminino', 'female', 'mulher'])) return 'F';
        return 'Outro';
    }
}
