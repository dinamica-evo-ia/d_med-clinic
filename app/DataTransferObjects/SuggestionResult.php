<?php

namespace App\DataTransferObjects;

readonly class SuggestionResult
{
    /** @param PrescriptionSuggestion[] $suggestions */
    public function __construct(
        public array  $suggestions,
        public string $rawResponse,
    ) {}
}
