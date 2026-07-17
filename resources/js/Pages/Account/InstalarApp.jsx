import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function InstalarApp({ qr: qrInicial, validade_segundos = 120, whatsapp = {} }) {
  const { flash } = usePage().props;
  const [qr, setQr] = useState(qrInicial);
  const [restam, setRestam] = useState(validade_segundos);
  const [gerando, setGerando] = useState(false);
  const timer = useRef(null);

  // Contagem regressiva: o QR morre em 2 min (é um login — janela curta de propósito).
  // Sem mostrar isso, o médico escaneia um QR morto e acha que o sistema está quebrado.
  useEffect(() => {
    clearInterval(timer.current);
    setRestam(validade_segundos);
    timer.current = setInterval(() => setRestam((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(timer.current);
  }, [qr, validade_segundos]);

  const gerarOutro = async () => {
    setGerando(true);
    try {
      const r = await fetch('/account/instalar-app/qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || ''),
        },
      });
      if (r.ok) setQr(await r.json());
    } finally {
      setGerando(false);
    }
  };

  const expirado = restam <= 0;
  const mmss = `${Math.floor(restam / 60)}:${String(restam % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-3xl">
      <Head title="Instalar app no celular" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Instalar o app no seu celular</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sua agenda do dia no bolso, e aviso na hora em que marcarem consulta pra você.
        </p>
      </div>

      {flash?.success && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">{flash.success}</div>}
      {flash?.error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{flash.error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {/* QR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-sm font-semibold text-slate-900">1. Aponte a câmera do celular</h2>
          <p className="mt-1 text-xs text-slate-500">O app abre <strong>já logado</strong> — sem digitar senha no telefone.</p>

          <div className="relative mt-4 inline-block">
            <img src={qr.svg} alt="QR code para abrir o app no celular" className={`h-60 w-60 ${expirado ? 'opacity-20 blur-sm' : ''}`} />
            {expirado && (
              <div className="absolute inset-0 grid place-items-center">
                <button onClick={gerarOutro} disabled={gerando}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {gerando ? 'Gerando…' : 'Gerar novo QR'}
                </button>
              </div>
            )}
          </div>

          <p className={`mt-3 text-xs ${expirado ? 'text-slate-400' : 'text-slate-500'}`}>
            {expirado ? 'Este QR expirou.' : <>Vale por <strong className="tabular-nums">{mmss}</strong> — é um acesso à sua conta.</>}
          </p>
        </div>

        {/* WhatsApp */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Ou receba o link no WhatsApp</h2>
          {whatsapp.disponivel ? (
            <>
              <p className="mt-1 text-xs text-slate-500">
                Mandamos pro seu número <strong>{whatsapp.telefone_mascarado}</strong> (o da sua ficha de médico).
                É só tocar no link pelo celular.
              </p>
              <button
                onClick={() => router.post('/account/instalar-app/whatsapp', {}, { preserveScroll: true })}
                className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                📲 Enviar link pro meu WhatsApp
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Indisponível: é preciso ter o <strong>WhatsApp da clínica conectado</strong> e um <strong>telefone
              na sua ficha de médico</strong>. Use o QR ao lado.
            </p>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">2. Deixe na tela inicial</h3>
            <ul className="mt-2 space-y-2 text-xs text-slate-600">
              <li>
                <strong>iPhone:</strong> toque em <strong>Compartilhar</strong> (o quadradinho com a seta pra cima,
                embaixo) → <strong>Adicionar à Tela de Início</strong>.
                <span className="mt-1 block text-[11px] text-amber-700">
                  ⚠️ No iPhone os avisos só funcionam abrindo por esse ícone — pelo Safari não chegam.
                </span>
              </li>
              <li><strong>Android:</strong> toque em <strong>Instalar</strong> quando aparecer, ou menu ⋮ → Instalar app.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        <strong className="text-slate-700">Por que o QR expira rápido?</strong> Ele dá acesso à sua conta — quem
        escanear entra como você. Por isso vale só 2 minutos e some depois do primeiro uso. Não fotografe nem
        compartilhe a tela do QR.
      </div>
    </div>
  );
}
