# Backup dos bancos das clínicas

Até 2026-07-23 **não existia backup nenhum**. O risco já tinha se materializado: em 2026-07-14 o
tenant do Consultório Dr. Ricardo (2.267 pacientes + 120 fórmulas) foi apagado pelo botão "Apagar"
do painel master, que faz hard delete do tenant **e do arquivo do banco**. Só foi possível
reconstruir porque os CSVs de origem estavam no `~/Downloads` do dono.

## O que é protegido

| | Tamanho | Onde vive |
|---|---|---|
| `database.sqlite` (**central**: users, tenants, planos) | 748 KB | volume `dmedclinic_db` |
| `tenant<uuid>` — um por clínica (10 arquivos) | ~27 MB | volume `dmedclinic_db` |
| `storage/` — fotos de paciente, PDFs, resultados de exame | 4,6 MB | volume `dmedclinic_storage` |
| **Total** | **~33 MB** → **4,5 MB** comprimido | |

⚠️ O **central entra junto** de propósito: sem ele os arquivos `tenant<uuid>` viram órfãos — não
dá pra saber qual banco é de qual clínica, nem quem loga onde. E o `storage/` **não está no banco**:
backup só dos `.sqlite` perderia todas as fotos e PDFs.

## Como funciona

**Script:** `scripts/backup.sh` (versionado aqui, roda em `/opt/dmedclinic/scripts/backup.sh`).
**Cron do HOST:** todo dia às **03:10**, log em `/opt/dmedclinic/backups/backup.log`.
**Retenção:** 90 dias (~400 MB no total — cabe folgado nos 11 GB livres do VPS).

⚠️ **Nunca use `cp` num `.sqlite` em uso.** Copiar o arquivo enquanto o app escreve gera um banco
torto, e isso só se descobre no dia do desastre. O script usa **`sqlite3 .backup`**, que faz cópia
consistente com o banco em uso. Depois de copiar, roda `pragma integrity_check` em cada arquivo e
sai com erro se algum não voltar `ok`.

## Restaurar

```bash
# 1) extrair o dia desejado
tar xzf /opt/dmedclinic/backups/2026-07-23.tar.gz -C /tmp

# 2) conferir antes de sobrescrever qualquer coisa
sqlite3 /tmp/2026-07-23/database/tenant<uuid> "pragma integrity_check; select count(*) from patients"

# 3) parar o app, repor o arquivo, subir de novo
docker stop dmedclinic-app
docker cp /tmp/2026-07-23/database/tenant<uuid> dmedclinic-app:/app/database/tenant<uuid>
docker exec dmedclinic-app chown www-data:www-data /app/database/tenant<uuid>
docker start dmedclinic-app
```

**Teste de restauração feito em 2026-07-23** (Clínica RF): integridade `ok` e contagens batendo com
o banco ao vivo — 2.468 pacientes, 9 consultas, 41 prontuários, 1 receita, 153 fórmulas.
Backup que ninguém restaurou não é backup; refaça esse teste de tempos em tempos.

## Pendências

- 🔴 **A cópia ainda está só no VPS.** Isso cobre erro humano (o caso do Dr. Ricardo), mas **não**
  cobre desastre: se o VPS morre ou é comprometido, os backups vão junto. Falta a camada externa:
  puxar pro HD do dono e, quando chegar, pro **M4 sempre-ligado via Tailscale**
  (ver [[mordomo-acesso-remoto]] na memória).
- Se um dia a cópia sair pra storage de terceiro: **criptografar antes de sair** (age/gpg). É dado
  médico — LGPD.
- Avisar alguém quando o backup falhar (hoje só registra no log; ninguém lê log).
- O botão "Apagar" do painel master continua fazendo hard delete sem exigir backup recente.
