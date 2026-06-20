<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

Route::middleware([
    'web',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {

    Route::get('/', [App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');

    // Patients
    Route::resource('patients', App\Http\Controllers\PatientController::class);

    // Appointments
    Route::resource('appointments', App\Http\Controllers\AppointmentController::class);
    Route::patch('appointments/{appointment}/status', [App\Http\Controllers\AppointmentController::class, 'updateStatus'])->name('appointments.status');

    // Medical Records
    Route::get('patients/{patient}/records', [App\Http\Controllers\MedicalRecordController::class, 'index'])->name('patients.records.index');
    Route::get('patients/{patient}/records/create', [App\Http\Controllers\MedicalRecordController::class, 'create'])->name('patients.records.create');
    Route::post('patients/{patient}/records', [App\Http\Controllers\MedicalRecordController::class, 'store'])->name('patients.records.store');
    Route::get('patients/{patient}/records/{record}', [App\Http\Controllers\MedicalRecordController::class, 'show'])->name('patients.records.show');
    Route::get('patients/{patient}/records/{record}/edit', [App\Http\Controllers\MedicalRecordController::class, 'edit'])->name('patients.records.edit');
    Route::put('patients/{patient}/records/{record}', [App\Http\Controllers\MedicalRecordController::class, 'update'])->name('patients.records.update');

    // Invoices
    Route::resource('invoices', App\Http\Controllers\InvoiceController::class)->except(['edit', 'update']);
    Route::patch('invoices/{invoice}/pay', [App\Http\Controllers\InvoiceController::class, 'markAsPaid'])->name('invoices.pay');

    // Doctors
    Route::resource('doctors', App\Http\Controllers\DoctorController::class);

    // API-like routes (JSON responses)
    Route::prefix('api')->group(function () {
        Route::get('appointments/calendar', [App\Http\Controllers\AppointmentController::class, 'calendar'])->name('api.appointments.calendar');
        Route::get('patients/search', [App\Http\Controllers\PatientController::class, 'search'])->name('api.patients.search');
        Route::get('stats/dashboard', [App\Http\Controllers\DashboardController::class, 'stats'])->name('api.stats.dashboard');
    });
});
