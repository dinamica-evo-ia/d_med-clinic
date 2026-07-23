# Agenda

Calendário de consultas por médico, com criação/edição, reagendamento por arrastar e bloqueio
por horário de atendimento. Fuso fixo **America/Sao_Paulo** (ver armadilha do timezone no
`CLAUDE.md` — os dados guardam hora de parede de SP).

**Rotas:** `appointments.*` (resource) + `appointments.status`, `appointments.reschedule`,
`api.appointments.calendar`, `api.appointments.exceptions` (GET/POST/DELETE).
**Acesso:** `admin`, `doctor`, `receptionist`.

## Configuração (dias e horários) — modelo de PERÍODOS

`doctors.schedule` (JSON) — cada dia é `{active, periods: [{start, end}, …]}` + `slot_minutes`
(duração padrão da consulta). Helper **`App\Support\DoctorSchedule`** (`normalize`, `union`,
`freeSlots`, `violation`, `dayFor`, `resolvedRange`). A **secretária** também configura
(Configurações → Agenda). Sem médico selecionado, o calendário usa a **união** dos schedules.

⚠️ **O almoço não existe como campo** (mudou em 2026-07-22): ele é o **buraco entre um período e o
próximo**. `08:00–12:00` + `14:00–18:00` = fechado das 12 às 14, sem regra própria. Isso cobre de
graça a clínica com 3 períodos e a que fecha 11h e volta 15h — o modelo antigo (abre/fecha + 1
almoço) não conseguia expressar nenhum dos dois. A consulta precisa caber **inteira dentro de UM
período**: começar às 11:45 numa consulta de 30 min invade o buraco e é recusada.

🔁 **Retrocompat na leitura:** `normalize()` converte o formato antigo (`{open, close, lunch}`) em 1
ou 2 períodos. **Nenhum tenant precisou de migração** e quem ainda não salvou pela tela nova
continua funcionando. O normalize também devolve `open`/`close` **derivados** (menor início / maior
fim do dia) só pra não quebrar leitor antigo — são leitura, a verdade é `periods`.

## Exceções pontuais ("neste dia é diferente")

Tabela **`schedule_exceptions`** (banco do tenant): `doctor_id` (null = clínica inteira), `date`,
`kind` (`open`/`closed`), `periods` (JSON), `reason`, `created_by`. Model `App\Models\ScheduleException`.

A secretária abre ou fecha **uma data** direto no calendário (botão `⋯` no cabeçalho do dia) sem
mexer na regra semanal — que ela teria que lembrar de desfazer depois. Casos: abrir um sábado pra
encaixar alguém, fechar a quarta por causa de um congresso, sair mais cedo numa sexta.

- `open` **soma** ao que já existe ("nesta quarta ele também atende à tarde"); num dia fechado no
  padrão, vira exatamente os períodos informados.
- `closed` sem períodos fecha o dia todo; com períodos, corta só aqueles trechos.
- **Ordem cronológica**: vale a última coisa que a secretária fez (fechou o feriado e depois abriu
  09:00–12:00 → fica aberto das 9 às 12).
- **"Voltar ao padrão"** apaga as exceções daquela data.

A resolução mora no `DoctorSchedule` de propósito: a exceção vale de uma vez **no calendário, na
validação do agendamento manual e no `freeSlots`** (os horários que a IA oferece no WhatsApp) — sem
cada caminho ter que lembrar de consultar a tabela.

⚠️ Ao consultar `schedule_exceptions` por intervalo, os limites precisam ser **dia inteiro**
(`startOfDay`/`endOfDay`): a coluna guarda `2026-08-03 00:00:00`, então comparar com a string
`'2026-08-03'` no topo do `whereBetween` deixa o próprio dia de fora (bug pego em teste: a exceção
do último dia do range sumia).

## Calendário (`Appointments/Index.jsx`)

- Visões **Dia / Semana (Seg–Sex) / Mês**; dropdown de médico; linha do "agora" em vermelho.
- **Arrastar-e-soltar reagenda** (`@reschedule`): valida horário de atendimento e conflito antes de
  gravar. Os **buracos entre períodos** aparecem hachurados (o desenho inverteu: em vez de "antes/
  depois do expediente + almoço", desenha o que sobra fora dos períodos).
- **Dia com exceção** ganha `!` âmbar no cabeçalho (ponto âmbar na visão de mês) e o desenho passa a
  seguir a exceção, não a regra da semana.
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
- Exceção **recorrente** (ex.: "toda 1ª segunda do mês não atende") — hoje é uma data por vez.
- Avisar o paciente quando um dia com consulta marcada é fechado por exceção (hoje o bloqueio vale
  para agendamentos **novos**; as consultas já marcadas naquele dia continuam lá).
