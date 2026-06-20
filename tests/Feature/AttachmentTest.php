<?php

use App\Models\Attachment;
use App\Models\Patient;
use Database\Factories\PatientFactory;
use Illuminate\Http\UploadedFile;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

beforeEach(function () {
    $this->setUpTenant();
});

afterEach(function () {
    $this->tearDownTenant();
});

test('upload creates an attachment', function () {
    $patient = PatientFactory::new()->create();
    $file = UploadedFile::fake()->create('documento.pdf', 100, 'application/pdf');

    $response = $this->post(route('attachments.upload'), [
        'file' => $file,
        'attachable_type' => 'App\\Models\\Patient',
        'attachable_id' => $patient->id,
        'notes' => 'Documento de identidade',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('attachments', [
        'original_name' => 'documento.pdf',
    ]);
});

test('upload validates file size', function () {
    $patient = PatientFactory::new()->create();
    $file = UploadedFile::fake()->create('large.pdf', 15000, 'application/pdf');

    $response = $this->post(route('attachments.upload'), [
        'file' => $file,
        'attachable_type' => 'App\\Models\\Patient',
        'attachable_id' => $patient->id,
    ]);

    $response->assertSessionHasErrors(['file']);
});

test('upload validates required fields', function () {
    $response = $this->post(route('attachments.upload'), []);

    $response->assertSessionHasErrors(['file', 'attachable_type', 'attachable_id']);
});

test('destroy removes attachment', function () {
    $patient = PatientFactory::new()->create();
    $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

    $this->post(route('attachments.upload'), [
        'file' => $file,
        'attachable_type' => 'App\\Models\\Patient',
        'attachable_id' => $patient->id,
    ]);

    $attachment = Attachment::first();

    $response = $this->delete(route('attachments.destroy', $attachment));

    $response->assertRedirect();
    $this->assertSoftDeleted('attachments', ['id' => $attachment->id]);
});
