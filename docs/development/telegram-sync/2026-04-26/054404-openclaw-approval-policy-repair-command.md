# OpenClaw approval policy repair command

- Timestamp: 2026-04-26T05:44:04.723467+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Added a repo-owned OpenClaw approval repair command for the allow-always/effective ask-always failure. The new fix-openclaw-approvals entrypoint aligns tools.exec.ask and host exec-approvals.json defaults to on-miss, preserving allowlist gating while making durable approvals valid again.

## Details

Implemented scripts/telegram_workspace_ops.py fix-openclaw-approvals for the OpenClaw error: Approval failed: GatewayRequestError: allow-always is unavailable because the effective policy requires approval every time. Official OpenClaw docs state allow-always is unavailable when effective exec ask mode is always, and that effective policy is the stricter merge of tools.exec plus the host exec-approvals.json defaults. The new command updates openclaw.json tools.exec.ask and exec-approvals.json defaults to on-miss, also repairing agent-level ask=always overrides. It creates timestamped backups unless --no-backup is supplied and supports --dry-run plus explicit --config/--approvals paths. Operator docs, project.md, implementation tracking, sprint plan, env examples, and OpenClaw compose defaults now include the openclaw_runtime_admin action scope and the repair workflow. Local verification passed with a temporary OpenClaw config/approval file, python3 -m py_compile, and git diff --check. Live apply still needs to run from the privileged OpenClaw CLI workspace because the default shell cannot read /home/dovanlong/.openclaw-bookedai-v3/openclaw.json.
