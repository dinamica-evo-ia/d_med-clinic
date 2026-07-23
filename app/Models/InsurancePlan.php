<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Convênio aceito pela clínica (Configurações → Convênios).
 *
 * `all_doctors = true` (padrão) → todos os médicos atendem. Quando é false, valem só os
 * médicos do pivot `insurance_plan_doctor` — o caso do cardiologista que atende a Unimed
 * mas o dermatologista da mesma clínica não.
 */
class InsurancePlan extends Model
{
    // ⚠️ Sem isto o Eloquent sobrescreve o UUID pelo rowid do SQLite depois do INSERT, e o
    // model em memória fica com id=2 — o pivot dos médicos gravava esse 2 e o vínculo sumia.
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['name', 'notes', 'all_doctors', 'is_active'];

    protected function casts(): array
    {
        return [
            'all_doctors' => 'boolean',
            'is_active' => 'boolean',
            'id' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($p) {
            if (empty($p->id)) {
                $p->id = (string) Str::uuid();
            }
        });
    }

    public function doctors()
    {
        return $this->belongsToMany(Doctor::class, 'insurance_plan_doctor');
    }

    public function scopeAtivos($q)
    {
        return $q->where('is_active', true);
    }

    /**
     * Nomes dos convênios que ESTE médico atende (ou da clínica toda, sem médico).
     * É esta lista que vira o <select> do agendamento e o enum da ferramenta da IA —
     * as duas pontas leem daqui pra não divergirem.
     */
    public static function aceitosPor(?string $doctorId): array
    {
        return static::ativos()
            ->when($doctorId, fn ($q) => $q->where(fn ($x) => $x
                ->where('all_doctors', true)
                ->orWhereHas('doctors', fn ($d) => $d->where('doctors.id', $doctorId))))
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }

    /** Confere um nome vindo de fora (IA, importação) contra a lista, ignorando caixa/acento. */
    public static function casar(?string $nome, ?string $doctorId): ?string
    {
        $nome = trim((string) $nome);
        if ($nome === '') {
            return null;
        }
        $chave = fn ($s) => mb_strtolower(preg_replace('/[^a-z0-9]/i', '', \Illuminate\Support\Str::ascii($s)));

        foreach (static::aceitosPor($doctorId) as $aceito) {
            if ($chave($aceito) === $chave($nome)) {
                return $aceito; // devolve com a grafia do cadastro, não a que o paciente digitou
            }
        }

        return null;
    }
}
