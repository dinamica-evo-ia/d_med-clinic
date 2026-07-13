<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AnamneseTemplate extends Model
{
    use HasUuids;

    protected $fillable = [
        'doctor_id',
        'name',
        'description',
        'fields',
        'is_default',
    ];

    protected $casts = [
        'fields' => 'array',
        'is_default' => 'boolean',
    ];

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    /**
     * Retorna o snapshot enxuto (só key + label) pra guardar em medical_records
     * ou pra passar pro EVO no JWT.
     */
    public function snapshot(): array
    {
        return array_map(
            fn ($f) => array_intersect_key($f, array_flip(['key', 'label', 'hint'])),
            $this->fields ?: []
        );
    }

    /**
     * Os 10 campos padrão que o EVO usa hoje (equivalente ao ANAMNESE_TOOL
     * hardcoded em lib/anamnese.ts do EVO). Usado como semente do primeiro
     * template de um médico novo.
     */
    public static function defaultFields(): array
    {
        return [
            ['key' => 'queixa_principal', 'label' => 'Queixa principal'],
            ['key' => 'historia_doenca_atual', 'label' => 'História da doença atual'],
            ['key' => 'antecedentes_pessoais', 'label' => 'Antecedentes pessoais'],
            ['key' => 'antecedentes_familiares', 'label' => 'Antecedentes familiares'],
            ['key' => 'medicamentos_em_uso', 'label' => 'Medicamentos em uso'],
            ['key' => 'alergias', 'label' => 'Alergias'],
            ['key' => 'habitos_de_vida', 'label' => 'Hábitos de vida'],
            ['key' => 'exame_fisico', 'label' => 'Exame físico'],
            ['key' => 'hipoteses_diagnosticas', 'label' => 'Hipóteses diagnósticas'],
            ['key' => 'conduta', 'label' => 'Conduta'],
        ];
    }
}
