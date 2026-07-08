<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Patient extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'name', 'social_name', 'email', 'phone', 'whatsapp', 'document', 'is_foreign',
        'rg', 'rg_issuer', 'rg_state', 'rg_issued_at', 'birth_date', 'gender', 'marital_status',
        'mother_name', 'father_name', 'spouse_name', 'address', 'insurance', 'emergency_contact',
        'notes', 'photo_path', 'status',
    ];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'rg_issued_at' => 'date',
            'is_foreign' => 'boolean',
            'address' => 'array',
            'insurance' => 'array',
            'emergency_contact' => 'array',
            'id' => 'string',
        ];
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null;
    }

    protected static function booted(): void
    {
        static::creating(function ($patient) {
            if (empty($patient->id)) {
                $patient->id = (string) Str::uuid();
            }
        });
    }

    /**
     * Chave estável de deduplicação: CPF (só dígitos) > nome+nascimento > nome+telefone > nome.
     * Fonte única usada tanto na importação (evitar duplicar) quanto na limpeza (patients:dedupe).
     */
    public static function dedupeKey(?string $name, ?string $document, ?string $birthDate, ?string $phone): string
    {
        $doc = preg_replace('/\D/', '', (string) $document);
        if ($doc !== '') return 'doc:'.$doc;

        $nm = Str::lower(Str::squish((string) $name));
        if (! empty($birthDate)) return 'nmdob:'.$nm.'|'.$birthDate;

        $ph = preg_replace('/\D/', '', (string) $phone);
        if ($ph !== '') return 'nmph:'.$nm.'|'.$ph;

        return 'nm:'.$nm;
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function allergies()
    {
        return $this->hasMany(Allergy::class)->latest();
    }

    public function bodyCompositions()
    {
        return $this->hasMany(BodyComposition::class)->orderBy('measured_at', 'desc');
    }
}
