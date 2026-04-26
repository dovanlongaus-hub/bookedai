# BookedAI

BookedAI is a Docker-based full-stack application for the `bookedai.au` domain, built around the product direction `BookedAI - The AI Revenue Engine for Service Businesses`, with self-hosted Supabase, n8n, and Hermes running on the same Docker host.

Product requirement message: BookedAI connects every customer message - WhatsApp, SMS, Telegram, email and web chat - into one AI Revenue Engine that captures intent, creates booking paths, supports payment and receivable follow-up, and records customer-care actions with operator-visible revenue evidence.

Market-facing message: BookedAI turns missed service enquiries into booked revenue. It captures intent across chat, calls, email, web, and messaging apps, then helps book, follow up, track payment posture, and show operators what revenue was won or still needs action.

Investor/judge message: BookedAI is an AI Revenue Engine for service businesses: an omnichannel agent layer that captures intent, creates booking references, tracks payment and follow-up posture, and records every revenue action in an auditable operating system.

Customer-facing chat agent name: `BookedAI Manager Bot`.

Default BookedAI customer booking support identity: `info@bookedai.au` and `+61455301335` for Telegram, WhatsApp, or iMessage.

Current application release baseline: `1.0.1-stable`.

Current execution lock from `2026-04-26`:

- BookedAI should be operated as one AI Revenue Engine across public/product/tenant/portal/admin surfaces, backend booking/revenue contracts, Messaging Automation Layer channels, and release-governance tooling.
- The urgent implementation order is UI/UX stabilization first, the standard booking journey second, and Messaging Automation Layer consolidation third.
- The standard booking journey is `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`.
- Active phase execution is Phase/Sprint `17-23`: full-flow stabilization, revenue-ops ledger control, customer-care/status agent, widget/plugin runtime, confirmation wallet plus Stripe return continuity, billing/receivables/subscription truth, multi-tenant templates, and release governance.

Current public runtime decision:

- BookedAI is shipping the responsive web app as the primary current-phase product surface.
- `bookedai.au` now has an executive acquisition homepage that explains the full BookedAI revenue-engine story in the first viewport, then keeps the real live search-to-booking workspace on-page for proof.
- `pitch.bookedai.au` remains the deeper pitch and architecture-visualization surface for investors who want the longer company story.
- `scripts/healthcheck_stack.sh` expects `bookedai.au` to serve the homepage shell directly and still probes `pitch.bookedai.au` as the deeper pitch surface.
- `product.bookedai.au` is the deeper live product web runtime; search uses a ChatGPT-like composer, results stay results-first after ranking, and compact cards use detail popups, chat-based refinements, and explicit `Book` actions before customer details open.
- chess searches can surface the reviewed BookedAI chess tenant in the normal result list with verified-tenant capability chips for booking, Stripe, QR payment/confirmation, calendar, email, WhatsApp Agent, and portal edit/revisit.
- configured messaging channels now feed a shared Messaging Automation Layer: customer message -> channel webhook -> BookedAI Inbox (`conversation_events`) -> AI booking-care policy -> booking/payment/follow-up/retention workflow side effects -> provider reply. The separate customer-facing BookedAI Telegram bot is the first generalized channel at `/api/webhooks/bookedai-telegram`, while WhatsApp continues through `/api/webhooks/whatsapp` and `/api/webhooks/evolution`; SMS, email, and web chat should reuse this same engine as their adapters mature.
- `/roadmap` exposes the active Phase/Sprint `17-23` plan for full-flow stabilization, revenue-ops control, customer care, widget runtime, billing truth, templates, and release governance.
- native mobile is intentionally deferred to a later phase.

## Repository structure

- `frontend/`: active React + TypeScript + Vite multi-surface frontend used by the current Docker/Nginx production runtime
- `app/`, `components/`: parallel Next.js 16 + React 19 marketing/runtime experiment, not yet the sole deployed frontend
- `backend/`: FastAPI
- `supabase/`: self-hosted Supabase Docker stack and overrides
- `deploy/`: production-only infrastructure for Nginx, Certbot, systemd, and Hermes
- `scripts/`: VPS bootstrap, deployment, health checks, and DNS automation
- `storage/`: persisted uploaded assets

## Backend API layout

Current FastAPI routing is split by surface and bounded context:

Top-level `/api/*` routers:

- `backend/api/public_catalog_routes.py`: public catalog, booking assistant, pricing, and demo endpoints
- `backend/api/upload_routes.py`: upload entrypoints under `/api/uploads/*`
- `backend/api/webhook_routes.py`: Tawk, WhatsApp, Telegram, Evolution, and automation callbacks under `/api/webhooks/*` and `/api/automation/*`
- `backend/api/admin_routes.py`: admin login, overview, bookings, catalog QA, and partner management
- `backend/api/communication_routes.py`: email endpoints and Discord interactions

Bounded-context `/api/v1/*` routers:

- `backend/api/v1_booking_routes.py`: leads, conversation sessions, booking intent, payment intent, booking path resolution
- `backend/api/v1_search_routes.py`: search and booking-trust endpoints
- `backend/api/v1_tenant_routes.py`: tenant auth, tenant workspace, billing, team, catalog, and customer portal actions
- `backend/api/v1_communication_routes.py`: lifecycle email, SMS, and WhatsApp outbound flows
- `backend/api/v1_integration_routes.py`: provider status, reconciliation, outbox, and CRM retry operations
- `backend/api/v1_router.py`: composition layer that mounts the v1 bounded-context routers

Legacy implementation note:

- `backend/api/v1_routes.py` still contains the concrete handler implementations, but the mounted router surface is now split by bounded context so future extractions can move handler code out module-by-module instead of continuing to grow one file.

