#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PYTHON="$ROOT_DIR/.venv-backend/bin/python"

echo "[release-gate] frontend build + smoke"
(
  cd "$FRONTEND_DIR"
  npm run test:release-gate
)

if [[ ! -x "$BACKEND_PYTHON" ]]; then
  echo "[release-gate] missing backend virtualenv python at $BACKEND_PYTHON" >&2
  echo "[release-gate] expected setup: .venv-backend with backend requirements installed" >&2
  exit 1
fi

echo "[release-gate] backend contract + lifecycle tests"
"$BACKEND_PYTHON" -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service

echo "[release-gate] backend search eval pack"
"$BACKEND_PYTHON" "$ROOT_DIR/scripts/run_search_eval_pack.py"

echo "[release-gate] all checks passed"
