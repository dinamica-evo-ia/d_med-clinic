<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ExamRequestItem extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = ['exam_request_id', 'exam_type_id', 'observation'];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) $model->id = (string) Str::uuid();
        });
    }

    public function examRequest()
    {
        return $this->belongsTo(ExamRequest::class);
    }

    public function examType()
    {
        return $this->belongsTo(ExamType::class);
    }
}
