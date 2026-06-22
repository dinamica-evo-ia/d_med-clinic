import { Link } from '@inertiajs/react';

const STATUS_COLORS = {
  trial: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  past_due: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  suspended: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  cancelled: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export default function Dashboard({ totals, byStatus, byPlan, plans, statuses }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Visão geral</h1>
        <p className="text-sm text-slate-400 mt-1">Estado da operação D_Med Clinic.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Clínicas" value={totals.tenants} />
        <Kpi label="Usuários (não-master)" value={totals.users} />
        <Kpi label="Masters" value={totals.masters} />
        <Kpi label="MRR" value="—" hint="cobrança manual (Fase 1)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Por status</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(byStatus).map(([k, v]) => (
              <div key={k} className={`rounded-lg border px-3 py-2 ${STATUS_COLORS[k] || 'bg-slate-700/30 text-slate-300 border-slate-600/30'}`}>
                <p className="text-[11px] uppercase tracking-wider opacity-80">{statuses[k] || k}</p>
                <p className="text-2xl font-bold mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Por plano</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(byPlan).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">{plans[k]?.name || k}</p>
                <p className="text-2xl font-bold text-amber-400 mt-0.5">{v}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {plans[k] ? `${plans[k].doctors ?? '∞'} médico(s) · ${plans[k].staff ?? '∞'} staff` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Link href="/master/clinicas" className="px-5 py-2.5 bg-amber-500 text-slate-900 font-semibold rounded-lg hover:bg-amber-400">Gerenciar clínicas →</Link>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-3xl font-bold mt-1 text-amber-400">{value}</p>
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
