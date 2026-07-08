<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * "D_Med Atende" — atendente de WhatsApp com IA, MÓDULO do próprio D_Med (não app à parte).
 * Vive no banco do tenant e usa direto os pacientes/agenda que o CRM já tem. Escondido do
 * médico (só admin/secretária veem). Fase 1 = base + config; WhatsApp e IA vêm nas fases 2/3.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Config do bot + conexão (uma linha por clínica).
        Schema::create('attendant_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(false);        // liga/desliga o bot (backend)
            $table->string('bot_name')->default('Atendente');
            $table->text('persona')->nullable();               // como o bot se comporta
            $table->string('tone')->nullable();                // tom de voz
            $table->text('welcome_message')->nullable();
            $table->text('offhours_message')->nullable();
            $table->json('business_hours')->nullable();        // horário de atendimento do bot
            $table->string('autonomy')->default('suggest');    // suggest | auto_reply | auto_schedule
            // Conexão WhatsApp (WADuck) — preenchida na Fase 2
            $table->string('waduck_instance')->nullable();
            $table->string('waduck_api_key')->nullable();
            $table->string('waduck_phone')->nullable();
            $table->timestamps();
        });

        // Conversas com pacientes/contatos.
        Schema::create('attendant_conversations', function (Blueprint $table) {
            $table->id();
            $table->string('patient_id')->nullable();          // referencia patients.id (uuid) se reconhecido
            $table->string('contact_phone');                   // telefone (só dígitos)
            $table->string('contact_name')->nullable();
            $table->string('status')->default('open');         // open | closed | handoff (humano assumiu)
            $table->string('assigned_to')->nullable();         // user id se um humano assumir
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index('contact_phone');
            $table->index('patient_id');
            $table->index('status');
        });

        // Mensagens de cada conversa.
        Schema::create('attendant_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('attendant_conversations')->cascadeOnDelete();
            $table->string('direction');                       // in | out
            $table->string('author_type')->default('patient'); // patient | ai | human
            $table->text('body')->nullable();
            $table->string('external_id')->nullable();         // id da mensagem no WADuck
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('conversation_id');
        });

        // Base de conhecimento / FAQ que o bot usa pra responder.
        Schema::create('attendant_knowledge', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('content')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendant_messages');
        Schema::dropIfExists('attendant_conversations');
        Schema::dropIfExists('attendant_knowledge');
        Schema::dropIfExists('attendant_settings');
    }
};
