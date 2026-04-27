# Sprint 19 P0-8 OpenClaw operator boundary hardened

- Timestamp: 2026-04-26T16:24:33.575223+00:00
- Source: codex
- Category: change-summary
- Status: submitted

## Summary

Repo-side Sprint 19 P0-8 is closed: OpenClaw CLI is rootless by default, hostfs/Docker socket mounts are removed from default compose, full host/runtime-admin Telegram actions are no longer default, and host-shell now requires BOOKEDAI_ENABLE_HOST_SHELL=1.

## Details

Closed the repo-side OpenClaw operator boundary patch for Sprint 19 P0-8. deploy/openclaw/docker-compose.yml now runs openclaw-cli as OPENCLAW_CLI_USER=1000:1000 by default and removes privileged, pid: host, hostfs, and Docker socket mounts. deploy/openclaw/.env.example and compose defaults now exclude host_shell, openclaw_runtime_admin, and full_project from BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS. scripts/telegram_workspace_ops.py now blocks host-shell unless BOOKEDAI_ENABLE_HOST_SHELL=1 is explicitly set for a break-glass session, while permissions output exposes host_shell_enabled for operator visibility. Phase 0 and Sprint 1 metadata were also updated to match the 2026-04-26 master roadmap done-baseline status. Verification passed with python3 -m py_compile scripts/telegram_workspace_ops.py, host-shell negative gate, permissions snapshot, docker compose config, bash -n scripts, and git diff --check. Live OpenClaw compose recreation plus operator smoke remains the carried follow-up before the running VPS environment is fully green.
