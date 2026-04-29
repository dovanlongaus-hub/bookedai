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
DOMAIN_CHESS="${DOMAIN_CHESS:-chess.bookedai.au}"
DOMAIN_AIMENTOR="${DOMAIN_AIMENTOR:-aimentor.bookedai.au}"
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
  "${DOMAIN_CHESS}"
  "${DOMAIN_AIMENTOR}"
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

DEPLOY_COMPOSE_PARALLEL_LIMIT="${DEPLOY_COMPOSE_PARALLEL_LIMIT:-1}"
export COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-${DEPLOY_COMPOSE_PARALLEL_LIMIT}}"

echo "Building production images with COMPOSE_PARALLEL_LIMIT=${COMPOSE_PARALLEL_LIMIT}."
docker compose -f docker-compose.prod.yml --env-file .env build backend beta-backend
docker compose -f docker-compose.prod.yml --env-file .env build web
docker compose -f docker-compose.prod.yml --env-file .env build beta-web

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
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_CHESS}([, ]|$)"; then
  NEEDS_CERT_UPDATE="true"
elif ! openssl x509 -in "${CERT_PATH}" -noout -text | grep -Eq "DNS:${DOMAIN_AIMENTOR}([, ]|$)"; then
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

# Remove any zombie containers left behind by an interrupted previous deploy.
# Docker auto-renames a recreate target to "<12-hex>_<original-name>" when the
# original name is still claimed by a stopped-but-not-removed container, and
# subsequent `compose up` calls fail with a name conflict against that zombie.
# Pattern is anchored on the 12-hex-prefix Docker uses for these renames so we
# only ever remove containers from a real interrupted deploy, never live ones.
ZOMBIE_BOOKEDAI_CONTAINERS="$(
  docker ps -a --format '{{.Names}}' \
    | grep -E '^[0-9a-f]{12}_bookedai-' || true
)"
if [[ -n "${ZOMBIE_BOOKEDAI_CONTAINERS}" ]]; then
  echo "Removing zombie containers from a prior interrupted deploy:" >&2
  echo "${ZOMBIE_BOOKEDAI_CONTAINERS}" >&2
  echo "${ZOMBIE_BOOKEDAI_CONTAINERS}" | xargs -r docker rm -f >/dev/null
fi

# `--remove-orphans` is now applied to the first attempt so deploys do not
# require the failure-path retry to clear services that have been removed
# from compose. The retry block stays as a safety net for unexpected races.
if ! docker compose -f docker-compose.prod.yml --env-file .env up -d --no-build --remove-orphans; then
  echo "Production compose up failed; retrying with full recreate..." >&2
  docker compose -f docker-compose.prod.yml --env-file .env ps >&2 || true
  docker compose -f docker-compose.prod.yml --env-file .env up -d --remove-orphans
  docker compose -f docker-compose.prod.yml --env-file .env up -d --no-build --remove-orphans
fi
docker compose -f docker-compose.prod.yml --env-file .env restart proxy

bash scripts/provision_n8n_workflows.sh

echo "Deployment completed."
echo "App: https://${DOMAIN_ROOT}"
echo "Beta: https://${DOMAIN_BETA}"
echo "Product: https://${DOMAIN_PRODUCT}"
echo "Demo: https://${DOMAIN_DEMO}"
echo "Chess: https://${DOMAIN_CHESS}"
echo "AI Mentor: https://${DOMAIN_AIMENTOR}"
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
