# Módulo: Minha Conta — Médico / Clínica / Usuários

Tudo que é **cadastro de quem opera a clínica** mora no menu do **avatar** (canto superior
direito), não na sidebar. A sidebar é pro trabalho do dia (pacientes, agenda, receitas).

> Voltar ao [índice](README.md).

---

## `/account/clinica` — três abas, uma página

| Aba | O que edita | Onde grava |
|---|---|---|
| **Médico** | Ficha do profissional: nome, especialidade, CPF, **CRM + UF**, **RQE**, contato, observações | `doctors` (banco do tenant) |
| **Clínica** | Razão social, natureza (PF/PJ), CNPJ/CPF, contato, endereço, logo | `clinic_profiles` (banco do tenant) |
| **Usuários** | Lista + cadastrar/editar/remover. **É aqui que se cria a Secretária** | `users` + `tenant_user` (banco **central**) |

A aba ativa vai na URL (`?tab=medico|clinica|usuarios`) — dá pra linkar direto.

### Quem vê o quê — o menu do avatar inteiro

| Item | Quem acessa |
|---|---|
| Médico / Clínica / Usuários | `admin`, `doctor` |
| Configurações (Médico · Agenda · Impressão · Modelos de anamnese · Certificado) | `admin`, `doctor` |
| Importar & Exportar | `admin`, `doctor` |
| Planos e pagamentos | **`admin`** (assinatura é do dono; o dono é sempre admin — signup e criação pelo master gravam `role=admin`) |
| Alterar senha · Sugestões · Indique um colega | todos |

- **Aba Usuários**: só **admin**. O backend nem manda a prop `users` pros outros — não é
  só a UI escondendo.
- **Mutações de usuário** (`POST/PUT/DELETE /users`): `role:admin`.

> 🔴 **Só `/account/clinica` era gated.** Todo o resto de `/account/*` estava **aberto**: a
> secretária não só via o menu cheio — ela **entrava e agia**. Dava pra mudar a **agenda do
> médico**, o **certificado digital de assinatura** e usar o **Importar & Exportar** (carga em
> massa de paciente/receita/fórmula). Não era poluição visual; a rota respondia 200.
>
> **Regra:** item do menu que a pessoa não pode abrir **não aparece** — e a rota **também**
> fecha. Menu escondido sem middleware é decoração.

### Papéis

`admin` · `doctor` · `receptionist` (rótulo na UI: **Secretária**).
Ao escolher Secretária aparecem os **acessos extras** (`TenantUserController::GRANTABLE_PERMISSIONS`,
hoje só `financeiro`) — por padrão ela não acessa essas áreas.
Limite de vagas por plano é aplicado no `TenantUserController@store` (médico e staff são
seats separados).

---

## Arquivos

| Arquivo | Papel |
|---|---|
| `app/Http/Controllers/AccountController.php` | `clinic()` (as 3 abas) + `clinicUpdate` / `clinicLogo` / `doctorUpdate` |
| `app/Http/Controllers/TenantUserController.php` | `store`/`update`/`destroy`. O `index` virou **redirect** pra aba |
| `app/Models/ClinicProfile.php` | Linha única — use sempre `ClinicProfile::current()` |
| `resources/js/Pages/Account/Clinic.jsx` | A página (abas + formulários + tabela) |
| `resources/js/Pages/Users/Partials/UserFormModal.jsx` | Modal de usuário, reaproveitado pela aba |
| `resources/js/Components/Layouts/UserMenu.jsx` | Item "Médico / Clínica / Usuários" |
| `database/migrations/tenant/2026_07_15_120000_create_clinic_profiles_table.php` | Tabela |
| `database/migrations/tenant/2026_07_15_120100_add_professional_fields_to_doctors.php` | `license_state` (UF) + `rqe` |

---

## Decisões

1. **Perfil da clínica no banco do TENANT**, não no `data` JSON do tenant central.
   Array dentro do VirtualColumn do stancl já corrompeu antes (ver o comentário de
   `settings` no model `Tenant`), e o dado é da clínica — escopo do banco do tenant.
2. **Linha única** (`ClinicProfile::current()` faz `firstOrCreate`) em vez de colunas soltas
   espalhadas: o cadastro é um bloco só, e não precisa de seed em tenant novo.
3. **Abas, não 3 páginas.** São coisas que o dono da clínica configura na mesma sentada.
4. **UF e RQE viraram coluna.** O cabeçalho da impressão (`PrintSettings`) já pedia os dois,
   mas eram digitados à mão lá — sem fonte na ficha do médico. Agora saem daqui.
5. **`/users` sobrevive como redirect** pra aba, pra não quebrar link/bookmark antigo.

---

## Pontos de troca

- **Logo da clínica × logo da impressão**: hoje são **duas** (`clinic_profiles.logo_path` e
  `doctors.print_settings.header.logo_path`). Faz sentido a impressão cair pra logo da clínica
  quando o médico não tiver a dele — ainda não está ligado.
- **CEP → endereço**: os campos existem; falta chamar um serviço de CEP pra preencher sozinho.
- **Máscaras** (CPF/CNPJ/telefone/CEP): os campos são texto livre, sem máscara nem validação
  de dígito verificador.
- **Perfil da clínica no Painel Master**: o master hoje não lê `clinic_profiles` (está no banco
  do tenant; exigiria inicializar o tenant pra ler).
