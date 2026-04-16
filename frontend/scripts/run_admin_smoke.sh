#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

run_case() {
  local file="$1"
  local grep_pattern="$2"

  echo "[admin-smoke] ${grep_pattern}"
  PLAYWRIGHT_SKIP_BUILD="${PLAYWRIGHT_SKIP_BUILD:-0}" \
    bash scripts/run_playwright_suite.sh legacy "${file}" --grep "${grep_pattern}"
}

run_case "tests/admin-prompt5-preview.spec.ts" "admin workspace deep-link opens reliability triage workspace directly"
run_case "tests/admin-session-regression.spec.ts" "admin refresh keeps stored session visible and logout returns to sign-in"
run_case "tests/admin-session-regression.spec.ts" "partner create expiry returns to sign-in and allows protected mutation retry after re-auth"
