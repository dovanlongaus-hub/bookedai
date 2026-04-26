#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[tenant-smoke] tenant gateway outcome copy and email-code accessibility"
PLAYWRIGHT_SKIP_BUILD="${PLAYWRIGHT_SKIP_BUILD:-0}" \
  bash scripts/run_playwright_suite.sh legacy "tests/tenant-gateway.spec.ts"
