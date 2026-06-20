<?php

use App\Models\Patient;
use Database\Factories\InvoiceFactory;
use Database\Factories\PatientFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns invoices', function () {
    $this->setUpTenant();
    InvoiceFactory::new()->count(3)->create();
    $response = $this->get(route('financeiro.receber.index'));
    $response->assertStatus(200);
    $response->assertJsonStructure(['invoices' => ['data'], 'totals']);
});

test('store creates an invoice', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();

    $response = $this->post(route('financeiro.receber.store'), [
        'patient_id' => $patient->id,
        'description' => 'Consulta de retorno',
        'amount' => 250.00,
        'due_date' => now()->addDays(30)->format('Y-m-d'),
        'payment_method' => 'pix',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('invoices', ['description' => 'Consulta de retorno']);
});

test('store validates required fields', function () {
    $this->setUpTenant();
    $response = $this->post(route('financeiro.receber.store'), []);

    $response->assertSessionHasErrors(['patient_id', 'amount']);
});

test('show displays invoice details', function () {
    $this->setUpTenant();
    $invoice = InvoiceFactory::new()->create();

    $response = $this->get(route('financeiro.receber.show', $invoice));

    $response->assertStatus(200);
    $response->assertStatus(200);
});

test('update modifies an invoice', function () {
    $this->setUpTenant();
    $invoice = InvoiceFactory::new()->create();
    $patient = $invoice->patient;
    $response = $this->put(route('financeiro.receber.update', $invoice), [
        'patient_id' => $patient->id,
        'description' => 'Updated description',
        'amount' => 300.00,
        'due_date' => now()->addDays(15)->format('Y-m-d'),
    ]);
    $response->assertRedirect();
    $this->assertDatabaseHas('invoices', ['description' => 'Updated description']);
});

test('markAsPaid updates invoice status', function () {
    $this->setUpTenant();
    $invoice = InvoiceFactory::new()->create(['status' => 'pending']);

    $response = $this->patch(route('financeiro.receber.pay', $invoice));

    $response->assertRedirect();
    $this->assertDatabaseHas('invoices', [
        'id' => $invoice->id,
        'status' => 'paid',
    ]);
});

test('cancel updates invoice status', function () {
    $this->setUpTenant();
    $invoice = InvoiceFactory::new()->create(['status' => 'pending']);

    $response = $this->patch(route('financeiro.receber.cancel', $invoice));

    $response->assertRedirect();
    $this->assertDatabaseHas('invoices', [
        'id' => $invoice->id,
        'status' => 'cancelled',
    ]);
});

test('destroy removes an invoice', function () {
    $this->setUpTenant();
    $invoice = InvoiceFactory::new()->create();

    $response = $this->delete(route('financeiro.receber.destroy', $invoice));

    $response->assertRedirect();
    $this->assertSoftDeleted('invoices', ['id' => $invoice->id]);
});

test('guest is redirected to login', function () {
    auth()->logout();
    session()->invalidate();

    $response = $this->get(route('financeiro.receber.index'));

    $response->assertRedirect(route('login'));
});
