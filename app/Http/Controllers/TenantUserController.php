<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TenantUserController extends Controller
{
    /** Acessos extras que o médico/admin pode liberar pra uma secretária, além do papel padrão. */
    public const GRANTABLE_PERMISSIONS = ['financeiro'];

    /**
     * tenant_user vive só no banco central — mas este controller roda com um tenant já
     * ativo (dentro de tenancy.by_user), onde a conexão padrão já foi trocada pra do
     * tenant. DB::table() não sabe disso (só os models sabem, via getConnectionName()),
     * então toda query crua aqui precisa apontar pra conexão central explicitamente.
     */
    private function tenantUserTable()
    {
        return DB::connection(config('tenancy.database.central_connection'))->table('tenant_user');
    }

    /** A lista mudou pra aba Usuários de /account/clinica (menu do avatar). */
    public function index()
    {
        return redirect()->route('account.clinic', ['tab' => 'usuarios']);
    }

    public function store(Request $request)
    {
        $tenantId = tenant()->id;

        $centralConnection = config('tenancy.database.central_connection');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|max:255|unique:{$centralConnection}.users,email",
            'password' => 'required|string|min:6',
            'role' => ['required', Rule::in(['admin', 'doctor', 'receptionist'])],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => [Rule::in(self::GRANTABLE_PERMISSIONS)],
        ]);
        // só faz sentido pra secretária — admin/doctor já têm tudo por papel
        $permissions = $validated['role'] === 'receptionist' ? ($validated['permissions'] ?? []) : [];

        // Limite por plano (medicos vs staff sao seats separados)
        $planKey = tenant()->plan ?? config('plans.default');
        $plan = \App\Support\Plans::get($planKey);
        if ($plan) {
            $isDoctor = $validated['role'] === 'doctor';
            $limitKey = $isDoctor ? 'doctors' : 'staff';
            $limit = $plan[$limitKey] ?? null;
            if ($limit !== null) {
                $rolesInLimit = $isDoctor ? ['doctor'] : ['admin', 'receptionist'];
                $current = $this->tenantUserTable()
                    ->where('tenant_id', $tenantId)
                    ->whereIn('role', $rolesInLimit)
                    ->where('is_active', true)
                    ->count();
                if ($current >= $limit) {
                    $label = $isDoctor ? 'médicos' : 'staff (admin/secretária)';
                    return back()->withErrors([
                        'role' => "Plano {$plan['name']} permite no máximo {$limit} {$label}. Faça upgrade para adicionar mais.",
                    ])->withInput();
                }
            }
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $this->tenantUserTable()->insert([
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'role' => $validated['role'],
            'permissions' => json_encode($permissions),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Usuário adicionado com sucesso.');
    }

    public function update(Request $request, User $user)
    {
        $tenantId = tenant()->id;

        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'doctor', 'receptionist'])],
            'is_active' => 'boolean',
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => [Rule::in(self::GRANTABLE_PERMISSIONS)],
        ]);
        $permissions = $validated['role'] === 'receptionist' ? ($validated['permissions'] ?? []) : [];

        $exists = $this->tenantUserTable()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->exists();

        if (!$exists) {
            return back()->with('error', 'Usuário não pertence a esta clínica.');
        }

        $this->tenantUserTable()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->update([
                'role' => $validated['role'],
                'permissions' => json_encode($permissions),
                'is_active' => $validated['is_active'] ?? true,
                'updated_at' => now(),
            ]);

        return back()->with('success', 'Usuário atualizado com sucesso.');
    }

    public function destroy(User $user)
    {
        $tenantId = tenant()->id;

        $this->tenantUserTable()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->delete();

        return back()->with('success', 'Usuário removido da clínica.');
    }
}
