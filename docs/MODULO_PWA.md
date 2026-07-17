# PWA — o app do médico (iPhone e Android)

Superfície mobile do CRM: o médico instala na tela inicial e tem **agenda do dia** no bolso e
**aviso quando marcam consulta**. Sem loja, sem review, sem os US$ 99/ano da Apple.

**URL:** `https://crm.dmedclinic.com.br/app` · **Rota:** `mobile.agenda` · **Acesso:** `role:admin,doctor`

---

## Por que PWA e não app nativo

O nativo exigiria **API** — e o CRM tem 153 rotas Inertia e só 4 endpoints de API (`/api/agent/*`,
que são do Atendente e usam token *por clínica*, não por usuário). O `laravel/sanctum` está no
`composer.json` mas **não está ligado em lugar nenhum** (sobra do Breeze): não existe nem "login
do app".

O PWA pula tudo isso: **mesma auth de sessão, mesmos controllers, mesmo deploy**. O cookie já
cobre subdomínio (`SESSION_DOMAIN=.dmedclinic.com.br`) e o `tenancy.by_user` já resolve a clínica.
Só a camada de tela é nova.

> Decisão de escopo: **gravar consulta pelo celular ficou de fora** do v0. A transcrição só
> estabilizou em 2026-07-16 (ver MODULO_ATENDE / EVO) e gravar em navegador de celular é frágil
> (tela apaga, iOS suspende aba em background). Traz depois, com calma.

## Arquivos

| Arquivo | Papel |
|---|---|
| `public/manifest.webmanifest` | Nome, ícones, `display: standalone`, `start_url: /app` |
| `public/sw.js` | Service worker: cache + recebe o push |
| `public/icon-192.png` · `icon-512.png` · `apple-touch-icon.png` | Gerados do `favicon.png` (256px) |
| `resources/views/app.blade.php` | `<link rel=manifest>`, `apple-touch-icon`, `theme-color`, metas iOS |
| `resources/js/app.jsx` | Registra o SW + exclui `Mobile/*` do `AppLayout` de desktop |
| `app/Http/Controllers/MobileController.php` | Agenda do dia + endpoints de push |
| `resources/js/Pages/Mobile/Agenda.jsx` | Tela mobile-first (chrome próprio, safe-area) |
| `resources/js/Components/mobile/AtivarAvisos.jsx` | Liga/desliga push; detecta iOS não-instalado |

---

## ⚠️ Armadilhas (as caras)

### 1. O service worker NÃO pode cachear HTML

O Inertia embute as props da página no `data-page` **do próprio HTML**. Um SW cache-first
serviria o HTML de ontem → **o médico abre e vê a agenda de ontem**. É o desastre clássico de
PWA em cima de Inertia.

Por isso o `sw.js` é **network-first** para tudo, e só faz cache-first de `/build/*` (hash no
nome = imutável; bundle novo tem nome novo, nunca serve versão velha por engano).

### 2. O nginx não conhece `.webmanifest` — e o `nosniff` mata o PWA

O vhost tem `X-Content-Type-Options: nosniff`, ou seja o navegador **não adivinha** o tipo. O
manifest saía como `application/octet-stream` → **rejeitado** → app não instalável. Corrigido em
`deploy/nginx.conf` (versionado, sobrevive a rebuild):

```nginx
location = /manifest.webmanifest { default_type application/manifest+json; }
location = /sw.js { default_type application/javascript; add_header Cache-Control "no-cache"; }
```

O `no-cache` no `sw.js` é o que faz atualização de SW chegar na hora.

### 3. iOS: push SÓ com o app na tela inicial

Web Push no iPhone exige **iOS 16.4+ E o PWA adicionado à Tela de Início**. Em aba do Safari a
API nem existe. Por isso o `AtivarAvisos.jsx` **detecta** (`display-mode: standalone` /
`navigator.standalone`) e, em vez de um botão que não funcionaria, ensina a instalar. Sem isso o
médico ativa, não recebe nada e conclui que o produto é quebrado.

### 4. `push_subscriptions` é central, o disparo é no tenant

