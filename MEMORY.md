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
- OpenClaw host shell is break-glass only in repo defaults: `BOOKEDAI_ENABLE_HOST_SHELL=1` is required, root/full-host/Docker-socket compose access is removed from the default CLI posture, and `host_shell`/`openclaw_runtime_admin`/`full_project` are not default Telegram actions
- Live Telegram DM access is now allowlist-based for trusted actor `8426853622`, not pairing-gated
- `openclaw-cli` now auto-restarts through compose if it loses the first gateway connect race
- Host execution from the OpenClaw CLI container now enters the real VPS namespaces through `nsenter --target 1 ...`
- Current default trusted operator id remains `8426853622`
- Near-term WhatsApp customer-care path uses `WHATSAPP_PROVIDER=evolution` through the Evolution API personal WhatsApp QR-session bridge at `https://waba.bookedai.au` and backend webhook `/api/webhooks/evolution` while WhatsApp Business/Meta verification is pending

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
- Latest Sprint 19 security closeouts: P0-5 tenant validator is live; P0-4 idempotency code and DB evidence indexes are live, with Telegram UAT chat-id proof/evidence drawer carried
- Latest Phase 17 data closeout: P1-9 Future Swim Miranda catalog URL now points to `https://futureswim.com.au/locations/`
- Latest Phase 17 portal closeout: FX-7 is closed live; portal booking links from `booking_reference`, `bookingReference`, `ref`, or hash are canonicalized back to one `booking_reference` URL after load, with Playwright coverage and live `portal.bookedai.au` smoke for camelCase, hash, and conflict cases
