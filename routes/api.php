<?php

use App\Http\Controllers\Api\AgentController;
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
