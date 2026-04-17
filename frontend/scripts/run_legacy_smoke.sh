#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

run_case() {
  local file="$1"
  local grep_pattern="$2"

  echo "[legacy-smoke] ${grep_pattern}"
  PLAYWRIGHT_SKIP_BUILD="${PLAYWRIGHT_SKIP_BUILD:-0}" \
    bash scripts/run_playwright_suite.sh legacy "${file}" --grep "${grep_pattern}"
}

run_case "tests/pricing-demo-flows.spec.ts" "pricing consultation success flow surfaces payment, calendar, and return states"
run_case "tests/pricing-demo-flows.spec.ts" "plan payment success banner renders after pricing return"
run_case "tests/pricing-demo-flows.spec.ts" "plan payment cancelled banner keeps retry messaging visible"
