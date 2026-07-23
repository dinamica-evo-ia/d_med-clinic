<?php

namespace App\Http\Controllers;

use App\Models\ClinicProfile;
use App\Models\Doctor;
use App\Models\InsurancePlan;
use App\Models\Tenant;
use App\Models\User;
use App\Support\DoctorSchedule;
use App\Support\PrintSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class AccountController extends Controller
{
    /**
     * Médico / Clínica / Usuários — as três coisas ficam em abas da mesma página, no menu
     * do avatar. A aba Usuários só é montada pra admin (as rotas de /users seguem com
     * middleware role:admin — isto aqui é só a UI).
     */
    public function clinic(Request $request)
    {
        $doctors = Doctor::orderBy('name')->get();
        $selectedId = $request->get('doctor_id') ?: optional($doctors->first())->id;
        $selected = $doctors->firstWhere('id', $selectedId);

        return Inertia::render('Account/Clinic', [
            'doctors' => $doctors->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values(),
            'doctor' => $selected ? [
                'id' => $selected->id,
                'name' => $selected->name,
                'email' => $selected->email,
                'phone' => $selected->phone,
                'specialty' => $selected->specialty,
                'license_number' => $selected->license_number,
                'license_state' => $selected->license_state,
                'rqe' => $selected->rqe,
                'document' => $selected->document,
                'bio' => $selected->bio,
                'is_active' => (bool) $selected->is_active,
            ] : null,
            'clinic' => $this->clinicPayload(),
            'users' => $request->user()->currentRole() === 'admin' ? $this->clinicUsers() : null,
            'grantablePermissions' => TenantUserController::GRANTABLE_PERMISSIONS,
            'states' => ClinicProfile::STATES,
        ]);
    }

    private function clinicPayload(): array
    {
        $p = ClinicProfile::current();

        return array_merge(
            $p->only((new ClinicProfile)->getFillable()),
            ['logo_url' => $p->logo_url]
        );
    }

    /** Usuários da clínica. Sem paginação de propósito: o plano limita a poucas dezenas. */
    private function clinicUsers(): array
    {
        $tenantId = tenant()->id;

        return User::whereHas('tenants', fn ($q) => $q->where('tenant_id', $tenantId))
            ->with(['tenants' => fn ($q) => $q->where('tenant_id', $tenantId)])
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                $pivot = $user->tenants->first()?->pivot;
                $permissions = $pivot?->permissions;
                if (is_string($permissions)) {
                    $permissions = json_decode($permissions, true);
                }

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $pivot?->role ?? 'doctor',
                    'is_active' => (bool) ($pivot?->is_active ?? true),
                    'permissions' => $permissions ?? [],
                ];
            })
            ->values()
            ->all();
    }

    public function doctorUpdate(Request $request, Doctor $doctor)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'specialty' => ['nullable', 'string', 'max:120'],
            'license_number' => ['nullable', 'string', 'max:30'],
            'license_state' => ['nullable', 'string', Rule::in(ClinicProfile::STATES)],
            'rqe' => ['nullable', 'string', 'max:30'],
            'document' => ['nullable', 'string', 'max:20'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ]);

        $doctor->update($data);

        return back()->with('success', 'Dados do médico salvos.');
    }

    public function clinicUpdate(Request $request)
    {
        $data = $request->validate([
            'legal_name' => ['nullable', 'string', 'max:255'],
            'nature' => ['required', Rule::in(ClinicProfile::NATURES)],
            'document' => ['nullable', 'string', 'max:20'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'zip' => ['nullable', 'string', 'max:15'],
            'street' => ['nullable', 'string', 'max:255'],
            'number' => ['nullable', 'string', 'max:20'],
            'complement' => ['nullable', 'string', 'max:120'],
            'district' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', Rule::in(ClinicProfile::STATES)],
        ]);

        ClinicProfile::current()->update($data);

        return back()->with('success', 'Dados da clínica salvos.');
    }

    public function clinicLogo(Request $request)
    {
        $request->validate(['logo' => ['required', 'image', 'max:5120']]);

        $profile = ClinicProfile::current();
        if ($profile->logo_path) {
            Storage::disk('public')->delete($profile->logo_path);
        }

        $profile->update([
            'logo_path' => $request->file('logo')->storeAs(
                'clinic-logos',
                tenant()->id.'_'.time().'.'.$request->file('logo')->extension(),
                'public'
            ),
        ]);

        return back()->with('success', 'Logo da clínica atualizada.');
    }

    public function clinicLogoDestroy()
    {
        $profile = ClinicProfile::current();
        if ($profile->logo_path) {
            Storage::disk('public')->delete($profile->logo_path);
            $profile->update(['logo_path' => null]);
        }

        return back()->with('success', 'Logo removida.');
    }

    public function password()
    {
        return Inertia::render('Account/Password');
    }

    public function passwordUpdate(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);
        $request->user()->update(['password' => $request->password]);

        return back()->with('success', 'Senha alterada com sucesso.');
    }

    public function plan()
    {
        return Inertia::render('Account/Plan', [
            'plans' => \App\Support\Plans::all(),
        ]);
    }

    public function settingsDoctor()     { return Inertia::render('Account/Settings/Doctor'); }
    public function settingsCertificate(){ return Inertia::render('Account/Settings/Certificate'); }

    public function settingsPrint(Request $request)
    {
        $doctors = Doctor::where('is_active', true)->orderBy('name')->get();
        $selectedId = $request->get('doctor_id') ?: optional($doctors->first())->id;
        $selected   = $doctors->firstWhere('id', $selectedId);

        $settings = $selected ? PrintSettings::forDoctor($selected) : PrintSettings::defaults();
        $settings['header']['logo_url'] = ! empty($settings['header']['logo_path'])
            ? Storage::disk('public')->url($settings['header']['logo_path'])
            : null;

        return Inertia::render('Account/Settings/Print', [
            'doctors'  => $doctors->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values(),
            'doctor'   => $selected ? ['id' => $selected->id, 'name' => $selected->name] : null,
            'settings' => $settings,
        ]);
    }

    public function printUpdate(Request $request)
    {
        $data = $request->validate([
            'doctor_id'  => ['required', 'exists:doctors,id'],
            'settings'   => ['required', 'array'],
        ]);

        $doctor = Doctor::findOrFail($data['doctor_id']);
        $normalized = PrintSettings::normalize($data['settings']);
        // preserva a logo já enviada (não vem no submit do form de config)
        $normalized['header']['logo_path'] = $doctor->print_settings['header']['logo_path'] ?? null;
        $doctor->print_settings = $normalized;
        $doctor->save();

        return back()->with('success', 'Configuração de impressão salva.');
    }

    public function printLogo(Request $request)
    {
        $data = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'logo'      => ['required', 'image', 'max:5120'],
        ]);

        $doctor = Doctor::findOrFail($data['doctor_id']);
        $settings = PrintSettings::forDoctor($doctor);

        if (! empty($settings['header']['logo_path'])) {
            Storage::disk('public')->delete($settings['header']['logo_path']);
        }

        $path = $request->file('logo')->storeAs(
            'print-logos',
            $doctor->id.'_'.time().'.'.$request->file('logo')->extension(),
            'public'
        );
        $settings['header']['logo_path'] = $path;
        $doctor->print_settings = $settings;
        $doctor->save();

        return back()->with('success', 'Logo atualizada.');
    }

    public function printLogoDestroy(Request $request)
    {
        $data = $request->validate(['doctor_id' => ['required', 'exists:doctors,id']]);
        $doctor = Doctor::findOrFail($data['doctor_id']);
        $settings = PrintSettings::forDoctor($doctor);

        if (! empty($settings['header']['logo_path'])) {
            Storage::disk('public')->delete($settings['header']['logo_path']);
            $settings['header']['logo_path'] = null;
            $doctor->print_settings = $settings;
            $doctor->save();
        }

        return back()->with('success', 'Logo removida.');
    }

    /*
     * ─────────────── CONVÊNIOS ACEITOS ───────────────
     * Antes o convênio da consulta era texto livre com um datalist do que já tinha sido
     * digitado — "Unimed", "unimed " e "UNINED" viravam convênios diferentes, e a IA no
     * WhatsApp aceitava qualquer nome. Agora sai tudo desta lista.
     */
    public function settingsInsurance()
    {
        return Inertia::render('Account/Settings/Insurance', [
            'plans' => InsurancePlan::with('doctors:id,name')->orderBy('name')->get()
                ->map(fn ($p) => [
                    'id'          => $p->id,
                    'name'        => $p->name,
                    'notes'       => $p->notes,
                    'all_doctors' => $p->all_doctors,
                    'is_active'   => $p->is_active,
                    'doctor_ids'  => $p->doctors->pluck('id')->all(),
                ])->values(),
            'doctors' => Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name'])
                ->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values(),
        ]);
    }

    public function insuranceStore(Request $request)
    {
        $data = $this->validaConvenio($request);
        $plan = InsurancePlan::create($data['campos']);
        $plan->doctors()->sync($data['campos']['all_doctors'] ? [] : $data['medicos']);

        return back()->with('success', "Convênio {$plan->name} cadastrado.");
    }

    public function insuranceUpdate(Request $request, InsurancePlan $insurancePlan)
    {
        $data = $this->validaConvenio($request, $insurancePlan->id);
        $insurancePlan->update($data['campos']);
        // all_doctors = true limpa o pivot: senão sobrariam vínculos escondidos que voltam
        // a valer se alguém desmarcar depois, sem entender por quê.
        $insurancePlan->doctors()->sync($data['campos']['all_doctors'] ? [] : $data['medicos']);

        return back()->with('success', 'Convênio atualizado.');
    }

    public function insuranceDestroy(InsurancePlan $insurancePlan)
    {
        $nome = $insurancePlan->name;
        $insurancePlan->doctors()->detach();
        $insurancePlan->delete();

        // As consultas antigas guardam o NOME em appointments.insurance_name, então apagar o
        // cadastro não mexe no histórico — só some da lista de novas marcações.
        return back()->with('success', "Convênio {$nome} removido da lista.");
    }

    private function validaConvenio(Request $request, ?string $ignorarId = null): array
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:120'],
            'notes'         => ['nullable', 'string', 'max:160'],
            'all_doctors'   => ['required', 'boolean'],
            'is_active'     => ['required', 'boolean'],
            'doctor_ids'    => ['array'],
            'doctor_ids.*'  => ['exists:doctors,id'],
        ]);

        // Nome repetido só confunde na hora de escolher (dois "Unimed" no select).
        $existe = InsurancePlan::whereRaw('lower(name) = ?', [mb_strtolower(trim($data['name']))])
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->exists();
        if ($existe) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'name' => 'Já existe um convênio com esse nome.',
            ]);
        }

        return [
            'campos' => [
                'name'        => trim($data['name']),
                'notes'       => $data['notes'] ?? null,
                'all_doctors' => (bool) $data['all_doctors'],
                'is_active'   => (bool) $data['is_active'],
            ],
            'medicos' => $data['doctor_ids'] ?? [],
        ];
    }

    public function settingsSchedule(Request $request)
    {
        $doctors = Doctor::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'specialty', 'schedule']);

        $selectedId = $request->get('doctor_id') ?: optional($doctors->first())->id;
        $selected   = $doctors->firstWhere('id', $selectedId);

        return Inertia::render('Account/Settings/Schedule', [
            'doctors'  => $doctors->map(fn ($d) => [
                'id'        => $d->id,
                'name'      => $d->name,
                'specialty' => $d->specialty,
            ])->values(),
            'doctor'   => $selected ? [
                'id'        => $selected->id,
                'name'      => $selected->name,
                'specialty' => $selected->specialty,
            ] : null,
            'schedule' => DoctorSchedule::normalize($selected?->schedule),
            'defaults' => DoctorSchedule::defaults(),
        ]);
    }

    public function scheduleUpdate(Request $request)
    {
        // Modelo de PERÍODOS (manhã/tarde/...). O almoço deixou de existir: é o buraco entre eles.
        $data = $request->validate([
            'doctor_id'                        => ['required', 'exists:doctors,id'],
            'schedule'                         => ['required', 'array'],
            'schedule.days'                    => ['required', 'array'],
            'schedule.days.*.active'           => ['required', 'boolean'],
            'schedule.days.*.periods'          => ['required', 'array', 'min:1', 'max:6'],
            'schedule.days.*.periods.*.start'  => ['required', 'date_format:H:i'],
            'schedule.days.*.periods.*.end'    => ['required', 'date_format:H:i'],
            'schedule.slot_minutes'            => ['required', 'integer', 'in:10,15,20,30,45,60,90'],
            'schedule.min_lead_minutes'        => ['required', 'integer', 'min:0', 'max:10080'],
            'schedule.max_lead_days'           => ['required', 'integer', 'min:1', 'max:365'],
        ], [
            'schedule.days.*.periods.required' => 'Cada dia precisa de ao menos um período de atendimento.',
        ]);

        // garante exatamente as 7 chaves de dias
        foreach (DoctorSchedule::DAYS as $d) {
            if (! isset($data['schedule']['days'][$d])) {
                return back()->withErrors(['schedule' => "Dia '{$d}' ausente na configuração."]);
            }
        }

        /*
         * Fim > início em cada período. O `after:` do Laravel não serve aqui porque o caminho
         * tem dois curingas (days.*.periods.*) e ele não sabe comparar dentro do mesmo item.
         * Sobreposição não é erro: o normalize funde períodos que se encostam.
         */
        $rotulo = ['mon' => 'segunda', 'tue' => 'terça', 'wed' => 'quarta', 'thu' => 'quinta',
                   'fri' => 'sexta', 'sat' => 'sábado', 'sun' => 'domingo'];
        foreach ($data['schedule']['days'] as $d => $cfg) {
            foreach ($cfg['periods'] as $i => $p) {
                if ($p['end'] <= $p['start']) {
                    return back()->withErrors([
                        'schedule' => "Na {$rotulo[$d]}, o {$i}º período termina antes de começar ({$p['start']}–{$p['end']}).",
                    ]);
                }
            }
        }

        $doctor = Doctor::findOrFail($data['doctor_id']);
        $doctor->schedule = DoctorSchedule::normalize($data['schedule']);
        $doctor->save();

        return back()->with('success', 'Horários atualizados.');
    }

    public function suggestions() { return Inertia::render('Account/Suggestions'); }

    /** Clínica com trial vencido ou suspensa/cancelada pelo Master — não inicializa tenancy, só informa. */
    public function blocked()
    {
        $tenant = Tenant::where('data->slug', session('tenant_slug'))->first();

        return Inertia::render('Account/Blocked', [
            'tenant' => $tenant ? ['name' => $tenant->name, 'status' => $tenant->status, 'trial_ends_at' => $tenant->trial_ends_at] : null,
        ]);
    }
    public function referral()    { return Inertia::render('Account/Referral'); }
}
