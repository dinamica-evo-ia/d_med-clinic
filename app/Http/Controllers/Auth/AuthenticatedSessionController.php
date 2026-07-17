<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Support\SessionLimit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): \Symfony\Component\HttpFoundation\Response
    {
        $request->authenticate();

        $request->session()->regenerate();

        // Um computador e um celular por usuário (regra do plano). DEPOIS do regenerate: o id da
        // sessão muda ali, e é ele que precisa sobreviver. Entrar no PC não derruba o celular.
        SessionLimit::aplicar($request->user(), $request->session()->getId(), $request->userAgent());

        // Força CARGA CHEIA no destino pós-login (Inertia::location → 409 + window.location),
        // em vez da transição SPA do Inertia após o redirect duplo (/login → / → dashboard/master),
        // que estava deixando a página em branco (só o refresh manual carregava).
        $target = redirect()->intended(route('home', absolute: false))->getTargetUrl();

        return Inertia::location($target);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
