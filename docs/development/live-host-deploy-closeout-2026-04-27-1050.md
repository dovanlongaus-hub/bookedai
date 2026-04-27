# Live Host Deploy Closeout - 2026-04-27 10:50 UTC

## Summary

The live BookedAI host deploy completed successfully from `/home/dovanlong/BookedAI` using `bash scripts/deploy_live_host.sh`. Production backend, beta backend, web, and beta web images were rebuilt and the live stack is healthy.

## What Ran

- Ran `bash scripts/deploy_live_host.sh`.
- Synced `.env` from `supabase/.env`.
- Rebuilt `bookedai-backend`, `bookedai-beta-backend`, `bookedai-web`, and `bookedai-beta-web`.
- Recreated production containers and restarted the proxy.
- Reused and activated the existing n8n workflow `BookedAI Booking Intake` (`stwMomWRq2qJoaTy`).

## Deploy Note

The first production compose recreate hit a transient Docker race: backend container removal was already in progress. The deploy script retried with orphan cleanup, recovered, and completed. Afterward, the backend service was force-recreated without rebuild to normalize the container name back to `bookedai-backend-1`, then the proxy was restarted.

## Verification

- `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T10:50:13Z`.
- HTTP smoke returned `200` for:
  - `https://api.bookedai.au/api/health`
  - `https://bookedai.au`
  - `https://product.bookedai.au`
  - `https://portal.bookedai.au`
  - `https://admin.bookedai.au`
  - `https://bot.bookedai.au/healthz`
  - `https://n8n.bookedai.au/healthz`
- Compose state shows `bookedai-backend-1`, `bookedai-beta-backend-1`, `bookedai-web-1`, `bookedai-beta-web-1`, `bookedai-proxy-1`, `bookedai-n8n-1`, and `bookedai-hermes-1` running.
