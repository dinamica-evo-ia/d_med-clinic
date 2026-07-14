import { Link, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

const initials = (name) => (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const roleLabel = { admin: 'Administrador', doctor: 'Médico(a)', receptionist: 'Secretária' };
const planLabel = { solo: 'Solo', pro: 'Pro', clinica: 'Clínica', enterprise: 'Enterprise' };

export default function UserMenu({ user, role, tenant, isMaster, dark = false }) {
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
          <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>{user?.name}</span>
          <span className={`text-[11px] ${dark ? 'text-blue-100' : 'text-slate-400'}`}>{roleLabel[role] || ''}</span>
        </div>
        <div className={`w-9 h-9 rounded-full grid place-items-center text-sm font-semibold ring-2 transition ${dark ? 'bg-white/15 text-white ring-white/0 group-hover:ring-white/30' : 'bg-blue-600 text-white ring-transparent group-hover:ring-blue-100'}`}>{initials(user?.name)}</div>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${dark ? 'text-blue-100' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
            {/* nome só no mobile — no desktop já aparece ao lado do avatar (evita duplicar).
                E-mail não entra aqui: é redundante e polui (a identificação útil é a clínica). */}
            <p className="text-sm font-semibold text-slate-900 sm:hidden mb-3">{user?.name}</p>
            {tenant && (
              <div className="space-y-1">
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
            <MItem href="/account/settings/print" onClick={() => setOpen(false)} label="Impressão da receita" icon="printer" />
            <MItem href="/account/settings/anamnese-templates" onClick={() => setOpen(false)} label="Modelos de anamnese" icon="template" />
            <MItem href="/account/settings/certificate" onClick={() => setOpen(false)} label="Certificado digital (assinatura)" icon="seal" />
          </Section>

          <Section>
            <MItem href="/account/settings/import-export" onClick={() => setOpen(false)} label="Importar & Exportar" icon="swap" />
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
    'template': <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    'device': <><rect x="3" y="5" width="14" height="11" rx="1"/><path d="M21 19h-2M7 20h6"/></>,
    'swap': <><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></>,
    'bulb': <><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12c1 1 1 2 1 3h6c0-1 0-2 1-3a7 7 0 00-4-12z"/></>,
    'gift': <><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M7 8a3 3 0 010-6c2 0 5 6 5 6s3-6 5-6a3 3 0 010 6"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      {paths[n]}
    </svg>
  );
}
