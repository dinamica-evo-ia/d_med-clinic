<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ImpersonationController extends Controller
{
    public function start(Tenant $clinica)
    {
        // Acha um admin (ou qualquer usuario ativo) dessa clinica.
        $userId = DB::table('tenant_user')
            ->where('tenant_id', $clinica->id)
            ->where('is_active', true)
            ->orderByRaw("CASE role WHEN 'admin' THEN 0 WHEN 'doctor' THEN 1 ELSE 2 END")
            ->value('user_id');

        if (! $userId) {
            return back()->with('error', 'Esta clínica não possui usuários ativos.');
        }

        $masterId = Auth::id();
        session(['master_impersonator_id' => $masterId, 'tenant_slug' => $clinica->slug]);
        Auth::loginUsingId($userId);

        return redirect('/');
    }

    public function stop(Request $request)
    {
        $masterId = $request->session()->pull('master_impersonator_id');
        if ($masterId) {
            Auth::loginUsingId($masterId);
        }
        $request->session()->forget('tenant_slug');

        return redirect()->route('master.clinicas.index');
    }
}
