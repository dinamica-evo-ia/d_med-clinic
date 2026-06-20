# 🏥 MedHealth CRM - Roadmap

## Visão Geral
CRM médico SaaS multi-tenant. Enxuto, prático, preparado para IA.

## Stack
- **Backend**: Laravel 11 (PHP 8.3+)
- **Frontend**: React 19 + Inertia.js + shadcn/ui
- **Database**: PostgreSQL (schema-per-tenant) / SQLite (dev)
- **Multi-tenant**: Stancl Tenancy v3
- **Infra**: Docker + Redis

---

## Módulos (Ordem de Implementação)

### ✅ Fase 0 - Roadmap + Setup
- [x] Roadmap definido
- [ ] Instalação de dependências (PHP, Composer, Node)
- [ ] Projeto Laravel criado

### 🔲 Fase 1 - Fundação
- [ ] Setup Laravel + Stancl Tenancy
- [ ] Configuração multi-tenant (banco central + schemas)
- [ ] Migrations: tenants, users, tenant_user
- [ ] Migrations tenant: patients, doctors, appointments, medical_records, invoices
- [ ] Docker config (PostgreSQL, Redis)

### 🔲 Fase 2 - Auth + Layout
- [ ] Sistema de login multi-tenant
- [ ] Layout base com sidebar
- [ ] Componentes compartilhados (DataTable, estados)

### 🔲 Fase 3 - Pacientes
- [ ] CRUD completo
- [ ] Busca e paginação
- [ ] Card de resumo

### 🔲 Fase 4 - Agenda
- [ ] Calendário de consultas
- [ ] Agendamento com validação de conflitos
- [ ] Grid por médico
- [ ] Status: confirmar, iniciar, concluir, cancelar, falta

### 🔲 Fase 5 - Prontuário (❤️ Core)
- [ ] SOAP (Subjetivo, Objetivo, Avaliação, Plano)
- [ ] CID-10/11 (tabela completa do DATASUS)
- [ ] Prescrição médica (preparado para IA)
- [ ] Pedidos de exame
- [ ] Atestados
- [ ] Histórico cronológico do paciente
- [ ] Webhooks preparados para integração D_Med Evo
- [ ] Arquitetura de IA plugável

### 🔲 Fase 6 - Financeiro
- [ ] Contas a receber
- [ ] Formas de pagamento
- [ ] Dashboard financeiro

### 🔲 Fase 7 - Dashboard + SaaS
- [ ] Dashboard com indicadores
- [ ] Planos e assinaturas
- [ ] Integração Mercado Pago

### 🔲 Fase 8 - Testes + Deploy
- [ ] Testes feature (Pest)
- [ ] Testes de isolamento multi-tenant
- [ ] Seeds + factories
- [ ] Docker compose produção
- [ ] Responsividade mobile

---

## Integrações Futuras Previstas

| Integração | Status | Descrição |
|-----------|--------|-----------|
| 🤖 **IA p/ Prescrição** | ⏳ Arquitetura prevista | Sugerir receitas baseado no prontuário |
| 🎙️ **D_Med Evo** | ⏳ Webhooks previstos | Receber transcrição + anamnese |
| 🔬 **MeMed** | 🔍 Investigando | API a confirmar |
| 🏥 **TISS/TUSS** | 📋 Planejado | Tabela de procedimentos |

---

## Arquivos de Módulo

Cada módulo tem seu próprio `.md` com especificação detalhada:
- `docs/MODULO_PRONTUARIO.md`
- `docs/MODULO_PACIENTES.md`
- `docs/MODULO_AGENDA.md`
- `docs/MODULO_FINANCEIRO.md`
- `docs/MODULO_SAAS.md`
