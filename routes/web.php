<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\MedicalRecordController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FinancialReportController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\CidCodeController;
use App\Http\Controllers\TenantUserController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ExamRequestController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StudioMedController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Home — redirects based on auth/tenant state
Route::get('/', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }
    // Master vai direto pro painel do produto (não tem dashboard de clínica)
    if (auth()->user()->is_master) {
        return redirect()->route('master.dashboard');
    }
    $tenants = auth()->user()->tenants()->wherePivot('is_active', true)->get();
    if ($tenants->count() === 1) {
        $tenant = $tenants->first();
        session(['tenant_slug' => $tenant->slug]);
        return redirect()->route('dashboard');
    }
    return Inertia::render('TenantSelect', [
        'tenants' => $tenants,
    ]);
})->name('home');

// Tenant-specific routes (after authentication + tenancy init)
Route::middleware(['auth', 'web', 'tenancy.by_user'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('patients', PatientController::class);
    Route::patch('patients/{patient}/notes', [PatientController::class, 'updateNotes'])->name('patients.notes');
    // Importação de pacientes via CSV
    Route::get('patients-import', [\App\Http\Controllers\PatientImportController::class, 'form'])->name('patients.import.form');
    Route::post('patients-import/preview', [\App\Http\Controllers\PatientImportController::class, 'preview'])->name('patients.import.preview');
    Route::post('patients-import', [\App\Http\Controllers\PatientImportController::class, 'store'])->name('patients.import.store');
    Route::post('patients/{patient}/allergies', [\App\Http\Controllers\AllergyController::class, 'store'])->name('allergies.store');
    Route::delete('allergies/{allergy}', [\App\Http\Controllers\AllergyController::class, 'destroy'])->name('allergies.destroy');
    Route::post('patients/{patient}/body-compositions', [\App\Http\Controllers\BodyCompositionController::class, 'store'])->name('body.store');
    Route::delete('body-compositions/{bodyComposition}', [\App\Http\Controllers\BodyCompositionController::class, 'destroy'])->name('body.destroy');

    Route::resource('appointments', AppointmentController::class);
    Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'updateStatus'])->name('appointments.status');
    Route::patch('appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule'])->name('appointments.reschedule');

    Route::get('patients/{patient}/records', [MedicalRecordController::class, 'index'])->name('patients.records.index');
    Route::get('patients/{patient}/records/create', [MedicalRecordController::class, 'create'])->name('patients.records.create');
    Route::post('patients/{patient}/records', [MedicalRecordController::class, 'store'])->name('patients.records.store');
    Route::get('patients/{patient}/records/{record}', [MedicalRecordController::class, 'show'])->name('patients.records.show');
    Route::get('patients/{patient}/records/{record}/edit', [MedicalRecordController::class, 'edit'])->name('patients.records.edit');
    Route::put('patients/{patient}/records/{record}', [MedicalRecordController::class, 'update'])->name('patients.records.update');

    Route::resource('doctors', DoctorController::class);

    // Prescriptions (standalone)
    Route::resource('prescriptions', PrescriptionController::class)->except(['edit', 'update']);
    Route::get('prescriptions/{prescription}/print', [PrescriptionController::class, 'print'])->name('prescriptions.print');

    // Certificates
    Route::resource('certificates', CertificateController::class)->except(['edit', 'update']);
    Route::get('certificates/{certificate}/print', [CertificateController::class, 'print'])->name('certificates.print');

    // Exam Requests
    Route::get('exam-requests', [ExamRequestController::class, 'index'])->name('exam-requests.index');
    Route::get('exam-requests/create', [ExamRequestController::class, 'create'])->name('exam-requests.create');
    Route::post('exam-requests', [ExamRequestController::class, 'store'])->name('exam-requests.store');
    Route::get('exam-requests/{examRequest}', [ExamRequestController::class, 'show'])->name('exam-requests.show');
    Route::patch('exam-requests/{examRequest}/status', [ExamRequestController::class, 'updateStatus'])->name('exam-requests.status');
    Route::delete('exam-requests/{examRequest}', [ExamRequestController::class, 'destroy'])->name('exam-requests.destroy');
    Route::get('exam-requests/{examRequest}/print', [ExamRequestController::class, 'print'])->name('exam-requests.print');

    // User management (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [TenantUserController::class, 'index'])->name('users.index');
        Route::post('/users', [TenantUserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [TenantUserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [TenantUserController::class, 'destroy'])->name('users.destroy');
    });

    // Financial module
    Route::prefix('financeiro')->name('financeiro.')->group(function () {
        Route::get('/', [FinancialReportController::class, 'dashboard'])->name('dashboard');

        // Receber
        Route::get('/receber', [InvoiceController::class, 'index'])->name('receber.index');
        Route::post('/receber', [InvoiceController::class, 'store'])->name('receber.store');
        Route::get('/receber/{invoice}', [InvoiceController::class, 'show'])->name('receber.show');
        Route::put('/receber/{invoice}', [InvoiceController::class, 'update'])->name('receber.update');
        Route::delete('/receber/{invoice}', [InvoiceController::class, 'destroy'])->name('receber.destroy');
        Route::patch('/receber/{invoice}/pay', [InvoiceController::class, 'markAsPaid'])->name('receber.pay');
        Route::patch('/receber/{invoice}/cancel', [InvoiceController::class, 'cancel'])->name('receber.cancel');

        // Pagar
        Route::get('/pagar', [ExpenseController::class, 'index'])->name('pagar.index');
        Route::post('/pagar', [ExpenseController::class, 'store'])->name('pagar.store');
        Route::put('/pagar/{expense}', [ExpenseController::class, 'update'])->name('pagar.update');
        Route::delete('/pagar/{expense}', [ExpenseController::class, 'destroy'])->name('pagar.destroy');
        Route::patch('/pagar/{expense}/pay', [ExpenseController::class, 'markAsPaid'])->name('pagar.pay');
        Route::patch('/pagar/{expense}/cancel', [ExpenseController::class, 'cancel'])->name('pagar.cancel');

        // Charts
        Route::get('/chart-data', [FinancialReportController::class, 'chartData'])->name('chart.data');
    });

    // Studio Med (Consulta Gravada)
    Route::get('/studio-med', [StudioMedController::class, 'index'])->name('studio-med.index');
    Route::post('/studio-med/token', [StudioMedController::class, 'token'])->name('studio-med.token');
    Route::post('/studio-med/anamnese-ia', [StudioMedController::class, 'salvarAnamneseIa'])->name('studio-med.salvar');

    // API-like routes
    Route::prefix('api')->group(function () {
        Route::get('appointments/calendar', [AppointmentController::class, 'calendar'])->name('api.appointments.calendar');
        Route::get('patients/search', [PatientController::class, 'search'])->name('api.patients.search');
        Route::get('stats/dashboard', [DashboardController::class, 'stats'])->name('api.stats.dashboard');
        Route::get('cid/search', [CidCodeController::class, 'search'])->name('api.cid.search');
        Route::post('prescriptions/suggest', [\App\Http\Controllers\Api\AiSuggestionController::class, 'suggest'])->name('api.prescriptions.suggest');
    });

    // Attachments (upload / download)
    Route::post('/attachments', [AttachmentController::class, 'upload'])->name('attachments.upload');
    Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');

    // Reports
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/patients', [ReportController::class, 'exportPatients'])->name('reports.patients');
    Route::get('/reports/appointments', [ReportController::class, 'exportAppointments'])->name('reports.appointments');
    Route::get('/reports/financial', [ReportController::class, 'exportFinancial'])->name('reports.financial');
});

