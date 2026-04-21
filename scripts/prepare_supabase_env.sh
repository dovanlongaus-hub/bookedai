#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_DIR="${PROJECT_DIR}/supabase"
ENV_FILE="${SUPABASE_DIR}/.env"

DOMAIN_SUPABASE="${DOMAIN_SUPABASE:-supabase.bookedai.au}"
DOMAIN_APP="${DOMAIN_APP:-bookedai.au}"

APP_DB_NAME="${APP_DB_NAME:-bookedai}"
APP_DB_USER="${APP_DB_USER:-bookedai_app}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-change-me-app}"
N8N_DB_NAME="${N8N_DB_NAME:-n8n}"
N8N_DB_USER="${N8N_DB_USER:-n8n_app}"
N8N_DB_PASSWORD="${N8N_DB_PASSWORD:-change-me-n8n}"

export DOMAIN_SUPABASE DOMAIN_APP
export APP_DB_NAME APP_DB_USER APP_DB_PASSWORD
export N8N_DB_NAME N8N_DB_USER N8N_DB_PASSWORD

cd "${SUPABASE_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp .env.example .env
fi

sh ./utils/generate-keys.sh --update-env

python3 - <<'PY'
from pathlib import Path
import os

env_path = Path(".env")
lines = env_path.read_text().splitlines()

replacements = {
    "SUPABASE_PUBLIC_URL": f"https://{os.environ['DOMAIN_SUPABASE']}",
    "API_EXTERNAL_URL": f"https://{os.environ['DOMAIN_SUPABASE']}",
    "SITE_URL": f"https://{os.environ['DOMAIN_APP']}",
    "POSTGRES_HOST": "db",
    "POSTGRES_DB": "postgres",
    "POSTGRES_PORT": "5432",
    "DASHBOARD_USERNAME": "supabase",
    "DISABLE_SIGNUP": "true",
}

extra = {
    "APP_DB_NAME": os.environ["APP_DB_NAME"],
    "APP_DB_USER": os.environ["APP_DB_USER"],
    "APP_DB_PASSWORD": os.environ["APP_DB_PASSWORD"],
    "N8N_DB_NAME": os.environ["N8N_DB_NAME"],
    "N8N_DB_USER": os.environ["N8N_DB_USER"],
    "N8N_DB_PASSWORD": os.environ["N8N_DB_PASSWORD"],
}

output = []
seen = set()
for line in lines:
    if "=" in line and not line.lstrip().startswith("#"):
        key = line.split("=", 1)[0]
        if key in replacements:
            output.append(f"{key}={replacements[key]}")
            seen.add(key)
            continue
    output.append(line)

for key, value in replacements.items():
    if key not in seen:
        output.append(f"{key}={value}")

existing = {line.split("=", 1)[0] for line in output if "=" in line and not line.lstrip().startswith("#")}
for key, value in extra.items():
    if key not in existing:
        output.append(f"{key}={value}")

env_path.write_text("\n".join(output) + "\n")
PY

echo "Prepared ${ENV_FILE}"
echo "Review secrets in ${ENV_FILE} before deploying."
