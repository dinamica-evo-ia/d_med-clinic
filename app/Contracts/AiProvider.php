<?php

namespace App\Contracts;

use App\DataTransferObjects\SuggestionContext;
use App\DataTransferObjects\SuggestionResult;

interface AiProvider
{
    public function suggestPrescriptions(SuggestionContext $context): SuggestionResult;
}
