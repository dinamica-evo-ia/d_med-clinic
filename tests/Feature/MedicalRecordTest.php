<?php

use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Appointment;
use Database\Factories\PatientFactory;
use Database\Factories\DoctorFactory;
use Database\Factories\AppointmentFactory;
use Database\Factories\MedicalRecordFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns records for a patient', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();
    MedicalRecordFactory::new()->count(2)->create([
        'patient_id' => $patient->id,
    ]);

    $response = $this->get(route('patients.records.index', $patient));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->has('records.data', 2)
    );
});

test('index returns empty state for new patient', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();

    $response = $this->get(route('patients.records.index', $patient));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->has('records.data', 0)
    );
});

test('create displays the form', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();

    $response = $this->get(route('patients.records.create', $patient));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('MedicalRecords/Form'));
});

test('store creates a medical record', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();
    $doctor = DoctorFactory::new()->create();
    $appointment = AppointmentFactory::new()->create();

    $response = $this->post(route('patients.records.store', $patient), [
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'appointment_id' => $appointment->id,
        'chief_complaint' => 'Dor de cabeça persistente',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('medical_records', ['patient_id' => $patient->id]);
});

test('store validates required fields', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();

    $response = $this->post(route('patients.records.store', $patient), []);

    $response->assertSessionHasErrors(['doctor_id']);
});

test('show displays record details', function () {
    $this->setUpTenant();
    $record = MedicalRecordFactory::new()->create();

    $response = $this->get(route('patients.records.show', [
        $record->patient_id,
        $record,
    ]));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('MedicalRecords/Show')
    );
});

test('update modifies a record', function () {
    $this->setUpTenant();
    $record = MedicalRecordFactory::new()->create();

    $response = $this->put(route('patients.records.update', [
        $record->patient_id,
        $record,
    ]), [
        'chief_complaint' => 'Updated complaint',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('medical_records', [
        'id' => $record->id,
        'chief_complaint' => 'Updated complaint',
    ]);
});

test('guest is redirected to login', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();
    auth()->logout();
    session()->invalidate();

    $response = $this->get(route('patients.records.index', $patient));

    $response->assertRedirect(route('login'));
});
