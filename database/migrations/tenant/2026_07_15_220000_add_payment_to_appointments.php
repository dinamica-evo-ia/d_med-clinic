<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Particular ou convênio — perguntado na hora de agendar.
     *
     * Fica na CONSULTA, não no paciente: o mesmo paciente vem particular hoje e por convênio
     * na próxima. O `patients.insurance` (JSON) continua sendo o convênio do CADASTRO — serve
     * pra pré-preencher, não pra decidir.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('payment_type')->default('particular')->after('type'); // particular | convenio
            $table->string('insurance_name')->nullable()->after('payment_type');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['payment_type', 'insurance_name']);
        });
    }
};
