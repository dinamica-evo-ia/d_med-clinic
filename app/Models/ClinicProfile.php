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

    protected $fillable = [
        'legal_name', 'nature', 'document',
        'email', 'phone', 'mobile', 'whatsapp',
        'zip', 'street', 'number', 'complement', 'district', 'city', 'state',
        'logo_path',
    ];

    /** A clínica tem exatamente um perfil — cria vazio na primeira visita. */
    public static function current(): self
    {
        return static::firstOrCreate([], ['nature' => 'pessoa_fisica']);
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null;
    }
}
