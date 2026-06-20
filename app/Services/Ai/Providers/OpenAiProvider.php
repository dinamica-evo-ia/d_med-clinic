<?php

namespace App\Services\Ai\Providers;

use App\Contracts\AiProvider;
use App\DataTransferObjects\PrescriptionSuggestion;
use App\DataTransferObjects\SuggestionContext;
use App\DataTransferObjects\SuggestionResult;
use App\Exceptions\AiProviderException;
use Illuminate\Support\Facades\Http;

class OpenAiProvider implements AiProvider
{
    public function suggestPrescriptions(SuggestionContext $context): SuggestionResult
    {
        $response = Http::timeout(30)
            ->withToken(config('services.ai.api_key'))
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => config('services.ai.model', 'gpt-4o-mini'),
                'messages' => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    ['role' => 'user', 'content' => $this->buildUserMessage($context)],
                ],
                'temperature' => 0.3,
                'response_format' => ['type' => 'json_object'],
            ]);

        if ($response->failed()) {
            throw new AiProviderException(
                'OpenAI API error: ' . $response->body(),
                $response->status()
            );
        }

        $body = $response->json();
        $content = $body['choices'][0]['message']['content'] ?? '{}';
        $parsed = json_decode($content, true);

        $suggestions = array_map(
            fn(array $item) => new PrescriptionSuggestion(...$item),
            $parsed['suggestions'] ?? []
        );

        return new SuggestionResult($suggestions, $content);
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
Você é um assistente médico especializado em sugerir prescrições.
Responda APENAS em JSON no formato {"suggestions": [...]}.
Cada sugestão DEVE conter: medication, dosage, route, frequency, duration, quantity, notes.
Considere sempre: contraindicações, interações medicamentosas, alergias do paciente, duração do tratamento.
Use a via de administração apropriada para cada medicamento (oral, sublingual, topico, inalatorio, intramuscular, endovenoso, subcutaneo, retal, otologico, oftalmico).
Sugira de 1 a 4 medicamentos. Nunca invente dados — se faltar contexto, indique nas observações.
PROMPT;
    }

    private function buildUserMessage(SuggestionContext $context): string
    {
        return json_encode([
            'paciente' => [
                'idade' => $context->age,
                'sexo' => $context->gender,
                'alergias' => $context->allergies,
                'medicamentos_em_uso' => $context->medicines,
            ],
            'queixa_principal' => $context->chiefComplaint,
            'hda' => $context->hda,
            'exame_fisico' => $context->physicalExamDescription,
            'diagnosticos' => $context->diagnoses,
            'observacoes_diagnostico' => $context->diagnosisNotes,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}
