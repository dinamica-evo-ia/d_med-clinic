<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Models\TenantApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/*
 * Inicializa o tenant a partir de uma chave de API (não do usuário logado).
 * Usado nas rotas /api/agent/* chamadas por integrações externas (D_Agent Atende).
 *
 * Token: "Authorization: Bearer dmk_<prefix>_<secret>" (ou header "apikey").
 * Guardamos só o hash sha256; o lookup é por prefix + comparação constante do hash.
 *
 * ⚠️ Precisa rodar ANTES de SubstituteBindings (igual tenancy.by_user) — registrado no
 * prependToPriorityList do bootstrap/app.php — senão qualquer route-model-binding de model
 * de tenant buscaria no banco central. Ver armadilha #1 do CLAUDE.md.
 */
class InitializeTenancyByApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization') ?? $request->header('apikey') ?? '';
        $token  = trim(preg_replace('/^Bearer\s+/i', '', $header));

        if (! str_starts_with($token, 'dmk_')) {
            return $this->deny();
        }

        $parts = explode('_', $token);
        if (count($parts) < 3) {
            return $this->deny();
        }
        $prefix = $parts[0] . '_' . $parts[1];
        $hash   = hash('sha256', $token);

        $key = TenantApiKey::where('prefix', $prefix)
            ->where('is_active', true)
            ->get()
            ->first(fn ($k) => hash_equals($k->token_hash, $hash));

        if (! $key) {
            return $this->deny();
        }
        if ($key->expires_at && $key->expires_at->isPast()) {
            return $this->deny('Token expirado');
        }

        $tenant = Tenant::find($key->tenant_id);
        if (! $tenant) {
            return $this->deny('Clínica não encontrada');
        }

        tenancy()->initialize($tenant);

        $key->forceFill(['last_used_at' => now()])->saveQuietly();
        $request->attributes->set('apiKey', $key);

        return $next($request);
    }

    private function deny(string $message = 'Não autorizado'): Response
    {
        return response()->json(['error' => $message], 401);
    }
}
