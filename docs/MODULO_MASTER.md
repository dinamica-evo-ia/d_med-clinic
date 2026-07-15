# Módulo: Painel Master (super-admin do produto)

Área do dono do produto (`/master`). Visual **dark/âmbar**, de propósito diferente do CRM
(claro/azul), pra nunca confundir "estou administrando o produto" com "estou usando uma clínica".

> Voltar ao [índice](README.md).

---

## Acesso

- Papel global **`users.is_master`** (coluna no banco central). Não é papel de clínica.
- Middleware **`ensure.master`** (alias de `EnsureMaster`) → 403 se não for.
- Master logando cai direto em `/master` (a rota `/` testa `is_master` antes de tudo).
- ⚠️ **O master não tem clínica** (0 tenants). Ele só acessa `/master/*` — por isso a troca da
  própria senha precisou existir **dentro do painel** (o menu de conta do CRM é inalcançável).

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `app/Http/Middleware/EnsureMaster.php` | Porteiro do `/master` |
| `app/Http/Controllers/Master/DashboardController.php` | Visão geral |
| `app/Http/Controllers/Master/ClinicaController.php` | Clínicas: CRUD, aprovar, cancelar, apagar, senhas dos logins |
| `app/Http/Controllers/Master/AccountController.php` | Senha do **próprio master** |
| `app/Http/Controllers/Master/PlanController.php` | Planos (tabela `plans`, central) |
| `app/Http/Controllers/Master/PharmacyController.php` | Farmácias parceiras (envios) |
| `app/Http/Controllers/Master/ApiKeyController.php` | Chaves de API por clínica |
| `app/Http/Controllers/Master/ImpersonationController.php` | Entrar como admin da clínica |
| `resources/js/Components/Layouts/MasterLayout.jsx` | Shell dark + nav + menu de conta |
| `resources/js/Pages/Master/*` | Dashboard, Clinicas (Index/Form), Planos, Farmacias |

**Abas:** Visão geral · Clínicas · Planos · Farmácias.

---

## Ciclo de vida de uma clínica

```
signup público → pending → [Aprovar] → trial (7d) → active
                    ↓                      ↓
                 bloqueado          [Estender] / [Reativar]
                                           ↓
                              cancelled (soft) / Apagar (definitivo)
```

**Status** (`config/plans.php`): `pending` · `trial` · `active` · `past_due` · `suspended` · `cancelled`.

### Aprovação manual (contas novas)
Signup público cria o tenant como **`pending`**, **sem** `trial_ends_at`, e **não loga** o usuário
(manda pro login com aviso "em análise"). O middleware `InitializeTenancyByUser::isBlocked` trata
`pending` como bloqueado → tela **"Conta em análise"**. O master aprova → `trial` com 7 dias
**a partir da aprovação** (não do cadastro). Banner roxo no topo mostra quantas aguardam.

> Só o **signup público** entra pendente. Clínica criada pelo master já nasce liberada.

### Ações na lista de clínicas
| Ação | Efeito |
|---|---|
| **Aprovar** | `pending` → `trial` + 7 dias (só aparece se pendente) |
| **Editar** | Nome, e-mail, CNPJ, plano, status |
| **Senha** | Lista os **logins da clínica** e define nova senha (com botão Gerar) pra repassar ao cliente |
| **API** | Gera/revoga chave de API da clínica |
| **Entrar** | Impersona o admin da clínica (banner âmbar persistente) |
| **Estender** | Trial + N dias |
| **Reativar** | status → `active` |
| **Cancelar** | **Soft**: status `cancelled`, mantém os dados |
| **Apagar** | 🔴 **Hard delete**: tenant + banco + vínculos + usuários exclusivos. Pede o **nome exato** digitado. **Nunca apaga um master** |

---

## Decisões

1. **Dark/âmbar** pra separar visualmente do CRM.
2. **Aprovação manual** antes de liberar teste (evita cadastro fake consumindo recurso).
3. **Trial conta da aprovação**, não do cadastro — senão o cliente perde dias esperando análise.
4. **Cancelar ≠ Apagar**: cancelar é reversível e preserva dado clínico; apagar é pra limpar teste.
5. **Apagar exige digitar o nome** — a ação é irreversível e não há backup.
6. **Reset de senha da clínica pelo master**: cliente esquece a senha e não há SMTP; o master
   define uma nova e repassa.

---

## ⚠️ Riscos conhecidos

- **Apagar é irreversível e NÃO há backup automático** dos bancos dos tenants. Já aconteceu de uma
  clínica com 2.267 pacientes e 120 fórmulas ser apagada (intencionalmente) e só ter sido possível
  reconstruir porque os CSVs originais existiam. **Backup automático é pendência aberta.**
- **Sem SMTP** (`MAIL_*` vazio): o cliente **não é avisado** quando é aprovado, e o master **não é
  avisado** de cadastro novo (precisa abrir `/master/clinicas` e ver o banner).

---

## Pontos de troca

- **Avisos por e-mail** (ligar quando houver SMTP): master notificado a cada signup; cliente
  notificado ao ser aprovado.
- **Billing automatizado** (Asaas/Iugu/Stripe): hoje a cobrança é manual — status muda na mão.
- **Outros masters pela UI**: hoje `is_master` só por banco.
- **Log de impersonação**: quem entrou em qual clínica e quando.
