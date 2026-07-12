<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * Separa ANAMNESE de EVOLUÇÃO no prontuário (conceitos clínicos distintos).
 * - anamnese: história clínica estruturada (o Studio Med gera isso).
 * - evolucao: nota de acompanhamento/retorno.
 * Retrocompat: gravações existentes (origem=studio_med) viram anamnese; o resto, evolução.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            $table->string('type')->default('evolucao')->after('origem');
        });

        DB::table('medical_records')->where('origem', 'studio_med')->update(['type' => 'anamnese']);
    }

    public function down(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
