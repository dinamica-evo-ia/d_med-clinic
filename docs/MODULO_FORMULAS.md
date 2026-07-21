# Módulo: Fórmulas — Manipulados e Industrializados

Biblioteca de fórmulas **por clínica**, usada na hora de prescrever. O médico busca pela
**finalidade** ("pra que serve") e arrasta a fórmula pra dentro da receita.

> Voltar ao [índice](README.md).

---

## Conceito

**Duas categorias**, que o médico seleciona:

| Categoria | O que é | Origem |
|---|---|---|
| `manipulado` | Composição feita na farmácia de manipulação | Cadastro manual, import CSV, parceria com laboratórios |
| `industrializado` | Medicamento de marca / pronto | Cadastro manual, import CSV. **Futuro:** integração **Memed** |

**Biblioteca é isolada por clínica** (a tabela `formulas` vive no banco do tenant). A Clínica A
**não** enxerga as fórmulas da Clínica B. Não existe catálogo global — se quiser dar fórmulas a
uma clínica, tem que semear/importar naquele tenant.

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `app/Models/Formula.php` | Model. `scopeSearch` busca em purpose/name/content/form |
| `app/Http/Controllers/FormulaController.php` | CRUD + `apiSearch` (JSON pro painel da receita) |
| `resources/js/Pages/Formulas/Index.jsx` | Biblioteca: lista, busca, filtro por categoria, CRUD, atalho de import |
| `resources/js/Pages/Prescriptions/Form.jsx` | `FormulaPanel`: abas + busca + arrastar/inserir |
| `database/migrations/tenant/2026_07_09_140000_create_formulas_table.php` | Tabela |
| `database/migrations/tenant/2026_07_12_140000_add_purpose_to_formulas.php` | `purpose` (finalidade) |
| `database/migrations/tenant/2026_07_14_120000_add_category_to_formulas.php` | `category` (default `manipulado`) |

**Comandos de limpeza** (one-off, reutilizáveis em qualquer importação):

| Comando | Faz |
|---|---|
| `formulas:tidy <tenant> [--dry] [--batch=8]` | IA reconstrói **nome** (ativos + concentração) e **conteúdo** legível, **removendo PII** (CPF, CID, nome/endereço de paciente e do médico) |
| `formulas:dedupe <tenant> [--dry] [--junk=IDs]` | Remove não-fórmulas (`--junk`), deduplica por nome (mantém o conteúdo mais completo), normaliza casing, reporta PII residual |
| `formulas:purposes <tenant> [--dry]` | Preenche via IA a **finalidade** das que estão sem (não sobrescreve as preenchidas) |
| `formulas:classify <tenant> [--dry] [--batch=20]` | IA separa **manipulado × industrializado**. Necessário porque export de *receitas* mistura os dois e o import marca tudo como `manipulado` |

Ordem de uso numa importação bagunçada:
**tidy → purposes → classify --dry → classify → dedupe --dry → dedupe --junk=…**

⚠️ **A IA não é determinística.** Casos de fronteira (Undecilato de Testosterona, Citrato de
Clomifeno) trocaram de categoria entre duas rodadas do `classify`. Rode `--dry`, confira, e
trate o resultado como sugestão — não como verdade.

---

## Campos

- **`purpose` (finalidade)** — ⭐ o mais importante. É o **título do card** e o que o médico busca
  ("Emagrecimento", "Reposição hormonal masculina"). Médico procura por finalidade, **não** por
  composição.
- `name` — princípios ativos + concentração ("Tadalafila 5mg + Testosterona 5mg"). Vira subtítulo.
- `content` — composição + posologia (texto).
- `form` / `route` — forma farmacêutica e via (badges).
- `category` — `manipulado` | `industrializado`.

---

## Decisões

1. **Finalidade como título** (não o nome). Os médicos buscam por objetivo terapêutico.
2. **Categorias separadas com abas**, não um rótulo só — o médico escolhe o contexto antes de buscar.
3. **Isolamento por tenant** mantido (nada de catálogo global): fórmula é ativo da clínica.
4. **Categoria do CSV vence por linha**; sem coluna, vale a escolhida no formulário de import.
5. **Não duplica** mesmo nome na mesma categoria.
6. **Limpeza por IA, não regex.** O texto de origem (export de receitas) é caótico demais —
   ver "Lições" abaixo.

---

## Lições da migração do Dr. Ricardo (não repetir os erros)

O export de receitas do sistema antigo é **texto cru de prescrição**, não um catálogo:

- O parser ingênuo pegou a linha de administração como nome → **109 de 150 com nome-lixo**
  (12 fórmulas chamadas literalmente `USO ORAL:`).
- O conteúdo vinha com **`\xa0`** (nbsp), palavras grudadas (`MGAPLICAR`), e um cabeçalho
  genérico `---------- Fórmula ----------`.
- 🔴 **PII embutido**: CPF, CID e até **nome/endereço/telefone de paciente** dentro da fórmula.
  Biblioteca reutilizável **não pode** ter isso → o `formulas:tidy` remove.
