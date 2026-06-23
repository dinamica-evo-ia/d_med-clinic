<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Invoice;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $today = now()->startOfDay();
        $todayEnd = now()->endOfDay();
        $weekStart = now()->startOfWeek(Carbon::MONDAY);
        $monthStart = now()->startOfMonth();

        $todayAppointments = Appointment::whereBetween('starts_at', [$today, $todayEnd])
            ->with(['patient:id,name', 'doctor:id,name'])
            ->orderBy('starts_at')
            ->get();

        $nextUp = $todayAppointments
            ->whereNotIn('status', ['cancelled', 'completed', 'no_show'])
            ->first(fn ($a) => $a->starts_at->greaterThan(now()));

        $stats = [
            'patients_today'   => $todayAppointments->whereNotIn('status', ['cancelled'])->count(),
            'attended_today'   => $todayAppointments->where('status', 'completed')->count(),
            'cancelled_today'  => $todayAppointments->where('status', 'cancelled')->count(),
            'month_appointments' => Appointment::whereBetween('starts_at', [$monthStart, now()->endOfMonth()])->count(),
        ];

        $agenda = $todayAppointments->map(fn ($a) => [
            'id' => $a->id,
            'starts_at' => $a->starts_at,
            'ends_at' => $a->ends_at,
            'patient_name' => $a->patient?->name,
            'doctor_name' => $a->doctor?->name,
            'status' => $a->status,
            'type' => $a->type,
            'is_next' => $nextUp && $a->id === $nextUp->id,
        ])->values();

        // Resumo da semana (Seg–Sex, mesmo recorte da agenda)
        $weekSummary = [];
        $labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
        for ($i = 0; $i < 5; $i++) {
            $day = $weekStart->copy()->addDays($i);
            $dayApts = Appointment::whereBetween('starts_at', [$day->copy()->startOfDay(), $day->copy()->endOfDay()])->get();
            $weekSummary[] = [
                'date' => $day->format('Y-m-d'),
                'label' => $labels[$i],
                'day' => $day->format('d'),
                'is_today' => $day->isToday(),
                'total' => $dayApts->whereNotIn('status', ['cancelled'])->count(),
                'completed' => $dayApts->where('status', 'completed')->count(),
                'cancelled' => $dayApts->where('status', 'cancelled')->count(),
            ];
        }

        // Aniversariantes — compara mês/dia (independe do ano), via PHP (robusto entre SQLite/MySQL)
        $patientsWithBirthday = Patient::whereNotNull('birth_date')->get(['id', 'name', 'birth_date']);
        $todayMd = now()->format('m-d');
        $currentYear = now()->year;
        $weekDates = collect(range(0, 6))->map(fn ($i) => $weekStart->copy()->addDays($i));

        $birthdaysToday = $patientsWithBirthday
            ->filter(fn ($p) => $p->birth_date->format('m-d') === $todayMd)
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'age' => $currentYear - $p->birth_date->year,
            ])->values();

        $birthdaysWeek = $patientsWithBirthday
            ->filter(fn ($p) => $p->birth_date->format('m-d') !== $todayMd)
            ->map(function ($p) use ($weekDates, $currentYear) {
                $match = $weekDates->first(fn ($d) => $d->format('m-d') === $p->birth_date->format('m-d'));
                return $match ? [
                    'id' => $p->id,
                    'name' => $p->name,
                    'age' => $currentYear - $p->birth_date->year,
                    'date' => $match->format('Y-m-d'),
                    'weekday' => ucfirst($match->translatedFormat('D')),
                ] : null;
            })
            ->filter()
            ->sortBy('date')
            ->values();

        return Inertia::render('Dashboard', [
            'agenda' => $agenda,
            'stats' => $stats,
            'week_summary' => $weekSummary,
            'birthdays_today' => $birthdaysToday,
            'birthdays_week' => $birthdaysWeek,
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
