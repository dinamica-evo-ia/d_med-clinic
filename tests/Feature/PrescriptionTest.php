<?php

use App\Models\Patient;
use App\Models\Doctor;
use Database\Factories\PatientFactory;
use Database\Factories\DoctorFactory;
use Database\Factories\PrescriptionFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns paginated prescriptions', function () {
    $this->setUpTenant();
    PrescriptionFactory::new()->count(3)->create();

    $response = $this->get(route('prescriptions.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Prescriptions/Index')
        ->has('prescriptions.data', 3)
    );
});

test('store creates a prescription with medicines', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();
    $doctor = DoctorFactory::new()->create();

    $response = $this->post(route('prescriptions.store'), [
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'medicines' => [
            [
                'medication' => 'Amoxicilina 500mg',
                'dosage' => '1 comprimido',
                'route' => 'oral',
                'frequency' => '8/8h',
                'duration' => '7 dias',
                'quantity' => '21',
                'notes' => '',
            ],
        ],
        'notes' => 'Tomar após refeições',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('prescriptions', ['patient_id' => $patient->id]);
});

test('store validates medicines array', function () {
    $this->setUpTenant();
    $response = $this->post(route('prescriptions.store'), [
        'patient_id' => fake()->uuid(),
        'medicines' => [],
    ]);

    $response->assertSessionHasErrors(['medicines']);
});

test('show displays prescription details', function () {
    $this->setUpTenant();
    $prescription = PrescriptionFactory::new()->create();

    $response = $this->get(route('prescriptions.show', $prescription));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Prescriptions/Show')
        ->where('prescription.id', $prescription->id)
    );
});

test('print returns print layout', function () {
    $this->setUpTenant();
    $prescription = PrescriptionFactory::new()->create();

    $response = $this->get(route('prescriptions.print', $prescription));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('Prescriptions/Print'));
});

test('destroy removes a prescription', function () {
    $this->setUpTenant();
    $prescription = PrescriptionFactory::new()->create();

    $response = $this->delete(route('prescriptions.destroy', $prescription));

    $response->assertRedirect();
    $this->assertSoftDeleted('prescriptions', ['id' => $prescription->id]);
});

test('search filters by patient name', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create(['name' => 'Carlos Alberto']);
    PrescriptionFactory::new()->create(['patient_id' => $patient->id]);
    PrescriptionFactory::new()->count(2)->create();

    $response = $this->get(route('prescriptions.index', ['search' => 'Carlos']));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->has('prescriptions.data', 1)
    );
});
