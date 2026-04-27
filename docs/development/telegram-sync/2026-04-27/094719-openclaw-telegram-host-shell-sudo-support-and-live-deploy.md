# OpenClaw Telegram host-shell sudo support and live deploy

- Timestamp: 2026-04-27T09:47:19.255507+00:00
- Source: telegram
- Category: operations
- Status: done

## Summary

Enabled sudo-capable host-shell execution for OpenClaw/Telegram and deployed live

## Details

Hardened scripts/telegram_workspace_ops.py host execution so non-root runtimes with nsenter first try direct host namespace execution, then fall back to sudo -n nsenter if direct nsenter is denied. Commands executed after entering host context can use host sudo, so trusted OpenClaw/Telegram sessions can run sudo host repair and deploy commands such as sudo -n docker ps under the existing openclaw/telegram sudoers posture. Verified Python compile, host-shell with sudo as Linux users openclaw and telegram, and deploy-live. Live deploy rebuilt backend/web/beta images, recreated containers, restarted proxy, activated n8n workflow, stack health passed at 2026-04-27T09:46:28Z, and API/public/product/OpenClaw probes returned HTTP 200.
