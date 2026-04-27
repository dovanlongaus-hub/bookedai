# Live rebuild and redeploy all completed

- Timestamp: 2026-04-27T00:09:48.479201+00:00
- Source: codex-live-deploy
- Category: deploy
- Status: completed

## Summary

Rebuilt and redeployed the full live BookedAI stack. Deploy completed, stack health passed at 2026-04-27T00:09:13Z, and live smoke returned 200 for API, public, product, portal, tenant, admin, pitch, beta, and bot health surfaces.

## Details

Operator request: rebuild and redeploy live all.

Action taken:

- Ran the approved live deploy entrypoint: `python3 scripts/telegram_workspace_ops.py deploy-live`.
- Production deploy rebuilt backend, beta-backend, web, and beta-web images.
- Production containers were recreated, proxy restarted, and the BookedAI Booking Intake n8n workflow was activated.

Verification:

- `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T00:09:13Z`.
- HTTP smoke returned `200` for `https://api.bookedai.au/api/health`, `https://bookedai.au`, `https://product.bookedai.au`, `https://portal.bookedai.au`, `https://tenant.bookedai.au`, `https://admin.bookedai.au`, `https://pitch.bookedai.au`, `https://beta.bookedai.au`, and `https://bot.bookedai.au/healthz`.
- Host Docker status showed BookedAI backend, beta-backend, web, beta-web, proxy, hermes, n8n, and OpenClaw services up.

Note:

- A non-BookedAI container named `optimistic_greider` remained unhealthy in `docker ps` and was not part of this BookedAI deploy scope.
