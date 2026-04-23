# OpenClaw Telegram host deploy fix

- Timestamp: 2026-04-23T14:47:31.799708+00:00
- Source: telegram
- Category: ops-fix
- Status: completed

## Summary

Fixed Telegram/OpenClaw deploy-live so cd /workspace/bookedai.au && python3 scripts/telegram_workspace_ops.py deploy-live enters the VPS host namespace and completes live deployment.

## Details

Root cause: deploy-live was authorized but still executed scripts/deploy_live_host.sh inside the privileged OpenClaw CLI container, where Docker host commands were not resolved as the VPS host environment. Change: scripts/telegram_workspace_ops.py now detects the OpenClaw host-exec environment via /hostfs plus nsenter and routes deploy-live through the same host namespace path as host-shell, resolving the host repo root to /home/dovanlong/BookedAI unless BOOKEDAI_HOST_REPO_DIR overrides it. Verification: ran the exact OpenClaw container path with trusted actor 8426853622: cd /workspace/bookedai.au && python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 deploy-live. The command rebuilt and restarted the live stack, restarted proxy, activated n8n workflow stwMomWRq2qJoaTy, and ended with Deployment completed.
