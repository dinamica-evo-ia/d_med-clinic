<?php

namespace App\Support;

use App\Models\Doctor;

/*
 * Estrutura do template de impressão do prontuário (config por médico, em doctors.print_settings).
 * normalize() garante todas as chaves a partir de um valor possivelmente parcial/null, e
 * prefillFromDoctor() preenche o cabeçalho com os dados do médico na primeira vez.
 */
class PrintSettings
{
    public const PATIENT_FIELDS = ['nome', 'cpf', 'rg', 'prontuario', 'contato', 'endereco'];

    public static function defaults(): array
    {
        return [
            'title' => '',
            'print_type' => 'padrao',
            'header' => [
                'logo_left' => false,
                'show_header' => true,
                'logo_right' => true,
                'prefix' => 'Dr.',
                'name' => '',
                'specialty' => '',
                'rqe' => '',
                'cpf' => '',
                'council' => 'CRM',
                'council_number' => '',
                'phones' => '',
                'address' => '',
                'city' => '',
                'state' => '',
                'logo_path' => null,
            ],
            'show_title' => true,
            'patient_data' => [
                'enabled' => true,
                'fields' => [
                    'nome' => true,
                    'cpf' => true,
                    'rg' => false,
                    'prontuario' => false,
                    'contato' => false,
                    'endereco' => false,
                ],
            ],
            'signature' => true,
            'footer' => [
                'enabled' => true,
                'text' => '',
            ],
        ];
    }

    /** Mescla um valor (parcial/null) sobre os defaults, mantendo apenas as chaves conhecidas. */
    public static function normalize(?array $value): array
    {
        $d = self::defaults();
        if (! $value) return $d;

        $out = $d;
        $out['title'] = (string) ($value['title'] ?? $d['title']);
        $out['print_type'] = (string) ($value['print_type'] ?? $d['print_type']);
        $out['show_title'] = (bool) ($value['show_title'] ?? $d['show_title']);
        $out['signature'] = (bool) ($value['signature'] ?? $d['signature']);

        foreach ($d['header'] as $k => $dv) {
            $hv = $value['header'][$k] ?? $dv;
            $out['header'][$k] = is_bool($dv) ? (bool) $hv : (is_null($dv) ? ($hv ?: null) : (string) $hv);
        }

        $out['patient_data']['enabled'] = (bool) ($value['patient_data']['enabled'] ?? $d['patient_data']['enabled']);
        foreach (self::PATIENT_FIELDS as $f) {
            $out['patient_data']['fields'][$f] = (bool) ($value['patient_data']['fields'][$f] ?? $d['patient_data']['fields'][$f]);
        }

        $out['footer']['enabled'] = (bool) ($value['footer']['enabled'] ?? $d['footer']['enabled']);
        $out['footer']['text'] = (string) ($value['footer']['text'] ?? $d['footer']['text']);

        return $out;
    }

    /** Se ainda não há config salva, monta os defaults já com os dados do médico no cabeçalho. */
    public static function forDoctor(Doctor $doctor): array
    {
        if (! empty($doctor->print_settings)) {
            return self::normalize($doctor->print_settings);
        }

        $s = self::defaults();
        $s['header']['name'] = $doctor->name ?? '';
        $s['header']['specialty'] = $doctor->specialty ?? '';
        $s['header']['cpf'] = $doctor->document ?? '';
        $s['header']['council_number'] = $doctor->license_number ?? '';
        $s['header']['phones'] = $doctor->phone ?? '';
        return $s;
    }
}
