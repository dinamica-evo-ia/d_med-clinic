<?php

use Database\Factories\ExpenseFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns expenses', function () {
    $this->setUpTenant();
    ExpenseFactory::new()->count(3)->create();

    $response = $this->get(route('financeiro.pagar.index'));

    $response->assertStatus(200);
    $response->assertJsonStructure(['expenses' => ['data'], 'totals']);
});

test('store creates an expense', function () {
    $this->setUpTenant();
    $response = $this->post(route('financeiro.pagar.store'), [
        'supplier' => 'Fornecedor Teste',
        'description' => 'Material de escritório',
        'amount' => 150.00,
        'due_date' => now()->addDays(30)->format('Y-m-d'),
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('expenses', ['description' => 'Material de escritório']);
});

test('store validates required fields', function () {
    $this->setUpTenant();
    $response = $this->post(route('financeiro.pagar.store'), []);

    $response->assertSessionHasErrors(['amount']);
});

test('update modifies an expense', function () {
    $this->setUpTenant();
    $expense = ExpenseFactory::new()->create();

    $response = $this->put(route('financeiro.pagar.update', $expense), [
        'description' => 'Updated expense',
        'amount' => 200.00,
        'due_date' => now()->addDays(15)->format('Y-m-d'),
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('expenses', ['description' => 'Updated expense']);
});

test('markAsPaid updates expense status', function () {
    $this->setUpTenant();
    $expense = ExpenseFactory::new()->create(['status' => 'pending']);

    $response = $this->patch(route('financeiro.pagar.pay', $expense));

    $response->assertRedirect();
    $this->assertDatabaseHas('expenses', [
        'id' => $expense->id,
        'status' => 'paid',
    ]);
});

test('cancel updates expense status', function () {
    $this->setUpTenant();
    $expense = ExpenseFactory::new()->create(['status' => 'pending']);

    $response = $this->patch(route('financeiro.pagar.cancel', $expense));

    $response->assertRedirect();
    $this->assertDatabaseHas('expenses', [
        'id' => $expense->id,
        'status' => 'cancelled',
    ]);
});

test('destroy removes an expense', function () {
    $this->setUpTenant();
    $expense = ExpenseFactory::new()->create();

    $response = $this->delete(route('financeiro.pagar.destroy', $expense));

    $response->assertRedirect();
    $this->assertSoftDeleted('expenses', ['id' => $expense->id]);
});

test('guest is redirected to login', function () {
    auth()->logout();
    session()->invalidate();

    $response = $this->get(route('financeiro.pagar.index'));

    $response->assertRedirect(route('login'));
});
