<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Inscrições de Web Push — um aparelho/navegador que aceitou receber aviso.
     *
     * Fica no banco CENTRAL, ligada ao `users`: a inscrição é do USUÁRIO (que pode até ter
     * acesso a mais de uma clínica), não do tenant. Quem lê isto de dentro de um controller
     * tenant-aware precisa forçar a conexão central — o model PushSubscription já faz
     * (trait CentralConnection). Ver armadilha #11 do handoff.
     *
     * `endpoint` é único: é o identificador do aparelho no serviço de push (FCM/Apple/Mozilla).
     * Se o mesmo aparelho se reinscrever, a gente atualiza em vez de duplicar.
     */
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id')->index();
            $table->string('endpoint', 500)->unique();
            $table->string('p256dh');   // chave pública do aparelho (criptografia do payload)
            $table->string('auth');     // segredo de autenticação do aparelho
            $table->string('user_agent')->nullable(); // só pra o usuário reconhecer o aparelho
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
