import { useForm, usePage, router } from '@inertiajs/react';
import { useState } from 'react';

const AUTONOMY = [
  { v: 'suggest', label: 'Só sugerir', hint: 'A IA sugere respostas, mas nada é enviado sozinho.' },
  { v: 'auto_reply', label: 'Responder dúvidas', hint: 'Responde perguntas simples automaticamente.' },
  { v: 'auto_schedule', label: 'Responder e agendar', hint: 'Faz tudo, inclusive marcar a consulta na agenda.' },
];

const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500';

export default function Index({ settings, whatsapp, stats }) {
  const { flash } = usePage().props;

  const cfg = useForm({
    enabled: settings.enabled,
    bot_name: settings.bot_name || '',
    tone: settings.tone || '',
    persona: settings.persona || '',
    welcome_message: settings.welcome_message || '',
    offhours_message: settings.offhours_message || '',
    autonomy: settings.autonomy || 'suggest',
  });
  const saveCfg = (e) => { e.preventDefault(); cfg.put('/atendente', { preserveScroll: true }); };

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
      {flash?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{flash.error}</div>
      )}

      {/* Conexão do WhatsApp */}
      <WhatsappCard whatsapp={whatsapp} />

      {/* Config do bot */}
      <form onSubmit={saveCfg} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Ativar o atendente</h2>
            <p className="text-xs text-slate-500 mt-0.5">Quando ligado, o bot passa a responder no WhatsApp conectado.</p>
          </div>
          <button type="button" onClick={() => cfg.setData('enabled', !cfg.data.enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${cfg.data.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            aria-pressed={cfg.data.enabled}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition mt-0.5 ${cfg.data.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="border-t border-slate-100 pt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do bot</label>
            <input value={cfg.data.bot_name} onChange={(e) => cfg.setData('bot_name', e.target.value)} placeholder="Ex.: Sofia" className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tom de voz</label>
            <input value={cfg.data.tone} onChange={(e) => cfg.setData('tone', e.target.value)} placeholder="Ex.: cordial e objetivo" className={field} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Personalidade / instruções</label>
          <textarea rows={3} value={cfg.data.persona} onChange={(e) => cfg.setData('persona', e.target.value)}
            placeholder="Como o bot deve se comportar, o que pode e o que não pode dizer…" className={field} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem de boas-vindas</label>
            <textarea rows={2} value={cfg.data.welcome_message} onChange={(e) => cfg.setData('welcome_message', e.target.value)}
              placeholder="Olá! Sou a Sofia, da Clínica X. Como posso ajudar?" className={field} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fora do horário</label>
            <textarea rows={2} value={cfg.data.offhours_message} onChange={(e) => cfg.setData('offhours_message', e.target.value)}
              placeholder="Estamos fora do horário. Retornamos em breve." className={field} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Até onde a IA pode ir</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {AUTONOMY.map((a) => (
              <button key={a.v} type="button" onClick={() => cfg.setData('autonomy', a.v)}
                className={`text-left rounded-lg border p-3 transition ${cfg.data.autonomy === a.v ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="text-sm font-semibold text-slate-800">{a.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{a.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button type="submit" disabled={cfg.processing}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {cfg.processing ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>

      {/* Conversas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900">Conversas</h2>
        <p className="text-3xl font-bold text-slate-800 mt-1">{stats?.conversations ?? 0}</p>
        <p className="text-xs text-slate-500 mt-1">Total de conversas recebidas. <span className="text-slate-400">Tela de acompanhamento: em breve.</span></p>
      </div>
    </div>
  );
}

function WhatsappCard({ whatsapp }) {
  const [copied, setCopied] = useState(false);
  const conn = useForm({ waduck_instance: whatsapp.instance || '', waduck_api_key: '', waduck_phone: whatsapp.phone || '', waduck_api_url: whatsapp.api_url || '' });
  const test = useForm({ to: '', text: '' });

  const doConnect = (e) => { e.preventDefault(); conn.post('/atendente/whatsapp/connect', { preserveScroll: true, onSuccess: () => conn.reset('waduck_api_key') }); };
  const doTest = (e) => { e.preventDefault(); test.post('/atendente/whatsapp/test', { preserveScroll: true }); };
  const doDisconnect = () => { if (confirm('Desconectar o WhatsApp desta clínica?')) router.post('/atendente/whatsapp/disconnect', {}, { preserveScroll: true }); };
  const copy = () => { navigator.clipboard?.writeText(whatsapp.webhook_url || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Conexão do WhatsApp</h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${whatsapp.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {whatsapp.connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      {!whatsapp.connected ? (
        <form onSubmit={doConnect} className="space-y-3">
          <p className="text-xs text-slate-500">Conecte o número da clínica usando as credenciais da sua instância no WADuck.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Instância (WADuck)</label>
              <input value={conn.data.waduck_instance} onChange={(e) => conn.setData('waduck_instance', e.target.value)} className={field} placeholder="minha-clinica" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">API key</label>
              <input value={conn.data.waduck_api_key} onChange={(e) => conn.setData('waduck_api_key', e.target.value)} className={field} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Telefone (opcional)</label>
              <input value={conn.data.waduck_phone} onChange={(e) => conn.setData('waduck_phone', e.target.value)} className={field} placeholder="5511999998888" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">URL da API (opcional)</label>
              <input value={conn.data.waduck_api_url} onChange={(e) => conn.setData('waduck_api_url', e.target.value)} className={field} placeholder="https://api.waduck.pro" />
            </div>
          </div>
          {conn.errors.waduck_instance && <p className="text-xs text-red-600">{conn.errors.waduck_instance}</p>}
          {conn.errors.waduck_api_key && <p className="text-xs text-red-600">{conn.errors.waduck_api_key}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={conn.processing}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60">
              {conn.processing ? 'Conectando…' : 'Conectar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-600">
            Instância <b>{whatsapp.instance}</b>{whatsapp.phone ? <> · número <b>{whatsapp.phone}</b></> : null}
            {whatsapp.connected_at ? <> · desde {whatsapp.connected_at}</> : null}
          </div>

          {/* URL do webhook pra colar no WADuck */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">URL do webhook (cole no WADuck — evento <code>messages.upsert</code>)</label>
            <div className="flex gap-2">
              <input readOnly value={whatsapp.webhook_url || ''} className={`${field} font-mono text-xs bg-slate-50`} onFocus={(e) => e.target.select()} />
              <button type="button" onClick={copy} className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 shrink-0">
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Teste de envio */}
          <form onSubmit={doTest} className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Enviar mensagem de teste</label>
            <div className="flex gap-2">
              <input value={test.data.to} onChange={(e) => test.setData('to', e.target.value)} className={field} placeholder="5511999998888" />
              <button type="submit" disabled={test.processing}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 shrink-0">
                {test.processing ? 'Enviando…' : 'Enviar teste'}
              </button>
            </div>
          </form>

          <div className="flex justify-end border-t border-slate-100 pt-3">
            <button type="button" onClick={doDisconnect} className="text-xs font-semibold text-red-600 hover:text-red-700">Desconectar</button>
          </div>
        </div>
      )}
    </div>
  );
}
