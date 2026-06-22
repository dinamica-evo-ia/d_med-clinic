<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BodyComposition extends Model
{
    protected $fillable = ['patient_id', 'measured_at', 'weight', 'height', 'bmi', 'body_fat', 'lean_mass', 'waist', 'hip', 'notes'];

    protected $casts = ['measured_at' => 'date'];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
