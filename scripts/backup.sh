#!/bin/sh
# Backup diário dos bancos das clínicas + uploads. Roda pelo cron do HOST.
#
# ⚠️ NÃO usa `cp` nos .sqlite: copiar um SQLite enquanto o app escreve gera arquivo torto,
# que só se descobre no dia do desastre. `sqlite3 .backup` faz cópia CONSISTENTE com o
# banco em uso — é a diferença entre backup e esperança.
#
# Leva junto:
#   - database.sqlite (CENTRAL: users, tenants, planos). Sem ele os arquivos dos tenants
#     viram órfãos — ninguém sabe qual banco é de qual clínica.
#   - tenant<uuid> (um por clínica)
#   - storage/ (fotos de paciente, PDFs, resultados de exame — NÃO estão no banco)
set -eu

CONTAINER=dmedclinic-app
RAIZ=/opt/dmedclinic/backups
DIAS_RETENCAO=90
DATA=$(date +%F)
TMP="/tmp/bkp-$DATA"
DESTINO="$RAIZ/$DATA"

mkdir -p "$RAIZ"
rm -rf "$DESTINO"
mkdir -p "$DESTINO"

# --- cópia consistente, feita DENTRO do container (onde o volume está montado) ---
docker exec "$CONTAINER" sh -c "
  rm -rf '$TMP'
  mkdir -p '$TMP/database'
  for db in /app/database/database.sqlite /app/database/tenant*; do
    [ -f \"\$db\" ] || continue
    sqlite3 \"\$db\" \".backup '$TMP/database/\$(basename \"\$db\")'\"
  done
  tar czf '$TMP/storage.tar.gz' -C /app storage 2>/dev/null || true
"

docker cp "$CONTAINER:$TMP/database"        "$DESTINO/" >/dev/null
docker cp "$CONTAINER:$TMP/storage.tar.gz"  "$DESTINO/" >/dev/null
docker exec "$CONTAINER" rm -rf "$TMP"

# --- confere que cada banco copiado ABRE e não está corrompido ---
# Backup que ninguém testa não é backup. Se algum falhar, o arquivo do dia não é fechado.
ERROS=0
for f in "$DESTINO"/database/*; do
  [ -f "$f" ] || continue
  if ! docker run --rm -v "$DESTINO/database:/bkp:ro" -w /bkp alpine:3 \
       sh -c "apk add -q sqlite >/dev/null 2>&1; sqlite3 '/bkp/$(basename "$f")' 'pragma integrity_check' | head -1" \
       2>/dev/null | grep -q '^ok$'; then
    echo "FALHOU integridade: $(basename "$f")" >&2
    ERROS=$((ERROS + 1))
  fi
done

# --- empacota o dia e remove a pasta solta ---
tar czf "$RAIZ/$DATA.tar.gz" -C "$RAIZ" "$DATA"
rm -rf "$DESTINO"

# --- retenção ---
find "$RAIZ" -maxdepth 1 -name '*.tar.gz' -mtime "+$DIAS_RETENCAO" -delete

TAM=$(du -h "$RAIZ/$DATA.tar.gz" | cut -f1)
if [ "$ERROS" -gt 0 ]; then
  echo "$(date '+%F %T') backup $DATA OK ($TAM) mas com $ERROS banco(s) suspeito(s)"
  exit 1
fi
echo "$(date '+%F %T') backup $DATA ok ($TAM)"
