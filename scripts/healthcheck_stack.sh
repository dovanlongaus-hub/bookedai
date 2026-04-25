#!/usr/bin/env bash

set -euo pipefail

ROOT_DOMAIN="${ROOT_DOMAIN:-bookedai.au}"
PITCH_DOMAIN="${PITCH_DOMAIN:-pitch.bookedai.au}"
API_DOMAIN="${API_DOMAIN:-api.bookedai.au}"
N8N_DOMAIN="${N8N_DOMAIN:-n8n.bookedai.au}"
SUPABASE_DOMAIN="${SUPABASE_DOMAIN:-supabase.bookedai.au}"

required_prod_services=(
  "proxy"
  "web"
  "backend"
  "n8n"
  "hermes"
  "beta-web"
  "beta-backend"
)

running_prod_services="$(sudo -n docker compose -f docker-compose.prod.yml ps --services --status running)"
for service in "${required_prod_services[@]}"; do
  if ! grep -Fxq "${service}" <<<"${running_prod_services}"; then
    echo "ERROR: missing running production service ${service}"
    exit 1
  fi
done

required_supabase_containers=(
  "supabase-db"
  "supabase-kong"
  "supabase-studio"
)

for name in "${required_supabase_containers[@]}"; do
  if ! sudo -n docker ps --format '{{.Names}}' | grep -Fxq "${name}"; then
    echo "ERROR: missing running container ${name}"
    exit 1
  fi
done

root_redirect_location="$(curl -fsSI "https://${ROOT_DOMAIN}" | awk 'BEGIN{IGNORECASE=1} /^location:/ {print $2}' | tr -d '\r' | tail -n 1)"
if [[ "${root_redirect_location}" != "https://${PITCH_DOMAIN}/" ]]; then
  echo "ERROR: ${ROOT_DOMAIN} did not redirect to https://${PITCH_DOMAIN}/ (got ${root_redirect_location:-<none>})"
  exit 1
fi
curl -fsS "https://${PITCH_DOMAIN}" >/dev/null
curl -fsS "https://${API_DOMAIN}/api/health" >/dev/null
curl -fsS "https://${N8N_DOMAIN}/healthz" >/dev/null

# Supabase should require auth at gateway level, so 401 is expected.
supabase_code="$(curl -s -o /dev/null -w '%{http_code}' "https://${SUPABASE_DOMAIN}")"
if [[ "${supabase_code}" != "401" && "${supabase_code}" != "200" ]]; then
  echo "ERROR: supabase returned unexpected status ${supabase_code}"
  exit 1
fi

echo "OK: stack health check passed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
