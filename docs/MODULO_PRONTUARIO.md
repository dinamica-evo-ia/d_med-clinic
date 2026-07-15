# Módulo: Prontuário Médico (❤️ Core)

> Voltar ao [índice](README.md). **O texto abaixo da seção "Estado atual" é o desenho original** —
> mantido como referência de intenção. O que vale hoje está aqui em cima.

## Estado atual (o que está no ar)

### Anamnese × Evolução — são coisas diferentes
Coluna **`medical_records.type`**: `anamnese` | `evolucao`.

| | Anamnese | Evolução |
|---|---|---|
| Conceito | **Documento único vivo** do paciente | Registro **daquela** consulta |
| Onde aparece | Aba **Anamnese** (a atual em destaque + histórico) | Aba **Evoluções** (lista) |
| Como cria | "Nova consulta" → *Nova anamnese*, ou **Studio Med** (sempre anamnese) | "Nova consulta" → *Nova evolução* |

`origem`: `manual` · `studio_med` (gravada pelo EVO) · `importado` (migração).

### 🔴 `anamnesis` é objeto, não texto
Tem cast **`array`**, e a tela só renderiza objeto:
```js
const anamnesis = record.anamnesis && typeof record.anamnesis === 'object' ? record.anamnesis : null;
```
Gravar string → salva no banco mas **fica invisível na ficha** (sem erro). As **chaves viram
seções** na tela; o rótulo sai de `anamnese_template_snapshot` → `ANAMNESE_LABELS` → `humanize(key)`.
Detalhes e o caso real em [MODULO_IMPORTAR_EXPORTAR.md](MODULO_IMPORTAR_EXPORTAR.md).

### Modelos de anamnese (por médico)
Tabela `anamnese_templates` (tenant): `doctor_id`, `name`, `fields` JSON, `is_default`.
O médico escolhe o modelo no Studio; o EVO gera com esses campos; o CRM salva um
**`anamnese_template_snapshot`** (imutável — sobrevive à edição/remoção do modelo).

### Studio Med (consulta gravada)
Transcrição + resumo + anamnese estruturada vindas do EVO via `postMessage`. A tela ordena:
alertas → **transcrição** → **resumo** → anamnese estruturada → SOAP. Suporta **acompanhante**
(3 vozes) e marca a fonte de cada campo. Turnos de conversa paralela ficam colapsados.
Receitas identificadas pela IA aparecem como **sugestão** — nada é emitido sem o médico revisar.

### CID-10
**9.901 códigos** (categoria + subcategoria), tabela `cid_codes` no tenant.
Componente `Components/shared/CidAutocomplete.jsx` — usado no SOAP e no atestado.
⚠️ O dataset **não inclui U07** (COVID-19).

### 🔴 Busca de paciente: acento quebrava tudo

`Patient::scopeSearch()` — usado pela lista de Pacientes **e** pelo PatientPicker (os dois
precisam achar a mesma coisa).

O `LIKE` do SQLite só é case-insensitive em **ASCII**, e o `LOWER()` também
(`LOWER('MÁRCIO')` = `'mÁrcio'`). A busca era uma loteria:

| busca | antes | agora |
|---|---|---|
| `marcio` | 14 | **15** |
| `MÁRCIO` | **0** | **15** |
| `jose` | 44 | 83 |
| `José` | **8** | 81 |

Não dá pra consertar na query. Solução: coluna **`patients.name_normalized`** (minúscula, sem
acento, indexada), preenchida no **`saving`** do model — não no `creating`, senão a busca
passa a mentir depois da primeira edição de nome. Migration faz o backfill do que já existe.

Telefone e CPF comparam **só os dígitos**, pra achar com máscara ou sem.

> `jose` ainda acha 2 a mais que `JOSÉ`: são e-mails `@hsaojose.com`. É correto — e-mail não
> tem acento.

### Marcar consulta pra paciente novo

