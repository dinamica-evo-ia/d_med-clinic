<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Cadastros de farmácias de manipulação (parceria) — enviados pela página pública
 * /parceria-farmacias. Fica no banco CENTRAL (não é por clínica; é um intake global do
 * produto). O time do D_Med processa e importa as fórmulas nas clínicas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pharmacy_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('lab_name');            // nome do laboratório/farmácia
            $table->string('responsible_name');    // responsável
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('file_path')->nullable(); // PDF/planilha armazenado
            $table->string('file_name')->nullable();
            $table->boolean('authorized')->default(false); // autorizou indicar aos pacientes
            $table->text('notes')->nullable();
            $table->string('status')->default('new'); // new | imported | archived
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pharmacy_submissions');
    }
};
