# Agenda

Calendário de consultas por médico, com criação/edição, reagendamento por arrastar e bloqueio
por horário de atendimento. Fuso fixo **America/Sao_Paulo** (ver armadilha do timezone no
`CLAUDE.md` — os dados guardam hora de parede de SP).

**Rotas:** `appointments.*` (resource) + `appointments.status`, `appointments.reschedule`,
`api.appointments.calendar`. **Acesso:** `admin`, `doctor`, `receptionist`.

## Configuração (dias e horários)

`doctors.schedule` (JSON) — dias ativos + abre/fecha + pausa de almoço + `slot_minutes` (duração
padrão da consulta). Helper **`App\Support\DoctorSchedule`** (`normalize`, `union`, `freeSlots`,
`violation`). A **secretária** também configura (Configurações → Agenda). Sem médico selecionado, o
calendário usa a **união** dos schedules de todos.

## Calendário (`Appointments/Index.jsx`)

- Visões **Dia / Semana (Seg–Sex) / Mês**; dropdown de médico; linha do "agora" em vermelho.
- **Arrastar-e-soltar reagenda** (`@reschedule`): valida horário de atendimento e conflito antes de
  gravar. Bloqueios (fora do expediente, almoço) aparecem hachurados.
- **Altura da hora acompanha a duração** (`rowDe`, 2026-07-20): cada consulta ganha ~30px úteis, com
  piso de 56px/hora. Com `slot_minutes=15` a hora vira 120px → **4 pacientes por hora cabem** (antes
  eram 56px fixos e os blocos se sobrepunham).

## Nova consulta / editar (`Appointments/Form.jsx`)

- **Paciente:** `PatientPicker` (busca sob demanda em `/api/patients/search`, ignora acento) — não
  carrega mais os milhares de pacientes de uma vez.
- **Forma de pagamento** (2026-07-16): Particular/Convênio, exigido **só quando a clínica aceita as
  duas** (`clinic_profiles.payment_types`, ver [MODULO_ATENDE.md](MODULO_ATENDE.md)); some quando a
  clínica só aceita uma. Pré-preenche o convênio do cadastro do paciente (confirma, não decide).
- **Duração, não "hora do fim"** (2026-07-20): a duração vem da agenda; o campo de "Data e Hora Fim"
  virou **texto** ("Término: 09:15 · 15 min") + um "ajustar" discreto pra exceção. O `ends_at`
  continua indo pro backend, só deixou de ser digitado. Regra do dono: se a duração já está
  configurada, o agendamento **não pergunta** de novo.

## Avisos ao médico

Marcar/remarcar/cancelar dispara **push no PWA** pro médico (`App\Support\DoctorNotifier`) — nunca
avisa quem fez a ação. Ver [MODULO_PWA.md](MODULO_PWA.md). O **paciente** é avisado no WhatsApp pelo
`AttendantNotifier` (ver [MODULO_ATENDE.md](MODULO_ATENDE.md)).

## Pendências / troca

- Numeração automática dos blocos de fórmula na receita (fora deste módulo, mas relacionado).
- Visão de "vários médicos lado a lado" no mesmo dia (hoje é um médico por vez ou a união).
