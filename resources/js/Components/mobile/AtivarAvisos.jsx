import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// A chave VAPID vem em base64url; a API do navegador exige Uint8Array.
function chaveParaBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
// "Instalado" = aberto pela tela inicial, não numa aba do navegador.
const estaInstalado = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

/**
 * Liga/desliga o Web Push deste aparelho.
 *
 * ⚠️ iOS: push só existe se o PWA estiver na Tela de Início (iOS 16.4+). Numa aba do Safari a
 * API nem aparece — por isso, em vez de um botão que não funciona, mostramos como instalar.
 */
export default function AtivarAvisos({ chavePublica }) {
  const [estado, setEstado] = useState('carregando'); // carregando|indisponivel|precisa_instalar|off|on|erro
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      const temAPI = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

      if (!temAPI) {
        // No iPhone, a causa quase sempre é "ainda não instalou na tela inicial".
        setEstado(ehIOS() && !estaInstalado() ? 'precisa_instalar' : 'indisponivel');
        return;
      }
      if (ehIOS() && !estaInstalado()) {
        setEstado('precisa_instalar');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setEstado(sub ? 'on' : 'off');
      } catch {
        setEstado('erro');
      }
    })();
  }, []);

  const ligar = async () => {
    setOcupado(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setEstado('off'); setOcupado(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true, // exigido pelos navegadores: todo push tem que virar notificação
        applicationServerKey: chaveParaBytes(chavePublica),
      });
      router.post('/app/push/subscribe', sub.toJSON(), {
        preserveScroll: true,
        onSuccess: () => setEstado('on'),
        onFinish: () => setOcupado(false),
      });
    } catch (e) {
      console.warn('push falhou:', e);
      setEstado('erro');
      setOcupado(false);
    }
  };

  const desligar = async () => {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        router.delete('/app/push/subscribe', {
          data: { endpoint },
          preserveScroll: true,
          onSuccess: () => setEstado('off'),
          onFinish: () => setOcupado(false),
        });
      } else { setEstado('off'); setOcupado(false); }
    } catch { setOcupado(false); }
  };

  if (estado === 'carregando' || estado === 'indisponivel') return null;

  if (estado === 'precisa_instalar') {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-[13px] text-blue-900">
        <p className="font-semibold">📲 Receba aviso de consulta marcada</p>
        <p className="mt-1 text-blue-800">
          No iPhone, os avisos só funcionam com o app na tela inicial: toque em{' '}
          <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>, depois abra por lá.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-800">
            {estado === 'on' ? '🔔 Avisos ativos neste aparelho' : '🔕 Avisos desligados'}
          </p>
          <p className="text-[12px] text-slate-500">
            {estado === 'on'
              ? 'Avisamos quando a secretária ou a IA marcar consulta pra você.'
              : 'Ative pra saber quando marcarem consulta.'}
          </p>
        </div>
        <button
          onClick={estado === 'on' ? desligar : ligar}
          disabled={ocupado}
          className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold disabled:opacity-50 ${
            estado === 'on' ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'
          }`}
        >
          {ocupado ? '…' : estado === 'on' ? 'Desligar' : 'Ativar'}
        </button>
      </div>

      {estado === 'on' && (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <button
            onClick={() => router.post('/app/push/test', {}, { preserveScroll: true })}
            className="text-[12px] font-semibold text-blue-600 underline underline-offset-2"
          >
            Enviar um aviso de teste
          </button>
          {/* Sem isto o médico não tem como provar que funciona: quando ELE marca a própria
              consulta a gente não avisa de propósito — então o teste óbvio não dispara nada. */}
          <p className="mt-1 text-[11px] text-slate-400">
            Marcar consulta pra si mesmo não gera aviso — só quando outra pessoa (ou a IA) marca.
          </p>
        </div>
      )}
    </div>
  );
}