Supporting backend layers currently in active use:

- `backend/core/`: config, logging, observability, feature flags, errors, and shared session token signing helpers
- `backend/repositories/`: tenant-aware persistence access
- `backend/service_layer/`: admin, tenant, communication, matching/search, upload, and integration orchestration

## Refactor rules for future backend work

To keep the codebase manageable as the product expands, use these boundaries for new work:

- `booking`: conversation sessions, booking path resolution, booking intents, payment intents
- `tenant`: tenant auth, overview, team, billing, catalog, portal actions
- `admin`: admin authentication, oversight dashboards, QA workflows, partner management
- `search/matching`: query understanding, matching, booking-trust checks, semantic reranking
- `communications`: email, SMS, WhatsApp, Discord-facing communication flows
- `integrations`: provider status, reconciliation, outbox, CRM sync, webhook handoff plumbing

Implementation rules:

- route modules should stay transport-focused and thin
- shared auth/session token logic belongs in `backend/core/`
- orchestration belongs in `backend/service_layer/`
- provider-specific code belongs in `backend/integrations/`
- new feature work should not add more long-lived cross-domain logic to `backend/api/v1_routes.py` or `backend/services.py`
- if a change touches multiple bounded contexts, split the shared pieces into `core`, `service_layer`, or `integrations` first, then keep each route module narrow
- `backend/integrations/`: provider adapters and external-system seams
- `backend/workers/`: outbox and scheduler workers

## Production architecture

Production traffic is expected to follow this path:

- `https://bookedai.au/` -> executive acquisition homepage with live search-to-booking workspace
- `https://api.bookedai.au/*` -> FastAPI backend
- `https://admin.bookedai.au/` -> admin-facing frontend routes behind the same proxy
- `https://product.bookedai.au/` -> live product web runtime and booking-agent frontend
- `https://demo.bookedai.au/` -> canonical public web entrypoint for the BookedAI demo experience
- `https://portal.bookedai.au/` -> customer booking portal routes on the shared frontend plus backend proxy
- `https://tenant.bookedai.au/` -> tenant auth gateway with Google-first sign-in/create-account, email verification code fallback, explicit workspace routing, and catalog workspace on the shared frontend plus backend proxy
- `https://supabase.bookedai.au/` -> Supabase Studio, Auth, REST, Storage via Kong
- `https://n8n.bookedai.au/` -> n8n editor and webhooks
- `https://hermes.bookedai.au/` -> Hermes knowledge/documentation service
- `https://upload.bookedai.au/` -> simple upload page plus public file hosting from `storage/uploads`
- `https://calendar.bookedai.au/` -> redirect to Zoho Bookings calendar page
- `https://bot.bookedai.au/` -> OpenClaw Control UI served through the gateway proxy

Core production services defined in [`docker-compose.prod.yml`](/home/dovanlong/BookedAI/docker-compose.prod.yml:1):

- `web`: built frontend container
- `backend`: FastAPI API and booking logic
- `hermes`: knowledge/documentation service
- `n8n`: workflow automation
- `proxy`: Nginx edge proxy and TLS termination

## Booking flow

- `Tawk -> /api/webhooks/tawk` on the backend
- Backend verifies the webhook signature when `TAWK_VERIFY_SIGNATURE=true`
- Backend sends the message to the configured LLM provider for intent and booking extraction
- Backend stores the event in Postgres managed by the self-hosted Supabase stack
- Backend triggers `n8n` through `N8N_BOOKING_WEBHOOK_URL`
- `n8n` handles Google Calendar and downstream automation

## WhatsApp customer care

- the customer-care policy is shared through `backend/service_layer/messaging_automation_service.py`, so WhatsApp and Telegram use the same booking reference resolution, 60-day conversation window, booking-intake reply, portal-grounded care answer, and request-safe cancellation/reschedule workflow trigger
- `Twilio/Meta WhatsApp -> /api/webhooks/whatsapp` is the business-provider path
- `Evolution API personal WhatsApp QR session -> /api/webhooks/evolution` remains available as a compatibility/personal-bridge route, but it is not the current outbound default
- the customer-facing runtime is the dedicated `BookedAI WhatsApp Booking Care Agent` for `bookedai.au`
- the default BookedAI WhatsApp sender is `+61455301335`, with `info@bookedai.au` as the matching email support identity
- current outbound posture is documented in `docs/development/whatsapp-provider-posture-decision-2026-04-26.md`: Twilio is the configured default, Evolution outbound fallback is disabled, Meta is blocked until account/number registration completes, and Twilio delivery remains queued/manual-review until credentials or sender posture are repaired
- post-booking WhatsApp confirmation messages include the booking reference, portal link, and instruction to reply on WhatsApp for any service question about the existing booking, including status, payment, provider details, support, reschedule, or cancellation review
- inbound messages are normalized, idempotency-checked, and stored as `whatsapp_inbound` events
- when the communication service is configured, BookedAI resolves the booking by reference first, then by sender phone/email only when one safe booking is found
- replies use portal booking truth, including booking status, payment posture, support contact, service/provider context, academy/report context, and revenue-ops action state
- clear cancellation or reschedule messages queue the same audited portal requests as `portal.bookedai.au`, send or record an email confirmation, create a CRM task mirror, and become visible in the tenant booking request queue; unsupported or ambiguous cases ask for booking reference or human review
- this customer Booking AI Agent is named `BookedAI Manager Bot`; it is a customer-facing FastAPI/provider runtime and is separate from OpenClaw or the operator Telegram path used to program, test, deploy, or administer this repo
- OpenClaw and `scripts/telegram_workspace_ops.py` remain operator tooling only; they must not share bot tokens, webhook routes, names, or permissions with `BookedAI Manager Bot`

