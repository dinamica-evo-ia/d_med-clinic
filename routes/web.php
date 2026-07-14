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

// Página PÚBLICA de parceria com farmácias de manipulação (sem auth, sem tenancy)
Route::get('/parceria-farmacias', [\App\Http\Controllers\PharmacyPartnerController::class, 'show'])->name('pharmacy.partner');
Route::post('/parceria-farmacias', [\App\Http\Controllers\PharmacyPartnerController::class, 'store'])->name('pharmacy.partner.store');

// Tenant-specific routes (after authentication + tenancy init)
Route::middleware(['auth', 'web', 'tenancy.by_user'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('patients', PatientController::class);
    Route::patch('patients/{patient}/notes', [PatientController::class, 'updateNotes'])->name('patients.notes');
    Route::patch('patients/{patient}/status', [PatientController::class, 'updateStatus'])->name('patients.status');
    Route::post('patients/{patient}/photo', [PatientController::class, 'uploadPhoto'])->name('patients.photo.store');
    Route::delete('patients/{patient}/photo', [PatientController::class, 'destroyPhoto'])->name('patients.photo.destroy');
    // Importação de pacientes via CSV
    Route::get('patients-import', [\App\Http\Controllers\PatientImportController::class, 'form'])->name('patients.import.form');
    Route::post('patients-import/preview', [\App\Http\Controllers\PatientImportController::class, 'preview'])->name('patients.import.preview');
    Route::post('patients-import', [\App\Http\Controllers\PatientImportController::class, 'store'])->name('patients.import.store');

    // D_Med Atende — atendente WhatsApp (admin + secretária; médico NÃO acessa, pra CRM clean)
    Route::middleware('role:admin,receptionist')->group(function () {
        Route::get('atendente', [\App\Http\Controllers\AttendantController::class, 'index'])->name('attendant.index');
        Route::put('atendente', [\App\Http\Controllers\AttendantController::class, 'update'])->name('attendant.update');
        Route::post('atendente/whatsapp/connect', [\App\Http\Controllers\AttendantController::class, 'connectWhatsapp'])->name('attendant.whatsapp.connect');
        Route::post('atendente/whatsapp/disconnect', [\App\Http\Controllers\AttendantController::class, 'disconnectWhatsapp'])->name('attendant.whatsapp.disconnect');
        Route::post('atendente/whatsapp/test', [\App\Http\Controllers\AttendantController::class, 'testWhatsapp'])->name('attendant.whatsapp.test');
        // Inbox — acompanhar/assumir conversas
        Route::get('atendente/conversas', [\App\Http\Controllers\AttendantController::class, 'conversations'])->name('attendant.conversations');
        Route::post('atendente/conversas/{conversation}/reply', [\App\Http\Controllers\AttendantController::class, 'reply'])->name('attendant.reply');
        Route::post('atendente/conversas/{conversation}/status', [\App\Http\Controllers\AttendantController::class, 'conversationStatus'])->name('attendant.conversation.status');
        // FAQ / base de conhecimento
        Route::post('atendente/knowledge', [\App\Http\Controllers\AttendantController::class, 'storeKnowledge'])->name('attendant.knowledge.store');
        Route::put('atendente/knowledge/{knowledge}', [\App\Http\Controllers\AttendantController::class, 'updateKnowledge'])->name('attendant.knowledge.update');
        Route::delete('atendente/knowledge/{knowledge}', [\App\Http\Controllers\AttendantController::class, 'destroyKnowledge'])->name('attendant.knowledge.destroy');
        // Status real da conexão WhatsApp
        Route::get('atendente/whatsapp/status', [\App\Http\Controllers\AttendantController::class, 'whatsappStatus'])->name('attendant.whatsapp.status');
    });

    // Dados clínicos — secretária não acessa (só cadastro do paciente + agenda)
    Route::middleware('role:admin,doctor')->group(function () {
        Route::post('patients/{patient}/allergies', [\App\Http\Controllers\AllergyController::class, 'store'])->name('allergies.store');
        Route::delete('allergies/{allergy}', [\App\Http\Controllers\AllergyController::class, 'destroy'])->name('allergies.destroy');
        Route::post('patients/{patient}/body-compositions', [\App\Http\Controllers\BodyCompositionController::class, 'store'])->name('body.store');
        Route::delete('body-compositions/{bodyComposition}', [\App\Http\Controllers\BodyCompositionController::class, 'destroy'])->name('body.destroy');

        Route::get('patients/{patient}/records', [MedicalRecordController::class, 'index'])->name('patients.records.index');
        Route::get('patients/{patient}/records/create', [MedicalRecordController::class, 'create'])->name('patients.records.create');
        Route::post('patients/{patient}/records', [MedicalRecordController::class, 'store'])->name('patients.records.store');
        Route::get('patients/{patient}/records/{record}', [MedicalRecordController::class, 'show'])->name('patients.records.show');
        Route::get('patients/{patient}/records/{record}/patient-summary', [MedicalRecordController::class, 'patientSummary'])->name('patients.records.patient-summary');
        Route::get('patients/{patient}/records/{record}/edit', [MedicalRecordController::class, 'edit'])->name('patients.records.edit');
        Route::put('patients/{patient}/records/{record}', [MedicalRecordController::class, 'update'])->name('patients.records.update');

        // Prescriptions (standalone)
        Route::resource('prescriptions', PrescriptionController::class)->except(['edit', 'update']);
        Route::get('prescriptions/{prescription}/print', [PrescriptionController::class, 'print'])->name('prescriptions.print');

        // Biblioteca de fórmulas magistrais (manipulados)
        Route::get('formulas/search', [\App\Http\Controllers\FormulaController::class, 'apiSearch'])->name('formulas.search');
        Route::resource('formulas', \App\Http\Controllers\FormulaController::class)->only(['index', 'store', 'update', 'destroy']);

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
    });

    Route::resource('appointments', AppointmentController::class);
    Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'updateStatus'])->name('appointments.status');
    Route::patch('appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule'])->name('appointments.reschedule');

    Route::resource('doctors', DoctorController::class);

    // User management (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [TenantUserController::class, 'index'])->name('users.index');
        Route::post('/users', [TenantUserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [TenantUserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [TenantUserController::class, 'destroy'])->name('users.destroy');
    });

    // Financial module — admin/doctor sempre têm acesso; secretária só se o médico liberar
    // (tenant_user.permissions) via Administração/Usuários.
    Route::prefix('financeiro')->name('financeiro.')->middleware('permission:financeiro')->group(function () {
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

    // Attachments (upload / download) — galeria/documentos clínicos, secretária não acessa
    Route::middleware('role:admin,doctor')->group(function () {
        Route::post('/attachments', [AttachmentController::class, 'upload'])->name('attachments.upload');
        Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
        Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');
    });

    // Minha conta (dropdown do usuário no topo)
    Route::prefix('account')->name('account.')->group(function () {
        Route::get('/doctor', [\App\Http\Controllers\AccountController::class, 'doctor'])->name('doctor');
        Route::get('/password', [\App\Http\Controllers\AccountController::class, 'password'])->name('password');
        Route::put('/password', [\App\Http\Controllers\AccountController::class, 'passwordUpdate'])->name('password.update');
        Route::get('/plan', [\App\Http\Controllers\AccountController::class, 'plan'])->name('plan');
        Route::get('/settings/doctor', [\App\Http\Controllers\AccountController::class, 'settingsDoctor'])->name('settings.doctor');
        Route::get('/settings/schedule', [\App\Http\Controllers\AccountController::class, 'settingsSchedule'])->name('settings.schedule');
        Route::put('/settings/schedule', [\App\Http\Controllers\AccountController::class, 'scheduleUpdate'])->name('settings.schedule.update');
        Route::get('/settings/print', [\App\Http\Controllers\AccountController::class, 'settingsPrint'])->name('settings.print');
        Route::put('/settings/print', [\App\Http\Controllers\AccountController::class, 'printUpdate'])->name('settings.print.update');
        Route::post('/settings/print/logo', [\App\Http\Controllers\AccountController::class, 'printLogo'])->name('settings.print.logo');
        Route::delete('/settings/print/logo', [\App\Http\Controllers\AccountController::class, 'printLogoDestroy'])->name('settings.print.logo.destroy');
        Route::get('/settings/certificate', [\App\Http\Controllers\AccountController::class, 'settingsCertificate'])->name('settings.certificate');

        // Modelos de anamnese (por médico) — usados pelo Studio Med do EVO
        Route::get('/settings/anamnese-templates', [\App\Http\Controllers\AnamneseTemplateController::class, 'index'])->name('settings.anamnese-templates');
        Route::post('/settings/anamnese-templates', [\App\Http\Controllers\AnamneseTemplateController::class, 'store'])->name('settings.anamnese-templates.store');
        Route::put('/settings/anamnese-templates/{anamneseTemplate}', [\App\Http\Controllers\AnamneseTemplateController::class, 'update'])->name('settings.anamnese-templates.update');
        Route::delete('/settings/anamnese-templates/{anamneseTemplate}', [\App\Http\Controllers\AnamneseTemplateController::class, 'destroy'])->name('settings.anamnese-templates.destroy');
        Route::post('/settings/anamnese-templates/{anamneseTemplate}/default', [\App\Http\Controllers\AnamneseTemplateController::class, 'setDefault'])->name('settings.anamnese-templates.default');

        // Importar & Exportar (substitui "Logins ativos")
        Route::get('/settings/import-export', [\App\Http\Controllers\ImportExportController::class, 'index'])->name('settings.import-export');
        Route::get('/settings/import-export/medical-records', [\App\Http\Controllers\ImportExportController::class, 'medicalRecordsForm'])->name('settings.import-export.medical-records');
        Route::post('/settings/import-export/medical-records/preview', [\App\Http\Controllers\ImportExportController::class, 'medicalRecordsPreview'])->name('settings.import-export.medical-records.preview');
        Route::post('/settings/import-export/medical-records', [\App\Http\Controllers\ImportExportController::class, 'medicalRecordsStore'])->name('settings.import-export.medical-records.store');
        Route::get('/settings/import-export/prescriptions', [\App\Http\Controllers\ImportExportController::class, 'prescriptionsForm'])->name('settings.import-export.prescriptions');
        Route::post('/settings/import-export/prescriptions/preview', [\App\Http\Controllers\ImportExportController::class, 'prescriptionsPreview'])->name('settings.import-export.prescriptions.preview');
        Route::post('/settings/import-export/prescriptions', [\App\Http\Controllers\ImportExportController::class, 'prescriptionsStore'])->name('settings.import-export.prescriptions.store');

        Route::get('/suggestions', [\App\Http\Controllers\AccountController::class, 'suggestions'])->name('suggestions');
        Route::get('/referral', [\App\Http\Controllers\AccountController::class, 'referral'])->name('referral');
    });

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

    Route::get('/account/blocked', [\App\Http\Controllers\AccountController::class, 'blocked'])->name('account.blocked');
});

