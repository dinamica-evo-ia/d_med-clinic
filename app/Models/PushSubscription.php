<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/**
 * Um aparelho inscrito pra receber Web Push. Mora no banco CENTRAL (é do usuário, não do tenant).
 *
 * ⚠️ CentralConnection é obrigatório: quase todo controller do CRM roda com um tenant ativo, e
 * sem forçar a conexão o Eloquent procuraria `push_subscriptions` no banco do tenant →
 * "no such table". Mesma armadilha do model User (#11 do handoff).
 */
class PushSubscription extends Model
{
    use CentralConnection;

    protected $fillable = ['user_id', 'endpoint', 'p256dh', 'auth', 'user_agent', 'last_sent_at'];

    protected function casts(): array
    {
        return ['last_sent_at' => 'datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
