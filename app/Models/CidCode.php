<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CidCode extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'code';

    protected $fillable = [
        'code',
        'description',
        'chapter',
        'category',
    ];

    public function scopeSearch($query, string $term)
    {
        return $query->where('code', 'like', "{$term}%")
            ->orWhere('description', 'like', "%{$term}%")
            ->orderByRaw("CASE WHEN code LIKE ? THEN 0 ELSE 1 END", ["{$term}%"])
            ->orderBy('code')
            ->limit(20);
    }
}
