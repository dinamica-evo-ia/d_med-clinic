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
 * (JSON); RG/Estado civil/Profissão/Mãe/Pai/Cônjuge/Profissional/Observações → anexados ao
 * campo notes (texto livre, são apenas informativos no model atual).
 */
class PatientImportController extends Controller
{
    private const HEADER_ALIASES = [
        'nome' => 'name',
        'name' => 'name',
        'e-mail' => 'email',
        'email' => 'email',
        'telefone' => 'phone',
        'celular' => 'phone',
        'whatsapp' => 'phone',
        'phone' => 'phone',
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
        'rg' => 'note_rg',
        'estado civil' => 'note_marital_status',
        'profissão' => 'note_occupation',
        'profissao' => 'note_occupation',
        'mãe' => 'note_mother',
        'mae' => 'note_mother',
        'pai' => 'note_father',
        'cônjuge' => 'note_spouse',
        'conjuge' => 'note_spouse',
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
        $ok = 0; $skip = 0; $errors = [];

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
            // dedupe por CPF se vier preenchido
            if (! empty($patientData['document']) && Patient::where('document', $patientData['document'])->exists()) {
                $skip++;
                $errors[] = "Linha ".($i+2).": já existe paciente com CPF {$patientData['document']}";
                continue;
            }
            Patient::create($patientData + ['id' => (string) Str::uuid()]);
            $ok++;
        }

        return back()->with('success', "Importação concluída: $ok pacientes adicionados, $skip ignorados.")
            ->with('importErrors', array_slice($errors, 0, 20));
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
            $row['note_marital_status'] ?? null ? "Estado civil: {$row['note_marital_status']}" : null,
            $row['note_rg'] ?? null ? "RG: {$row['note_rg']}" : null,
            $row['note_mother'] ?? null ? "Mãe: {$row['note_mother']}" : null,
            $row['note_father'] ?? null ? "Pai: {$row['note_father']}" : null,
            $row['note_spouse'] ?? null ? "Cônjuge: {$row['note_spouse']}" : null,
            $row['note_status'] ?? null ? "Status (sistema anterior): {$row['note_status']}" : null,
            $row['note_legacy_notes'] ?? null,
        ]);

        return [
            'name' => $row['name'] ?? null,
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
            'document' => $row['document'] ?? null,
            'birth_date' => $row['birth_date'] ?? null,
            'gender' => $row['gender'] ?? null,
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
