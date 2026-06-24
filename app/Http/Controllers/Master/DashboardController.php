<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $plans = config('plans.plans');

        $tenants = Tenant::all();
        $byStatus = [
            'trial' => 0, 'active' => 0, 'past_due' => 0, 'suspended' => 0, 'cancelled' => 0,
        ];
        $byPlan = array_fill_keys(array_keys($plans), 0);

        foreach ($tenants as $t) {
            $status = $t->status ?? 'active';
            if (isset($byStatus[$status])) {
                $byStatus[$status]++;
            }
            $plan = $t->plan ?? 'solo';
            if (isset($byPlan[$plan])) {
                $byPlan[$plan]++;
            }
        }

        $totalUsers = DB::table('users')->where('is_master', false)->count();
        $totalMasters = DB::table('users')->where('is_master', true)->count();

        return Inertia::render('Master/Dashboard', [
            'totals' => [
                'tenants' => $tenants->count(),
                'users' => $totalUsers,
                'masters' => $totalMasters,
            ],
            'byStatus' => $byStatus,
            'byPlan' => $byPlan,
            'plans' => $plans,
            'statuses' => config('plans.statuses'),
        ]);
    }
}
