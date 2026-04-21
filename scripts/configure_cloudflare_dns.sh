#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"

detect_public_ipv4() {
  local candidates=(
    "https://api.ipify.org"
    "https://ipv4.icanhazip.com"
    "https://ifconfig.me/ip"
  )
  local candidate
  local response

  for candidate in "${candidates[@]}"; do
    response="$(curl -4fsS --max-time 10 "${candidate}" 2>/dev/null | tr -d '[:space:]' || true)"
    if [[ "${response}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
      printf '%s\n' "${response}"
      return 0
    fi
  done

  return 1
}

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is required."
  exit 1
fi

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  echo "CLOUDFLARE_ZONE_ID is required."
  exit 1
fi

NAME="${1:-}"
IPV4="${2:-}"
PROXIED="${3:-false}"
TTL="${TTL:-120}"

if [[ -z "${NAME}" ]]; then
  echo "Usage: bash scripts/configure_cloudflare_dns.sh <record-name> [ipv4] [proxied]"
  echo "Example: bash scripts/configure_cloudflare_dns.sh upload.bookedai.au 34.151.154.204 false"
  exit 1
fi

if [[ -z "${IPV4}" ]]; then
  IPV4="$(detect_public_ipv4 || true)"
fi

if [[ -z "${IPV4}" ]]; then
  echo "IPv4 address is required either as arg 2 or detectable from the current machine."
  exit 1
fi

auth_header="Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
json_header="Content-Type: application/json"

lookup_response="$(curl -sS \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=A&name=${NAME}" \
  -H "${auth_header}" \
  -H "${json_header}")"

record_id="$(printf '%s' "${lookup_response}" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data["result"][0]["id"] if data["result"] else "")')"

payload="$(python3 - <<PY
import json
print(json.dumps({
    "type": "A",
    "name": "${NAME}",
    "content": "${IPV4}",
    "ttl": ${TTL},
    "proxied": "${PROXIED}".lower() == "true",
}))
PY
)"

if [[ -n "${record_id}" ]]; then
  response="$(curl -sS -X PUT \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record_id}" \
    -H "${auth_header}" \
    -H "${json_header}" \
    --data "${payload}")"
else
  response="$(curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records" \
    -H "${auth_header}" \
    -H "${json_header}" \
    --data "${payload}")"
fi

success="$(printf '%s' "${response}" | python3 -c 'import json,sys; print(str(json.load(sys.stdin).get("success", False)).lower())')"

if [[ "${success}" != "true" ]]; then
  printf '%s\n' "${response}"
  exit 1
fi

python3 - "${response}" <<'PY'
import json
import sys

data = json.loads(sys.argv[1])["result"]
print(f"Configured DNS: {data['name']} -> {data['content']} (proxied={data['proxied']})")
PY
