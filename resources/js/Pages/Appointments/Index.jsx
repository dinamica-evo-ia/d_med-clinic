import { Link, router } from '@inertiajs/react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const H0 = 7, H1 = 21, ROW = 56;
const TZ = 'America/Sao_Paulo';
const STATUS = {
  scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento',
  completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou',
};

// --- timezone: converte um Date para o "relógio de parede" de São Paulo ---
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

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const startOfWeek = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; };
const startOfMonth = (d) => { const x = startOfDay(d); x.setDate(1); return x; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => new Date(String(s).replace(' ', 'T'));
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const patientOf = (ev) => (ev.title || '').split(' - ')[0] || 'Consulta';

export default function Index() {
  const [view, setView] = useState('week');
  const [cursor, setCursor] = useState(startOfDay(toSP(new Date())));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const dragRef = useRef(null);
  const today = startOfDay(toSP(new Date()));
  const nowTick = toSP(new Date());

  const range = useMemo(() => {
    if (view === 'month') { const s = startOfWeek(startOfMonth(cursor)); return [s, addDays(s, 41)]; }
    if (view === 'week') { const s = startOfWeek(cursor); return [s, addDays(s, 6)]; }
    return [startOfDay(cursor), startOfDay(cursor)];
  }, [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await window.axios.get('/api/appointments/calendar', {
        params: { start: ymd(range[0]) + ' 00:00:00', end: ymd(range[1]) + ' 23:59:59' },
      });
      setEvents((data || []).map((e) => {
        const us = parse(e.start), ue = parse(e.end || e.start);
        return { ...e, _utcS: us, _utcE: ue, _s: toSP(us), _e: toSP(ue) };
      }));
    } catch { setEvents([]); }
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const reschedule = useCallback(async (ev, deltaMs) => {
    if (!deltaMs) return;
    const ns = new Date(ev._utcS.getTime() + deltaMs);
    const ne = new Date(ev._utcE.getTime() + deltaMs);
    // atualizacao otimista
    setEvents((list) => list.map((x) => x.id === ev.id
      ? { ...x, _utcS: ns, _utcE: ne, _s: toSP(ns), _e: toSP(ne) } : x));
    try {
      await window.axios.patch(`/appointments/${ev.id}/reschedule`, {
        start: ns.toISOString(), end: ne.toISOString(),
      });
    } catch { load(); }
  }, [load]);

  const go = (n) => setCursor((c) => view === 'month' ? addMonths(c, n) : addDays(c, view === 'week' ? 7 * n : n));
  const title = view === 'month'
    ? cap(cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
    : view === 'week'
      ? `${range[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${range[1].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : cap(cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }));

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => go(-1)} className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">‹</button>
          <button onClick={() => setCursor(startOfDay(toSP(new Date())))} className="px-3 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Hoje</button>
          <button onClick={() => go(1)} className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">›</button>
          <h1 className="ml-2 text-lg font-semibold text-slate-900">{title}</h1>
          {loading && <span className="text-xs text-slate-400">carregando…</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
            ))}
          </div>
          <Link href="/appointments/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">+ Nova Consulta</Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {view === 'month' && <MonthView cursor={cursor} range={range} events={events} today={today} dragRef={dragRef} onReschedule={reschedule} onDay={(d) => { setCursor(d); setView('day'); }} />}
        {view === 'week' && <TimeGrid days={Array.from({ length: 7 }, (_, i) => addDays(range[0], i))} events={events} today={today} now={nowTick} dragRef={dragRef} onReschedule={reschedule} />}
        {view === 'day' && <TimeGrid days={[startOfDay(cursor)]} events={events} today={today} now={nowTick} dragRef={dragRef} onReschedule={reschedule} single />}
      </div>
      <p className="mt-2 text-xs text-slate-400">Dica: arraste um compromisso para outro horário ou dia para reagendar. Horários no fuso de Brasília.</p>
    </div>
  );
}

function MonthView({ cursor, range, events, today, onDay, dragRef, onReschedule }) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(range[0], i));
  const open = (ev) => router.visit(`/appointments/${ev.id}`);
  const drop = (day) => {
    const ev = dragRef.current; dragRef.current = null;
    if (!ev) return;
    const delta = startOfDay(day).getTime() - startOfDay(ev._s).getTime();
    onReschedule(ev, delta);
  };
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {WD.map((d) => <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 flex-1">
        {days.map((d, i) => {
          const evs = events.filter((e) => sameDay(e._s, d)).sort((a, b) => a._s - b._s);
          const out = d.getMonth() !== cursor.getMonth();
          const isToday = sameDay(d, today);
          return (
            <div key={i}
              onDragOver={(e) => e.preventDefault()} onDrop={() => drop(d)}
              className={`border-b border-r border-slate-100 p-1 overflow-hidden ${out ? 'bg-slate-50/60' : ''}`}>
              <button onClick={() => onDay(d)} className={`flex items-center justify-center w-6 h-6 text-xs rounded-full ${isToday ? 'bg-blue-600 text-white font-semibold' : out ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100'}`}>{d.getDate()}</button>
              <div className="mt-0.5 space-y-0.5">
                {evs.slice(0, 3).map((ev) => (
                  <button key={ev.id} draggable onDragStart={() => { dragRef.current = ev; }}
                    onClick={() => open(ev)} title={ev.title}
                    className="flex items-center gap-1 w-full text-left px-1 py-0.5 rounded hover:bg-slate-50 cursor-grab active:cursor-grabbing">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ev.backgroundColor }} />
                    <span className="text-[11px] text-slate-600 truncate">{hhmm(ev._s)} {patientOf(ev)}</span>
                  </button>
                ))}
                {evs.length > 3 && <div className="px-1 text-[10px] text-slate-400">+{evs.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function layout(evs) {
  const sorted = [...evs].sort((a, b) => a._s - b._s);
  const cols = [];
  sorted.forEach((ev) => {
    let placed = false;
    for (let c = 0; c < cols.length; c++) {
      if (cols[c][cols[c].length - 1]._e <= ev._s) { cols[c].push(ev); ev._col = c; placed = true; break; }
    }
    if (!placed) { ev._col = cols.length; cols.push([ev]); }
  });
  sorted.forEach((ev) => { ev._cols = cols.length || 1; });
  return sorted;
}

function TimeGrid({ days, events, today, now, single, dragRef, onReschedule }) {
  const hours = []; for (let h = H0; h <= H1; h++) hours.push(h);
  const totalH = (H1 - H0) * ROW;
  const open = (ev) => router.visit(`/appointments/${ev.id}`);
  const pos = (d, t) => { const ds = new Date(d); ds.setHours(H0, 0, 0, 0); return ((t - ds) / 60000) / ((H1 - H0) * 60) * totalH; };
  const drop = (day, e) => {
    e.preventDefault();
    const ev = dragRef.current; dragRef.current = null;
    if (!ev) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let mins = ((e.clientY - rect.top) / totalH) * ((H1 - H0) * 60) + H0 * 60;
    mins = Math.round(mins / 15) * 15;
    mins = Math.max(H0 * 60, Math.min(H1 * 60, mins));
    const target = startOfDay(day); target.setMinutes(mins);
    const delta = target.getTime() - ev._s.getTime();
    onReschedule(ev, delta);
  };
  return (
    <div className="h-full overflow-auto">
      <div className="flex min-w-full">
        <div className="w-14 shrink-0">
          <div className="h-10" />
          {hours.map((h) => <div key={h} style={{ height: ROW }} className="relative"><span className="absolute -top-2 right-2 text-[11px] text-slate-400">{String(h).padStart(2, '0')}:00</span></div>)}
        </div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length},minmax(0,1fr))` }}>
          {days.map((d, di) => {
            const evs = layout(events.filter((e) => sameDay(e._s, d)));
            const isToday = sameDay(d, today);
            return (
              <div key={di} className="border-l border-slate-100">
                <div className="h-10 sticky top-0 z-10 bg-white border-b border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-[11px] text-slate-400">{WD[d.getDay()]}</span>
                  <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{d.getDate()}</span>
                </div>
                <div className="relative" style={{ height: totalH }}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(d, e)}>
                  {hours.map((h, i) => <div key={h} style={{ top: i * ROW }} className="absolute left-0 right-0 border-b border-slate-100" />)}
                  {isToday && now.getHours() >= H0 && now.getHours() <= H1 && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: pos(d, now) }}>
                      <div className="h-0.5 bg-red-500"><span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" /></div>
                    </div>
                  )}
                  {evs.map((ev) => {
                    const top = Math.max(0, pos(d, ev._s));
                    const h = Math.max(22, pos(d, ev._e) - pos(d, ev._s));
                    const w = 100 / ev._cols;
                    return (
                      <button key={ev.id} draggable onDragStart={() => { dragRef.current = ev; }}
                        onClick={() => open(ev)} title={ev.title}
                        className="absolute rounded-lg px-2 py-1 text-left text-white overflow-hidden shadow-sm cursor-grab active:cursor-grabbing"
                        style={{ top, height: h, left: `calc(${ev._col * w}% + 2px)`, width: `calc(${w}% - 4px)`, background: ev.backgroundColor }}>
                        <div className="text-[11px] font-semibold leading-tight truncate">{hhmm(ev._s)} {patientOf(ev)}</div>
                        <div className="text-[10px] opacity-90 truncate">{STATUS[ev.status] || ev.status}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
