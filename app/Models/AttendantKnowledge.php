<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendantKnowledge extends Model
{
    protected $table = 'attendant_knowledge';

    protected $fillable = ['title', 'content', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
