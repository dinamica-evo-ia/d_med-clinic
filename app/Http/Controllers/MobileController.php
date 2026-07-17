<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Doctor;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Superfície mobile (PWA) — telas enxutas pro médico no celular. Reaproveita models e queries
 * do CRM; só a camada de tela é nova. v0: Agenda do Dia. Roda dentro do tenant (tenancy.by_user).
 */
class MobileController extends Controller
{
    public function agenda(Request $request)
    {
        // Dia selecionado (default hoje). Aceita ?data=YYYY-MM-DD pra navegar.
        $tz = config('app.timezone');
        $dia = $request->date('data') ?? Carbon::now($tz);
        $ini = $dia->copy()->startOfDay();
        $fim = $dia->copy()->endOfDay();

        // Médico logado: o vínculo é por e-mail (doctors não tem user_id — ver pendência do handoff).
        // Achou → filtra a agenda dele; não achou (ex.: admin sem ficha) → mostra a clínica toda.
        $doctor = Doctor::where('email', $request->user()->email)->first();

        $q = Appointment::whereBetween('starts_at', [$ini, $fim])
            ->where('status', '!=', 'cancelled')
            ->with(['patient:id,name,phone,whatsapp', 'doctor:id,name'])
            ->orderBy('starts_at');
        if ($doctor) {
            $q->where('doctor_id', $doctor->id);
        }

        $agora = Carbon::now($tz);
        $consultas = $q->get();
        $proxima = $consultas->first(fn ($a) => $a->starts_at->greaterThan($agora));

        return Inertia::render('Mobile/Agenda', [
            'dia' => [
                'iso' => $ini->toDateString(),
                'titulo' => $ini->isoFormat('dddd, D [de] MMMM'),
                'is_hoje' => $ini->isToday(),
                'anterior' => $ini->copy()->subDay()->toDateString(),
                'proximo' => $ini->copy()->addDay()->toDateString(),
            ],
            'medico' => $doctor?->name,
            'consultas' => $consultas->map(fn ($a) => [
                'id' => $a->id,
                'hora' => $a->starts_at->clone()->setTimezone($tz)->format('H:i'),
                'paciente' => $a->patient?->name ?? 'Sem paciente',
                'paciente_id' => $a->patient_id,
                'medico' => $a->doctor?->name,
                'status' => $a->status,
                'tipo' => $a->type,
                'is_proxima' => $proxima && $a->id === $proxima->id,
            ])->values(),
        ]);
    }
}
