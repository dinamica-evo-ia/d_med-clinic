<?php

use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

beforeEach(function () {
    // Base setup as admin — individual tests override role as needed
});

afterEach(function () {
    $this->tearDownTenant();
});

test('admin can access admin-only routes', function () {
    $this->setUpTenant(['role' => 'admin']);

    $response = $this->get(route('users.index'));

    $response->assertStatus(200);
});

test('doctor cannot access admin-only routes', function () {
    $this->setUpTenant(['role' => 'doctor']);

    $response = $this->get(route('users.index'));

    $response->assertStatus(403);
});

test('receptionist cannot access admin-only routes', function () {
    $this->setUpTenant(['role' => 'receptionist']);

    $response = $this->get(route('users.index'));

    $response->assertStatus(403);
});

test('guest is redirected to login from admin routes', function () {
    $this->setUpTenant(['role' => 'admin']);
    auth()->logout();
    session()->invalidate();

    $response = $this->get(route('users.index'));

    $response->assertRedirect(route('login'));
});

test('doctor can access doctor-allowed routes', function () {
    $this->setUpTenant(['role' => 'doctor']);

    $response = $this->get(route('prescriptions.index'));

    $response->assertStatus(200);
});

test('admin can access doctor routes', function () {
    $this->setUpTenant(['role' => 'admin']);

    $response = $this->get(route('prescriptions.index'));

    $response->assertStatus(200);
});
