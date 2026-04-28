#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

grep_pattern="desktop keeps the business-owner positioning and key CTA clear|mobile keeps the business-owner CTA stack clear and usable|renders an enterprise booking command center and submits reschedule|keeps the portal layout inside the mobile viewport"

echo "[legacy-smoke] ${grep_pattern}"
PLAYWRIGHT_SKIP_BUILD="${PLAYWRIGHT_SKIP_BUILD:-0}" \
  bash scripts/run_playwright_suite.sh legacy \
    "tests/public-homepage-responsive.spec.ts" \
    "tests/portal-enterprise-workspace.spec.ts" \
    --grep "${grep_pattern}" \
    --workers=1
