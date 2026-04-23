# MEMORY.md

## User And Workflow

- Primary operator: Aus Dvl
- Main working mode: direct execution with short explanations
- Telegram is an active coding surface for BookedAI work, not just notifications

## OpenClaw / Bot Runtime

- Bot name: `@Bookedairevenuebot`
- Workspace mount inside runtime: `/workspace/bookedai.au`
- Gateway health endpoint: `http://127.0.0.1:18789/healthz`
- Telegram webhook target: `https://api.bookedai.au/telegram-webhook`
- Preferred model path: `openai-codex/gpt-5.4`
- Elevated Telegram workspace actions now run through `python3 scripts/telegram_workspace_ops.py`
- Trusted Telegram actor ids come from `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS`
- Allowed elevated action scope comes from `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS`
- Full-server Telegram/OpenClaw host execution now uses `python3 scripts/telegram_workspace_ops.py host-shell --cwd / --command "..."`
- Live Telegram DM access is now allowlist-based for trusted actor `8426853622`, not pairing-gated
- `openclaw-cli` now auto-restarts through compose if it loses the first gateway connect race
- Host execution from the OpenClaw CLI container now enters the real VPS namespaces through `nsenter --target 1 ...`
- Current default trusted operator id remains `8426853622`

## Memory Policy

- Recent work belongs in `memory/YYYY-MM-DD.md`
- Long-term facts belong here
- Daily notes should stay compact and decision-oriented
- Avoid storing raw execution transcripts or oversized progress logs in daily memory
- After completing meaningful code work, summarize:
  - what changed
  - why it changed
  - any follow-up risk or TODO
- If implementation changes behavior or architecture, sync the relevant repo docs

## Documentation Sources Of Truth

- `project.md` is the single project-level source of truth
- `README.md` is the setup and operator guide derived from the current project state
- `DESIGN.md` is a supporting design/UX reference, not the top authority
- `docs/architecture/*`, `docs/development/*`, and `docs/users/*` must stay consistent with `project.md`

## Current Priority

- Keep Telegram-based coding reliable
- Preserve context between Telegram requests
- Keep project docs aligned with the actual code and deployment state
- Use `project.md` as the first document to consult and the first document to update when scope or direction changes
