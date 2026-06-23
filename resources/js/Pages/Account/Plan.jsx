import { Link, usePage } from '@inertiajs/react';

const planColors = {
  solo: 'border-slate-200 bg-white',
  pro: 'border-blue-200 bg-blue-50/30 ring-2 ring-blue-200',
  clinica: 'border-violet-200 bg-violet-50/30',
  enterprise: 'border-amber-200 bg-amber-50/30',
};

export default function Plan({ plans }) {
  const { tenant } = usePage().props;
  const currentPlan = tenant?.plan || 'solo';
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← Voltar</Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Planos e pagamentos</h1>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pagamento manual (Fase 1)</span>
      </div>
      <p className="text-sm text-slate-500">Seu plano atual: <strong className="text-slate-800">{plans[currentPlan]?.name || currentPlan}</strong>. Para trocar, entre em contato com o suporte — cobrança automática chega na Fase 3.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(plans).map(([k, p]) => {
          const isCurrent = k === currentPlan;
          return (
            <div key={k} className={`rounded-2xl border p-5 ${planColors[k] || 'border-slate-200'} ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{p.name}</h3>
                {isCurrent && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">Atual</span>}
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-4">{p.description}</p>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li><strong>{p.doctors ?? '∞'}</strong> médico(s)</li>
                <li><strong>{p.staff ?? '∞'}</strong> staff (admin/recepção)</li>
                <li>Pacientes ilimitados</li>
                <li>Prontuário, agenda, financeiro</li>
                <li>Studio Med (IA de gravação)</li>
              </ul>
              {!isCurrent && (
                <button disabled className="mt-4 w-full text-xs text-slate-400 border border-slate-200 rounded-lg py-2 cursor-not-allowed">
                  Trocar para {p.name} (em breve)
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-2">Pagamentos</h2>
        <p className="text-sm text-slate-500">O módulo de cobrança automática (PIX/boleto/cartão via Asaas ou Iugu) está previsto para a Fase 3. Por enquanto, a cobrança é manual pelo administrador do produto.</p>
      </div>
    </div>
  );
}
