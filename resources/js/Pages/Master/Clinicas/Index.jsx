import { Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

const STATUS_COLORS = {
  pending: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  trial: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  past_due: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  suspended: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  cancelled: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const daysLeft = (end) => {
  if (!end) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const e = new Date(end + 'T00:00:00');
  return Math.round((e - t) / 86400000);
};
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

export default function Index({ tenants, filters, plans, statuses }) {
  const { flash } = usePage().props;
  const [search, setSearch] = useState(filters?.search || '');
  const [status, setStatus] = useState(filters?.status || '');
  const [editing, setEditing] = useState(null);
  const [apiKeysFor, setApiKeysFor] = useState(null);
  const [usersFor, setUsersFor] = useState(null);

  const apply = () => router.get('/master/clinicas', { search: search || undefined, status: status || undefined }, { preserveState: true, replace: true });

  const impersonate = (t) => {
    if (confirm(`Entrar como administrador da clínica "${t.name}"?`)) {
      router.post(`/master/impersonate/${t.id}`);
    }
  };
  const cancel = (t) => {
    if (confirm(`Cancelar a clínica "${t.name}"? (não apaga dados; pode reativar mudando status)`)) {
      router.delete(`/master/clinicas/${t.id}`, { preserveScroll: true });
    }
  };
  const reactivate = (t) => {
    if (confirm(`Reativar a clínica "${t.name}"? (status volta pra Ativo)`)) {
      router.post(`/master/clinicas/${t.id}/reactivate`, {}, { preserveScroll: true });
    }
  };
  const extendTrial = (t) => {
    const days = parseInt(window.prompt(`Estender o trial de "${t.name}" por quantos dias?`, '7') || '', 10);
    if (days > 0) router.post(`/master/clinicas/${t.id}/extend-trial`, { days }, { preserveScroll: true });
  };
  const approve = (t) => {
    if (confirm(`Aprovar a clínica "${t.name}" e liberar o teste grátis de 7 dias?`)) {
      router.post(`/master/clinicas/${t.id}/approve`, {}, { preserveScroll: true });
    }
  };
  const apagar = (t) => {
    const typed = window.prompt(`⚠️ Isto APAGA EM DEFINITIVO a clínica "${t.name}", a conta e TODOS os dados — sem volta.\n\nPara confirmar, digite o nome exato da clínica:`);
    if (typed === null) return;
    if (typed.trim() === (t.name || '').trim()) {
      router.delete(`/master/clinicas/${t.id}/force`, { preserveScroll: true });
    } else {
      alert('O nome não confere. Nada foi apagado.');
    }
  };

  const pendingCount = tenants.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      {flash?.success && <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-sm text-emerald-200">{flash.success}</div>}
      {flash?.error && <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-4 py-2 text-sm text-rose-200">{flash.error}</div>}

      {pendingCount > 0 && (
        <div className="rounded-lg bg-purple-500/15 border border-purple-500/30 px-4 py-2.5 text-sm text-purple-200">
          <span className="font-semibold">{pendingCount} conta(s) aguardando aprovação</span> <span className="text-purple-300/70">— revise e clique em “Aprovar” pra liberar o teste de 7 dias.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clínicas</h1>
          <p className="text-sm text-slate-400 mt-1">{tenants.length} cadastrada(s)</p>
        </div>
        <Link href="/master/clinicas/create" className="px-4 py-2 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-400">+ Nova clínica</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="Buscar nome/slug/email…" className="flex-1 min-w-[200px] rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm placeholder-slate-500" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setTimeout(apply, 0); }} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={apply} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Filtrar</button>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Clínica</th>
              <th className="text-left px-3 py-3">Plano</th>
              <th className="text-left px-3 py-3">Uso</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 && (
              <tr><td colSpan="5" className="text-center py-10 text-slate-500">Nenhuma clínica.</td></tr>
            )}
            {tenants.map((t) => {
              const plan = plans[t.plan] || { name: t.plan, doctors: null, staff: null };
              const dl = plan.doctors === null ? '∞' : plan.doctors;
              const sl = plan.staff === null ? '∞' : plan.staff;
              const overDoctors = plan.doctors !== null && t.doctors > plan.doctors;
              const overStaff = plan.staff !== null && t.staff > plan.staff;
              return (
                <tr key={t.id} className="border-t border-slate-700/40 hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100">{t.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{t.codigo || t.slug}{t.email ? ` · ${t.email}` : ''}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">{plan.name}</span>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className={overDoctors ? 'text-rose-300' : 'text-slate-300'}>{t.doctors}/{dl} médicos</div>
                    <div className={overStaff ? 'text-rose-300' : 'text-slate-300'}>{t.staff}/{sl} staff</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_COLORS[t.status] || 'bg-slate-700/30 text-slate-300 border-slate-600/30'}`}>{statuses[t.status] || t.status}</span>
                    {t.status === 'trial' && t.trial_ends_at && (() => {
                      const d = daysLeft(t.trial_ends_at);
                      const tone = d < 0 ? 'text-rose-300' : d <= 3 ? 'text-amber-300' : 'text-slate-400';
                      const txt = d < 0 ? `vencido há ${-d}d` : d === 0 ? 'vence hoje' : `vence em ${d}d`;
                      return <div className={`mt-1 text-[11px] ${tone}`}>{txt} · {fmtDate(t.trial_ends_at)}</div>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
                      {t.status === 'pending' && <button onClick={() => approve(t)} className="text-emerald-300 hover:text-emerald-200 font-semibold">Aprovar</button>}
                      <button onClick={() => setEditing(t)} className="text-slate-300 hover:text-amber-300">Editar</button>
                      <button onClick={() => setApiKeysFor(t)} className="text-teal-300 hover:text-teal-200">API</button>
                      <button onClick={() => setUsersFor(t)} className="text-fuchsia-300 hover:text-fuchsia-200">Senha</button>
                      <button onClick={() => impersonate(t)} className="text-sky-300 hover:text-sky-200">Entrar</button>
                      {t.status === 'trial' && <button onClick={() => extendTrial(t)} className="text-indigo-300 hover:text-indigo-200">Estender</button>}
                      {t.status !== 'active' && t.status !== 'cancelled' && t.status !== 'pending' && <button onClick={() => reactivate(t)} className="text-emerald-300 hover:text-emerald-200">Reativar</button>}
                      {t.status !== 'cancelled' && <button onClick={() => cancel(t)} className="text-rose-300 hover:text-rose-200">Cancelar</button>}
                      <button onClick={() => apagar(t)} className="text-rose-500 hover:text-rose-400 font-semibold">Apagar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <EditModal tenant={editing} plans={plans} statuses={statuses} onClose={() => setEditing(null)} />}
      {apiKeysFor && <ApiKeysModal tenant={apiKeysFor} onClose={() => setApiKeysFor(null)} />}
      {usersFor && <UsersPasswordModal tenant={usersFor} onClose={() => setUsersFor(null)} />}
    </div>
  );
}

function ApiKeysModal({ tenant, onClose }) {
  const [keys, setKeys] = useState(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  const base = `/master/clinicas/${tenant.id}/api-keys`;
  const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  useEffect(() => {
    window.axios.get(base).then(({ data }) => setKeys(data.keys)).catch(() => setKeys([]));
  }, [tenant.id]);

  const generate = () => {
    setBusy(true); setToken('');
    window.axios.post(base, { name: 'D_Agent Atende' })
      .then(({ data }) => { setToken(data.token); setKeys(data.keys); })
      .catch((e) => alert(e?.response?.data?.error || 'Erro ao gerar a chave.'))
      .finally(() => setBusy(false));
  };
  const revoke = (id) => {
    if (!confirm('Revogar esta chave? Integrações que a usam param de funcionar na hora.')) return;
    window.axios.delete(`${base}/${id}`).then(({ data }) => setKeys(data.keys));
  };
  const copy = () => { navigator.clipboard?.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold">Chaves de API · {tenant.name}</h2>
          <p className="text-xs text-slate-400 mt-1">Usadas por integrações externas (ex.: D_Agent Atende) pra ler a agenda e marcar consultas nesta clínica.</p>
        </div>

        {token && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <div className="text-xs text-amber-200 font-semibold">Copie agora — o token não será mostrado de novo:</div>
            <div className="flex gap-2">
              <code className="flex-1 break-all text-xs bg-slate-950/60 rounded px-2 py-1.5 text-amber-100">{token}</code>
              <button onClick={copy} className="px-2.5 py-1 bg-amber-500 text-slate-900 text-xs font-semibold rounded hover:bg-amber-400 whitespace-nowrap">{copied ? 'Copiado!' : 'Copiar'}</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {keys === null && <div className="text-sm text-slate-400">Carregando…</div>}
          {keys?.length === 0 && <div className="text-sm text-slate-500">Nenhuma chave ainda.</div>}
          {keys?.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/60 border border-slate-700/60 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{k.name} <span className="text-slate-500 font-normal">· {k.prefix}…</span></div>
                <div className="text-[11px] text-slate-500">último uso: {fmt(k.last_used_at)} · criada: {fmt(k.created_at)}</div>
              </div>
              <button onClick={() => revoke(k.id)} className="text-rose-300 hover:text-rose-200 text-xs whitespace-nowrap">Revogar</button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button onClick={generate} disabled={busy} className="px-4 py-2 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50">{busy ? 'Gerando…' : '+ Gerar nova chave'}</button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function UsersPasswordModal({ tenant, onClose }) {
  const [users, setUsers] = useState(null);
  const [pw, setPw] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [doneId, setDoneId] = useState(null);
  const [err, setErr] = useState({});
  const base = `/master/clinicas/${tenant.id}/users`;
  const roleLabel = { admin: 'Administrador', doctor: 'Médico(a)', receptionist: 'Secretária' };

  useEffect(() => {
    window.axios.get(base).then(({ data }) => setUsers(data.users || [])).catch(() => setUsers([]));
  }, [tenant.id]);

  const gen = (id) => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setPw((p) => ({ ...p, [id]: s }));
    setErr((e) => ({ ...e, [id]: null }));
  };
  const save = (u) => {
    const password = (pw[u.id] || '').trim();
    if (password.length < 8) { setErr((e) => ({ ...e, [u.id]: 'Mínimo 8 caracteres.' })); return; }
    setBusyId(u.id); setErr((e) => ({ ...e, [u.id]: null }));
    window.axios.put(`${base}/${u.id}/password`, { password })
      .then(() => { setDoneId(u.id); setTimeout(() => setDoneId(null), 4000); })
      .catch((e) => setErr((er) => ({ ...er, [u.id]: e?.response?.data?.errors?.password?.[0] || 'Erro ao salvar.' })))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-bold">Senhas · {tenant.name}</h2>
          <p className="text-xs text-slate-400 mt-1">Defina uma nova senha para um login desta clínica e repasse ao cliente.</p>
        </div>

        {users === null && <div className="text-sm text-slate-400">Carregando…</div>}
        {users?.length === 0 && <div className="text-sm text-slate-500">Nenhum usuário nesta clínica.</div>}

        <div className="space-y-2">
          {users?.map((u) => (
            <div key={u.id} className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-3">
              <div className="text-sm font-medium">{u.name} <span className="text-slate-500 font-normal">· {roleLabel[u.role] || u.role}</span></div>
              <div className="text-[11px] text-slate-500">{u.email}</div>
              <div className="mt-2 flex gap-2">
                <input type="text" value={pw[u.id] || ''} onChange={(e) => setPw((p) => ({ ...p, [u.id]: e.target.value }))}
                  placeholder="Nova senha" className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm font-mono" />
                <button onClick={() => gen(u.id)} title="Gerar senha" className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">Gerar</button>
                <button onClick={() => save(u)} disabled={busyId === u.id} className="px-3 py-1.5 bg-amber-500 text-slate-900 text-xs font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50 whitespace-nowrap">{busyId === u.id ? '…' : 'Definir'}</button>
              </div>
              {err[u.id] && <p className="text-[11px] text-rose-400 mt-1">{err[u.id]}</p>}
              {doneId === u.id && <p className="text-[11px] text-emerald-300 mt-1">✓ Senha redefinida — repasse <span className="font-mono font-semibold">{pw[u.id]}</span> ao cliente.</p>}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ tenant, plans, statuses, onClose }) {
  const [form, setForm] = useState({
    name: tenant.name, email: tenant.email || '', document: tenant.document || '',
    phone: tenant.phone || '', plan: tenant.plan, status: tenant.status,
  });
  const [saving, setSaving] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    router.put(`/master/clinicas/${tenant.id}`, form, {
      preserveScroll: true,
      onFinish: () => { setSaving(false); onClose(); },
    });
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-slate-100">
        <h2 className="text-lg font-bold">Editar clínica</h2>
        <F label="Nome"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="E-mail"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" /></F>
          <F label="Telefone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" /></F>
        </div>
        <F label="CNPJ"><input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Plano">
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              {Object.entries(plans).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
            </select>
          </F>
          <F label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              {Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </F>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
          <button disabled={saving} className="px-4 py-2 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}

function F({ label, children }) {
  return (<label className="block"><span className="text-xs text-slate-400">{label}</span><div className="mt-1">{children}</div></label>);
}
