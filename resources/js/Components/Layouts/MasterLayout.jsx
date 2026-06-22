import { Link, usePage, router } from '@inertiajs/react';

const NAV = [
  { name: 'Visão geral', href: '/master', match: (u) => u === '/master' || u === '/master/' },
  { name: 'Clínicas', href: '/master/clinicas', match: (u) => u.startsWith('/master/clinicas') },
];

const initials = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export default function MasterLayout({ children }) {
  const { auth } = usePage().props;
  const url = usePage().url;

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
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 underline">Voltar ao CRM</Link>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold">{auth?.user?.name}</span>
                <span className="text-[11px] text-amber-400">Master</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 grid place-items-center text-sm font-bold">{initials(auth?.user?.name)}</div>
            </div>
            <button onClick={() => router.post('/logout')} className="text-xs text-slate-400 hover:text-rose-400">Sair</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
