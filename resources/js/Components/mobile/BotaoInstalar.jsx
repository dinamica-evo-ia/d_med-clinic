import { useEffect, useState } from 'react';

/**
 * Botão "Instalar" de 1 toque — só Android/Chrome.
 *
 * O Chrome dispara `beforeinstallprompt` quando o app é instalável; a gente segura o evento e
 * dispara ele no clique. Sem isso, o médico teria que achar "Instalar app" no menu ⋮ — que
 * ninguém acha. O Safari não tem equivalente (por isso o iPhone recebe instruções, não botão).
 */
export default function BotaoInstalar() {
  const [evento, setEvento] = useState(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const jaInstalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (jaInstalado) { setInstalado(true); return; }

    const aoPrompt = (e) => {
      e.preventDefault(); // segura o banner padrão do Chrome pra disparar no NOSSO botão
      setEvento(e);
    };
    const aoInstalar = () => { setInstalado(true); setEvento(null); };

    window.addEventListener('beforeinstallprompt', aoPrompt);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPrompt);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  // Já instalado, ou navegador que não suporta (iPhone) → não mostra nada.
  if (instalado || !evento) return null;

  return (
    <button
      onClick={async () => {
        evento.prompt();
        await evento.userChoice;
        setEvento(null); // o evento só pode ser usado UMA vez
      }}
      className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-[14px] font-semibold text-white active:bg-blue-700"
    >
      📲 Instalar o app na tela inicial
    </button>
  );
}
