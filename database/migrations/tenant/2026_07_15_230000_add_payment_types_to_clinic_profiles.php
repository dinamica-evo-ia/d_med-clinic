<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Formas de pagamento que a clínica aceita: ["particular"], ["convenio"] ou as duas.
     *
     * Mora no perfil da CLÍNICA (não no attendant_settings) porque não é config do bot — é
     * fato da clínica, e quem precisa dele são dois: o formulário da agenda e a IA. Ambos
     * têm que dar a mesma resposta.
     *
     * Default com as duas = comportamento de hoje (pergunta sempre). Clínica que só atende
     * particular desmarca e a IA para de perguntar.
     */
    public function up(): void
    {
        Schema::table('clinic_profiles', function (Blueprint $table) {
            $table->json('payment_types')->nullable()->after('logo_path');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_profiles', function (Blueprint $table) {
            $table->dropColumn('payment_types');
        });
    }
};
