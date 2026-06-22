<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Appointment::with(['patient:id,name', 'doctor:id,name']);

        if ($date = $request->get('date')) {
            $query->whereDate('starts_at', $date);
        }

        if ($doctorId = $request->get('doctor_id')) {
            $query->where('doctor_id', $doctorId);
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        return Inertia::render('Appointments/Index', [
            'appointments' => $query->orderBy('starts_at')->paginate(20)->withQueryString(),
            'doctors' => Doctor::where('is_active', true)->get(['id', 'name']),
            'filters' => $request->only(['date', 'doctor_id', 'status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Appointments/Form', [
            'appointment' => null,
            'patients' => Patient::orderBy('name')->get(['id', 'name', 'phone']),
            'doctors' => Doctor::where('is_active', true)->get(['id', 'name']),
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

        // Check for time conflicts
        $conflict = Appointment::where('doctor_id', $validated['doctor_id'])
            ->where('status', '!=', 'cancelled')
            ->where(function ($q) use ($validated) {
                $q->whereBetween('starts_at', [$validated['starts_at'], $validated['ends_at']])
                  ->orWhereBetween('ends_at', [$validated['starts_at'], $validated['ends_at']]);
            })
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

        $appointment->update($validated);

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

        return back()->with('success', 'Status da consulta atualizado.');
    }

    public function calendar(Request $request)
    {
        $start = $request->get('start', now()->startOfMonth());
        $end = $request->get('end', now()->endOfMonth());

        $appointments = Appointment::with(['patient:id,name', 'doctor:id,name'])
            ->whereBetween('starts_at', [$start, $end])
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

        $appointment->update([
            'starts_at' => $start,
            'ends_at' => $end,
        ]);

        return response()->json(['ok' => true]);
    }
}
