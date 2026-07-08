<?php

namespace App\Http\Controllers;

use App\Models\AttendantConversation;
use App\Models\AttendantMessage;
use App\Models\AttendantSetting;
use App\Models\Patient;
use App\Models\Tenant;
use App\Support\AttendantAI;
use App\Support\Waduck;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

/*
 * "D_Med Atende" — painel do atendente de WhatsApp. Acesso só admin/secretária (médico
 * não vê, pra manter o CRM clean).
 *   Fase 1: liga/desliga + config do bot.
 *   Fase 2: conectar WhatsApp (WADuck), enviar teste, receber mensagens (webhook).
 *   Fase 3 (próxima): a IA (Claude) responde e agenda.
 */
class AttendantController extends Controller
{
    public function index()
    {
        $s = AttendantSetting::current();
        $t = tenant();

        $webhookUrl = ($s->webhook_token && $t)
            ? url('/api/whatsapp/webhook/'.$t->id).'?token='.$s->webhook_token
            : null;

        return Inertia::render('Attendant/Index', [
            'settings' => [
                'enabled' => $s->enabled,
                'bot_name' => $s->bot_name,
                'persona' => $s->persona,
                'tone' => $s->tone,
                'welcome_message' => $s->welcome_message,
                'offhours_message' => $s->offhours_message,
                'autonomy' => $s->autonomy,
            ],
            'whatsapp' => [
                'connected' => $s->isWhatsappConnected(),
                'instance' => $s->waduck_instance,
                'phone' => $s->waduck_phone,
                'api_url' => $s->waduck_api_url,
                'has_key' => ! empty($s->waduck_api_key),
                'webhook_url' => $webhookUrl,
                'connected_at' => $s->connected_at?->toDateTimeString(),
            ],
            'stats' => [
                'conversations' => AttendantConversation::count(),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => 'boolean',
            'bot_name' => 'nullable|string|max:80',
            'persona' => 'nullable|string|max:2000',
            'tone' => 'nullable|string|max:120',
            'welcome_message' => 'nullable|string|max:1000',
            'offhours_message' => 'nullable|string|max:1000',
            'autonomy' => 'nullable|in:suggest,auto_reply,auto_schedule',
        ]);

        $s = AttendantSetting::current();
        $s->update([
            'enabled' => $data['enabled'] ?? $s->enabled,
            'bot_name' => $data['bot_name'] ?? $s->bot_name,
            'persona' => $data['persona'] ?? null,
            'tone' => $data['tone'] ?? null,
            'welcome_message' => $data['welcome_message'] ?? null,
            'offhours_message' => $data['offhours_message'] ?? null,
            'autonomy' => $data['autonomy'] ?? $s->autonomy,
        ]);

        return back()->with('success', 'Configurações do atendente salvas.');
    }

    // ---------- Inbox (Fase 4): secretária acompanha e assume conversas ----------

    /** Lista de conversas + (opcional) a conversa selecionada com suas mensagens. */
    public function conversations(Request $request)
    {
        \Carbon\Carbon::setLocale('pt_BR');

        $conversations = AttendantConversation::query()
            ->orderByDesc('last_message_at')->orderByDesc('id')
            ->limit(100)->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->contact_name ?: $c->contact_phone,
                'phone' => $c->contact_phone,
                'patient_id' => $c->patient_id,
                'status' => $c->status,
                'last_at' => $c->last_message_at?->diffForHumans(),
                'preview' => \Illuminate\Support\Str::limit((string) optional($c->messages()->latest('id')->first())->body, 60),
            ]);

        $selected = null;
        $messages = [];
        $conv = $request->query('c') ? AttendantConversation::find($request->query('c')) : null;
        if ($conv) {
            $selected = [
                'id' => $conv->id,
                'name' => $conv->contact_name ?: $conv->contact_phone,
                'phone' => $conv->contact_phone,
                'patient_id' => $conv->patient_id,
                'status' => $conv->status,
            ];
            $messages = $conv->messages()->orderBy('id')->get()->map(fn ($m) => [
                'id' => $m->id,
                'direction' => $m->direction,
                'author' => $m->author_type,
                'body' => $m->body,
                'at' => $m->created_at?->format('d/m H:i'),
            ]);
        }

