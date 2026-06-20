<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignUuid('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->foreignUuid('appointment_id')->nullable()->constrained('appointments')->onDelete('set null');

            // SOAP
            $table->text('chief_complaint')->nullable(); // Queixa principal
            $table->json('anamnesis')->nullable();        // Subjetivo - histórico, sintomas
            $table->json('physical_exam')->nullable();    // Objetivo - exame físico
            $table->json('diagnosis')->nullable();        // Avaliação - CID, diagnósticos
            $table->json('prescriptions')->nullable();    // Plano - medicamentos
            $table->json('exam_requests')->nullable();    // Pedidos de exame
            $table->json('certificates')->nullable();     // Atestados

            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['patient_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_records');
    }
};
