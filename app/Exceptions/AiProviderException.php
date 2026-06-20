<?php

namespace App\Exceptions;

use Exception;

class AiProviderException extends Exception
{
    public function render(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'message' => 'Falha ao obter sugestões de prescrição.',
            'error' => $this->getMessage(),
        ], $this->getCode() ?: 500);
    }
}
