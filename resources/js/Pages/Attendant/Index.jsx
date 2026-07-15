import { useForm, usePage, router, Link } from '@inertiajs/react';
import { useState } from 'react';

const AUTONOMY = [
  { v: 'suggest', label: 'Só sugerir', hint: 'A IA sugere respostas, mas nada é enviado sozinho.' },
  { v: 'auto_reply', label: 'Responder dúvidas', hint: 'Responde perguntas simples automaticamente.' },
  { v: 'auto_schedule', label: 'Responder e agendar', hint: 'Faz tudo, inclusive marcar a consulta na agenda.' },
];

const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500';

const STATE_LABEL = {
  open: 'Online ✓', close: 'Desconectado — reparear o número', connecting: 'Conectando…',
  disconnected: 'Sem credenciais', unknown: 'Não foi possível verificar', erro: 'Erro ao verificar',
};

export default function Index({ settings, whatsapp, stats, knowledge = [] }) {
  const { flash } = usePage().props;
  const bh = settings.business_hours || {};

  const cfg = useForm({
    enabled: settings.enabled,
    bot_name: settings.bot_name || '',
    tone: settings.tone || '',
    persona: settings.persona || '',
    welcome_message: settings.welcome_message || '',
    offhours_message: settings.offhours_message || '',
    business_hours: { open: bh.open || '', close: bh.close || '', weekends: !!bh.weekends },
    autonomy: settings.autonomy || 'suggest',
  });
  const setBh = (k, v) => cfg.setData('business_hours', { ...cfg.data.business_hours, [k]: v });
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Horário de atendimento do bot</label>
          <p className="text-xs text-slate-500 mb-2">Fora desse horário o bot envia a mensagem de "Fora do horário" e não responde. Deixe em branco para atender 24h.</p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-xs text-slate-600">Abre <input type="time" value={cfg.data.business_hours.open} onChange={(e) => setBh('open', e.target.value)} className="ml-1 rounded-lg border border-slate-300 px-2 py-1 text-sm" /></label>
            <label className="text-xs text-slate-600">Fecha <input type="time" value={cfg.data.business_hours.close} onChange={(e) => setBh('close', e.target.value)} className="ml-1 rounded-lg border border-slate-300 px-2 py-1 text-sm" /></label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={cfg.data.business_hours.weekends} onChange={(e) => setBh('weekends', e.target.checked)} /> atende fim de semana</label>
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

      {/* Base de conhecimento (FAQ) */}
      <KnowledgeSection knowledge={knowledge} />

      {/* Conversas */}
      <Link href="/atendente/conversas" className="block bg-white rounded-2xl border border-slate-200 p-6 hover:border-blue-300 transition">
        <h2 className="text-sm font-semibold text-slate-900">Conversas</h2>
        <p className="text-3xl font-bold text-slate-800 mt-1">{stats?.conversations ?? 0}</p>
        <p className="text-xs text-slate-500 mt-1">Total de conversas recebidas. <span className="text-blue-600 font-medium">Abrir inbox →</span></p>
      </Link>
    </div>
  );
}

const MAX_CONTENT = 2000; // igual à validação do AttendantController

