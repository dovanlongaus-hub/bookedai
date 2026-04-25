# Main deploy and full QA closeout for admin recovery

- Timestamp: 2026-04-25T03:59:04.551126+00:00
- Source: codex
- Category: change-summary
- Status: completed

## Summary

Pushed the admin routing/workspace recovery to origin/main, deployed live, and completed full QA with frontend typecheck, admin smoke, backend pytest, release gate, stack health, and live admin probes.

## Details

Final closeout for admin.bookedai.au: commit 71436df was pushed to origin/main and deployed via python3 scripts/telegram_workspace_ops.py deploy-live. Full QA passed before deploy: npm --prefix frontend exec tsc -- --noEmit, npm --prefix frontend run test:playwright:admin-smoke, .venv/bin/python -m pytest backend/tests -q with 256 passed, and bash scripts/run_release_gate.sh including frontend legacy/live-read/admin smoke, backend contract/lifecycle tests, and search eval pack. Post-deploy checks passed: bash scripts/healthcheck_stack.sh, https://admin.bookedai.au/ returned HTTP 200 with the refreshed bundle timestamp, https://admin.bookedai.au/api/health returned backend JSON, and a bad-password POST /api/admin/login returned backend 401 Invalid admin credentials instead of frontend nginx 405.
