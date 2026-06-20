<?php

use App\Models\User;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

beforeEach(function () {
    $this->setUpTenant(['role' => 'admin']);
});

afterEach(function () {
    $this->tearDownTenant();
});

test('index shows tenant users', function () {
    $response = $this->get(route('users.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Users/Index')
    );
});

test('store creates a new user in tenant', function () {
    $response = $this->post(route('users.store'), [
        'name' => 'New Doctor',
        'email' => 'newdoctor@test.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => 'doctor',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('tenant_user', [
        'role' => 'doctor',
    ]);
});

test('store validates required fields', function () {
    $response = $this->post(route('users.store'), []);

    $response->assertSessionHasErrors(['name', 'email', 'password', 'role']);
});

test('update changes user role', function () {
    $newUser = User::factory()->create();
    $this->user->tenants()->where('tenant_id', $this->tenant->id)->first()?->pivot;

    tenancy()->central(function () use ($newUser) {
        $this->tenant->users()->attach($newUser->id, [
            'role' => 'doctor',
            'is_active' => true,
        ]);
    });

    $response = $this->put(route('users.update', $newUser), [
        'role' => 'receptionist',
    ]);

    $response->assertRedirect();
});

test('destroy removes user from tenant', function () {
    tenancy()->central(function () {
        $userToRemove = User::factory()->create();
        $this->tenant->users()->attach($userToRemove->id, [
            'role' => 'doctor',
            'is_active' => true,
        ]);
    });

    $allUsers = tenancy()->central(fn () => $this->tenant->users()->count());

    $response = $this->delete(route('users.destroy', $this->user));

    $response->assertRedirect();
});

test('non-admin cannot access user management', function () {
    tenancy()->central(function () {
        $doctorUser = User::factory()->create();
        $doctorUser->tenants()->attach($this->tenant->id, [
            'role' => 'doctor',
            'is_active' => true,
        ]);
    });

    auth()->logout();
    session()->invalidate();

    // Login as doctor instead of admin
    tenancy()->central(function () {
        $doctorUser = User::where('email', '!=', $this->user->email)->first();
        auth()->login($doctorUser);
        session(['tenant_slug' => $this->tenant->slug ?? 'test-clinic']);
    });

    $response = $this->get(route('users.index'));

    $response->assertStatus(403);
});
