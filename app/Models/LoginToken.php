<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * Token de uso único pra entrar no celular via QR. Ver a migration pro desenho de segurança.
 *
 * CentralConnection obrigatório: vive no banco central e é lido de contexto tenant-aware
 * (armadilha #11 do handoff).
 */
class LoginToken extends Model
{
    use CentralConnection;

    /** Vida curta de propósito: tempo de escanear, não de vazar. */
    public const VALIDADE_SEGUNDOS = 120;

    protected $fillable = ['user_id', 'token_hash', 'tenant_slug', 'expires_at', 'used_at', 'used_user_agent'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'used_at' => 'datetime'];
    }

    /**
     * Cria um token pro usuário e devolve o valor CRU (só existe aqui, uma vez — o banco
     * guarda apenas o hash). Limpa tokens velhos do mesmo usuário: um QR novo invalida o
     * anterior, então uma tela esquecida aberta não deixa porta aberta.
     */
    public static function gerar(User $user, ?string $tenantSlug): string
    {
        static::where('user_id', $user->id)->delete();

        $cru = Str::random(64);

        static::create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $cru),
            'tenant_slug' => $tenantSlug,
            'expires_at' => now()->addSeconds(self::VALIDADE_SEGUNDOS),
        ]);

        return $cru;
    }

    /**
     * Consome o token: devolve o registro se for válido, null caso contrário.
     * Marca como usado ANTES de o chamador logar — uso único de verdade, mesmo se dois
     * aparelhos escanearem quase ao mesmo tempo.
     */
    public static function consumir(string $cru, ?string $userAgent = null): ?self
    {
        $t = static::where('token_hash', hash('sha256', $cru))
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $t) {
            return null;
        }

        $t->forceFill(['used_at' => now(), 'used_user_agent' => substr((string) $userAgent, 0, 255)])->save();

        return $t;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
