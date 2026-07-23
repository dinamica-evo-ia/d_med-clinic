<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Exceções pontuais da agenda: "neste dia é diferente do padrão".
 *
 * A regra semanal (doctors.schedule) continua sendo o padrão. Aqui entra só o caso
 * isolado — abrir um sábado pra encaixar alguém, fechar a quarta por causa de um
 * congresso — sem a secretária precisar mexer na configuração e depois lembrar de
 * voltar atrás. Vale por DATA, não se repete.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_exceptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // null = vale pra clínica inteira (feriado, por exemplo)
            $table->uuid('doctor_id')->nullable();
            $table->date('date');
            // open = atende neste dia nestes períodos · closed = não atende
            $table->string('kind', 10)->default('closed');
            // open: os períodos do dia · closed: null = dia todo, ou os trechos fechados
            $table->json('periods')->nullable();
            $table->string('reason')->nullable();
            // quem criou (users vive no banco central — sem FK, é só rastro)
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['date', 'doctor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_exceptions');
    }
};
