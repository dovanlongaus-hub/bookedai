#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
PSQL_MODE="host"
PSQL_BIN=""
PSQL_ARGS=()

load_env_file() {
  local file_path="$1"
  if [[ -f "$file_path" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file_path"
    set +a
  fi
}

resolve_db_name() {
  if [[ -n "${APP_DB_NAME:-}" ]]; then
    printf '%s' "$APP_DB_NAME"
    return
  fi

  if [[ -n "${DATABASE_URL:-}" ]]; then
    python3 - <<'PY'
import os
from urllib.parse import urlparse

url = os.environ.get("DATABASE_URL", "")
parsed = urlparse(url)
path = (parsed.path or "").lstrip("/")
print(path or "bookedai")
PY
    return
  fi

  printf '%s' "bookedai"
}

prepare_psql() {
  load_env_file "$ENV_FILE"

  if command -v psql >/dev/null 2>&1; then
    if [[ -z "${DATABASE_URL:-}" ]]; then
      echo "DATABASE_URL must be set before verifying backend migration state." >&2
      exit 1
    fi
    PSQL_MODE="host"
    PSQL_BIN="psql"
    PSQL_ARGS=("$DATABASE_URL" "-v" "ON_ERROR_STOP=1")
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo docker ps --format '{{.Names}}' | grep -qx 'supabase-db'; then
    local db_name
    db_name="$(resolve_db_name)"
    PSQL_MODE="docker"
    PSQL_BIN="sudo"
    PSQL_ARGS=(
      docker exec
      -e "PGPASSWORD=${POSTGRES_PASSWORD:-}"
      supabase-db
      psql
      -h 127.0.0.1
      -U "${POSTGRES_USER:-supabase_admin}"
      -d "$db_name"
      -v ON_ERROR_STOP=1
    )
    return
  fi

  echo "psql is required but was not found on PATH, and no usable supabase-db docker fallback was available." >&2
  exit 1
}

run_psql() {
  "$PSQL_BIN" "${PSQL_ARGS[@]}" "$@"
}

prepare_psql

echo "[migration-verify] checking service_merchant_profiles publish-state columns"
run_psql -Atc "
select column_name
from information_schema.columns
where table_name = 'service_merchant_profiles'
  and column_name in ('tenant_id', 'owner_email', 'publish_state', 'currency_code', 'display_price')
order by column_name;
" | tee /tmp/bookedai_migration_columns.txt

for required_column in currency_code display_price owner_email publish_state tenant_id; do
  if ! grep -qx "$required_column" /tmp/bookedai_migration_columns.txt; then
    echo "[migration-verify] missing required column: $required_column" >&2
    exit 1
  fi
done

echo "[migration-verify] checking tenant_user_memberships table"
tenant_membership_exists="$(
  run_psql -Atc "
  select count(*)
  from information_schema.tables
  where table_name = 'tenant_user_memberships';
  "
)"
if [[ "$tenant_membership_exists" != "1" ]]; then
  echo "[migration-verify] tenant_user_memberships table is missing" >&2
  exit 1
fi

echo "[migration-verify] publish_state distribution"
run_psql -P pager=off -c "
select publish_state, count(*)
from service_merchant_profiles
group by publish_state
order by publish_state;
"

echo "[migration-verify] owner_email backfill count"
run_psql -P pager=off -c "
select count(*) as owner_email_populated
from service_merchant_profiles
where owner_email is not null;
"

echo "[migration-verify] multi-currency catalog sample"
run_psql -P pager=off -c "
select currency_code, count(*) as record_count
from service_merchant_profiles
group by currency_code
order by currency_code;
"

echo "[migration-verify] migration state verification passed"
