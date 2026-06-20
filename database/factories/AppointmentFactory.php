<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    public function definition(): array
    {
        $startsAt = fake()->dateTimeBetween('now', '+30 days');
        $endsAt = (clone $startsAt)->modify('+30 minutes');

        return [
            'patient_id' => PatientFactory::new(),
            'doctor_id' => DoctorFactory::new(),
            'user_id' => User::factory(),
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => 'scheduled',
            'type' => fake()->randomElement(['consulta', 'retorno', 'exame', 'emergencia']),
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => fake()->sentence(),
        ]);
    }

    public function completed(): static
    {
        $startsAt = fake()->dateTimeBetween('-30 days', '-1 day');
        $endsAt = (clone $startsAt)->modify('+30 minutes');

        return $this->state(fn (array $attrs) => [
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => 'completed',
        ]);
    }
}
