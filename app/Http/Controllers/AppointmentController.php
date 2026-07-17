<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicProfile;
use App\Models\Doctor;
use App\Models\Patient;
use App\Support\AttendantNotifier;
use App\Support\DoctorNotifier;
use App\Support\DoctorSchedule;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $doctors = Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name', 'schedule']);

        $doctorId = $request->get('doctor_id');
        $selected = $doctorId ? $doctors->firstWhere('id', $doctorId) : null;

        $schedule = $selected
            ? DoctorSchedule::normalize($selected->schedule)
            : DoctorSchedule::union($doctors->pluck('schedule')->all());

        return Inertia::render('Appointments/Index', [
            'doctors'  => $doctors->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values(),
            'filters'  => ['doctor_id' => $doctorId],
            'schedule' => $schedule,
        ]);
    }

    public function create(Request $request)
    {
        $doctors = Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name', 'schedule']);

        /*
         * Só o paciente pré-selecionado (quando se chega pela ficha dele, ?patient_id=).
         * Antes vinha Patient::orderBy('name')->get() INTEIRO — 2466 na Clínica RF, em todo
         * carregamento da tela, só pra popular um <select>. Agora quem escolhe é o
         * PatientPicker, que busca sob demanda em /api/patients/search.
         */
        $preId = $request->get('patient_id');

        return Inertia::render('Appointments/Form', [
            'appointment' => null,
            'patients' => $preId
                ? Patient::where('id', $preId)->get(['id', 'name', 'phone'])
                : collect(),
            'doctors' => $doctors->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'schedule' => DoctorSchedule::normalize($d->schedule),
            ])->values(),
            'preselectedDoctorId' => $request->get('doctor_id'),
            'convenios' => $this->conveniosConhecidos(),
            // Clínica só-particular não vê o seletor: o campo já vem resolvido. Configurável em
            // /atendente (é a mesma config que decide o que a IA pergunta no WhatsApp).
            'paymentTypes' => ClinicProfile::current()->aceita(),
        ]);
    }

    /**
     * Convênios que a clínica já usou — alimenta o datalist do agendamento pra a recepção
     * não digitar 'Unimed', 'unimed' e 'UNIMED' como se fossem três convênios diferentes.
     * Junta o que veio das consultas com o que está nos cadastros de paciente.
     */
    private function conveniosConhecidos(): array
    {
        $deConsultas = Appointment::whereNotNull('insurance_name')
            ->where('insurance_name', '!=', '')
            ->distinct()->pluck('insurance_name');

        $deCadastros = Patient::whereNotNull('insurance')
            ->pluck('insurance')
            ->map(fn ($i) => is_array($i) ? ($i['name'] ?? null) : null)
            ->filter();

        return $deConsultas->merge($deCadastros)
            ->map(fn ($n) => trim((string) $n))
            ->filter()
            ->unique(fn ($n) => mb_strtolower($n)) // 'Unimed' e 'unimed' são o mesmo
            ->sort()->values()->all();
    }

    public function store(Request $request)
    {
        /*
         * Aceita uma forma só? Então o formulário nem mostrou o seletor — resolve aqui em vez de
         * exigir um campo que a tela não pediu. Só no store: no update seria pior, porque
         * reescreveria em silêncio o pagamento de consultas antigas se a clínica mudasse a
         * configuração depois.
         */
        $aceitos = ClinicProfile::current()->aceita();
        if (count($aceitos) === 1) {
            $request->merge(['payment_type' => $aceitos[0]]);
        }

        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after:starts_at',
            'payment_type' => 'required|in:'.implode(',', $aceitos),
            // o nome do convênio só é exigido quando É convênio
            'insurance_name' => 'nullable|required_if:payment_type,convenio|string|max:120',
            'type' => 'nullable|string|in:consultation,followup,exam,other',
            'notes' => 'nullable|string',
        ]);

        if ($violation = $this->scheduleViolation($validated['doctor_id'], $validated['starts_at'], $validated['ends_at'])) {
            return back()->withErrors(['starts_at' => $violation])->withInput();
        }

        // Conflito — sobreposição REAL (começa antes do fim do outro E termina depois do início).
        // A checagem antiga com whereBetween não pegava uma consulta que "englobava" a nova e
        // ainda dava falso-positivo em horários encostados (fim == início do próximo).
        $conflict = Appointment::where('doctor_id', $validated['doctor_id'])
            ->where('status', '!=', 'cancelled')
            ->where('starts_at', '<', $validated['ends_at'])
            ->where('ends_at', '>', $validated['starts_at'])
            ->exists();

        if ($conflict) {
            return back()->withErrors(['starts_at' => 'Já existe uma consulta agendada neste horário.']);
        }

        $validated['user_id'] = auth()->id();
        $validated['status'] = 'scheduled';

        $appt = Appointment::create($validated);

        // Avisa o médico no celular (PWA). Não avisa se foi ele mesmo quem marcou.
        DoctorNotifier::consultaMarcada($appt);

        return redirect()->route('appointments.index')
            ->with('success', 'Consulta agendada com sucesso.');
    }

    public function show(Appointment $appointment)
    {
        $appointment->load(['patient', 'doctor', 'medicalRecord']);
        return Inertia::render('Appointments/Show', [
            'appointment' => $appointment,
        ]);
    }

    public function update(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after:starts_at',
            'payment_type' => 'required|in:particular,convenio',
            // o nome do convênio só é exigido quando É convênio
            'insurance_name' => 'nullable|required_if:payment_type,convenio|string|max:120',
            'type' => 'nullable|string|in:consultation,followup,exam,other',
            'notes' => 'nullable|string',
        ]);

        if ($violation = $this->scheduleViolation($validated['doctor_id'], $validated['starts_at'], $validated['ends_at'])) {
            return back()->withErrors(['starts_at' => $violation])->withInput();
        }

        $oldStart = $appointment->getOriginal('starts_at');
        $appointment->update($validated);

        // Se o horário mudou, avisa o paciente no WhatsApp (D_Med Atende).
        if (! $oldStart || \Carbon\Carbon::parse($oldStart)->notEqualTo($appointment->starts_at)) {
            AttendantNotifier::rescheduled($appointment, $oldStart);
        }

        return redirect()->route('appointments.index')
            ->with('success', 'Consulta atualizada com sucesso.');
    }

    public function updateStatus(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:scheduled,confirmed,in_progress,completed,cancelled,no_show',
            'cancellation_reason' => 'required_if:status,cancelled|nullable|string',
        ]);

        $data = ['status' => $validated['status']];

        if ($validated['status'] === 'cancelled') {
            $data['cancelled_at'] = now();
            $data['cancellation_reason'] = $validated['cancellation_reason'] ?? null;
        }

        $appointment->update($data);

        // Cancelamento pela recepção → avisa o paciente no WhatsApp (D_Med Atende).
        if ($validated['status'] === 'cancelled') {
            AttendantNotifier::cancelled($appointment);
        }

        return back()->with('success', 'Status da consulta atualizado.');
    }

    public function destroy(Appointment $appointment)
    {
        if ($appointment->status !== 'cancelled') {
            return back()->withErrors(['status' => 'Só é possível remover consultas canceladas.']);
        }

        $appointment->delete();

        return redirect()->route('appointments.index')
            ->with('success', 'Consulta removida.');
    }

    public function calendar(Request $request)
    {
        $start = $request->get('start', now()->startOfMonth());
        $end = $request->get('end', now()->endOfMonth());
        $doctorId = $request->get('doctor_id');

        $appointments = Appointment::with(['patient:id,name', 'doctor:id,name'])
            ->whereBetween('starts_at', [$start, $end])
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->get()
            ->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'title' => "{$appointment->patient->name} - {$appointment->doctor->name}",
                    'start' => $appointment->starts_at,
                    'end' => $appointment->ends_at,
                    'status' => $appointment->status,
                    'backgroundColor' => match($appointment->status) {
                        'scheduled' => '#3B82F6',
                        'confirmed' => '#10B981',
                        'in_progress' => '#F59E0B',
                        'completed' => '#6B7280',
                        'cancelled' => '#EF4444',
                        'no_show' => '#8B5CF6',
                        default => '#3B82F6',
                    },
                ];
            });

        return response()->json($appointments);
    }

    public function reschedule(Request $request, Appointment $appointment)
    {
        $data = $request->validate([
            'start' => 'required|date',
            'end' => 'nullable|date',
        ]);

        $start = \Carbon\Carbon::parse($data['start']);
        $end = ! empty($data['end'])
            ? \Carbon\Carbon::parse($data['end'])
            : (clone $start)->addMinutes(30);

        if ($violation = $this->scheduleViolation($appointment->doctor_id, $start, $end)) {
            return response()->json(['ok' => false, 'message' => $violation], 422);
        }

        $oldStart = $appointment->getOriginal('starts_at');
        $appointment->update([
            'starts_at' => $start,
            'ends_at' => $end,
        ]);

        // Remarcação (drag-and-drop) → avisa o paciente no WhatsApp (D_Med Atende).
        AttendantNotifier::rescheduled($appointment, $oldStart);

        return response()->json(['ok' => true]);
    }

    /**
     * Retorna mensagem de violação se o intervalo cair fora do expediente do médico, ou null se OK.
     */
    private function scheduleViolation($doctorId, $startsAt, $endsAt): ?string
    {
        $doctor = Doctor::find($doctorId);
        if (! $doctor) return null;

        $start = $startsAt instanceof \Carbon\CarbonInterface ? $startsAt : \Carbon\Carbon::parse($startsAt);
        $end   = $endsAt   instanceof \Carbon\CarbonInterface ? $endsAt   : \Carbon\Carbon::parse($endsAt);

        return DoctorSchedule::violation($doctor, $start, $end);
    }
}
