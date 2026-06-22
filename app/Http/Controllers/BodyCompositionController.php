<?php

namespace App\Http\Controllers;

use App\Models\BodyComposition;
use App\Models\Patient;
use Illuminate\Http\Request;

class BodyCompositionController extends Controller
{
    public function store(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'measured_at' => 'required|date',
            'weight' => 'nullable|numeric',
            'height' => 'nullable|numeric',
            'body_fat' => 'nullable|numeric',
            'lean_mass' => 'nullable|numeric',
            'waist' => 'nullable|numeric',
            'hip' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        // IMC = peso / (altura_m^2)
        if (! empty($data['weight']) && ! empty($data['height'])) {
            $m = $data['height'] / 100;
            if ($m > 0) {
                $data['bmi'] = round($data['weight'] / ($m * $m), 2);
            }
        }

        $patient->bodyCompositions()->create($data);

        return back()->with('success', 'Avaliação registrada.');
    }

    public function destroy(BodyComposition $bodyComposition)
    {
        $bodyComposition->delete();

        return back()->with('success', 'Avaliação removida.');
    }
}
