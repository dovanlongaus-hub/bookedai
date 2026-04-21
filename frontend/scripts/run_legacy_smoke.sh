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

run_case "tests/public-homepage-responsive.spec.ts" "desktop keeps the opening screen clean and search-first"
run_case "tests/public-homepage-responsive.spec.ts" "mobile keeps search and actions compact like a Google-style shell"
