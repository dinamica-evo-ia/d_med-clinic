<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicProfile;
use App\Models\Doctor;
use App\Models\InsurancePlan;
use App\Models\Patient;
use App\Models\ScheduleException;
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
                // Dias que fogem do padrão — sem isso o aviso do form diria "não atende"
                // num sábado que a secretária acabou de abrir (o backend aceitaria).
                'exceptions' => $this->excecoesDoDoutor($d),
                // Convênios que ESTE médico atende (Configurações → Convênios). Lista vazia =
                // clínica que ainda não cadastrou nada → o campo continua texto livre.
                'insurances' => InsurancePlan::aceitosPor($d->id),
            ])->values(),
            'preselectedDoctorId' => $request->get('doctor_id'),
            'convenios' => $this->conveniosConhecidos(),
            // Clínica só-particular não vê o seletor: o campo já vem resolvido. Configurável em
            // /atendente (é a mesma config que decide o que a IA pergunta no WhatsApp).
            'paymentTypes' => ClinicProfile::current()->aceita(),
        ]);
    }

    /**
     * O convênio escolhido tem que estar na lista de aceitos DAQUELE médico.
     * Só vale quando a clínica já cadastrou algum (Configurações → Convênios) — quem ainda não
     * cadastrou segue digitando na mão, como era antes, senão o deploy travaria a recepção.
     * Devolve a mensagem de erro, ou null se estiver tudo certo. Corrige a grafia de passagem.
     */
    private function validaConvenio(array &$dados): ?string
    {
        if (($dados['payment_type'] ?? null) !== 'convenio') {
            return null;
        }

        $aceitos = InsurancePlan::aceitosPor($dados['doctor_id'] ?? null);
        if (! $aceitos) {
            return null; // clínica sem cadastro: texto livre
        }

        $casado = InsurancePlan::casar($dados['insurance_name'] ?? null, $dados['doctor_id'] ?? null);
        if (! $casado) {
            return 'Este médico não atende por esse convênio. Aceitos: '.implode(', ', $aceitos).'.';
        }

        $dados['insurance_name'] = $casado; // grava com a grafia do cadastro, não a digitada

        return null;
    }

    /** Exceções do médico dentro da janela em que dá pra agendar (só os dias que fogem do padrão). */
    private function excecoesDoDoutor(Doctor $doctor): array
    {
        $dias = (int) (DoctorSchedule::normalize($doctor->schedule)['max_lead_days'] ?: 90);

        return DoctorSchedule::resolvedRange($doctor, now(), now()->addDays(min($dias, 365)));
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

        if ($erro = $this->validaConvenio($validated)) {
            return back()->withErrors(['insurance_name' => $erro])->withInput();
        }

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

        if ($erro = $this->validaConvenio($validated)) {
            return back()->withErrors(['insurance_name' => $erro])->withInput();
        }

        if ($violation = $this->scheduleViolation($validated['doctor_id'], $validated['starts_at'], $validated['ends_at'])) {
            return back()->withErrors(['starts_at' => $violation])->withInput();
        }

        $oldStart = $appointment->getOriginal('starts_at');
        $appointment->update($validated);

        // Se o horário mudou, avisa o paciente no WhatsApp e o médico no celular.
        if (! $oldStart || \Carbon\Carbon::parse($oldStart)->notEqualTo($appointment->starts_at)) {
            AttendantNotifier::rescheduled($appointment, $oldStart);
            DoctorNotifier::consultaRemarcada($appointment, $oldStart);
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

        // Cancelamento pela recepção → avisa o paciente no WhatsApp e o médico no celular.
        if ($validated['status'] === 'cancelled') {
            AttendantNotifier::cancelled($appointment);
            DoctorNotifier::consultaCancelada($appointment);
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
                /*
                 * A cor sai da SITUAÇÃO, não só do status: "agendada e já avisada, sem resposta"
                 * é amarelo, o que o status sozinho não sabia dizer. O âmbar era do "em
                 * andamento", que virou índigo pra não competir com o aguardando-confirmação.
                 */
                $situacao = $appointment->situacao();

                return [
                    'id' => $appointment->id,
                    'title' => "{$appointment->patient->name} - {$appointment->doctor->name}",
                    'start' => $appointment->starts_at,
                    'end' => $appointment->ends_at,
                    'status' => $situacao,
                    'confirmed_at' => $appointment->confirmed_at,
                    'reminded_at' => $appointment->reminded_at,
                    'backgroundColor' => match($situacao) {
                        'scheduled' => '#3B82F6',              // 🔵 marcada, ainda não avisamos
                        'awaiting_confirmation' => '#F59E0B',  // 🟡 avisada, sem resposta
                        'confirmed' => '#10B981',              // 🟢 paciente confirmou
                        'in_progress' => '#6366F1',
                        'completed' => '#6B7280',
                        'cancelled' => '#EF4444',              // 🔴 cancelada
                        'no_show' => '#8B5CF6',
                        default => '#3B82F6',
                    },
                ];
            });

        return response()->json($appointments);
    }

    /*
     * ─────────────── EXCEÇÕES PONTUAIS DA AGENDA ───────────────
     * "Neste dia é diferente." A secretária abre um sábado ou fecha uma quarta
     * direto no calendário, sem mexer na regra semanal (que ela teria que lembrar
     * de desfazer depois). Vale pra UMA data.
     */

    /** Dias com exceção no intervalo, já resolvidos (o calendário sobrescreve só esses). */
    public function exceptions(Request $request)
    {
        $de  = \Carbon\Carbon::parse($request->get('start', now()->startOfMonth()));
        $ate = \Carbon\Carbon::parse($request->get('end', now()->endOfMonth()));
        $doctor = $request->get('doctor_id') ? Doctor::find($request->get('doctor_id')) : null;

        $lista = ScheduleException::paraMedico($doctor?->id)
            ->whereBetween('date', [$de->copy()->startOfDay(), $ate->copy()->endOfDay()])
            ->orderBy('date')->get();

        return response()->json([
            'days' => DoctorSchedule::resolvedRange($doctor, $de, $ate),
            'list' => $lista->map(fn ($e) => [
                'id'      => $e->id,
                'date'    => $e->date->format('Y-m-d'),
                'kind'    => $e->kind,
                'periods' => $e->periods,
                'reason'  => $e->reason,
                'clinica' => $e->doctor_id === null,
                'resumo'  => $e->resumo(),
            ])->values(),
        ]);
    }

    public function storeException(Request $request)
    {
        $data = $request->validate([
            'doctor_id'         => ['nullable', 'exists:doctors,id'],
            'date'              => ['required', 'date_format:Y-m-d'],
            'kind'              => ['required', 'in:open,closed'],
            'periods'           => ['nullable', 'array', 'max:6'],
            'periods.*.start'   => ['required', 'date_format:H:i'],
            'periods.*.end'     => ['required', 'date_format:H:i'],
            'reason'            => ['nullable', 'string', 'max:120'],
        ]);

        foreach ($data['periods'] ?? [] as $p) {
            if ($p['end'] <= $p['start']) {
                return response()->json(['ok' => false, 'message' => "O período {$p['start']}–{$p['end']} termina antes de começar."], 422);
            }
        }
        if ($data['kind'] === 'open' && empty($data['periods'])) {
            return response()->json(['ok' => false, 'message' => 'Informe o horário que será aberto neste dia.'], 422);
        }

        $excecao = ScheduleException::create([
            // sem doctor_id no payload = exceção da clínica inteira (feriado)
            'doctor_id'  => ($data['doctor_id'] ?? null) ?: null,
            'date'       => $data['date'],
            'kind'       => $data['kind'],
            'periods'    => $data['periods'] ?? null,
            'reason'     => $data['reason'] ?? null,
            'created_by' => $request->user()?->id,
        ]);
        DoctorSchedule::esqueceExcecoes(); // o cache do request já leu a versão antiga

        return response()->json(['ok' => true, 'resumo' => $excecao->resumo()]);
    }

    /** Volta o dia pro padrão: apaga as exceções daquela data (do médico ou da clínica). */
    public function destroyExceptions(Request $request)
    {
        $data = $request->validate([
            'date'      => ['required', 'date_format:Y-m-d'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
        ]);

        $n = ScheduleException::paraMedico($data['doctor_id'] ?? null)
            ->whereDate('date', $data['date'])
            ->delete();
        DoctorSchedule::esqueceExcecoes();

        return response()->json(['ok' => true, 'removidas' => $n]);
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

        // Remarcação (drag-and-drop) → avisa o paciente no WhatsApp e o médico no celular.
        AttendantNotifier::rescheduled($appointment, $oldStart);
        DoctorNotifier::consultaRemarcada($appointment, $oldStart);

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
