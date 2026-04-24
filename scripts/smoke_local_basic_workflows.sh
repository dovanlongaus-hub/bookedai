#!/usr/bin/env bash
# Quick HTTP checks for local Docker-style stacks (backend + OpenClaw bridge).
# Run from repo root with defaults, or override URLs for your environment.
#
#   bash scripts/smoke_local_basic_workflows.sh
#   BACKEND_BASE=http://127.0.0.1:8001 BRIDGE_BASE=http://127.0.0.1:18810 bash scripts/smoke_local_basic_workflows.sh

set -euo pipefail

BACKEND_BASE="${BACKEND_BASE:-http://127.0.0.1:8001}"
BRIDGE_BASE="${BRIDGE_BASE:-http://127.0.0.1:18810}"

echo "==> Backend health ${BACKEND_BASE}/api/health"
curl -fsS "${BACKEND_BASE}/api/health" | tee /dev/null
echo

echo "==> Bridge healthz ${BRIDGE_BASE}/healthz"
health_json="$(curl -fsS "${BRIDGE_BASE}/healthz")"
echo "${health_json}"
if ! echo "${health_json}" | grep -q 'public_upstream'; then
  echo "ERROR: healthz missing public_upstream (rebuild bridge image?)"
  exit 1
fi

echo "==> Bridge public catalog ${BRIDGE_BASE}/public/booking-assistant/catalog"
pub_code="$(curl -sS -o /dev/null -w '%{http_code}' "${BRIDGE_BASE}/public/booking-assistant/catalog")"
if [[ "${pub_code}" != "200" ]]; then
  echo "ERROR: public catalog expected 200, got ${pub_code}"
  exit 1
fi
echo "HTTP ${pub_code}"
echo

echo "==> Bridge internal path rejects missing token (expect 401)"
code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${BRIDGE_BASE}/bookedai/booking/chat/sessions/start" \
  -H 'Content-Type: application/json' \
  -d '{"channel":"embedded_widget","actor_context":{"channel":"embedded_widget"}}')"
if [[ "${code}" != "401" ]]; then
  echo "ERROR: expected 401 without bridge token, got ${code}"
  exit 1
fi

if [[ "${SKIP_BACKEND_CATALOG_COMPARE:-0}" != "1" ]]; then
  echo "==> Backend direct catalog ${BACKEND_BASE}/api/booking-assistant/catalog"
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' "${BACKEND_BASE}/api/booking-assistant/catalog")"
  if [[ "${api_code}" != "200" ]]; then
    echo "ERROR: backend catalog expected 200, got ${api_code}"
    exit 1
  fi
  echo "HTTP ${api_code}"
  echo
fi

echo "OK: basic workflow smoke passed ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