## Telegram customer care

- Website chat uses the direct request path `Website Chat UI -> POST /api/chat/send -> BookedAI AI Engine -> web response`; the older `/api/booking-assistant/chat` route remains as a compatibility alias
- Website demo/product chat is a public BookedAI web-user surface: it can search all BookedAI catalog data and, when enabled, expand to Internet/public-web results
- Telegram uses the provider request path `Telegram Bot -> POST /api/webhooks/telegram or /api/webhooks/bookedai-telegram -> BookedAI AI Engine -> Telegram sendMessage reply`
- Telegram is a private customer-thread surface: the customer can search and chat like the website, but booking-specific answers require a booking reference or a safe single phone/email identity match from that chat; Telegram chat id alone is not a booking identity
- `Telegram Bot API -> /api/webhooks/bookedai-telegram` is the first priority channel for the customer-facing Messaging Automation Layer; `/api/webhooks/telegram` remains a compatibility alias
- Telegram display name should be `BookedAI Manager Bot`
- preferred Telegram username is `@BookedAI_Manager_Bot`; fallback usernames are `@BookedAIBookingBot`, `@BookedAIServiceBot`, then `@BookedAIHelpBot` if the preferred name is unavailable
- configure `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN` for outbound customer replies and optionally configure `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN` for Telegram's `X-Telegram-Bot-Api-Secret-Token` webhook verification header
- default support/contact for BookedAI-managed customer booking channels is `BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL=info@bookedai.au` and `BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE=+61455301335`; expose that phone as Telegram, WhatsApp, or iMessage-capable customer contact
- intended customer webhook target: `https://api.bookedai.au/api/webhooks/bookedai-telegram`
- live status: `@BookedAI_Manager_Bot` is active with Telegram webhook configured to the customer webhook target, and the production backend reads `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN` from the live secret environment
- do not use the OpenClaw/operator Telegram bot token here; this bot is only for BookedAI customer service search, booking, follow-up, billing reminders, reschedule/cancel requests, confirmation, and retention journeys
- Telegram messages are stored as `telegram_inbound` conversation events, answered by the same booking-care/status agent as WhatsApp, and can queue audited cancellation or reschedule requests when the booking is safely resolved
- Telegram service-search shortlist state is also mirrored into `messaging_channel_sessions`, so callback actions can recover the latest query/options/reply controls without depending only on event-history shape
- new service-search messages are answered as BookedAI representative replies: the bot searches active catalog records, shows compact top options with provider/location/price/source posture, and includes Telegram inline controls for `Open full results in BookedAI`, `View n`, `Book n`, and optional `Find more on Internet near me`
- service-search replies also store a `bookedai_chat_response` payload matching the public web chat structure (`reply`, `matched_services`, `matched_events`, `suggested_service_id`, and location posture) so Telegram results can be rendered by the same BookedAI API contract
- customers can tap or send `Find more on Internet near me` to widen discovery through the configured BookedAI public search service; external results are labeled `public_web_search` and remain inside the BookedAI reply/booking flow
- after a shortlist reply, customers can tap `Book 1` or answer `Book 1` with name plus email or phone and preferred time; BookedAI creates the contact, lead, booking intent, booking reference, portal link, and pending payment/follow-up state directly from Telegram
- existing-booking questions remain scoped to that private channel and are loaded only by explicit booking reference or a safe single customer identity match from phone/email parsed from the customer message or provider metadata
- operator activation helper: after `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN` is present in the secret environment, run `python3 scripts/customer_telegram_bot_manager.py --get-me --activate-webhook --webhook-info`; after a user has pressed Start in Telegram, get a chat id with `python3 scripts/customer_telegram_bot_manager.py --recent-chats` and send a controlled test with `python3 scripts/customer_telegram_bot_manager.py --send-test-chat-id <chat_id>`
- operator UAT helper: run `python3 scripts/customer_agent_uat.py --api-base https://api.bookedai.au` for the web-chat probe; set `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN` and `BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID` to include Telegram message/callback webhook probes without printing secrets
- protected operator health is available at `/api/customer-agent/health` and `/api/admin/customer-agent/health` with admin authentication; it reports recent channel events, pending posture, last reply/callback status, identity-resolution failures, and recent channel-session snapshots

AI provider:

- `openai`: cloud setup used by the booking assistant chat

## Local development

1. Copy environment defaults if needed:

   ```sh
   cp .env.example .env
   ```

2. Start the development stack:

   ```sh
   docker compose up --build
   ```

3. Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/api/health`
- API docs: `http://localhost:8000/api/docs`

Additional developer references:

- [Foundation Scaffold Notes](./docs/development/foundation-scaffold.md)
- [CI/CD Collaboration Guide](./docs/development/ci-cd-collaboration-guide.md)
- [Release Note - 2026-04-20 Homepage Product Live](./docs/development/release-note-2026-04-20-homepage-product-live.md)
- [Target Platform Architecture](./docs/architecture/target-platform-architecture.md)
- [Repo And Module Strategy](./docs/architecture/repo-module-strategy.md)
- [Go-To-Market Sales And Event Strategy](./docs/architecture/go-to-market-sales-event-strategy.md)
- [Demo Script Storytelling And Video Strategy](./docs/architecture/demo-script-storytelling-video-strategy.md)

## Documentation closeout discipline

Every substantive BookedAI change should be closed out as one continuous delivery step, not as a later documentation chore.

Minimum required write-back:

- update the changed requirement-facing or request-facing document
- update [`docs/development/implementation-progress.md`](./docs/development/implementation-progress.md)
- update the corresponding sprint, roadmap, or phase artifact
- sync the resulting detailed note to Notion
- mirror a concise summary to Discord when the change is meaningful for operator visibility

