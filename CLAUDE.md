# D_Med Clinic — CRM (handoff de estado)

CRM de gestão de clínica médica (Laravel 13 / PHP 8.3 + Inertia/React 18 + stancl/tenancy v3, SQLite). Marca **D_Med Clinic** (família D_Med; EVO = linha de IA). Trabalhamos **100% online** (deploy no VPS, sem teste local).

## ⚠️ FONTE DA VERDADE = VPS, não o GitHub
O GitHub (`github.com/dinamica-evo-ia/d_med-clinic`) está no **"Initial commit — MedHealth CRM"**. Este clone local veio dele, então **NÃO tem os fixes feitos em 2026-06-20/21**. O código que está **NO AR e correto** vive no **VPS `/opt/dmedclinic`** (e dentro do container `dmedclinic-app`). Antes de mexer: **sincronizar VPS → GitHub → local**, senão perde os fixes.

## Onde está rodando
- URL: **https://www.dmedclinic.com.br** (online, login funcionando).
- VPS 177.153.202.152 (compartilhado). Container `dmedclinic-app` (imagem `dmedclinic:latest`), `127.0.0.1:8090->8080`, volumes `dmedclinic_db`(/app/database) e `dmedclinic_storage`(/app/storage).
- Borda HOJE: passa pelo **`dguard_nginx`** (nginx do produto dguard) via `/opt/dguard/nginx/conf.d/dmedclinic.conf`. ⚠️ É provisório — meta é **borda neutra/própria** (cada sistema independente). conf.d do dguard NÃO é volume montado (some em recriação → `docker cp`).

## Fixes aplicados (no VPS/repo do VPS, FALTA ir pro GitHub)
1. `proxy_set_header Host $host` (estava `\$host` literal → 400). Em `dmedclinic.conf` do dguard.
2. `bootstrap/app.php`: `$middleware->trustProxies(at: '*')` — sem isso, assets saíam `http://` em página `https://` → mixed-content → tela branca.
3. `app/Http/Middleware/HandleInertiaRequests.php`: `auth.role` virou **closure** (lazy) — senão role vinha null (calculado antes do `tenancy.by_user`) e o menu sumia.
4. `resources/js/Components/Layouts/AppLayout.jsx`: `const url = usePage().url` (estava `usePage().props.url` = undefined → `.startsWith` quebrava o dashboard pra todos quando role passou a funcionar).
5. `vite.config.js`: `build.target: ['es2020','safari14',...]` + `resources/js/polyfills.js` (polyfill de `structuredClone` e `Object.hasOwn`, importado 1º no `app.jsx`) — Safari 14/iOS antigo ficava branco.
6. Removido `<AppLayout>` duplicado de 10 páginas (Reports/ExamRequests/Certificates/Prescriptions Index/Form/Show) — o `app.jsx` já aplica layout automático; estava dobrando o menu (parecia iframe).
7. Branding: `MedHealth` → `D_Med Clinic` (AppLayout, app.jsx, TenantSelect, Prints), `APP_NAME`, e tenant renomeado. Login refeito (GuestLayout + Auth/Login.jsx): marca D_Med Clinic no lugar da logo Laravel, PT, mostrar/ocultar senha, botão com loading.
8. `DMED_INTEGRACAO_SECRET` do CRM acertado pro valor real do EVO (estava `your-secret-here`).
9. Permissões: storage/bootstrap-cache/database = www-data. Vite manifest: `app.blade.php` = `@vite(['resources/js/app.jsx'])`. Dockerfile: `apk add sqlite-dev`.

## Como buildar/deployar (sem rebuild de imagem inteira)
- Assets: `docker run --rm -v /opt/dmedclinic:/build -w /build node:24-alpine sh -c 'npm ci && npm run build'` (depois só `npm run build`) → `docker cp /opt/dmedclinic/public/build/. dmedclinic-app:/app/public/build` + `chown -R www-data`.
- Cache Laravel: `docker exec -u www-data dmedclinic-app php artisan optimize:clear` (SEMPRE como www-data, senão cache vira root → 500).
- ⚠️ Tudo isso é patch no container + repo do VPS. Pra durar de verdade: **rebuildar a imagem** com o repo atualizado.

## Acesso (TESTE — trocar)
Login por usuário central (`tenancy.by_user`; tenant definido pelo usuário). Seed (`php artisan db:seed --force`): tenant "D_Med Clinic" + `admin@medhealth.com.br` / `password` (admin), `carla@…`/`paula@…` (doctor/receptionist). Trocar antes de produção real.

## Integração com D_Med EVO (studio de gravação → prontuário)
Iframe + JWT(HS256) + postMessage. CRM gera token em `StudioMedController@token` (claims `{tenant,pacienteId,medicoId,paciente{...},exp}`), `studioUrl = DMED_STUDIO_URL(/embed?token=)`. EVO transcreve/gera anamnese e devolve via postMessage; CRM salva em `medical_records` (`salvarAnamneseIa`, colunas `transcricao`+`origem`). Segredo compartilhado = `DMED_INTEGRACAO_SECRET` (igual nos dois). Handshake testado E2E (token aceito, embed 200). Falta teste real com microfone no navegador. **Atualizar o EVO reflete automático no CRM** (consumo ao vivo), desde que o contrato (token/postMessage/rotas) não mude.

## CID
Nativo do CRM (não depende do EVO): `CidCode` + `cid_codes` (banco do tenant) + `cid10_codes.json`, busca em `api/cid/search`. Hoje **469 códigos** (subconjunto do CID-10; full = ~14 mil). Usado em Atestados e na exibição do prontuário; **falta o seletor de CID na criação do prontuário** (MedicalRecords/Form).

## Pendências
- Sincronizar VPS → GitHub (commit dos fixes) e atualizar este clone.
- Rebuild da imagem Docker com tudo (durabilidade total).
- Borda neutra/própria (tirar do dguard).
- Clínica/tenant real + senhas de verdade; limpar dados de teste.
- Limite de médicos/secretárias por **plano** (campo `plan` existe, não é usado; produto é centrado no médico).
- SMTP (`MAIL_*`) p/ recuperação de senha funcionar.
- Logo real (trocar o "+" placeholder no login e sidebar).
- Seletor de CID no prontuário + (opcional) CID-10 completo.

## Preferências
Visual CLEAN/claro (nada dark). Nunca editar enquanto o usuário está testando no mesmo dev server. Docs modulares em `docs/`.
