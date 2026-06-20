<?php

use App\Models\Patient;
use App\Models\Appointment;
use Database\Factories\PatientFactory;
use Database\Factories\AppointmentFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

beforeEach(function () {
    $this->setUpTenant();
});

afterEach(function () {
    $this->tearDownTenant();
});

test('index page renders', function () {
    $response = $this->get(route('reports.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('Reports/Index'));
});

test('exportPatients returns CSV headers', function () {
    PatientFactory::new()->create();

    $response = $this->get(route('reports.patients'));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'text/csv; charset=utf-8');
    $response->assertHeader('Content-Disposition', 'attachment; filename="pacientes.csv"');
});

test('exportAppointments returns CSV with date filter', function () {
    AppointmentFactory::new()->completed()->create();

    $response = $this->get(route('reports.appointments', [
        'date_from' => now()->subMonth()->format('Y-m-d'),
        'date_to' => now()->format('Y-m-d'),
    ]));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'text/csv; charset=utf-8');
    $response->assertHeader('Content-Disposition', 'attachment; filename="consultas.csv"');
});

test('exportFinancial returns CSV with date filter', function () {
    $response = $this->get(route('reports.financial', [
        'date_from' => now()->subMonth()->format('Y-m-d'),
        'date_to' => now()->format('Y-m-d'),
    ]));

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'text/csv; charset=utf-8');
    $response->assertHeader('Content-Disposition', 'attachment; filename="financeiro.csv"');
});
