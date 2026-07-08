<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Fase 2 (WhatsApp): campos extras na config do atendente.
 * - waduck_api_url: base da API do provedor (default https://api.waduck.pro no código)
 * - webhook_token: segredo por clínica pra validar o webhook de entrada do WhatsApp
 * - connected_at: quando o número foi conectado (só informativo)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendant_settings', function (Blueprint $table) {
            $table->string('waduck_api_url')->nullable()->after('waduck_instance');
            $table->string('webhook_token')->nullable()->after('waduck_phone');
            $table->timestamp('connected_at')->nullable()->after('webhook_token');
        });
    }

    public function down(): void
    {
        Schema::table('attendant_settings', function (Blueprint $table) {
            $table->dropColumn(['waduck_api_url', 'webhook_token', 'connected_at']);
        });
    }
};
