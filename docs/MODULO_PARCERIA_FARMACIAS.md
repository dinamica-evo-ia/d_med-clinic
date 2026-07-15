# Módulo: Parceria com farmácias de manipulação

Página **pública** onde um laboratório se cadastra, envia o arquivo com suas fórmulas e **autoriza**
a indicação aos pacientes. É o caminho legítimo pra alimentar a
[biblioteca de fórmulas](MODULO_FORMULAS.md) — sem redistribuir catálogo de terceiro.

> Voltar ao [índice](README.md).

---

## Links

| | |
|---|---|
| **Divulgação** (limpo) | https://dmedclinic.com.br/parceria-farmacias |
| Alternativo | https://crm.dmedclinic.com.br/parceria-farmacias |
| Onde os envios caem | Painel Master → aba **Farmácias** |

Os dois links servem **a mesma página** (a rota é do CRM; o domínio raiz faz proxy — ver
"Borda HTTP" abaixo).

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `app/Http/Controllers/PharmacyPartnerController.php` | Página pública: `show` + `store` (upload) |
| `app/Models/PharmacySubmission.php` | Model — **CentralConnection** (intake global, não é de clínica) |
| `database/migrations/2026_07_12_150000_create_pharmacy_submissions_table.php` | Tabela (**central**) |
| `resources/js/Pages/Public/PharmacyPartner.jsx` | A página (identidade da landing) |
| `app/Http/Controllers/Master/PharmacyController.php` | Master: listar, baixar, marcar importado, remover |
| `resources/js/Pages/Master/Farmacias/Index.jsx` | Aba Farmácias no painel |
| `public/landing-assets/dmed-logo-*.png` | Logos da landing copiados pro CRM |

**Rotas públicas** (fora do grupo de tenant, sem auth): `GET|POST /parceria-farmacias`.

---

## Fluxo

1. Laboratório abre o link → vê o pitch (Med Studio IA · Biblioteca de fórmulas · Mais receitas).
2. Preenche: **laboratório, responsável, e-mail e/ou telefone**, anexa **PDF/Excel/planilha**,
   marca a **autorização** e (opcional) observações.
3. Envio → arquivo salvo em `storage/app/private/pharmacy-submissions/` (disk `local`, **privado**)
   + registro em `pharmacy_submissions` (central).
4. Master vê em **Farmácias**: contato, data, status (Novo/Importado), **Baixar** o arquivo.
5. Master importa as fórmulas na clínica desejada via
   [Importar & Exportar](MODULO_IMPORTAR_EXPORTAR.md), escolhendo a categoria.

---

## Decisões

1. **Tabela no banco central**, não em tenant: o envio é do produto, não de uma clínica.
2. **Arquivo em disco privado** — só baixa pela rota do master (`ensure.master`).
3. **Autorização é campo obrigatório** (`accepted`) — é o que separa "catálogo do laboratório
   autorizado" de "redistribuir material de terceiro". Ver a seção de PI em
   [MODULO_FORMULAS.md](MODULO_FORMULAS.md).
4. **Identidade visual da landing**, não do CRM: é página de marketing. Reusa o header em pílula,
   as cores (`bone #f1ece1`, `ink #0d1620`, `navy #102a45`, `teal #1fb39a`) e as fontes
   (Plus Jakarta Sans + Syne). Os **logos foram copiados pro CRM** (`public/landing-assets/`) e são
   referenciados por **URL absoluta** — assim a página funciona nos dois domínios e não quebra se a
   landing for rebuildada.
5. **`Public/` não usa AppLayout** — `resources/js/app.jsx` exclui o prefixo `Public/` do shell.

---

## Borda HTTP (o espelho no domínio raiz)

Pra ter um link limpo de divulgação, o vhost da landing (`/opt/dguard/nginx/conf.d/dmedclinic.conf`)
ganhou 3 `location` que fazem proxy pro container:

- `location = /parceria-farmacias` (com `client_max_body_size 100M` pro upload)
- `location /build/` (assets do Vite)
- `location = /favicon.png`

**Por que funciona same-origin:** o `asset()` do Laravel usa o **Host do request** (não um
`ASSET_URL` fixo). Como o proxy manda `Host: dmedclinic.com.br`, os assets saem como
`dmedclinic.com.br/build/...` → **sem CORS**. A landing estática não tem `/build/`, então não há
colisão.

---

## Pontos de troca

- **Aviso por e-mail** ao master a cada envio novo (falta SMTP).
- **Importação direta do envio**: hoje o master baixa e importa manualmente. Dá pra ligar o arquivo
  do envio direto no import de fórmulas.
- **Catálogo base compartilhado**: com envios autorizados, criar um seed que popula toda clínica nova.