Delivery channel split:

- Discord = direct short summary text for operators
- Notion = full detailed document and long-form change context

Preferred operator commands:

```sh
python3 scripts/telegram_workspace_ops.py sync-doc \
  --title "..." \
  --summary "..." \
  --details-file path/to/change-note.md
```

```sh
python3 scripts/telegram_workspace_ops.py sync-repo-docs --skip-discord
```

## Production deployment for bookedai.au

1. Point DNS records:

- `A` record for `bookedai.au` -> your server public IP
- `A` record for `www.bookedai.au` -> same public IP
- `A` record for `api.bookedai.au` -> same public IP
- `A` record for `product.bookedai.au` -> same public IP
- `A` record for `demo.bookedai.au` -> same public IP
- `A` record for `portal.bookedai.au` -> same public IP
- `A` record for `tenant.bookedai.au` -> same public IP
- `A` record for `supabase.bookedai.au` -> same public IP
- `A` record for `n8n.bookedai.au` -> same public IP
- `A` record for `hermes.bookedai.au` -> same public IP
- `A` record for `upload.bookedai.au` -> same public IP
- `A` record for `calendar.bookedai.au` -> same public IP
- `A` record for `bot.bookedai.au` -> same public IP

2. Prepare environment:

   ```sh
   cp .env.example .env
   ```

   Update at minimum in root `.env`:

- `SESSION_SIGNING_SECRET`
- `TENANT_SESSION_SIGNING_SECRET`
- `ADMIN_SESSION_SIGNING_SECRET`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `N8N_BOOKING_WEBHOOK_URL`
- `N8N_API_KEY` or `N8N_WEBHOOK_BEARER_TOKEN`
- `DISCORD_WEBHOOK_URL` if you want admin reliability handoff summaries pushed into a Discord channel
- optional `DISCORD_WEBHOOK_USERNAME` and `DISCORD_WEBHOOK_AVATAR_URL` for the webhook sender identity
- `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, and `DISCORD_PUBLIC_KEY` if you want a real Discord slash-command bot for team chat
- optional `DISCORD_GUILD_ID` if you want faster guild-scoped command registration during rollout
- optional `DISCORD_ANNOUNCE_CHANNEL_ID` if you want delivery updates posted into a fixed Discord text channel
- `NOTION_API_TOKEN` plus either `NOTION_PARENT_PAGE_ID` or `NOTION_DATABASE_ID` if you want Telegram-driven change summaries written directly into Notion
- optional `NOTION_VERSION` to override the default Notion API version used by the sync script
- `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS` with the Telegram user ids allowed to run elevated BookedAI workspace actions through `telegram_workspace_ops.py`
- `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS` to define which elevated Telegram actions are allowed, such as `build_frontend`, `deploy_live`, `test`, `workspace_write`, `repo_structure`, `host_command`, `host_shell`, `openclaw_runtime_admin`, `whatsapp_bot_status`, or `full_project`
- `ADMIN_API_TOKEN` for protected email admin routes
- `ADMIN_PASSWORD` for admin login credentials
- `ADMIN_BOOTSTRAP_PASSWORD` for explicitly enabled bootstrap-style admin login routes
- optional `ADMIN_ENABLE_BOOTSTRAP_LOGIN=1` if you need the old password-based admin login as a break-glass path
- optional `ADMIN_BOOTSTRAP_ALLOWED_EMAILS` as a comma-separated allowlist for bootstrap-eligible admin emails
- `TAWK_WEBHOOK_SECRET` if you enable signature verification
- `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USERNAME`, `EMAIL_SMTP_PASSWORD`, `EMAIL_SMTP_FROM`; if the username/from values are omitted, BookedAI defaults both sender identity fields to `info@bookedai.au`
- `EMAIL_IMAP_HOST`, `EMAIL_IMAP_PORT`, `EMAIL_IMAP_USERNAME`, `EMAIL_IMAP_PASSWORD`
- `ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`, and `ZOHO_CRM_REFRESH_TOKEN` for durable Zoho CRM write-back
- optional `ZOHO_CRM_ACCESS_TOKEN` for short-lived smoke tests only
- optional `ZOHO_CRM_NOTIFICATION_TOKEN` and `ZOHO_CRM_NOTIFICATION_CHANNEL_ID` when using Zoho CRM Notifications API to push `Deals` updates into BookedAI webhook feedback ingestion
- Zoho Notifications registration and lifecycle calls require the OAuth scope `ZohoCRM.notifications.ALL`; if the original refresh token was minted with only CRM `modules/settings` scopes, re-consent is required before webhook registration can succeed
- backend can now register a Zoho Notifications channel for `Deals` through `POST /api/v1/integrations/crm-feedback/zoho-webhook/register`, which targets `https://api.bookedai.au/api/v1/integrations/crm-feedback/zoho-webhook` by default
- backend now also supports:
  - `GET /api/v1/integrations/crm-feedback/zoho-webhook?channel_id=...` to inspect a channel
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/auto-renew` to run a tracked maintenance check and renew the channel when expiry is near
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/renew` to update expiry, token, notify URL, or events
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/disable` to unsubscribe one or more channel ids
- low-overhead automation is now available too:
  - `python3 scripts/run_zoho_crm_webhook_auto_renew.py`
  - `sudo bash scripts/install_zoho_crm_webhook_auto_renew_cron.sh`
  - this path is intentionally lightweight for performance: one short-lived API call every 6 hours by default, with configurable threshold and timeout envs
  - production hosts can also point that runner at local Nginx instead of Cloudflare with:
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_API_URL=https://127.0.0.1`
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_HOST_HEADER=api.bookedai.au`
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_SKIP_TLS_VERIFY=true`
  - current live AU tenant is now registered on channel `1000000068001` with token `deals.all.notif`, and auto-renew has been verified end-to-end through the BookedAI maintenance route
