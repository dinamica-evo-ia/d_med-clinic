<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureMaster
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_master) {
            // Página amigável (não beco sem saída) com opção de sair e logar com a conta master.
            return Inertia::render('Errors/Forbidden', [
                'email' => $user?->email,
            ])->toResponse($request)->setStatusCode(403);
        }

        return $next($request);
    }
}
