<?php

use Database\Factories\CertificateFactory;
use Database\Factories\PatientFactory;
use Database\Factories\DoctorFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns paginated certificates', function () {
    $this->setUpTenant();
    CertificateFactory::new()->count(3)->create();

    $response = $this->get(route('certificates.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Certificates/Index')
        ->has('certificates.data', 3)
    );
});

test('store creates a certificate', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();
    $doctor = DoctorFactory::new()->create();

    $response = $this->post(route('certificates.store'), [
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'type' => 'medical_certificate',
        'cid_code' => 'J00',
        'description' => 'Paciente apresenta quadro de infecção respiratória.',
        'days' => 5,
        'valid_from' => now()->format('Y-m-d'),
        'valid_until' => now()->addDays(5)->format('Y-m-d'),
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('certificates', ['patient_id' => $patient->id]);
});

test('store validates type enum', function () {
    $this->setUpTenant();
    $response = $this->post(route('certificates.store'), [
        'type' => 'invalid_type',
    ]);

    $response->assertSessionHasErrors(['type']);
});

test('show displays certificate details', function () {
    $this->setUpTenant();
    $certificate = CertificateFactory::new()->create();

    $response = $this->get(route('certificates.show', $certificate));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Certificates/Show')
        ->where('certificate.id', $certificate->id)
    );
});

test('print returns print layout', function () {
    $this->setUpTenant();
    $certificate = CertificateFactory::new()->create();

    $response = $this->get(route('certificates.print', $certificate));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('Certificates/Print'));
});

test('destroy removes a certificate', function () {
    $this->setUpTenant();
    $certificate = CertificateFactory::new()->create();

    $response = $this->delete(route('certificates.destroy', $certificate));

    $response->assertRedirect();
    $this->assertSoftDeleted('certificates', ['id' => $certificate->id]);
});
