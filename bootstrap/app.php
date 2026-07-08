<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'tenancy.by_user' => \App\Http\Middleware\InitializeTenancyByUser::class,
            'tenancy.by_api' => \App\Http\Middleware\InitializeTenancyByApiToken::class,
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'permission' => \App\Http\Middleware\EnsurePermission::class,
            'ensure.master' => \App\Http\Middleware\EnsureMaster::class,
        ]);

        // CRÍTICO: tenancy.by_user precisa rodar ANTES de SubstituteBindings,
        // senão o Route Model Binding (Patient $patient) busca no banco central
        // antes do tenant ser inicializado → 500 "no such table".
        $middleware->prependToPriorityList(
            before: \Illuminate\Routing\Middleware\SubstituteBindings::class,
            prepend: \App\Http\Middleware\InitializeTenancyByUser::class,
        );

        // Mesmo motivo, pra API de máquina (rotas /api/agent/*): inicializar o tenant
        // pelo token ANTES do route-model-binding.
        $middleware->prependToPriorityList(
            before: \Illuminate\Routing\Middleware\SubstituteBindings::class,
            prepend: \App\Http\Middleware\InitializeTenancyByApiToken::class,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
