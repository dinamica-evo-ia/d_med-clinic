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

    // Nº de registro do cliente — ÚNICO e crescente, mas NÃO sequencial:
    // o primeiro sai de uma base aleatória de 5 dígitos e cada novo soma um
    // salto aleatório. Assim o código não revela quantos clientes existem
    // nem quantos entraram entre dois cadastros. Nunca reutilizado.
    // Chamar DENTRO da transação que cria o tenant.
    public static function proximoRegistro(): int
    {
        $max = (int) static::query()->max('data->registro');

        if ($max < 10000) {
            // Primeiro registro (ou legado pré-aleatorização): sorteia a base.
            return random_int(10000, 69999);
        }

        return $max + random_int(3, 17);
    }

    // Código de cliente legível e ÚNICO: slug + nº de registro
    // (ex.: "medhealth-38452"). O slug já é único; o registro garante que
    // nem renomeação/reuso de nome gera duplicata.
    public function getCodigoClienteAttribute(): ?string
    {
        $registro = $this->registro ?? null;
        if (! $registro) {
            return $this->slug ?? null;
        }

        return ($this->slug ?? 'clinica').'-'.str_pad((string) $registro, 5, '0', STR_PAD_LEFT);
    }
}
