import { createContext, useContext } from 'react';

// Permite que páginas (ex.: Dashboard) acionem o menu mobile da sidebar
// sem precisar que o AppLayout renderize sua própria barra de topo.
export const AppChromeContext = createContext({ openMobileMenu: () => {} });

export function useAppChrome() {
  return useContext(AppChromeContext);
}
