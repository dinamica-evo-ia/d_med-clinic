<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'isMaster' => (bool) ($user?->is_master),
                // Lazy: avaliado na renderizacao (depois do middleware tenancy.by_user
                // inicializar o tenant), senao tenant() ainda e null aqui e o role vem null.
                'role' => function () use ($user) {
                    if ($user && tenant()) {
                        return $user->tenants()
                            ->where('tenant_id', tenant()->id)
                            ->first()?->pivot?->role;
                    }
                    return null;
                },
                // Acessos extras liberados pra secretária (ex.: 'financeiro') — admin/doctor
                // não precisam, já têm tudo por papel.
                'permissions' => function () use ($user) {
                    if (! $user || ! tenant()) return [];
                    $pivot = $user->tenants()->where('tenant_id', tenant()->id)->first()?->pivot;
                    if (! $pivot) return [];
                    $perms = $pivot->permissions;
                    if (is_string($perms)) $perms = json_decode($perms, true);
                    return $perms ?? [];
                },
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'impersonating' => (bool) $request->session()->get('master_impersonator_id'),
            'tenant' => function () {
                $t = tenant();
                if (! $t) return null;
                return [
                    'id' => $t->id,
                    'slug' => $t->slug ?? null,
                    'codigo' => $t->codigo_cliente,
                    'name' => $t->name ?? null,
                    'plan' => $t->plan ?? null,
                    'status' => $t->status ?? null,
                ];
            },
        ];
    }
}
