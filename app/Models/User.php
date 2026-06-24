<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, CentralConnection;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'is_master',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'id' => 'string',
            'is_master' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($user) {
            if (empty($user->id)) {
                $user->id = (string) Str::uuid();
            }
        });
    }

    public function tenants()
    {
        return $this->belongsToMany(Tenant::class, 'tenant_user')
            ->withPivot('role', 'is_active', 'permissions')
            ->withTimestamps();
    }

    public function currentTenant()
    {
        return $this->belongsToMany(Tenant::class, 'tenant_user')
            ->withPivot('role', 'is_active', 'permissions')
            ->wherePivot('is_active', true)
            ->first();
    }

    /** Pivot (tenant_user) deste usuário no tenant ativo, ou null se não houver tenant. */
    public function currentPivot(): ?object
    {
        if (! tenant()) return null;

        return $this->tenants()
            ->where('tenant_id', tenant()->id)
            ->first()?->pivot;
    }

    /** Papel deste usuário no tenant ativo (admin/doctor/receptionist), ou null se não houver tenant. */
    public function currentRole(): ?string
    {
        return $this->currentPivot()?->role;
    }

    /**
     * Acesso extra liberado pelo médico/admin pra uma secretária (ex.: 'financeiro').
     * Admin/doctor já têm acesso total por papel — a permissão só importa pra receptionist.
     */
    public function hasPermission(string $key): bool
    {
        $pivot = $this->currentPivot();
        if (! $pivot) return false;
        if (in_array($pivot->role, ['admin', 'doctor'], true)) return true;

        $perms = $pivot->permissions;
        if (is_string($perms)) $perms = json_decode($perms, true);

        return in_array($key, $perms ?? [], true);
    }
}
