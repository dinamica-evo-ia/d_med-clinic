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

---

## Instalar sem dor: QR com login de uma vez

**A fricção que isto mata:** o médico precisava saber que o `/app` existe, digitar a URL no
celular, **logar com e-mail e senha no teclado do telefone** e ainda descobrir sozinho o
"Adicionar à Tela de Início". Quatro chances de desistir — e a pior era o login.

**Menu do avatar → "Instalar app no celular"** (`/account/instalar-app`, `role:admin,doctor`) traz:

1. **QR code** — aponta a câmera e o celular abre **já logado**.
2. **"Enviar link pro meu WhatsApp"** — usa o telefone da ficha do médico + a conexão de WhatsApp
   que a clínica já tem. Ele toca no link no próprio celular. Sem QR, sem digitar.
3. **Passo a passo do iPhone** (Compartilhar → Adicionar à Tela de Início), com o aviso de que
   sem instalar não há push.
4. **Botão "Instalar"** nativo dentro do `/app` no Android (`beforeinstallprompt`) — 1 toque.
   O Safari não tem equivalente; por isso o iPhone recebe instrução, não botão.

### 🔴 Isto é uma superfície de LOGIN — as defesas não são decoração

`LoginToken` (central, `CentralConnection`) + `GET /app/entrar/{token}` **sem auth** (é o ponto
onde o celular se autentica). Mesmo padrão do WhatsApp Web. O que segura:

| Defesa | Por quê |
|---|---|
| **sha256** — só o hash no banco | Banco vazou → tokens inúteis (igual `tenant_api_keys`) |
| **2 min de validade** | Fotografar a tela do QR não vale de nada depois |
| **Uso único** (`used_at` marcado *antes* de logar) | Dois aparelhos escaneando junto → só um entra |
| **QR novo apaga o anterior** | Tela esquecida aberta não deixa porta aberta |
| **Só gera pra si mesmo** | Quem gera já provou ser o dono da conta naquele momento |
| **Erro genérico** | Não dizemos se expirou, foi usado ou nunca existiu — não vira oráculo |
| `used_user_agent` | Auditoria: que aparelho consumiu |

`tenant_slug` viaja no token porque a sessão do celular nasce zerada — sem ele o
`tenancy.by_user` não saberia qual clínica abrir pra quem tem mais de uma. Por isso a rota fica
**fora** do grupo de tenancy (inicializar tenant antes de existir usuário logado quebraria).

**Testado (2026-07-17), os 5 casos incluindo ataque:** válido → loga na clínica certa · reuso →
recusado · expirado → recusado · inventado → recusado · QR novo invalida o anterior. E o token
cru não existe no banco.

> Risco residual, honesto: **quem vir o QR nesses 2 minutos entra como o médico.** Não deixe a
> tela exposta nem compartilhe a tela em call. A própria tela avisa isso.

QR: **bacon/bacon-qr-code** (v3) gerando **SVG** — o container não tem `gd` nem `imagick`, e SVG
não precisa. Vai inline como data-URI, sem rota de imagem nem storage.

---

## Um computador + um celular por usuário (regra do plano)

Regra do dono (2026-07-17). Limites em `plans.web_sessions` / `plans.app_devices` (`null` = ∞,
mesma convenção de `doctors`/`staff`), editáveis em **`/master/planos`**. Todos nascem **1 e 1** —
a régua comercial ainda vai ser revista; a estrutura é que precisava existir.

`App\Support\SessionLimit::aplicar($user, $sessionId, $userAgent)` roda **depois** do
`session()->regenerate()` (o id muda ali e é ele que tem que sobreviver) nos **dois** logins:
`AuthenticatedSessionController@store` e `InstallAppController@entrar` (QR).

**Como sabe quem é quem:** a tabela `sessions` do Laravel **já guarda o `user_agent`** — dá pra
classificar celular × computador sem tabela nova, sem parsear o payload da sessão, e sem depender
de *como* a pessoa logou (formulário ou QR). Também cobre sessões que já existiam antes da regra.
`ipad` conta como **celular**: pro médico é "o aparelho", não o computador.

> 🔴 O ponto que importa: **cada classe tem sua vaga.** Entrar no computador **não** derruba o
> celular, e vice-versa. Só o computador antigo cai quando ele loga num computador novo.

Detalhes: **master é isento** (impersona e usa várias telas — limitar só atrapalha o suporte) ·
exige `SESSION_DRIVER=database` (é o caso; com outro driver não há o que derrubar, e a função sai
sem fazer nada em vez de falhar em silêncio) · resolver o plano nunca pode impedir alguém de
logar, então erro ali cai no padrão 1+1.

**Testado (2026-07-17)** com sessões sintéticas e restaurando as reais depois: classificação
(PC/iPhone/Android/iPad) ✓ · login no PC derruba PC velho e **mantém o celular** ✓ · login no
celular derruba celular velho e **mantém o PC** ✓ · master isento ✓.

## Como instalar (o que dizer pro médico)

1. No computador, menu do avatar → **Instalar app no celular**.
2. **Aponte a câmera** no QR (ou receba o link no WhatsApp). O app abre já logado.
3. **iPhone:** Compartilhar → **Adicionar à Tela de Início**. Abrir **por lá** (senão não há push).
   **Android:** toque em **Instalar**.
4. Dentro do app: **Ativar** no card de avisos.

## Estado / próximos

- ✅ Agenda do dia (lista, navegação de dia, próxima consulta destacada, toque abre a ficha)
- ✅ Instalável (manifest + ícones + tipos MIME corretos)
- ✅ Service worker network-first + handler de push
- ✅ Push **marcada · remarcada · cancelada** (IA e secretária) + `doctors.user_id`
- ✅ **Entrega provada em aparelho real** (iPhone iOS 18.7, 2026-07-17): os 3 avisos = 1 entregue cada
- ⏳ Buscar paciente e receita no celular
- ⏳ Gravar consulta pelo celular (adiado — ver acima)
