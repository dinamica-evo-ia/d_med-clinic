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
        'notes', 'photo_path', 'status', 'birthday_greeted_at',
    ];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'birthday_greeted_at' => 'date',
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

        // `saving` (não `creating`): tem que reescrever também quando o nome MUDA, senão a
        // busca passa a mentir depois da primeira edição.
        static::saving(function ($patient) {
            $patient->name_normalized = self::normalizeName($patient->name);
        });
    }

    /** Minúscula e sem acento — é assim que `name_normalized` guarda e que a busca compara. */
    public static function normalizeName(?string $name): string
    {
        return Str::lower(Str::ascii((string) $name));
    }

    /**
     * Busca por nome (sem acento), e-mail, telefone ou CPF. Usado na lista de Pacientes e no
     * PatientPicker — os dois precisam achar a mesma coisa.
     *
     * Nome vai pela coluna `name_normalized`: o LIKE do SQLite só é case-insensitive em ASCII,
     * então "MÁRCIO" não achava "márcio" nem "Marcio". Telefone e CPF comparam só os dígitos,
     * pra achar mesmo digitando com máscara (ou sem).
     */
    public function scopeSearch($query, ?string $termo)
    {
        $termo = trim((string) $termo);
        if ($termo === '') {
            return $query;
        }

        $nome = self::normalizeName($termo);
        $digitos = preg_replace('/\D/', '', $termo);

        return $query->where(function ($q) use ($nome, $termo, $digitos) {
            $q->where('name_normalized', 'like', "%{$nome}%")
                ->orWhere('email', 'like', "%{$termo}%");

            if ($digitos !== '') {
                $q->orWhereRaw(
                    "REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone,''), '.', ''), '-', ''), ' ', ''), '(', '') LIKE ?",
                    ["%{$digitos}%"]
                )->orWhereRaw(
                    "REPLACE(REPLACE(REPLACE(COALESCE(document,''), '.', ''), '-', ''), ' ', '') LIKE ?",
                    ["%{$digitos}%"]
                );
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
