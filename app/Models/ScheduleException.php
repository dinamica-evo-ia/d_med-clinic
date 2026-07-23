<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Exceção pontual da agenda — "neste dia é diferente do padrão".
 *
 * kind = 'closed' → não atende. `periods` null fecha o dia inteiro; com períodos,
 *                    fecha só aqueles trechos (ex.: sai mais cedo na sexta).
 * kind = 'open'   → atende NESTES períodos, mesmo que o dia da semana esteja
 *                    desligado na regra padrão.
 *
 * doctor_id null = vale pra clínica inteira (feriado).
 * Quem aplica isso na prática é App\Support\DoctorSchedule — assim a exceção
 * vale de uma vez no calendário, na validação do agendamento e nos horários que
 * a IA oferece no WhatsApp, sem cada um ter que lembrar de consultar a tabela.
 */
class ScheduleException extends Model
{
    protected $fillable = ['doctor_id', 'date', 'kind', 'periods', 'reason', 'created_by'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'periods' => 'array',
            'id' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($e) {
            if (empty($e->id)) {
                $e->id = (string) Str::uuid();
            }
        });
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    /** As que valem pra este médico (as dele + as da clínica toda) num intervalo de datas. */
    public function scopeParaMedico($q, ?string $doctorId)
    {
        return $q->where(function ($x) use ($doctorId) {
            $x->whereNull('doctor_id');
            if ($doctorId) {
                $x->orWhere('doctor_id', $doctorId);
            }
        });
    }

    /** "25/07 — fechado o dia todo" / "26/07 — 08:00–12:00" (pra UI e logs). */
    public function resumo(): string
    {
        $dia = $this->date->format('d/m');
        if ($this->kind === 'closed' && empty($this->periods)) {
            return "{$dia} — fechado o dia todo";
        }
        $faixas = implode(', ', array_map(fn ($p) => "{$p['start']}–{$p['end']}", $this->periods ?? []));

        return $this->kind === 'open' ? "{$dia} — aberto {$faixas}" : "{$dia} — fechado {$faixas}";
    }
}
