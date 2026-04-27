# OpenClaw and BookedAIRevenuebot full-host default enabled

- Timestamp: 2026-04-27T06:03:34.988806+00:00
- Source: telegram
- Category: DevOps/Live
- Status: closed

## Summary

OpenClaw and @Bookedairevenuebot now default to trusted full-host operator access: host_shell/openclaw_runtime_admin/full_project are granted to actor 8426853622, host-shell is enabled, and openclaw-cli runs root/privileged with host PID, /hostfs, and Docker socket.

## Details

Changed repo and live runtime posture from rootless break-glass to trusted full-host default per operator instruction. Updated scripts/telegram_workspace_ops.py defaults, deploy/openclaw/docker-compose.yml, deploy/openclaw/.env, env examples, checksum, README, project.md, MEMORY.md, OpenClaw docs, implementation progress, phase operating notes, and daily memory. Applied enable-openclaw-full-access to /home/dovanlong/.openclaw-bookedai-v3/openclaw.json and corrected the wrapper for OpenClaw v2026.4.15 by removing schema-invalid tools.exec.askFallback from openclaw.json while keeping askFallback=full in exec-approvals.json. Recreated OpenClaw compose. Verification: py_compile passed, compose config passed, env checksum passed, permission snapshot includes host_shell/openclaw_runtime_admin/full_project with host_shell_enabled=true, host-shell smoke returned /, gateway health returned live, openclaw-bookedai-cli is healthy and verified as user=0:0 privileged=true pid=host with /hostfs and Docker socket mounted. Telegram remains trusted-actor allowlist scoped, not open to every Telegram sender.
