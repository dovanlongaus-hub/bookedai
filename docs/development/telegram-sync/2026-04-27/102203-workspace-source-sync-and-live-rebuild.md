# Workspace Source Sync And Live Rebuild

## Summary

Committed the accumulated BookedAI workspace changes, pushed them to GitHub, merged them into `main`, rebuilt production images from merged main, and redeployed live.

## Details

- Created commit `6e36547` with 123 tracked source/docs/config/deploy changes.
- Pushed the commit to `fix/telegram-customer-webhook-secret-2026-04-27`.
- Opened and merged PR #4, `Sync live workspace updates`, into `main`.
- New `origin/main` head after merge: `84c3f9b`.
- Rebuilt production Docker images from merged `origin/main`:
  - `bookedai-backend`
  - `bookedai-beta-backend`
  - `bookedai-web`
  - `bookedai-beta-web`
  - `bookedai-hermes`
- Recreated/restarted the live `bookedai` app stack and proxy.
- Restarted Supabase from the workspace source after the DB container was down.
- Repaired/confirmed live app and n8n database roles/databases for `bookedai_app`, `n8n_app`, `bookedai`, and `n8n`.

## Verification

- Staged diff whitespace check passed before commit.
- Staged secret-pattern check passed before commit.
- Python syntax check passed for touched backend/operator Python entrypoints.
- Shell syntax check passed for deploy/operator shell scripts.
- Production frontend build completed inside Docker.
- Stack health passed at `2026-04-27T10:22:03Z`.
- Live probes returned `200` for:
  - `https://api.bookedai.au/api/health`
  - `https://bookedai.au/`
  - `https://product.bookedai.au/`
  - `https://bot.bookedai.au/healthz`
  - `https://n8n.bookedai.au/healthz`

## Known GitHub Scope Limitation

`.github/workflows/release-gate.yml` remains local only. GitHub rejected pushes containing that workflow file because the current OAuth token lacks the `workflow` scope. The file was intentionally excluded from the pushed commit so the rest of the source could sync and deploy.
