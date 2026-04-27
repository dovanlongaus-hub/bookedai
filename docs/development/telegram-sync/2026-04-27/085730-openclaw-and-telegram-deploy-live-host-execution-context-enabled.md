# OpenClaw and Telegram deploy-live host execution context enabled

- Timestamp: 2026-04-27T08:57:30.838538+00:00
- Source: telegram
- Category: operations
- Status: done

## Summary

OpenClaw and Telegram can now run full deploy-live through the VPS host context

## Details

Changed scripts/telegram_workspace_ops.py so deploy-live treats host users openclaw and telegram as trusted full deploy execution contexts and routes them through the VPS host-shell path from /home/dovanlong/BookedAI. Hardened scripts/deploy_live_host.sh so direct wrapper calls from a privileged OpenClaw runtime with /hostfs but no container-local Docker CLI self-reexec through nsenter into the real Docker host. Verified Python and shell syntax, permissions as both users showed trusted_host_deploy_user=true, deploy-live as telegram completed production rebuild/recreate and n8n activation, stack health passed at 2026-04-27T08:56:59Z, and API/public/OpenClaw probes returned HTTP 200.
