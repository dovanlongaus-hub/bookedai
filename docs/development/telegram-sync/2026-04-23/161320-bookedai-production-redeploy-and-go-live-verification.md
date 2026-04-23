# BookedAI production redeploy and go-live verification

- Timestamp: 2026-04-23T16:13:20.107879+00:00
- Source: telegram
- Category: deployment
- Status: completed

## Summary

Production redeploy completed successfully; live web/backend surfaces restarted, n8n workflow reactivated, and health checks passed.

## Details

Redeployed BookedAI production via python3 scripts/telegram_workspace_ops.py deploy-live from the server workspace. Pre-deploy frontend verification passed with npm --prefix frontend run build. The deploy rebuilt/restarted the live web and backend containers, restarted the nginx proxy cleanly, and reactivated existing n8n workflow stwMomWRq2qJoaTy. Post-deploy verification passed with scripts/healthcheck_stack.sh; bookedai.au, tenant.bookedai.au, admin.bookedai.au, pitch.bookedai.au, and bot.bookedai.au returned HTTP 200. The backend health endpoint confirmed healthy at https://api.bookedai.au/api/health.
