<?php

namespace App\Support\Whatsapp;

use App\Models\AttendantSetting;

/**
 * Porta de entrada do WhatsApp. Escolhe o provedor por `attendant_settings.provider`.
 *
 * Provedores: WADuck (hospedado) · Evolution (open source, self-hosted).
 * Meta/Cloud API oficial fica pra depois — entra como mais uma classe aqui, sem mexer
 * em quem chama.
 */
class Whatsapp
{
    public const PROVIDERS = ['waduck', 'evolution'];

    public const LABELS = [
        'waduck' => 'WADuck (hospedado)',
        'evolution' => 'Evolution API (open source)',
    ];

    public static function for(AttendantSetting $s): WhatsappProvider
    {
        return match ($s->provider) {
            'evolution' => new EvolutionProvider($s),
            default => new WaduckProvider($s),
        };
    }

    public static function sendText(AttendantSetting $s, string $toPhone, string $text): ?string
    {
        return self::for($s)->sendText($toPhone, $text);
    }

    public static function connectionState(AttendantSetting $s): array
    {
        return self::for($s)->connectionState();
    }

    /**
     * Normaliza um item de messages.upsert. Igual nos dois provedores (ambos são Baileys).
     * Retorna null se não der pra extrair telefone.
     * ['from_me'=>bool,'phone'=>string,'text'=>?string,'type'=>string,'push_name'=>?string,'external_id'=>?string]
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
}