- optional `ZOHO_ACCOUNTS_BASE_URL`; leave it blank to auto-derive from the configured Zoho API data center, or set it explicitly such as `https://accounts.zoho.com.au` for AU

Session secret notes:

- `ADMIN_SESSION_SIGNING_SECRET` is the preferred signing key for admin sessions.
- `TENANT_SESSION_SIGNING_SECRET` is the preferred signing key for tenant sessions.
- `SESSION_SIGNING_SECRET` is a shared fallback for session signing when a more specific secret is not set.
- Session signing no longer falls back to `ADMIN_API_TOKEN` or `ADMIN_PASSWORD`.
- Production Compose passes `SESSION_SIGNING_SECRET`, `TENANT_SESSION_SIGNING_SECRET`, and `ADMIN_SESSION_SIGNING_SECRET` into both `backend` and `beta-backend`; admin login will fail fast if the admin signing secret family is absent from the live container environment.
- The root `Next.js` admin lane now defaults to email-based one-time verification codes through `/admin-login` plus `/api/admin/auth/request-code` and `/api/admin/auth/verify-code`.
- When `BOOKEDAI_ENABLE_PRISMA=1`, those admin codes persist in Prisma-backed `admin_email_login_codes`; otherwise the root admin lane now uses the live legacy tenant membership tables plus `tenant_email_login_codes` as the compatibility persistence path.
- Bootstrap admin login is now a break-glass path only: it must be explicitly enabled with `ADMIN_ENABLE_BOOTSTRAP_LOGIN=1`, and then uses `ADMIN_BOOTSTRAP_PASSWORD`.

Zoho CRM connection helper:

```sh
python3 scripts/zoho_crm_connect.py authorize-url \
  --redirect-uri https://api.bookedai.au/zoho/oauth/callback
```

The helper now requests `ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.notifications.ALL` by default so one consent flow can support both CRM write-back and notification-channel lifecycle.

```sh
python3 scripts/zoho_crm_connect.py exchange-code \
  --code '<zoho-auth-code>' \
  --redirect-uri https://api.bookedai.au/zoho/oauth/callback \
  --write-env
```

```sh
python3 scripts/zoho_crm_connect.py test-connection --module Leads
```

This helper keeps the repo-side setup closed-loop:

- `authorize-url` prints the consent URL using the current client id and the correct Zoho Accounts domain for the selected data center
- `exchange-code` swaps the returned auth code for OAuth tokens and can persist them into root `.env`
- `test-connection` runs the same metadata smoke test that the backend integration route uses

   Then prepare the Supabase env file:

   ```sh
   bash scripts/prepare_supabase_env.sh
   ```

   Review `supabase/.env` and replace any remaining placeholder values you care about, especially:

- `SMTP_*`
- `POOLER_TENANT_ID`
- `OPENAI_API_KEY` in Supabase Studio if you want its AI assistant
- any provider or storage settings you plan to use

3. Bootstrap the server as `root`:

   ```sh
   DEPLOY_USER=ubuntu sudo bash scripts/bootstrap_vps.sh
   ```

4. Deploy beta preview first:

   ```sh
   bash scripts/deploy_beta.sh
   ```

   This rebuilds and redeploys the dedicated `beta-web` and `beta-backend` services behind `https://beta.bookedai.au` without touching the production web or production backend containers.

5. Promote the full stack when ready:

   ```sh
   bash scripts/deploy_production.sh
   ```

   For Telegram/OpenClaw-driven live deploys on the VPS host, prefer:

   ```sh
   bash scripts/deploy_live_host.sh
   ```

   This wrapper is intended for host-level execution and will use passwordless `sudo` when available so the bot can deploy from the real Docker host instead of the container runtime.

6. Access:

- App: `https://bookedai.au`
- Product: `https://product.bookedai.au`
- Beta: `https://beta.bookedai.au`
- Admin: `https://admin.bookedai.au`
- Demo: `https://demo.bookedai.au`
- Portal: `https://portal.bookedai.au`
- API docs: `https://api.bookedai.au/api/docs`
- Supabase: `https://supabase.bookedai.au`
- n8n: `https://n8n.bookedai.au`
- Hermes: `https://hermes.bookedai.au`
- Uploads: `https://upload.bookedai.au`
- Calendar redirect: `https://calendar.bookedai.au`
- OpenClaw Control UI: `https://bot.bookedai.au`

7. Optional hardening (health monitoring):

   ```sh
   sudo bash scripts/install_healthcheck_cron.sh
   ```

   This installs a `*/5` cron check and writes results to:

- `/var/log/bookedai-healthcheck.log`

8. Optional dynamic IP sync to Cloudflare on each reboot:

## Discord team assistant

The backend now supports Discord Interactions at:

- `POST /api/discord/interactions`

Recommended setup:

1. Create a Discord app and bot in the Discord Developer Portal.
2. In `General Information`, copy:

- `Application ID` -> `DISCORD_APPLICATION_ID`
- `Public Key` -> `DISCORD_PUBLIC_KEY`

3. In `Bot`, create or reset the bot token, then copy:

- `Token` -> `DISCORD_BOT_TOKEN`

4. Optional for faster testing in one server: enable `DISCORD_GUILD_ID` with your target guild ID.
5. Set the Interactions Endpoint URL to:

   ```text
   https://api.bookedai.au/api/discord/interactions
   ```

6. Invite the bot to your Discord server after `DISCORD_APPLICATION_ID` is present:

   ```sh
   python3 scripts/discord_setup_helper.py
   ```

   The script prints the invite URL and a masked readiness snapshot.

