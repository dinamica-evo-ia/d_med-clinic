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
     *
     * Passando $phone (só dígitos, com DDI), o Baileys gera um **código de pareamento** de 8
     * caracteres em vez de exigir leitura do QR — a pessoa digita esse código no WhatsApp do
     * celular (Aparelhos conectados → Conectar com número de telefone). Resolve quando não dá
     * pra escanear (sem câmera, celular longe), mas **ainda exige o app** com a conta logada:
     * o Evolution fala o protocolo do WhatsApp Web, que é sempre um aparelho VINCULADO a uma
     * conta existente. Sem celular nenhum, o caminho é a Cloud API oficial da Meta.
     *
     * ['state', 'qr_base64', 'qr_code', 'pairing_code']
     */
    public function pair(string $webhookUrl, ?string $phone = null): array
    {
        $state = $this->connectionState();
        if (($state['state'] ?? null) === 'open') {
            return ['state' => 'open', 'qr_base64' => null, 'qr_code' => null, 'pairing_code' => null];
        }

        $numero = $phone ? preg_replace('/\D/', '', $phone) : null;

        $this->ensureInstance($webhookUrl, $numero);
        $this->setWebhook($webhookUrl);

        /*
         * 🔴 O código de pareamento só sai com a instância em 'close'. No controller do
         * Evolution, o /instance/connect faz:
         *     if (state == 'connecting') return instance.qrCode;   // devolve o QR VELHO
         *     if (state == 'close')      connectToWhatsapp(number) // só AQUI usa o number
         * Ou seja: se alguém pediu o QR antes, a instância fica 'connecting' e o telefone é
         * ignorado em silêncio — o código nunca vem. Derrubamos a sessão pra voltar ao 'close'.
         *
         * Seguro: o early-return lá em cima já saiu se estivesse 'open', então isto nunca
         * derruba um WhatsApp que está funcionando.
         */
        if ($numero && ($state['state'] ?? null) === 'connecting') {
            $this->http($this->globalKey())->delete($this->url('/instance/logout/'.$this->instance()));
            usleep(1_500_000); // o Baileys precisa de um respiro pra fechar antes do connect
        }
        $res = $this->http($this->globalKey())->get(
            $this->url('/instance/connect/'.$this->instance()),
            $numero ? ['number' => $numero] : []
        );
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
            'pairing_code' => data_get($j, 'pairingCode') ?? data_get($j, 'qrcode.pairingCode'),
        ];
    }

    /**
     * Cria a instância se ainda não existe. Guarda o token dela (hash) pra usar no envio.
     * Com $numero, o create já nasce pedindo código de pareamento em vez de QR.
     */
    private function ensureInstance(string $webhookUrl, ?string $numero = null): void
    {
        $payload = [
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
        ];
        // com número, a instância já nasce pedindo código de pareamento em vez de QR
        if ($numero) {
            $payload['number'] = $numero;
        }

        $res = $this->http($this->globalKey())->post($this->url('/instance/create'), $payload);

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
