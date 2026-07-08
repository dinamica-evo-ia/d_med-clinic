# Integração D_Agent Atende ↔ D_Med Clinic (Agenda)

> **Status:** **Fase 1 (lado D_Med) IMPLEMENTADA e testada E2E** em 2026-07-07 (commit `fd6bdff`). Falta o lado D_Agent (re-apontar as 2 funções) e as Fases 2–3.
> **Regra de ouro:** a agenda do **D_Med Clinic é a fonte única da verdade**. O D_Agent Atende **lê disponibilidade** e **grava a marcação** nela. Não há "duas agendas sincronizadas".
> **Data da revisão:** 2026-07-07

> ### ✅ O que já está no ar no D_Med (Fase 1, lado CRM)
> API `/api/agent/*` autenticada por token por clínica (`dmk_…`), tenant resolvido pelo token:
> - `GET /api/agent/medicos` · `GET /api/agent/disponibilidade` · `POST /api/agent/pacientes` (upsert CPF/tel) · `POST /api/agent/agendamentos` (expediente + conflito atômico, grava `source='d_agent'`).
> - Gerar token: `php artisan tenant:api-key <slug|id>` (mostra o token uma vez).
> - Smoke test E2E validado: 401 sem token, listagem, 68 slots, upsert, agendamento, e **409 em conflito**.
> - **Falta pra fechar a Fase 1 ponta-a-ponta:** re-apontar `availability.functions.ts` e `agenda.ts` no D_Agent pra chamar essa API (lado Lovable — combinar antes de mexer).

---

