<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Perfil da clínica (razão social, CNPJ, contato, endereço, logo).
     *
     * Mora no banco do TENANT, não no `data` JSON do tenant central: array dentro do
     * VirtualColumn do stancl já deu double-encode antes (ver 'settings' no model Tenant),
     * e esses dados são da clínica — exatamente o escopo do banco do tenant.
     *
     * Linha única por clínica (ver ClinicProfile::current()).
     */
    public function up(): void
    {
        Schema::create('clinic_profiles', function (Blueprint $table) {
            $table->id();

            // Empresa
            $table->string('legal_name')->nullable();              // nome completo / razão social
            $table->string('nature')->default('pessoa_fisica');    // pessoa_fisica | pessoa_juridica
            $table->string('document')->nullable();                // CPF (PF) ou CNPJ (PJ)

            // Contato
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('mobile')->nullable();
            $table->string('whatsapp')->nullable();

            // Endereço
            $table->string('zip')->nullable();
            $table->string('street')->nullable();
            $table->string('number')->nullable();
            $table->string('complement')->nullable();
            $table->string('district')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();

            $table->string('logo_path')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_profiles');
    }
};
