<?php

use App\Models\ExamType;
use Database\Factories\PatientFactory;
use Database\Factories\DoctorFactory;
use Database\Factories\ExamTypeFactory;
use Database\Factories\ExamRequestFactory;
use Database\Factories\ExamRequestItemFactory;
use Tests\Traits\TenantSetup;

uses(TenantSetup::class);

afterEach(function () {
    $this->tearDownTenant();
});

test('index returns paginated exam requests', function () {
    $this->setUpTenant();
    ExamRequestFactory::new()->count(3)->create();

    $response = $this->get(route('exam-requests.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('ExamRequests/Index')
        ->has('examRequests.data', 3)
    );
});

test('store creates an exam request with items', function () {
    $this->setUpTenant();
    $patient = PatientFactory::new()->create();
    $doctor = DoctorFactory::new()->create();
    $examType = ExamTypeFactory::new()->create();

    $response = $this->post(route('exam-requests.store'), [
        'patient_id' => $patient->id,
        'doctor_id' => $doctor->id,
        'notes' => 'Exames de rotina',
        'requested_date' => now()->format('Y-m-d'),
        'items' => [
            ['exam_type_id' => $examType->id, 'observation' => 'Jejum de 8h'],
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('exam_requests', ['patient_id' => $patient->id]);
    $this->assertDatabaseHas('exam_request_items', ['exam_type_id' => $examType->id]);
});

test('store validates required items', function () {
    $this->setUpTenant();
    $response = $this->post(route('exam-requests.store'), [
        'patient_id' => fake()->uuid(),
        'items' => [],
    ]);

    $response->assertSessionHasErrors(['items']);
});

test('show displays exam request with items', function () {
    $this->setUpTenant();
    $examRequest = ExamRequestFactory::new()->create();
    ExamRequestItemFactory::new()->create(['exam_request_id' => $examRequest->id]);

    $response = $this->get(route('exam-requests.show', $examRequest));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('ExamRequests/Show')
        ->where('examRequest.id', $examRequest->id)
    );
});

test('updateStatus changes exam request status', function () {
    $this->setUpTenant();
    $examRequest = ExamRequestFactory::new()->create(['status' => 'triggered']);

    $response = $this->patch(route('exam-requests.status', $examRequest), [
        'status' => 'performed',
        'result' => 'Resultados dentro da normalidade.',
        'performed_date' => now()->format('Y-m-d'),
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('exam_requests', [
        'id' => $examRequest->id,
        'status' => 'performed',
    ]);
});

test('updateStatus validates status enum', function () {
    $this->setUpTenant();
    $examRequest = ExamRequestFactory::new()->create();

    $response = $this->patch(route('exam-requests.status', $examRequest), [
        'status' => 'invalid_status',
    ]);

    $response->assertSessionHasErrors(['status']);
});

test('print returns print layout', function () {
    $this->setUpTenant();
    $examRequest = ExamRequestFactory::new()->create();

    $response = $this->get(route('exam-requests.print', $examRequest));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('ExamRequests/Print'));
});

test('destroy removes an exam request', function () {
    $this->setUpTenant();
    $examRequest = ExamRequestFactory::new()->create();

    $response = $this->delete(route('exam-requests.destroy', $examRequest));

    $response->assertRedirect();
    $this->assertSoftDeleted('exam_requests', ['id' => $examRequest->id]);
});

test('filter by status', function () {
    $this->setUpTenant();
    ExamRequestFactory::new()->create(['status' => 'triggered']);
    ExamRequestFactory::new()->count(2)->create(['status' => 'performed']);

    $response = $this->get(route('exam-requests.index', ['status' => 'triggered']));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->has('examRequests.data', 1)
    );
});