7. Register slash commands:

   ```sh
   python3 scripts/register_discord_commands.py
   ```

Quick setup snapshot:

```sh
python3 scripts/discord_setup_helper.py
```

The current command surface is:

- `/bookedai ask prompt:"..."` for repo-backed team Q&A
- `/bookedai summary topic:all|implementation|sprint14|roadmap` for quick progress summaries

For local completion updates after a sprint or phase closes, run:

```sh
python3 scripts/post_discord_delivery_update.py sprint 14
python3 scripts/post_discord_delivery_update.py phase 8
```

The script reads `.env`, uses `DISCORD_GUILD_ID`, and posts to `DISCORD_ANNOUNCE_CHANNEL_ID` when present. If no announce channel is configured, it falls back to the guild system channel, then `#general`, then the first visible text channel.

## Telegram change sync

For Telegram or OpenClaw-driven change summaries that should be archived, written into Notion, and mirrored into Discord, run:

```sh
python3 scripts/telegram_workspace_ops.py sync-doc \
  --title "Homepage booking flow refined" \
  --summary "Added the in-flow shortlist preview modal, kept Back inside the same path, and focused the booking Name field after Book." \
  --details-file docs/development/example-change-note.md
```

What it does:

- always archives the update under `docs/development/telegram-sync/YYYY-MM-DD/`
- attempts to create a Notion page when `NOTION_API_TOKEN` plus `NOTION_PARENT_PAGE_ID` or `NOTION_DATABASE_ID` are configured
- posts the same summary through the configured Discord bot when `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, and optional `DISCORD_ANNOUNCE_CHANNEL_ID` are present
- supports a fuller detailed document through `--details` or `--details-file`, which is included in the archive and written into Notion under a `Detailed document` section

Helpful flags:

- `--summary-file path/to/file.md` to send a longer prepared summary
- `--details-file path/to/file.md` to send the full detailed document body into Notion
- `--discord-channel-id CHANNEL_ID` to override the Discord destination for one specific update
- `--skip-notion` or `--skip-discord` to target only one destination
- `--require-notion` or `--require-discord` to fail the command if that destination does not succeed

For sprint-complete summaries that should go to the dedicated sprint-results Discord channel, use:

```sh
python3 scripts/telegram_workspace_ops.py sync-doc \
  --title "Sprint X summary" \
  --summary-file path/to/sprint-summary.txt \
  --details-file path/to/sprint-summary.md \
  --discord-channel-id 1492396016563912875 \
  --require-discord
