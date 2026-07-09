<?php

namespace App\Support;

use App\Models\AttendantSetting;
use Illuminate\Support\Facades\Http;

/**
 * Cliente do provedor de WhatsApp (WADuck / Evolution API). Mesmo formato usado pelo D_Agent:
 *   envio  → POST {base}/v1/message/sendText/{instance}   header apikey   body {number,text}
 *   entrada→ webhook messages.upsert (parse em parseInbound)
 */
class Waduck
{
    /** Envia uma mensagem de texto. Retorna o id externo (ou null). Lança em erro. */
    public static function sendText(AttendantSetting $s, string $toPhone, string $text): ?string
    {
        if (empty($s->waduck_instance) || empty($s->waduck_api_key)) {
            throw new \RuntimeException('WhatsApp não conectado (instância/chave ausente).');
        }

        $number = preg_replace('/\D/', '', $toPhone);
        $url = $s->apiBaseUrl().'/v1/message/sendText/'.rawurlencode($s->waduck_instance);

        $res = Http::withHeaders(['apikey' => $s->waduck_api_key])
            ->acceptJson()
            ->timeout(20)
            ->post($url, ['number' => $number, 'text' => $text]);

        if ($res->failed()) {
            throw new \RuntimeException('WADuck '.$res->status().': '.substr($res->body(), 0, 300));
        }

        $j = $res->json() ?? [];
        return data_get($j, 'key.id') ?? data_get($j, 'id') ?? data_get($j, 'messageId');
    }

    /**
     * Normaliza um item de messages.upsert. Retorna null se não der pra extrair telefone.
     * ['from_me'=>bool, 'phone'=>string(digits), 'text'=>?string, 'push_name'=>?string, 'external_id'=>?string]
     */
    public static function parseInbound(array $m): ?array
    {
        $remoteJid = data_get($m, 'key.remoteJid') ?? $m['remoteJid'] ?? $m['from'] ?? '';
        $phone = preg_replace('/\D/', '', explode('@', (string) $remoteJid)[0] ?? '');
        if (! $phone) {
            return null;
        }

        $text = data_get($m, 'message.conversation')
            ?? data_get($m, 'message.extendedTextMessage.text')
            ?? data_get($m, 'message.imageMessage.caption')
            ?? data_get($m, 'message.videoMessage.caption')
            ?? data_get($m, 'message.documentMessage.caption')
            ?? $m['body'] ?? $m['text'] ?? null;

        // Tipo (pra tratar mídia sem legenda com um fallback amigável).
        $type = 'text';
        if (data_get($m, 'message.audioMessage')) {
            $type = 'audio';
        } elseif (data_get($m, 'message.imageMessage')) {
            $type = 'image';
        } elseif (data_get($m, 'message.videoMessage')) {
            $type = 'video';
        } elseif (data_get($m, 'message.documentMessage')) {
            $type = 'document';
        } elseif (data_get($m, 'message.stickerMessage') || data_get($m, 'message.locationMessage')) {
            $type = 'other';
        }

        return [
            'from_me' => (bool) (data_get($m, 'key.fromMe') ?? $m['fromMe'] ?? false),
            'phone' => $phone,
            'text' => $text,
            'type' => $type,
            'push_name' => $m['pushName'] ?? $m['notifyName'] ?? null,
            'external_id' => data_get($m, 'key.id') ?? $m['id'] ?? null,
        ];
    }

    /** Estado real da instância no provedor (open/close/connecting). Best-effort. */
    public static function connectionState(AttendantSetting $s): array
    {
        if (empty($s->waduck_instance) || empty($s->waduck_api_key)) {
            return ['ok' => false, 'state' => 'disconnected'];
        }

        try {
            $res = Http::withHeaders(['apikey' => $s->waduck_api_key])->acceptJson()->timeout(15)
                ->get($s->apiBaseUrl().'/v1/instance/connectionState/'.rawurlencode($s->waduck_instance));

            if ($res->failed()) {
                return ['ok' => false, 'state' => 'unknown', 'error' => 'HTTP '.$res->status()];
            }
            $j = $res->json() ?? [];

            return ['ok' => true, 'state' => data_get($j, 'instance.state') ?? data_get($j, 'state') ?? 'unknown'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'state' => 'unknown', 'error' => substr($e->getMessage(), 0, 120)];
        }
    }
}
