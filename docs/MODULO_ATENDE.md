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

### Armadilha de namespace

`AttendantAI` e `AttendantNotifier` vivem em `App\Support`, o mesmo namespace do antigo
`Waduck` — por isso **não tinham `use`**. Com a classe nova em `App\Support\Whatsapp\Whatsapp`,
`Whatsapp::` sem import resolve pro **namespace** `App\Support\Whatsapp` e dá fatal error.
Qualquer classe nova ali dentro precisa do `use` explícito nesses arquivos.

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
