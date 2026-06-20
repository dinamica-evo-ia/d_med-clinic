<?php

namespace App\DataTransferObjects;

readonly class PrescriptionSuggestion
{
    public function __construct(
        public string $medication,
        public string $dosage,
        public string $route,
        public string $frequency,
        public string $duration,
        public string $quantity,
        public string $notes = '',
    ) {}

    public function toArray(): array
    {
        return [
            'medication' => $this->medication,
            'dosage' => $this->dosage,
            'route' => $this->route,
            'frequency' => $this->frequency,
            'duration' => $this->duration,
            'quantity' => $this->quantity,
            'notes' => $this->notes,
        ];
    }
}
