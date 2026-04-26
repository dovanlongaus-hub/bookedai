# OpenClaw full webchat Telegram access command

- Timestamp: 2026-04-26T05:47:37.655277+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Added enable-openclaw-full-access for the operator-requested full OpenClaw posture from bot.bookedai.au webchat and trusted Telegram. It sets exec to gateway/full/off, mirrors host approval defaults to full/off, enables elevated full, allows webchat from *, and keeps Telegram scoped to trusted user ids unless --telegram-open is explicitly passed.

## Details

Implemented scripts/telegram_workspace_ops.py enable-openclaw-full-access. The command updates OpenClaw runtime config and host exec-approvals state together: tools.exec.host=gateway, tools.exec.security=full, tools.exec.ask=off, tools.exec.askFallback=full, tools.elevated.enabled=true, tools.elevated.allowFrom.webchat=["*"], tools.elevated.allowFrom.telegram=<trusted ids>, agents.defaults.elevatedDefault=full, channels.telegram.dmPolicy=allowlist, and channels.telegram.allowFrom=<trusted ids>. It also updates exec-approvals.json defaults and agent overrides to security=full, ask=off, askFallback=full so host exec no longer prompts. Telegram remains scoped to BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS by default, with --telegram-open as the explicit opt-in for a public Telegram control surface. Docs updated in README.md, deploy/openclaw/README.md, project.md, implementation-progress, next-phase plan, current sprint execution plan, and memory. Verification passed with a temporary OpenClaw config/approvals fixture, command help, python3 -m py_compile, and git diff --check. Live apply still needs to be run from the privileged OpenClaw CLI workspace because the default shell cannot access the live OpenClaw config directory.
