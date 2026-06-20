<?php

namespace App\DataTransferObjects;

readonly class SuggestionContext
{
    public function __construct(
        public int     $age,
        public ?string $gender,
        public ?string $chiefComplaint,
        public ?string $hda,
        public ?string $medicines,
        public ?string $allergies,
        public ?string $physicalExamDescription,
        public array   $diagnoses,
        public ?string $diagnosisNotes,
    ) {}
}
