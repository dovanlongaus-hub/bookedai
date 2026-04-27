# Main PR merge, rebuild, and live redeploy

- Timestamp: 2026-04-27T10:11:43.473645+00:00
- Source: codex-cli
- Category: deploy
- Status: completed

## Summary

Merged PR #3 into main, rebuilt production images from merged main, redeployed live BookedAI, repaired app/n8n DB role/database state after Supabase recreation, and verified stack health plus live probes.

## Details

# Main PR Merge, Rebuild, And Live Redeploy

## Summary

Merged the only open PR into `main`, rebuilt the production backend/web/beta images from the merged `origin/main`, redeployed the live BookedAI stack, and verified live health.

## Details

- Merged PR #3, `Enforce Telegram secret-token on customer webhook + stabilize booking-assistant fallback`, into `main`.
- Confirmed there were no remaining open PRs targeting `main`.
- Reviewed the PR scope before merge: customer Telegram webhook secret-token enforcement, booking-assistant degraded fallback stabilization, supporting backend tests, and roadmap/frontend documentation updates.
- Built production Docker images for backend, beta-backend, web, and beta-web from merged main.
- Redeployed the live `bookedai` compose project and restarted the proxy.
- Repaired the database state after Supabase recreation by ensuring `bookedai_app`/`n8n_app` roles, `bookedai`/`n8n` databases, and schema grants matched the live `.env`.
- Verified stack health passed at `2026-04-27T10:10:20Z`.
- Live probes returned `200` for:
  - `https://api.bookedai.au/api/health`
  - `https://bookedai.au/`
  - `https://product.bookedai.au/`
  - `https://bot.bookedai.au/healthz`
  - `https://n8n.bookedai.au/healthz`

## Telegram Check

- Customer bot webhook remains set to `https://api.bookedai.au/api/webhooks/bookedai-telegram` with pending updates `0`.
- Operator bot webhook remains set to `https://api.bookedai.au/telegram-webhook` with no last error; it had one pending update during the check.
- Trusted operator actor `8426853622` still has deploy/live host-shell permissions.

## Notes

- The active IDE workspace had pre-existing local changes, so merge/deploy used a temporary clean worktree from `origin/main`; that worktree was removed after deployment to avoid leaving copied environment secrets in `/tmp`.
- `scripts/provision_n8n_workflows.sh` returned exit code `1` without output after the stack was live, but `https://n8n.bookedai.au/healthz` returned `200`.
