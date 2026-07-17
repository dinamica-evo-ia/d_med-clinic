<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Support\Plans;
use Illuminate\Http\Request;
use Inertia\Inertia;

/*
 * Edição dos planos do produto (preço, limites de médicos/staff, serviços) no Painel Master.
 * Fonte da verdade migrou de config/plans.php pra tabela plans (central).
 */
class PlanController extends Controller
{
    public function index()
    {
        return Inertia::render('Master/Planos/Index', [
            'plans' => Plan::orderBy('sort_order')->get()->map(fn ($p) => [
                'id' => $p->id,
                'key' => $p->key,
                'name' => $p->name,
                'description' => $p->description,
                'price' => $p->price !== null ? (float) $p->price : null,
                'doctors' => $p->doctors,
                'staff' => $p->staff,
                'web_sessions' => $p->web_sessions,
                'app_devices' => $p->app_devices,
                'features' => $p->features ?? [],
                'is_active' => (bool) $p->is_active,
            ]),
        ]);
    }

    public function update(Request $request, Plan $plan)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0|max:999999',
            'doctors' => 'nullable|integer|min:1|max:9999',  // null = ilimitado
            'staff' => 'nullable|integer|min:0|max:9999',    // null = ilimitado
            // Logins simultâneos POR USUÁRIO. min:1 — zero trancaria a pessoa pra fora.
            'web_sessions' => 'nullable|integer|min:1|max:99',
            'app_devices' => 'nullable|integer|min:1|max:99',
            'features' => 'nullable|array',
            'features.*' => 'string|max:255',
            'is_active' => 'boolean',
        ]);

        $plan->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'price' => $data['price'] ?? null,
            'doctors' => $data['doctors'] ?? null,
            'staff' => $data['staff'] ?? null,
            'web_sessions' => $data['web_sessions'] ?? null,
            'app_devices' => $data['app_devices'] ?? null,
            'features' => array_values(array_filter($data['features'] ?? [], fn ($f) => trim($f) !== '')),
            'is_active' => $data['is_active'] ?? true,
        ]);
        Plans::flush();

        return back()->with('success', "Plano \"{$plan->name}\" atualizado.");
    }
}
