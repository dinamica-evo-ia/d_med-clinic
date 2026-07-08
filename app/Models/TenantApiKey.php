<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/*
 * Chave de API de uma clínica (banco central). Vive no central, então força a conexão
 * central mesmo quando um tenant já está ativo (igual User/Tenant do stancl) — ver
 * armadilha #11 do CLAUDE.md.
 */
class TenantApiKey extends Model
{
    use CentralConnection;

    protected $fillable = [
        'tenant_id', 'name', 'prefix', 'token_hash', 'scopes',
        'last_used_at', 'expires_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Gera um token novo pra uma clínica. Retorna [modelo, tokenEmClaro].
     * O segredo em claro só existe aqui — depois só fica o hash.
     */
    public static function issue(string $tenantId, string $name, array $scopes): array
    {
        $prefix = 'dmk_' . Str::lower(Str::random(8));
        $secret = Str::random(40);
        $token = "{$prefix}_{$secret}";

        $key = self::create([
            'tenant_id' => $tenantId,
            'name' => $name,
            'prefix' => $prefix,
            'token_hash' => hash('sha256', $token),
            'scopes' => $scopes,
            'is_active' => true,
        ]);

        return [$key, $token];
    }

    public function hasScope(string $scope): bool
    {
        $scopes = $this->scopes ?? [];
        return in_array('*', $scopes, true) || in_array($scope, $scopes, true);
    }
}
