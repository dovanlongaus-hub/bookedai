#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/backend/migrations/sql"
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
      echo "DATABASE_URL must be set before applying backend migrations." >&2
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

run_psql_file() {
  local sql_file="$1"
  if [[ "$PSQL_MODE" == "host" ]]; then
    "$PSQL_BIN" "${PSQL_ARGS[@]}" -f "$sql_file"
  else
    "$PSQL_BIN" "${PSQL_ARGS[@]}" -f "/tmp/bookedai-current-migration.sql"
  fi
}

prepare_psql

TARGET_MIGRATION="${1:-}"

mapfile -t MIGRATION_FILES < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ "${#MIGRATION_FILES[@]}" -eq 0 ]]; then
  echo "No migration SQL files were found in $MIGRATIONS_DIR." >&2
  exit 1
fi

echo "Applying BookedAI backend migrations from $MIGRATIONS_DIR"

for migration_file in "${MIGRATION_FILES[@]}"; do
  migration_name="$(basename "$migration_file")"
  echo
  echo "==> Applying $migration_name"
  if [[ "$PSQL_MODE" == "docker" ]]; then
    sudo docker cp "$migration_file" "supabase-db:/tmp/bookedai-current-migration.sql" >/dev/null
  fi
  run_psql_file "$migration_file"

  if [[ -n "$TARGET_MIGRATION" && "$migration_name" == "$TARGET_MIGRATION" ]]; then
    echo
    echo "Stopped after target migration $TARGET_MIGRATION"
    exit 0
  fi
done

if [[ -n "$TARGET_MIGRATION" ]]; then
  echo
  echo "Target migration $TARGET_MIGRATION was not found." >&2
  exit 1
fi

echo
echo "All backend migrations applied successfully."
