# Módulo D_Med Atende — atendente de WhatsApp com IA

> **Status:** Fases 1–5 implementadas e testadas (2026-07-08). O cérebro (Claude) foi validado com créditos reais — entende, consulta horários reais e **marca de verdade** na agenda.
> Em 2026-07-15 entrou o provedor **Evolution API** (open source) e um servidor Evolution subiu no VPS: criar instância, apontar webhook e **gerar QR** já foram testados de ponta a ponta. Falta **ler o QR com um celular** e rodar uma conversa real.

## O que é
Atendente virtual de WhatsApp, **embutido no próprio D_Med** (não é app à parte, não usa Supabase).
Conversa com o paciente, **reconhece quem já é cadastrado** (pelo telefone), oferece **horários reais**
da agenda e **marca a consulta** — tudo lendo/gravando direto no banco do tenant que o CRM já usa.

### Por que módulo (e não o D_Agent separado)
O D_Med já tem pacientes, agenda, disponibilidade (`DoctorSchedule::freeSlots`) e marcação com porteiro
(expediente + conflito). O atendente de paciente é só **WhatsApp + IA** por cima disso. Fazer dentro do
D_Med evita Supabase, API entre sistemas e duplicação. O D_Agent (Lovable/Supabase) fica para o caso
"atendente universal para outros CRMs" — não é o caso da clínica.

## Discrição (CRM continua clean p/ o médico)
- **Médico não vê nada**: nav "Atendente" só aparece p/ **admin + secretária**; rotas `role:admin,receptionist`
  (médico → 403). O médico só vê as consultas caindo na agenda normal.
- Ligável por clínica (`attendant_settings.enabled`).

## Arquitetura / arquivos
**Dados (tenant DB)** — migrations `2026_07_08_130000` (tabelas) e `2026_07_08_140000` (WhatsApp):
- `attendant_settings` — config do bot + `provider` + credenciais do provedor + `webhook_token` + autonomia (singleton por clínica, `AttendantSetting::current()`).
- `attendant_conversations` / `attendant_messages` — conversas e mensagens (in/out).
- `attendant_knowledge` — FAQ/base de conhecimento que a IA usa.

**Backend**
- `App\Http\Controllers\AttendantController` — painel (index/update), conectar/desconectar/testar WhatsApp, e o **webhook público** de entrada.
- `App\Support\Whatsapp\*` — **camada de provedor** (ver seção abaixo). `Whatsapp::for($s)` escolhe por `attendant_settings.provider`; `Whatsapp::parseInbound()` normaliza a entrada (`messages.upsert`), igual nos dois provedores.
- `App\Support\Claude` — cliente fino da Messages API da Anthropic (tool-use).
- `App\Support\AttendantAI` — **o cérebro**: system prompt (persona/FAQ/paciente), histórico, loop de ferramentas, envio. Ferramentas: `listar_medicos`, `consultar_horarios` (horários reais), `agendar_consulta` (reusa porteiro do `AgentController`).

**Rotas**
- `routes/web.php` (grupo `role:admin,receptionist`): `GET/PUT /atendente`, `POST /atendente/whatsapp/{connect,disconnect,test}`.
- `routes/api.php` (público, isento de CSRF, fora do token do agent): `POST /api/whatsapp/webhook/{tenant}` — valida `webhook_token`, inicializa o tenant pela URL, grava a mensagem e dispara a IA.

**Frontend**
- `resources/js/Pages/Attendant/Index.jsx` — liga/desliga, config do bot, card de conexão do WhatsApp (conectar/testar/URL do webhook/desconectar).
- `resources/js/Pages/Attendant/Inbox.jsx` (Fase 4) — 2 painéis (lista + thread com bolhas paciente/IA/humano), responder manual, assumir/devolver ao bot/resolver, polling 6s.
- Nav em `Components/Layouts/AppLayout.jsx` (seção "Atendimento": Atendente + Conversas); realce por correspondência mais longa.
- `HandleInertiaRequests` passou a compartilhar `flash` (success/error).

**Inbox / handoff (Fase 4)** — `AttendantController::{conversations,reply,conversationStatus}`. Quando a secretária responde manual, a conversa vira `handoff` (a IA para de responder, via guard no `AttendantAI::maybeRespond`). "Devolver ao bot" volta pra `open`; "Resolver" = `closed`.

