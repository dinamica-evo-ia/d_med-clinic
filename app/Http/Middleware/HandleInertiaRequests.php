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
            ],
        ];
    }
}
