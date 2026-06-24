<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\Tenant;
use App\Support\DoctorSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class AccountController extends Controller
{
    public function doctor()
    {
        return Inertia::render('Account/Doctor');
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
            'plans' => config('plans.plans'),
        ]);
    }

    public function settingsDoctor()     { return Inertia::render('Account/Settings/Doctor'); }
    public function settingsPrint()      { return Inertia::render('Account/Settings/Print'); }
    public function settingsCertificate(){ return Inertia::render('Account/Settings/Certificate'); }

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
        $data = $request->validate([
            'doctor_id'                       => ['required', 'exists:doctors,id'],
            'schedule'                        => ['required', 'array'],
            'schedule.days'                   => ['required', 'array'],
            'schedule.days.*.active'          => ['required', 'boolean'],
            'schedule.days.*.open'            => ['required', 'date_format:H:i'],
            'schedule.days.*.close'           => ['required', 'date_format:H:i', 'after:schedule.days.*.open'],
            'schedule.days.*.lunch'           => ['nullable', 'array'],
            'schedule.days.*.lunch.start'     => ['nullable', 'date_format:H:i', 'required_with:schedule.days.*.lunch.end'],
            'schedule.days.*.lunch.end'       => ['nullable', 'date_format:H:i', 'required_with:schedule.days.*.lunch.start', 'after:schedule.days.*.lunch.start'],
            'schedule.slot_minutes'           => ['required', 'integer', 'in:10,15,20,30,45,60,90'],
            'schedule.min_lead_minutes'       => ['required', 'integer', 'min:0', 'max:10080'],
            'schedule.max_lead_days'          => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        // garante exatamente as 7 chaves de dias
        foreach (DoctorSchedule::DAYS as $d) {
            if (! isset($data['schedule']['days'][$d])) {
                return back()->withErrors(['schedule' => "Dia '{$d}' ausente na configuração."]);
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
