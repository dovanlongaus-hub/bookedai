#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ENV="${PROJECT_DIR}/.env"
SUPABASE_ENV="${PROJECT_DIR}/supabase/.env"

if [[ ! -f "${APP_ENV}" || ! -f "${SUPABASE_ENV}" ]]; then
  echo "Both ${APP_ENV} and ${SUPABASE_ENV} must exist."
  exit 1
fi

python3 - "${APP_ENV}" "${SUPABASE_ENV}" <<'PY'
from pathlib import Path
import sys

app_path = Path(sys.argv[1])
supabase_path = Path(sys.argv[2])

def read_env(path: Path) -> dict[str, str]:
    result = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key] = value
    return result

app_env = read_env(app_path)
supabase_env = read_env(supabase_path)

updates = {
    "SUPABASE_URL": supabase_env["SUPABASE_PUBLIC_URL"],
    "SUPABASE_ANON_KEY": supabase_env["ANON_KEY"],
    "SUPABASE_SERVICE_ROLE_KEY": supabase_env["SERVICE_ROLE_KEY"],
    "APP_DB_NAME": supabase_env["APP_DB_NAME"],
    "APP_DB_USER": supabase_env["APP_DB_USER"],
    "APP_DB_PASSWORD": supabase_env["APP_DB_PASSWORD"],
    "N8N_DB_NAME": supabase_env["N8N_DB_NAME"],
    "N8N_DB_USER": supabase_env["N8N_DB_USER"],
    "N8N_DB_PASSWORD": supabase_env["N8N_DB_PASSWORD"],
}
updates["PUBLIC_API_URL"] = "https://api.bookedai.au"
updates["VITE_API_BASE_URL"] = "https://api.bookedai.au/api"
updates["DATABASE_URL"] = (
    f"postgresql+asyncpg://{updates['APP_DB_USER']}:{updates['APP_DB_PASSWORD']}"
    f"@supabase-db:5432/{updates['APP_DB_NAME']}"
)

lines = app_path.read_text().splitlines()
output = []
seen = set()
for line in lines:
    stripped = line.strip()
    if "=" in line and not stripped.startswith("#"):
        key = line.split("=", 1)[0]
        if key in updates:
          output.append(f"{key}={updates[key]}")
          seen.add(key)
          continue
    output.append(line)

for key, value in updates.items():
    if key not in seen:
        output.append(f"{key}={value}")

app_path.write_text("\n".join(output) + "\n")
PY

echo "Updated ${APP_ENV} from ${SUPABASE_ENV}"
