<?php

namespace App\Support;

use App\Models\Plan;

/*
 * Acesso aos planos (agora no banco central, editáveis no Painel Master).
 * all() devolve no mesmo formato que o antigo config('plans.plans') usava
 * (['key' => ['name','description','doctors','staff','price','features']]),
 * pra troca dos consumidores ser mínima. Cacheado por request.
 */
class Plans
{
    private static ?array $cache = null;

    private static function load(): array
    {
        if (self::$cache !== null) return self::$cache;

        $out = [];
        foreach (Plan::orderBy('sort_order')->get() as $p) {
            $out[$p->key] = [
                'key' => $p->key,
                'name' => $p->name,
                'description' => $p->description,
                'doctors' => $p->doctors,          // null = ilimitado
                'staff' => $p->staff,              // null = ilimitado
                'web_sessions' => $p->web_sessions, // logins simultâneos no computador (null = ∞)
                'app_devices' => $p->app_devices,   // celulares logados ao mesmo tempo (null = ∞)
                'price' => $p->price !== null ? (float) $p->price : null,
                'features' => $p->features ?? [],
                'is_active' => (bool) $p->is_active,
            ];
        }
        return self::$cache = $out;
    }

    public static function all(): array
    {
        return self::load();
    }

    public static function keys(): array
    {
        return array_keys(self::load());
    }

    public static function get(string $key): ?array
    {
        return self::load()[$key] ?? null;
    }

    /** Limpa o cache (após editar no master, dentro do mesmo request). */
    public static function flush(): void
    {
        self::$cache = null;
    }
}
