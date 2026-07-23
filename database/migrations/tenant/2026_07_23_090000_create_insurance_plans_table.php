<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/*
 * Convênios que a clínica aceita.
 *
 * Até aqui `appointments.insurance_name` era TEXTO LIVRE, com um datalist do que já tinha
 * sido digitado — ou seja, "Unimed", "unimed " e "UNINED" entravam como convênios diferentes,
 * e a IA no WhatsApp aceitava qualquer nome que o paciente falasse. Agora existe um cadastro.
 *
 * `all_doctors` evita a ambiguidade do "sem médico marcado significa o quê?": true = todo mundo
 * atende; false = só os médicos do pivot.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insurance_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('notes')->nullable();     // "só consulta", "precisa de guia", etc.
            $table->boolean('all_doctors')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('insurance_plan_doctor', function (Blueprint $table) {
            $table->uuid('insurance_plan_id');
            $table->uuid('doctor_id');
            $table->primary(['insurance_plan_id', 'doctor_id']);
        });

        /*
         * Semeia com o que a clínica já usou de verdade nas consultas e nos cadastros —
         * senão, no dia do deploy, a lista aparece vazia e a recepção não consegue marcar
         * ninguém por convênio até alguém lembrar de cadastrar.
         */
        $nomes = collect()
            ->merge(DB::table('appointments')->whereNotNull('insurance_name')->pluck('insurance_name'))
            ->merge(DB::table('patients')->whereNotNull('insurance')->pluck('insurance')
                ->map(fn ($j) => data_get(json_decode($j, true), 'name')))
            ->map(fn ($n) => trim((string) $n))
            ->filter()
            ->unique(fn ($n) => mb_strtolower($n))   // 'Unimed' e 'unimed' são o mesmo
            ->sort()
            ->values();

        foreach ($nomes as $nome) {
            DB::table('insurance_plans')->insert([
                'id' => (string) Str::uuid(),
                'name' => $nome,
                'all_doctors' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_plan_doctor');
        Schema::dropIfExists('insurance_plans');
    }
};
