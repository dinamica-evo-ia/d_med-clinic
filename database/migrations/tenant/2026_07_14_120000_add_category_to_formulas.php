<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Categoria da fórmula: "manipulado" (composição feita na farmácia de manipulação) ou
 * "industrializado" (medicamento de marca/pronto). O médico escolhe a categoria no painel
 * da receita. Tudo o que existe hoje veio do import = manipulado (default). Industrializados
 * serão populados depois (integração Memed).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formulas', function (Blueprint $table) {
            $table->string('category', 20)->default('manipulado')->after('purpose');
        });
    }

    public function down(): void
    {
        Schema::table('formulas', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
