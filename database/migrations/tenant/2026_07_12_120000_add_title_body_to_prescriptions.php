<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Receita mais simples: título + corpo em texto livre (o médico digita ou arrasta fórmulas).
 * medicines (estruturado) fica só pra retrocompat das receitas antigas e do prefill do Studio.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->string('title')->nullable()->after('doctor_id');
            $table->text('body')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropColumn(['title', 'body']);
        });
    }
};