## Índice
1. [Objetivo e decisão de arquitetura](#1-objetivo-e-decisão-de-arquitetura)
2. [Retrato dos dois sistemas](#2-retrato-dos-dois-sistemas)
3. [Como cada agenda funciona HOJE](#3-como-cada-agenda-funciona-hoje)
4. [O modelo de integração](#4-o-modelo-de-integração)
5. [Mapeamento de identidades e campos](#5-mapeamento-de-identidades-e-campos)
6. [Contrato da API (D_Med expõe)](#6-contrato-da-api-d_med-expõe)
7. [Volta pro paciente (webhook D_Med → D_Agent)](#7-volta-pro-paciente-webhook-d_med--d_agent)
8. [Segurança / LGPD](#8-segurança--lgpd)
9. [Concorrência e agendamento duplo](#9-concorrência-e-agendamento-duplo)
10. [Trabalho por lado (checklist file-level)](#10-trabalho-por-lado-checklist-file-level)
11. [Fases de entrega](#11-fases-de-entrega)
12. ["Perfil Clínica" — enxugar o D_Agent](#12-perfil-clínica--enxugar-o-d_agent)
13. [Riscos e decisões em aberto](#13-riscos-e-decisões-em-aberto)

---

## 1. Objetivo e decisão de arquitetura

Uma clínica que use os **dois produtos** vira:
- um **tenant no D_Med Clinic** (sistema clínico: médicos, agenda, prontuário) e
- um **tenant no D_Agent Atende** (atendente WhatsApp com IA).

Quando o paciente marca consulta pela conversa no WhatsApp, isso **tem que cair na agenda do D_Med** — a mesma que a recepção enxerga. Decisão:

> **D_Med = system of record da agenda clínica.** O D_Agent consulta os horários livres no D_Med (ao vivo) e grava a consulta no D_Med. Guarda só um **espelho leve** localmente para operar os recursos próprios dele (lembrete no WhatsApp, mostrar a consulta na conversa, follow-up).

**Por que não "sincronizar duas agendas":** sincronização bidirecional exige reconciliar conflitos, deduplicar e resolver corridas (duas marcações no mesmo minuto). Com **uma** fonte da verdade, esse problema **não existe** — o D_Agent é só mais um cliente da agenda do D_Med, como a recepção.

**Ponte opcional por tenant:** se o tenant do D_Agent estiver **vinculado** a uma clínica D_Med, a agenda dele roteia pro D_Med. Se **não** estiver (cliente que usa só o D_Agent), ele continua com a agenda local (comportamento atual). Assim o D_Agent **continua vendável sozinho** e ganha a integração quando os dois coexistem.

---

## 2. Retrato dos dois sistemas

| | **D_Med Clinic** | **D_Agent Atende** |
|---|---|---|
| Stack | Laravel 13 · Inertia · React 18 · **SQLite multi-DB** (stancl/tenancy) | **TanStack Start** (React 19) · **Supabase/Postgres** · Nitro |
| Multi-tenant | 1 arquivo SQLite por clínica | 1 schema Postgres, RLS por `tenant_id` |
| Auth de usuário | sessão/cookie, tenant por usuário logado | Supabase Auth (`profiles`/`user_roles`) |
| **Auth máquina** | ⚠️ **não existe ainda** (só JWT do Studio Med) | ✅ **`api_keys`** (`lk_…`, sha256, `scopes[]`, `tenant_id`) |
| API pública | ⚠️ **não existe** (`routes/api.php` ausente) | ✅ `routes/api/public/v1/*` |
| Webhooks | ⚠️ não existe (out) | ✅ `webhooks` + `webhook_logs` + `dispatchEvent` |
| WhatsApp | — | ✅ via **WADuck** (`/message/sendText/{instance}`) |
| Motor de IA | — | ✅ Lovable AI Gateway (persona + regras + base de conhecimento) |
| Lembretes | — | ✅ cron `agenda-reminders` (24h antes / manhã) |

> **Os códigos NUNCA se fundem.** Continuam dois deploys separados conversando por HTTP/API — igual a landing page já é um projeto à parte. A diferença de stack **não custa nada** porque nada é importado de um pro outro.

---

## 3. Como cada agenda funciona HOJE

### 3.1 D_Agent Atende

**Tabela `appointments`** (Postgres):
`id, tenant_id, contact_id, conversation_id, assigned_to (atendente), created_by, title, description, starts_at (timestamptz), duration_minutes (30), status {agendado|confirmado|reagendado|cancelado|concluido}, source {manual|conversa|ia|follow_up}, location, notes, google_event_id, google_calendar_id, reminder_sent_at, …`

**`agenda_settings`** (por tenant): `work_days[], work_start, work_end, slot_minutes, lunch_start/end` + (migrations posteriores) `reminder_mode, daily_reminder_time, reminder_channel, reminder_template, timezone`.

**Disponibilidade** — `src/lib/availability.functions.ts` (`getAvailableSlots`): lê `agenda_settings` + `appointments` do tenant e **enumera slots livres** (respeita expediente, almoço, "a partir de agora"). Devolve `{ date, weekday, start, end }[]`.

**Marcação** — `src/lib/agenda.ts` (`createAppointment`) grava na tabela. Hoje é chamada **pelo atendente humano** em `src/components/inbox/book-appointment-dialog.tsx` (busca slots → escolhe → cria).

**Lembretes** — `src/routes/api/public/hooks/agenda-reminders.ts` (cron 15 min) lê `appointments` do próprio D_Agent e manda WhatsApp via WADuck.

> ⚠️ **Achado importante:** o **motor de IA (`src/lib/ai-runner.server.ts`) NÃO agenda.** Ele só gera texto (persona + regras + base de conhecimento) e envia. O nível `auto_schedule` existe como rótulo, mas **a "ferramenta" de marcar ainda não foi construída** no runner. Ou seja: hoje o agendamento do D_Agent é **manual** (humano no inbox). Criar o *tool* de agendamento da IA é parte do trabalho (ver Fase 2).

### 3.2 D_Med Clinic

**Tabela `appointments`** (SQLite do tenant): `patient_id, doctor_id, starts_at, ends_at, type, notes, user_id, status {scheduled|confirmed|in_progress|completed|cancelled|no_show}`. ⚠️ **não tem coluna de origem** (`source`).

**Expediente** — `app/Support/DoctorSchedule.php`: por médico (`doctors.schedule` JSON) com `days{open,close,lunch,active}`, `slot_minutes`, `min_lead_minutes`, `max_lead_days`. Tem `violation()` (valida um intervalo) e `union()` (consolida vários médicos). ⚠️ **Não enumera slots livres** — isso é código novo a criar.

**Marcação** — `app/Http/Controllers/AppointmentController.php@store`: valida → `scheduleViolation()` → checa conflito → cria. ⚠️ A query de conflito atual tem um **furo de sobreposição** (não pega uma consulta que "engloba" a nova); a rota da API precisa de uma checagem correta.

**Paciente** — `app/Models/Patient.php`: id uuid, `name, phone, whatsapp, document (=CPF), birth_date, gender`, soft-delete. Dedup por CPF já é feito na importação CSV.

---

## 4. O modelo de integração

Um único conceito: **"provedor de agenda" por tenant no D_Agent.**

```
                D_Agent tenant vinculado a uma clínica D_Med?
                          │
         ┌────────────────┴─────────────────┐
        SIM                                 NÃO
         │                                   │
  getAvailableSlots ─► GET  D_Med /disponibilidade   getAvailableSlots ─► Supabase (hoje)
  createAppointment ─► POST D_Med /agendamentos       createAppointment ─► Supabase (hoje)
         │  (+ grava espelho local p/ lembrete)
         ▼
   D_Med = fonte única (recepção e bot veem o mesmo)
```

O vínculo mora em **`integration_settings`** (tabela que o D_Agent **já tem**): `provider = 'dmed_clinic'`, `config = { base_url, api_key, default_doctor_id? }`, `status`.

**Fluxo feliz, ponta a ponta:**
```
Paciente (WhatsApp) → IA do D_Agent (autonomy=auto_schedule)
  │ "quero marcar quinta"
  ├─ D_Agent →[GET]  D_Med /disponibilidade?doctor_id&days=7   → horários REAIS
  │  IA: "tenho quinta 14h, 14h30, 15h. Qual?"
  ├─ paciente escolhe
  ├─ D_Agent →[POST] D_Med /pacientes (upsert por CPF/telefone) → patient_id
  ├─ D_Agent →[POST] D_Med /agendamentos (doctor_id, patient_id, starts_at) → appointment_id
  │        D_Med valida expediente + conflito (atômico) → grava (source='d_agent')
  ├─ D_Agent grava espelho local (com dmed_appointment_id) → confirma no chat
  └─ (depois) recepção cancela no D_Med → webhook → D_Agent atualiza espelho e avisa o paciente
```

---

## 5. Mapeamento de identidades e campos

| Conceito | D_Agent | D_Med | Como casar |
|---|---|---|---|
| Clínica | `tenant` (uuid) | `tenant` (uuid) | `integration_settings.config` guarda a `api_key` do D_Med → resolve o tenant do D_Med |
| Pessoa atendida | `contact` (name, phone) | `patient` (name, phone, **document=CPF**) | upsert no D_Med por **CPF** (ou telefone normalizado); guardar `patient_id` do D_Med no contato |
| "Responsável" | `assigned_to` = **atendente** (profile) | `doctor_id` = **médico** | o bot escolhe **médico** via `GET /medicos`; `default_doctor_id` quando Solo |
| Consulta | `appointments` (Postgres) | `appointments` (SQLite) | espelho no D_Agent guarda `dmed_appointment_id`; D_Med guarda `external_ref` (id do D_Agent) |
| Status | agendado/confirmado/cancelado/… | scheduled/confirmed/cancelled/… | tabela de conversão (ver abaixo) |
| Duração | `duration_minutes` | `starts_at`+`ends_at` | converter: `ends_at = starts_at + duration` |

**Conversão de status (D_Med → D_Agent):** `scheduled→agendado`, `confirmed→confirmado`, `cancelled→cancelado`, `completed→concluido`, `no_show→cancelado` (ou manter). `reagendado` vem de um reschedule.

**Fuso:** D_Med é fixo **America/Sao_Paulo**; `agenda_settings.timezone` do D_Agent idem. O contrato usa **ISO-8601 com offset** (`2026-07-10T14:00:00-03:00`); o D_Med interpreta em America/Sao_Paulo.

---

## 6. Contrato da API (D_Med expõe)

Convenção espelhando a API pública do D_Agent (`Authorization: Bearer <token>`, JSON, escopos, erros `{ "error": "..." }`).

**Auth:** header `Authorization: Bearer dmk_<prefix>_<secret>`. Token guardado no D_Med (central) como `tenant_api_keys` (sha256), com `scopes` e `tenant_id`. Um middleware novo (`InitializeTenancyByApiToken`) resolve o token → `tenancy()->initialize($tenant)` **antes** do route-model-binding (ver armadilha #1 do CLAUDE.md).

> ✅ **Confirmado na revisão (encaixe limpo):** `bootstrap/app.php` **já** tem `shouldRenderJsonWhen($request->is('api/*'))` — o tratamento de erro em JSON pra rotas `api/*` já existe. Só falta **registrar** o `routes/api.php` no `withRouting(api: …)` (hoje só há `web`/`commands`/`health`) e encaixar o middleware de token com o mesmo `prependToPriorityList(before: SubstituteBindings, prepend: …)` que o `tenancy.by_user` já usa. Sem gambiarra.

### 6.1 `GET /api/agent/medicos`
Lista médicos ativos p/ o bot oferecer escolha. Scope `agenda:read`.
```json
{ "data": [ { "id": 3, "name": "Dra. Carla Menezes", "specialty": "Dermatologia" } ] }
```

### 6.2 `GET /api/agent/disponibilidade`
Query: `doctor_id` (opcional — sem ele, união de todos), `days` (1–30, default 7), `from` (ISO opcional). Scope `agenda:read`.
> Requer criar a **enumeração de slots** em `DoctorSchedule` (andar dia a dia de `now+min_lead` até `max_lead`, subtrair consultas não-canceladas + almoço, fatiar em `slot_minutes`).
```json
{
  "doctor_id": 3,
  "timezone": "America/Sao_Paulo",
  "slot_minutes": 30,
  "slots": [
    { "start": "2026-07-10T14:00:00-03:00", "end": "2026-07-10T14:30:00-03:00" },
    { "start": "2026-07-10T14:30:00-03:00", "end": "2026-07-10T15:00:00-03:00" }
  ]
}
```

### 6.3 `POST /api/agent/pacientes`  (upsert)
Acha por CPF (ou telefone) ou cria. Scope `pacientes:write`. Dados mínimos.
```json
// req
{ "name": "Maria Souza", "document": "12345678900", "phone": "5541999998888", "birth_date": "1990-05-02" }
// res
{ "data": { "id": "uuid-do-paciente", "created": true } }
```

### 6.4 `POST /api/agent/agendamentos`
Cria a consulta — **porteiro único** (expediente + conflito atômico). Scope `agenda:write`.
```json
// req
{ "patient_id": "uuid", "doctor_id": 3,
  "starts_at": "2026-07-10T14:00:00-03:00", "duration_minutes": 30,
  "notes": "Agendado via WhatsApp", "external_ref": "id-do-appointment-no-d_agent" }
// res 201  (id da consulta é UUID no D_Med, não número)
{ "data": { "id": "a1b2c3d4-…-uuid", "status": "scheduled",
            "starts_at": "2026-07-10T14:00:00-03:00", "ends_at": "2026-07-10T14:30:00-03:00" } }
// res 409 (conflito) / 422 (fora do expediente)
{ "error": "Horário já ocupado." }
```
Grava com `type` (default `consultation`), `source='d_agent'` (coluna nova) e `user_id = null` (FK frouxa central→tenant, já tolerada — ver armadilha #13). Confirmado na revisão: o `Appointment` do D_Med tem `id` **UUID string** e **não** possui coluna de origem hoje → a migration de `source`/`external_ref` é necessária.

### 6.5 (Fase 3) `PATCH /api/agent/agendamentos/{id}` e `DELETE …`
Remarcar/cancelar pelo bot.

---

## 7. Volta pro paciente (webhook D_Med → D_Agent)

Quando a **recepção** cancela/remarca no D_Med, o paciente que marcou pelo WhatsApp precisa saber. Fluxo:

1. D_Med dispara um webhook (job) em `AppointmentController@updateStatus/reschedule/update` **se** a consulta tem `source='d_agent'` e a clínica está vinculada.
   `POST {d_agent}/api/public/hooks/dmed-appointment` com header de assinatura (HMAC do `DMED_INTEGRACAO_SECRET`).
2. O D_Agent (rota pública nova) valida a assinatura → atualiza o **espelho** → opcionalmente manda WhatsApp ("sua consulta de quinta foi remarcada para…").

> Os **lembretes já funcionam** de graça: o cron `agenda-reminders` roda em cima do espelho local. Só é preciso o webhook de cancelamento pra não lembrar de uma consulta que a recepção cancelou.

---

## 8. Segurança / LGPD

- **Chave de API por clínica**, com `scopes` mínimos, rotacionável, `is_active`/`expires_at`. Fica **no servidor do D_Agent** (`integration_settings`), **nunca no navegador do paciente**.
- A API expõe **o mínimo**: médicos, horários livres, upsert de paciente, criar consulta. **Não** lista/varre pacientes nem devolve prontuário.
- Assinatura HMAC nos webhooks (os dois lados já têm o `DMED_INTEGRACAO_SECRET`).
- Rate-limit nas rotas `/api/agent/*`.
- `source='d_agent'` em toda consulta criada pelo bot = trilha de auditoria (igual `origem='studio_med'` no prontuário).
- Dado de saúde é sensível (LGPD): registrar consentimento no fluxo da conversa é responsabilidade do D_Agent.

---

## 9. Concorrência e agendamento duplo

- A **gravação passa pelo mesmo endpoint atômico** do D_Med, com checagem de conflito correta (transação + verificação de sobreposição real). Bot e recepção competindo pelo mesmo minuto → o segundo recebe **409**.
- Como a disponibilidade é sempre lida **ao vivo** do D_Med, não há janela de divergência entre "o que o bot ofereceu" e "o que já está marcado".
- ⚠️ **Corrigir de passagem** o furo de sobreposição da query em `AppointmentController` (hoje `whereBetween(start) OR whereBetween(end)` não pega o caso "consulta existente engloba a nova"). A rota da API deve usar a checagem correta: `starts_at < novo_fim AND ends_at > novo_inicio`.

---

## 10. Trabalho por lado (checklist file-level)

### 10.1 D_Med Clinic — **criar**
- [x] `routes/api.php` + registrado no `bootstrap/app.php` (`withRouting(api: …)`).
- [x] Migration central: `tenant_api_keys` + Model `TenantApiKey` (CentralConnection).
- [x] Middleware `InitializeTenancyByApiToken` (token → `tenancy()->initialize`, no `prependToPriorityList`).
- [x] `App\Http\Controllers\Api\AgentController` → `medicos`, `disponibilidade`, `pacientes`, `agendamentos`.
- [x] `DoctorSchedule::freeSlots(...)` (enumeração de horários livres).
- [x] Migration tenant: `appointments.source` (default `'crm'`) + `appointments.external_ref`.
- [x] Corrigir a checagem de conflito (sobreposição real) — aplicado na API **e** no `AppointmentController@store` da recepção.
- [x] Geração de token via `php artisan tenant:api-key`.
- [ ] Webhook OUT (job) em cancel/reschedule quando `source='d_agent'`. *(Fase 2)*
- [ ] UI no Painel Master pra gerar/rotacionar a API-key (hoje só via artisan). *(polish)*

### 10.2 D_Agent Atende — **re-apontar** (reusa o que já existe)
- [ ] `integration_settings` provider `'dmed_clinic'` + tela de conectar (colar `base_url`+`api_key`).
- [ ] `src/lib/availability.functions.ts`: se vinculado → buscar do D_Med (mesmo shape `AvailableSlot`, UI intocada).
- [ ] `src/lib/agenda.ts createAppointment`: se vinculado → `POST` D_Med, guardar espelho com `dmed_appointment_id`.
- [ ] Upsert de paciente no D_Med no ato da marcação; guardar `patient_id` no contato.
- [ ] **Novo:** *tool* de agendamento no `ai-runner.server.ts` (tool-calling `get_slots`/`book`) — só quando `autonomy=auto_schedule`.
- [ ] Rota pública nova `/api/public/hooks/dmed-appointment` (recebe webhook do D_Med, valida HMAC, atualiza espelho, avisa paciente).
- [ ] Escolha de médico via `GET /medicos` (ou `default_doctor_id`).

---

## 11. Fases de entrega

| Fase | Entrega | Valor |
|---|---|---|
| **1 — Mão única (live booking)** | D_Med expõe `medicos`/`disponibilidade`/`pacientes`/`agendamentos` + token; D_Agent lê e grava no D_Med (via booking manual do inbox, já pronto). | **90% do valor:** o que marca no D_Agent aparece no D_Med, sem duplicar. |
| **2 — IA agenda sozinha + lembrete** | Tool de agendamento no `ai-runner`; webhook D_Med→D_Agent em cancel/reschedule; lembretes rodando no espelho. | O bot fecha o agendamento sozinho e o paciente é avisado de mudanças. |
| **3 — Bot cancela/remarca + lista de espera** | `PATCH`/`DELETE` na API; fluxo de remarcação pela conversa. | Autonomia completa. |

---

## 12. "Perfil Clínica" — enxugar o D_Agent

Pro médico, boa parte do D_Agent (funil, campanhas, cadências, CSAT, SLA, qualificação de leads) é **ruído**. Enxugar = **esconder por feature-flag, não deletar.**

O D_Agent **já tem** um sistema de flags: RPC `feature_enabled`, `tenant_feature_overrides`, `user_feature_overrides`, gerido pelo super-admin (`src/lib/feature-flags.ts`). Hoje cobre: `campaigns, advanced_reports, api, webhooks, integrations, sla`.

**Plano:** estender as `FeatureKey` para cobrir também `funnel/leads`, `cadences`, `csat`; criar um preset **"Clínica"** que liga só: **Conversas (inbox), Agenda, IA, Contatos, WhatsApp, Conhecimento (FAQ)** e desliga o resto; aplicar o gate na navegação (`app-sidebar.tsx`) e nas rotas. Reversível, sem tocar no código dos módulos. *(Escopo separado da integração da agenda — pode vir depois da Fase 1.)*

---

## 13. Riscos e decisões em aberto

- **Escolha de médico pela IA:** numa clínica com vários médicos, o bot precisa perguntar "com qual médico?" ou usar um padrão. Definir UX na Fase 2.
- **CPF nem sempre disponível na conversa:** o paciente pode não informar CPF no WhatsApp. Fallback: dedup por telefone normalizado; completar CPF depois na recepção.
- **Confirmação:** consulta do bot entra como `scheduled` (a confirmar pela recepção) ou já `confirmed`? — decisão de operação por clínica.
- **Consentimento LGPD** na conversa antes de gravar dado de saúde.
- **Onde guardar a URL do webhook do D_Med → D_Agent** (por tenant): provavelmente em `integration_settings.config`.
- **Corrigir o furo de sobreposição** do conflito no D_Med (afeta também a agenda atual da recepção — vale corrigir de qualquer forma).

---

### Resumo executivo
Reusar o D_Agent, **não** refazer. A agenda do **D_Med é a única fonte da verdade**; o D_Agent vira o cliente conversacional que lê horários e grava consultas nela, mantendo um espelho leve para lembretes. Os dois lados **já falam API-key + tenant + webhook**, então a Fase 1 é pequena e cirúrgica: **4 endpoints novos no D_Med + re-apontar 2 funções no D_Agent.**
