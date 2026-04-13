#!/usr/bin/env bash

set -euo pipefail

ROOT_DOMAIN="${ROOT_DOMAIN:-bookedai.au}"
API_DOMAIN="${API_DOMAIN:-api.bookedai.au}"
N8N_DOMAIN="${N8N_DOMAIN:-n8n.bookedai.au}"
SUPABASE_DOMAIN="${SUPABASE_DOMAIN:-supabase.bookedai.au}"

required_containers=(
  "bookedai-proxy-1"
  "bookedai-web-1"
  "bookedai-backend-1"
  "bookedai-n8n-1"
  "supabase-db"
  "supabase-kong"
  "supabase-studio"
)

for name in "${required_containers[@]}"; do
  if ! sudo -n docker ps --format '{{.Names}}' | grep -Fxq "${name}"; then
    echo "ERROR: missing running container ${name}"
    exit 1
  fi
done

curl -fsS "https://${ROOT_DOMAIN}" >/dev/null
curl -fsS "https://${API_DOMAIN}/api/health" >/dev/null
curl -fsS "https://${N8N_DOMAIN}/healthz" >/dev/null

# Supabase should require auth at gateway level, so 401 is expected.
supabase_code="$(curl -s -o /dev/null -w '%{http_code}' "https://${SUPABASE_DOMAIN}")"
if [[ "${supabase_code}" != "401" && "${supabase_code}" != "200" ]]; then
  echo "ERROR: supabase returned unexpected status ${supabase_code}"
  exit 1
fi

echo "OK: stack health check passed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
