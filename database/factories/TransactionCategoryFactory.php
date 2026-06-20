<?php

namespace Database\Factories;

use App\Models\TransactionCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransactionCategoryFactory extends Factory
{
    protected $model = TransactionCategory::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Consultas', 'Exames', 'Procedimentos', 'Salários',
                'Aluguel', 'Material', 'Impostos', 'Serviços',
            ]),
            'type' => fake()->randomElement(['income', 'expense']),
            'color' => fake()->hexColor(),
            'icon' => fake()->randomElement(['💰', '🏥', '📋', '💊']),
        ];
    }

    public function income(): static
    {
        return $this->state(fn (array $attrs) => [
            'type' => 'income',
            'name' => fake()->randomElement(['Consultas', 'Exames', 'Procedimentos', 'Convenios']),
        ]);
    }

    public function expense(): static
    {
        return $this->state(fn (array $attrs) => [
            'type' => 'expense',
            'name' => fake()->randomElement(['Salários', 'Aluguel', 'Material', 'Impostos']),
        ]);
    }
}
