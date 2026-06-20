<?php

use App\Models\Doctor;
use Database\Factories\DoctorFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns paginated doctors', function () {
    $this->setUpTenant();
    DoctorFactory::new()->count(3)->create();

    $response = $this->get(route('doctors.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Doctors/Index')
        ->has('doctors.data', 3)
    );
});

test('index shows empty state', function () {
    $this->setUpTenant();
    $response = $this->get(route('doctors.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Doctors/Index')
        ->has('doctors.data', 0)
    );
});

test('store creates a new doctor', function () {
    $this->setUpTenant();
    $data = DoctorFactory::new()->definition();

    $response = $this->post(route('doctors.store'), $data);

    $response->assertRedirect();
    $this->assertDatabaseHas('doctors', ['email' => $data['email']]);
});

test('store validates required fields', function () {
    $this->setUpTenant();
    $response = $this->post(route('doctors.store'), []);

    $response->assertSessionHasErrors(['name']);
});

test('update modifies a doctor', function () {
    $this->setUpTenant();
    $doctor = DoctorFactory::new()->create();

    $response = $this->put(route('doctors.update', $doctor), [
        'name' => 'Dr. Updated',
        'email' => 'updated@doctor.com',
        'specialty' => 'Cardiologia',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('doctors', ['name' => 'Dr. Updated']);
});

test('destroy removes a doctor', function () {
    $this->setUpTenant();
    $doctor = DoctorFactory::new()->create();

    $response = $this->delete(route('doctors.destroy', $doctor));

    $response->assertRedirect();
    $this->assertSoftDeleted('doctors', ['id' => $doctor->id]);
});
