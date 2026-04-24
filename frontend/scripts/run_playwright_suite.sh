#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

MODE="${1:-legacy}"
shift || true

PORT="3100"
if [[ "${MODE}" == "live-read" ]]; then
  PORT="3101"
fi

export PLAYWRIGHT_PUBLIC_ASSISTANT_MODE="${MODE}"

if [[ "${MODE}" == "live-read" ]]; then
  export VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED=1
  export VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ=1
else
  export VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED=0
  export VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ=0
fi

# Caller already has a dev/preview server (e.g. docker compose frontend on :3000).
if [[ "${PLAYWRIGHT_EXTERNAL_SERVER:-}" == "1" ]]; then
  exec npx playwright test "$@"
fi

bash scripts/kill_playwright_preview.sh 3100 3101

if [[ "${PLAYWRIGHT_SKIP_BUILD:-0}" != "1" ]]; then
  npm run build
fi

bash scripts/kill_playwright_preview.sh 3100 3101

npx vite preview --host 127.0.0.1 --port "${PORT}" --strictPort &
PREVIEW_PID=$!

cleanup() {
  kill "${PREVIEW_PID}" >/dev/null 2>&1 || true
  wait "${PREVIEW_PID}" >/dev/null 2>&1 || true
  bash scripts/kill_playwright_preview.sh 3100 3101 >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

SERVER_URL="http://127.0.0.1:${PORT}"
for _ in $(seq 1 60); do
  if curl -fsS "${SERVER_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${SERVER_URL}" >/dev/null 2>&1; then
  echo "[playwright-suite] preview server did not become ready at ${SERVER_URL}" >&2
  exit 1
fi

npx playwright test "$@"
