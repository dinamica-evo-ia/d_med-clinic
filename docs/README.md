# D_Med Clinic — Documentação do sistema

CRM SaaS **multi-tenant** de gestão de clínica médica. Marca **D_Med Clinic** (família D_Med;
**EVO** = linha de IA, sistema separado).

> **Índice dos módulos.** Cada módulo tem seu `.md` com o que faz, arquivos envolvidos, decisões
> e pontos de troca. Atualizar ao **fim de cada fase**.

---

## Visão geral

| | |
|---|---|
| Stack | Laravel 13 · PHP 8.3 · Inertia.js · React 18 · Tailwind v4 · Vite 8 |
| Multi-tenant | `stancl/tenancy` v3 — **multi-DB SQLite**: cada clínica = um `tenant<uuid>` em `/app/database/` |
| Banco central | `users`, `tenants`, `tenant_user`, `domains`, `plans`, `pharmacy_submissions`, sessions/cache |
| Banco do tenant | `patients`, `doctors`, `appointments`, `medical_records`, `formulas`, `prescriptions`, `invoices`, `cid_codes`… |
| CRM | https://crm.dmedclinic.com.br |
| Landing | https://dmedclinic.com.br (repo separado, build estático) |
| Deploy | Online-only, VPS 177.153.202.152, container `dmedclinic-app`. Sem CI — ver `CLAUDE.md` |

**Regra de ouro do multi-tenant:** o que é da clínica mora no banco do tenant; o que é do produto
(usuários, planos, clínicas) mora no central. Qualquer coisa que cruze os dois exige atenção com
conexão/FK — ver as armadilhas no `CLAUDE.md`.

---

## Módulos

| Módulo | Doc | O que é |
|---|---|---|
| **Prontuário** | [MODULO_PRONTUARIO.md](MODULO_PRONTUARIO.md) | Consulta/SOAP, anamnese × evolução, CID-10, receitas, atestados |
| **Fórmulas** | [MODULO_FORMULAS.md](MODULO_FORMULAS.md) | Biblioteca de Manipulados e Industrializados; arrastar pra receita; limpeza por IA |
| **Minha Conta** | [MODULO_CONTA.md](MODULO_CONTA.md) | Menu do avatar: ficha do médico, dados da clínica e **usuários** (cadastro da secretária) |
| **Painel Master** | [MODULO_MASTER.md](MODULO_MASTER.md) | Super-admin do produto: clínicas, aprovação, planos, senhas, farmácias |
| **Importar & Exportar** | [MODULO_IMPORTAR_EXPORTAR.md](MODULO_IMPORTAR_EXPORTAR.md) | Migração de sistema antigo: pacientes, anamneses, receitas, fórmulas |
| **Parceria com farmácias** | [MODULO_PARCERIA_FARMACIAS.md](MODULO_PARCERIA_FARMACIAS.md) | Página pública onde laboratórios enviam suas fórmulas |
| **D_Med Atende** | [MODULO_ATENDE.md](MODULO_ATENDE.md) | Atendente de WhatsApp com IA (agenda, FAQ, inbox) |
| **Integração D_Agent** | [integracao-d-agent.md](integracao-d-agent.md) | API de agenda/agendamento consumida por fora |
| Progresso histórico | [PROGRESSO.md](PROGRESSO.md) | Checklist das fases iniciais (histórico) |

---

## Fluxos que atravessam módulos

**Conta nova (signup público)**
`landing → /register` → tenant criado com status **`pending`** (bloqueado, trial não começa) →
master **aprova** em `/master/clinicas` → vira `trial` de 7 dias contados **da aprovação**.
Ver [MODULO_MASTER.md](MODULO_MASTER.md).

**Receita com manipulado**
Médico abre a receita → painel lateral com abas **Manipulados / Industrializados** → arrasta a
fórmula → o texto entra com a **finalidade como título**. Ver [MODULO_FORMULAS.md](MODULO_FORMULAS.md).

**Migração de uma clínica que vem de outro sistema**
1º **pacientes** → depois **anamneses/receitas** (são ligadas pelo **nome** do paciente) → **fórmulas**.
Ver [MODULO_IMPORTAR_EXPORTAR.md](MODULO_IMPORTAR_EXPORTAR.md).

---

## Armadilhas que já custaram caro (leia antes de mexer)

- **Tela branca / “não loga”** → quase sempre é o **Google Tradutor do navegador** alterando o DOM
  e quebrando o React (`insertBefore NotFoundError`). Blindado no `resources/views/app.blade.php`
  (`translate="no"` + `<meta name="google" content="notranslate">` + `lang="pt-BR"`). Há um
  **error boundary** global em `resources/js/app.jsx` que mostra o erro em vez de tela branca.
- **`medical_records.anamnesis` tem cast `array`** e a tela só renderiza **objeto**
  (`typeof anamnesis === 'object'`). Gravar texto puro **salva mas não aparece**.
- **Campos virtuais do tenant** (`plan`, `status`, `slug`) → usar o acessor (`tenant()->plan`),
  nunca `tenant()->data['plan']`. Busca por slug: `Tenant::where('data->slug', $x)`.
- **`users` é do banco central** — query crua dentro de um controller com tenant ativo precisa de
  `DB::connection(config('tenancy.database.central_connection'))`.
- **Não há backup automático** dos bancos dos tenants. Apagar clínica no Master é **irreversível**.

Detalhes completos e o passo a passo de deploy: **`CLAUDE.md`** (raiz, não versionado).
