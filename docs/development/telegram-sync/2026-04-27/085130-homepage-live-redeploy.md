# Homepage live redeploy

- Timestamp: 2026-04-27T08:51:30.238717+00:00
- Source: telegram
- Category: DevOps/Live
- Status: closed

## Summary

Homepage/web bundle was redeployed live through the fixed Telegram/OpenClaw host-context deploy path; homepage smoke and stack health passed.

## Details

Preflight frontend TypeScript passed with npm --prefix frontend exec tsc -- --noEmit. Deployed through python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 deploy-live. Production deploy rebuilt/recreated web and beta-web, recreated backend/beta-backend as part of the current deploy wrapper, restarted proxy, and activated the n8n booking intake workflow. Post-deploy verification passed with bash scripts/healthcheck_stack.sh at 2026-04-27T08:51:01Z; https://bookedai.au/ returned 200 with title BookedAI | The AI Revenue Engine for Service Businesses; backend health also returned 200.
