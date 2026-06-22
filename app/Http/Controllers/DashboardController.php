<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Invoice;
use App\Models\Expense;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $today = now()->startOfDay();
        $todayEnd = now()->endOfDay();
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $todayAppointments = Appointment::whereBetween('starts_at', [$today, $todayEnd])
            ->with(['patient:id,name', 'doctor:id,name'])
            ->orderBy('starts_at')
            ->get();

        $upcoming = Appointment::whereBetween('starts_at', [now(), now()->addDays(7)])
            ->where('status', '!=', 'cancelled')
            ->with(['patient:id,name', 'doctor:id,name'])
            ->orderBy('starts_at')
            ->limit(8)
            ->get();

        $stats = [
            'today_appointments' => $todayAppointments->count(),
            'completed_today' => $todayAppointments->where('status', 'completed')->count(),
            'month_appointments' => Appointment::whereBetween('starts_at', [$monthStart, $monthEnd])->count(),
            'total_patients' => Patient::count(),
            'month_revenue' => (float) Invoice::where('status', 'paid')->where('paid_at', '>=', $monthStart)->sum('amount'),
            'month_expense' => (float) Expense::where('status', 'paid')->where('paid_at', '>=', $monthStart)->sum('amount'),
            'pending_invoices' => (float) Invoice::where('status', 'pending')->sum('amount'),
            'pending_expenses' => (float) Expense::where('status', 'pending')->sum('amount'),
        ];

        $series = [];
        for ($i = 5; $i >= 0; $i--) {
            $d = now()->copy()->subMonths($i);
            $series[] = [
                'month' => ucfirst($d->translatedFormat('M')),
                'receita' => (float) Invoice::where('status', 'paid')->whereMonth('paid_at', $d->month)->whereYear('paid_at', $d->year)->sum('amount'),
                'despesa' => (float) Expense::where('status', 'paid')->whereMonth('paid_at', $d->month)->whereYear('paid_at', $d->year)->sum('amount'),
            ];
        }

        return Inertia::render('Dashboard', [
            'appointments' => $todayAppointments,
            'upcoming' => $upcoming,
            'stats' => $stats,
            'series' => $series,
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
