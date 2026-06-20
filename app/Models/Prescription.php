<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Prescription extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'patient_id', 'doctor_id', 'medicines', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'medicines' => 'array',
            'id' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($prescription) {
            if (empty($prescription->id)) {
                $prescription->id = (string) Str::uuid();
            }
        });
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
