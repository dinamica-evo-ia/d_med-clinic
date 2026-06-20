# Módulo: Prontuário Médico (❤️ Core)

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
