import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

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

  const updateLunch = (day, patch) => {
    const current = form.data.schedule.days[day].lunch || { start: '', end: '' };
    updateDay(day, { lunch: { ...current, ...patch } });
  };

  const removeLunch = (day) => updateDay(day, { lunch: null });
  const addLunch    = (day) => updateDay(day, { lunch: { start: '12:00', end: '13:30' } });

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
            <div className="px-5 py-3 border-b border-slate-200 text-sm font-semibold text-slate-800">Expediente semanal</div>
            <div className="divide-y divide-slate-100">
              {DAY_ORDER.map((day) => {
                const d = form.data.schedule.days[day];
                const active = !!d.active;
                return (
                  <div key={day} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                    <label className="col-span-3 flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => updateDay(day, { active: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span className={`text-sm font-medium ${active ? 'text-slate-900' : 'text-slate-400'}`}>{DAY_LABELS[day]}</span>
                    </label>

                    <div className="col-span-3 flex items-center gap-2">
                      <input
                        type="time"
                        value={d.open}
                        onChange={(e) => updateDay(day, { open: e.target.value })}
                        disabled={!active}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                      />
                      <span className="text-slate-400 text-xs">até</span>
                      <input
                        type="time"
                        value={d.close}
                        onChange={(e) => updateDay(day, { close: e.target.value })}
                        disabled={!active}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>

                    <div className="col-span-6 flex items-center gap-2">
                      {d.lunch ? (
                        <>
                          <span className="text-xs text-slate-500 whitespace-nowrap">Almoço</span>
                          <input
                            type="time"
                            value={d.lunch.start || ''}
                            onChange={(e) => updateLunch(day, { start: e.target.value })}
                            disabled={!active}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50"
                          />
                          <span className="text-slate-400 text-xs">até</span>
                          <input
                            type="time"
                            value={d.lunch.end || ''}
                            onChange={(e) => updateLunch(day, { end: e.target.value })}
                            disabled={!active}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={() => removeLunch(day)}
                            disabled={!active}
                            className="text-xs text-rose-600 hover:underline disabled:text-slate-300"
                          >
                            remover
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addLunch(day)}
                          disabled={!active}
                          className="text-xs text-blue-600 hover:underline disabled:text-slate-300"
                        >
                          + adicionar pausa de almoço
                        </button>
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
