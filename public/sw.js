/*
 * Service worker do D_Med Clinic (PWA).
 *
 * ⚠️ REGRA DE OURO: NUNCA cachear HTML / resposta do Inertia. As props da página vêm embutidas
 * no `data-page` do próprio HTML — se a gente servir um HTML cacheado, o médico abre e vê a
 * AGENDA DE ONTEM. Por isso navegação/documento é sempre NETWORK-FIRST (rede manda, cache só é
 * usado como último recurso offline, e nunca para HTML).
 *
 * Só fazemos cache-first de /build/* — são os assets do Vite, com hash no nome, imutáveis.
 * Um bundle novo tem nome novo, então nunca há versão "velha" servida por engano.
 */
const CACHE = "dmed-static-v1";

self.addEventListener("install", (event) => {
  // Ativa já, sem esperar as abas antigas fecharem.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Limpa caches de versões anteriores do SW.
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST/PUT etc. sempre direto na rede

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // terceiros: não intercepta

  // Assets imutáveis do Vite → cache-first (rápido e seguro; nome tem hash).
  if (url.pathname.startsWith("/build/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const resp = await fetch(req);
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      })
    );
    return;
  }

  // Todo o resto (páginas, APIs, dados) → NETWORK-FIRST. Cache só como salva-vidas offline,
  // e JAMAIS para documento HTML (evita servir agenda velha).
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch (e) {
        const hit = await caches.match(req);
        if (hit) return hit;
        throw e;
      }
    })()
  );
});
