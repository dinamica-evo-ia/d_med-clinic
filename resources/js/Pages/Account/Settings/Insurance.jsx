import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

/*
 * Convênios aceitos pela clínica. É daqui que sai o <select> do agendamento manual E a lista
 * que a IA pode oferecer no WhatsApp — as duas pontas leem do mesmo cadastro pra nunca
 * divergirem (antes era texto livre nos dois lados).
 */
const VAZIO = { name: '', notes: '', all_doctors: true, is_active: true, doctor_ids: [] };

export default function Insurance() {
  const { plans = [], doctors = [], flash, errors = {} } = usePage().props;
  const [form, setForm] = useState(null);      // null = nenhum aberto
  const [salvando, setSalvando] = useState(false);

  const abrirNovo = () => setForm({ ...VAZIO });
  const abrirEdicao = (p) => setForm({ ...p, notes: p.notes || '', doctor_ids: [...(p.doctor_ids || [])] });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleMedico = (id) => set({
    doctor_ids: form.doctor_ids.includes(id)
      ? form.doctor_ids.filter((x) => x !== id)
      : [...form.doctor_ids, id],
  });

  const salvar = (e) => {
    e.preventDefault();
    setSalvando(true);
    const payload = {
      name: form.name,
      notes: form.notes || null,
      all_doctors: form.all_doctors,
      is_active: form.is_active,
      doctor_ids: form.all_doctors ? [] : form.doctor_ids,
    };
    const opts = {
      preserveScroll: true,
      onSuccess: () => setForm(null),
      onFinish: () => setSalvando(false),
    };
    if (form.id) router.put(`/account/settings/insurance/${form.id}`, payload, opts);
    else router.post('/account/settings/insurance', payload, opts);
  };

  const remover = (p) => {
    if (!window.confirm(`Remover ${p.name} da lista? As consultas já marcadas continuam com o nome do convênio.`)) return;
    router.delete(`/account/settings/insurance/${p.id}`, { preserveScroll: true });
  };

  const nomeDoMedico = (id) => doctors.find((d) => d.id === id)?.name || '—';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/account/settings/doctor" className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Convênios aceitos</h1>
          <p className="text-sm text-slate-500 mt-1">
            O que estiver aqui é o que aparece na hora de marcar a consulta — no CRM e no WhatsApp.
            Convênio que não está nesta lista não pode ser escolhido.
          </p>
        </div>
        {!form && (
          <button onClick={abrirNovo} className="shrink-0 bg-blue-600 text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-blue-700">
            + Novo convênio
          </button>
        )}
      </div>

      {flash?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{flash.success}</div>
      )}

      {form && (
        <form onSubmit={salvar} className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">{form.id ? 'Editar convênio' : 'Novo convênio'}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Nome *</span>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} required maxLength={120}
                placeholder="Unimed, Bradesco Saúde, IPE…"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${errors.name ? 'border-rose-400' : 'border-slate-200'}`} />
              {errors.name && <span className="text-xs text-rose-600 mt-1 block">{errors.name}</span>}
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Observação (opcional)</span>
              <input value={form.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={160}
                placeholder="Precisa de guia · só consulta"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-700">Quem atende por este convênio</span>
            <div className="mt-1 flex rounded-lg bg-slate-100 p-0.5 max-w-sm">
              {[[true, 'Todos os médicos'], [false, 'Só alguns']].map(([v, l]) => (
                <button key={String(v)} type="button" onClick={() => set({ all_doctors: v })}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${form.all_doctors === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
              ))}
            </div>
            {!form.all_doctors && (
              <div className="mt-2 space-y-1.5">
                {doctors.length === 0 && <p className="text-sm text-slate-400">Nenhum médico ativo cadastrado.</p>}
                {doctors.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.doctor_ids.includes(d.id)} onChange={() => toggleMedico(d.id)}
                      className="rounded border-slate-300 text-blue-600" />
                    {d.name}
                  </label>
                ))}
                {form.doctor_ids.length === 0 && (
                  <p className="text-xs text-amber-600">Sem nenhum médico marcado, este convênio não vai aparecer em lugar nenhum.</p>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })}
              className="rounded border-slate-300 text-blue-600" />
            Aceitando no momento
            <span className="text-xs text-slate-400">— desmarque pra suspender sem perder o cadastro</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={salvando}
              className="bg-blue-600 text-white text-sm font-semibold rounded-lg px-5 py-2 hover:bg-blue-700 disabled:opacity-60">
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setForm(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {plans.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">Nenhum convênio cadastrado ainda.</p>
            <p className="text-xs text-slate-400 mt-1">
              Enquanto a lista estiver vazia, quem marcar consulta por convênio digita o nome na mão.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${p.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{p.name}</span>
                    {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">suspenso</span>}
                    {!p.all_doctors && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                        {p.doctor_ids.length ? p.doctor_ids.map(nomeDoMedico).join(', ') : 'nenhum médico marcado'}
                      </span>
                    )}
                  </div>
                  {p.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{p.notes}</p>}
                </div>
                <button onClick={() => abrirEdicao(p)} className="text-xs text-blue-600 hover:underline">editar</button>
                <button onClick={() => remover(p)} className="text-xs text-rose-600 hover:underline">remover</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-400">
        A clínica também escolhe se aceita <strong>particular, convênio ou os dois</strong> na tela do
        Atendente — se ela só aceita particular, esta lista não aparece em lugar nenhum.
      </p>
    </div>
  );
}
