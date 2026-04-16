#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"
SUPABASE_ENV_FILE="${PROJECT_DIR}/supabase/.env"

DOMAIN_BETA="${DOMAIN_BETA:-beta.bookedai.au}"

cd "${PROJECT_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Update secrets in ${ENV_FILE} and rerun beta deploy."
  exit 1
fi

if [[ ! -f "${SUPABASE_ENV_FILE}" ]]; then
  bash scripts/prepare_supabase_env.sh
  echo "Prepared ${SUPABASE_ENV_FILE}. Review it and rerun beta deploy."
  exit 1
fi

bash scripts/sync_app_env_from_supabase.sh

mkdir -p deploy/certbot/www

if docker info >/dev/null 2>&1; then
  DOCKER_CMD=(docker)
else
  DOCKER_CMD=(sudo docker)
fi

"${DOCKER_CMD[@]}" network create bookedai_internal >/dev/null 2>&1 || true
"${DOCKER_CMD[@]}" compose -f docker-compose.prod.yml --env-file .env build beta-web beta-backend
"${DOCKER_CMD[@]}" compose -f docker-compose.prod.yml --env-file .env up -d --no-deps beta-web beta-backend
"${DOCKER_CMD[@]}" compose -f docker-compose.prod.yml --env-file .env restart proxy

echo "Beta deployment completed."
echo "Beta app: https://${DOMAIN_BETA}"
echo "Beta API health: https://${DOMAIN_BETA}/api/health"
echo "Note: beta runtime is isolated from production services, but some shared data integrations may still remain until full staging isolation is completed."
