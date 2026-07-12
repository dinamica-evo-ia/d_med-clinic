<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MedicalRecord extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'patient_id', 'doctor_id', 'appointment_id',
        'chief_complaint',
        'anamnesis', 'transcricao', 'physical_exam', 'diagnosis',
        'prescriptions', 'exam_requests', 'certificates',
        'notes', 'origem', 'type', 'anamnese_template_snapshot', 'acompanhante_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'anamnesis' => 'array',
            'transcricao' => 'array',
            'physical_exam' => 'array',
            'diagnosis' => 'array',
            'prescriptions' => 'array',
            'exam_requests' => 'array',
            'certificates' => 'array',
            'anamnese_template_snapshot' => 'array',
            'acompanhante_snapshot' => 'array',
            'id' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($record) {
            if (empty($record->id)) {
                $record->id = (string) Str::uuid();
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

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
}
