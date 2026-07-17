<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Quantos logins simultâneos o plano dá, POR USUÁRIO: um computador + um celular.
     *
     * Regra do dono (2026-07-17): "somente um aparelho e um CRM web logado, conforme o plano".
     * Os valores aqui são o ponto de partida (1 e 1 em todos) — a régua por plano ainda vai ser
     * revista comercialmente; a estrutura é que precisa existir agora.
     *
     * `null` = ilimitado — mesma convenção de `doctors`/`staff` nesta tabela.
     */
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedSmallInteger('web_sessions')->nullable()->default(1)->after('staff');
            $table->unsignedSmallInteger('app_devices')->nullable()->default(1)->after('web_sessions');
        });

        // Planos que já existem nascem com a regra 1+1 (o default só vale pra linha nova).
        DB::table('plans')->update(['web_sessions' => 1, 'app_devices' => 1]);
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['web_sessions', 'app_devices']);
        });
    }
};
