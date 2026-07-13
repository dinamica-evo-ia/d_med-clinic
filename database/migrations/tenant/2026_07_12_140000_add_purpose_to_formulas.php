<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Finalidade (para que serve) da fórmula magistral — é como o médico busca ("emagrecimento",
 * "reposição hormonal"…). O import do CSV só trouxe a composição; a finalidade é preenchida
 * pela IA (a partir da composição) e revisável pelo médico.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formulas', function (Blueprint $table) {
            $table->string('purpose')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('formulas', function (Blueprint $table) {
            $table->dropColumn('purpose');
        });
    }
};
