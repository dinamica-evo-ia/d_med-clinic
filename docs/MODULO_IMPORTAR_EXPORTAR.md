# Módulo: Importar & Exportar

Hub de migração (`/account/settings/import-export`) — traz a clínica de um sistema antigo pro D_Med.
Cada tópico segue **3 passos**: `form` (upload) → `preview` (parseia e mostra, **não salva**) →
`store` (salva).

> Voltar ao [índice](README.md).

---

## Tópicos

| Tópico | Rota | Liga o quê |
|---|---|---|
| **Pacientes** | `/patients-import` | Base de tudo. Dedup por CPF |
| **Anamneses** | `…/import-export/medical-records` | Paciente **pelo nome** |
| **Receitas** | `…/import-export/prescriptions` | Paciente **pelo nome** |
| **Fórmulas** | `…/import-export/formulas` | Nada — é catálogo. Escolhe a categoria |

⚠️ **Ordem obrigatória: pacientes primeiro.** Anamneses e receitas casam pelo **nome** do paciente;
sem o paciente, a linha é ignorada.

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `app/Support/CsvImport.php` | Parser genérico: detecta `;` vs `,`, converte **ISO-8859-1 → UTF-8**, mapeia cabeçalhos por apelido |
| `app/Http/Controllers/ImportExportController.php` | Anamneses, Receitas, Fórmulas (aliases + 3 passos) |
| `app/Http/Controllers/PatientImportController.php` | Pacientes |
| `resources/js/Components/Import/CsvImportPanel.jsx` | Painel genérico (upload → prévia → confirmar). Props `extraData`/`extraFields` pra campos extras |
| `resources/js/Pages/Account/Settings/ImportExport/*` | Index (hub) + uma página por tópico |

**Contrato:** `preview` e `store` respondem **JSON** (o painel usa `window.axios`).
`store` devolve `{imported, duplicates, skipped, errors[]}`.

---

## Apelidos de coluna (PT/EN)

O `CsvImport` recebe um mapa plano `cabeçalho normalizado → chave canônica`. Ex. fórmulas:
`Finalidade→purpose`, `Nome/Ativos/Fórmula→name`, `Composição/Posologia→content`,
`Forma→form`, `Via→route`, `Categoria/Tipo→category`.

Export de sistema antigo costuma vir com `;` e acentuação ISO-8859-1 — **já tratado**.

---

## 🔴 Armadilha que quase passou batido

**`medical_records.anamnesis` tem cast `array`** e a tela do prontuário só renderiza objeto:

```js
// MedicalRecords/Show.jsx
const anamnesis = record.anamnesis && typeof record.anamnesis === 'object' ? record.anamnesis : null;
```

Gravar **texto puro** no `anamnesis` → o cast faz `json_encode("texto")` → ao ler volta **string** →
`typeof !== 'object'` → **null** → a anamnese é salva no banco mas **fica invisível na ficha**.
Sem erro nenhum. Por isso o import **embrulha** o texto:

```php
'anamnesis' => ['anamnese_importada' => $texto],
'type' => 'anamnese',
'origem' => 'importado',
```

E `ANAMNESE_LABELS.anamnese_importada` dá o rótulo "Anamnese (importada do sistema anterior)".

> **Regra:** qualquer coisa que grave em `anamnesis` tem que ser **objeto**. As chaves viram seções
> na tela (`humanize(key)` como fallback de rótulo).

---

## Migração do Dr. Ricardo (caso real — o playbook)

O sistema antigo exportou as anamneses em **duas tabelas** (capa + itens):

| Arquivo | O que é |
|---|---|
| `Anamneses-2.csv` | **Capa**: `Código; Código do paciente; Paciente; Profissional; Data de criação` — 44 linhas |
| `Anamneses respostas.csv` | **Itens**: 1 linha por pergunta/resposta, ligada por `Código da anamnese` — 2.876 linhas |

Join: `Código` = `Código da anamnese`. **Um sozinho não serve** (capa não tem conteúdo; respostas não
têm data).

**O que era preciso tratar:**
1. **Respostas em JSON** (múltipla escolha): `{"answer":[opções],"select":["1","5","6"]}` —
   `select` são os **índices base 1** das marcadas. Decodificar → *"Sedentarismo, Ansiedade, …"*.
   `select:[]` = nada marcado.
2. **Cada Q&A repetida 4×** (uma por "Tipo de pergunta" — campo lixo do export). Deduplicar.
3. **Respostas em HTML** (`<p>`, `<br>`) → texto.
4. **Anamneses vazias**: 6 das 44 tinham só `<p></p>` / nada marcado — o médico abriu o modelo e não
   preencheu. Ignoradas (nenhum dado perdido).
5. Gravar como **objeto `{pergunta: resposta}`** → cada pergunta vira seção na ficha.

Resultado: **38 anamneses**, 38 pacientes, 0 erros (44/44 casaram pelo nome).

> Os arquivos de origem são **dados clínicos identificáveis** — nunca commitar, nunca subir pra
> lugar público. Os temporários usados na migração foram zerados do servidor.

---

## Decisões

1. **3 passos com prévia** — o médico vê o que vai acontecer antes de salvar.
2. **Casar por nome** (não por ID) — o ID do sistema antigo não tem equivalente aqui.
3. **Ignorar linha ruim, não abortar** — devolve `errors[]` explicando.
4. **Não duplicar**: anamnese/receita por paciente+médico+data; fórmula por nome+categoria.
5. **Painel genérico** (`CsvImportPanel`) — página nova de import só declara rotas/colunas/dicas.

---

## Pontos de troca

- **Exportar** (o "&Exportar" do nome ainda é só import): a estrutura já prevê um botão simétrico
  por tópico.
- **Import de anamnese em formato "long"** (capa + itens) direto pela UI: hoje esse caso foi
  resolvido com script (join feito fora). Se virar rotina, vale um passo de "pivotar" no controller.
- **Médico criado automaticamente**: `resolveDoctorId` cria o profissional se não existir — revisar
  se um dia o cadastro de médico ficar mais rico.
