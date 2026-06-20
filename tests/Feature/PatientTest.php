<?php

use App\Models\Patient;
use Database\Factories\PatientFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns paginated patients', function () {
    $this->setUpTenant();
    PatientFactory::new()->count(3)->create();

    $response = $this->get(route('patients.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Patients/Index')
        ->has('patients.data', 3)
    );
});

test('store creates a new patient', function () {
    $this->setUpTenant();
    $data = PatientFactory::new()->definition();
    $data['document'] = '111.222.333-44';

    $response = $this->post(route('patients.store'), $data);

    $response->assertRedirect();
    $this->assertDatabaseHas('patients', ['email' => $data['email']]);
});

test('store validates required fields', function () {
    $this->setUpTenant();
    $response = $this->post(route('patients.store'), []);

    $response->assertSessionHasErrors(['name']);
});

test('store validates unique document', function () {
    $this->setUpTenant();
    PatientFactory::new()->create(['document' => '111.222.333-44']);

    $response = $this->post(route('patients.store'), ['name' => 'Another Patient', 'document' => '111.222.333-44']);

    $response->assertSessionHasErrors(['document']);
});

test('show displays patient details', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();

    $response = $this->get(route('patients.show', $patient));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Patients/Show')
        ->where('patient.id', $patient->id)
    );
});

test('update modifies a patient', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();

    $response = $this->put(route('patients.update', $patient), [
        'name' => 'Updated Name',
        'email' => 'updated@test.com',
        'phone' => '(11) 99999-9999',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('patients', ['name' => 'Updated Name']);
});

test('destroy removes a patient', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();

    $response = $this->delete(route('patients.destroy', $patient));

    $response->assertRedirect();
    $this->assertSoftDeleted('patients', ['id' => $patient->id]);
});

test('search returns matching patients', function () {
    $this->setUpTenant();
    PatientFactory::new()->create(['name' => 'João Silva']);
    PatientFactory::new()->count(3)->create();

    $response = $this->get(route('api.patients.search', ['q' => 'João']));

    $response->assertStatus(200);
    $response->assertJsonCount(1);
});

test('index is accessible by all roles', function () {
    $this->setUpTenant(['role' => 'receptionist']);
    PatientFactory::new()->create();

    $response = $this->get(route('patients.index'));

    $response->assertStatus(200);
});

test('guest is redirected to login', function () {
    auth()->logout();
    session()->invalidate();

    $response = $this->get(route('patients.index'));

    $response->assertRedirect(route('login'));
});
