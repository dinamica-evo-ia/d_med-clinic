import { useForm, usePage, router, Link } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

const STATUS = {
  open: { label: 'Aberta', cls: 'bg-blue-100 text-blue-700' },
  handoff: { label: 'Com você', cls: 'bg-amber-100 text-amber-700' },
  closed: { label: 'Resolvida', cls: 'bg-slate-100 text-slate-500' },
};

export default function Inbox({ conversations, selected, messages }) {
  const { flash } = usePage().props;
  const reply = useForm({ text: '' });
  const bottomRef = useRef(null);

  // Polling suave (a cada 6s) — só recarrega lista + mensagens, preserva o que você digitou.
  useEffect(() => {
    const id = setInterval(() => {
      router.reload({ only: ['conversations', 'messages'], preserveState: true, preserveScroll: true });
    }, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  const open = (id) => router.get('/atendente/conversas', { c: id }, { preserveState: true, preserveScroll: true, only: ['selected', 'messages'] });
  const setStatus = (status) => selected && router.post(`/atendente/conversas/${selected.id}/status`, { status }, { preserveScroll: true });
  const send = (e) => {
    e.preventDefault();
    if (!selected || !reply.data.text.trim()) return;
    reply.post(`/atendente/conversas/${selected.id}/reply`, { preserveScroll: true, onSuccess: () => reply.reset('text') });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Conversas</h1>
        <p className="text-sm text-slate-500 mt-1">Acompanhe o atendente e assuma quando quiser. Só admin e secretária veem esta área.</p>
      </div>

      {flash?.error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{flash.error}</div>}

      <div className="grid lg:grid-cols-3 gap-4 h-[70vh]">
        {/* Lista */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-y-auto lg:col-span-1">
          {conversations.length === 0 && <p className="p-6 text-sm text-slate-400">Nenhuma conversa ainda.</p>}
          <ul className="divide-y divide-slate-100">
            {conversations.map((c) => (
              <li key={c.id}>
                <button onClick={() => open(c.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition ${selected?.id === c.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{c.last_at}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 truncate">{c.preview || '—'}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${STATUS[c.status]?.cls || ''}`}>{STATUS[c.status]?.label}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Thread */}
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col lg:col-span-2 overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Selecione uma conversa</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{selected.name}</div>
                  <div className="text-xs text-slate-400">
                    {selected.phone}
                    {selected.patient_id && <> · <Link href={`/patients/${selected.patient_id}`} className="text-blue-600 hover:underline">ver paciente</Link></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selected.status !== 'handoff' && (
                    <button onClick={() => setStatus('handoff')} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200">Assumir</button>
                  )}
                  {selected.status === 'handoff' && (
                    <button onClick={() => setStatus('open')} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200">Devolver ao bot</button>
                  )}
                  {selected.status !== 'closed'
                    ? <button onClick={() => setStatus('closed')} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200">Resolver</button>
                    : <button onClick={() => setStatus('open')} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200">Reabrir</button>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                {messages.map((m) => <Bubble key={m.id} m={m} />)}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="border-t border-slate-100 p-3 flex gap-2">
                <input value={reply.data.text} onChange={(e) => reply.setData('text', e.target.value)}
                  placeholder={selected.status === 'closed' ? 'Conversa resolvida — reabra para responder' : 'Escreva uma resposta…'}
                  disabled={selected.status === 'closed'}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" />
                <button type="submit" disabled={reply.processing || selected.status === 'closed' || !reply.data.text.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {reply.processing ? '…' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }) {
  const mine = m.direction === 'out';
  const isAi = m.author === 'ai';
  const tone = !mine ? 'bg-white border border-slate-200 text-slate-800'
    : isAi ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white';
  const who = !mine ? null : (isAi ? 'IA' : 'Você');
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${tone}`}>
        {who && <div className={`text-[10px] font-semibold mb-0.5 ${isAi ? 'text-blue-100' : 'text-emerald-100'}`}>{who}</div>}
        <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
        <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-slate-400'}`}>{m.at}</div>
      </div>
    </div>
  );
}
