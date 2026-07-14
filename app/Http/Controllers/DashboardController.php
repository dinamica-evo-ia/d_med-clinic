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

        // Aniversariantes desta semana (de HOJE até domingo — não mostra dias já passados,
        // pra não poluir). Compara mês/dia (independe do ano); weekday em PT-BR fixo (robusto
        // a locale). photo_path incluído pra alimentar o accessor photo_url (avatar com foto).
        $patientsWithBirthday = Patient::whereNotNull('birth_date')->get(['id', 'name', 'birth_date', 'photo_path']);
        $currentYear = now()->year;
        $weekEnd = now()->endOfWeek(Carbon::SUNDAY);
        $diaPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        $birthdays = collect();
        for ($day = now()->copy()->startOfDay(); $day->lte($weekEnd); $day->addDay()) {
            $md = $day->format('m-d');
            foreach ($patientsWithBirthday as $p) {
                if ($p->birth_date->format('m-d') === $md) {
                    $birthdays->push([
                        'id' => $p->id,
                        'name' => $p->name,
                        'photo_url' => $p->photo_url,
                        'age' => $currentYear - $p->birth_date->year,
                        'is_today' => $day->isToday(),
                        'weekday' => $diaPt[$day->dayOfWeek],
                        'date' => $day->format('d/m'),
                    ]);
                }
            }
        }

        return Inertia::render('Dashboard', [
            'agenda' => $agenda,
            'stats' => $stats,
            'week_summary' => $weekSummary,
            'birthdays' => $birthdays->values(),
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
