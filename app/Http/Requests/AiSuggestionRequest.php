<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AiSuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id' => 'required|string|exists:patients,id',
            'chief_complaint' => 'nullable|string|max:2000',
            'hda' => 'nullable|string|max:5000',
            'medicines' => 'nullable|string|max:2000',
            'allergies' => 'nullable|string|max:1000',
            'physical_exam_description' => 'nullable|string|max:5000',
            'diagnosis_notes' => 'nullable|string|max:2000',
            'diagnoses' => 'nullable|array',
            'diagnoses.*.code' => 'required_with:diagnoses|string|max:20',
            'diagnoses.*.description' => 'required_with:diagnoses|string|max:500',
        ];
    }
}
