import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export default function Form({ plans, statuses }) {
  const form = useForm({
    name: '', slug: '', email: '', document: '', phone: '',
    plan: 'solo', status: 'trial',
    admin_name: '', admin_email: '', admin_password: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const submit = (e) => { e.preventDefault(); form.post('/master/clinicas'); };

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/master/clinicas" className="text-sm text-slate-400 hover:text-slate-200">← Voltar</Link>
      <div>
        <h1 className="text-2xl font-bold">Nova clínica</h1>
        <p className="text-sm text-slate-400 mt-1">Cria a clínica (tenant) e o admin inicial em um passo.</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <section className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Dados da clínica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Nome" err={form.errors.name}>
              <input required value={form.data.name}
                onChange={(e) => { form.setData('name', e.target.value); if (!form.data.slug) form.setData('slug', slugify(e.target.value)); }}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            </F>
            <F label="Slug (identificador único)" err={form.errors.slug}>
              <input required value={form.data.slug} onChange={(e) => form.setData('slug', slugify(e.target.value))}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono" />
            </F>
            <F label="E-mail" err={form.errors.email}>
              <input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            </F>
            <F label="Telefone" err={form.errors.phone}>
              <input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            </F>
            <F label="CNPJ" err={form.errors.document}>
              <input value={form.data.document} onChange={(e) => form.setData('document', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            </F>
            <F label="Plano" err={form.errors.plan}>
              <select value={form.data.plan} onChange={(e) => form.setData('plan', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                {Object.entries(plans).map(([k, p]) => (
                  <option key={k} value={k}>{p.name} — {p.doctors ?? '∞'} médico(s), {p.staff ?? '∞'} staff</option>
                ))}
              </select>
            </F>
            <F label="Status inicial" err={form.errors.status}>
              <select value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                {Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </F>
          </div>
        </section>

        <section className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Admin inicial</h2>
          <p className="text-xs text-slate-500">Quem vai gerenciar a clínica do lado dela. Se o e-mail já existir como usuário, ele será associado à nova clínica.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Nome" err={form.errors.admin_name}>
              <input required value={form.data.admin_name} onChange={(e) => form.setData('admin_name', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            </F>
            <F label="E-mail" err={form.errors.admin_email}>
              <input type="email" required value={form.data.admin_email} onChange={(e) => form.setData('admin_email', e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            </F>
            <F label="Senha (mín. 8)" err={form.errors.admin_password}>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} required minLength={8} value={form.data.admin_password}
                  onChange={(e) => form.setData('admin_password', e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm pr-16" />
                <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}
                  className="absolute inset-y-0 right-2 text-xs text-slate-400 hover:text-slate-200">{showPwd ? 'ocultar' : 'mostrar'}</button>
              </div>
            </F>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Link href="/master/clinicas" className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</Link>
          <button disabled={form.processing} className="px-5 py-2 bg-amber-500 text-slate-900 font-semibold text-sm rounded-lg hover:bg-amber-400 disabled:opacity-50">
            {form.processing ? 'Criando…' : 'Criar clínica'}
          </button>
        </div>
      </form>
    </div>
  );
}

function F({ label, err, children }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
      {err && <span className="block mt-1 text-xs text-rose-400">{err}</span>}
    </label>
  );
}
