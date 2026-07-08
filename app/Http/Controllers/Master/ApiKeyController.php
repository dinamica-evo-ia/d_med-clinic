<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use Illuminate\Http\Request;

/*
 * Gestão das chaves de API de uma clínica no Painel Master (gerar/listar/revogar).
 * O token em claro só aparece UMA vez, na geração (depois só fica o hash). Consumido
 * por integrações externas — hoje o D_Agent Atende. Ver docs/integracao-d-agent.md.
 * Respostas em JSON (o modal usa XHR).
 */
class ApiKeyController extends Controller
{
    private const DEFAULT_SCOPES = ['agenda:read', 'agenda:write', 'pacientes:write'];

    public function index(Tenant $clinica)
    {
        return response()->json(['keys' => $this->keysFor($clinica->id)]);
    }

    public function store(Request $request, Tenant $clinica)
    {
        $name = trim((string) $request->input('name')) ?: 'D_Agent Atende';
        [$key, $token] = TenantApiKey::issue($clinica->id, $name, self::DEFAULT_SCOPES);

        return response()->json([
            'token' => $token,               // mostrado só agora
            'key'   => $this->serialize($key),
            'keys'  => $this->keysFor($clinica->id),
        ], 201);
    }

    public function destroy(Tenant $clinica, TenantApiKey $apiKey)
    {
        if ($apiKey->tenant_id !== $clinica->id) {
            return response()->json(['error' => 'Chave não pertence a esta clínica.'], 403);
        }
        $apiKey->delete();

        return response()->json(['ok' => true, 'keys' => $this->keysFor($clinica->id)]);
    }

    private function keysFor(string $tenantId): array
    {
        return TenantApiKey::where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($k) => $this->serialize($k))
            ->all();
    }

    private function serialize(TenantApiKey $k): array
    {
        return [
            'id'           => $k->id,
            'name'         => $k->name,
            'prefix'       => $k->prefix,
            'scopes'       => $k->scopes ?? [],
            'last_used_at' => $k->last_used_at?->toIso8601String(),
            'is_active'    => (bool) $k->is_active,
            'created_at'   => $k->created_at?->toIso8601String(),
        ];
    }
}
