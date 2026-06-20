<?php

namespace Database\Factories;

use App\Models\ExamRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExamRequestFactory extends Factory
{
    protected $model = ExamRequest::class;

    public function definition(): array
    {
        return [
            'patient_id' => PatientFactory::new(),
            'doctor_id' => DoctorFactory::new(),
            'status' => 'triggered',
            'notes' => fake()->optional()->sentence(),
            'requested_date' => now()->format('Y-m-d'),
        ];
    }
}
