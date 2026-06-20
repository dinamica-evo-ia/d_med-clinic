<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AiSuggestionRequest;
use App\Models\Patient;
use App\Services\Ai\AiService;

class AiSuggestionController extends Controller
{
    public function __construct(
        private AiService $aiService
    ) {}

    public function suggest(AiSuggestionRequest $request)
    {
        $patient = Patient::findOrFail($request->patient_id);

        $result = $this->aiService->suggestForPatient(
            patient: $patient,
            diagnoses: $request->input('diagnoses', []),
            chiefComplaint: $request->input('chief_complaint'),
            hda: $request->input('hda'),
            medicines: $request->input('medicines'),
            allergies: $request->input('allergies'),
            physicalExamDescription: $request->input('physical_exam_description'),
            diagnosisNotes: $request->input('diagnosis_notes'),
        );

        return response()->json([
            'suggestions' => array_map(
                fn($s) => $s->toArray() + ['ai_suggested' => true],
                $result->suggestions
            ),
        ]);
    }
}
