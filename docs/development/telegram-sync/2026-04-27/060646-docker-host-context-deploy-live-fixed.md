# Docker host-context deploy-live fixed

- Timestamp: 2026-04-27T06:06:46.073919+00:00
- Source: telegram
- Category: DevOps/Live
- Status: closed

## Summary

Fixed the remaining OpenClaw/Telegram deploy-live Docker host-context blocker and completed the requested live deploy on the VPS host.

## Details

The prior failure occurred because deploy_live_host.sh could still run inside a runtime without Docker CLI and stop with 'Live deploy requires the Docker host environment'. scripts/telegram_workspace_ops.py now resolves nsenter explicitly when /hostfs is mounted, including host-mounted nsenter fallbacks, and deploy-live falls back to the full-host host-shell lane when Docker is unavailable in the current runtime. Verified OpenClaw CLI has full trusted permissions, host_shell_enabled=true, /hostfs, Docker socket, and nsenter; inside CLI docker is absent but should_use_nsenter_host_exec resolves true. Ran the requested command on the VPS host: cd /home/dovanlong/BookedAI && bash scripts/deploy_live_host.sh. Deploy completed, backend/beta-backend/web/beta-web recreated, proxy restarted, n8n workflow activated. Stack health passed at 2026-04-27T06:05:59Z and live API health returned 200. OpenClaw gateway remains live and CLI remains healthy/root/privileged/host PID.
