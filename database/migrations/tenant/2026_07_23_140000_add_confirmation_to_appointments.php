<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Lembrete com CONFIRMAÇÃO do paciente.
 *
 * Antes o lembrete era fixo em 24h e mandava um "está tudo certo?" sem lugar nenhum pra
 * guardar a resposta — a secretária não tinha como saber quem confirmou. Agora:
 *
 *   avisado, sem resposta → 🟡   ·   paciente confirmou → 🟢   ·   cancelou → 🔴
 *
 * As cores saem de `status` + `reminded_at` (já existia), então não inventei um campo de cor:
 * amarelo é "scheduled com reminded_at preenchido e sem confirmação".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // 2ª tentativa perto da consulta, pra quem não respondeu o 1º aviso.
            // Guardar a data (em vez de um booleano) evita insistir duas vezes.
            $table->timestamp('insisted_at')->nullable()->after('reminded_at');
            $table->timestamp('confirmed_at')->nullable()->after('insisted_at');
            // 'whatsapp' = o próprio paciente respondeu · 'crm' = a recepção marcou por ele
            $table->string('confirmed_via', 20)->nullable()->after('confirmed_at');
        });

        Schema::table('attendant_settings', function (Blueprint $table) {
            $table->boolean('reminder_enabled')->default(true);
            $table->unsignedTinyInteger('reminder_days_before')->default(1);   // 1 ou 2
            $table->string('reminder_hour', 5)->default('09:00');              // hora do disparo
            $table->boolean('reminder_insist')->default(true);
            $table->unsignedTinyInteger('insist_hours_before')->default(3);    // 2ª tentativa
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['insisted_at', 'confirmed_at', 'confirmed_via']);
        });
        Schema::table('attendant_settings', function (Blueprint $table) {
            $table->dropColumn(['reminder_enabled', 'reminder_days_before', 'reminder_hour',
                'reminder_insist', 'insist_hours_before']);
        });
    }
};
