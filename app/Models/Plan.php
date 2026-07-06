<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

/*
 * Plano do produto (central DB). CentralConnection: como controllers rodam com tenant
 * ativo, força a conexão central (senão buscaria a tabela plans no banco da clínica).
 */
class Plan extends Model
{
    use CentralConnection;

    protected $fillable = [
        'key', 'name', 'description', 'price', 'doctors', 'staff', 'features', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'doctors' => 'integer',
            'staff' => 'integer',
            'features' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
