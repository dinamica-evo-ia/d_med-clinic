<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Doctor extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'user_id',
        'name', 'email', 'phone', 'specialty', 'license_number', 'license_state', 'rqe',
        'document', 'bio', 'schedule', 'print_settings', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'schedule' => 'array',
            'print_settings' => 'array',
            'is_active' => 'boolean',
            'id' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($doctor) {
            if (empty($doctor->id)) {
                $doctor->id = (string) Str::uuid();
            }
        });
    }

    /**
     * A ficha de médico do usuário logado, ou null se ele não for médico nesta clínica.
     *
     * Resolve por `user_id` (vínculo explícito) e só cai no e-mail como retrocompatibilidade,
     * pra ficha antiga que ainda não foi vinculada. Use SEMPRE isto — nunca
     * `Doctor::where('email', $user->email)` solto: se o e-mail do login divergir do e-mail da
     * ficha, o médico deixa de ser reconhecido EM SILÊNCIO (perde Studio Med, perde push).
     *
     * Quando acha pelo e-mail, grava o user_id — o vínculo se conserta sozinho no primeiro uso.
     */
    public static function paraUsuario(?User $user): ?self
    {
        if (! $user) {
            return null;
        }

        if ($doc = static::where('user_id', $user->id)->first()) {
            return $doc;
        }

        $doc = $user->email
            ? static::whereRaw('LOWER(email) = ?', [mb_strtolower(trim($user->email))])->first()
            : null;

        if ($doc && ! $doc->user_id) {
            $doc->forceFill(['user_id' => $user->id])->save();
        }

        return $doc;
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }
}
