# OpenClaw host-exec enabled and host live deploy completed

- Timestamp: 2026-04-27T09:55:53.179542+00:00
- Source: telegram
- Category: operations
- Status: done

## Summary

Added host-exec for sudo-capable OpenClaw host execution and deployed live through it

## Details

Added host-exec to scripts/telegram_workspace_ops.py as the explicit OpenClaw-friendly alias for full host-shell execution, gated by the existing host_shell permission scope. Verified Python compile, host-exec --command 'sudo -n id && sudo -n docker ps' as both Linux users openclaw and telegram, and then ran live deploy through host-exec --cwd /home/dovanlong/BookedAI --command 'bash scripts/deploy_live_host.sh'. Production deploy rebuilt backend/web/beta images, recreated containers, restarted proxy, and activated n8n. Stack health passed at 2026-04-27T09:54:52Z; API/public/product/OpenClaw probes returned HTTP 200.
