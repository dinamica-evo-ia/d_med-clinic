<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Allergy extends Model
{
    protected $fillable = ['patient_id', 'substance', 'reaction', 'severity', 'notes'];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
