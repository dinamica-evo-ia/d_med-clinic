<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ClinicaController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search');
        $status = $request->get('status');

        $tenants = Tenant::query()
            ->when($search, fn ($q) => $q->where('data', 'like', "%{$search}%"))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (Tenant $t) {
                $userIds = DB::table('tenant_user')->where('tenant_id', $t->id)->pluck('user_id');
                $rolesByUser = DB::table('tenant_user')->where('tenant_id', $t->id)->pluck('role', 'user_id');
                $doctors = $rolesByUser->filter(fn ($r) => $r === 'doctor')->count();
                $staff = $rolesByUser->filter(fn ($r) => in_array($r, ['admin', 'receptionist']))->count();

                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'slug' => $t->slug,
                    'email' => $t->email ?? null,
                    'document' => $t->document ?? null,
                    'plan' => $t->data['plan'] ?? 'solo',
                    'status' => $t->data['status'] ?? 'active',
                    'doctors' => $doctors,
                    'staff' => $staff,
                    'users' => $userIds->count(),
                    'created_at' => $t->created_at,
                ];
            })
            ->when($status, fn ($c) => $c->filter(fn ($t) => $t['status'] === $status)->values());

        return Inertia::render('Master/Clinicas/Index', [
            'tenants' => $tenants,
            'filters' => ['search' => $search, 'status' => $status],
            'plans' => config('plans.plans'),
            'statuses' => config('plans.statuses'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Master/Clinicas/Form', [
            'tenant' => null,
            'plans' => config('plans.plans'),
            'statuses' => config('plans.statuses'),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => ['required', 'string', 'max:60', 'regex:/^[a-z0-9-]+$/', Rule::unique('tenants', 'data->slug')],
            'email' => 'nullable|email|max:255',
            'document' => 'nullable|string|max:32',
            'phone' => 'nullable|string|max:32',
            'plan' => ['required', Rule::in(array_keys(config('plans.plans')))],
            'status' => ['required', Rule::in(array_keys(config('plans.statuses')))],
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|max:255',
            'admin_password' => 'required|string|min:8',
        ]);

        // 1) Cria o tenant central (linha em `tenants`)
        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => $data['name'],
            'slug' => $data['slug'],
            'email' => $data['email'],
            'document' => $data['document'],
            'phone' => $data['phone'],
            'plan' => $data['plan'],
            'status' => $data['status'],
        ]);
        $tenant->domains()->create(['domain' => $data['slug'].'.localhost']);

        // 2) Associa o admin (cria user se nao existir)
        $user = User::firstWhere('email', $data['admin_email']) ?? User::create([
            'name' => $data['admin_name'],
            'email' => $data['admin_email'],
            'password' => $data['admin_password'],
        ]);
        $tenant->users()->syncWithoutDetaching([
            $user->id => ['role' => 'admin', 'is_active' => true],
        ]);

        // 3) Cria o BANCO próprio da clínica (multi-DB) e roda as migrations de tenant nele.
        // Isso garante isolamento físico — clínica nova começa ZERADA.
        try {
            $tenant->database()->manager()->createDatabase($tenant);
        } catch (\Throwable $e) {
            // Se o DB já existe (raro pq UUID), seguimos
            Log::warning('createDatabase tenant: '.$e->getMessage());
        }

        Artisan::call('tenants:migrate', ['--tenants' => [$tenant->id], '--force' => true]);

        // Seed mínimo: só CID-10 + categorias financeiras (estruturais, não fictícios).
        // Pacientes/médicos/consultas o usuário cadastra ou importa.
        Artisan::call('tenants:seed', [
            '--tenants' => [$tenant->id],
            '--class' => \Database\Seeders\TenantSetupSeeder::class,
            '--force' => true,
        ]);

        return redirect()->route('master.clinicas.index')->with('success', "Clínica \"{$data['name']}\" criada (banco isolado, começa vazia).");
    }

    public function update(Request $request, Tenant $clinica)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'document' => 'nullable|string|max:32',
            'phone' => 'nullable|string|max:32',
            'plan' => ['required', Rule::in(array_keys(config('plans.plans')))],
            'status' => ['required', Rule::in(array_keys(config('plans.statuses')))],
        ]);

        $clinica->update($data);

        return back()->with('success', 'Clínica atualizada.');
    }

    public function destroy(Tenant $clinica)
    {
        // soft mark cancelado: nao apaga dados clinicos
        $clinica->update(['status' => 'cancelled']);

        return back()->with('success', 'Clínica cancelada.');
    }
}
