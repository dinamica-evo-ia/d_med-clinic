<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marca que o lembrete de 24h já foi enviado. Sem isso o cron reenviaria o lembrete a
     * cada rodada enquanto a consulta estivesse dentro da janela.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('reminded_at')->nullable()->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('reminded_at');
        });
    }
};
