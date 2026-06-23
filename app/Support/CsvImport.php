<?php

namespace App\Support;

/*
 * Leitura genérica de CSV pra importação (Pacientes, Anamneses, Receitas, etc.).
 * Resolve os dois problemas que toda exportação de sistema legado traz:
 *   - separador ; ou , (detectado pela primeira linha)
 *   - encoding ISO-8859-1/Windows-1252 (comum em exports de sistemas antigos) → converte pra UTF-8
 * Cada chamador passa seu próprio mapa de aliases de cabeçalho (português/inglês → chave canônica).
 */
class CsvImport
{
    public static function parse(string $path, array $aliases): array
    {
        $raw = file_get_contents($path);
        $raw = self::toUtf8($raw);

        $firstLine = strtok($raw, "\r\n");
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        // fgetcsv precisa de um stream; reescreve o conteúdo já convertido num arquivo temporário.
        $tmp = tmpfile();
        fwrite($tmp, $raw);
        rewind($tmp);

        $rawHeaders = fgetcsv($tmp, 0, $delimiter) ?: [];
        $headerKeys = [];
        $unmapped = [];
        foreach ($rawHeaders as $h) {
            $norm = self::normalizeHeader($h);
            $key = $aliases[$norm] ?? null;
            $headerKeys[] = $key;
            if ($key === null && trim((string) $h) !== '') {
                $unmapped[] = trim($h);
            }
        }

        $rows = [];
        $line = 1;
        while (($r = fgetcsv($tmp, 0, $delimiter)) !== false) {
            $line++;
            if (count($r) === 1 && trim((string) $r[0]) === '') {
                continue; // linha vazia
            }
            $row = ['_line' => $line];
            foreach ($headerKeys as $i => $key) {
                if ($key === null) continue;
                $val = isset($r[$i]) ? trim($r[$i]) : null;
                if ($val === '') $val = null;
                $row[$key] = $val;
            }
            $rows[] = $row;
        }
        fclose($tmp);

        return [
            'rows' => $rows,
            'map' => array_values(array_unique(array_filter($headerKeys))),
            'unmapped' => $unmapped,
        ];
    }

    private static function normalizeHeader(string $h): string
    {
        return mb_strtolower(trim($h));
    }

    private static function toUtf8(string $raw): string
    {
        if (mb_check_encoding($raw, 'UTF-8')) {
            return $raw;
        }

        return mb_convert_encoding($raw, 'UTF-8', 'ISO-8859-1');
    }
}
