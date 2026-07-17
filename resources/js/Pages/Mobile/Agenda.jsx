import { Head, Link, router, usePage } from '@inertiajs/react';
import AtivarAvisos from '@/Components/mobile/AtivarAvisos';
import BotaoInstalar from '@/Components/mobile/BotaoInstalar';

// Rótulo/cor por status. Fallback discreto pro que não estiver mapeado.
const STATUS = {
  scheduled: { label: 'Agendada', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  confirmed: { label: 'Confirmada', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  completed: { label: 'Atendida', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
  no_show: { label: 'Faltou', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
};
const statusDe = (s) => STATUS[s] || { label: s || '—', cls: 'bg-slate-50 text-slate-500 ring-slate-200' };

export default function Agenda({ dia, medico, consultas = [], push = {} }) {
  const total = consultas.length;
  const { flash } = usePage().props;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Head title="Agenda" />

      {/* Cabeçalho azul, respeitando o notch do iPhone (safe-area) */}
      <header className="bg-blue-600 text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-blue-100">D_Med Clinic</p>
              {medico && <p className="text-[13px] text-blue-200 -mt-0.5">{medico}</p>}
            </div>
            <a href="/dashboard" className="text-[13px] text-blue-100 underline underline-offset-2">CRM completo</a>
          </div>

          {/* Navegação de dia */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link href={`/app?data=${dia.anterior}`} preserveScroll
              className="h-9 w-9 grid place-items-center rounded-full bg-blue-500/40 active:bg-blue-500/70" aria-label="Dia anterior">‹</Link>
            <div className="text-center">
              <p className="text-base font-semibold capitalize leading-tight">{dia.titulo}</p>
              {dia.is_hoje
                ? <p className="text-[12px] text-blue-100">Hoje · {total} consulta{total === 1 ? '' : 's'}</p>
                : <button onClick={() => router.get('/app')} className="text-[12px] text-blue-100 underline underline-offset-2">voltar pra hoje</button>}
            </div>
            <Link href={`/app?data=${dia.proximo}`} preserveScroll
              className="h-9 w-9 grid place-items-center rounded-full bg-blue-500/40 active:bg-blue-500/70" aria-label="Próximo dia">›</Link>
          </div>
        </div>
      </header>

      {/* Lista */}
      <main className="px-4 py-4 space-y-2.5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
        {flash?.success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-700">{flash.success}</div>
        )}
        {flash?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">{flash.error}</div>
        )}

        {/* Android: some sozinho se já instalado ou se o navegador não suporta (iPhone) */}
        <BotaoInstalar />

        {/* Avisos: só aparece pra quem tem ficha de médico (o aviso é sobre a agenda DELE) */}
        {push.disponivel && <AtivarAvisos chavePublica={push.chave_publica} />}

        {total === 0 && (
          <div className="mt-16 text-center">
            <div className="text-4xl">🗓️</div>
            <p className="mt-3 text-sm text-slate-500">Nenhuma consulta {dia.is_hoje ? 'para hoje' : 'neste dia'}.</p>
          </div>
        )}

        {consultas.map((c) => {
          const st = statusDe(c.status);
          return (
            <Link
              key={c.id}
              href={c.paciente_id ? `/patients/${c.paciente_id}` : '#'}
              className={`block rounded-2xl border bg-white p-3.5 shadow-sm active:bg-slate-50 ${
                c.is_proxima ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 text-center">
                  <div className="text-lg font-bold tabular-nums leading-none">{c.hora}</div>
                  {c.is_proxima && <div className="mt-1 text-[10px] font-semibold text-blue-600">PRÓXIMA</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-slate-900">{c.paciente}</p>
                  {c.medico && <p className="truncate text-[12px] text-slate-400">{c.medico}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${st.cls}`}>{st.label}</span>
              </div>
            </Link>
          );
        })}
      </main>
    </div>
  );
}
