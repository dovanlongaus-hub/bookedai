# BookedAI

BookedAI is a Docker-based full-stack application for the `bookedai.au` domain, built around the product direction `BookedAI - The AI Revenue Engine for Service Businesses`, with self-hosted Supabase, n8n, and Hermes running on the same Docker host.

Current application release baseline: `1.0.1-stable`.

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
- `backend/api/webhook_routes.py`: Tawk, WhatsApp, and automation callbacks under `/api/webhooks/*` and `/api/automation/*`
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

- `https://bookedai.au/` -> homepage sales deck frontend
- `https://api.bookedai.au/*` -> FastAPI backend
- `https://admin.bookedai.au/` -> admin-facing frontend routes behind the same proxy
- `https://product.bookedai.au/` -> live product demo and booking-agent frontend
- `https://demo.bookedai.au/` -> minimal conversational landing page for the AI revenue engine demo
- `https://portal.bookedai.au/` -> customer booking portal routes on the shared frontend plus backend proxy
- `https://tenant.bookedai.au/` -> tenant operator sign-in and catalog workspace on the shared frontend plus backend proxy
- `https://supabase.bookedai.au/` -> Supabase Studio, Auth, REST, Storage via Kong
- `https://n8n.bookedai.au/` -> n8n editor and webhooks
- `https://hermes.bookedai.au/` -> Hermes knowledge/documentation service
- `https://upload.bookedai.au/` -> simple upload page plus public file hosting from `storage/uploads`
- `https://calendar.bookedai.au/` -> redirect to Zoho Bookings calendar page

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
- [Release Note - 2026-04-20 Homepage Product Live](./docs/development/release-note-2026-04-20-homepage-product-live.md)
- [Target Platform Architecture](./docs/architecture/target-platform-architecture.md)
- [Repo And Module Strategy](./docs/architecture/repo-module-strategy.md)
- [Go-To-Market Sales And Event Strategy](./docs/architecture/go-to-market-sales-event-strategy.md)
- [Demo Script Storytelling And Video Strategy](./docs/architecture/demo-script-storytelling-video-strategy.md)

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
- `ADMIN_API_TOKEN` for protected email admin routes
- `ADMIN_PASSWORD` for admin login credentials
- `TAWK_WEBHOOK_SECRET` if you enable signature verification
- `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USERNAME`, `EMAIL_SMTP_PASSWORD`, `EMAIL_SMTP_FROM`
- `EMAIL_IMAP_HOST`, `EMAIL_IMAP_PORT`, `EMAIL_IMAP_USERNAME`, `EMAIL_IMAP_PASSWORD`

Session secret notes:

- `ADMIN_SESSION_SIGNING_SECRET` is the preferred signing key for admin sessions.
- `TENANT_SESSION_SIGNING_SECRET` is the preferred signing key for tenant sessions.
- `SESSION_SIGNING_SECRET` is a shared fallback for session signing when a more specific secret is not set.
- Current code still falls back to legacy `ADMIN_API_TOKEN` and `ADMIN_PASSWORD` to avoid breaking older environments.

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

   You can customize the record list in root `.env`:

   ```env
   CLOUDFLARE_AUTO_DNS_RECORDS=bookedai.au,www.bookedai.au,api.bookedai.au,product.bookedai.au,portal.bookedai.au,calendar.bookedai.au
   CLOUDFLARE_AUTO_DNS_PROXIED_RECORDS=bookedai.au,www.bookedai.au,api.bookedai.au,product.bookedai.au,portal.bookedai.au,calendar.bookedai.au
   ```

   To run the sync manually at any time:

   ```sh
   bash scripts/update_cloudflare_dns_records.sh
   ```

   The sync script auto-detects the machine's current public IPv4 on each run, so it does not depend on a fixed `SERVER_IPV4` value.

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
- `scripts/deploy_production.sh`: obtains Let's Encrypt certs and deploys both production and beta stacks
- `scripts/healthcheck_stack.sh`: validates core containers and HTTPS endpoints
- `scripts/install_healthcheck_cron.sh`: installs recurring health check cron job