`Components/shared/PatientPicker.jsx` — busca por **nome, telefone ou CPF** e, se não achar,
**cadastra na hora** (`POST /api/patients/quick`), sem sair do formulário.

Antes era um `<select>` com **todos** os pacientes e **não havia como marcar consulta pra quem
ainda não era paciente** — a recepção tinha que sair da tela, cadastrar, e voltar (perdendo o
que já tinha digitado). Pior: o `create()` carregava `Patient::orderBy('name')->get()` inteiro
a cada abertura — **2466 registros** na Clínica RF pra popular um dropdown. Agora só vem o
paciente pré-selecionado (quando se chega pela ficha dele, `?patient_id=`).

**No cadastro rápido só o nome é obrigatório** — quem liga nem sempre tem CPF em mãos; a ficha
se completa depois em Pacientes. Mas **quando o CPF vem, o backend devolve o cadastro
EXISTENTE em vez de criar outro** — mesmo problema que a IA do Atendente teve com a base
importada (1521 de 2466 têm CPF; só 15 têm telefone).

### Fórmulas na receita
Ver [MODULO_FORMULAS.md](MODULO_FORMULAS.md).

---

## Estrutura SOAP

### S - Subjetivo (Anamnese)
- Queixa principal (texto livre)
- História da doença atual (HDA)
- História médica pregressa
- Medicamentos em uso
- Alergias
- História familiar
- Hábitos de vida

### O - Objetivo (Exame Físico)
- Sinais vitais: PA, FC, FR, Temp, SpO2, Peso, Altura
- Exame físico por sistema (texto livre estruturado)

### A - Avaliação (Diagnóstico)
- CID-10 (código + descrição)
- Diagnóstico principal
- Diagnósticos secundários
- Observações

### P - Plano (Conduta)
- **Prescrição** (preparado para IA):
  - Medicamento, dose, via, frequência, duração
  - Data da prescrição, validade
  - Possibilidade de sugerir automaticamente via IA
- **Exames**: código TUSS (futuro), nome, laboratório
- **Atestados**: modelo, código CID, dias, atividades
- **Conduta**: orientações, retorno, encaminhamento

---

## Integrações Futuras

### D_Med Evo
- Webhook para receber transcrição de consulta
- Webhook para receber anamnese pronta
- Associar ao prontuário automaticamente

### IA para Prescrição
- Modelo: OpenAI / Claude API (plugável via Service)
- Input: prontuário completo (S + O + A)
- Output: sugestão de P (medicamentos, doses)
- Médico revisa e confirma antes de salvar
- Feedstore: médico aceita/rejeita → fine-tuning futuro

### CID-10
- Tabela completa do DATASUS (~12k códigos)
- Seeder com todos os códigos
- Busca autocomplete no frontend
- Campos: codigo, descricao, capitulo, categoria

---

## Estrutura JSONB (medical_records.diagnosis)
```json
[
  {
    "type": "principal",
    "code": "J45.0",
    "description": "Asma predominantemente alérgica",
    "notes": "Paciente com crise há 3 dias"
  },
  {
    "type": "secundario",
    "code": "J30.1",
    "description": "Rinite alérgica devida a pólen",
    "notes": ""
  }
]
```

## Estrutura JSONB (medical_records.prescriptions)
```json
[
  {
    "medication": "Salbutamol",
    "dosage": "100mcg",
    "route": "inalatória",
    "frequency": "A cada 4 horas se necessário",
    "duration": "7 dias",
    "quantity": "1 frasco",
    "notes": "Não exceder 8 doses/dia",
    "ai_suggested": false
  }
]
```

## Estrutura JSONB (medical_records.certificates)
```json
[
  {
    "type": "atestado",
    "cid_code": "J45.0",
    "days": 3,
    "activities": "repouso",
    "notes": "Paciente necessita afastamento",
    "created_at": "2024-01-15T10:00:00"
  }
]
```