// Authenticated but no tenancy needed
Route::middleware(['auth', 'web'])->group(function () {
    Route::get('/select-tenant', function () {
        $tenants = auth()->user()->tenants()->wherePivot('is_active', true)->get();
        return Inertia::render('TenantSelect', [
            'tenants' => $tenants,
        ]);
    })->name('select.tenant');

    Route::get('/select-tenant/{slug}', function (string $slug) {
        $tenant = auth()->user()->tenants()->wherePivot('is_active', true)->get()->firstWhere('slug', $slug);
        if ($tenant) {
            session(['tenant_slug' => $tenant->slug]);
            return redirect()->route('dashboard');
        }
        return redirect()->route('select.tenant');
    })->name('tenant.use');
});

// Painel master (super-admin do produto)
Route::middleware(['auth', 'web', 'ensure.master'])->prefix('master')->name('master.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Master\DashboardController::class, 'index'])->name('dashboard');
    Route::get('/clinicas', [\App\Http\Controllers\Master\ClinicaController::class, 'index'])->name('clinicas.index');
    Route::get('/clinicas/create', [\App\Http\Controllers\Master\ClinicaController::class, 'create'])->name('clinicas.create');
    Route::post('/clinicas', [\App\Http\Controllers\Master\ClinicaController::class, 'store'])->name('clinicas.store');
    Route::put('/clinicas/{clinica}', [\App\Http\Controllers\Master\ClinicaController::class, 'update'])->name('clinicas.update');
    Route::delete('/clinicas/{clinica}', [\App\Http\Controllers\Master\ClinicaController::class, 'destroy'])->name('clinicas.destroy');
    Route::post('/impersonate/{clinica}', [\App\Http\Controllers\Master\ImpersonationController::class, 'start'])->name('impersonate.start');
});

// Sair da impersonacao (qualquer auth user com flag de impersonacao)
Route::middleware(['auth', 'web'])->post('/master/impersonate/stop', [\App\Http\Controllers\Master\ImpersonationController::class, 'stop'])->name('master.impersonate.stop');

require __DIR__.'/auth.php';
