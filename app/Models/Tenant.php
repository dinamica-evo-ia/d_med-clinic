<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    // Mass-assignment liberado: o stancl usa VirtualColumn — campos não-custom (name, slug, plan, status, etc.)
    // viram virtuais e são armazenados em 'data' JSON automaticamente. $fillable estava bloqueando isso.
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            // 'data' é gerenciado pelo VirtualColumn do stancl (não cast aqui).
            // 'settings' sem cast: estava corrompendo (double-encoded JSON).
        ];
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'tenant_user')
            ->withPivot('role', 'is_active')
            ->withTimestamps();
    }

    // Nº de registro sequencial do cliente (1, 2, 3...) — nunca reutilizado.
    // Chamar DENTRO da transação que cria o tenant.
    public static function proximoRegistro(): int
    {
        $max = (int) static::query()->max('data->registro');

        return $max + 1;
    }

    // Código de cliente legível e ÚNICO: slug + registro com 4 dígitos
    // (ex.: "medhealth-0007"). O slug já é único; o registro garante que
    // nem renomeação/reuso de nome gera duplicata.
    public function getCodigoClienteAttribute(): ?string
    {
        $registro = $this->registro ?? null;
        if (! $registro) {
            return $this->slug ?? null;
        }

        return ($this->slug ?? 'clinica').'-'.str_pad((string) $registro, 4, '0', STR_PAD_LEFT);
    }
}