```

## Telegram build and deploy

For Telegram or OpenClaw-driven product operations, use the Telegram workspace wrapper:

```sh
python3 scripts/telegram_workspace_ops.py build-frontend
python3 scripts/telegram_workspace_ops.py deploy-live
python3 scripts/telegram_workspace_ops.py test --command "./scripts/run_release_gate.sh"
python3 scripts/telegram_workspace_ops.py workspace-command --command "git mv old/path new/path"
python3 scripts/telegram_workspace_ops.py host-command --command "apt-get update"
python3 scripts/telegram_workspace_ops.py host-shell --cwd / --command "docker ps && systemctl status nginx"
python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent
python3 scripts/telegram_workspace_ops.py fix-openclaw-approvals
python3 scripts/telegram_workspace_ops.py enable-openclaw-full-access
python3 scripts/telegram_workspace_ops.py whatsapp-bot-status
```

The wrapper keeps the operator path explicit:

- `build-frontend` runs the BookedAI production frontend build in `frontend/`
- `deploy-live` runs the approved VPS-host deployment wrapper `bash scripts/deploy_live_host.sh`; when invoked from the privileged OpenClaw CLI container at `/workspace/bookedai.au`, it automatically enters the VPS host namespace before running the deploy
- `test` runs a repo-scoped validation command such as release-gate, backend, or frontend verification
- `workspace-command` runs a repo-scoped shell command so Telegram/OpenClaw can handle broader BookedAI changes, including file moves, refactors, and multi-surface rollout steps
- `host-command` runs a host-level command through `sudo -n` only when the requested program is in the checked-in allowlist such as `apt-get`, `docker`, `systemctl`, `journalctl`, `service`, `timedatectl`, or `ufw`
- `host-shell` runs a fully elevated host shell command from any server path and is the intended lane when trusted Telegram/OpenClaw operators need broad `host/elevated` access across the whole machine
- `sync-openclaw-bookedai-agent` installs or updates the always-on `BookedAI Booking Customer Agent` manifest in the OpenClaw runtime config directory without adding schema-invalid entries to `openclaw.json`; use `--legacy-whatsapp-agent` only when syncing the older WhatsApp-specific care manifest
- `fix-openclaw-approvals` aligns `tools.exec.ask` and the host `exec-approvals.json` defaults to `on-miss`, repairing the OpenClaw error `allow-always is unavailable because the effective policy requires approval every time` while keeping untrusted commands approval-gated
- `enable-openclaw-full-access` is the trusted-operator break-glass posture for `bot.bookedai.au`: it sets OpenClaw exec to `security=full`, `ask=off`, `askFallback=full`, enables elevated access for webchat, enables elevated access for Telegram trusted ids, and sets `agents.defaults.elevatedDefault=full`; pass `--telegram-open` only if every Telegram sender should be allowed
- `whatsapp-bot-status` runs the read-only WhatsApp bot readiness probe for OpenClaw, API health, provider status, and the active webhook route; for `whatsapp_evolution` it checks `/api/webhooks/evolution`, and for Meta/Twilio it checks `/api/webhooks/whatsapp`
- when the wrapper is running inside the privileged OpenClaw CLI container, `deploy-live`, `host-command`, and `host-shell` now jump into the real host namespaces through `nsenter --target 1 ...`, so Docker, package managers, and system binaries resolve against the VPS itself instead of the container filesystem
- `sync-doc` is the documentation or Notion or Discord path for Telegram change tracking
- `host-command` intentionally does not expose `bash`, `sh`, or arbitrary executable paths, so it can support machine operations without turning the Telegram path into a general-purpose root shell
- `host-shell` is intentionally broader and should be granted only to trusted operators through `host_shell` or `full_project`
- on the current VPS host, Linux user `openclaw` is provisioned with ACL-based write access to the host repo path `/home/dovanlong/BookedAI`; because that path is bind-mounted into the container at `/workspace/bookedai.au`, trusted OpenClaw execution can now create, edit, rename, and delete project files there without changing the repo owner
- that ACL posture was then re-applied recursively across the whole repo tree on `2026-04-22` so previously restricted subdirectories inherit the same write model; direct verification as `openclaw` now also covers the homepage landing files `frontend/src/components/landing/sections/HomepageExecutiveBoardSection.tsx` and `frontend/src/components/landing/sections/HomepageOverviewSection.tsx`
- the standard OpenClaw gateway runtime writes the bind mount as container user `node` (`uid 1000`, mapped to host ACL entry `ubuntu` on this machine), so the same ACL write model is now granted to host `uid 1000` as well; this restores memory flushes and other repo writes initiated from the gateway runtime
- the live OpenClaw webchat elevated-exec path was then fixed on `2026-04-22` by allowing provider `webchat` under `tools.elevated.allowFrom` in the live OpenClaw state file and by correcting `openclaw-cli` to run `openclaw node run --host 127.0.0.1 --port 18789` instead of exiting after printing CLI help; this removes the tool-policy blocker where webchat could not request host-elevated actions such as `deploy-live`

Telegram authorization for elevated actions:

- `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS` is the allowlist of Telegram actor ids
- `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS` controls which elevated actions that allowlist can run
- the default checked-in operator baseline now includes trusted operator `8426853622` with full BookedAI workspace coverage for live deploy, test, repo-structure work, safe host commands, full host shell access, and broader project commands
- the live OpenClaw Telegram channel is now also configured with `dmPolicy: allowlist` plus `allowFrom: ["8426853622"]`, so the trusted operator path no longer stops at DM pairing before elevated repo or host actions can run
- the full-access OpenClaw runtime repair keeps Telegram on the trusted user allowlist by default; use `enable-openclaw-full-access --telegram-open` only for an intentionally public Telegram control surface
- if your Telegram bridge can pass the actor id, use `--telegram-user-id` or set `BOOKEDAI_TELEGRAM_USER_ID` or `TELEGRAM_USER_ID`
- inspect the current permission snapshot with:

```sh
python3 scripts/telegram_workspace_ops.py permissions --telegram-user-id 8426853622
```

## CI/CD collaboration summary

BookedAI currently uses a practical script-driven CI/CD model rather than a fully automated GitHub Actions promotion pipeline.

Team summary:

- validate locally and with `./scripts/run_release_gate.sh`, which now includes Phase 23 security fixtures for confirmation email HTML escaping, provider URL allowlisting, private-channel identity policy, website chat, Telegram, and WhatsApp routes
- rehearse on `beta.bookedai.au` with `bash scripts/deploy_beta.sh`
- promote live from the Docker host with `bash scripts/deploy_live_host.sh`
- verify health after deploy
- update repo docs, then sync the detailed note to Notion and the short summary text to Discord

Use [CI/CD Collaboration Guide](./docs/development/ci-cd-collaboration-guide.md) as the quick handoff document for other collaborators.
Use [CI/CD And Deployment Runbook](./docs/development/ci-cd-deployment-runbook.md) when you need the full beta-to-production operator sequence.

Discord Developer Portal checklist:

- `Installation` / `OAuth2`: ensure the app can be installed to the target server.
- `Bot`: keep the token private and regenerate it if it was ever exposed.
- `General Information`: confirm the Interactions Endpoint URL saves successfully.
- `General Information`: use the same `Application ID` and `Public Key` values in `.env`.
- `Bot Permissions`: for this slash-command flow, `Send Messages` and `Use Slash Commands` are typically enough.

   ```sh
   sudo bash scripts/install_cloudflare_dns_autoupdate.sh
   ```

   By default this updates these A records to the machine's current public IPv4 on boot:

- `bookedai.au`
- `www.bookedai.au`
- `api.bookedai.au`
- `product.bookedai.au`
- `admin.bookedai.au`
- `portal.bookedai.au`
- `n8n.bookedai.au`
- `supabase.bookedai.au`
- `upload.bookedai.au`
- `calendar.bookedai.au`
- `bot.bookedai.au`

   You can customize the record list in root `.env`:

   ```env
   CLOUDFLARE_AUTO_DNS_RECORDS=bookedai.au,www.bookedai.au,api.bookedai.au,admin.bookedai.au,beta.bookedai.au,product.bookedai.au,demo.bookedai.au,portal.bookedai.au,tenant.bookedai.au,futureswim.bookedai.au,pitch.bookedai.au,n8n.bookedai.au,supabase.bookedai.au,hermes.bookedai.au,upload.bookedai.au,calendar.bookedai.au,bot.bookedai.au
   CLOUDFLARE_AUTO_DNS_PROXIED_RECORDS=bookedai.au,www.bookedai.au,api.bookedai.au,admin.bookedai.au,beta.bookedai.au,product.bookedai.au,demo.bookedai.au,portal.bookedai.au,tenant.bookedai.au,futureswim.bookedai.au,pitch.bookedai.au,n8n.bookedai.au,supabase.bookedai.au,hermes.bookedai.au,calendar.bookedai.au,bot.bookedai.au
   ```

   To run the sync manually at any time:

   ```sh
   bash scripts/update_cloudflare_dns_records.sh
   ```

   The sync script auto-detects the machine's current public IPv4 on each run, preferring cloud instance metadata when available and falling back to public IPv4 echo services only when needed. The install script enables both a boot-time service and a recurring `systemd` timer so Cloudflare keeps following the host's current public IP after reboots and during later IP changes too.

## Email sending and inbox

Backend now supports SMTP send and IMAP inbox fetch APIs:

- `GET /api/email/status`
- `POST /api/email/send`
- `GET /api/email/inbox?limit=20`

These admin routes require an `X-Admin-Token` header that matches `ADMIN_API_TOKEN`.

## Feature flag operations

To print the exact SQL needed for a rollout-safe flag change:

```sh
./scripts/set_feature_flag.py semantic_matching_model_assist_v1 --enabled true --dry-run
```

To write the flag directly when `DATABASE_URL` is reachable from the current environment:

```sh
./scripts/set_feature_flag.py semantic_matching_model_assist_v1 --enabled true
```

To target a specific tenant UUID instead of the default production tenant:

```sh
./scripts/set_feature_flag.py semantic_matching_model_assist_v1 --enabled true --tenant-id <tenant-uuid>
```

Recommended provider setup for this project:

- Outbound SMTP: Zoho Mail (`smtp.zoho.com.au`)
- Inbound IMAP: Zoho Mail (`imap.zoho.com.au`)

Example root `.env` values:

```env
OPENAI_MODEL=gpt-5-mini
AI_MODEL=
EMAIL_SMTP_HOST=smtp.zoho.com.au
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USERNAME=info@bookedai.au
EMAIL_SMTP_PASSWORD=your-zoho-app-password
EMAIL_SMTP_FROM=info@bookedai.au
EMAIL_SMTP_USE_TLS=false
EMAIL_SMTP_USE_STARTTLS=true
EMAIL_IMAP_HOST=imap.zoho.com.au
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USERNAME=info@bookedai.au
EMAIL_IMAP_PASSWORD=your-zoho-app-password
EMAIL_IMAP_MAILBOX=INBOX
EMAIL_IMAP_USE_SSL=true
WHATSAPP_PROVIDER=twilio
WHATSAPP_FALLBACK_PROVIDER=
WHATSAPP_FROM_NUMBER=+61455301335
WHATSAPP_EVOLUTION_API_URL=https://waba.bookedai.au
WHATSAPP_EVOLUTION_API_KEY=your-evolution-api-key
WHATSAPP_EVOLUTION_INSTANCE=bookedai
WHATSAPP_EVOLUTION_WEBHOOK_SECRET=your-evolution-webhook-hmac-secret
# Optional personal-bridge fallback only when explicitly approved:
# WHATSAPP_FALLBACK_PROVIDER=evolution
# Later, after WhatsApp Business verification:
# WHATSAPP_PROVIDER=meta
# WHATSAPP_FALLBACK_PROVIDER=twilio
# WHATSAPP_META_PHONE_NUMBER_ID=your-meta-phone-number-id
# WHATSAPP_META_ACCESS_TOKEN=your-meta-system-user-token
ADMIN_API_TOKEN=your-long-random-admin-token
```

After updating root `.env` email variables, redeploy backend:

```sh
docker compose -f docker-compose.prod.yml --env-file .env up -d --build backend
```

## OpenAI setup

BookedAI uses OpenAI for booking search and answer generation.

Required root `.env` values:

```env
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5-mini
AI_MODEL=
```

Useful checks:

```sh
curl -s http://localhost:8000/api/health
```

Quick checks:

```sh
curl -s \
  -H "X-Admin-Token: $ADMIN_API_TOKEN" \
  https://api.bookedai.au/api/email/status
