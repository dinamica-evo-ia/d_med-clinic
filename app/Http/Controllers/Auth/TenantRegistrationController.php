<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

/*
 * Signup self-service da landing page: visitante cria a própria clínica + conta de admin,
 * sem precisar do Painel Master. Trial de 7 dias (TRIAL_DAYS), plano fica pré-selecionado via
 * ?plan= na landing (cai em Solo se vier algo inválido). Mesma lógica de provisionamento do
 * Master\ClinicaController@store (tenant + DB isolado + migrate + seed + médico se Solo), só
 * que iniciada pelo próprio visitante e sem os campos administrativos (slug/status manuais).
 */
class TenantRegistrationController extends Controller
{
    private const TRIAL_DAYS = 7;

    public function create(Request $request): Response
    {
        $plans = \App\Support\Plans::all();
        $requested = $request->get('plan');

        return Inertia::render('Auth/Register', [
            'plans' => $plans,
            'selectedPlan' => array_key_exists($requested, $plans) ? $requested : config('plans.default'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'clinic_name' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'plan' => ['required', Rule::in(\App\Support\Plans::keys())],
        ]);

        $createDoctor = $data['plan'] === 'solo';
        $slug = $this->uniqueSlug($data['clinic_name']);

        $user = null;
        $tenant = null;
        $tenantDbFile = null;

        try {
            DB::transaction(function () use ($data, $slug, &$tenant, &$user) {
                $tenant = Tenant::create([
                    'id' => (string) Str::uuid(),
                    'name' => $data['clinic_name'],
                    'slug' => $slug,
                    'email' => $data['email'],
                    'plan' => $data['plan'],
                    // Conta nova entra PENDENTE: só libera pro trial depois da aprovação
                    // manual de um master no painel (que aí define o trial_ends_at).
                    'status' => 'pending',
                    'trial_ends_at' => null,
                ]);
                $tenant->domains()->create(['domain' => $slug.'.localhost']);

                $user = User::create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => $data['password'],
                ]);
                $tenant->users()->syncWithoutDetaching([
                    $user->id => ['role' => 'admin', 'is_active' => true],
                ]);
            });

            $tenant->database()->manager()->createDatabase($tenant);
            $tenantDbFile = database_path($tenant->database()->getName());

            Artisan::call('tenants:migrate', ['--tenants' => [$tenant->id], '--force' => true]);
            Artisan::call('tenants:seed', [
                '--tenants' => [$tenant->id],
                '--class' => \Database\Seeders\TenantSetupSeeder::class,
                '--force' => true,
            ]);

            if ($createDoctor) {
                tenancy()->initialize($tenant);
                try {
                    Doctor::create([
                        'name' => $data['name'],
                        'email' => $data['email'],
                        'is_active' => true,
                    ]);
                } finally {
                    tenancy()->end();
                }
            }

            event(new Registered($user));

            // NÃO loga automaticamente: a conta está pendente de aprovação. O usuário volta
            // e entra depois que um master liberar. Mensagem na tela de login.
            return redirect()->route('login')->with('status', 'Conta criada! Sua clínica está em análise pela nossa equipe. Assim que for aprovada, você poderá entrar e começar o teste grátis de 7 dias.');
        } catch (\Throwable $e) {
            if (tenancy()->initialized) tenancy()->end();

            if ($tenantDbFile && file_exists($tenantDbFile)) @unlink($tenantDbFile);
            if ($user) User::where('id', $user->id)->delete();
            if ($tenant) {
                DB::table('domains')->where('tenant_id', $tenant->id)->delete();
                DB::table('tenant_user')->where('tenant_id', $tenant->id)->delete();
                DB::table('tenants')->where('id', $tenant->id)->delete();
            }
            Log::error('TenantRegistrationController@store falhou: '.$e->getMessage());

            return back()->withInput()->withErrors(['clinic_name' => 'Não foi possível criar sua clínica agora. Tente novamente em alguns minutos.']);
        }
    }

    private function uniqueSlug(string $clinicName): string
    {
        $base = Str::slug($clinicName) ?: 'clinica';
        $slug = $base;
        $i = 2;
        while (Tenant::where('data->slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }
}
