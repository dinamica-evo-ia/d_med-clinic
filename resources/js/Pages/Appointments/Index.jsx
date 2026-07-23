import { Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// dayOfWeek (0=Dom..6=Sab) → key do schedule (mon..sun, ISO seg=1..dom=7)
const DAY_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
/*
 * Altura de 1 hora no calendário. NÃO é fixa: acompanha a duração padrão da agenda.
 *
 * Com 56px fixos e consulta de 15 min, cada bloco ficava com 14px (56/4) — abaixo do mínimo de
 * 22px, então os blocos se sobrepunham e não cabiam 4 pacientes por hora. Agora cada consulta
 * ganha ~30px de altura útil: 15 min → 120px/hora (4 cabem), 30 min → 60px, 60 min → 56px
 * (o piso, pra clínica de consulta longa não virar uma página quilométrica).
 */
const ALTURA_POR_CONSULTA = 30;
const rowDe = (slotMin) => {
  const slot = Math.max(5, Number(slotMin) || 30);
  return Math.max(56, Math.round((60 / slot) * ALTURA_POR_CONSULTA));
};
const TZ = 'America/Sao_Paulo';
const STATUS = {
  scheduled: 'Agendado', awaiting_confirmation: 'Aguardando confirmação',
  confirmed: 'Confirmado', in_progress: 'Em andamento',
  completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou',
};
// Legenda do rodapé — as mesmas cores que o backend manda em backgroundColor.
const LEGENDA = [
  ['#3B82F6', 'Marcada'],
  ['#F59E0B', 'Avisada, aguardando o paciente'],
  ['#10B981', 'Confirmada pelo paciente'],
  ['#EF4444', 'Cancelada'],
];

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
/* Instante -> "AAAA-MM-DD HH:mm:ss" na hora de parede de São Paulo (o que o back espera). */
const spWall = (d) => { const x = toSP(d); return `${ymd(x)} ${hhmm(x)}:00`; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const patientOf = (ev) => (ev.title || '').split(' - ')[0] || 'Consulta';
const hhmmToMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };

// Config que vale num DIA concreto: a exceção da data manda; sem exceção, a regra da semana.
const cfgDoDia = (schedule, excecoes, d) => excecoes?.[ymd(d)] ?? schedule?.days?.[DAY_KEY[d.getDay()]];

// Deriva range [H0, H1] em horas inteiras a partir do schedule (cobrindo os dias ativos).
// Lê os períodos: o começo é o início do 1º e o fim é o término do último de cada dia.
// As exceções entram na conta também — senão abrir um plantão às 20h não apareceria na grade.
function rangeFromSchedule(sch, excecoes = {}) {
  const days = [...Object.values(sch?.days || {}), ...Object.values(excecoes)]
    .filter((d) => d?.active && d.periods?.length);
  if (!days.length) return [8, 18]; // sem dia ativo → range neutro
  const opens = days.map((d) => Math.min(...d.periods.map((p) => hhmmToMin(p.start))));
  const closes = days.map((d) => Math.max(...d.periods.map((p) => hhmmToMin(p.end))));
  const H0 = Math.max(0, Math.floor(Math.min(...opens) / 60));
  const H1 = Math.min(24, Math.ceil(Math.max(...closes) / 60));
  return [H0, Math.max(H0 + 1, H1)];
}

export default function Index() {
  const { doctors = [], filters = {}, schedule } = usePage().props;
  const [view, setView] = useState('week');
  const [cursor, setCursor] = useState(startOfDay(toSP(new Date())));
  const [events, setEvents] = useState([]);
  // Dias que fogem da regra semanal: { '2026-07-25': {active, periods} }
  const [excecoes, setExcecoes] = useState({});
  const [diaEmEdicao, setDiaEmEdicao] = useState(null);
  const [loading, setLoading] = useState(false);
  const dragRef = useRef(null);
  const today = startOfDay(toSP(new Date()));
  const nowTick = toSP(new Date());

  const doctorId = filters.doctor_id || '';
  const [H0, H1] = useMemo(() => rangeFromSchedule(schedule, excecoes), [schedule, excecoes]);
  const SLOT = schedule?.slot_minutes || 30;

  const range = useMemo(() => {
    if (view === 'month') { const s = startOfWeek(startOfMonth(cursor)); return [s, addDays(s, 41)]; }
    if (view === 'week') { const s = startOfWeek(cursor); return [addDays(s, 1), addDays(s, 5)]; } // Seg–Sex
    return [startOfDay(cursor), startOfDay(cursor)];
  }, [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {
      start: ymd(range[0]) + ' 00:00:00',
      end: ymd(range[1]) + ' 23:59:59',
      ...(doctorId ? { doctor_id: doctorId } : {}),
    };
    try {
      // Consultas e exceções juntas: as exceções dizem quais dias fogem da regra semanal.
      const [ev, ex] = await Promise.all([
        window.axios.get('/api/appointments/calendar', { params }),
        window.axios.get('/api/appointments/exceptions', {
          params: { start: ymd(range[0]), end: ymd(range[1]), ...(doctorId ? { doctor_id: doctorId } : {}) },
        }),
      ]);
      setEvents((ev.data || []).map((e) => {
        const us = parse(e.start), ue = parse(e.end || e.start);
        return { ...e, _utcS: us, _utcE: ue, _s: toSP(us), _e: toSP(ue) };
      }));
      setExcecoes(ex.data?.days || {});
    } catch { setEvents([]); setExcecoes({}); }
    setLoading(false);
  }, [range, doctorId]);
  useEffect(() => { load(); }, [load]);

  const reschedule = useCallback(async (ev, deltaMs) => {
    if (!deltaMs) return;
    const ns = new Date(ev._utcS.getTime() + deltaMs);
    const ne = new Date(ev._utcE.getTime() + deltaMs);
    const prev = events;
    setEvents((list) => list.map((x) => x.id === ev.id
      ? { ...x, _utcS: ns, _utcE: ne, _s: toSP(ns), _e: toSP(ne) } : x));
    try {
      // Manda HORA DE PAREDE de São Paulo, não toISOString(): o back roda em
      // America/Sao_Paulo e IGNORA o sufixo Z — mandar UTC faria a consulta pular +3h.
      await window.axios.patch(`/appointments/${ev.id}/reschedule`, {
        start: spWall(ns), end: spWall(ne),
      });
    } catch (err) {
      // backend rejeitou (fora do expediente, almoço, etc) → reverte + avisa
      setEvents(prev);
      const msg = err?.response?.data?.message || 'Não foi possível reagendar.';
      window.alert(msg);
    }
  }, [events]);

  const onDoctorChange = (id) => {
    router.get('/appointments', id ? { doctor_id: id } : {}, { preserveScroll: true });
  };

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
          <select
            value={doctorId}
            onChange={(e) => onDoctorChange(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-sm text-slate-700 bg-white"
            title="Filtrar por médico"
          >
            <option value="">Todos os médicos</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
            ))}
          </div>
          <Link href={doctorId ? `/appointments/create?doctor_id=${doctorId}` : '/appointments/create'}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">+ Nova Consulta</Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {view === 'month' && <MonthView cursor={cursor} range={range} events={events} today={today} dragRef={dragRef} onReschedule={reschedule} onDay={(d) => { setCursor(d); setView('day'); }} schedule={schedule} excecoes={excecoes} />}
        {view === 'week' && <TimeGrid days={Array.from({ length: 5 }, (_, i) => addDays(range[0], i))} events={events} today={today} now={nowTick} dragRef={dragRef} onReschedule={reschedule} H0={H0} H1={H1} SLOT={SLOT} schedule={schedule} excecoes={excecoes} onEditarDia={setDiaEmEdicao} />}
        {view === 'day' && <TimeGrid days={[startOfDay(cursor)]} events={events} today={today} now={nowTick} dragRef={dragRef} onReschedule={reschedule} single H0={H0} H1={H1} SLOT={SLOT} schedule={schedule} excecoes={excecoes} onEditarDia={setDiaEmEdicao} />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {LEGENDA.map(([cor, texto]) => (
          <span key={cor} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cor }} />
            {texto}
          </span>
        ))}
      </div>

      <p className="mt-1.5 text-xs text-slate-400">
        Dica: arraste um compromisso para outro horário ou dia para reagendar. Horários no fuso de Brasília.
        {doctorId
          ? <> Mostrando agenda de <strong>{doctors.find((d) => d.id === doctorId)?.name}</strong>. Áreas em cinza estão fora do expediente.</>
          : <> Mostrando todos os médicos (range agregado). Selecione um médico para ver o expediente individual.</>}
        {' '}Clique no <strong>horário embaixo da data</strong> para abrir ou fechar só aquele dia, sem mexer na regra da semana.
      </p>

      {diaEmEdicao && (
        <ExcecaoDoDia
          dia={diaEmEdicao}
          doctorId={doctorId}
          doctorNome={doctors.find((d) => d.id === doctorId)?.name}
          padrao={schedule?.days?.[DAY_KEY[diaEmEdicao.getDay()]]}
          excecao={excecoes[ymd(diaEmEdicao)]}
          onClose={() => setDiaEmEdicao(null)}
          onSalvo={() => { setDiaEmEdicao(null); load(); }}
        />
      )}
    </div>
  );
}

