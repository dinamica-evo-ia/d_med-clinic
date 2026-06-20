<?php

namespace Database\Factories;

use App\Models\Certificate;
use Illuminate\Database\Eloquent\Factories\Factory;

class CertificateFactory extends Factory
{
    protected $model = Certificate::class;

    public function definition(): array
    {
        $validFrom = fake()->dateTimeBetween('now', '+30 days');
        $validUntil = (clone $validFrom)->modify('+' . fake()->numberBetween(1, 30) . ' days');

        return [
            'patient_id' => PatientFactory::new(),
            'doctor_id' => DoctorFactory::new(),
            'type' => fake()->randomElement(['medico', 'comparecimento', 'relatorio', 'atestado']),
            'cid_code' => fake()->randomElement(['J00', 'J01', 'J02', 'M54', 'R51', 'A09']),
            'description' => fake()->paragraph(),
            'days' => fake()->numberBetween(1, 30),
            'valid_from' => $validFrom,
            'valid_until' => $validUntil,
        ];
    }
}
