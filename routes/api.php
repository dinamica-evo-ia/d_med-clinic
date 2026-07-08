<?php

use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\AttendantController;
use App\Http\Middleware\InitializeTenancyByApiToken;
use Illuminate\Support\Facades\Route;

/*
 * API de máquina (token por clínica). Consumida por integrações externas — hoje o
 * D_Agent Atende (atendente WhatsApp) pra ler disponibilidade e gravar consultas na
 * agenda do CRM, que é a fonte única da verdade. Ver docs/integracao-d-agent.md.
 *
 * Auth + tenant vêm do middleware InitializeTenancyByApiToken (Bearer dmk_...).
 * Rotas ficam sob prefixo /api (withRouting api) → /api/agent/*.
 */
Route::middleware(InitializeTenancyByApiToken::class)
    ->prefix('agent')
    ->group(function () {
        Route::get('medicos', [AgentController::class, 'medicos']);
        Route::get('disponibilidade', [AgentController::class, 'disponibilidade']);
        Route::post('pacientes', [AgentController::class, 'pacientes']);
        Route::post('agendamentos', [AgentController::class, 'agendamentos']);
    });

/*
 * Webhook de ENTRADA do WhatsApp (WADuck chama). Sem auth de sessão: o tenant vem na URL
 * e a validação é pelo webhook_token da clínica (query ?token= ou header x-webhook-token).
 * Fica no prefixo /api (isento de CSRF) e FORA do grupo de token do agent.
 */
Route::post('whatsapp/webhook/{tenant}', [AttendantController::class, 'webhook']);