A inscrição é do **usuário** (banco central), mas a consulta que gera o aviso vive no **tenant**.
O model `PushSubscription` usa a trait `CentralConnection` — sem ela, Eloquent procuraria a
tabela no banco do tenant → "no such table" (armadilha #11 do handoff).

---

## Web Push

**Chaves VAPID** no `.env.runtime` (`VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`),
lidas por `config/webpush.php`. Sem chaves, `WebPush::configurado()` é `false` e o push
simplesmente não é oferecido — nada quebra. Lib: **minishlink/web-push** (v10) — instalada
dentro do container e o `composer.json/lock` sincronizado container→VPS→Mac→git (mesmo padrão do
dompdf; um rebuild reinstala pelo lock). Funciona **sem a extensão `gmp`** (o container não tem).

### Envio é SÍNCRONO — de propósito

Não existe worker de fila: `QUEUE_CONNECTION=database`, mas o supervisord só roda **php-fpm e
nginx** — um `dispatch()` ficaria parado pra sempre. Segue o desenho do `AttendantNotifier`, que
já manda WhatsApp de forma síncrona. É 1 request HTTP curto (medido: ~5ms) e **sempre** dentro de
try/catch: **aviso que falha nunca pode derrubar o agendamento**.

Inscrição morta (404/410 = aparelho desinstalou) é **removida** no envio — senão a tabela vira
lixo e todo envio futuro gasta tempo com endpoint que não existe.

### Os 3 avisos e onde disparam

```
Consulta muda (IA no WhatsApp OU secretária no CRM)
  → DoctorNotifier::consultaMarcada|Remarcada|Cancelada($appt)
    → appointment.doctor_id → doctors.user_id → users (central)
      → WebPush::paraUsuario() → serviço de push → sw.js "push" → notificação
        → toque → abre /app?data=<dia da consulta>
```

| Aviso | Gatilhos |
|---|---|
| **Marcada** | `AppointmentController@store` · `AttendantAI::toolAgendarConsulta` |
| **Remarcada** (mostra de→para) | `AppointmentController@update` · `@reschedule` (arrastar) · `AttendantAI::toolRemarcarConsulta` |
| **Cancelada** | `AppointmentController@updateStatus` · `AttendantAI::toolCancelarConsulta` |

**Regra central (`DoctorNotifier::destinatario`): nunca avisa quem acabou de fazer a ação.**
Ação da IA/paciente vem com `user_id` null → o aviso sai, que é o caso que importa.

> ⚠️ Isso confunde no teste: o médico marca a **própria** consulta, não recebe nada e acha que
> está quebrado. Por isso o card de avisos tem o botão **"Enviar um aviso de teste"**
> (`/app/push/test`) e diz isso na tela.

> 🔴 O buraco que isso fecha: o `AttendantNotifier` avisava só o **paciente**. **Não existia uma
> única notificação indo pro médico em todo o sistema** — a IA marcava às 22h e ele só descobria
> abrindo o CRM (levantado em 2026-07-16). Remarcar/cancelar pesa ainda mais que marcar: muda o
> dia dele. O caso ruim que o "cancelada" evita — paciente cancela pela IA às 22h e o médico
> aparece na clínica esperando atender.

> Nota: a lib emite um *deprecation* do `guzzlehttp/psr7` que aparece no `tinker`. É cosmético —
> `APP_DEBUG=false` em produção e a entrega funciona (medido).

---

## `doctors.user_id` — o vínculo que era frágil

O CRM achava o médico logado com `Doctor::where('email', auth()->user()->email)`. Funcionava
**por coincidência**: cada médico digitou o mesmo e-mail duas vezes (no login e na ficha). Nada
obriga isso. Divergiu → o médico **não é reconhecido, em silêncio**: perde Studio Med e perderia
todo push.

Migration `2026_07_17_090000_add_user_id_to_doctors` cria a coluna e faz **backfill pelo e-mail
atual** (que batia — medido). **9 de 9 fichas vinculadas**, incluindo Dr. Ricardo e Dr. Alexandre.

**Sem foreign key de propósito:** `users` é central e `doctors` é do tenant — SQLite não enforça
FK entre arquivos `.sqlite` (armadilha #13).

Use **sempre** `Doctor::paraUsuario($user)` — resolve por `user_id`, cai no e-mail só como
retrocompat e, quando acha assim, **grava o `user_id`** (o vínculo se conserta sozinho no primeiro
uso). Já aplicado em `StudioMedController` (2 pontos) e `MobileController`.

---

## Como instalar (o que dizer pro médico)

1. Abrir `https://crm.dmedclinic.com.br/app` no celular, logado.
2. **iPhone (Safari):** Compartilhar → **Adicionar à Tela de Início**. Abrir **por lá** (senão o
   push não existe).
3. **Android (Chrome):** menu ⋮ → **Instalar app**.
4. Dentro do app: **Ativar** no card de avisos.

## Estado / próximos

- ✅ Agenda do dia (lista, navegação de dia, próxima consulta destacada, toque abre a ficha)
- ✅ Instalável (manifest + ícones + tipos MIME corretos)
- ✅ Service worker network-first + handler de push
- ✅ Push **marcada · remarcada · cancelada** (IA e secretária) + `doctors.user_id`
- ✅ **Entrega provada em aparelho real** (iPhone iOS 18.7, 2026-07-17): os 3 avisos = 1 entregue cada
- ⏳ Buscar paciente e receita no celular
- ⏳ Gravar consulta pelo celular (adiado — ver acima)