function KnowledgeSection({ knowledge }) {
  const add = useForm({ title: '', content: '' });
  const [editando, setEditando] = useState(null);
  const submit = (e) => { e.preventDefault(); add.post('/atendente/knowledge', { preserveScroll: true, onSuccess: () => add.reset() }); };
  const toggle = (k) => router.put(`/atendente/knowledge/${k.id}`, { is_active: !k.is_active }, { preserveScroll: true });
  const remove = (k) => { if (confirm('Remover este item da base de conhecimento?')) router.delete(`/atendente/knowledge/${k.id}`, { preserveScroll: true }); };

  const excedeu = add.data.content.length > MAX_CONTENT;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Base de conhecimento (o que o bot sabe)</h2>
        <p className="text-xs text-slate-500 mt-0.5">Ensine o bot sobre a clínica: endereço, convênios, preços, preparo de exames, estacionamento… Ele usa isso para responder.</p>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <input value={add.data.title} onChange={(e) => add.setData('title', e.target.value)}
          placeholder="Tópico (ex.: Convênios)" className={field} />
        <textarea value={add.data.content} onChange={(e) => add.setData('content', e.target.value)} rows={5}
          placeholder={'Resposta completa — pode escrever à vontade, o bot usa esse texto pra responder.\n\nEx.: Atendemos Unimed, Bradesco Saúde e SulAmérica. Particular: consulta R$ 400, retorno em 30 dias sem custo. Não atendemos IPE nem Cassi.'}
          className={`${field} leading-relaxed`} />
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[11px] ${excedeu ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
            {add.data.content.length}/{MAX_CONTENT} caracteres
          </span>
          <button type="submit" disabled={add.processing || !add.data.title.trim() || !add.data.content.trim() || excedeu}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {add.processing ? 'Adicionando…' : 'Adicionar'}
          </button>
        </div>
        {add.errors.title && <p className="text-xs text-red-600">{add.errors.title}</p>}
        {add.errors.content && <p className="text-xs text-red-600">{add.errors.content}</p>}
      </form>

      {knowledge.length === 0 ? (
        <p className="text-xs text-slate-400">Nenhum item ainda. Adicione ao menos endereço, convênios e horários de funcionamento.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {knowledge.map((k) => (
            <li key={k.id} className="py-3">
              {editando === k.id ? (
                <KnowledgeEdit item={k} onDone={() => setEditando(null)} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className={`min-w-0 ${k.is_active ? '' : 'opacity-50'}`}>
                    <div className="text-sm font-semibold text-slate-800">{k.title}</div>
                    {/* texto inteiro, respeitando quebras de linha — antes ficava espremido numa linha */}
                    <div className="text-xs text-slate-600 whitespace-pre-wrap break-words mt-0.5 leading-relaxed">{k.content}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => setEditando(k.id)} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Editar</button>
                    <button onClick={() => toggle(k)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700">{k.is_active ? 'Desativar' : 'Ativar'}</button>
                    <button onClick={() => remove(k)} className="text-[11px] font-semibold text-red-600 hover:text-red-700">Remover</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KnowledgeEdit({ item, onDone }) {
  const frm = useForm({ title: item.title, content: item.content });
  const save = (e) => { e.preventDefault(); frm.put(`/atendente/knowledge/${item.id}`, { preserveScroll: true, onSuccess: onDone }); };
  const excedeu = frm.data.content.length > MAX_CONTENT;

  return (
    <form onSubmit={save} className="space-y-2">
      <input value={frm.data.title} onChange={(e) => frm.setData('title', e.target.value)} className={field} />
      <textarea value={frm.data.content} onChange={(e) => frm.setData('content', e.target.value)} rows={6} className={`${field} leading-relaxed`} />
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[11px] ${excedeu ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
          {frm.data.content.length}/{MAX_CONTENT} caracteres
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onDone} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
          <button type="submit" disabled={frm.processing || !frm.data.title.trim() || !frm.data.content.trim() || excedeu}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {frm.processing ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
      {frm.errors.content && <p className="text-xs text-red-600">{frm.errors.content}</p>}
    </form>
  );
}

function WhatsappCard({ whatsapp }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const checkStatus = async () => {
    setChecking(true);
    try {
      const r = await fetch('/atendente/whatsapp/status', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
      setStatus(await r.json());
    } catch { setStatus({ ok: false, state: 'erro' }); }
    setChecking(false);
  };
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

          <div className="flex items-center gap-2">
            <button type="button" onClick={checkStatus} disabled={checking}
              className="text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50">
              {checking ? 'Verificando…' : 'Verificar conexão'}
            </button>
            {status && (
              <span className={`text-xs font-medium ${status.state === 'open' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {STATE_LABEL[status.state] || status.state}
              </span>
            )}
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
