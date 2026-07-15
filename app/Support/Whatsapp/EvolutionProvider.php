<?php

namespace App\Support\Whatsapp;

/**
 * Evolution API (open source, self-hosted) — https://github.com/evolution-foundation/evolution-api
 * Testado contra a v2.
 *
 * Diferenças da v1 que quebram se copiar exemplo velho da internet:
 *   - paths SEM o prefixo /v1;
 *   - `sendText` recebe {number,text} plano (na v1 era {number, textMessage:{text}});
 *   - `webhook/set` recebe o objeto ANINHADO: {"webhook":{enabled,url,events}};
 *   - os eventos no `set` são UPPER_SNAKE (MESSAGES_UPSERT), embora o webhook CHEGUE com
 *     `event: "messages.upsert"` (minúsculo com ponto).
 */
class EvolutionProvider extends WhatsappProvider
{
    /** Só o que o Atendente usa — pedir tudo enche o log de ruído. */
    private const EVENTS = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'];

    public function label(): string
    {
        return 'Evolution';
    }

    protected function prefix(): string
    {
        return '';
    }

    public function defaultBaseUrl(): string
    {
        return 'http://localhost:8080';
    }

    public function supportsQrPairing(): bool
    {
        return true;
    }

    /**
     * Garante a instância, aponta o webhook e devolve o QR pra parear.
     * ['state' => open|connecting|close, 'qr_base64' => ?string, 'qr_code' => ?string]
     */
    public function pair(string $webhookUrl): array
    {
        $state = $this->connectionState();
        if (($state['state'] ?? null) === 'open') {
            return ['state' => 'open', 'qr_base64' => null, 'qr_code' => null];
        }

        $this->ensureInstance($webhookUrl);
        $this->setWebhook($webhookUrl);

        $res = $this->http($this->globalKey())->get($this->url('/instance/connect/'.$this->instance()));
        if ($res->failed()) {
            throw new \RuntimeException('Evolution '.$res->status().': '.substr($res->body(), 0, 300));
        }
        $j = $res->json() ?? [];

        // ⚠️ o /instance/connect responde de DOIS jeitos: com o qrCode no topo (quando está
        // 'connecting'/'close') e aninhado em 'qrcode' no outro ramo. Aceitar os dois.
        return [
            'state' => data_get($j, 'instance.state') ?? 'connecting',
            'qr_base64' => data_get($j, 'base64') ?? data_get($j, 'qrcode.base64'),
            'qr_code' => data_get($j, 'code') ?? data_get($j, 'qrcode.code'),
        ];
    }

    /** Cria a instância se ainda não existe. Guarda o token dela (hash) pra usar no envio. */
    private function ensureInstance(string $webhookUrl): void
    {
        $res = $this->http($this->globalKey())->post($this->url('/instance/create'), [
            'instanceName' => $this->s->waduck_instance,
            'integration' => 'WHATSAPP-BAILEYS',
            'qrcode' => true,
            'webhook' => [
                'enabled' => true,
                'url' => $webhookUrl,
                'byEvents' => false,
                'base64' => false,
                'events' => self::EVENTS,
            ],
        ]);

        if ($res->successful()) {
            // v2 devolve hash como string; versões antigas devolviam {apikey: "..."}
            $hash = $res->json('hash');
            $token = is_array($hash) ? ($hash['apikey'] ?? null) : $hash;
            if ($token) {
                $this->s->update(['instance_token' => $token]);
            }

            return;
        }

        // instância já existe = ok, seguimos pro connect. Qualquer outro erro é erro.
        $body = strtolower($res->body());
        if ($res->status() === 403 || $res->status() === 409 || str_contains($body, 'already in use') || str_contains($body, 'already exists')) {
            return;
        }

        throw new \RuntimeException('Evolution '.$res->status().': '.substr($res->body(), 0, 300));
    }

    /** Reaponta o webhook (idempotente) — a instância pode ter sido criada fora daqui. */
    public function setWebhook(string $webhookUrl): void
    {
        $this->http($this->globalKey())->post($this->url('/webhook/set/'.$this->instance()), [
            'webhook' => [
                'enabled' => true,
                'url' => $webhookUrl,
                'byEvents' => false,
                'base64' => false,
                'events' => self::EVENTS,
            ],
        ]);
        // best-effort: se falhar, o pair() ainda entrega o QR e o erro aparece no teste de envio
    }

    /** Desconecta o número (mantém a instância criada). */
    public function logout(): void
    {
        $this->http($this->globalKey())->delete($this->url('/instance/logout/'.$this->instance()));
    }
}
