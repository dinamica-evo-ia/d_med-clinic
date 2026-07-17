<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\PushSubscription;
use App\Support\WebPush;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Superfície mobile (PWA) — telas enxutas pro médico no celular. Reaproveita models e queries
 * do CRM; só a camada de tela é nova. v0: Agenda do Dia + aviso de consulta marcada.
 * Roda dentro do tenant (tenancy.by_user).
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

        // Médico logado (vínculo por user_id, ver Doctor::paraUsuario).
        // Achou → filtra a agenda dele; não achou (ex.: admin sem ficha) → mostra a clínica toda.
        $doctor = Doctor::paraUsuario($request->user());

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
            // Push: só oferece se houver chave VAPID E o usuário tiver ficha de médico
            // (o aviso é "marcaram consulta PRA VOCÊ" — não faz sentido pra quem não atende).
            'push' => [
                'disponivel' => WebPush::configurado() && (bool) $doctor,
                'chave_publica' => WebPush::configurado() ? config('webpush.public_key') : null,
            ],
        ]);
    }

    /** O aparelho aceitou receber avisos — guarda/atualiza a inscrição. */
    public function pushSubscribe(Request $request)
    {
        $data = $request->validate([
            'endpoint' => 'required|string|max:500',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        // updateOrCreate pelo endpoint: o mesmo aparelho reinscrevendo não vira linha duplicada,
        // e uma inscrição que trocou de dono (aparelho compartilhado) passa pro usuário certo.
        PushSubscription::updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'user_id' => $request->user()->id,
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]
        );

        return back()->with('success', 'Avisos ativados neste aparelho.');
    }

    /** O médico desligou os avisos neste aparelho. */
    public function pushUnsubscribe(Request $request)
    {
        $data = $request->validate(['endpoint' => 'required|string|max:500']);
        PushSubscription::where('endpoint', $data['endpoint'])
            ->where('user_id', $request->user()->id)->delete();

        return back()->with('success', 'Avisos desligados neste aparelho.');
    }

    /** Dispara um aviso de teste pro próprio médico — prova que a corrente inteira funciona. */
    public function pushTest(Request $request)
    {
        $n = WebPush::paraUsuario($request->user(), 'D_Med Clinic', 'Funcionou! Avisos estão ativos neste aparelho.', '/app');

        return back()->with($n > 0 ? 'success' : 'error',
            $n > 0 ? "Aviso enviado ({$n} aparelho(s))." : 'Nenhum aparelho inscrito recebeu.');
    }
}
