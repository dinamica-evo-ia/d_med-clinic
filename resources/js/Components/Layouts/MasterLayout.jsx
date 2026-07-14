import { Link, usePage, router, useForm } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

const NAV = [
  { name: 'Visão geral', href: '/master', match: (u) => u === '/master' || u === '/master/' },
  { name: 'Clínicas', href: '/master/clinicas', match: (u) => u.startsWith('/master/clinicas') },
  { name: 'Planos', href: '/master/planos', match: (u) => u.startsWith('/master/planos') },
  { name: 'Farmácias', href: '/master/farmacias', match: (u) => u.startsWith('/master/farmacias') },
];

const initials = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export default function MasterLayout({ children }) {
  const { auth, flash } = usePage().props;
  const url = usePage().url;
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 h-16">
          <Link href="/master" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 font-bold">M</span>
            <span className="text-lg font-bold tracking-tight">D_Med <span className="text-amber-400">Master</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {NAV.map((item) => {
              const active = item.match(url);
              return (
                <Link key={item.href} href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${active ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'}`}>
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 group">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-semibold">{auth?.user?.name}</span>
                  <span className="text-[11px] text-amber-400">Master</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 grid place-items-center text-sm font-bold">{initials(auth?.user?.name)}</div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-700/70">
                    <p className="text-sm font-semibold truncate">{auth?.user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{auth?.user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button onClick={() => { setPwOpen(true); setMenuOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 rounded-lg">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
                      Alterar senha
                    </button>
                    <a href="/" className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-700/60 rounded-lg">
                      <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l9-9 9 9M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Ir para o CRM
                    </a>
                    <button onClick={() => router.post('/logout')} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {flash?.success && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-sm text-emerald-200">{flash.success}</div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-6 lg:p-8">{children}</main>

      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}

function PasswordModal({ onClose }) {
  const frm = useForm({ current_password: '', password: '', password_confirmation: '' });
  const submit = (e) => {
    e.preventDefault();
    frm.put('/master/account/password', { preserveScroll: true, onSuccess: () => { frm.reset(); onClose(); } });
  };
  const field = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none';
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-slate-100">
        <h2 className="text-lg font-bold">Alterar senha</h2>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Senha atual</label>
          <input type="password" value={frm.data.current_password} onChange={(e) => frm.setData('current_password', e.target.value)} className={field} autoComplete="current-password" />
          {frm.errors.current_password && <p className="text-xs text-rose-400 mt-1">{frm.errors.current_password}</p>}
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Nova senha</label>
          <input type="password" value={frm.data.password} onChange={(e) => frm.setData('password', e.target.value)} className={field} autoComplete="new-password" />
          {frm.errors.password && <p className="text-xs text-rose-400 mt-1">{frm.errors.password}</p>}
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Confirmar nova senha</label>
          <input type="password" value={frm.data.password_confirmation} onChange={(e) => frm.setData('password_confirmation', e.target.value)} className={field} autoComplete="new-password" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
          <button type="submit" disabled={frm.processing} className="px-5 py-2 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-50">{frm.processing ? 'Salvando…' : 'Salvar senha'}</button>
        </div>
      </form>
    </div>
  );
}
