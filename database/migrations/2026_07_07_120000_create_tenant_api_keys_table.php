<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Chaves de API máquina-a-máquina por clínica (banco CENTRAL — global, não por tenant).
 * Usadas por integrações externas (ex.: D_Agent Atende) pra chamar a API do CRM em nome
 * de uma clínica. Guardamos só o hash sha256 do token (o segredo é mostrado uma única vez
 * na geração). Formato do token: dmk_<prefix>_<secret>.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_api_keys', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');            // referencia tenants.id (uuid string)
            $table->string('name');                 // rótulo humano ("D_Agent Atende")
            $table->string('prefix')->index();      // dmk_<prefix> — parte pública p/ lookup
            $table->string('token_hash');           // sha256(token completo)
            $table->json('scopes')->nullable();     // ex.: ["agenda:read","agenda:write","pacientes:write"]
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_api_keys');
    }
};
