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

/* ---------- Web Push ---------- */

// Chegou um aviso do servidor (ex.: "consulta marcada"). O payload vem do App\Support\WebPush.
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { title: "D_Med Clinic", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(d.title || "D_Med Clinic", {
      body: d.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // tag+renotify: aviso novo do mesmo assunto substitui o anterior em vez de empilhar
      // 5 notificações iguais na tela do médico.
      tag: d.tag || "dmed",
      renotify: true,
      data: { url: d.url || "/app" },
    })
  );
});

// Tocou na notificação → foca a aba do app se já estiver aberta, senão abre.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const alvo = (event.notification.data && event.notification.data.url) || "/app";

  event.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const aba of abas) {
        if (aba.url.includes(alvo) && "focus" in aba) return aba.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(alvo);
    })()
  );
});
