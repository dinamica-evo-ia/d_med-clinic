<?php

namespace Database\Seeders;

use App\Models\ExamType;
use Illuminate\Database\Seeder;

class ExamTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            // Blood tests
            ['code' => 'HB', 'name' => 'Hemograma Completo', 'category' => 'Sangue'],
            ['code' => 'GLI', 'name' => 'Glicemia em Jejum', 'category' => 'Sangue'],
            ['code' => 'COL', 'name' => 'Colesterol Total e Frações', 'category' => 'Sangue'],
            ['code' => 'TGL', 'name' => 'Triglicérides', 'category' => 'Sangue'],
            ['code' => 'UR', 'name' => 'Uréia', 'category' => 'Sangue'],
            ['code' => 'CR', 'name' => 'Creatinina', 'category' => 'Sangue'],
            ['code' => 'TGO', 'name' => 'TGO (AST)', 'category' => 'Sangue'],
            ['code' => 'TGP', 'name' => 'TGP (ALT)', 'category' => 'Sangue'],
            ['code' => 'TSH', 'name' => 'TSH', 'category' => 'Sangue'],
            ['code' => 'T4L', 'name' => 'T4 Livre', 'category' => 'Sangue'],
            ['code' => 'PSA', 'name' => 'PSA Total', 'category' => 'Sangue'],
            ['code' => 'VITD', 'name' => 'Vitamina D', 'category' => 'Sangue'],
            ['code' => 'VITB12', 'name' => 'Vitamina B12', 'category' => 'Sangue'],
            ['code' => 'FER', 'name' => 'Ferritina', 'category' => 'Sangue'],
            ['code' => 'PCR', 'name' => 'Proteína C Reativa', 'category' => 'Sangue'],
            ['code' => 'VHS', 'name' => 'VHS', 'category' => 'Sangue'],
            ['code' => 'HC', 'name' => 'Hemoglobina Glicada', 'category' => 'Sangue'],
            ['code' => 'INR', 'name' => 'TAP/INR', 'category' => 'Sangue'],
            ['code' => 'AU', 'name' => 'Ácido Úrico', 'category' => 'Sangue'],

            // Urine
            ['code' => 'EAS', 'name' => 'EAS / Urina Tipo 1', 'category' => 'Urina'],
            ['code' => 'UROC', 'name' => 'Urocultura', 'category' => 'Urina'],

            // Imaging
            ['code' => 'RX_T', 'name' => 'Raio-X de Tórax', 'category' => 'Imagem'],
            ['code' => 'RX_COL', 'name' => 'Raio-X de Coluna', 'category' => 'Imagem'],
            ['code' => 'USG_ABD', 'name' => 'Ultrassom Abdome Total', 'category' => 'Imagem'],
            ['code' => 'USG_PEL', 'name' => 'Ultrassom Pélvico', 'category' => 'Imagem'],
            ['code' => 'USG_MAM', 'name' => 'Ultrassom de Mamas', 'category' => 'Imagem'],
            ['code' => 'MAMO', 'name' => 'Mamografia', 'category' => 'Imagem'],
            ['code' => 'TC_CRAN', 'name' => 'Tomografia Crânio', 'category' => 'Imagem'],
            ['code' => 'TC_ABD', 'name' => 'Tomografia Abdome', 'category' => 'Imagem'],
            ['code' => 'RNM_CRAN', 'name' => 'Ressonância Crânio', 'category' => 'Imagem'],
            ['code' => 'RNM_COL', 'name' => 'Ressonância Coluna', 'category' => 'Imagem'],
            ['code' => 'DENS', 'name' => 'Densitometria Óssea', 'category' => 'Imagem'],
            ['code' => 'ECG', 'name' => 'Eletrocardiograma', 'category' => 'Cardiologia'],
            ['code' => 'ECO', 'name' => 'Ecocardiograma', 'category' => 'Cardiologia'],
            ['code' => 'MAP', 'name' => 'MAPA 24h', 'category' => 'Cardiologia'],
            ['code' => 'HOL', 'name' => 'Holter 24h', 'category' => 'Cardiologia'],
            ['code' => 'ERG', 'name' => 'Teste Ergométrico', 'category' => 'Cardiologia'],

            // Other
            ['code' => 'ENDOS', 'name' => 'Endoscopia Digestiva', 'category' => 'Outros'],
            ['code' => 'COLONO', 'name' => 'Colonoscopia', 'category' => 'Outros'],
            ['code' => 'ESP', 'name' => 'Espirometria', 'category' => 'Outros'],
        ];

        foreach ($types as $type) {
            ExamType::create($type);
        }
    }
}
