<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
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
                    'codigo' => $t->codigo_cliente,
                    'registro' => $t->registro ?? null,
                    'email' => $t->email ?? null,
                    'document' => $t->document ?? null,
                    'plan' => $t->plan ?? 'solo',
                    'status' => $t->status ?? 'active',
                    'trial_ends_at' => $t->trial_ends_at ?? null,
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
            'plans' => \App\Support\Plans::all(),
            'statuses' => config('plans.statuses'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Master/Clinicas/Form', [
            'tenant' => null,
            'plans' => \App\Support\Plans::all(),
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
            'plan' => ['required', Rule::in(\App\Support\Plans::keys())],
            'status' => ['required', Rule::in(array_keys(config('plans.statuses')))],
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|max:255',
            'admin_password' => 'required|string|min:8',
            'create_doctor' => 'sometimes|boolean',
            'doctor_crm' => 'nullable|string|max:32|required_if:create_doctor,true',
            'doctor_specialty' => 'nullable|string|max:120',
        ]);

        // Em plano Solo, faz sentido criar a ficha do médico no mesmo passo
        $createDoctor = ! empty($data['create_doctor']) || $data['plan'] === 'solo';

        // Transação central + cleanup explícito do DB tenant em caso de falha.
        $createdUserHere = false;
        $tenant = null;
        $tenantDbFile = null;

        try {
            DB::transaction(function () use ($data, &$tenant, &$createdUserHere) {
                // 1) Cria o tenant
                $tenant = Tenant::create([
                    'id' => (string) Str::uuid(),
                    'name' => $data['name'],
                    'slug' => $data['slug'],
                    'registro' => Tenant::proximoRegistro(),
                    'email' => $data['email'],
                    'document' => $data['document'],
                    'phone' => $data['phone'],
                    'plan' => $data['plan'],
                    'status' => $data['status'],
                ]);
                $tenant->domains()->create(['domain' => $data['slug'].'.localhost']);

                // 2) Associa admin (cria user se não existir)
                $user = User::firstWhere('email', $data['admin_email']);
                if (! $user) {
                    $user = User::create([
                        'name' => $data['admin_name'],
                        'email' => $data['admin_email'],
                        'password' => $data['admin_password'],
                    ]);
                    $createdUserHere = true;
                }
                $tenant->users()->syncWithoutDetaching([
                    $user->id => ['role' => 'admin', 'is_active' => true],
                ]);
            });

            // 3) Cria o BANCO próprio da clínica (multi-DB)
            $tenant->database()->manager()->createDatabase($tenant);
            $tenantDbFile = database_path($tenant->database()->getName());

            // 4) Migrations + seed mínimo (CID + categorias)
            Artisan::call('tenants:migrate', ['--tenants' => [$tenant->id], '--force' => true]);
            Artisan::call('tenants:seed', [
                '--tenants' => [$tenant->id],
                '--class' => \Database\Seeders\TenantSetupSeeder::class,
                '--force' => true,
            ]);

            // 5) (Opcional) Cria a ficha do médico junto — inicializa o tenancy pra escrever no DB da clínica
            if ($createDoctor) {
                tenancy()->initialize($tenant);
                try {
                    Doctor::create([
                        'name' => $data['admin_name'],
                        'email' => $data['admin_email'],
                        'phone' => $data['phone'] ?? null,
                        'license_number' => $data['doctor_crm'] ?? null,
                        'specialty' => $data['doctor_specialty'] ?? null,
                        'is_active' => true,
                    ]);
                } finally {
                    tenancy()->end();
                }
            }

            $msg = "Clínica \"{$data['name']}\" criada (banco isolado, começa vazia).";
            if ($createDoctor) $msg .= ' Ficha do médico cadastrada.';

            return redirect()->route('master.clinicas.index')->with('success', $msg);
        } catch (\Throwable $e) {
            // Defensivo: garante que o tenancy não fica iniciado se algo explodiu no meio
            if (tenancy()->initialized) tenancy()->end();

            // Rollback: apaga arquivo do tenant DB + user (se criamos nós) — a transação central já reverteu o resto
            if ($tenantDbFile && file_exists($tenantDbFile)) @unlink($tenantDbFile);
            if ($createdUserHere) User::where('email', $data['admin_email'])->delete();
            if ($tenant) {
                DB::table('domains')->where('tenant_id', $tenant->id)->delete();
                DB::table('tenant_user')->where('tenant_id', $tenant->id)->delete();
                DB::table('tenants')->where('id', $tenant->id)->delete();
            }
            Log::error('ClinicaController@store falhou: '.$e->getMessage());
            return back()->withInput()->withErrors(['name' => 'Erro ao criar clínica: '.$e->getMessage()]);
        }
    }

    public function update(Request $request, Tenant $clinica)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'document' => 'nullable|string|max:32',
            'phone' => 'nullable|string|max:32',
            'plan' => ['required', Rule::in(\App\Support\Plans::keys())],
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

    /**
     * APAGA em definitivo: clínica + banco do tenant + vínculos + usuários que pertenciam
     * SÓ a essa clínica. Nunca apaga um master. Irreversível — pra limpar cadastros de teste.
     */
    public function forceDestroy(Tenant $clinica)
    {
        $central = config('tenancy.database.central_connection');
        $id = $clinica->id;

        $userIds = DB::connection($central)->table('tenant_user')->where('tenant_id', $id)->pluck('user_id');
        $dbFile = database_path($clinica->database()->getName());
        $name = $clinica->name;

        DB::connection($central)->table('tenant_user')->where('tenant_id', $id)->delete();

        // apaga só usuários que não estão ligados a NENHUMA outra clínica (e nunca um master)
        foreach ($userIds as $uid) {
            $aindaLigado = DB::connection($central)->table('tenant_user')->where('user_id', $uid)->exists();
            if (! $aindaLigado) {
                $u = User::find($uid);
                if ($u && ! $u->is_master) {
                    $u->delete();
                }
            }
        }

        DB::connection($central)->table('domains')->where('tenant_id', $id)->delete();
        DB::connection($central)->table('tenants')->where('id', $id)->delete();

        if ($dbFile && file_exists($dbFile)) {
            @unlink($dbFile);
        }

        Log::info("Master apagou em definitivo a clínica {$name} ({$id}).");

        return back()->with('success', "Clínica \"{$name}\" e a conta foram apagadas em definitivo.");
    }

    /** JSON: usuários (logins) de uma clínica — usado pelo modal de senha do painel master. */
    public function users(Tenant $clinica)
    {
        $central = config('tenancy.database.central_connection');
        $users = DB::connection($central)->table('tenant_user')
            ->join('users', 'users.id', '=', 'tenant_user.user_id')
            ->where('tenant_user.tenant_id', $clinica->id)
            ->orderBy('tenant_user.role')
            ->get(['users.id', 'users.name', 'users.email', 'tenant_user.role', 'tenant_user.is_active']);

        return response()->json(['users' => $users]);
    }

    /** Redefine a senha de um usuário (login) de uma clínica. */
    public function resetUserPassword(Request $request, Tenant $clinica, User $user)
    {
        $central = config('tenancy.database.central_connection');
        $belongs = DB::connection($central)->table('tenant_user')
            ->where('tenant_id', $clinica->id)->where('user_id', $user->id)->exists();
        abort_unless($belongs, 404);

        $data = $request->validate(['password' => ['required', Password::defaults()]]);
        $user->password = $data['password']; // cast 'hashed' criptografa
        $user->save();

        return response()->json(['ok' => true, 'message' => "Senha de {$user->name} redefinida."]);
    }

    /** Estende o trial em N dias (a partir do vencimento atual se ainda futuro, senão de hoje) e volta o status pra trial. */
    public function extendTrial(Request $request, Tenant $clinica)
    {
        $data = $request->validate(['days' => 'required|integer|min:1|max:365']);
        $days = (int) $data['days'];

        $base = ($clinica->trial_ends_at && $clinica->trial_ends_at >= now()->toDateString())
            ? \Carbon\Carbon::parse($clinica->trial_ends_at)
            : now();

        $clinica->trial_ends_at = $base->addDays($days)->toDateString();
        $clinica->status = 'trial';
        $clinica->save();

        return back()->with('success', "Trial estendido por {$data['days']} dias. Novo vencimento: ".\Carbon\Carbon::parse($clinica->trial_ends_at)->format('d/m/Y').'.');
    }

    /** Reativa (status = active). Reativação rápida sem abrir o modal. */
    public function reactivate(Tenant $clinica)
    {
        $clinica->update(['status' => 'active']);

        return back()->with('success', 'Clínica reativada (status: Ativo).');
    }

    /** Aprova uma conta nova (pendente): libera o teste grátis de 7 dias a partir de agora. */
    public function approve(Tenant $clinica)
    {
        $ends = now()->addDays(7)->toDateString();
        $clinica->status = 'trial';
        $clinica->trial_ends_at = $ends;
        $clinica->save();

        return back()->with('success', 'Clínica aprovada! Teste de 7 dias liberado (vence em '.\Carbon\Carbon::parse($ends)->format('d/m/Y').').');
    }
}