/*
 * "Neste dia é diferente." Abre ou fecha UMA data sem tocar na configuração da agenda —
 * a secretária não precisa mudar a regra padrão e depois lembrar de desfazer.
 */
function ExcecaoDoDia({ dia, doctorId, doctorNome, padrao, excecao, onClose, onSalvo }) {
  const temExcecao = !!excecao;
  const inicial = excecao?.active ? excecao.periods : (padrao?.active ? padrao.periods : null);
  const [atende, setAtende] = useState(excecao ? !!excecao.active : !padrao?.active);
  const [periods, setPeriods] = useState(
    (inicial?.length ? inicial : [{ start: '08:00', end: '12:00' }]).map((p) => ({ ...p })),
  );
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const titulo = dia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const setP = (i, patch) => setPeriods((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const salvar = async () => {
    setSalvando(true); setErro(null);
    try {
      // Um dia só pode ter uma decisão: limpa o que havia antes e grava a atual.
      if (temExcecao) {
        await window.axios.delete('/api/appointments/exceptions', {
          data: { date: ymd(dia), ...(doctorId ? { doctor_id: doctorId } : {}) },
        });
      }
      await window.axios.post('/api/appointments/exceptions', {
        date: ymd(dia),
        kind: atende ? 'open' : 'closed',
        periods: atende ? periods : null,
        reason: motivo || null,
        ...(doctorId ? { doctor_id: doctorId } : {}),
      });
      onSalvo();
    } catch (e) {
      setErro(e?.response?.data?.message || 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  const voltarAoPadrao = async () => {
    setSalvando(true); setErro(null);
    try {
      await window.axios.delete('/api/appointments/exceptions', {
        data: { date: ymd(dia), ...(doctorId ? { doctor_id: doctorId } : {}) },
      });
      onSalvo();
    } catch {
      setErro('Não foi possível voltar ao padrão.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{cap(titulo)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {doctorId ? <>Vale só para <strong>{doctorNome}</strong>.</> : 'Vale para a clínica inteira (todos os médicos).'}
              {' '}Padrão da semana: {padrao?.active
                ? padrao.periods.map((p) => `${p.start}–${p.end}`).join(', ')
                : 'não atende'}.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <div className="mt-4 flex rounded-lg bg-slate-100 p-0.5">
          {[[true, 'Atender neste dia'], [false, 'Não atender']].map(([v, l]) => (
            <button key={String(v)} onClick={() => setAtende(v)}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${atende === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
          ))}
        </div>

        {atende && (
          <div className="mt-3 space-y-2">
            {periods.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="time" value={p.start} onChange={(e) => setP(i, { start: e.target.value })}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <span className="text-xs text-slate-400">até</span>
                <input type="time" value={p.end} onChange={(e) => setP(i, { end: e.target.value })}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                {periods.length > 1 && (
                  <button onClick={() => setPeriods((ps) => ps.filter((_, idx) => idx !== i))}
                    className="text-xs text-rose-600 hover:underline">remover</button>
                )}
              </div>
            ))}
            <button onClick={() => setPeriods((ps) => [...ps, { start: '14:00', end: '18:00' }])}
              className="text-xs text-blue-600 hover:underline">+ adicionar período</button>
          </div>
        )}

        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={120}
          placeholder="Motivo (opcional) — congresso, feriado, encaixe…"
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />

        {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}

        <div className="mt-4 flex items-center gap-2">
          <button onClick={salvar} disabled={salvando}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {salvando ? 'Salvando…' : 'Salvar exceção'}
          </button>
          {temExcecao && (
            <button onClick={voltarAoPadrao} disabled={salvando}
              className="px-3 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50">
              Voltar ao padrão
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthView({ cursor, range, events, today, onDay, dragRef, onReschedule, schedule, excecoes = {} }) {
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
          const dayCfg = cfgDoDia(schedule, excecoes, d);
          const inactive = dayCfg && !dayCfg.active;
          const excepcional = !!excecoes[ymd(d)];
          return (
            <div key={i}
              onDragOver={(e) => e.preventDefault()} onDrop={() => drop(d)}
              className={`border-b border-r border-slate-100 p-1 overflow-hidden ${out ? 'bg-slate-50/60' : inactive ? 'bg-slate-100/60' : ''}`}>
              <div className="flex items-center gap-1">
                <button onClick={() => onDay(d)} className={`flex items-center justify-center w-6 h-6 text-xs rounded-full ${isToday ? 'bg-blue-600 text-white font-semibold' : out ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100'}`}>{d.getDate()}</button>
                {excepcional && (
                  <span title={dayCfg?.active
                    ? `Exceção: atende ${dayCfg.periods.map((p) => `${p.start}–${p.end}`).join(', ')}`
                    : 'Exceção: fechado neste dia'}
                    className="px-1 rounded bg-amber-100 text-amber-700 text-[9px] font-bold leading-4">⚡</span>
                )}
              </div>
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

/*
 * Chip de horário no cabeçalho de cada dia — é também o botão que abre a exceção.
 * Precisa parecer clicável de longe: a secretária não vai caçar um ícone discreto.
 */
function ChipDoDia({ dia, cfg, excepcional, onClick }) {
  const atende = !!cfg?.active;
  const faixas = atende ? (cfg.periods || []).map((p) => `${p.start}–${p.end}`).join(' · ') : 'Fechado';

  const cor = excepcional
    ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
    : atende
      ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
      : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700';

  const titulo = excepcional
    ? `Exceção neste dia: ${atende ? faixas : 'fechado'}. Clique para alterar ou voltar ao padrão.`
    : atende
      ? `Atende ${faixas}. Clique para mudar só este dia.`
      : 'Não atende neste dia. Clique para abrir só esta data.';

  return (
    <button onClick={onClick} title={titulo}
      className={`group max-w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium leading-none transition ${cor}`}>
      {excepcional && <span aria-hidden>⚡</span>}
      <span className="truncate">{faixas}</span>
      <span className="opacity-40 group-hover:opacity-100" aria-hidden>✎</span>
    </button>
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

function TimeGrid({ days, events, today, now, dragRef, onReschedule, H0, H1, SLOT, schedule, excecoes = {}, onEditarDia }) {
  const hours = []; for (let h = H0; h <= H1; h++) hours.push(h);
  // A hora "estica" conforme a duração da consulta — ver rowDe() lá em cima.
  const ROW = rowDe(schedule?.slot_minutes ?? SLOT);
  const totalH = (H1 - H0) * ROW;
  const open = (ev) => router.visit(`/appointments/${ev.id}`);
  const minToTop = (mins) => ((mins - H0 * 60) / ((H1 - H0) * 60)) * totalH;
  const pos = (d, t) => { const ds = new Date(d); ds.setHours(H0, 0, 0, 0); return ((t - ds) / 60000) / ((H1 - H0) * 60) * totalH; };

  const drop = (day, e) => {
    e.preventDefault();
    const ev = dragRef.current; dragRef.current = null;
    if (!ev) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let mins = ((e.clientY - rect.top) / totalH) * ((H1 - H0) * 60) + H0 * 60;
    mins = Math.round(mins / SLOT) * SLOT;
    mins = Math.max(H0 * 60, Math.min(H1 * 60, mins));
    const target = startOfDay(day); target.setMinutes(mins);
    const delta = target.getTime() - ev._s.getTime();
    onReschedule(ev, delta);
  };

  /*
   * Overlay cinza nas zonas bloqueadas. Com PERÍODOS a conta inverte: em vez de desenhar
   * "antes/depois do expediente + almoço", desenhamos os BURACOS entre os períodos —
   * o intervalo de almoço vira só mais um buraco, sem regra própria.
   */
  const renderBlocks = (d) => {
    const dayCfg = cfgDoDia(schedule, excecoes, d);
    if (!dayCfg) return null;
    if (!dayCfg.active) {
      return <div className="absolute inset-0 bg-slate-100/70" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(148,163,184,0.08) 6px 12px)' }} />;
    }
    const periods = (dayCfg.periods || []).map((p) => [hhmmToMin(p.start), hhmmToMin(p.end)])
      .sort((a, b) => a[0] - b[0]);
    if (!periods.length) return null;

    const blocks = [];
    let cursor = H0 * 60;
    periods.forEach(([ini, fim]) => {
      if (ini > cursor) blocks.push([cursor, Math.min(ini, H1 * 60)]);
      cursor = Math.max(cursor, fim);
    });
    if (cursor < H1 * 60) blocks.push([cursor, H1 * 60]);

    return blocks
      .filter(([a, b]) => b > a)
      .map(([a, b], i) => (
        <div key={i}
          className="absolute left-0 right-0 pointer-events-none bg-slate-100/60"
          style={{
            top: minToTop(a), height: minToTop(b) - minToTop(a),
            backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(148,163,184,0.10) 6px 12px)',
          }}
          title="Fora do horário de atendimento"
        />
      ));
  };

  return (
    <div className="h-full overflow-auto">
      <div className="flex min-w-full">
        <div className="w-14 shrink-0">
          {/* casa com a altura do cabeçalho do dia (h-16), senão as horas saem do lugar */}
          <div className="h-16" />
          {hours.map((h) => <div key={h} style={{ height: ROW }} className="relative"><span className="absolute -top-2 right-2 text-[11px] text-slate-400">{String(h).padStart(2, '0')}:00</span></div>)}
        </div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length},minmax(0,1fr))` }}>
          {days.map((d, di) => {
            const evs = layout(events.filter((e) => sameDay(e._s, d)));
            const isToday = sameDay(d, today);
            const dayCfg = cfgDoDia(schedule, excecoes, d);
            const inactive = dayCfg && !dayCfg.active;
            const excepcional = !!excecoes[ymd(d)];
            return (
              <div key={di} className="border-l border-slate-100">
                <div className="h-16 sticky top-0 z-10 bg-white border-b border-slate-200 flex flex-col items-center justify-center gap-1 px-1">
                  <div className="flex items-baseline gap-1.5 leading-none">
                    <span className="text-[11px] text-slate-400">{WD[d.getDay()]}</span>
                    <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : inactive ? 'text-slate-300' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </div>
                  {/*
                   * O horário do dia como CHIP clicável. Antes era um "⋯" cinza-claro do lado da
                   * data — ninguém achava. Assim a secretária lê o horário sem abrir nada e vê
                   * que dá pra clicar; amarelo = este dia foge da regra da semana.
                   */}
                  <ChipDoDia dia={d} cfg={dayCfg} excepcional={excepcional} onClick={() => onEditarDia?.(startOfDay(d))} />
                </div>
                <div className="relative" style={{ height: totalH }}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(d, e)}>
                  {hours.map((h, i) => <div key={h} style={{ top: i * ROW }} className="absolute left-0 right-0 border-b border-slate-100" />)}
                  {renderBlocks(d)}
                  {isToday && now.getHours() >= H0 && now.getHours() <= H1 && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: pos(d, now) }}>
                      <div className="h-0.5 bg-red-500"><span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" /></div>
                    </div>
                  )}
                  {evs.map((ev) => {
                    const top = Math.max(0, pos(d, ev._s));
                    // Piso menor que a altura de 1 consulta, senão um bloco de 15 min seria
                    // esticado à força e invadiria o horário seguinte.
                    const h = Math.max(20, pos(d, ev._e) - pos(d, ev._s));
                    const w = 100 / ev._cols;
                    return (
                      <button key={ev.id} draggable onDragStart={() => { dragRef.current = ev; }}
                        onClick={() => open(ev)} title={ev.title}
                        className="absolute rounded-lg px-2 py-1 text-left text-white overflow-hidden shadow-sm cursor-grab active:cursor-grabbing z-10"
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
