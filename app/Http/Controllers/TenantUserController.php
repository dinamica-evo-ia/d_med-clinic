<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TenantUserController extends Controller
{
    public function index()
    {
        $tenantId = tenant()->id;

        $users = User::whereHas('tenants', fn($q) => $q->where('tenant_id', $tenantId))
            ->with(['tenants' => fn($q) => $q->where('tenant_id', $tenantId)])
            ->orderBy('name')
            ->paginate(15)
            ->through(fn($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->tenants->first()?->pivot->role ?? 'doctor',
                'is_active' => $user->tenants->first()?->pivot->is_active ?? true,
            ]);

        return Inertia::render('Users/Index', [
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $tenantId = tenant()->id;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => ['required', Rule::in(['admin', 'doctor', 'receptionist'])],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        DB::table('tenant_user')->insert([
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'role' => $validated['role'],
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->route('users.index')
            ->with('success', 'Usuário adicionado com sucesso.');
    }

    public function update(Request $request, User $user)
    {
        $tenantId = tenant()->id;

        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'doctor', 'receptionist'])],
            'is_active' => 'boolean',
        ]);

        $exists = DB::table('tenant_user')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->exists();

        if (!$exists) {
            return redirect()->route('users.index')
                ->with('error', 'Usuário não pertence a esta clínica.');
        }

        DB::table('tenant_user')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->update([
                'role' => $validated['role'],
                'is_active' => $validated['is_active'] ?? true,
                'updated_at' => now(),
            ]);

        return redirect()->route('users.index')
            ->with('success', 'Usuário atualizado com sucesso.');
    }

    public function destroy(User $user)
    {
        $tenantId = tenant()->id;

        DB::table('tenant_user')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->delete();

        return redirect()->route('users.index')
            ->with('success', 'Usuário removido da clínica.');
    }
}
