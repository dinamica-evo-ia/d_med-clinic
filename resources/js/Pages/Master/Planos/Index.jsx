import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const brl = (v) => v == null ? 'Sob consulta' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const lim = (v) => v == null ? '∞' : v;

export default function Index({ plans }) {
  const { flash } = usePage().props;
  const [editing, setEditing] = useState(null);

  return (
    <div className="space-y-6">
      {flash?.success && <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-sm text-emerald-200">{flash.success}</div>}

      <div>
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-sm text-slate-400 mt-1">Preço, limites e serviços de cada plano. O que você edita aqui vale pra cobrança, limites de vagas e a página de planos.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div key={p.id} className={`rounded-2xl border p-5 flex flex-col ${p.is_active ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-800/30 border-slate-700/40 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">{p.name}</h2>
              {!p.is_active && <span className="text-[10px] uppercase tracking-wider text-slate-400 border border-slate-600 rounded px-1.5 py-0.5">Inativo</span>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
            <div className="mt-3 text-2xl font-bold text-amber-300">{brl(p.price)}<span className="text-xs font-normal text-slate-400">{p.price != null ? '/mês' : ''}</span></div>
            <div className="mt-2 text-xs text-slate-400">{lim(p.doctors)} médico(s) · {lim(p.staff)} staff</div>
            <ul className="mt-3 space-y-1 text-xs text-slate-300 flex-1">
              {(p.features || []).map((f, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-400">•</span>{f}</li>)}
            </ul>
            <button onClick={() => setEditing(p)} className="mt-4 px-3 py-2 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-400">Editar</button>
          </div>
        ))}
      </div>

      {editing && <EditModal plan={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditModal({ plan, onClose }) {
  const [form, setForm] = useState({
    name: plan.name, description: plan.description || '',
    price: plan.price ?? '', doctors: plan.doctors ?? '', staff: plan.staff ?? '',
    features: (plan.features || []).join('\n'), is_active: plan.is_active,
  });
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    router.put(`/master/planos/${plan.id}`, {
      name: form.name,
      description: form.description,
      price: form.price === '' ? null : Number(form.price),
      doctors: form.doctors === '' ? null : parseInt(form.doctors, 10),
      staff: form.staff === '' ? null : parseInt(form.staff, 10),
      features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
      is_active: form.is_active,
    }, { preserveScroll: true, onFinish: () => { setSaving(false); onClose(); } });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold">Editar plano · {plan.key}</h2>
        <F label="Nome"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></F>
        <F label="Descrição"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} /></F>
        <div className="grid grid-cols-3 gap-3">
          <F label="Preço (R$/mês)"><input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="vazio = sob consulta" className={inp} /></F>
          <F label="Médicos"><input type="number" min="1" value={form.doctors} onChange={(e) => setForm({ ...form, doctors: e.target.value })} placeholder="vazio = ∞" className={inp} /></F>
          <F label="Staff"><input type="number" min="0" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} placeholder="vazio = ∞" className={inp} /></F>
        </div>
        <F label="Serviços (um por linha)">
          <textarea rows={6} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className={inp} />
        </F>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-slate-600 bg-slate-800 text-amber-500" />
          Plano ativo (disponível para novas clínicas)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
          <button disabled={saving} className="px-4 py-2 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}

const inp = "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm";
function F({ label, children }) {
  return (<label className="block"><span className="text-xs text-slate-400">{label}</span><div className="mt-1">{children}</div></label>);
}
