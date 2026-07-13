<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            // Snapshot dos dados do acompanhante presente na consulta.
            // Não é FK — é dado clínico contextual congelado no momento (só na consulta).
            // Formato: { "nome": "...", "vinculo": "Mãe|Pai|Cônjuge|Filho(a)|Irmão(ã)|Cuidador(a)|Outro" }
            $table->json('acompanhante_snapshot')->nullable()->after('anamnese_template_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('medical_records', function (Blueprint $table) {
            $table->dropColumn('acompanhante_snapshot');
        });
    }
};
