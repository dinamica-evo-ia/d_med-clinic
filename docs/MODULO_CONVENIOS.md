# Convênios aceitos

Cadastro dos convênios que a clínica atende. Antes disso, o convênio da consulta era **texto
livre** com um datalist do que já tinha sido digitado — "Unimed", "unimed " e "UNINED" entravam
como convênios diferentes, e a IA no WhatsApp aceitava **qualquer** nome que o paciente falasse,
marcando consulta por convênio que a clínica não atende.

**Tela:** menu do avatar → Configurações → **Convênios aceitos** (`/account/settings/insurance`).
**Acesso:** todo mundo com acesso à clínica, inclusive a **secretária** — é ela que descobre no
balcão que a clínica passou a atender um convênio novo.

## Dados

Tabela **`insurance_plans`** (banco do tenant): `name`, `notes`, `all_doctors`, `is_active`.
Pivot **`insurance_plan_doctor`** — usado só quando `all_doctors = false`.

`all_doctors` existe pra tirar a ambiguidade do "sem médico marcado significa o quê?":
- `true` (padrão) → todos os médicos atendem.
- `false` → só os médicos do pivot. É o caso do cardiologista que atende a Unimed enquanto o
  dermatologista da mesma clínica não.

`is_active = false` suspende sem perder o cadastro (convênio que a clínica parou de aceitar).

**A migration semeia a lista** com o que a clínica já usou de verdade (consultas + cadastros de
paciente), senão no dia do deploy a lista apareceria vazia e a recepção não conseguiria marcar
ninguém por convênio.

## Model `App\Models\InsurancePlan`

- `aceitosPor(?string $doctorId)` — nomes que ESTE médico atende. É a **única** fonte: alimenta o
  `<select>` do agendamento e o `enum` da ferramenta da IA, pra as duas pontas não divergirem.
- `casar(?string $nome, ?string $doctorId)` — confere um nome vindo de fora (IA, importação)
  ignorando caixa e acento, e devolve **a grafia do cadastro**. "unimed" e "UNIMED" gravam "Unimed".

⚠️ O model declara `public $incrementing = false` + `$keyType = 'string'`. **Sem isso o Eloquent
sobrescreve o UUID pelo rowid do SQLite depois do INSERT** — o model em memória fica com `id = 2`,
e foi exatamente isso que fez o pivot dos médicos gravar `insurance_plan_id = 2` e o vínculo sumir.
Mesmo cuidado vale pra `ScheduleException` e qualquer model novo com UUID.

## Onde a lista é usada

| Ponto | Comportamento |
|---|---|
| **Agendamento manual** (`Appointments/Form`) | O campo vira `<select>` dos convênios do médico escolhido. Trocar de médico limpa o convênio que ele não atende. |
| **`AppointmentController@store/@update`** | Trava de verdade (`validaConvenio`): recusa com "Este médico não atende por esse convênio. Aceitos: …" e corrige a grafia. |
| **IA no WhatsApp** (`AttendantAI`) | `enum` no schema de `agendar_consulta` + a lista de cada médico no prompt + trava em `toolAgendarConsulta` (schema orienta, não segura). |

**Clínica que ainda não cadastrou nada continua com texto livre** nos dois caminhos — senão o dia
do deploy travaria a recepção com a lista vazia.

O histórico não é afetado: `appointments.insurance_name` guarda o **nome**, então remover um
convênio da lista não mexe nas consultas antigas, só some das novas marcações.

## Pendências / troca

- Ligar convênio a **preço/tabela** (hoje é só o nome).
- Convênio no **cadastro do paciente** (`patients.insurance`, JSON) ainda é texto livre — o ideal
  é ele também escolher da lista.
- Nº da carteirinha e validade por paciente.
