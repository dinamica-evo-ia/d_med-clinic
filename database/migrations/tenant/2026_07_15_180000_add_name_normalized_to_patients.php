<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Busca de paciente sem acento.
     *
     * O LIKE do SQLite é case-insensitive só pra ASCII, e o LOWER() também: LOWER('MÁRCIO')
     * devolve 'mÁrcio'. Resultado: buscar "marcio" achava 14 e "MÁRCIO" achava 0; "jose"
     * achava 44 e "José" achava 8. Não dá pra consertar na query — precisa de coluna
     * normalizada (minúscula, sem acento), que ainda por cima usa índice.
     */
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('name_normalized')->nullable()->after('name')->index();
        });

        // backfill do que já existe (2466 na Clínica RF) — em blocos, pra não estourar memória
        DB::table('patients')->select('id', 'name')->orderBy('id')->chunk(500, function ($rows) {
            foreach ($rows as $r) {
                DB::table('patients')->where('id', $r->id)->update([
                    'name_normalized' => Str::lower(Str::ascii((string) $r->name)),
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex(['name_normalized']);
            $table->dropColumn('name_normalized');
        });
    }
};
