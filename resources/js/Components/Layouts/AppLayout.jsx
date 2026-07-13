import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { AppChromeContext } from './AppChrome';
import UserMenu from './UserMenu';
import logoHorizontal from '@/assets/logo-horizontal.png';
import logoIcon from '@/assets/logo-icon.png';

const ICONS = {
  home: 'M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  badge: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z',
  mic: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z',
  finance: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  shield: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  chat: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  inbox: 'M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z',
  flask: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5',
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
    { name: 'Fórmulas', href: '/formulas', icon: 'flask', roles: ['admin', 'doctor'] },
    { name: 'Médicos', href: '/doctors', icon: 'badge', roles: ['admin', 'doctor'] },
  ]},
  { section: 'Gestão', items: [
    { name: 'Financeiro', href: '/financeiro', icon: 'finance', roles: ['admin', 'doctor'], permission: 'financeiro' },
    { name: 'Relatórios', href: '/reports', icon: 'chart', roles: ['admin', 'doctor'] },
  ]},
  { section: 'Atendimento', items: [
    { name: 'Atendente', href: '/atendente', icon: 'chat', roles: ['admin', 'receptionist'] },
    { name: 'Conversas', href: '/atendente/conversas', icon: 'inbox', roles: ['admin', 'receptionist'] },
  ]},
  { section: 'Administração', items: [
    { name: 'Usuários', href: '/users', icon: 'shield', roles: ['admin'] },
  ]},
];

const SIDEBAR_COLLAPSE_KEY = 'dmed_sidebar_collapsed';

export default function AppLayout({ children }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'
  ));
  const [hovering, setHovering] = useState(false);
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);
  // Recolhida + mouse em cima → expande temporariamente (sem alterar a preferência salva)
  const visualCollapsed = collapsed && !hovering;
  // O botão de toggle fica dentro da própria sidebar: ao clicar, o mouse ainda está "em cima"
  // (hovering=true), o que mascarava o recolhimento. Forçamos hovering=false no clique
  // pra sidebar e conteúdo reagirem juntos, na mesma hora.
  const toggleCollapsed = () => {
    setHovering(false);
    setCollapsed((c) => !c);
  };

  const { auth, impersonating, tenant } = usePage().props;
  const url = usePage().url;
  const role = auth?.role;
  const permissions = auth?.permissions || [];
  // Dashboard ("A Clínica Hoje") tem chrome próprio (hamburger + usermenu) embutido no hero azul
  const isDashboard = url === '/' || url.startsWith('/dashboard');

  return (
    <AppChromeContext.Provider value={{ openMobileMenu: () => setOpen(true) }}>
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
              <Sidebar url={url} role={role} permissions={permissions} onNav={() => setOpen(false)} collapsed={false} />
            </div>
          </div>
        )}

        <div
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className={`hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:flex-col transition-[width] duration-200 ${visualCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
          <Sidebar url={url} role={role} permissions={permissions} collapsed={visualCollapsed} onToggleCollapsed={toggleCollapsed} />
        </div>

        <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
          {!isDashboard && (
            <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
              <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
                <button className="lg:hidden -ml-1 p-2 text-slate-500 hover:text-slate-800" onClick={() => setOpen(true)} aria-label="Menu">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
                </button>
                <img src={logoHorizontal} alt="D_Med Clinic" className="lg:hidden h-6 w-auto" />
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
          )}

          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </AppChromeContext.Provider>
  );
}

function Sidebar({ url, role, permissions = [], onNav, collapsed, onToggleCollapsed }) {
  // Realce: item cujo href é a correspondência MAIS LONGA da URL atual (evita pai e
  // filho acenderem juntos, ex.: /atendente vs /atendente/conversas).
  const matches = (href) => href === '/'
    ? (url === '/' || url.startsWith('/dashboard'))
    : (url === href || url.startsWith(href + '/'));
  const best = NAV.flatMap((g) => g.items.map((i) => i.href)).filter(matches).sort((a, b) => b.length - a.length)[0];
  const isActive = (href) => href === best;
  const canSee = (item) => item.roles.includes(role) || (item.permission && permissions.includes(item.permission));

  return (
    <div className="relative flex h-full grow flex-col border-r border-slate-200 bg-white">
      <div className={`flex items-center h-16 border-b border-slate-100 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        {collapsed
          ? <img src={logoIcon} alt="D_Med Clinic" className="h-8 w-8 shrink-0" />
          : <img src={logoHorizontal} alt="D_Med Clinic" className="h-8 w-auto" />}
      </div>

      <nav className={`flex-1 overflow-y-auto py-4 space-y-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV.map((group) => {
          const items = group.items.filter(canSee);
          if (!items.length) return null;
          return (
            <div key={group.section}>
              {!collapsed && <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.section}</p>}
              {collapsed && <div className="mx-2 mb-2 border-t border-slate-100" />}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.name}>
                      <Link href={item.href} onClick={onNav} title={collapsed ? item.name : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-blue-600" />}
                        <Icon n={item.icon} className={`w-5 h-5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        {!collapsed && item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {onToggleCollapsed && (
        <button onClick={onToggleCollapsed}
          className="flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
          <svg className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
    </div>
  );
}
