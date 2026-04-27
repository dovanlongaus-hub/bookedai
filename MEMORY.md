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
- OpenClaw host shell is now a trusted-operator full-host default by latest operator instruction: `BOOKEDAI_ENABLE_HOST_SHELL=1`, `host_shell`, `openclaw_runtime_admin`, and `full_project` are in the default Telegram action vocabulary, and `openclaw-cli` runs as root with privileged host PID, `/hostfs`, and Docker socket access
- Host Linux users `openclaw` and `telegram` are trusted root operators on the VPS: both are members of `sudo` and `docker`, and `/etc/sudoers.d/99-bookedai-full-root-users` grants `NOPASSWD:ALL`
- Live OpenClaw v3 runtime was recreated with this posture on `2026-04-27`; `openclaw-bookedai-cli` verified as `user=0:0`, `privileged=true`, `pid=host`, `/hostfs` + Docker socket mounted, gateway health live, and CLI health healthy
- Live Telegram DM access is now allowlist-based for trusted actor `8426853622`, not pairing-gated
- `openclaw-cli` now auto-restarts through compose if it loses the first gateway connect race
- Host execution from the OpenClaw CLI container now enters the real VPS namespaces through `nsenter --target 1 ...`
- Current default trusted operator id remains `8426853622`
- Near-term WhatsApp customer-care path uses `WHATSAPP_PROVIDER=evolution` through the Evolution API personal WhatsApp QR-session bridge at `https://waba.bookedai.au` and backend webhook `/api/webhooks/evolution` while WhatsApp Business/Meta verification is pending
- Current BookedAI-managed email sender/support identity is `info@bookedai.au`; root `.env`, backend defaults, and Docker dev/prod compose fallbacks should keep booking/customer/partner outbound email on that mailbox rather than tenant-specific provider mailboxes. As of `2026-04-27`, SMTP auth with the deployed `info@bookedai.au` username still requires valid Zoho app-password secrets in `EMAIL_SMTP_PASSWORD` and `EMAIL_IMAP_PASSWORD`.

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
- Latest portal local update: booking detail pages now show booking QR, payment QR/posture, copy/save/download controls, Telegram/WhatsApp continuation links with booking ID attached, and visible next-effect guidance for pay, reschedule/change, cancel, help, and add-new-booking actions; live deploy/UAT is still pending
- Latest Product closeout: Product full-flow UI/UX merge is closed live with duplicate QR removed, slow-search status/perceived-performance improved, linked Telegram care added through `@BookedAI_Manager_Bot`, mobile/web UAT and live-read popup UAT passing, release gate passing, deploy-live passing, stack health green, and live mobile Product smoke passing
