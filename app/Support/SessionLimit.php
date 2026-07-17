<?php

namespace App\Support;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * "Um celular e um CRM web logados" — regra do plano (2026-07-17).
 *
 * Ao logar, derruba as sessões EXCEDENTES do mesmo usuário **da mesma classe**: entrar no
 * computador não desconecta o celular, e vice-versa. Só o computador antigo cai quando ele loga
 * num computador novo.
 *
 * Como sabemos qual é qual: a tabela `sessions` do Laravel **já guarda o user_agent** — dá pra
 * classificar celular × computador sem inventar tabela nova nem depender de como a pessoa logou
 * (pelo formulário ou pelo QR). Isso também cobre as sessões que já existiam antes desta regra.
 *
 * ⚠️ Depende de SESSION_DRIVER=database (é o caso). Com driver de arquivo/cookie não há o que
 * derrubar — por isso o guard logo no começo, em vez de falhar em silêncio.
 */
class SessionLimit
{
    /** Sem plano resolvido, a regra do produto é 1 + 1. */
    private const PADRAO_WEB = 1;
    private const PADRAO_APP = 1;

    /**
     * Aplica o limite pro usuário que acabou de logar. Devolve quantas sessões foram derrubadas.
     *
     * Chame DEPOIS do session()->regenerate() — o id da sessão muda ali, e é ele que a gente
     * precisa preservar. A sessão atual normalmente ainda nem está na tabela (o Laravel grava no
     * fim do request), então ela naturalmente não entra na conta; o `!= $atual` é cinto e
     * suspensório.
     */
    public static function aplicar(User $user, string $sessionIdAtual, ?string $userAgentAtual): int
    {
        if (config('session.driver') !== 'database') {
            return 0;
        }

        // Master usa várias telas e impersona clínicas — limitar ele só atrapalharia o suporte.
        if ($user->is_master) {
            return 0;
        }

        $classeAtual = self::classe($userAgentAtual);
        $limite = self::limite($user, $classeAtual);

        if ($limite === null) { // null = ilimitado
            return 0;
        }

        $outras = DB::connection(config('tenancy.database.central_connection'))
            ->table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $sessionIdAtual)
            ->orderByDesc('last_activity')
            ->get(['id', 'user_agent', 'last_activity']);

        // Só as da MESMA classe disputam a vaga.
        $mesmaClasse = $outras->filter(fn ($s) => self::classe($s->user_agent) === $classeAtual)->values();

        // A sessão atual já ocupa 1 vaga → sobram ($limite - 1) pras antigas. As mais recentes
        // ficam; o excedente (mais velho) cai. Com limite 1, todas as antigas caem.
        $sobram = max(0, $limite - 1);
        $derrubar = $mesmaClasse->slice($sobram)->pluck('id');

        if ($derrubar->isEmpty()) {
            return 0;
        }

        DB::connection(config('tenancy.database.central_connection'))
            ->table('sessions')->whereIn('id', $derrubar)->delete();

        return $derrubar->count();
    }

    /** 'app' = celular/tablet · 'web' = computador. Decidido pelo user_agent. */
    public static function classe(?string $userAgent): string
    {
        $ua = mb_strtolower((string) $userAgent);

        // "ipad" cai em mobile de propósito: pro médico é "o aparelho", não o computador.
        $movel = ['iphone', 'ipad', 'ipod', 'android', 'mobile', 'windows phone', 'opera mini'];
        foreach ($movel as $m) {
            if (str_contains($ua, $m)) {
                return 'app';
            }
        }

        return 'web';
    }

    /** Limite do plano da clínica do usuário; cai no padrão do produto se não der pra resolver. */
    private static function limite(User $user, string $classe): ?int
    {
        $padrao = $classe === 'app' ? self::PADRAO_APP : self::PADRAO_WEB;
        $plano = self::planoDoUsuario($user);

        if (! $plano) {
            return $padrao;
        }

        $campo = $classe === 'app' ? 'app_devices' : 'web_sessions';

        // Chave ausente (plano criado antes da coluna) → padrão. Valor null gravado = ilimitado.
        return array_key_exists($campo, $plano) ? $plano[$campo] : $padrao;
    }

    /**
     * Plano da clínica ativa. No login o tenant ainda não foi inicializado, então resolve na mão:
     * o slug da sessão (quem escolheu clínica) ou a única clínica ativa do usuário.
     */
    private static function planoDoUsuario(User $user): ?array
    {
        try {
            $tenant = null;
            if ($slug = session('tenant_slug')) {
                $tenant = Tenant::where('data->slug', $slug)->first();
            }
            if (! $tenant) {
                $tenants = $user->tenants()->wherePivot('is_active', true)->get();
                $tenant = $tenants->count() === 1 ? $tenants->first() : null;
            }

            return $tenant?->plan ? Plans::get($tenant->plan) : null;
        } catch (\Throwable $e) {
            return null; // regra de sessão nunca pode impedir alguém de logar
        }
    }
}
