import { useState, useEffect } from 'react';

const EVO_ORIGIN = 'https://app.dmedevo.com.br';

/**
 * Ditar um texto pelo Studio Med (EVO), sem virar anamnese.
 *
 * Reaproveita o MESMO token/embed do Studio: /studio-med/token devolve a studioUrl com o JWT,
 * o EVO grava e responde por postMessage `dmed:anamnese` com {resumo, transcricao}. A diferença
 * é o destino: em vez de POST /studio-med/anamnese-ia (que cria um prontuário de anamnese),
 * aqui o texto volta pro campo, o médico revisa e salva como evolução.
 *
 * Por isso NÃO precisou mexer no EVO: o `resumo` que ele já produz é exatamente o que uma
 * evolução quer — o relato da consulta em texto corrido.
 */
export default function StudioDictation({ patientId, onText, onClose }) {
  const [studioUrl, setStudioUrl] = useState(null);
  const [erro, setErro] = useState(null);
  const [abrindo, setAbrindo] = useState(true);

  useEffect(() => {
    if (!patientId) { setErro('Escolha o paciente antes de gravar.'); setAbrindo(false); return; }
    let vivo = true;
    (async () => {
      try {
        const { data } = await window.axios.post('/studio-med/token', { pacienteId: patientId });
        if (vivo) setStudioUrl(data.studioUrl);
      } catch (e) {
        if (vivo) setErro(e.response?.data?.message || 'Não consegui abrir o Studio.');
      }
      if (vivo) setAbrindo(false);
    })();
    return () => { vivo = false; };
  }, [patientId]);

  useEffect(() => {
    function onMsg(e) {
      if (e.origin !== EVO_ORIGIN) return;
      if (e.data?.type !== 'dmed:anamnese') return;

      // O resumo é o relato da consulta — é o que a evolução quer. Sem ele, cai na transcrição
      // (só os turnos clínicos; conversa social/administrativa não entra no prontuário).
      let texto = (e.data.resumo || '').trim();
      if (!texto && Array.isArray(e.data.transcricao)) {
        texto = e.data.transcricao
          .filter((t) => !t.tipo || t.tipo === 'clinico')
          .map((t) => `${t.falante ? `${t.falante}: ` : ''}${t.texto}`)
          .join('\n');
      }
      if (texto) onText(texto);
      onClose();
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onText, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Gravar evolução pelo Studio Med</h3>
            <p className="text-xs text-slate-500">Ao terminar, o texto cai no campo pra você revisar antes de salvar.</p>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">&times;</button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {abrindo && <p className="py-12 text-center text-sm text-slate-400">Abrindo o Studio…</p>}
          {erro && <p className="py-12 text-center text-sm text-rose-600">{erro}</p>}
          {studioUrl && (
            <iframe src={studioUrl} allow="microphone" title="Studio Med"
              className="w-full rounded-xl border-0" style={{ height: '70vh' }} />
          )}
        </div>
      </div>
    </div>
  );
}
