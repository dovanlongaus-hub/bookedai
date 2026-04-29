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
- Zoho CRM/Calendar AU OAuth is connected through refresh-token auth. Calendar/Zoho Meeting provisioning uses `ZOHO_CALENDAR_API_BASE_URL=https://calendar.zoho.com.au/api/v1` and the AU `info` calendar UID; runtime Calendar calls prefer refresh-token exchange over direct access tokens. Live UAT booking `v1-364c66e949` returned both a Zoho Meeting URL and Calendar event URL, synced booking CRM deal/task, manual-confirmed payment to paid, and synced Zoho payment deal/task after one provider throttle retry.

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
- Latest product QA/UAT pass: local product build/regression, after-booking responsive subset, product live-read popup coverage, standard live-read smoke, focused backend booking/care/payment/messaging/calendar tests, and live `product.bookedai.au` responsive smoke all passed on `2026-04-29`; Playwright preview readiness timeout is now configurable with a `180s` default. Broad homepage live-read contract drift remains outside the product popup lane.
- Latest local Product after-booking pass: the confirmation screen now behaves like a professional order detail surface with confirmed-order hero, order summary, view details, portal/QR, payment, Apple Wallet and Google Wallet entry points, share/email/print, and responsive mobile/Android/desktop regression coverage (`8 passed`). Actual wallet pass generation remains a portal/backend follow-up.
- Latest local Product UX pass: the product shell now removes the redundant `BookedAI` text beside the logo, adds a compact Google/email account menu with local saved customer profile reuse, hides the booking-state strip on mobile, keeps desktop/tablet `Chat -> Search -> Preview -> Book -> Pay -> Care` status-aware, and bounds slow live-read with instant tenant/catalog matches plus progress copy. Local Vite build, product regression (`7 passed`), and responsive no-overflow sweeps passed; live deploy and server-side customer identity binding remain follow-up.
- Latest AI Mentor tenant closeout: `ai-mentor-doer` display name is `AI Mentor 1-1 Pro`; login/contact is `aimentor@bookedai.au / FirstHundredM$` with phone/Telegram/WhatsApp/iMessage `+61481993178`; migration `026` is applied live; live API and browser sign-in on `tenant.bookedai.au/ai-mentor-doer` passed. The `tenant_auth_tenant_mismatch` login issue from the root or another tenant path is fixed live: valid AI Mentor credentials now return the `ai-mentor-doer` session and the frontend redirects/reloads with the session token. Tenant logout is also fixed live: signing out clears slug/default session storage and returns to `https://tenant.bookedai.au/` for a clean next-account login. AI Mentor embed/widget asset returned `200`, and widget preflight `OPTIONS` on `/partner-plugins/ai-mentor-pro-widget.js` now returns `204` with CORS headers after the live nginx precedence fix.
- Latest public web booking tenant closeout: `bookedai-au` is the fallback tenant for BookedAI-owned public/product booking flows without a provider tenant; tenant name `BookedAI.au Web Booking`, login/contact `info@bookedai.au / FirstHundredM$`, phone/Telegram/WhatsApp/SMS `+61455301335`; migration `024` is applied live, deploy-live passed, and live UAT booking `v1-e13e9d61f0` confirmed the `Tenant session required` production error is fixed.
- Latest `bookedai.au` public chat closeout: homepage/public assistant lead capture now uses `/api/v1/public/leads/{tenant_slug}` for public-web and embedded-widget runtimes with a `tenantRef`, so unauthenticated public chat no longer depends on tenant-session `/api/v1/leads`; leaked tenant-session errors are converted into customer-safe recovery UI.
- Latest chess tenant login closeout: `co-mai-hung-chess-class` login/contact is `chess@bookedai.au / FirstHundredM$`; migration `025` is applied live; stale `tenant1 / 123` and `chess` demo credentials are inactive; live API and browser sign-in on `tenant.bookedai.au/co-mai-hung-chess-class` passed.
- Latest Sprint B security hardening: tenant operational reads now require signed tenant sessions, unauthenticated raw `actor_context.tenant_id` is rejected, and payment intent creation enforces tenant match plus BookedAI/local-dev return-origin allowlisting; full release gate, deploy-live, stack health, unsigned/signed tenant probes, public fallback probe, and WSTI homepage shell probe passed on `2026-04-28`.
- Latest product AI-search booking follow-up: Stripe subscription webhooks now reconcile tenant billing/subscription state, messaging customer-care blocks bare booking-reference detail/change flows unless contact or same-conversation identity is present, deploy env sync preserves `api.bookedai.au` in `CORS_ALLOW_ORIGINS`, and live stack health/API/widget probes passed at `2026-04-28T14:12:25Z`.
- Latest public pitch/homepage messaging pass: `pitch.bookedai.au` and `bookedai.au` now sell the SME launch offer of a custom booking-ready landing page, dedicated email, dedicated CRM, and preconfigured booking/calendar/meeting flow; `chess.bookedai.au` and `aimentor.bookedai.au` are positioned as live proof cases; public internal wording was reframed into booking activity, follow-up history, and business workspace language. Local build and focused Playwright pitch/homepage/architecture suite passed on `2026-04-29`; the follow-up pitch polish now opens with the booking-ready revenue-engine promise, an early `What SMEs get` section, launch offer before video, and customer-safe `/architecture` copy.
- Latest audience split follow-up: `bookedai.au` is the SME buying surface with done-for-you booking-page setup messaging, while `pitch.bookedai.au` is the investor/judge pitchdeck with platform/category framing. Public product communication automation now falls back to the `bookedai-au` public tenant for public-web actors instead of requiring a tenant bearer token; backend communication tests, frontend build, and focused homepage/pitch/architecture Playwright passed locally on `2026-04-29`.
