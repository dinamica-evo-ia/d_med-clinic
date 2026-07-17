<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tokens de "entrar no celular pelo QR" — o médico já está logado no computador, escaneia
     * o QR e o telefone abre o app já autenticado (mesmo padrão do WhatsApp Web).
     *
     * ⚠️ ISTO É UMA SUPERFÍCIE DE LOGIN em sistema de prontuário. As defesas não são opcionais:
     *
     * - `token_hash`: guardamos só o sha256. Vazou o banco → os tokens não servem pra nada.
     *   (mesmo padrão do tenant_api_keys)
     * - `expires_at`: 2 minutos. Janela curta o bastante pra que fotografar a tela não valha nada.
     * - `used_at`: uso ÚNICO. Consumido no primeiro acesso; um segundo uso é recusado.
     * - só o próprio usuário logado gera token pra si mesmo (ver InstallController).
     *
     * `tenant_slug` viaja junto porque a sessão do celular nasce zerada — sem ele o
     * `tenancy.by_user` não saberia qual clínica abrir pra quem tem mais de uma.
     *
     * Fica no banco CENTRAL: é do usuário (users), não do tenant.
     */
    public function up(): void
    {
        Schema::create('login_tokens', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id')->index();
            $table->string('token_hash', 64)->unique(); // sha256 hex — nunca o token cru
            $table->string('tenant_slug')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('used_at')->nullable();
            $table->string('used_user_agent')->nullable(); // auditoria: que aparelho consumiu
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_tokens');
    }
};
