<?php

namespace Database\Factories;

use App\Models\ExamType;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExamTypeFactory extends Factory
{
    protected $model = ExamType::class;

    public function definition(): array
    {
        return [
            'code' => fake()->unique()->lexify('EXAM-????'),
            'name' => fake()->unique()->randomElement([
                'Hemograma Completo', 'Glicemia em Jejum', 'Colesterol Total',
                'Triglicerídeos', 'Ácido Úrico', 'Creatinina', 'Uréia',
                'TGO/AST', 'TGP/ALT', 'Gama-GT', 'Eletrocardiograma',
            ]),
            'category' => fake()->randomElement(['Sangue', 'Urina', 'Imagem', 'Cardiologia', 'Outros']),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
