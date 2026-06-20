<?php

namespace Database\Factories;

use App\Models\Expense;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'supplier' => fake()->company(),
            'description' => fake()->sentence(),
            'amount' => fake()->randomFloat(2, 50, 10000),
            'payment_method' => fake()->randomElement(['dinheiro', 'cartao_credito', 'pix', 'boleto', 'transferencia']),
            'status' => 'pending',
            'due_date' => fake()->dateTimeBetween('-10 days', '+30 days'),
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'paid',
            'paid_at' => fake()->dateTimeBetween('-30 days', 'now'),
        ]);
    }
}
