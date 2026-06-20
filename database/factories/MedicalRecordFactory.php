<?php

namespace Database\Factories;

use App\Models\MedicalRecord;
use Illuminate\Database\Eloquent\Factories\Factory;

class MedicalRecordFactory extends Factory
{
    protected $model = MedicalRecord::class;

    public function definition(): array
    {
        return [
            'patient_id' => PatientFactory::new(),
            'doctor_id' => DoctorFactory::new(),
            'appointment_id' => AppointmentFactory::new(),
            'chief_complaint' => fake()->sentence(),
            'anamnesis' => ['history' => fake()->paragraph(), 'symptoms' => fake()->words(3, true)],
            'physical_exam' => ['bp' => '120/80', 'hr' => '72', 'temp' => '36.5'],
            'diagnosis' => [['code' => 'J00', 'description' => 'Infecção aguda das vias aéreas superiores']],
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
