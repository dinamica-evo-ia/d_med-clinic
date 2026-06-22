<?php

namespace App\Http\Controllers;

use App\Models\Allergy;
use App\Models\Patient;
use Illuminate\Http\Request;

class AllergyController extends Controller
{
    public function store(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'substance' => 'required|string|max:255',
            'reaction' => 'nullable|string|max:255',
            'severity' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $patient->allergies()->create($data);

        return back()->with('success', 'Alergia adicionada.');
    }

    public function destroy(Allergy $allergy)
    {
        $allergy->delete();

        return back()->with('success', 'Alergia removida.');
    }
}
