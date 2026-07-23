import { Link, router, useForm, usePage } from '@inertiajs/react';

const DAY_LABELS = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SLOTS = [10, 15, 20, 30, 45, 60, 90];
// Rótulo só visual — o backend não guarda "manhã/tarde", guarda a lista de períodos na ordem.
const PERIOD_LABELS = ['Manhã', 'Tarde', 'Noite'];

export default function Schedule() {
  const { doctors, doctor, schedule, flash } = usePage().props;

  const form = useForm({
    doctor_id: doctor?.id || '',
    schedule: schedule,
  });

  const onSelectDoctor = (id) => {
    router.get('/account/settings/schedule', { doctor_id: id }, { preserveState: false });
  };

  const updateDay = (day, patch) => {
    form.setData('schedule', {
      ...form.data.schedule,
      days: {
        ...form.data.schedule.days,
        [day]: { ...form.data.schedule.days[day], ...patch },
      },
    });
  };

  // Períodos: manhã, tarde, o que for. O intervalo de almoço é o BURACO entre dois
  // períodos — não existe mais campo próprio pra ele.
  const periodsOf = (day) => form.data.schedule.days[day].periods || [];

  const setPeriods = (day, periods) => updateDay(day, { periods });

  const updatePeriod = (day, i, patch) =>
    setPeriods(day, periodsOf(day).map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const removePeriod = (day, i) => setPeriods(day, periodsOf(day).filter((_, idx) => idx !== i));

  const addPeriod = (day) => {
    const atuais = periodsOf(day);
    // sugere um começo depois do último período, pra não nascer sobreposto
    const ultimo = atuais[atuais.length - 1];
    const sugestao = !ultimo ? { start: '08:00', end: '12:00' }
      : ultimo.end <= '12:30' ? { start: '14:00', end: '18:00' }
      : { start: ultimo.end, end: somaHora(ultimo.end, 2) };
    setPeriods(day, [...atuais, sugestao]);
  };

  // "18:00" + 2h → "20:00" (trava em 23:59 pra não virar o dia)
  function somaHora(hhmm, horas) {
    const [h, m] = hhmm.split(':').map(Number);
    const total = Math.min(h * 60 + m + horas * 60, 23 * 60 + 59);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  // Copia os períodos de um dia pros outros dias ativos — o caso comum é
  // "seg a sex igual" e ninguém quer digitar 5 vezes.
  const copiarParaOsOutros = (day) => {
    const base = periodsOf(day).map((p) => ({ ...p }));
    const days = { ...form.data.schedule.days };
    DAY_ORDER.forEach((d) => {
      if (d !== day && days[d].active) days[d] = { ...days[d], periods: base.map((p) => ({ ...p })) };
    });
    form.setData('schedule', { ...form.data.schedule, days });
  };

  const submit = (e) => {
    e.preventDefault();
    form.put('/account/settings/schedule', { preserveScroll: true });
  };

  const noDoctor = !doctor;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/account/settings/doctor" className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações da Agenda</h1>
        <p className="text-sm text-slate-500 mt-1">Dias e horários de atendimento por médico. Agendamentos fora deste intervalo serão bloqueados.</p>
      </div>

      {flash?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{flash.success}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Médico</span>
          <select
            value={form.data.doctor_id}
            onChange={(e) => onSelectDoctor(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={!doctors?.length}
          >
            {!doctors?.length && <option value="">Nenhum médico cadastrado</option>}
            {doctors?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.specialty ? ` — ${d.specialty}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {noDoctor ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-800">
          Cadastre um médico ativo em <Link href="/doctors" className="font-semibold underline">/doctors</Link> para configurar a agenda.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold text-slate-800">Expediente semanal</span>
              <span className="text-[11px] text-slate-400">O intervalo entre um período e outro (almoço, por exemplo) já fica fechado automaticamente.</span>
            </div>
            <div className="divide-y divide-slate-100">
              {DAY_ORDER.map((day) => {
                const d = form.data.schedule.days[day];
                const active = !!d.active;
                const periods = d.periods || [];
                return (
                  <div key={day} className="flex flex-col sm:flex-row sm:items-start gap-3 px-5 py-3.5">
                    <label className="w-full sm:w-40 shrink-0 flex items-center gap-2 cursor-pointer select-none sm:pt-1.5">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => updateDay(day, { active: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span className={`text-sm font-medium ${active ? 'text-slate-900' : 'text-slate-400'}`}>{DAY_LABELS[day]}</span>
                    </label>

                    <div className="flex-1 min-w-0">
                      {!active ? (
                        <p className="text-sm text-slate-400 sm:pt-1.5">Não atende</p>
                      ) : (
                        <div className="space-y-2">
                          {periods.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-500 w-16 shrink-0">{PERIOD_LABELS[i] || `${i + 1}º período`}</span>
                              <input
                                type="time"
                                value={p.start || ''}
                                onChange={(e) => updatePeriod(day, i, { start: e.target.value })}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                              />
                              <span className="text-slate-400 text-xs">até</span>
                              <input
                                type="time"
                                value={p.end || ''}
                                onChange={(e) => updatePeriod(day, i, { end: e.target.value })}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                              />
                              {periods.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removePeriod(day, i)}
                                  className="text-xs text-rose-600 hover:underline"
                                >
                                  remover
                                </button>
                              )}
                            </div>
                          ))}

                          <div className="flex items-center gap-4 pt-0.5">
                            <button type="button" onClick={() => addPeriod(day)} className="text-xs text-blue-600 hover:underline">
                              + adicionar período
                            </button>
                            {periods.length > 0 && (
                              <button type="button" onClick={() => copiarParaOsOutros(day)} className="text-xs text-slate-500 hover:underline">
                                copiar para os outros dias
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Duração padrão (min)</span>
              <select
                value={form.data.schedule.slot_minutes}
                onChange={(e) => form.setData('schedule', { ...form.data.schedule, slot_minutes: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {SLOTS.map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Antecedência mínima (min)</span>
              <input
                type="number"
                min={0}
                max={10080}
                value={form.data.schedule.min_lead_minutes}
                onChange={(e) => form.setData('schedule', { ...form.data.schedule, min_lead_minutes: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">0 = sem restrição</span>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Antecedência máxima (dias)</span>
              <input
                type="number"
                min={1}
                max={365}
                value={form.data.schedule.max_lead_days}
                onChange={(e) => form.setData('schedule', { ...form.data.schedule, max_lead_days: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {Object.keys(form.errors).length > 0 && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {Object.values(form.errors)[0]}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={form.processing}
              className="bg-blue-600 text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-blue-700 disabled:opacity-60"
            >
              {form.processing ? 'Salvando…' : 'Salvar horários'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
