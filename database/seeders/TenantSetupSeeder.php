<?php

namespace Database\Seeders;

use App\Models\CidCode;
use App\Models\TransactionCategory;
use Illuminate\Database\Seeder;

/*
 * Seed mínimo rodado quando uma CLÍNICA NOVA é criada via Painel Master.
 * SÓ dados estruturais (catálogos) — nada de pacientes/médicos/consultas fictícios.
 * O médico cadastra o resto sozinho ou importa.
 */
class TenantSetupSeeder extends Seeder
{
    public function run(): void
    {
        // CID-10 (catálogo público, ~469 códigos — não tem como o médico digitar)
        $path = database_path('data/cid10_codes.json');
        if (file_exists($path)) {
            $cidCodes = json_decode(file_get_contents($path), true) ?: [];
            foreach (array_chunk($cidCodes, 50) as $chunk) {
                CidCode::insert($chunk);
            }
        }

        // Categorias financeiras padrão (a clínica pode editar/adicionar depois)
        $categories = [
            ['name' => 'Consulta', 'type' => 'income', 'color' => '#3B82F6'],
            ['name' => 'Retorno', 'type' => 'income', 'color' => '#10B981'],
            ['name' => 'Exame', 'type' => 'income', 'color' => '#8B5CF6'],
            ['name' => 'Procedimento', 'type' => 'income', 'color' => '#F59E0B'],
            ['name' => 'Plano de Saúde', 'type' => 'income', 'color' => '#EC4899'],
            ['name' => 'Outras Receitas', 'type' => 'income', 'color' => '#6B7280'],
            ['name' => 'Aluguel', 'type' => 'expense', 'color' => '#EF4444'],
            ['name' => 'Salários', 'type' => 'expense', 'color' => '#F97316'],
            ['name' => 'Material', 'type' => 'expense', 'color' => '#EAB308'],
            ['name' => 'Equipamento', 'type' => 'expense', 'color' => '#22C55E'],
            ['name' => 'Marketing', 'type' => 'expense', 'color' => '#06B6D4'],
            ['name' => 'Impostos', 'type' => 'expense', 'color' => '#6366F1'],
            ['name' => 'Utilidades', 'type' => 'expense', 'color' => '#A855F7'],
            ['name' => 'Outras Despesas', 'type' => 'expense', 'color' => '#6B7280'],
        ];
        foreach ($categories as $data) {
            TransactionCategory::create($data);
        }
    }
}