// Painel master (super-admin do produto)
Route::middleware(['auth', 'web', 'ensure.master'])->prefix('master')->name('master.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Master\DashboardController::class, 'index'])->name('dashboard');
    Route::put('/account/password', [\App\Http\Controllers\Master\AccountController::class, 'updatePassword'])->name('account.password');
    Route::get('/clinicas', [\App\Http\Controllers\Master\ClinicaController::class, 'index'])->name('clinicas.index');
    Route::get('/clinicas/create', [\App\Http\Controllers\Master\ClinicaController::class, 'create'])->name('clinicas.create');
    Route::post('/clinicas', [\App\Http\Controllers\Master\ClinicaController::class, 'store'])->name('clinicas.store');
    Route::put('/clinicas/{clinica}', [\App\Http\Controllers\Master\ClinicaController::class, 'update'])->name('clinicas.update');
    Route::post('/clinicas/{clinica}/extend-trial', [\App\Http\Controllers\Master\ClinicaController::class, 'extendTrial'])->name('clinicas.extend-trial');
    Route::post('/clinicas/{clinica}/reactivate', [\App\Http\Controllers\Master\ClinicaController::class, 'reactivate'])->name('clinicas.reactivate');
    Route::post('/clinicas/{clinica}/approve', [\App\Http\Controllers\Master\ClinicaController::class, 'approve'])->name('clinicas.approve');
    Route::delete('/clinicas/{clinica}', [\App\Http\Controllers\Master\ClinicaController::class, 'destroy'])->name('clinicas.destroy');
    Route::get('/clinicas/{clinica}/api-keys', [\App\Http\Controllers\Master\ApiKeyController::class, 'index'])->name('clinicas.api-keys.index');
    Route::post('/clinicas/{clinica}/api-keys', [\App\Http\Controllers\Master\ApiKeyController::class, 'store'])->name('clinicas.api-keys.store');
    Route::delete('/clinicas/{clinica}/api-keys/{apiKey}', [\App\Http\Controllers\Master\ApiKeyController::class, 'destroy'])->name('clinicas.api-keys.destroy');
    Route::post('/impersonate/{clinica}', [\App\Http\Controllers\Master\ImpersonationController::class, 'start'])->name('impersonate.start');
    Route::get('/planos', [\App\Http\Controllers\Master\PlanController::class, 'index'])->name('planos.index');
    Route::put('/planos/{plan}', [\App\Http\Controllers\Master\PlanController::class, 'update'])->name('planos.update');
    Route::get('/farmacias', [\App\Http\Controllers\Master\PharmacyController::class, 'index'])->name('farmacias.index');
    Route::get('/farmacias/{submission}/download', [\App\Http\Controllers\Master\PharmacyController::class, 'download'])->name('farmacias.download');
    Route::put('/farmacias/{submission}/status', [\App\Http\Controllers\Master\PharmacyController::class, 'updateStatus'])->name('farmacias.status');
    Route::delete('/farmacias/{submission}', [\App\Http\Controllers\Master\PharmacyController::class, 'destroy'])->name('farmacias.destroy');
});

// Sair da impersonacao (qualquer auth user com flag de impersonacao)
Route::middleware(['auth', 'web'])->post('/master/impersonate/stop', [\App\Http\Controllers\Master\ImpersonationController::class, 'stop'])->name('master.impersonate.stop');

require __DIR__.'/auth.php';
