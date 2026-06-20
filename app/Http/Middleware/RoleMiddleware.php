<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403, 'Não autenticado.');
        }

        $tenantId = tenant()?->id;

        if (!$tenantId) {
            abort(403, 'Nenhum tenant ativo.');
        }

        $pivot = $user->tenants()
            ->where('tenant_id', $tenantId)
            ->first()?->pivot;

        if (!$pivot || !in_array($pivot->role, $roles)) {
            abort(403, 'Acesso não autorizado para este papel.');
        }

        return $next($request);
    }
}
