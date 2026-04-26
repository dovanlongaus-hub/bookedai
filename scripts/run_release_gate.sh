#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PYTHON="$ROOT_DIR/.venv-backend/bin/python"
RUN_SEARCH_REPLAY_GATE="${RUN_SEARCH_REPLAY_GATE:-false}"

echo "[release-gate] production env example checksum"
"$ROOT_DIR/scripts/verify_env_production_example_checksum.sh"

echo "[release-gate] frontend build + smoke"
(
  cd "$FRONTEND_DIR"
  npm run test:playwright:smoke
  npm run test:playwright:tenant-smoke
)

if [[ ! -x "$BACKEND_PYTHON" ]]; then
  echo "[release-gate] missing backend virtualenv python at $BACKEND_PYTHON" >&2
  echo "[release-gate] expected setup: .venv-backend with backend requirements installed" >&2
  exit 1
fi

echo "[release-gate] backend contract + lifecycle tests"
"$BACKEND_PYTHON" -m unittest \
  backend.tests.test_api_v1_routes \
  backend.tests.test_lifecycle_ops_service \
  backend.tests.test_release_gate_security \
  backend.tests.test_chat_send_routes \
  backend.tests.test_telegram_webhook_routes \
  backend.tests.test_whatsapp_webhook_routes

echo "[release-gate] backend search eval pack"
"$BACKEND_PYTHON" "$ROOT_DIR/scripts/run_search_eval_pack.py"

if [[ "${RUN_SEARCH_REPLAY_GATE}" == "true" ]]; then
  echo "[release-gate] production-shaped search replay gate"
  python3 "$ROOT_DIR/scripts/run_search_replay_gate.py"
else
  echo "[release-gate] skipping production-shaped search replay gate (set RUN_SEARCH_REPLAY_GATE=true to enable)"
fi

if [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
  echo "[release-gate] backend migration state verification"
  "$ROOT_DIR/scripts/verify_backend_migration_state.sh"
else
  echo "[release-gate] skipping backend migration state verification (DATABASE_URL or psql missing)"
fi

echo "[release-gate] all checks passed"
