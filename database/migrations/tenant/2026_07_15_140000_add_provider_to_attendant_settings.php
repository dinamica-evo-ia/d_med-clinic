<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Provedor de WhatsApp: waduck (hospedado) | evolution (open source, self-hosted).
     * Default 'waduck' pra quem já estava conectado não mudar de comportamento.
     *
     * instance_token: token QUE A INSTÂNCIA devolve no create da Evolution (`hash`). Vale
     * mais que a chave global nas chamadas de mensagem.
     *
     * Nota: as colunas de conexão ainda se chamam waduck_* por herança — hoje são genéricas
     * (valem pros dois provedores). Renomear exigiria migration + tocar todos os call sites.
     */
    public function up(): void
    {
        Schema::table('attendant_settings', function (Blueprint $table) {
            $table->string('provider')->default('waduck')->after('autonomy');
            $table->string('instance_token')->nullable()->after('waduck_api_key');
        });
    }

    public function down(): void
    {
        Schema::table('attendant_settings', function (Blueprint $table) {
            $table->dropColumn(['provider', 'instance_token']);
        });
    }
};
