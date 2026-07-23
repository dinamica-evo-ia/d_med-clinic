<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Parabéns de aniversário pelo WhatsApp, em nome da clínica.
 *
 * Nasce DESLIGADO de propósito: é mensagem que sai sozinha pra base inteira de pacientes.
 * Ligar isso é decisão do dono da clínica, não default de sistema.
 *
 * `birthday_greeted_at` no paciente é o que impede mandar duas vezes no mesmo dia (e
 * permite ver quando foi o último). Guardar a data, e não um booleano, faz a marca
 * funcionar ano após ano sem precisar de reset.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendant_settings', function (Blueprint $table) {
            $table->boolean('birthday_enabled')->default(false);
            $table->string('birthday_hour', 5)->default('07:00');
            $table->text('birthday_message')->nullable();   // null = texto padrão do sistema
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->date('birthday_greeted_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('attendant_settings', function (Blueprint $table) {
            $table->dropColumn(['birthday_enabled', 'birthday_hour', 'birthday_message']);
        });
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('birthday_greeted_at');
        });
    }
};
