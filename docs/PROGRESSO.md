# Progresso da Implementação

## ✅ Concluído

### Fase 0 - Fundação
- [x] PHP 8.3.31 instalado (via winget)
- [x] Composer instalado
- [x] Node.js 24 + npm 11
- [x] Projeto Laravel 11 criado
- [x] Stancl Tenancy v3 instalado e configurado
- [x] Inertia.js + React 18 configurado
- [x] Tailwind CSS v4 configurado
- [x] Banco SQLite (dev) / PostgreSQL (prod)

### Migrations (Banco Central)
- [x] `tenants` - com suporte VirtualColumn (dados em JSON)
- [x] `users` - UUID como primary key, com phone
- [x] `tenant_user` - pivot com role
- [x] `domains` - Stancl padrão

### Migrations (Schema do Tenant)
- [x] `patients` - CPF, endereço, contato emergência, plano de saúde
- [x] `doctors` - CRM, especialidade, horários
- [x] `appointments` - paciente, médico, status, tipo, validação de conflito
- [x] `medical_records` - SOAP completo (JSONB)
- [x] `invoices` - valor, forma de pagamento, status

### Models
- [x] `Tenant` - extends Stancl, com HasDatabase
- [x] `User` - UUID, relação com tenants
- [x] `Patient` - UUID, soft deletes
- [x] `Doctor` - UUID, schedule em JSON
- [x] `Appointment` - UUID, status enum
- [x] `MedicalRecord` - SOAP em JSONB
- [x] `Invoice` - UUID, status enum

### Controllers
- [x] `DashboardController` - stats + agenda do dia
- [x] `PatientController` - CRUD + busca
- [x] `AppointmentController` - CRUD + status + calendário
- [x] `MedicalRecordController` - SOAP
- [x] `InvoiceController` - contas a receber
- [x] `DoctorController` - CRUD

### Frontend (React + Inertia)
- [x] `AppLayout` - sidebar com navegação
- [x] `Dashboard` - cards de stats + agenda de hoje
- [x] `Patients/Index` - listagem com busca
- [x] `Patients/Form` - cadastro/edição
- [x] `Patients/Show` - perfil + histórico
- [x] `Appointments/Index` - listagem por data
- [x] `Appointments/Form` - agendamento
- [x] `Appointments/Show` - detalhes + ações de status
- [x] `Doctors/Index` - listagem
- [x] `Doctors/Form` - cadastro/edição
- [x] `Invoices/Index` - financeiro + totais
- [x] `TenantSelect` - seleção de clínica
- [x] `EmptyState` - componente vazio
- [x] `LoadingState` - componente loading
- [x] `ErrorState` - componente erro
- [x] `DataTable` - tabela com paginação
- [x] `SearchInput` - campo de busca

### Rotas
- [x] Rotas centrais (web.php) - login, seleção de tenant
- [x] Rotas de tenant (tenant.php) - todas as features

## 🔄 Em Andamento
- Configuração de ambiente de dev (subdomínio local)

## ⬜ Próximos Passos

### Fase 2 (Auth + Layout) - Parcial
- [ ] Integrar completamente auth Breeze com multi-tenant
- [ ] Redirecionamento pós-login para tenant

### Fase Core - Prontuário (❤️)
- [ ] Página do prontuário com SOAP completo
- [ ] CID-10 integrado (tabela DATASUS)
- [ ] Prescrição médica (preparado para IA)
- [ ] Pedidos de exame
- [ ] Atestados
- [ ] Histórico cronológico

### Fase 6 - Financeiro
- [ ] Formulário de criação de conta

### Fase 7 - SaaS
- [ ] Dashboard completo
- [ ] Planos/assinaturas
- [ ] Mercado Pago

### Fase 8 - Testes
- [ ] Pest PHP tests
- [ ] Testes de isolamento multi-tenant
