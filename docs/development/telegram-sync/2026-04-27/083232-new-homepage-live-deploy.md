# New homepage live deploy

- Timestamp: 2026-04-27T08:32:32.428698+00:00
- Source: live-deploy
- Category: deployment
- Status: completed

## Summary

Deployed the new BookedAI homepage live and verified stack health plus homepage/API smoke checks.

## Details

Deployed through python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 deploy-live. The production backend, beta-backend, web, and beta-web containers were recreated, the proxy restarted, and the n8n booking workflow remained active. Verification passed with bash scripts/healthcheck_stack.sh at 2026-04-27T08:31:41Z, https://bookedai.au/ returned HTTP/2 200 with the expected BookedAI AI Revenue Engine title, https://api.bookedai.au/api/health returned 200, and the live web container bundle contains the new homepage conversational/revenue-engine copy.
