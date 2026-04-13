#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"
SUPABASE_ENV_FILE="${PROJECT_DIR}/supabase/.env"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

apply_sysctl() {
  sysctl -w net.ipv4.ip_forward=1 >/dev/null
  sysctl -w net.ipv4.conf.all.rp_filter=0 >/dev/null
  sysctl -w net.ipv4.conf.default.rp_filter=0 >/dev/null
  if [[ -e /proc/sys/net/ipv4/conf/ens4/rp_filter ]]; then
    sysctl -w net.ipv4.conf.ens4.rp_filter=0 >/dev/null
  fi
}

wait_for_docker() {
  local retries=30
  until docker info >/dev/null 2>&1; do
    retries=$((retries - 1))
    if [[ "${retries}" -le 0 ]]; then
      echo "Docker is not ready."
      exit 1
    fi
    sleep 2
  done
}

cd "${PROJECT_DIR}"

apply_sysctl
wait_for_docker

docker network create bookedai_internal >/dev/null 2>&1 || true

if [[ -f "${SUPABASE_ENV_FILE}" ]]; then
  docker compose \
    -f supabase/docker-compose.yml \
    -f supabase/docker-compose.bookedai.yml \
    --env-file "${SUPABASE_ENV_FILE}" \
    up -d
fi

docker compose -f docker-compose.prod.yml --env-file .env up -d
docker compose -f docker-compose.prod.yml --env-file .env restart proxy

if [[ -x "${PROJECT_DIR}/scripts/update_cloudflare_dns_records.sh" ]]; then
  "${PROJECT_DIR}/scripts/update_cloudflare_dns_records.sh"
fi

echo "BookedAI boot reconciliation completed."
