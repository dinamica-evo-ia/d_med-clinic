<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendantConversation extends Model
{
    protected $fillable = [
        'patient_id', 'contact_phone', 'contact_name', 'status', 'assigned_to', 'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function messages()
    {
        return $this->hasMany(AttendantMessage::class, 'conversation_id')->orderBy('created_at');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
