import { Link, usePage, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

const ICONS = {
  home: 'M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  badge: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z',
  mic: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z',
  finance: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  shield: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
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
    { name: 'A Clínica Hoje', href: '/', icon: 'home', roles: ['admin', 'doctor', 'receptionist'] },
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
const planLabel = { solo: 'Solo', pro: 'Pro', clinica: 'Clínica', enterprise: 'Enterprise' };

export default function AppLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { auth, impersonating, tenant } = usePage().props;
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

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl">
            <Sidebar url={url} role={role} onNav={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar url={url} role={role} />
      </div>

      <div className="lg:pl-64">
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
              <UserMenu user={auth?.user} role={role} tenant={tenant} isMaster={auth?.isMaster} />
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function UserMenu({ user, role, tenant, isMaster }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 group">
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold text-slate-800">{user?.name}</span>
          <span className="text-[11px] text-slate-400">{roleLabel[role] || ''}</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white grid place-items-center text-sm font-semibold ring-2 ring-transparent group-hover:ring-blue-100 transition">{initials(user?.name)}</div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            {tenant && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Clínica</span>
                  {tenant.plan && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{planLabel[tenant.plan] || tenant.plan}</span>}
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{tenant.name}</p>
                <p className="text-[10px] font-mono text-slate-400 truncate">ID: {tenant.slug || tenant.id?.slice(0, 8)}</p>
              </div>
            )}
          </div>

          <Section>
            <MItem href="/account/doctor" onClick={() => setOpen(false)} label="Editar médico / clínica" icon="user-edit" />
            <MItem href="/account/password" onClick={() => setOpen(false)} label="Alterar senha" icon="lock" />
            <MItem href="/account/plan" onClick={() => setOpen(false)} label="Planos e pagamentos" icon="card" />
          </Section>

          <Section title="Configurações">
            <MItem href="/account/settings/doctor" onClick={() => setOpen(false)} label="Médico" icon="stethoscope" />
            <MItem href="/account/settings/schedule" onClick={() => setOpen(false)} label="Agenda (dias/horários)" icon="clock" />
            <MItem href="/account/settings/print" onClick={() => setOpen(false)} label="Impressão do prontuário" icon="printer" />
            <MItem href="/account/settings/certificate" onClick={() => setOpen(false)} label="Certificado digital (assinatura)" icon="seal" />
          </Section>

          <Section>
            <MItem href="/account/sessions" onClick={() => setOpen(false)} label="Logins ativos" icon="device" />
            <MItem href="/account/suggestions" onClick={() => setOpen(false)} label="Sugestões" icon="bulb" />
            <MItem href="/account/referral" onClick={() => setOpen(false)} label="Indique um colega" icon="gift" />
          </Section>

          <div className="border-t border-slate-100 p-1.5">
            {isMaster && (
              <Link href="/master" onClick={() => setOpen(false)} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg">
                <span className="text-base">★</span> Painel Master
              </Link>
            )}
            <button onClick={() => router.post('/logout')} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border-t border-slate-100 p-1.5">
      {title && <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>}
      {children}
    </div>
  );
}

function MItem({ href, onClick, label, icon }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
      <span className="w-4 h-4 grid place-items-center text-slate-400">
        <MiniIcon n={icon} />
      </span>
      {label}
    </Link>
  );
}

function MiniIcon({ n }) {
  const paths = {
    'user-edit': <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/></>,
    'lock': <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></>,
    'card': <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
    'stethoscope': <><path d="M4 4v6a4 4 0 008 0V4"/><circle cx="18" cy="14" r="2"/><path d="M8 14a8 8 0 008 0"/></>,
    'clock': <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    'printer': <><path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></>,
    'seal': <><circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/></>,
    'device': <><rect x="3" y="5" width="14" height="11" rx="1"/><path d="M21 19h-2M7 20h6"/></>,
    'bulb': <><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12c1 1 1 2 1 3h6c0-1 0-2 1-3a7 7 0 00-4-12z"/></>,
    'gift': <><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M7 8a3 3 0 010-6c2 0 5 6 5 6s3-6 5-6a3 3 0 010 6"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      {paths[n]}
    </svg>
  );
}

function Sidebar({ url, role, onNav }) {
  const isActive = (href) => href === '/'
    ? (url === '/' || url.startsWith('/dashboard'))
    : url.startsWith(href);

  return (
    <div className="flex h-full grow flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 7v10M7 12h10" /></svg>
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900">D_Med <span className="text-blue-600">Clinic</span></span>
      </div>

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
    </div>
  );
}
