<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ExamRequest extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'patient_id', 'doctor_id', 'status',
        'notes', 'requested_date', 'performed_date', 'result',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'requested_date' => 'date:Y-m-d',
            'performed_date' => 'date:Y-m-d',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) $model->id = (string) Str::uuid();
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

    public function items()
    {
        return $this->hasMany(ExamRequestItem::class);
    }
}
