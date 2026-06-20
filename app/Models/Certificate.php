<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Certificate extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'patient_id', 'doctor_id', 'type', 'cid_code',
        'description', 'days', 'valid_from', 'valid_until',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'days' => 'integer',
            'valid_from' => 'date:Y-m-d',
            'valid_until' => 'date:Y-m-d',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($certificate) {
            if (empty($certificate->id)) {
                $certificate->id = (string) Str::uuid();
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
