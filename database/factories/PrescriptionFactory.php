<?php

namespace Database\Factories;

use App\Models\Prescription;
use Illuminate\Database\Eloquent\Factories\Factory;

class PrescriptionFactory extends Factory
{
    protected $model = Prescription::class;

    public function definition(): array
    {
        return [
            'patient_id' => PatientFactory::new(),
            'doctor_id' => DoctorFactory::new(),
            'medicines' => [
                [
                    'medication' => 'Amoxicilina 500mg',
                    'dosage' => '1 comprimido',
                    'route' => 'oral',
                    'frequency' => '8/8h',
                    'duration' => '7 dias',
                    'quantity' => 21,
                    'notes' => 'Tomar após as refeições',
                ],
                [
                    'medication' => 'Paracetamol 750mg',
                    'dosage' => '1 comprimido',
                    'route' => 'oral',
                    'frequency' => '6/6h',
                    'duration' => '5 dias',
                    'quantity' => 20,
                    'notes' => '',
                ],
            ],
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
