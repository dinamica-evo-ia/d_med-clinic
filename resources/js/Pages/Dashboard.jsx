import { Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { useAppChrome } from '@/Components/Layouts/AppChrome';
import UserMenu from '@/Components/Layouts/UserMenu';

const TZ = 'America/Sao_Paulo';
const _fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const toSP = (d) => {
  const p = {};
  _fmt.formatToParts(d).forEach((x) => { p[x.type] = x.value; });
  const h = p.hour === '24' ? 0 : Number(p.hour);
  return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), h, Number(p.minute), Number(p.second));
};
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const STATUS = {
  scheduled: { label: 'Agendado', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700' },
  confirmed: { label: 'Confirmado', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  in_progress: { label: 'Em andamento', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Concluído', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelado', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' },
  no_show: { label: 'Faltou', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700' },
};
const TYPE_LABEL = { consultation: 'Consulta', followup: 'Retorno', exam: 'Exame', other: 'Outro' };

const ICONS = {
  users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  check: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  x: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  cake: 'M12 2.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125s1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125zM4.5 9.75A2.25 2.25 0 016.75 7.5h10.5a2.25 2.25 0 012.25 2.25v.621c-.54.183-1.125.51-1.125 1.254 0 .81.69 1.125 1.125 1.125v5.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-5.5c.435 0 1.125-.315 1.125-1.125 0-.744-.585-1.07-1.125-1.254z',
  sparkle: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  arrow: 'M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
};
function Icon({ n, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[n]} />
    </svg>
  );
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}
const AVATAR_COLORS = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700'];
const colorFor = (s) => AVATAR_COLORS[(s || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export default function Dashboard({ agenda = [], stats = {}, week_summary = [], birthdays_today = [], birthdays_week = [] }) {
  const { auth, tenant, impersonating } = usePage().props;
  const { openMobileMenu } = useAppChrome();
  const firstName = auth?.user?.name?.split(' ')[0] || '';
  const now = useMemo(() => toSP(new Date()), []);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const dateLabel = cap(now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));

  const nextAppt = agenda.find((a) => a.is_next);
  const attendedPct = stats.patients_today ? Math.round((stats.attended_today / stats.patients_today) * 100) : 0;
  const weekMax = Math.max(1, ...week_summary.map((d) => d.total));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 px-6 sm:px-8 pt-5 pb-14 text-white shadow-lg">
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-indigo-400/20 blur-3xl" />
        </div>

        {/* Chrome: hamburger (mobile) + atalho master + usuário — substitui a barra de topo nesta página */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
          <button className="lg:hidden -ml-1.5 p-1.5 rounded-lg text-blue-100 hover:bg-white/10" onClick={openMobileMenu} aria-label="Abrir menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {auth?.isMaster && !impersonating && (
              <Link href="/master" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-100 bg-white/10 border border-white/20 px-2.5 py-1 rounded-full hover:bg-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" /> Painel Master
              </Link>
            )}
            <UserMenu user={auth?.user} role={auth?.role} tenant={tenant} isMaster={auth?.isMaster} dark />
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">{dateLabel}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight flex items-center gap-2">
              A Clínica Hoje
              <Icon n="sparkle" className="w-6 h-6 text-blue-200" />
            </h1>
            <p className="mt-1.5 text-blue-100 text-sm">{greeting}{firstName ? `, ${firstName}` : ''}. Aqui está o resumo do seu dia.</p>
          </div>

          {nextAppt ? (
            <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-4 py-3 min-w-[220px]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">Próxima consulta</p>
              <p className="mt-1 text-lg font-bold">{hhmm(toSP(new Date(nextAppt.starts_at)))} <span className="text-blue-100 font-normal text-sm">· {nextAppt.patient_name}</span></p>
              <p className="text-xs text-blue-100">{nextAppt.doctor_name}</p>
            </div>
          ) : (
            <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-4 py-3 min-w-[220px]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">Hoje</p>
              <p className="mt-1 text-sm text-blue-50">Sem mais consultas pendentes para hoje.</p>
            </div>
          )}
        </div>
      </div>

      {/* KPIs — flutuando sobre o hero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 -mt-10 relative z-10 px-1">
        <KpiCard icon="users" label="Pacientes hoje" value={stats.patients_today ?? 0} accent="blue" sub={`${stats.month_appointments ?? 0} no mês`} />
        <KpiCard icon="check" label="Pacientes atendidos" value={stats.attended_today ?? 0} accent="emerald" sub={stats.patients_today ? `${attendedPct}% do dia` : 'Sem consultas hoje'} />
        <KpiCard icon="x" label="Consultas canceladas" value={stats.cancelled_today ?? 0} accent={stats.cancelled_today ? 'rose' : 'slate'} sub="Hoje" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda do dia */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Icon n="clock" className="w-5 h-5 text-slate-400" /> Agenda de hoje
            </h2>
            <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Ver agenda completa <Icon n="arrow" className="w-3.5 h-3.5" />
            </Link>
          </div>

          {agenda.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Icon n="calendar" className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhuma consulta agendada para hoje.</p>
              <Link href="/appointments/create" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium">+ Agendar consulta</Link>
            </div>
          ) : (
            <ol className="relative space-y-1 max-h-[420px] overflow-auto pr-1">
              {agenda.map((a) => {
                const st = STATUS[a.status] || STATUS.scheduled;
                return (
                  <li key={a.id}>
                    <Link href={`/appointments/${a.id}`}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50 ${a.is_next ? 'bg-blue-50/70 ring-1 ring-blue-200' : ''}`}>
                      <div className="w-14 shrink-0 text-right">
                        <span className="text-sm font-semibold text-slate-700">{hhmm(toSP(new Date(a.starts_at)))}</span>
                      </div>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {a.patient_name}
                          {a.is_next && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-blue-600">Próxima</span>}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{a.doctor_name} · {TYPE_LABEL[a.type] || a.type}</p>
                      </div>
                      <span className={`px-2 py-1 text-[11px] font-medium rounded-full shrink-0 ${st.badge}`}>{st.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Aniversariantes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Icon n="cake" className="w-5 h-5 text-slate-400" /> Aniversariantes
            </h2>

            {birthdays_today.length === 0 && birthdays_week.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">Nenhum aniversariante esta semana.</p>
            ) : (
              <div className="space-y-3">
                {birthdays_today.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colorFor(p.name)}`}>{initials(p.name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.age} anos</p>
                    </div>
                    <span className="px-2 py-1 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 shrink-0">Hoje</span>
                  </div>
                ))}
                {birthdays_week.length > 0 && (
                  <>
                    {birthdays_today.length > 0 && <div className="border-t border-slate-100 my-1" />}
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Esta semana</p>
                    {birthdays_week.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colorFor(p.name)}`}>{initials(p.name)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.age} anos</p>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{p.weekday}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Resumo da semana */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Semana em números</h2>
              <Link href="/appointments" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Ver agenda →</Link>
            </div>
            <div className="flex items-end justify-between gap-2 h-28">
              {week_summary.map((d) => {
                const h = Math.max(6, (d.total / weekMax) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className={`text-xs font-semibold ${d.is_today ? 'text-blue-600' : 'text-slate-400'}`}>{d.total || ''}</span>
                    <div className="w-full flex-1 flex items-end">
                      <div className={`w-full rounded-t-md transition-all ${d.is_today ? 'bg-blue-600' : 'bg-slate-200'}`} style={{ height: `${h}%` }} />
                    </div>
                    <span className={`text-[11px] font-medium ${d.is_today ? 'text-blue-600' : 'text-slate-500'}`}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent }) {
  const accents = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-500',
  }[accent] || 'bg-slate-100 text-slate-500';
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 flex items-center gap-4 transition hover:shadow-lg hover:-translate-y-0.5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accents}`}>
        <Icon n={icon} className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
