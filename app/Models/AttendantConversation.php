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

    /**
     * ⚠️ SEM orderBy aqui de propósito. Ordenação embutida na relação NÃO é substituída por
     * ->latest()/->orderBy() no call site — é ANEXADA, e o primeiro critério vence. Com
     * ->orderBy('created_at') aqui, o ->latest('id') do AttendantAI::history() virava
     * "ORDER BY created_at ASC, id DESC" = do mais VELHO pro mais novo; o ->reverse()
     * seguinte então entregava a conversa INVERTIDA pra IA, que respondia sem nexo e
     * repetia a mesma pergunta pra sempre. Quem chama ordena explicitamente.
     */
    public function messages()
    {
        return $this->hasMany(AttendantMessage::class, 'conversation_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
