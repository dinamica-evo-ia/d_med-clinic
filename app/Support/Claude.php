<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;

/**
 * Cliente fino da Messages API da Anthropic (Claude). Usado pelo cérebro do D_Med Atende.
 * Chave única do produto em config('services.anthropic.key').
 */
class Claude
{
    public static function configured(): bool
    {
        return ! empty(config('services.anthropic.key'));
    }

    /**
     * Uma chamada à Messages API. $params: system, messages, tools, max_tokens…
     * Retorna o JSON decodificado (content, stop_reason, …). Lança em erro.
     */
    public static function messages(array $params): array
    {
        $key = config('services.anthropic.key');
        if (! $key) {
            throw new \RuntimeException('ANTHROPIC_API_KEY não configurada.');
        }

        $params['model'] = $params['model'] ?? config('services.anthropic.model');
        $params['max_tokens'] = $params['max_tokens'] ?? 1024;

        $res = Http::withHeaders([
            'x-api-key' => $key,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->timeout(60)->post('https://api.anthropic.com/v1/messages', $params);

        if ($res->failed()) {
            throw new \RuntimeException('Claude '.$res->status().': '.substr($res->body(), 0, 400));
        }

        return $res->json() ?? [];
    }
}
