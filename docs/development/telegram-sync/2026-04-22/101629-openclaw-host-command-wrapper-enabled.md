# OpenClaw host-command wrapper enabled

- Timestamp: 2026-04-22T10:16:29.529502+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Added a safer host-command path for OpenClaw and Telegram operators, updated the live OpenClaw env to include host_command, and kept host access limited to an allowlisted sudo-backed maintenance surface instead of blanket server shell access.

## Details

Implemented a new host-level operator lane in scripts/telegram_workspace_ops.py. The new subcommand is host-command --command "...". It parses arguments without shell=True, refuses sudo in user input, only allows a checked-in program allowlist (apt, apt-get, docker, docker-compose, journalctl, service, systemctl, timedatectl, ufw), and runs through sudo -n automatically. Synced the new host_command permission across .env examples, deploy/openclaw/docker-compose.yml, README.md, TOOLS.md, project.md, docs/development/env-strategy.md, docs/development/ci-cd-deployment-runbook.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, and memory/2026-04-22.md. Updated the live deploy/openclaw/.env runtime file and recreated the OpenClaw stack so the current gateway/CLI pair inherit the expanded action set. Verified that host-command blocks bash -lc with a clear CLI error and successfully runs apt-get update through the wrapper.
