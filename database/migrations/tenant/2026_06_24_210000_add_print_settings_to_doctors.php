<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            // Configuração do layout de impressão do prontuário (cabeçalho/logo/dados do paciente/assinatura/rodapé).
            $table->json('print_settings')->nullable()->after('schedule');
        });
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropColumn('print_settings');
        });
    }
};