```

```sh
curl -s -X POST https://api.bookedai.au/api/email/send \
  -H "X-Admin-Token: $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":["you@example.com"],"subject":"BookedAI test","text":"SMTP works"}'
```

```sh
curl -s \
  -H "X-Admin-Token: $ADMIN_API_TOKEN" \
  "https://api.bookedai.au/api/email/inbox?limit=5"
```

## Important files

- `docker-compose.yml`: local development
- `docker-compose.prod.yml`: production stack for frontend, backend, Hermes, n8n, and edge proxy
- `supabase/docker-compose.yml`: official Supabase self-hosted stack
- `supabase/docker-compose.bookedai.yml`: BookedAI override for shared network and extra databases
- `deploy/nginx/bookedai.au.conf`: TLS and reverse proxy config
- `deploy/hermes/`: Hermes image build and runtime configuration
- `deploy/systemd/`: boot-time DNS and reconciliation units
- `.env.example`: required environment variables
- `scripts/bootstrap_vps.sh`: installs Docker and host prerequisites on Ubuntu
- `scripts/prepare_supabase_env.sh`: generates and patches `supabase/.env`
- `scripts/sync_app_env_from_supabase.sh`: syncs app DB and API keys from `supabase/.env`
- `scripts/deploy_beta.sh`: rebuilds and redeploys the beta staging runtime at `beta.bookedai.au`
- `scripts/deploy_production.sh`: obtains Let's Encrypt certs, deploys both production and beta stacks, builds production and beta web images sequentially by default to avoid VPS memory-pressure `143` failures, and retries production Compose bring-up with orphan cleanup if recreate fails transiently
- `scripts/healthcheck_stack.sh`: validates production Compose services, required Supabase containers, and HTTPS endpoints
- `scripts/install_healthcheck_cron.sh`: installs recurring health check cron job
