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

        return [
            'from_me' => (bool) (data_get($m, 'key.fromMe') ?? $m['fromMe'] ?? false),
            'phone' => $phone,
            'text' => $text,
            'push_name' => $m['pushName'] ?? $m['notifyName'] ?? null,
            'external_id' => data_get($m, 'key.id') ?? $m['id'] ?? null,
        ];
    }
}
