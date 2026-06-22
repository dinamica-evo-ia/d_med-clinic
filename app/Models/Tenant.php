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
}
