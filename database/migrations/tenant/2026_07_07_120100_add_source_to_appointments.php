<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Rastreabilidade de origem da consulta. 'crm' = criada na recepção/CRM (default,
 * retrocompatível). 'd_agent' = criada pelo atendente WhatsApp (D_Agent Atende).
 * external_ref guarda o id da consulta espelho no D_Agent, pra cruzar os dois lados.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('source')->default('crm')->after('status');
            $table->string('external_ref')->nullable()->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['source', 'external_ref']);
        });
    }
};
