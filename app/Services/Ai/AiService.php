<?php

namespace App\Services\Ai;

use App\Contracts\AiProvider;
use App\DataTransferObjects\SuggestionContext;
use App\DataTransferObjects\SuggestionResult;
use App\Models\Patient;

class AiService
{
    public function __construct(
        private AiProvider $provider
    ) {}

    public function suggestForPatient(
        Patient  $patient,
        array    $diagnoses,
        ?string  $chiefComplaint = null,
        ?string  $hda = null,
        ?string  $medicines = null,
        ?string  $allergies = null,
        ?string  $physicalExamDescription = null,
        ?string  $diagnosisNotes = null,
    ): SuggestionResult {
        $context = new SuggestionContext(
            age: $patient->birth_date?->age ?? 0,
            gender: $patient->gender,
            chiefComplaint: $chiefComplaint,
            hda: $hda,
            medicines: $medicines,
            allergies: $allergies,
            physicalExamDescription: $physicalExamDescription,
            diagnoses: $diagnoses,
            diagnosisNotes: $diagnosisNotes,
        );

        return $this->provider->suggestPrescriptions($context);
    }
}
