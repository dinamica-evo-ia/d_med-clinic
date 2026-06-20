<?php

use App\Models\Patient;
use App\Models\Doctor;
use Database\Factories\AppointmentFactory;
use Database\Factories\PatientFactory;
use Database\Factories\DoctorFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns paginated appointments', function () {
    $this->setUpTenant();
    AppointmentFactory::new()->count(3)->create();

    $response = $this->get(route('appointments.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Appointments/Index')
        ->has('appointments.data', 3)
    );
});

test('store creates an appointment', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();
    $doctor = DoctorFactory::new()->create();
    $startsAt = now()->addDay()->setHour(10)->setMinute(0);

    $response = $this->post(route('appointments.store'), [
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'starts_at' => $startsAt->format('Y-m-d H:i:s'),
        'ends_at' => $startsAt->copy()->addMinutes(30)->format('Y-m-d H:i:s'),
        'type' => 'consultation',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('appointments', ['patient_id' => $patient->id]);
});

test('store validates required fields', function () {
    $this->setUpTenant();
    $response = $this->post(route('appointments.store'), []);

    $response->assertSessionHasErrors(['patient_id', 'doctor_id', 'starts_at']);
});

test('show displays appointment details', function () {
    $this->setUpTenant();
    $appointment = AppointmentFactory::new()->create();

    $response = $this->get(route('appointments.show', $appointment));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Appointments/Show')
        ->where('appointment.id', $appointment->id)
    );
});

test('update modifies an appointment', function () {
    $this->setUpTenant();
    $appointment = AppointmentFactory::new()->create();

    $response = $this->put(route('appointments.update', $appointment), [
        'patient_id' => $appointment->patient_id,
        'doctor_id' => $appointment->doctor_id,
        'starts_at' => $appointment->starts_at->format('Y-m-d H:i:s'),
        'ends_at' => $appointment->ends_at->format('Y-m-d H:i:s'),
        'type' => 'followup',
        'notes' => 'Paciente retornando para avaliação',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'type' => 'followup']);
});

test('updateStatus changes appointment status', function () {
    $this->setUpTenant();
    $appointment = AppointmentFactory::new()->create();

    $response = $this->patch(route('appointments.status', $appointment), [
        'status' => 'cancelled',
        'cancellation_reason' => 'Paciente desistiu',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('appointments', [
        'id' => $appointment->id,
        'status' => 'cancelled',
    ]);
});

test('calendar returns JSON for fullCalendar', function () {
    $this->setUpTenant();
    AppointmentFactory::new()->count(2)->create();

    $response = $this->get(route('api.appointments.calendar', [
        'start' => now()->subMonth()->format('Y-m-d'),
        'end' => now()->addMonths(2)->format('Y-m-d'),
    ]));

    $response->assertStatus(200);
    $response->assertJsonCount(2);
});

test('prevents scheduling conflict for same doctor', function () {
    $this->setUpTenant();
    $doctor = DoctorFactory::new()->create();
    $patient = PatientFactory::new()->create();
    $startsAt = now()->addDay()->setHour(10)->setMinute(0);

    // Create first appointment
    AppointmentFactory::new()->create([
        'doctor_id' => $doctor->id,
        'starts_at' => $startsAt,
        'ends_at' => $startsAt->copy()->addMinutes(30),
    ]);

    // Try to create overlapping appointment
    $response = $this->post(route('appointments.store'), [
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'starts_at' => $startsAt->format('Y-m-d H:i:s'),
        'ends_at' => $startsAt->copy()->addMinutes(30)->format('Y-m-d H:i:s'),
        'type' => 'consulta',
    ]);

    $response->assertSessionHasErrors();
});

test('index is accessible by receptionist', function () {
    $this->setUpTenant(['role' => 'receptionist']);

    $response = $this->get(route('appointments.index'));

    $response->assertStatus(200);
});

test('guest is redirected to login', function () {
    auth()->logout();
    session()->invalidate();

    $response = $this->get(route('appointments.index'));

    $response->assertRedirect(route('login'));
});
