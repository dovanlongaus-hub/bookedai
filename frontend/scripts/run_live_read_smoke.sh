#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

run_case() {
  local file="$1"
  local grep_pattern="$2"

  echo "[live-read-smoke] ${grep_pattern}"
  PLAYWRIGHT_SKIP_BUILD=0 bash scripts/run_playwright_suite.sh live-read "${file}" --grep "${grep_pattern}"
}

run_case "tests/public-booking-assistant-live-read.spec.ts" "booking submit still uses legacy session as the authoritative write when live-read is enabled"
