<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InitializeTenancyByUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return $next($request);
        }

        $tenantSlug = session('tenant_slug');
        $tenant = null;

        if ($tenantSlug) {
            // slug é VIRTUAL column (em data JSON do stancl) — busca via JSON.
            $tenant = Tenant::where('data->slug', $tenantSlug)->first();
            // Confirma se o user tem acesso a esse tenant (não pode logar com sessão de outra clínica)
            if ($tenant && ! auth()->user()->tenants()->where('tenant_id', $tenant->id)->wherePivot('is_active', true)->exists()) {
                $tenant = null;
                session()->forget('tenant_slug');
            }
        }

        if (!$tenant) {
            $tenants = auth()->user()->tenants()->wherePivot('is_active', true)->get();
            if ($tenants->count() === 1) {
                $tenant = $tenants->first();
                session(['tenant_slug' => $tenant->slug]);
            }
        }

        if ($tenant) {
            if ($this->isBlocked($tenant) && ! auth()->user()->is_master) {
                return redirect()->route('account.blocked');
            }
            tenancy()->initialize($tenant);
            return $next($request);
        }

        // Sem tenant válido: NÃO segue (cairia no banco central que não tem tabelas de clínica → 500).
        // Master vai pro painel; demais usuários vão pro select-tenant que mostra "sem acesso".
        if (auth()->user()->is_master) {
            return redirect()->route('master.dashboard');
        }

        return redirect()->route('select.tenant');
    }

    /** Trial vencido ou clínica suspensa/cancelada pelo Master — bloqueia o uso do CRM (não apaga nada). */
    private function isBlocked(Tenant $tenant): bool
    {
        if (in_array($tenant->status, ['suspended', 'cancelled'], true)) {
            return true;
        }
        if ($tenant->status === 'trial' && $tenant->trial_ends_at && now()->toDateString() > $tenant->trial_ends_at) {
            return true;
        }
        return false;
    }
}
