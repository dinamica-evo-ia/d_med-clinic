<?php

namespace Database\Factories;

use App\Models\Invoice;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        return [
            'patient_id' => PatientFactory::new(),
            'description' => fake()->sentence(),
            'amount' => fake()->randomFloat(2, 50, 5000),
            'payment_method' => fake()->randomElement(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto']),
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

    public function cancelled(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'cancelled',
        ]);
    }
}
