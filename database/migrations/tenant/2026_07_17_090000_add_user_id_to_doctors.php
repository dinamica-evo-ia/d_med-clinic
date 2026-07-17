<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Liga a ficha do médico (doctors, tenant) ao usuário que faz login (users, central).
     *
     * ⚠️ Por que isto existe: o vínculo era feito por E-MAIL — `Doctor::where('email',
     * auth()->user()->email)`. Funcionava por coincidência: cada médico digitou o mesmo e-mail
     * duas vezes (no login e na ficha). Nada no CRM obriga isso. Se divergir, o médico
     * simplesmente NÃO é reconhecido — em silêncio, sem erro: perde o Studio Med e (agora)
     * o push de consulta marcada. Descoberto em 2026-07-16.
     *
     * SEM foreign key de propósito: `users` vive no banco CENTRAL e `doctors` no banco do
     * tenant — SQLite não enforça FK entre arquivos .sqlite diferentes (ver armadilha #13 do
     * handoff). A integridade é garantida no backfill + no código.
     */
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->uuid('user_id')->nullable()->after('id')->index();
        });

        // Backfill: casa pelo e-mail que existe hoje (que hoje BATE — medido em 2026-07-16).
        // É a única informação disponível pra reconstruir o vínculo retroativamente.
        $central = config('tenancy.database.central_connection');
        foreach (DB::table('doctors')->whereNotNull('email')->get(['id', 'email']) as $doc) {
            $userId = DB::connection($central)->table('users')
                ->whereRaw('LOWER(email) = ?', [mb_strtolower(trim($doc->email))])
                ->value('id');
            if ($userId) {
                DB::table('doctors')->where('id', $doc->id)->update(['user_id' => $userId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropColumn('user_id');
        });
    }
};
