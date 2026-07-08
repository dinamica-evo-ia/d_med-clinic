<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendantMessage extends Model
{
    protected $fillable = [
        'conversation_id', 'direction', 'author_type', 'body', 'external_id', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function conversation()
    {
        return $this->belongsTo(AttendantConversation::class, 'conversation_id');
    }
}
