<?php

namespace App\Http\Controllers;

use App\Models\AttendantConversation;
use App\Models\AttendantSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

/*
 * "D_Med Atende" — painel do atendente de WhatsApp. Acesso só admin/secretária (médico
 * não vê, pra manter o CRM clean). Fase 1: liga/desliga + config do bot. WhatsApp (WADuck)
 * e IA (Claude) entram nas fases seguintes.
 */
class AttendantController extends Controller
{
    public function index()
    {
        $s = AttendantSetting::current();

        return Inertia::render('Attendant/Index', [
            'settings' => [
                'enabled' => $s->enabled,
                'bot_name' => $s->bot_name,
                'persona' => $s->persona,
                'tone' => $s->tone,
                'welcome_message' => $s->welcome_message,
                'offhours_message' => $s->offhours_message,
                'autonomy' => $s->autonomy,
            ],
            'whatsappConnected' => $s->isWhatsappConnected(),
            'stats' => [
                'conversations' => AttendantConversation::count(),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => 'boolean',
            'bot_name' => 'nullable|string|max:80',
            'persona' => 'nullable|string|max:2000',
            'tone' => 'nullable|string|max:120',
            'welcome_message' => 'nullable|string|max:1000',
            'offhours_message' => 'nullable|string|max:1000',
            'autonomy' => 'nullable|in:suggest,auto_reply,auto_schedule',
        ]);

        $s = AttendantSetting::current();
        $s->update([
            'enabled' => $data['enabled'] ?? $s->enabled,
            'bot_name' => $data['bot_name'] ?? $s->bot_name,
            'persona' => $data['persona'] ?? null,
            'tone' => $data['tone'] ?? null,
            'welcome_message' => $data['welcome_message'] ?? null,
            'offhours_message' => $data['offhours_message'] ?? null,
            'autonomy' => $data['autonomy'] ?? $s->autonomy,
        ]);

        return back()->with('success', 'Configurações do atendente salvas.');
    }
}
