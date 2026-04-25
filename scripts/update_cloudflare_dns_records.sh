#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"
CONFIGURE_SCRIPT="${PROJECT_DIR}/scripts/configure_cloudflare_dns.sh"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

if [[ ! -f "${CONFIGURE_SCRIPT}" ]]; then
  echo "Missing script: ${CONFIGURE_SCRIPT}"
  exit 1
fi

AUTO_DNS_IPV4="${CLOUDFLARE_AUTO_DNS_IPV4:-${1:-}}"
AUTO_DNS_RECORDS="${CLOUDFLARE_AUTO_DNS_RECORDS:-bookedai.au,www.bookedai.au,api.bookedai.au,admin.bookedai.au,beta.bookedai.au,product.bookedai.au,demo.bookedai.au,futureswim.bookedai.au,chess.bookedai.au,ai.longcare.au,portal.bookedai.au,tenant.bookedai.au,pitch.bookedai.au,n8n.bookedai.au,supabase.bookedai.au,hermes.bookedai.au,upload.bookedai.au,calendar.bookedai.au,bot.bookedai.au}"
PROXIED_DNS_RECORDS="${CLOUDFLARE_AUTO_DNS_PROXIED_RECORDS:-bookedai.au,www.bookedai.au,api.bookedai.au,admin.bookedai.au,beta.bookedai.au,product.bookedai.au,demo.bookedai.au,futureswim.bookedai.au,chess.bookedai.au,ai.longcare.au,portal.bookedai.au,tenant.bookedai.au,pitch.bookedai.au,n8n.bookedai.au,supabase.bookedai.au,hermes.bookedai.au,calendar.bookedai.au,bot.bookedai.au}"

IFS=',' read -r -a records <<<"${AUTO_DNS_RECORDS}"
IFS=',' read -r -a proxied_records <<<"${PROXIED_DNS_RECORDS}"

trim() {
  printf '%s' "$1" | xargs
}

is_proxied_record() {
  local record="$1"
  local proxied_record

  for proxied_record in "${proxied_records[@]}"; do
    if [[ "$(trim "${proxied_record}")" == "${record}" ]]; then
      return 0
    fi
  done

  return 1
}

for record in "${records[@]}"; do
  record="$(trim "${record}")"
  if [[ -z "${record}" ]]; then
    continue
  fi

  proxied="false"
  if is_proxied_record "${record}"; then
    proxied="true"
  fi

  bash "${CONFIGURE_SCRIPT}" "${record}" "${AUTO_DNS_IPV4}" "${proxied}"
done
