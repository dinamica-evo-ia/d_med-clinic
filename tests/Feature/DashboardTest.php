<?php

use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('dashboard renders successfully', function () {
    $this->setUpTenant();

    $response = $this->get(route('dashboard'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('Dashboard'));
});

test('stats returns JSON data', function () {
    $this->setUpTenant();

    $response = $this->get(route('api.stats.dashboard'));

    $response->assertStatus(200);
    $response->assertJsonStructure([
        'today_appointments',
        'total_patients',
        'month_appointments',
    ]);
});

test('dashboard accessible by all roles', function () {
    $this->setUpTenant(['role' => 'receptionist']);

    $response = $this->get(route('dashboard'));

    $response->assertStatus(200);
});

test('guest is redirected to login from dashboard', function () {
    auth()->logout();
    session()->invalidate();

    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('login'));
});
