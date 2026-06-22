<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;

/*
 * Importar pacientes via CSV.
 * Fluxo: 1) GET form -> 2) POST preview (parseia, não salva) -> 3) POST confirm (salva).
 *
 * Colunas esperadas (UTF-8, separador vírgula OU ponto-e-vírgula; primeira linha = cabeçalhos):
 *   name, email, phone, document, birth_date, gender
 * Aliases aceitos: nome→name, e-mail/email→email, telefone→phone, cpf/documento→document,
 *   nascimento/data_nascimento→birth_date, genero/sexo→gender.
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
            // valida cada linha
            $v = Validator::make($row, [
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
            if (! empty($row['document']) && Patient::where('document', $row['document'])->exists()) {
                $skip++;
                $errors[] = "Linha ".($i+2).": já existe paciente com CPF {$row['document']}";
                continue;
            }
            Patient::create($row + ['id' => (string) Str::uuid()]);
            $ok++;
        }

        return back()->with('success', "Importação concluída: $ok pacientes adicionados, $skip ignorados.")
            ->with('importErrors', array_slice($errors, 0, 20));
    }

    private function parseCsv(string $path): array
    {
        $contents = file_get_contents($path);
        // detecta separador (, ou ;)
        $firstLine = strtok($contents, "\r\n");
        $sep = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        $fh = fopen($path, 'r');
        $headers = fgetcsv($fh, 0, $sep) ?: [];
        $headers = array_map(fn ($h) => self::HEADER_ALIASES[strtolower(trim($h))] ?? null, $headers);

        $map = array_filter($headers);
        $rows = [];
        $errors = [];
        $line = 1;
        while (($r = fgetcsv($fh, 0, $sep)) !== false) {
            $line++;
            $row = [];
            foreach ($headers as $i => $key) {
                if ($key === null) continue;
                $val = isset($r[$i]) ? trim($r[$i]) : null;
                if ($val === '') $val = null;
                if ($key === 'birth_date' && $val) {
                    try {
                        $val = $this->parseDate($val);
                    } catch (\Throwable $e) {
                        $errors[] = "Linha $line: data inválida \"$val\"";
                        $val = null;
                    }
                }
                if ($key === 'gender' && $val) {
                    $val = $this->normalizeGender($val);
                }
                $row[$key] = $val;
            }
            if (! empty($row['name'])) {
                $rows[] = $row;
            }
        }
        fclose($fh);

        return ['rows' => $rows, 'map' => $map, 'errors' => $errors];
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
