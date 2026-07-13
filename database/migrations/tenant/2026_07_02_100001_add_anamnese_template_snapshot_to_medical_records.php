<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            // Snapshot dos campos do template usado na hora da consulta.
            // Guardar snapshot (não FK) porque templates são editáveis/removíveis
            // e o prontuário histórico precisa continuar mostrando os mesmos labels.
            // Formato: [ { "key": "...", "label": "..." }, ... ]
            $table->json('anamnese_template_snapshot')->nullable()->after('transcricao');
        });
    }

    public function down(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            $table->dropColumn('anamnese_template_snapshot');
        });
    }
};