**Avisos de mudança (Fase 5)** — `App\Support\AttendantNotifier` (`cancelled`/`rescheduled`). Ganchos em `AppointmentController::{updateStatus,reschedule,update}`: quando a recepção cancela ou remarca, o paciente é avisado no WhatsApp. Só avisa quem já se relaciona por WhatsApp (consulta `source='atende'` OU conversa existente) — evita mensagem-surpresa. Nunca quebra a ação do CRM (try/catch). O aviso aparece no inbox como bolha `author_type='system'` ("Aviso automático").

**Polimento (2026-07-08)** — fechados 5 gaps da auditoria:
- **A) Horário de atendimento** (`business_hours` open/close + fim de semana): fora do horário o bot envia `offhours_message` (anti-spam 30min) e não aciona a IA. `welcome_message` entra no system prompt. `AttendantSetting::isWithinBusinessHours()`.
- **B) Base de conhecimento (FAQ)**: CRUD em `AttendantController::{storeKnowledge,updateKnowledge,destroyKnowledge}` + seção na página de config. O bot já usava no prompt; agora a clínica edita.
- **C) Fallback de mídia**: `Whatsapp::parseInbound` detecta tipo; áudio/foto sem legenda viram `[Áudio recebido]`, e o prompt instrui a IA a pedir texto.
- **D) Paciente cancela/remarca pelo bot**: tools `minhas_consultas`, `cancelar_consulta`, `remarcar_consulta` (auto_schedule) — remarcar passa pelo mesmo porteiro (expediente+conflito).
- **E) Status real do WhatsApp**: `Whatsapp::connectionState` + `GET /atendente/whatsapp/status` + botão "Verificar conexão" (open/close/connecting). Endpoint exato do WADuck a confirmar no teste real.

## Provedores de WhatsApp

