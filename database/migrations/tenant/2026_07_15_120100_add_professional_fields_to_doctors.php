<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * UF do CRM e RQE. O cabeçalho da impressão (PrintSettings) já pedia os dois, mas eram
     * digitados à mão lá — sem lugar na ficha do médico. Agora saem daqui.
     */
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->string('license_state', 2)->nullable()->after('license_number');
            $table->string('rqe')->nullable()->after('license_state');
        });
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropColumn(['license_state', 'rqe']);
        });
    }
};
