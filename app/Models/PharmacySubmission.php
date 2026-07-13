<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

class PharmacySubmission extends Model
{
    use CentralConnection; // vive no banco central (intake global, não por clínica)

    protected $fillable = [
        'lab_name', 'responsible_name', 'contact_email', 'contact_phone',
        'file_path', 'file_name', 'authorized', 'notes', 'status',
    ];

    protected function casts(): array
    {
        return ['authorized' => 'boolean'];
    }
}
