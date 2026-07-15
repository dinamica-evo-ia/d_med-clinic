<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/** Resultado de exame (o que volta do laboratório). Os laudos ficam em `attachments`. */
class ExamResult extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'patient_id', 'doctor_id', 'exam_request_id',
        'title', 'description', 'result_date',
    ];

    protected function casts(): array
    {
        return [
            'result_date' => 'date',
            'id' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($m) {
            if (empty($m->id)) {
                $m->id = (string) Str::uuid();
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

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}
