<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Patient;
use App\Support\AttendantNotifier;
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

        return Inertia::render('Appointments/Form', [
            'appointment' => null,
            'patients' => Patient::orderBy('name')->get(['id', 'name', 'phone']),
            'doctors' => $doctors->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'schedule' => DoctorSchedule::normalize($d->schedule),
            ])->values(),
            'preselectedDoctorId' => $request->get('doctor_id'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after:starts_at',
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

        Appointment::create($validated);

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