| Provedor | `provider` | O que é |
|---|---|---|
| **WADuck** | `waduck` | Evolution **hospedada** por terceiro. Pareia o número no painel deles; aqui só entram instância + chave |
| **Evolution API** | `evolution` | [Open source, self-hosted](https://github.com/evolution-foundation/evolution-api). Cria a instância e **pareia por QR na própria tela** |
| Meta / Cloud API | — | Oficial. **Pendente** — entra como mais uma classe, sem tocar em quem chama |

Os dois falam a **mesma API** (a WADuck é uma Evolution hospedada): header `apikey`,
`POST /message/sendText/{instancia}` com `{number,text}`, webhook `messages.upsert`.

    WhatsappProvider (base: sendText, connectionState)
      ├── WaduckProvider     — prefixo /v1 no path
      └── EvolutionProvider  — sem prefixo + pair() / setWebhook() / logout()

### 🔴 Evolution v2 — o que quebra se copiar exemplo velho da internet

1. **Paths sem `/v1`** (a WADuck tem; a Evolution não).
2. **`sendText` recebe `{number,text}` plano** — na v1 era `{number, textMessage:{text}}`.
3. **`webhook/set` recebe ANINHADO**: `{"webhook":{enabled,url,events}}` — na v1 era plano.
4. **Os eventos no `set` são UPPER_SNAKE** (`MESSAGES_UPSERT`), mas o webhook **CHEGA** com
   `event: "messages.upsert"` (minúsculo com ponto). São grafias diferentes do mesmo evento.
5. **`/instance/connect` responde de dois jeitos**: com o QR no topo (quando `connecting`/
   `close`) e aninhado em `qrcode` no outro ramo. O `pair()` aceita os dois.
6. **`hash`** (token da instância) vem string na v2; versões antigas devolviam `{apikey:...}`.

> Tudo acima foi conferido **no código do repo** (`webhook.schema.ts`, `event.controller.ts`,
> `instance.controller.ts`), não em blog post. Doc oficial:
> **https://docs.evolutionfoundation.com.br** — o domínio antigo (`doc.evolution-api.com`)
> responde 404, e é pra ele que quase todo tutorial de Evolution ainda aponta.

### 🔴 Ordenação embutida em relação NÃO é substituída — é ANEXADA

`AttendantConversation::messages()` tinha `->orderBy('created_at')`. O `history()` fazia
`->latest('id')` achando que isso definia a ordem. O SQL saía:

```sql
ORDER BY created_at ASC, id DESC   -- o PRIMEIRO critério vence
```

Resultado: a query voltava do mais **velho** pro mais novo, e o `->reverse()` seguinte
entregava **a conversa inteira invertida pro Claude**. O bot lia de trás pra frente, achava
que as mensagens estavam "com caracteres estranhos" (um nome solto como "Kledson", sem
contexto, parece string aleatória) e **repetia a mesma pergunta pra sempre** — nunca agendava.

O mesmo bug fazia a **prévia do Inbox** mostrar a PRIMEIRA mensagem da conversa em vez da
última (`$c->messages()->latest('id')->first()` devolvia a mais antiga).

**Correção:** a relação não ordena mais nada; quem chama ordena explicitamente, e por **`id`**
(não `created_at`, que só tem precisão de segundo e empata quando o paciente manda duas
seguidas). Se precisar de ordem diferente da relação, use `reorder()` — nunca `orderBy()`.

> Por que passou nos testes de 2026-07-08: com 1 ou 2 mensagens, conversa invertida é
> indistinguível de conversa certa. **Só aparece em diálogo real de várias trocas** — que foi
> exatamente o primeiro teste de ponta a ponta com WhatsApp de verdade (2026-07-15).

### 🔴 A IA dizia que marcou — e não marcava

Primeiro teste real (2026-07-15): o bot respondeu *"Sua consulta foi marcada com sucesso! 🎉"*
e **nenhuma consulta foi criada**. O paciente apareceria na clínica sem consulta.

Duas causas somadas:

1. **O prompt nunca proibiu declarar sucesso sem ferramenta.** Só dizia "confirme antes de
   chamar agendar_consulta". O modelo confirmou, e escreveu o "marcado!" de cabeça.
2. **`tool_use`/`tool_result` não são gravados no banco** — só o texto. Como o `history()`
   remonta a conversa do banco a cada mensagem que chega, a IA **perde o `medico_id` e o
   horário ISO entre uma mensagem e outra**. No "Confirmo" ela não tinha como chamar a
   ferramenta nem se quisesse.

**Correções:** regra dura no prompt ("a consulta só existe se agendar_consulta devolver
sucesso") + **lista de médicos com `medico_id` direto no system prompt**, que é o que
devolve à IA o dado que ela perdia entre turnos.

> Persistir os blocos de ferramenta no banco resolveria a causa 2 na raiz — hoje só
> contornamos. Fica como pendência se aparecer outro sintoma do mesmo tipo.

### Rótulo de período inventado

O bot listou os 8 horários **corretos** (08:00–11:30, agenda só de quarta de manhã) sob o
título *"⏰ Hoje à tarde:"* — e ainda escreveu "(8 da manhã)" ao lado do 08:00, se
contradizendo. A ferramenta estava certa; o texto é que mentia. Regra no prompt: escrever só
o que a ferramenta devolveu, sem inventar manhã/tarde/noite.

### 🔴 Buscar paciente por telefone duplica cadastro

`resolvePatient()` procurava só por `phone`/`whatsapp`. Na base real do Dr. Ricardo:
**2466 pacientes, 1521 com CPF, apenas 15 com telefone** — o import não trouxe telefone.
Ou seja, a busca por telefone falhava em ~99% e o bot criaria um cadastro **novo** pra quem
já era paciente há anos, perdendo o histórico.

Agora existe a ferramenta **`identificar_paciente`** (CPF → cadastro), o prompt manda pedir
**nome + CPF** antes de marcar, e o `agendar_consulta` procura por **CPF antes de telefone**
e só cria cadastro novo com CPF na mão. Ao identificar, o WhatsApp do contato é gravado no
cadastro antigo (que estava sem).

> ⚠️ A coluna do CPF é **`document`**, não `cpf` — e guarda **só dígitos**, sem máscara.
> A busca normaliza os dois lados.

### 🔴 Fuso: a consulta caía 3h antes (bug do CRM inteiro, não só da IA)

Paciente pediu **10:00**, a agenda mostrou **07:00** — exatamente o offset de São Paulo.
Não era a IA: **o CRM tinha duas convenções brigando na mesma coluna**.

- `config/app.php` tinha `'timezone' => 'UTC'` **hardcoded** (nem lia do `.env`).
- Mas todo mundo **gravava hora de parede de São Paulo**: o `datetime-local` do form manda
  `"2026-07-22T14:00"` cru, e a IA montava um Carbon em SP.
- O Laravel então serializava esse `14:00` como **`"14:00:00.000000Z"`** no JSON — com o `Z`
  de UTC — e o navegador convertia pra `11:00`.

Ou seja: **criar consulta pelo formulário do CRM também caía 3h antes**. Só o arrastar-pra-
reagendar acertava, porque mandava `toISOString()` (UTC de verdade).

**Correção:** `APP_TIMEZONE=America/Sao_Paulo` (o produto é fuso único) + o reschedule passou
a mandar **hora de parede** via `spWall()`. As consultas que já existiam estavam gravadas em
hora de parede, então **passaram a exibir certo sem migrar dado**.

> ⚠️ **O Laravel IGNORA o sufixo `Z`** e lê o valor como hora do fuso do app. Quem escrever
> data-hora tem que mandar hora de parede de São Paulo — `toISOString()` faz pular +3h.
> Foi medido, não deduzido: com o app em SP, `"...T17:00:00.000Z"` virou `17:00` no banco.

### Scroll do Inbox pulando sozinho

`useEffect(..., [messages])` + polling de 6s = o Inertia devolve um **array novo** a cada
recarga mesmo sem mensagem nova, a dependência dispara e o `scrollIntoView` jogava a tela pro
fim a cada 6 segundos — impossível ler a conversa. Agora compara o **id da última mensagem**
(identidade de array não serve) e só rola se você já estiver no fim.

### 🔴 A janela de 7 dias escondia a semana seguinte

`consultar_horarios` tinha `dias` padrão **7**. A partir de uma **quarta**, a janela vai de
15/07 a **21/07 (terça)** — a quarta seguinte (22/07) fica de fora **por um dia**. Como o
Dr. Ricardo atende **só às quartas**, a ferramenta devolvia **apenas os horários de hoje**, e
a IA não tinha como oferecer "semana que vem". Ela não estava mentindo: o sistema é que não
mostrava.

Medido:

| `dias` | o que volta |
|---|---|
| 7 | qua 15/07 |
| 8 | qua 15/07 · qua 22/07 |
| 21 | qua 15/07 · 22/07 · 29/07 |

**Padrão agora é 21** (garante ~3 ocorrências de qualquer dia da semana), máx 90.

### 🔴 `take(20)` cortava o último dia no meio (e a IA repassava a mentira)

`consultar_horarios` fazia `->take(20)` na lista **achatada** de horários. Com 3 quartas de 8
horários (24 no total), a IA recebia o último dia com só **4** e concluía que a quarta 29/07
**terminava às 09:30** — quando vai até 11:30. Diria isso ao paciente com toda a confiança.

Corte silencioso é veneno pra ferramenta de IA: o modelo não tem como saber que a lista veio
truncada, então trata o fim da lista como o fim da realidade.

**Correção:** agrupa por **dia** e corta em **dias inteiros** (máx 4), nunca no meio de um dia,
e devolve **`mais_dias`** com quantos ficaram de fora — assim a IA sabe que existe mais coisa
em vez de concluir "acabou". O `inicio` em ISO continua indo por horário (é o que o
`agendar_consulta` consome).

```json
{"dias":[{"dia":"qua 22/07","horarios":[{"hora":"08:00","inicio":"2026-07-22T08:00:00-03:00"}]}],
 "mais_dias":0, "janela_dias":21}
```

### 🔴 A IA não sabia os dias de atendimento — e errava as datas

Ela ofereceu *"Segunda (22/07), terça (23/07), quarta (24/07)"*. **22/07/2026 é quarta**, não
segunda: errou por 2 dias. E ofereceu segunda/terça pra um médico que **só atende quarta** —
a regra estava no CRM, mas nunca chegava ao prompt.

**Correções:** os **dias de atendimento de cada médico** entram no system prompt
(`atende: quarta 08:00–12:00`), e há regra explícita proibindo calcular data/dia da semana de
cabeça — o campo `quando` da ferramenta já vem com o dia escrito, é só copiar.

> Conta de calendário é o tipo de coisa que LLM erra em silêncio. Se o dado existe no banco,
> mande pronto — não peça pro modelo deduzir.

### Parear sem escanear: código de pareamento

`pair($webhookUrl, $phone)` — passando o telefone (com DDI), o Baileys devolve um
**código de 8 caracteres** em vez do QR. A pessoa digita no app em **Aparelhos conectados →
Conectar com número de telefone**. Serve quando não dá pra escanear (sem câmera, celular
longe — dá pra mandar o código por mensagem pra quem está com ele).

> ⚠️ **Não elimina o celular.** Evolution/Baileys fala o protocolo do **WhatsApp Web**: é
> sempre um aparelho **vinculado a uma conta que já existe**. Sem nenhum celular com WhatsApp,
> o único caminho é a **Cloud API oficial da Meta** (registra o número direto na Meta,
> verificação por SMS/ligação) — que é o provider ainda pendente.

#### 🔴 O código só sai com a instância em `close`

No controller do Evolution:

```js
if (state == 'connecting') return instance.qrCode;      // devolve o QR VELHO
if (state == 'close')      connectToWhatsapp(number)    // só AQUI usa o number
```

Ou seja: se alguém pediu o **QR antes**, a instância fica `connecting` e o telefone é
**ignorado em silêncio** — `pairingCode` volta `null` e ninguém entende por quê. O `pair()`
faz `logout` pra voltar ao `close` quando detecta esse caso. É seguro porque o early-return
já saiu se estivesse `open`: nunca derruba um WhatsApp funcionando.

Medido nos dois caminhos: instância nova com número → código na hora; QR primeiro e código
depois → antes vinha `null`, agora vem.

### Particular ou convênio — a IA pergunta (e o backend obriga)

`agendar_consulta` exige **`pagamento`** (`particular`|`convenio`) e, quando é convênio, o
**`convenio`**. Não é só prompt: o `toolAgendarConsulta` **recusa** sem isso.

> 🔴 Por que a trava no backend e não só no prompt: sem ela, o `Appointment::create` caía no
> default `particular` do banco e **toda consulta marcada pelo WhatsApp aparecia como
> particular sem ninguém ter perguntado**. Dado que *parece* preenchido, e a recepção confia —
> pior que vazio. Prompt sozinho não segura; o modelo esquece.

`identificar_paciente` devolve **`convenio_no_cadastro`** pra IA **confirmar** em vez de
perguntar do zero ("Vejo que você tem Unimed — é por ele ou particular?"). Ter convênio no
cadastro **não** quer dizer que hoje é por ele.

### Armadilha de namespace

`AttendantAI` e `AttendantNotifier` vivem em `App\Support`, o mesmo namespace do antigo
`Waduck` — por isso **não tinham `use`**. Com a classe nova em `App\Support\Whatsapp\Whatsapp`,
`Whatsapp::` sem import resolve pro **namespace** `App\Support\Whatsapp` e dá fatal error.
Qualquer classe nova ali dentro precisa do `use` explícito nesses arquivos.

## Avisos ao paciente (AttendantNotifier)

| Quando | O que manda |
|---|---|
| Recepção **cancela** | Avisa e oferece remarcar |
| Recepção **muda o horário** | **Pergunta se serve** e pede dia/período se não servir — quem mudou foi a clínica, a palavra final é do paciente. Se ele disser que não pode, o AttendantAI assume e remarca |
| **24h antes** | Lembrete + confirmação de presença (`appointments:send-reminders`, via scheduler) |

**Quem recebe:** qualquer paciente com WhatsApp no cadastro. Antes só avisava quem já tinha
conversa aberta ou tinha agendado pelo bot — ou seja, quem foi cadastrado na recepção **nunca
era avisado de mudança na própria consulta**. O porteiro agora é o `enabled` do Atendente:
bot desligado = não fala com ninguém.

A conversa é **criada** quando não existe: sem ela a mensagem não entra no histórico e a IA
ficaria sem contexto quando o paciente respondesse *"não posso nesse dia"*.

### Lembrete de 24h

`appointments:send-reminders [--tenant=] [--dry]` — WhatsApp é o canal principal; e-mail só
sai se houver SMTP (o comando era **só e-mail** e nunca enviou nada, porque `MAIL_*` está
vazio — pendência 0b).

- **Janela 23h–25h** + cron de 15 em 15 min: sobra folga, uma rodada que falhe não perde
  ninguém. Quem marca com menos de 23h de antecedência **não** recebe (acabou de marcar).
- **`appointments.reminded_at`** evita reenvio.
- Se **nenhum canal** estiver disponível, o comando **sai fora sem marcar** `reminded_at` —
  senão engoliria o lembrete em silêncio e, ao conectar o WhatsApp depois, ninguém receberia.

⚠️ **O container não tem cron.** O supervisord roda só php-fpm e nginx. Quem dispara o
scheduler é o **crontab do host** (sobrevive a recriação do container, sem depender de rebuild
da imagem):

```
* * * * * docker exec -u www-data dmedclinic-app php artisan schedule:run >/dev/null 2>&1
```

> 🔴 **`reminded_at` tem que estar no `$fillable` do Appointment.** Ficou de fora na primeira
> versão e o `update(['reminded_at' => now()])` **descartava o campo em silêncio** — sem erro
> nenhum, e o lembrete reenviava a cada 15 minutos, pra sempre. Só apareceu porque o teste
> rodou o comando **duas vezes seguidas** e conferiu o contador.

## Autonomia (até onde a IA vai)
- `suggest` — a IA **não responde** sozinha (humano assume; útil na Fase 4).
- `auto_reply` — responde dúvidas e informa horários, **não marca**.
- `auto_schedule` — faz tudo, **inclusive marcar** na agenda.

## Fluxo end-to-end
1. Paciente manda WhatsApp → WADuck chama `POST /api/whatsapp/webhook/{tenant}?token=...`.
2. Controller valida token, inicializa tenant, cria/atualiza conversa, **reconhece paciente por telefone**, grava a mensagem (dedup por `external_id`).
3. `AttendantAI::maybeRespond` (se ligado + conectado + autonomia + chave): Claude lê histórico + config + ferramentas → responde e, se `auto_schedule`, **marca** (mesmo porteiro da recepção: `source='atende'`).
4. Resposta volta ao paciente via WADuck; consulta aparece na **agenda do CRM**.

## Como ATIVAR (o que falta — credenciais)
1. **Linha de WhatsApp** — escolher o provedor em **Atendente → Conexão do WhatsApp**:
   - **Evolution** (já no ar no VPS, ver abaixo): URL `http://evolution_api:8080` + a API key
     global → "Conectar" → **"Parear com QR Code"** → ler o QR no celular da clínica.
     O webhook é apontado sozinho; não precisa colar nada.
   - **WADuck**: criar instância em [waduck.pro](https://waduck.pro), parear o número lá,
     colar instância + API key aqui, e **copiar a URL do webhook** pro painel deles
     (evento `messages.upsert`).
2. **Anthropic** (cérebro): `ANTHROPIC_API_KEY=sk-ant-...` no `/opt/dmedclinic/.env.runtime` (opcional `ATTENDANT_AI_MODEL`), depois `optimize:clear`. Sem a chave, o bot só grava as mensagens (skip gracioso).
3. Ligar o atendente + escolher autonomia na página.

## Testado (2026-07-08)
- Migrations em todos os tenants; médico barrado (403) e sem item no nav.
- Conectar grava + gera webhook_url; webhook de entrada cria conversa+mensagem (reconhece paciente por telefone); token errado → 401.
- Ferramentas da IA rodam de verdade (lista médico + horários reais com rótulo). Skip gracioso sem a chave.
- **Falta:** teste ponta a ponta com WADuck + chave reais (conversa real gerando resposta + marcação).

## Evolution no VPS (subida em 2026-07-15)

- **`/opt/dmedclinic/evolution/docker-compose.yml`** (+ `.env` 600, fora do git, com a chave
  global e as senhas). Subir/atualizar:
  `docker compose -f /opt/dmedclinic/evolution/docker-compose.yml --project-directory /opt/dmedclinic/evolution up -d`
- **Sem porta pública, de propósito.** Quem fala com ele é o CRM, pela rede interna
  (`http://evolution_api:8080` na `dguard_default`). O webhook sai do Evolution pra URL
  pública do CRM. Não precisa de subdomínio nem de cert — e a API não fica na internet.
- **Reaproveita o Postgres e o Redis do dguard** (mesmo dono, já rodando), em banco
  `evolution` separado. O VPS estava com 561 MB livres e disco em 84% — subir outro
  Postgres só pra isso não se pagava.
- `DATABASE_SAVE_DATA_*` de mensagem/contato/chat estão **false**: o prontuário é o CRM, e o
  disco está apertado. Só a sessão da instância persiste.
- ⚠️ Ficou um container órfão **`evolution_api_orfao`** (parado) do primeiro `docker run`
  antes de virar compose — pode remover.

## Pendências
- **Ativar:** conectar uma **instância WADuck** e fazer o **teste do transporte WhatsApp ao vivo** (receber msg real → bot responde/marca → e cancelar/remarcar avisando o paciente). Créditos Anthropic ✅ e cérebro ✅ já validados.
- Reconhecimento de paciente hoje casa por telefone em dígitos (igual `AgentController`); pacientes cadastrados com telefone formatado no CRM podem não casar — normalizar se virar problema.
- Inbox usa **polling (6s)**, não websocket. Suficiente por ora; migrar pra tempo-real se precisar.
- Avisos (Fase 5) rodam **inline** no request do CRM (envio síncrono ao WADuck). Se ficar lento, mover pra fila.
