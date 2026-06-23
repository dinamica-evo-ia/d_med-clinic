<?php

namespace App\Http\Controllers;

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
    public function settingsSchedule()   { return Inertia::render('Account/Settings/Schedule'); }
    public function settingsPrint()      { return Inertia::render('Account/Settings/Print'); }
    public function settingsCertificate(){ return Inertia::render('Account/Settings/Certificate'); }

    public function sessions()    { return Inertia::render('Account/Sessions'); }
    public function suggestions() { return Inertia::render('Account/Suggestions'); }
    public function referral()    { return Inertia::render('Account/Referral'); }
}
