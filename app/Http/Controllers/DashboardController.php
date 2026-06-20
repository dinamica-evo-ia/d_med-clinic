<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $today = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        $todayAppointments = Appointment::whereBetween('starts_at', [$today, $todayEnd])
            ->with(['patient:id,name', 'doctor:id,name'])
            ->orderBy('starts_at')
            ->get();

        $stats = [
            'today_appointments' => $todayAppointments->count(),
            'total_patients' => Patient::count(),
            'pending_invoices' => Invoice::where('status', 'pending')->sum('amount'),
            'completed_today' => $todayAppointments->where('status', 'completed')->count(),
        ];

        return Inertia::render('Dashboard', [
            'appointments' => $todayAppointments,
            'stats' => $stats,
        ]);
    }

    public function stats()
    {
        $today = now()->startOfDay();
        $monthStart = now()->startOfMonth();

        return response()->json([
            'today_appointments' => Appointment::whereBetween('starts_at', [$today, now()->endOfDay()])->count(),
            'month_appointments' => Appointment::where('created_at', '>=', $monthStart)->count(),
            'total_patients' => Patient::count(),
            'month_revenue' => Invoice::where('status', 'paid')
                ->where('paid_at', '>=', $monthStart)
                ->sum('amount'),
            'pending_revenue' => Invoice::where('status', 'pending')->sum('amount'),
        ]);
    }
}
