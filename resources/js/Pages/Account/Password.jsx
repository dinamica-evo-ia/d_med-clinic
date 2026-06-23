import { Link, useForm, usePage } from '@inertiajs/react';

export default function Password() {
  const { flash } = usePage().props;
  const form = useForm({ current_password: '', password: '', password_confirmation: '' });
  const submit = (e) => { e.preventDefault(); form.put('/account/password', { onSuccess: () => form.reset() }); };
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alterar senha</h1>
        <p className="text-sm text-slate-500 mt-1">Mínimo 8 caracteres. Use combinação de letras, números e símbolos.</p>
      </div>
      {flash?.success && <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{flash.success}</div>}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <F label="Senha atual" err={form.errors.current_password}>
          <input type="password" required value={form.data.current_password} onChange={(e) => form.setData('current_password', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </F>
        <F label="Nova senha" err={form.errors.password}>
          <input type="password" required minLength={8} value={form.data.password} onChange={(e) => form.setData('password', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </F>
        <F label="Confirmar nova senha">
          <input type="password" required minLength={8} value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </F>
        <button disabled={form.processing} className="w-full bg-blue-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-blue-700 disabled:opacity-60">
          {form.processing ? 'Salvando…' : 'Alterar senha'}
        </button>
      </form>
    </div>
  );
}

function F({ label, err, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {err && <span className="block mt-1 text-xs text-rose-600">{err}</span>}
    </label>
  );
}
