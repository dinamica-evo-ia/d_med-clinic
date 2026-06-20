<?php

namespace Database\Factories;

use App\Models\Doctor;
use Illuminate\Database\Eloquent\Factories\Factory;

class DoctorFactory extends Factory
{
    protected $model = Doctor::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name('male'),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'specialty' => fake()->randomElement([
                'Cardiologia', 'Clínico Geral', 'Dermatologia',
                'Pediatria', 'Ortopedia', 'Ginecologia',
                'Neurologia', 'Oftalmologia',
            ]),
            'license_number' => fake()->numerify('CRM-####'),
            'document' => fake()->numerify('###.###.###-##'),
            'bio' => fake()->optional()->paragraph(),
            'schedule' => [
                'monday' => ['start' => '08:00', 'end' => '18:00'],
                'tuesday' => ['start' => '08:00', 'end' => '18:00'],
                'wednesday' => ['start' => '08:00', 'end' => '18:00'],
                'thursday' => ['start' => '08:00', 'end' => '18:00'],
                'friday' => ['start' => '08:00', 'end' => '17:00'],
            ],
            'is_active' => true,
        ];
    }
}
