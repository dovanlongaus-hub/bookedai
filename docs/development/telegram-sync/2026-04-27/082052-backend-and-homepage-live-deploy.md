# Backend and homepage live deploy

- Timestamp: 2026-04-27T08:20:52.440997+00:00
- Source: telegram
- Category: DevOps/Live
- Status: closed

## Summary

Backend and homepage/web bundle were redeployed live through the fixed Docker host-context deploy path; stack health, API health, and homepage smoke passed.

## Details

Preflight verification passed with backend py_compile for route/config/operator modules and frontend TypeScript. Deployed through python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 deploy-live. Production deploy rebuilt backend and beta-backend, rebuilt web and beta-web, recreated backend/web/beta containers, restarted proxy, and activated the n8n booking intake workflow. Post-deploy verification passed with bash scripts/healthcheck_stack.sh at 2026-04-27T08:20:21Z; https://api.bookedai.au/api/health returned 200 with backend ok; https://bookedai.au/ returned 200 with title BookedAI | The AI Revenue Engine for Service Businesses.
