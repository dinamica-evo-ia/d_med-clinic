<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Biblioteca de fórmulas magistrais (manipulados) por clínica. O médico busca, escolhe
 * e insere na receita. content = corpo da fórmula (composição + mande + posologia), como
 * texto (o formato varia demais pra estruturar 100%). doctor_id nulo = fórmula da clínica.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formulas', function (Blueprint $table) {
            $table->id();
            $table->string('doctor_id')->nullable();   // dono; null = da clínica toda
            $table->string('name');                     // título curto (ativos)
            $table->text('content');                    // corpo da fórmula (composição + uso)
            $table->string('form')->nullable();         // forma farmacêutica (Cápsula, Creme…)
            $table->string('route')->nullable();        // via de uso (Oral, Externo…)
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('name');
            $table->index('doctor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formulas');
    }
};
