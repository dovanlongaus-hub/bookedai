# Sprint 19 hardening merged and redeployed live

- Timestamp: 2026-04-26T15:46:09.754907+00:00
- Source: main@4dc9436
- Category: deploy
- Status: closed

## Summary

Merged the verified Sprint 19 hardening/review closeout to main and redeployed BookedAI live; release gate and post-deploy health checks passed. GitHub workflow creation remains blocked by missing workflow OAuth scope.

## Details

Commit 4dc9436 was pushed to main after the local release gate passed with RUN_SEARCH_REPLAY_GATE=false, frontend smoke lanes, tenant smoke, backend unittest 49 tests, and search eval 14/14. Live deploy ran through python3 scripts/telegram_workspace_ops.py deploy-live; backend, beta-backend, web, and beta-web rebuilt/recreated, proxy restarted, and n8n workflow activation succeeded. Post-deploy verification passed with bash scripts/healthcheck_stack.sh at 2026-04-26T15:45:24Z, api.bookedai.au /api/health OK, and bookedai.au, portal.bookedai.au, and tenant.bookedai.au returning HTTP 200. Note: .github/workflows/release-gate.yml could not be pushed because GitHub rejected workflow creation from the current OAuth token without workflow scope; the file remains local/untracked pending a token with workflow permission or manual GitHub setup.
