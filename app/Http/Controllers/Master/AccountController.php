<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

/*
 * Conta do próprio master. O master não tem clínica/CRM (0 tenants), então precisa poder
 * trocar a própria senha dentro do painel /master (o menu de conta do CRM não é acessível).
 */
class AccountController extends Controller
{
    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ], [], [
            'current_password' => 'senha atual',
            'password' => 'nova senha',
        ]);

        $user = $request->user();
        $user->password = $data['password']; // cast 'hashed' criptografa
        $user->save();

        return back()->with('success', 'Senha alterada com sucesso.');
    }
}
