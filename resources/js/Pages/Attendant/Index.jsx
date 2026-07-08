import { useForm, usePage } from '@inertiajs/react';

const AUTONOMY = [
  { v: 'suggest', label: 'Só sugerir', hint: 'A IA sugere respostas, mas nada é enviado sozinho.' },
  { v: 'auto_reply', label: 'Responder dúvidas', hint: 'Responde perguntas simples automaticamente.' },
  { v: 'auto_schedule', label: 'Responder e agendar', hint: 'Faz tudo, inclusive marcar a consulta na agenda.' },
];

export default function Index({ settings, whatsappConnected, stats }) {
  const { flash } = usePage().props;
  const { data, setData, put, processing } = useForm({
    enabled: settings.enabled,
    bot_name: settings.bot_name || '',
    tone: settings.tone || '',
    persona: settings.persona || '',
    welcome_message: settings.welcome_message || '',
    offhours_message: settings.offhours_message || '',
    autonomy: settings.autonomy || 'suggest',
  });

  const submit = (e) => { e.preventDefault(); put('/atendente', { preserveScroll: true }); };
  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Atendente WhatsApp</h1>
        <p className="text-sm text-slate-500 mt-1">
          Um atendente com IA que conversa com o paciente no WhatsApp, reconhece quem já é cadastrado
          e marca consulta na sua agenda. Só admin e secretária veem esta área — o médico não.
        </p>
      </div>

      {flash?.success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">{flash.success}</div>
      )}

      {/* Liga/desliga */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Ativar o atendente</h2>
            <p className="text-xs text-slate-500 mt-0.5">Quando ligado, o bot passa a responder no WhatsApp conectado.</p>
          </div>
          <button type="button" onClick={() => setData('enabled', !data.enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${data.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            aria-pressed={data.enabled}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition mt-0.5 ${data.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="border-t border-slate-100 pt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do bot</label>
            <input value={data.bot_name} onChange={(e) => setData('bot_name', e.target.value)} placeholder="Ex.: Sofia" className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tom de voz</label>
            <input value={data.tone} onChange={(e) => setData('tone', e.target.value)} placeholder="Ex.: cordial e objetivo" className={field} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Personalidade / instruções</label>
          <textarea rows={3} value={data.persona} onChange={(e) => setData('persona', e.target.value)}
            placeholder="Como o bot deve se comportar, o que pode e o que não pode dizer…" className={field} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem de boas-vindas</label>
            <textarea rows={2} value={data.welcome_message} onChange={(e) => setData('welcome_message', e.target.value)}
              placeholder="Olá! Sou a Sofia, da Clínica X. Como posso ajudar?" className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fora do horário</label>
            <textarea rows={2} value={data.offhours_message} onChange={(e) => setData('offhours_message', e.target.value)}
              placeholder="Estamos fora do horário. Retornamos em breve." className={field} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Até onde a IA pode ir</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {AUTONOMY.map((a) => (
              <button key={a.v} type="button" onClick={() => setData('autonomy', a.v)}
                className={`text-left rounded-lg border p-3 transition ${data.autonomy === a.v ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="text-sm font-semibold text-slate-800">{a.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{a.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button type="submit" disabled={processing}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {processing ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>

      {/* Próximas fases (placeholders) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Conexão do WhatsApp</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${whatsappConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {whatsappConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Conectar o número de WhatsApp da clínica (via WADuck). <span className="text-slate-400">Em breve (Fase 2).</span></p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900">Conversas</h2>
          <p className="text-3xl font-bold text-slate-800 mt-1">{stats?.conversations ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Acompanhar as conversas do bot. <span className="text-slate-400">Em breve.</span></p>
        </div>
      </div>
    </div>
  );
}
