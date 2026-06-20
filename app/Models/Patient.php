<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Patient extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'name', 'email', 'phone', 'document', 'birth_date',
        'gender', 'address', 'insurance', 'emergency_contact', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'address' => 'array',
            'insurance' => 'array',
            'emergency_contact' => 'array',
            'id' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($patient) {
            if (empty($patient->id)) {
                $patient->id = (string) Str::uuid();
            }
        });
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
}
