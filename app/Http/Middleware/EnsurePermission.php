<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/*
 * Acesso extra liberado pelo médico/admin a uma secretária (ex.: Financeiro), além do
 * papel padrão. Admin/doctor sempre passam (User::hasPermission já trata isso).
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $key): Response
    {
        if (! $request->user() || ! $request->user()->hasPermission($key)) {
            abort(403, 'Acesso não autorizado.');
        }

        return $next($request);
    }
}
