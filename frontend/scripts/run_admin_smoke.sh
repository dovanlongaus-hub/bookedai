#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

grep_pattern="admin workspace deep-link opens reliability triage workspace directly|admin refresh keeps stored session visible and logout returns to sign-in|partner create expiry returns to sign-in and allows protected mutation retry after re-auth|trusted workspace-settings CTA"

echo "[admin-smoke] ${grep_pattern}"
PLAYWRIGHT_SKIP_BUILD="${PLAYWRIGHT_SKIP_BUILD:-0}" \
  bash scripts/run_playwright_suite.sh legacy \
    "tests/admin-prompt5-preview.spec.ts" \
    "tests/admin-session-regression.spec.ts" \
    "tests/admin-workspace-upgrade.spec.ts" \
    --grep "${grep_pattern}" \
    --workers=1
