<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Patient;
use App\Support\DoctorSchedule;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
 * API do "agente" — consumida por integrações externas (D_Agent Atende) via token por
 * clínica. O CRM é a fonte única da agenda: aqui o bot LÊ disponibilidade e GRAVA a
 * consulta, passando pelo mesmo porteiro (expediente + conflito) que a recepção usa.
 * Tenant já vem inicializado pelo middleware tenancy.by_api. Ver docs/integracao-d-agent.md.
 */
class AgentController extends Controller
{
    private const TZ = 'America/Sao_Paulo';

    /** Lista de médicos ativos, pro bot oferecer escolha ao paciente. */
    public function medicos(Request $request): JsonResponse
    {
        $this->ensureScope($request, 'agenda:read');

        $doctors = Doctor::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'specialty']);

        return response()->json(['data' => $doctors]);
    }

    /** Horários livres de um médico (ou do primeiro ativo) nos próximos N dias. */
    public function disponibilidade(Request $request): JsonResponse
    {
        $this->ensureScope($request, 'agenda:read');

        $data = $request->validate([
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'days'      => ['nullable', 'integer', 'min:1', 'max:30'],
            'from'      => ['nullable', 'date'],
        ]);

        $days = (int) ($data['days'] ?? 7);
        $from = ! empty($data['from'])
            ? Carbon::parse($data['from'])->setTimezone(self::TZ)
            : Carbon::now(self::TZ);

        $doctor = ! empty($data['doctor_id'])
            ? Doctor::find($data['doctor_id'])
            : Doctor::where('is_active', true)->orderBy('name')->first();

        if (! $doctor) {
            return response()->json(['error' => 'Nenhum médico ativo na clínica.'], 422);
        }

        $rangeEnd = $from->copy()->addDays($days)->endOfDay();
        $busy = Appointment::where('doctor_id', $doctor->id)
            ->where('status', '!=', 'cancelled')
            ->where('starts_at', '<', $rangeEnd)
            ->where('ends_at', '>', $from)
            ->get(['starts_at', 'ends_at'])
            ->map(fn ($a) => ['start' => $a->starts_at, 'end' => $a->ends_at])
            ->all();

        return response()->json([
            'doctor_id'    => $doctor->id,
            'timezone'     => self::TZ,
            'slot_minutes' => DoctorSchedule::normalize($doctor->schedule)['slot_minutes'],
            'slots'        => DoctorSchedule::freeSlots($doctor, $from, $days, $busy),
        ]);
    }

    /** Acha (por CPF ou telefone) ou cria o paciente. Dados mínimos. */
    public function pacientes(Request $request): JsonResponse
    {
        $this->ensureScope($request, 'pacientes:write');

        $data = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'document'   => ['nullable', 'string', 'max:20'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'birth_date' => ['nullable', 'date'],
            'email'      => ['nullable', 'email', 'max:255'],
        ]);

        $doc   = ! empty($data['document']) ? preg_replace('/\D/', '', $data['document']) : null;
        $phone = ! empty($data['phone']) ? preg_replace('/\D/', '', $data['phone']) : null;

        $patient = null;
        if ($doc) {
            $patient = Patient::where('document', $doc)->first();
        }
        if (! $patient && $phone) {
            $patient = Patient::where('phone', $phone)->orWhere('whatsapp', $phone)->first();
        }

        $created = false;
        if (! $patient) {
            $patient = Patient::create([
                'name'       => $data['name'],
                'document'   => $doc,
                'phone'      => $phone,
                'whatsapp'   => $phone,
                'birth_date' => $data['birth_date'] ?? null,
                'email'      => $data['email'] ?? null,
                'status'     => 'active',
            ]);
            $created = true;
        }

        return response()->json(
            ['data' => ['id' => $patient->id, 'created' => $created]],
            $created ? 201 : 200
        );
    }

    /** Cria a consulta — porteiro único (expediente + conflito atômico). */
    public function agendamentos(Request $request): JsonResponse
    {
        $this->ensureScope($request, 'agenda:write');

        $data = $request->validate([
            'patient_id'       => ['required', 'exists:patients,id'],
            'doctor_id'        => ['required', 'exists:doctors,id'],
            'starts_at'        => ['required', 'date'],
            'ends_at'          => ['nullable', 'date', 'after:starts_at'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'type'             => ['nullable', 'string', 'in:consultation,followup,exam,other'],
            'notes'            => ['nullable', 'string'],
            'external_ref'     => ['nullable', 'string', 'max:255'],
            'status'           => ['nullable', 'string', 'in:scheduled,confirmed'],
        ]);

        $start = Carbon::parse($data['starts_at'])->setTimezone(self::TZ);
        $end   = ! empty($data['ends_at'])
            ? Carbon::parse($data['ends_at'])->setTimezone(self::TZ)
            : $start->copy()->addMinutes((int) ($data['duration_minutes'] ?? 30));

        $doctor = Doctor::find($data['doctor_id']);

        // 1) cabe no expediente do médico?
        if ($violation = DoctorSchedule::violation($doctor, $start, $end)) {
            return response()->json(['error' => $violation], 422);
        }

        // 2) conflito — sobreposição REAL: começa antes do fim do outro E termina depois do início.
        $conflict = Appointment::where('doctor_id', $doctor->id)
            ->where('status', '!=', 'cancelled')
            ->where('starts_at', '<', $end)
            ->where('ends_at', '>', $start)
            ->exists();

        if ($conflict) {
            return response()->json(['error' => 'Horário já ocupado.'], 409);
        }

        $appointment = Appointment::create([
            'patient_id'   => $data['patient_id'],
            'doctor_id'    => $data['doctor_id'],
            'user_id'      => null, // criado por integração, não por um usuário logado (FK frouxa)
            'starts_at'    => $start,
            'ends_at'      => $end,
            'status'       => $data['status'] ?? 'scheduled',
            'type'         => $data['type'] ?? 'consultation',
            'notes'        => $data['notes'] ?? null,
            'source'       => 'd_agent',
            'external_ref' => $data['external_ref'] ?? null,
        ]);

        return response()->json([
            'data' => [
                'id'        => $appointment->id,
                'status'    => $appointment->status,
                'starts_at' => $start->toIso8601String(),
                'ends_at'   => $end->toIso8601String(),
            ],
        ], 201);
    }

    /** Barra a chamada se a chave não tem o escopo pedido. */
    private function ensureScope(Request $request, string $scope): void
    {
        $key = $request->attributes->get('apiKey');
        if ($key && ! $key->hasScope($scope)) {
            abort(response()->json(['error' => "Faltando escopo {$scope}"], 403));
        }
    }
}
