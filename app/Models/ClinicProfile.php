<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Perfil da clínica — linha única no banco do tenant. Use sempre ClinicProfile::current().
 */
class ClinicProfile extends Model
{
    public const NATURES = ['pessoa_fisica', 'pessoa_juridica'];

    public const STATES = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
        'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
    ];

    /** Formas de pagamento possíveis. A clínica escolhe quais aceita. */
    public const PAYMENT_TYPES = ['particular', 'convenio'];

    protected $fillable = [
        'legal_name', 'nature', 'document',
        'email', 'phone', 'mobile', 'whatsapp',
        'zip', 'street', 'number', 'complement', 'district', 'city', 'state',
        'logo_path', 'payment_types',
    ];

    protected function casts(): array
    {
        return ['payment_types' => 'array'];
    }

    /** A clínica tem exatamente um perfil — cria vazio na primeira visita. */
    public static function current(): self
    {
        return static::firstOrCreate([], ['nature' => 'pessoa_fisica']);
    }

    /**
     * O que a clínica aceita. Nulo/vazio = as duas (comportamento de quem nunca configurou).
     * Nunca devolve lista vazia: sem forma de pagamento não dá pra marcar nada.
     */
    public function aceita(): array
    {
        $t = array_values(array_intersect(self::PAYMENT_TYPES, (array) ($this->payment_types ?: [])));

        return $t ?: self::PAYMENT_TYPES;
    }

    /** Só uma forma? Então não há o que perguntar — nem pra IA, nem na tela. */
    public function pagamentoUnico(): ?string
    {
        $t = $this->aceita();

        return count($t) === 1 ? $t[0] : null;
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null;
    }
}
