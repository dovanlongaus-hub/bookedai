#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"
SUPABASE_ENV_FILE="${PROJECT_DIR}/supabase/.env"

DOMAIN_ROOT="${DOMAIN_ROOT:-bookedai.au}"
DOMAIN_WWW="${DOMAIN_WWW:-www.bookedai.au}"
DOMAIN_API="${DOMAIN_API:-api.bookedai.au}"
DOMAIN_ADMIN="${DOMAIN_ADMIN:-admin.bookedai.au}"
DOMAIN_BETA="${DOMAIN_BETA:-beta.bookedai.au}"
DOMAIN_PRODUCT="${DOMAIN_PRODUCT:-product.bookedai.au}"
DOMAIN_DEMO="${DOMAIN_DEMO:-demo.bookedai.au}"
DOMAIN_FUTURESWIM="${DOMAIN_FUTURESWIM:-futureswim.bookedai.au}"
DOMAIN_PORTAL="${DOMAIN_PORTAL:-portal.bookedai.au}"
DOMAIN_TENANT="${DOMAIN_TENANT:-tenant.bookedai.au}"
DOMAIN_PITCH="${DOMAIN_PITCH:-pitch.bookedai.au}"
DOMAIN_N8N="${DOMAIN_N8N:-n8n.bookedai.au}"
DOMAIN_SUPABASE="${DOMAIN_SUPABASE:-supabase.bookedai.au}"
DOMAIN_HERMES="${DOMAIN_HERMES:-hermes.bookedai.au}"
DOMAIN_UPLOAD="${DOMAIN_UPLOAD:-upload.bookedai.au}"
DOMAIN_CALENDAR="${DOMAIN_CALENDAR:-calendar.bookedai.au}"
DOMAIN_BOT="${DOMAIN_BOT:-bot.bookedai.au}"
EMAIL="${LETSENCRYPT_EMAIL:-info@bookedai.au}"

CERT_DOMAINS=(
  "${DOMAIN_ROOT}"
  "${DOMAIN_WWW}"
  "${DOMAIN_API}"
  "${DOMAIN_ADMIN}"
  "${DOMAIN_BETA}"
  "${DOMAIN_PRODUCT}"
  "${DOMAIN_DEMO}"
  "${DOMAIN_FUTURESWIM}"
  "${DOMAIN_PORTAL}"
  "${DOMAIN_TENANT}"
  "${DOMAIN_PITCH}"
  "${DOMAIN_N8N}"
  "${DOMAIN_SUPABASE}"
  "${DOMAIN_HERMES}"
  "${DOMAIN_CALENDAR}"
  "${DOMAIN_BOT}"
)

if [[ -n "${DOMAIN_UPLOAD}" ]] && getent ahosts "${DOMAIN_UPLOAD}" >/dev/null 2>&1; then
  CERT_DOMAINS+=("${DOMAIN_UPLOAD}")
  CHECK_UPLOAD_CERT="true"
else
  CHECK_UPLOAD_CERT="false"
fi

cd "${PROJECT_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Update secrets in ${ENV_FILE} and rerun."
  exit 1
fi

if [[ ! -f "${SUPABASE_ENV_FILE}" ]]; then
  bash scripts/prepare_supabase_env.sh
  echo "Prepared ${SUPABASE_ENV_FILE}. Review it and rerun deployment."
  exit 1
fi

bash scripts/sync_app_env_from_supabase.sh

mkdir -p deploy/certbot/www
docker network create bookedai_internal >/dev/null 2>&1 || true

docker compose -f docker-compose.prod.yml --env-file .env build web backend beta-web beta-backend

CERT_PATH="/etc/letsencrypt/live/${DOMAIN_ROOT}/fullchain.pem"
NEEDS_CERT_UPDATE="false"
if [[ ! -f "${CERT_PATH}" ]]; then
  NEEDS_CERT_UPDATE="true"
elif [[ "${CHECK_UPLOAD_CERT}" == "true" ]] && ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_UPLOAD}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_ADMIN}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_BETA}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_PRODUCT}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_DEMO}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_FUTURESWIM}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_PORTAL}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_TENANT}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_PITCH}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_HERMES}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_CALENDAR}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_BOT}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
fi

if [[ "${NEEDS_CERT_UPDATE}" == "true" ]]; then
  docker compose -f docker-compose.prod.yml --env-file .env stop proxy 2>/dev/null || true
  if ss -ltn "( sport = :80 )" | grep -q ":80"; then
    echo "Port 80 is in use. Stop the service using port 80, then rerun deploy."
    exit 1
  fi
  certbot certonly \
    --standalone \
    --preferred-challenges http \
    --cert-name "${DOMAIN_ROOT}" \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive \
    $(printf -- '-d %q ' "${CERT_DOMAINS[@]}")
fi

docker compose \
  -f supabase/docker-compose.yml \
  -f supabase/docker-compose.bookedai.yml \
  --env-file "${SUPABASE_ENV_FILE}" \
  up -d

docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml --env-file .env restart proxy

bash scripts/provision_n8n_workflows.sh

echo "Deployment completed."
echo "App: https://${DOMAIN_ROOT}"
echo "Beta: https://${DOMAIN_BETA}"
echo "Product: https://${DOMAIN_PRODUCT}"
echo "Demo: https://${DOMAIN_DEMO}"
echo "Portal: https://${DOMAIN_PORTAL}"
echo "Tenant: https://${DOMAIN_TENANT}"
echo "Pitch: https://${DOMAIN_PITCH}"
echo "Admin: https://${DOMAIN_ADMIN}"
echo "API: https://${DOMAIN_API}"
echo "n8n: https://${DOMAIN_N8N}"
echo "Supabase: https://${DOMAIN_SUPABASE}"
echo "Hermes: https://${DOMAIN_HERMES}"
echo "Uploads: https://${DOMAIN_UPLOAD}"
echo "Calendar redirect: https://${DOMAIN_CALENDAR}"
echo "OpenClaw Control UI: https://${DOMAIN_BOT}"
