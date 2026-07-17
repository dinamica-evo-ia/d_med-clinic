<?php

namespace App\Support\Whatsapp;

use App\Models\AttendantSetting;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Base dos provedores de WhatsApp.
 *
 * WADuck e Evolution falam a MESMA API (a WADuck é uma Evolution hospedada): mesmo header
 * `apikey`, mesmo `POST /message/sendText/{instancia}` com `{number,text}`, mesmo webhook
 * `messages.upsert`. A diferença é:
 *   - o prefixo do path (`/v1` na WADuck, nada na Evolution);
 *   - a Evolution self-hosted também cria instância e pareia por QR code.
 *
 * Trocar de provedor = trocar `attendant_settings.provider`. Nada mais no código muda.
 */
abstract class WhatsappProvider
{
    public function __construct(protected AttendantSetting $s) {}

    /** Nome pra mensagem de erro. */
    abstract public function label(): string;

    /** Prefixo do path: '' (Evolution) ou '/v1' (WADuck). */
    abstract protected function prefix(): string;

    abstract public function defaultBaseUrl(): string;

    public function baseUrl(): string
    {
        return rtrim($this->s->waduck_api_url ?: $this->defaultBaseUrl(), '/');
    }

    protected function url(string $path): string
    {
        return $this->baseUrl().$this->prefix().$path;
    }

    protected function instance(): string
    {
        return rawurlencode((string) $this->s->waduck_instance);
    }

    /**
     * Chave das chamadas de MENSAGEM. A Evolution devolve um token por instância no create
     * (`hash`); quando existe, ele vale mais que a chave global.
     */
    protected function apiKey(): ?string
    {
        return $this->s->instance_token ?: $this->s->waduck_api_key;
    }

    /** Chave de GESTÃO (criar instância, QR, webhook) — sempre a global. */
    protected function globalKey(): ?string
    {
        return $this->s->waduck_api_key;
    }

    protected function http(?string $key = null): PendingRequest
    {
        return Http::withHeaders(['apikey' => $key ?: $this->apiKey()])
            ->acceptJson()
            ->timeout(20);
    }

    /** Envia texto. Retorna o id externo (ou null). Lança em erro. */
    public function sendText(string $toPhone, string $text): ?string
    {
        if (! $this->s->isWhatsappConnected()) {
            throw new \RuntimeException('WhatsApp não conectado (instância/chave ausente).');
        }

        $res = $this->http()->post($this->url('/message/sendText/'.$this->instance()), [
            'number' => preg_replace('/\D/', '', $toPhone),
            'text' => $text,
        ]);

        if ($res->failed()) {
            throw new \RuntimeException($this->label().' '.$res->status().': '.substr($res->body(), 0, 300));
        }

        $j = $res->json() ?? [];

        return data_get($j, 'key.id') ?? data_get($j, 'id') ?? data_get($j, 'messageId');
    }

    /**
     * Envia um DOCUMENTO (ex.: PDF do resumo da consulta). Mesmo endpoint nos dois
     * provedores (ambos Evolution/Baileys): POST /message/sendMedia/{instancia}.
     * $base64 SEM o prefixo data-uri. Retorna o id externo (ou null). Lança em erro.
     */
    public function sendDocument(string $toPhone, string $base64, string $fileName, string $caption = '', string $mimetype = 'application/pdf'): ?string
    {
        if (! $this->s->isWhatsappConnected()) {
            throw new \RuntimeException('WhatsApp não conectado (instância/chave ausente).');
        }

        $res = $this->http()->timeout(60)->post($this->url('/message/sendMedia/'.$this->instance()), [
            'number' => preg_replace('/\D/', '', $toPhone),
            'mediatype' => 'document',
            'mimetype' => $mimetype,
            'media' => $base64,
            'fileName' => $fileName,
            'caption' => $caption,
        ]);

        if ($res->failed()) {
            throw new \RuntimeException($this->label().' '.$res->status().': '.substr($res->body(), 0, 300));
        }

        $j = $res->json() ?? [];

        return data_get($j, 'key.id') ?? data_get($j, 'id') ?? data_get($j, 'messageId');
    }

    /** Estado real da instância no provedor (open/close/connecting). Best-effort. */
    public function connectionState(): array
    {
        if (! $this->s->isWhatsappConnected()) {
            return ['ok' => false, 'state' => 'disconnected'];
        }

        try {
            $res = $this->http()->get($this->url('/instance/connectionState/'.$this->instance()));
            if ($res->failed()) {
                return ['ok' => false, 'state' => 'unknown', 'error' => 'HTTP '.$res->status()];
            }
            $j = $res->json() ?? [];

            return ['ok' => true, 'state' => data_get($j, 'instance.state') ?? data_get($j, 'state') ?? 'unknown'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'state' => 'unknown', 'error' => substr($e->getMessage(), 0, 120)];
        }
    }

    /** Este provedor pareia por QR code aqui dentro? (WADuck pareia no painel deles.) */
    public function supportsQrPairing(): bool
    {
        return false;
    }
}
