#!/usr/bin/env bash
# Chained Playwright checks for core public + bridge workflows.
# Expects a running UI (e.g. docker compose frontend on PLAYWRIGHT_BASE_URL) and bridge on PLAYWRIGHT_BRIDGE_URL.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

export PLAYWRIGHT_EXTERNAL_SERVER=1
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3000}"
export PLAYWRIGHT_BRIDGE_URL="${PLAYWRIGHT_BRIDGE_URL:-http://127.0.0.1:18810}"
export PLAYWRIGHT_BRIDGE_TOKEN="${PLAYWRIGHT_BRIDGE_TOKEN:-bookedai-openclaw-bridge-dummy}"

echo "[basic-workflows] example orchestration (homepage shell + bridge + public catalog proxy)"
bash scripts/run_playwright_suite.sh legacy tests/example-orchestration-flows.spec.ts

echo "[basic-workflows] OK (for full UI smoke incl. homepage responsive, run: npm run test:playwright:smoke)"