        return Inertia::render('Attendant/Inbox', [
            'conversations' => $conversations,
            'selected' => $selected,
            'messages' => $messages,
        ]);
    }

    /** A secretária responde manualmente (assume a conversa → handoff, a IA para). */
    public function reply(Request $request, AttendantConversation $conversation)
    {
        $data = $request->validate(['text' => 'required|string|max:2000']);

        try {
            Waduck::sendText(AttendantSetting::current(), $conversation->contact_phone, $data['text']);
        } catch (\Throwable $e) {
            return back()->with('error', 'Falha ao enviar: '.$e->getMessage());
        }

        AttendantMessage::create([
            'conversation_id' => $conversation->id,
            'direction' => 'out',
            'author_type' => 'human',
            'body' => $data['text'],
        ]);
        $conversation->update([
            'status' => 'handoff',
            'assigned_to' => (string) $request->user()->id,
            'last_message_at' => now(),
        ]);

        return back();
    }

    /** Muda o status da conversa: assumir (handoff), devolver ao bot (open) ou resolver (closed). */
    public function conversationStatus(Request $request, AttendantConversation $conversation)
    {
        $data = $request->validate(['status' => 'required|in:open,handoff,closed']);

        $conversation->update([
            'status' => $data['status'],
            'assigned_to' => $data['status'] === 'handoff' ? (string) $request->user()->id : null,
        ]);

        return back();
    }

    /** Conectar o número de WhatsApp (credenciais WADuck). Gera o webhook_token na 1ª vez. */
    public function connectWhatsapp(Request $request)
    {
        $data = $request->validate([
            'waduck_instance' => 'required|string|max:120',
            'waduck_api_key' => 'required|string|max:255',
            'waduck_phone' => 'nullable|string|max:20',
            'waduck_api_url' => 'nullable|url|max:255',
        ]);

        $s = AttendantSetting::current();
        $s->fill([
            'waduck_instance' => $data['waduck_instance'],
            'waduck_api_key' => $data['waduck_api_key'],
            'waduck_phone' => $data['waduck_phone'] ?? null,
            'waduck_api_url' => $data['waduck_api_url'] ?? null,
            'connected_at' => now(),
        ]);
        if (! $s->webhook_token) {
            $s->webhook_token = Str::random(40);
        }
        $s->save();

        return back()->with('success', 'WhatsApp conectado. Configure a URL do webhook no WADuck.');
    }

    /** Desconectar (mantém o webhook_token pra reconexão usar a mesma URL). */
    public function disconnectWhatsapp()
    {
        AttendantSetting::current()->update([
            'waduck_instance' => null,
            'waduck_api_key' => null,
            'waduck_phone' => null,
            'connected_at' => null,
        ]);

        return back()->with('success', 'WhatsApp desconectado.');
    }

    /** Envia uma mensagem de teste pro número informado. */
    public function testWhatsapp(Request $request)
    {
        $data = $request->validate([
            'to' => 'required|string|max:20',
            'text' => 'nullable|string|max:500',
        ]);

        try {
            Waduck::sendText(
                AttendantSetting::current(),
                $data['to'],
                $data['text'] ?? 'Teste do D_Med Atende ✅'
            );

            return back()->with('success', 'Mensagem de teste enviada para '.$data['to'].'.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Falha ao enviar: '.$e->getMessage());
        }
    }

    /**
     * Webhook público do WhatsApp (WADuck chama). Rota /api/whatsapp/webhook/{tenant}?token=...
     * Sem auth de sessão — valida o webhook_token da clínica. Fora do grupo de token do agent.
     */
    public function webhook(Request $request, string $tenant)
    {
        $t = Tenant::find($tenant);
        if (! $t) {
            return response()->json(['ok' => true, 'skipped' => 'unknown tenant']);
        }

        tenancy()->initialize($t);
        try {
            $s = AttendantSetting::current();
            $expected = $s->webhook_token;
            $token = $request->query('token') ?? $request->header('x-webhook-token');
            if (! $expected || ! is_string($token) || ! hash_equals($expected, $token)) {
                return response()->json(['error' => 'unauthorized'], 401);
            }

            $payload = $request->all();
            $event = $payload['event'] ?? $payload['type'] ?? '';

            if (str_starts_with((string) $event, 'connection')) {
                $state = data_get($payload, 'data.state') ?? ($payload['state'] ?? 'unknown');
                if ($state === 'open') {
                    $s->update(['connected_at' => now()]);
                }
            } elseif (str_starts_with((string) $event, 'messages.upsert')) {
                $data = $payload['data'] ?? null;
                $items = (is_array($data) && array_is_list($data)) ? $data : [$data ?? ($payload['message'] ?? null)];
                foreach ($items as $m) {
                    if (! is_array($m)) {
                        continue;
                    }
                    $p = Waduck::parseInbound($m);
                    if (! $p || $p['from_me']) {
                        continue; // ignora mensagens enviadas pela própria clínica
                    }
                    $this->storeInbound($p);
                }
            }
        } finally {
            tenancy()->end();
        }

        return response()->json(['ok' => true]);
    }

    /** Grava mensagem de entrada: reconhece o paciente por telefone e mantém a conversa. */
    private function storeInbound(array $p): void
    {
        // Idempotência: retry do WADuck com a mesma mensagem → ignora (não duplica nem re-responde).
        if (! empty($p['external_id'])
            && AttendantMessage::where('external_id', $p['external_id'])->where('direction', 'in')->exists()) {
            return;
        }

        // Reconhece paciente pelo telefone (dígitos) — mesma regra do AgentController.
        $patient = Patient::where('phone', $p['phone'])
            ->orWhere('whatsapp', $p['phone'])
            ->first();

        // Conversa aberta mais recente, ou nova.
        $conv = AttendantConversation::where('contact_phone', $p['phone'])
            ->where('status', '!=', 'closed')
            ->latest('id')
            ->first();

        if (! $conv) {
            $conv = new AttendantConversation([
                'contact_phone' => $p['phone'],
                'contact_name' => $patient?->name ?? $p['push_name'],
                'patient_id' => $patient?->id,
                'status' => 'open',
            ]);
        } else {
            // Preenche vínculo/nome se só agora descobrimos o paciente.
            $conv->patient_id = $conv->patient_id ?? $patient?->id;
            $conv->contact_name = $conv->contact_name ?? $patient?->name ?? $p['push_name'];
        }
        $conv->last_message_at = now();
        $conv->save();

        AttendantMessage::create([
            'conversation_id' => $conv->id,
            'direction' => 'in',
            'author_type' => 'patient',
            'body' => $p['text'],
            'external_id' => $p['external_id'],
            'meta' => ['push_name' => $p['push_name']],
        ]);

        // A IA (Claude) lê o histórico e responde/agenda — se ligado, conectado e autonomia permitir.
        AttendantAI::maybeRespond($conv);
    }
}
