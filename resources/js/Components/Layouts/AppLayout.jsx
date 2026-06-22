import { Link, usePage, router } from '@inertiajs/react';
import { useState } from 'react';

const ICONS = {
  home: 'M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  badge: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z',
  mic: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z',
  finance: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  shield: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  logout: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75',
};

function Icon({ n, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[n]} />
    </svg>
  );
}

const NAV = [
  { section: 'Principal', items: [
    { name: 'Dashboard', href: '/', icon: 'home', roles: ['admin', 'doctor', 'receptionist'] },
    { name: 'Pacientes', href: '/patients', icon: 'users', roles: ['admin', 'doctor', 'receptionist'] },
    { name: 'Agenda', href: '/appointments', icon: 'calendar', roles: ['admin', 'doctor', 'receptionist'] },
  ]},
  { section: 'Clínico', items: [
    { name: 'Studio Med', href: '/studio-med', icon: 'mic', roles: ['admin', 'doctor'] },
    { name: 'Médicos', href: '/doctors', icon: 'badge', roles: ['admin', 'doctor'] },
  ]},
  { section: 'Gestão', items: [
    { name: 'Financeiro', href: '/financeiro', icon: 'finance', roles: ['admin', 'doctor'] },
    { name: 'Relatórios', href: '/reports', icon: 'chart', roles: ['admin', 'doctor'] },
  ]},
  { section: 'Administração', items: [
    { name: 'Usuários', href: '/users', icon: 'shield', roles: ['admin'] },
  ]},
];

const initials = (name) => (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const roleLabel = { admin: 'Administrador', doctor: 'Médico(a)', receptionist: 'Recepção' };

export default function AppLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { auth, impersonating } = usePage().props;
  const url = usePage().url;
  const role = auth?.role;

  return (
    <div className="min-h-screen bg-slate-50">
      {impersonating && (
        <div className="bg-amber-500 text-slate-900 text-sm font-semibold px-4 py-2 flex items-center justify-between gap-3">
          <span>⚠ Você está acessando como administrador desta clínica (modo master).</span>
          <button onClick={() => router.post('/master/impersonate/stop')} className="px-3 py-1 rounded-md bg-slate-900 text-amber-300 text-xs font-bold hover:bg-slate-800">Sair do modo</button>
        </div>
      )}
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl">
            <Sidebar url={url} role={role} user={auth?.user} onNav={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar url={url} role={role} user={auth?.user} />
      </div>

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            <button className="lg:hidden -ml-1 p-2 text-slate-500 hover:text-slate-800" onClick={() => setOpen(true)} aria-label="Menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
            </button>
            <div className="lg:hidden font-bold text-slate-900">D_Med <span className="text-blue-600">Clinic</span></div>
            <div className="ml-auto flex items-center gap-3">
              {auth?.isMaster && !impersonating && (
                <Link href="/master" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Painel Master
                </Link>
              )}
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold text-slate-800">{auth?.user?.name}</span>
                <span className="text-[11px] text-slate-400">{roleLabel[role] || ''}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-semibold">{initials(auth?.user?.name)}</div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ url, role, user, onNav }) {
  const isActive = (href) => href === '/'
    ? (url === '/' || url.startsWith('/dashboard'))
    : url.startsWith(href);

  return (
    <div className="flex h-full grow flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 7v10M7 12h10" /></svg>
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900">D_Med <span className="text-blue-600">Clinic</span></span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map((group) => {
          const items = group.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={group.section}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.section}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.name}>
                      <Link href={item.href} onClick={onNav}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-blue-600" />}
                        <Icon n={item.icon} className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User / logout */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 grid place-items-center text-sm font-semibold">{initials(user?.name)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{roleLabel[role] || ''}</p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <Link href="/select-tenant" onClick={onNav} className="flex-1 text-center text-xs text-slate-500 hover:text-slate-800 rounded-lg py-2 hover:bg-slate-50">Trocar clínica</Link>
          <button onClick={() => router.post('/logout')} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-lg px-3 py-2 hover:bg-rose-50">
            <Icon n="logout" className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