- Entradas que **não são fórmula** (encaminhamentos hospitalares, notas clínicas) entraram junto →
  removidas com `formulas:dedupe --junk=`.
- O `tidy` **deixa a finalidade em branco** quando a IA devolve vazio → por isso existe o
  `formulas:purposes`. **Sempre conferir quantas ficaram sem finalidade depois do tidy.**

Resultado do pipeline: **168 receitas → 150 únicas → IA → dedupe → 119 fórmulas**, 0 PII,
0 nomes repetidos, 0 sem finalidade.

### Segunda leva: o catálogo do próprio médico (2026-07-15)

Depois veio um CSV que **é catálogo de verdade** (não export de receitas): 42 fórmulas com a
**finalidade escrita pelo próprio médico** ("Menopausa 3, Tratamento dos calores sem TRH"),
composição em pontilhado, referência bibliográfica e observação clínica. Qualidade muito
superior à do que a IA remontou. Foi importado **pelo controller real** (não por script), o que
expôs dois bugs — ver [MODULO_IMPORTAR_EXPORTAR.md](MODULO_IMPORTAR_EXPORTAR.md).

Estado final da Clínica RF: **161 → 153 fórmulas · 109 manipulados · 44 industrializados.**

**Como os duplicados foram achados** (casar por **composição**, nunca por nome — a IA inventou
nomes completamente diferentes pra mesma fórmula):

1. Extrair o conjunto de **ativos normalizados** (sem acento, sem dose, sem posologia).
2. Comparar com casamento **fuzzy** (tolera `terrestres`/`terrestris`, prefixo, posologia colada).
3. Só é duplicado com **mesmos ativos E mesmas doses**. Deu **8 pares** — apagou-se a versão da IA.

🔴 **Score alto ≠ duplicado.** Os 5 pares entre 0.55 e 0.86 pareciam duplicados e **não eram**:
o registro antigo é uma **receita inteira com 2-3 fórmulas coladas**, e uma delas por acaso é a
do catálogo. Ex.: `#143` = a fórmula de adaptógenos **+ L-Lisina + Citrato de Clomifeno**. Apagar
teria perdido as outras duas. **Sempre abrir o conteúdo dos pares antes de apagar.**

Sobra disso: parte das 119 antigas não são fórmulas de biblioteca, são prescrições inteiras.
Quebrar em fórmulas separadas é trabalho pendente (nada quebra por causa disso — só polui a busca).

---

## ⚠️ Propriedade intelectual

As fórmulas do Dr. Ricardo derivam do **catálogo da Support Health** (via o histórico de receitas
dele). Usar **no consultório dele** = ok (são as receitas que ele prescreveu). **Copiar pra outras
clínicas = redistribuir catálogo de terceiro — não fazer.**

O caminho legítimo para um catálogo compartilhado é a
[parceria com farmácias](MODULO_PARCERIA_FARMACIAS.md): o laboratório envia **e autoriza**.

---

## Como entra na receita

`FormulaPanel` (em `Prescriptions/Form.jsx`) busca em `/formulas/search?q=&category=`.
Ao arrastar/inserir (`insertFormula`):

1. Tira o cabeçalho genérico `---------- Fórmula ----------` (artefato de importação).
2. Usa a **finalidade** como título do bloco (fallback: nome).
3. Preenche o **título da receita** com a finalidade, se estiver vazio.

## Cadastro manual (2026-07-20)

O CRUD (Fórmulas → **+ Nova fórmula**) sempre existiu, mas o formulário mostrava 6 campos com a
mesma cara — parecia tudo obrigatório. Reorganizado:

- **Obrigatórios (o que o backend exige):** **Tipo** (Manipulado/Industrializado), **Título**, **Texto**.
- **Opcionais, recolhidos** atrás de "+ finalidade, forma e via de uso": finalidade, forma, via.
  Editar uma fórmula que já tem esses dados abre expandido (senão pareceria que sumiram).
- **Tipo é obrigatório e não vem pré-marcado** numa fórmula nova — antes iniciava em "manipulado"
  e um industrializado ia pra categoria errada sem ninguém reparar. `category` = `required` no
  `FormulaController::validated`, com mensagem em pt-BR.
- **Import não passa por aqui:** o `ImportExportController` tem validação própria (já exigia
  categoria) e cria direto — mudar o form manual não afeta a importação.

---

## Pontos de troca

- **Memed** (industrializados): plugar como fonte da categoria `industrializado` no `apiSearch` —
  a UI (abas, busca, arrastar) já está pronta e não muda.
- **Catálogo base pra toda clínica nova**: criar um seed alimentado pelas fórmulas **autorizadas**
  pelos laboratórios (ver módulo de parceria). Não usar as do Dr. Ricardo.
- **Fórmula por médico**: a coluna `doctor_id` existe e não é usada (hoje a biblioteca é da clínica
  inteira). Basta filtrar por `doctor_id` se um dia quiser separar.
