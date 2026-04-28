# BookedAI Implementation Progress

## Purpose

This note records the latest implementation progress in a way that stays aligned with the project plan and the current documentation baseline.

It is also the required implementation-tracking document for substantive module updates after the old module description has been re-read and the request-facing source document has been updated.

It is also the mandatory write-back target whenever a change has been completed end-to-end and deployed live: the delivered result should be recorded here in the same closure pass that updates the relevant sprint, roadmap, and requirement-side documents.

## Status Snapshot

Date: `2026-04-28`

Implementation update from `2026-04-28` (AI Mentor 1-1 tenant contact/login refresh):

- updated the AI Mentor 1-1 tenant baseline for `ai-mentor-doer`: login username/email is `aimentor@bookedai.au`, password is `FirstHundred1M$`, contact email is `aimentor@bookedai.au`, and phone/WhatsApp/Telegram/iMessage contact is `+84908444095`
- refreshed seed migration `013_ai_mentor_tenant_seed.sql` for new bootstraps and added idempotent migration `023_ai_mentor_contact_login_update.sql` for already-seeded environments
- applied migration `023` through host-level Docker psql against `supabase-db`; verification showed active credential and membership on `aimentor@bookedai.au`, tenant settings contact email/phone updated, `10` AI Mentor service rows owned by the new email, and `0` stale `tenant3` credentials
- published the closeout to Notion and Discord through `telegram_workspace_ops.py sync-doc`; archive entries: `docs/development/telegram-sync/2026-04-28/024447-ai-mentor-1-1-tenant-contact-and-login-refresh.md` and `docs/development/telegram-sync/2026-04-28/024650-ai-mentor-1-1-runtime-contact-login-applied.md`

Implementation update from `2026-04-28` (Zoho CRM booking lifecycle live UAT and release-gate hardening):

- completed live Zoho CRM booking UAT with phone-only Future Swim booking `v1-53a53835ae`; the API returned `200`, the booking reopened in the portal, and Zoho lead/contact/deal/task all reported `synced` with external CRM ids
- stack health passed after the live probe at `2026-04-28T01:56:16Z`; backend logs showed Zoho OAuth, Leads, Contacts, Deals, Tasks, and CRM feedback webhook calls completing successfully for the UAT record
- restored the Telegram human-handoff claimed TTL/suppression contract in `MessagingAutomationService` and verified the focused regression pair plus the backend release unittest lane (`69 tests OK`)
- hardened frontend release-gate smoke stability by updating stale homepage smoke assertions, combining legacy/admin smoke cases under one Playwright invocation, and switching preview to the static `dist` server for test runs
- verification completed: full backend pytest earlier passed (`344 passed`), live booking/portal UAT passed, stack health passed, frontend smoke lanes passed individually (`legacy 4`, `live-read 2`, `admin 4`, `tenant 4`), and backend release unittest lane passed; the long single-command release gate still needs a clean rerun after the dirty workspace stops restoring stale smoke files mid-run
- status: Zoho CRM booking lifecycle hardening is live-UAT verified; release-gate runner fixes are locally applied for the next clean full-gate pass

Implementation update from `2026-04-28` (tenant owner microcopy follow-up, local):

- tightened remaining tenant auth-card and gateway microcopy toward business-owner language: owner access, business workspace, owner Google login, business account creation, owner identity, and booking-backed workspace
- refreshed tenant billing labels away from internal readiness language by replacing commercial truth/payment posture/invoice seam wording with billing readiness, payment setup, and invoice history phrasing
- added a mobile tenant gateway stale-copy/overflow smoke so the old `one tenant workspace`, `Commercial truth`, and `Payment posture` copy cannot return unnoticed
- stabilized tenant smoke execution on the static SPA preview path and added the tenant smoke call back into `test:release-gate`
- verification passed locally with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, and `PLAYWRIGHT_SKIP_BUILD=1 npm --prefix frontend run test:playwright:tenant-smoke` (`4 passed`)
- status: local follow-up is complete; live deploy remains pending a clean full frontend release gate because an earlier full-gate attempt ran while stale smoke scripts were still present in the dirty workspace

Implementation update from `2026-04-27` (homepage/admin business-owner wording live deploy):

- completed the next promotion step after local QA by deploying the B2B business-owner-first homepage/admin copy cleanup through `bash scripts/deploy_live_host.sh`
- production deploy rebuilt backend, beta-backend, web, and beta-web images; recreated the app containers, restarted the proxy, and reactivated the n8n booking intake workflow
- live homepage now serves the rebuilt Vite shell with `last-modified: Mon, 27 Apr 2026 11:36:55 GMT`, app bundle `/assets/index-OFT1M25o.js`, public bundle `/assets/PublicApp-a2XvE_9O.js`, and data chunk `/assets/data-BHqxrLAf.js`
- verification passed with `bash scripts/healthcheck_stack.sh` at `2026-04-27T11:38:37Z` and `bash scripts/verify_homepage_admin_polish.sh`, including metadata, hero/proof/CTA/product-link checks, and absence checks for the old internal admin/homepage phrasing
- status: homepage/admin business-owner wording cleanup is live and verified

Implementation update from `2026-04-27` (landing data-driven public copy final pass):

- completed the final scoped copy cleanup in `frontend/src/components/landing/data.ts`, targeting the data-driven public sections that still carried internal-sounding `operator`, `runtime`, `handoff`, `control plane`, or `chat revenue platform` language
- kept the change copy-only and structure-preserving: public wording now favors `team`, `staff`, `account`, `support`, `product surface`, `booking next step`, and `revenue workflow` while retaining IDs, URLs, statuses, and roadmap data shape
- verification passed locally with `npm --prefix frontend run build`, `git diff --check -- frontend/src/components/landing/data.ts memory/2026-04-27.md`, and targeted grep against `frontend/src/components/landing/data.ts`
- deployed live with `bash scripts/deploy_live_host.sh`; backend, beta-backend, web, and beta-web rebuilt/recreated, proxy restarted, and the n8n booking intake workflow stayed active
- post-deploy verification passed with `bash scripts/healthcheck_stack.sh` at `2026-04-27T11:12:33Z`, `bash scripts/verify_homepage_admin_polish.sh`, live homepage bundle `/assets/index-B6w90ijm.js`, and a direct live `data-BCQN71vM.js` scan confirming the cleanup terms are absent
- operator sync archived `docs/development/telegram-sync/2026-04-27/111332-landing-data-driven-public-copy-cleanup-live.md`; Notion page creation and Discord summary both succeeded
- status: landing data-driven public copy cleanup is live and verified

Implementation update from `2026-04-27` (homepage/admin polish live verification repair):

- corrected the homepage source comparator so it checks the deployed Vite production source under `frontend/src/apps/public/PublicApp.tsx` and `frontend/index.html`, not only the parallel root Next.js shell
- fixed a TypeScript nav-tracking issue in `PublicApp.tsx` exposed by the production Vite build after the homepage nav labels changed
- hardened live homepage verification so it scans Vite lazy chunks such as `PublicApp-*.js`, then removed remaining public/admin frontend `control plane` wording so the old-wording cleanup gate passes across served chunks
- updated `scripts/healthcheck_stack.sh` to match the new `Bookedai.au | The AI Revenue Engine for Service Businesses` homepage shell title
- live recovery completed after two host deploy passes: production backend/web/beta containers are up on freshly built images, proxy restarted, n8n workflow reactivated, stack health passed at `2026-04-27T10:39:54Z`, and `bash scripts/verify_homepage_admin_polish.sh` passed all homepage/admin polish checks
- status: homepage/admin polish source, build, deploy, stack health, and live bundle verification are closed

Implementation update from `2026-04-27` (portal QR and channel handoff clarity):

- upgraded `portal.bookedai.au` so loaded bookings show a booking portal QR, payment QR/posture panel, copy/save/download controls, and the canonical `booking_reference` portal URL in the main booking command center
- added explicit Telegram and WhatsApp continuation links that carry the booking ID (`bk.<booking_reference>` for Telegram and a prefilled WhatsApp message), so customers moving from chat/Telegram/WhatsApp into the portal keep the same order context
- added visible action-effect guidance for status, pay, reschedule, cancel, help, and add-new-booking paths, plus request-form next-effect copy explaining that change/cancel/pause/downgrade actions queue provider/support review rather than silently mutating the booking
- verification passed with frontend TypeScript (`npm --prefix frontend exec tsc -- --noEmit`) and focused portal Playwright from the frontend workspace (`npm exec playwright test tests/portal-enterprise-workspace.spec.ts`, `6 passed`)
- status: local frontend implementation and regression coverage are complete; live deploy/UAT remains the next promotion step

Implementation update from `2026-04-27` (Telegram pending-booking action menu):

- upgraded the customer-facing Telegram booking-care menu so pending-payment and existing-booking replies expose clear app-style choices: keep booking, view booking, open QR, change time, cancel booking, start a new booking search, or open BookedAI
- updated Telegram booking-intent capture copy to explicitly show `booking captured, payment pending` and explain that BookedAI keeps the booking request while provider confirmation/payment instructions are prepared
- kept the Telegram reply format on HTML parse mode for normal booking/search/care replies so headings, labels, portal links, QR links, and controls render as compact professional customer-service messages
- verification passed with focused Telegram webhook regression: `.venv-test/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py -q` (`15 passed`)
- status: local backend implementation and regression coverage are complete; live deploy and real customer Telegram UAT remain the next promotion step

Implementation update from `2026-04-27` (email sender configuration alignment):

- aligned the live repo runtime email identity on `info@bookedai.au`: root `.env` now sets `BOOKING_BUSINESS_EMAIL`, `EMAIL_SMTP_USERNAME`, `EMAIL_SMTP_FROM`, and `EMAIL_IMAP_USERNAME` to the BookedAI mailbox instead of a tenant-specific mailbox, and `supabase/.env` now uses the same mailbox for Supabase email admin/certbot settings
- hardened backend config parsing so blank email env values fall back to `info@bookedai.au` for booking business email, customer support email, SMTP username, SMTP From, and IMAP username
- updated Docker dev/prod compose defaults so backend and beta-backend receive `info@bookedai.au` for SMTP username, SMTP From, and IMAP username when explicit env overrides are omitted
- updated remaining public/admin webapp contact placeholders that still pointed at `hello@bookedai.au` or `operator@bookedai.au`
- verification passed with `python3 -m py_compile backend/config.py`, focused backend pytest for config and booking-assistant email behavior (`18 passed`), direct settings probes for both root `.env` and omitted-env fallback, a source scan for old bookedai.au sender identities, live deploy via `bash scripts/deploy_live_host.sh`, stack health at `2026-04-27T09:28:05Z`, live API/public HTTP smoke, and backend/beta-backend container env probes confirming the four email identity vars all resolve to `info@bookedai.au`
- delivery credential check: SMTP auth against Zoho with the deployed `info@bookedai.au` username currently returns `SMTPAuthenticationError`, so the remaining live-delivery requirement is replacing `EMAIL_SMTP_PASSWORD` and `EMAIL_IMAP_PASSWORD` with valid app passwords for `info@bookedai.au`
- status: sender identity configuration and production deployment are complete; real outbound delivery is blocked until the `info@bookedai.au` mailbox app-password secret is updated

Implementation update from `2026-04-27` (homepage live redeploy):

- redeployed the homepage/web bundle through `python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 deploy-live`, using the fixed Docker host-context path
- preflight frontend TypeScript passed with `npm --prefix frontend exec tsc -- --noEmit`
- production deploy rebuilt/recreated web and beta-web, recreated backend/beta-backend as part of the current deploy wrapper, restarted proxy, and activated the n8n booking intake workflow
- post-deploy verification passed with `bash scripts/healthcheck_stack.sh` at `2026-04-27T08:51:01Z`; `https://bookedai.au/` returned `200` with title `BookedAI | The AI Revenue Engine for Service Businesses`; backend health also returned `200`
- status: homepage live deploy is complete

Implementation update from `2026-04-27` (backend and homepage live promotion):

- redeployed the current backend and homepage/web bundle through `python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 deploy-live`, using the fixed Docker host-context path
- preflight verification passed with backend `py_compile` for route/config/operator modules and frontend TypeScript (`npm --prefix frontend exec tsc -- --noEmit`)
- production deploy rebuilt backend and beta-backend, rebuilt web and beta-web, recreated backend/web/beta containers, restarted proxy, and activated the n8n booking intake workflow
- post-deploy verification passed with `bash scripts/healthcheck_stack.sh` at `2026-04-27T08:20:21Z`; `https://api.bookedai.au/api/health` returned `200` / `{"status":"ok","service":"backend"}`; `https://bookedai.au/` returned `200` with title `BookedAI | The AI Revenue Engine for Service Businesses`
- status: backend and homepage live deploy is complete

Implementation update from `2026-04-27` (customer Telegram live token restore):

- restored the customer-facing `@BookedAI_Manager_Bot` live token settings into both `/home/dovanlong/BookedAI/supabase/.env` and `/home/dovanlong/BookedAI/.env`; this matters because deploy syncs root `.env` from `supabase/.env`
- redeployed on the VPS host with `cd /home/dovanlong/BookedAI && bash scripts/deploy_live_host.sh`; backend, beta-backend, web, and beta-web were recreated, proxy restarted, and the n8n booking intake workflow activated
- reactivated the customer Telegram webhook with `scripts/customer_telegram_bot_manager.py --activate-webhook --webhook-info`; Telegram reports the webhook URL as `https://api.bookedai.au/api/webhooks/bookedai-telegram` with `pending_update_count=0`
- verified `docker compose -f docker-compose.prod.yml --env-file .env config` resolves the customer Telegram token and webhook secret for backend and beta-backend without printing values, and `bookedai-backend-1` has both env vars present
- post-deploy health passed with `bash scripts/healthcheck_stack.sh` at `2026-04-27T06:40:32Z`; live API health returned `200` / `{"status":"ok","service":"backend"}`
- status: env, deploy, and webhook activation are complete; operator can now run the final inbound Telegram test

Implementation update from `2026-04-27` (Docker host-context deploy-live fix):

- fixed the Telegram/OpenClaw deploy-live host-context failure where `deploy_live_host.sh` could still run inside a container without Docker CLI and stop with `Live deploy requires the Docker host environment`
- `scripts/telegram_workspace_ops.py` now resolves `nsenter` explicitly when `/hostfs` is present, including a host-mounted fallback path, and `deploy-live` falls back to the full-host `host-shell` lane when Docker is not available in the current runtime
- verified the OpenClaw CLI runtime has `/hostfs`, Docker socket access, `nsenter`, full trusted Telegram actions, and `host_shell_enabled=true`; inside the CLI, `docker` is absent but `should_use_nsenter_host_exec()` now resolves `/usr/bin/nsenter`, so deploy-live can target the VPS host context
- ran the requested host deploy directly with `cd /home/dovanlong/BookedAI && bash scripts/deploy_live_host.sh`; backend, beta-backend, web, and beta-web were rebuilt/recreated, proxy restarted, and the n8n booking intake workflow activated
- post-deploy verification passed with `bash scripts/healthcheck_stack.sh` at `2026-04-27T06:05:59Z`; live API health returned `200` / `{"status":"ok","service":"backend"}`; OpenClaw CLI remained healthy and full-host
- status: Docker host-context deploy blocker is fixed and live deploy is complete

Implementation update from `2026-04-27` (OpenClaw and Telegram operator full-host default):

- changed the repo default for `@Bookedairevenuebot` / OpenClaw operator work from rootless break-glass to trusted full-host access by default, per latest operator instruction
- `scripts/telegram_workspace_ops.py` now includes `host_shell`, `openclaw_runtime_admin`, and `full_project` in the default trusted Telegram action set, and treats `BOOKEDAI_ENABLE_HOST_SHELL` as enabled by default unless explicitly disabled
- `deploy/openclaw/docker-compose.yml` now runs `openclaw-cli` as root (`0:0`) with `privileged: true`, `pid: host`, `/hostfs`, and `/var/run/docker.sock`, while keeping the public Telegram control surface on trusted actor allowlist rather than opening it to every Telegram sender
- `deploy/openclaw/.env`, `.env.example`, `.env.production.example`, and `deploy/openclaw/.env.example` now carry the full-access defaults: `BOOKEDAI_ENABLE_HOST_SHELL=1` and the full trusted action vocabulary
- `enable-openclaw-full-access` was corrected for OpenClaw v2026.4.15 schema: `askFallback` is now removed from `openclaw.json` and kept only in `exec-approvals.json`, avoiding the gateway/CLI config validation error
- live OpenClaw runtime config at `/home/dovanlong/.openclaw-bookedai-v3/openclaw.json` was updated to `tools.exec.security=full`, `tools.exec.ask=off`, trusted Telegram allowlist `8426853622`, webchat elevated access, and `agents.defaults.elevatedDefault=full`
- live OpenClaw compose was recreated with the full-host defaults; verification confirmed `openclaw-bookedai-cli` runs as `user=0:0`, `privileged=true`, `pid=host`, with `/hostfs`, `/var/run/docker.sock`, and `/workspace/bookedai.au` mounted
- verification passed with Python compile, OpenClaw compose config validation, env checksum refresh, permission snapshot showing `host_shell_enabled=true`, direct `host-shell` smoke returning `/`, runtime gateway health `{"ok":true,"status":"live"}`, and CLI health `healthy`
- documentation was updated across README, project memory, OpenClaw README, PM operating notes, and daily memory to record the new full-access default and its security posture
- status: repo-side and live OpenClaw full-access default is implemented for trusted operator sessions

Implementation update from `2026-04-27` (backend live redeploy and Telegram operator permission boundary):

- redeployed the live stack through the approved operator entrypoint `python3 scripts/telegram_workspace_ops.py deploy-live`; backend, beta-backend, web, and beta-web images rebuilt, containers were recreated, the proxy restarted, and the n8n booking intake workflow was activated
- fixed a frontend build blocker encountered during deploy by importing and using the existing `lucide-react` `MessageCircle` icon in `BookingAssistantDialog.tsx` for the Telegram care CTA, replacing the undefined `MessageIcon` reference
- verified the backend/customer-care slice before promotion with backend `py_compile` and focused pytest for communication, Telegram webhook, and booking routes (`24 passed`), then verified frontend TypeScript with `npm --prefix frontend exec tsc -- --noEmit`
- post-deploy verification passed with `bash scripts/healthcheck_stack.sh` at `2026-04-27T05:48:02Z`, and `https://api.bookedai.au/api/health` returned `200` / `{"status":"ok","service":"backend"}`
- Telegram operator permissions were checked for trusted actor `8426853622`: `deploy_live`, `host_command`, build/test/workspace actions, and allowlisted host programs are available; unrestricted `host_shell` remains disabled unless an explicit break-glass session sets `BOOKEDAI_ENABLE_HOST_SHELL=1`
- status: backend fix is live; the operator bot has the approved deploy/host-maintenance authority without broad default root shell access

Implementation update from `2026-04-27` (Phase 19 Telegram care handoff, admin reliability spotlight, and webhook metadata preservation):

- extended the public/product booking surfaces so `BookingAssistantDialog.tsx` and `HomepageSearchExperience.tsx` expose `@BookedAI_Manager_Bot` handoff links before booking and after booking, using service-aware context before confirmation and booking-reference-aware deep links after confirmation
- added backend Telegram deep-link support in `backend/api/route_handlers.py` so `/start bk.<booking_reference>` resumes booking-aware customer-care context rather than falling back to a generic start flow
- expanded admin reliability/integrations data and UI to surface protected customer-agent health, Telegram reply delivery/callback acknowledgement, webhook backlog, identity-resolution watchlist, and tenant-scoped CRM/email/notify spotlight data
- fixed a Phase 19 Telegram edge case in `telegram_webhook(...)`: `care_metadata.lifecycle_updates` now survives later `queued_request` / delivery metadata merges instead of being overwritten when multiple booking side effects occur in the same turn
- added/updated focused QA around Telegram booking-intent lifecycle metadata so the response can carry lifecycle updates, CRM sync deal/task, email confirmation state, and nested email CRM task evidence together
- verification passed with `npm --prefix frontend run lint` (`tsc --noEmit`) and focused backend/frontend code review of the changed Telegram/admin paths; the parallel QA follow-up also confirmed the expected metadata shape in `backend/tests/test_telegram_webhook_routes.py`
- status: local implementation is complete; next follow-ups are enabling the backend test environment in this workspace for direct pytest reruns and executing tenant `chess` UAT for Telegram booking/deep-link/customer-care continuity

Implementation update from `2026-04-27` (public pitch video replacement refresh 3):

- replaced the homepage and pitch embedded MP4 with `https://upload.bookedai.au/videos/9eb8/BhVuOlB2QXlBo-_nyOFCcA.mp4`
- updated both `bookedai.au` (`PublicApp.tsx`) and `pitch.bookedai.au` (`PitchDeckApp.tsx`) to use the same refreshed uploaded video URL for native playback and direct fallback links
- direct media verification confirmed the replacement MP4 returns `206`, `content-type: video/mp4`, and byte-range support
- verification passed with frontend TypeScript, production build, live deploy through `python3 scripts/telegram_workspace_ops.py deploy-live`, stack healthcheck, and live bundle checks confirming both production chunks now contain the refreshed MP4 URL and not the prior `0cfb` MP4 URL

Implementation update from `2026-04-27` (homepage and pitch product-proof image placement):

- added the uploaded product-proof screenshot `https://upload.bookedai.au/images/df6e/iarJydFRgp1aWGk5UF0d7g.png` to `bookedai.au` immediately after the chess tenant proof block, framed as the bridge from vertical proof into the broader BookedAI product workspace
- added the same uploaded evidence image inside the `pitch.bookedai.au` `Product proof` section, below the existing UI proof cards and before the product/demo CTAs
- updated the landing-page requirement baseline and master roadmap Phase 17 notes so the proof placement is tracked as a public/pitch evidence-surface change
- added the closeout note `docs/development/public-pitch-proof-image-placement-2026-04-27.md`
- verification passed with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, and `git diff --check`
- published the closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-27/030128-public-and-pitch-product-proof-image-placement.md`
- status: local implementation and verification are complete; live deployment was not run in this turn

Implementation update from `2026-04-27` (Product full-flow UI/UX review and regression):

- merged duplicate Product page flow wording into one customer journey: `Chat request -> Search -> Preview -> Select -> Book -> Payment posture -> Thank You / Portal -> Add calendar -> CRM/email/messaging -> Telegram/customer-care handoff`
- updated `product.bookedai.au` shell copy and flow rail from `Search / Match / Book / Follow-up` to `Chat / Search / Preview / Book / Pay / Care`
- replaced generic Product assistant welcome shortcuts with the four current proof verticals: `Chess`, `Future Swim`, `AI Event WSTI`, and `AI Mentor 1-1`, with all four visible on compact mobile
- updated `BookingAssistantDialog.tsx` so welcome copy, in-form journey, confirmation journey, operation timeline, and confirmation message previews all reflect the full flow while preserving truthful pending/queued/ready status language
- added a customer-care preview card for `BookedAI Manager Bot / portal` handoff using the booking reference and portal URL, without claiming a Telegram outbound send happened when no session status says so
- refreshed Product regression coverage for the new flow rail, shortcut set, confirmation-care handoff, mobile responsive full-flow UAT at `390x844`, and desktop web app UAT through the preview modal
- removed the duplicate post-booking QR block so the Thank You state has one booking-portal QR, with the lower panel simplified to booking summary and portal actions
- hardened live-read Product popup behavior: chat-copy streaming failure now falls back softly so V1 search results still render, and service cards again show tenant/public-web provenance, `Book online`, and next-step/callback guidance
- improved slow-search UX/performance: Product now shows instant local/catalog matches while live-read ranking verifies availability, maps, partner links, and Internet sources; the rich customer-agent turn is time-boxed and duplicate shadow search is skipped when live-read has already grounded the results
- extended booking automation with linked Telegram follow-up: after booking, the frontend calls the backend Telegram-by-phone handoff; the backend sends through `@BookedAI_Manager_Bot` only when a matching Telegram chat session is linked, otherwise records a queued/manual-link state because Telegram cannot initiate a chat from phone alone
- tightened the Thank You decision layout into compact portal review/edit/reschedule/cancel/Telegram care cards, and updated confirmation previews to show email sent from `info@bookedai.au`
- refreshed Product regression coverage to assert exactly one confirmation QR after service and event booking submit
- verification passed with `python3 -m py_compile backend/api/v1_communication_handlers.py backend/api/v1_communication_routes.py`, `npm --prefix frontend exec tsc -- --noEmit`, `cd backend && ../.venv/bin/python -m pytest tests/test_api_v1_communication_routes.py tests/test_api_v1_booking_routes.py -q` (`12 passed`), `cd frontend && npx playwright test tests/product-app-regression.spec.ts --workers=1 --reporter=line` (`6 passed`), `cd frontend && PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-live-read.spec.ts --grep "product popup" --workers=1 --reporter=line` (`4 passed`), `npm --prefix frontend run build`, and `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh` (all checks passed)
- live rollout completed with `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T02:45:45Z`, `https://product.bookedai.au/` returned `HTTP/2 200`, the live product bundle contains the slow-search status, `@BookedAI_Manager_Bot`, `From: info@bookedai.au`, and all four proof-vertical shortcuts, and mobile live smoke at `390x844` confirmed the assistant input, shortcuts, and horizontal overflow `0`
- status: Product full-flow UI/UX merge, slow-search performance UX, linked Telegram care, regression/UAT, release gate, live deploy, and live smoke are closed

Implementation update from `2026-04-26` (public pitch video replacement refresh 2):

- replaced the homepage and pitch embedded MP4 with `https://upload.bookedai.au/videos/0cfb/LCpooAUVSsL24QXMvIBR0A.mp4`
- updated both `bookedai.au` (`PublicApp.tsx`) and `pitch.bookedai.au` (`PitchDeckApp.tsx`) to use the same refreshed uploaded video URL for native playback and direct fallback links
- direct media verification confirmed the replacement MP4 returns `206`, `content-type: video/mp4`, and byte-range support
- verification passed with frontend TypeScript, production build, live deploy through `python3 scripts/telegram_workspace_ops.py deploy-live`, stack healthcheck, and live bundle checks confirming both production chunks now contain the refreshed MP4 URL and not the prior `2cc8` MP4 URL

Implementation update from `2026-04-26` (Sprint 19 P0-5 live smoke, P0-4 index reconciliation, and Phase 17 P1-9 Future Swim hotfix):

- closed the P0-5 live evidence gap by authenticating against the live tenant password endpoint and confirming a public assistant booking-path request with a mismatched `actor_context.tenant_id` returns `403` with `actor_context.tenant_id does not match the authenticated tenant session.`
- reconciled the P0-4 repo/docs mismatch by adding `backend/migrations/sql/022_inbound_webhook_idempotency_evidence_indexes.sql`; the live DB now has the webhook/idempotency evidence indexes on `webhook_events` and `idempotency_keys`
- applied the P1-9 Future Swim Miranda hotfix live: pre-check confirmed `https://futureswim.com.au/locations/miranda/` returns `404` and the catalog still pointed at it; the live row now points to `https://futureswim.com.au/locations/`, which returns `200`
- verification passed with `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py backend/tests/test_api_v1_search_routes.py -q` (`28 passed`), `.venv/bin/python -m py_compile backend/api/route_handlers.py backend/repositories/idempotency_repository.py backend/repositories/webhook_repository.py`, and `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py -q` (`21 passed`)
- status: P0-5 is closed live; P1-9 is closed live; P0-4 code and evidence indexes are live, with Telegram customer UAT still carried until a `BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID` is available and the operator evidence drawer is surfaced

Implementation update from `2026-04-26` (Phase 19 P1-3 WhatsApp parity tests and FX-2 shared API timeout):

- closed the local P1-3 WhatsApp webhook parity coverage gap by extending `backend/tests/test_whatsapp_webhook_routes.py` with identity-gate, queued reschedule, and Internet expansion cases that mirror the Telegram suite
- added the first FX-2 network-resilience pass in `frontend/src/shared/api/client.ts`: shared typed API calls now use an exported `fetchWithTimeout()` helper with a `30s` default timeout, caller `AbortSignal` forwarding, cleanup of timers/listeners, and `ApiClientError(status=0)` for timeout UX paths
- verification passed with `.venv/bin/python -m py_compile backend/tests/test_whatsapp_webhook_routes.py`, `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py -q` (`24 passed`), `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, and `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh`; the full gate covered checksum verification, frontend smoke lanes, tenant smoke, backend unittest (`52 tests`), and search eval (`14/14 passed`)
- live rollout completed with `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh` passed at `2026-04-26T23:38:05Z`, public/product/pitch/tenant/admin hosts returned `200`, and the live bookedai.au bundle contains the timeout-enabled shared client chunk
- status: P1-3 is closed locally for webhook parity coverage; FX-2 shared-client first pass is closed live, with the broader direct-`fetch` cleanup still carried for admin uploads, streaming, and legacy public fetch paths

Implementation update from `2026-04-26` (Phase 17 P1-8 pitch coverage and P1-7 regression closeout):

- added `frontend/tests/pitch-deck-rendering.spec.ts` to cover the investor pitch deck at `1440px` desktop and `390px` mobile, including hero narrative, GM Chess proof, pitch video section, architecture visual, final CTA, no-horizontal-overflow, and the refreshed hosted MP4 source
- repaired the stale product regression selectors from the previous P1-7 follow-up: phone helper checks now respect the current `aria-describedby` accessible-name behavior, email fields use exact role selectors, booking submission clicks the current `Confirm Booking Request` action, and the session stub now matches runtime query strings
- verification passed with `npm --prefix frontend exec tsc -- --noEmit`, `cd frontend && npx playwright test tests/pitch-deck-rendering.spec.ts --workers=1 --reporter=line` (`3 passed`), `cd frontend && npx playwright test tests/product-app-regression.spec.ts --workers=1 --reporter=line` (`4 passed`), and `git diff --check`
- full root gate also passed with `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh`; the gate covered env checksum, frontend smoke lanes, tenant smoke, backend unittest (`49 tests`), and search eval (`14/14 passed`)
- status: P1-8 is closed locally; the prior P1-7 product regression rerun follow-up is now closed locally. Live promotion remains tied to the next frontend deploy/release gate.
- published the closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/165259-phase-17-p1-8-pitch-coverage-and-p1-7-regression-follow-up-closed.md`
- published the release-gate pass summary to Notion and Discord; archive entry is `docs/development/telegram-sync/2026-04-26/170219-release-gate-passed-after-p0-8-and-p1-8-closeouts.md`

Implementation update from `2026-04-26` (Sprint 19 P0-8 OpenClaw rootless operator boundary):

- closed the repo-side P0-8 hardening patch by making `deploy/openclaw/docker-compose.yml` run `openclaw-cli` as `OPENCLAW_CLI_USER=1000:1000` by default instead of `root`, removing default `privileged`, `pid: host`, `/hostfs`, and `/var/run/docker.sock` mounts
- removed `host_shell`, `openclaw_runtime_admin`, and `full_project` from the default Telegram/OpenClaw action vocabulary in compose, `.env.example`, and `scripts/telegram_workspace_ops.py`
- added `BOOKEDAI_ENABLE_HOST_SHELL=1` as an explicit break-glass requirement before `host-shell` can run, while keeping allowlisted `host-command`, repo-scoped commands, and read-only status checks available
- updated Phase 0/Sprint 1 historical metadata so those docs now agree with the 2026-04-26 master roadmap: Phase 0 and Sprint 1 are closed baselines, not active work queues
- verification passed with Python compile, host-shell negative gate, permissions snapshot, and compose config checks; live OpenClaw rollout then recreated the stack, verified gateway health, verified `openclaw-cli` runs as uid `1000`, verified no `/hostfs` or Docker socket exposure, verified the live action vocabulary excludes `host_shell`/`full_project`, and verified `host-shell` is blocked without break-glass
- published the closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/162433-sprint-19-p0-8-openclaw-operator-boundary-hardened.md`

Implementation update from `2026-04-26` (public pitch video replacement refresh):

- replaced the homepage and pitch embedded MP4 with `https://upload.bookedai.au/videos/2cc8/fxu3H6DZDcFOvpjc9UlOmQ.mp4`
- updated both `bookedai.au` (`PublicApp.tsx`) and `pitch.bookedai.au` (`PitchDeckApp.tsx`) to use the same refreshed uploaded video URL for native playback and direct fallback links
- direct media verification confirmed the replacement MP4 returns `206`, `content-type: video/mp4`, and byte-range support
- verification passed with frontend TypeScript, production build, live deploy through `python3 scripts/telegram_workspace_ops.py deploy-live`, stack healthcheck, and live bundle checks confirming both production chunks now contain the refreshed MP4 URL

Implementation update from `2026-04-26` (Sprint 19 P0-7 env checksum guard):

- added `scripts/verify_env_production_example_checksum.sh` and `checksums/env-production-example.sha256` so changes to `.env.production.example` must intentionally refresh the checksum with `scripts/verify_env_production_example_checksum.sh --update`
- wired the checksum guard into `scripts/run_release_gate.sh` before the frontend/backend release checks, keeping local promotion gates aligned
- GitHub Actions workflow publication remains a follow-up because the available GitHub token rejected workflow-file updates without `workflow` scope
- verification passed with `scripts/verify_env_production_example_checksum.sh`, `bash -n scripts/verify_env_production_example_checksum.sh scripts/run_release_gate.sh`, `git diff --check`, and `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh`; the full release gate completed checksum verification, frontend smoke lanes, tenant smoke, backend unittest (`49 tests`), and search eval (`14/14 passed`)

Implementation planning update from `2026-04-26` (PM phase execution operating system):

- added `docs/development/phase-execution-operating-system-2026-04-26.md` as the PM control document for executing BookedAI from historical Phase `0` through final Phase `23`
- defined agent lanes for Product/PM, Frontend, Backend, Security/Validation, QA/UAT, DevOps/Live, Data/Revenue, and Content/GTM so work is assigned by responsibility and proof type
- locked the phase closeout gate: requirement baseline, implementation, automated verification, UAT evidence, deploy-live when runtime changes, live smoke, progress/roadmap docs, Notion/Discord, and next-phase opening
- mapped the active execution board to Sprint `19` P0/P1 items, with Phase `0-16` preserved as delivered baselines and active execution starting from Phase/Sprint `17-23`
- synchronized the PM operating reference into `project.md` and `docs/architecture/bookedai-master-roadmap-2026-04-26.md`
- published the closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/143633-bookedai-pm-phase-execution-operating-system.md`

Phase gate verification from `2026-04-26` (Sprint 19 P0-1 portal and booking continuity):

- started active execution under the new PM operating board by checking the first Phase 17 P0 gate
- backend focused verification passed with `.venv/bin/python -m pytest backend/tests/test_api_v1_portal_routes.py backend/tests/test_api_v1_booking_routes.py -q` (`17 passed`)
- live stack health passed with `bash scripts/healthcheck_stack.sh` at `2026-04-26T14:37:15Z`
- no deploy-live was needed because this pass only added PM control docs and ran verification; the next runtime change must still complete deploy-live plus live booking-to-portal smoke before phase advancement
- published the verification closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/143759-bookedai-sprint-19-p0-1-phase-gate-verification.md`

Implementation planning update from `2026-04-26` (Sprint 19 P0-2 WhatsApp provider posture):

- added `docs/development/whatsapp-provider-posture-decision-2026-04-26.md` to record the active WhatsApp provider decision for Phase 19
- reconciled the older Evolution-primary README/project wording with the newer operator decision: Twilio is now the configured default, Evolution outbound fallback is disabled, Meta is blocked until registration completes, and Twilio remains queued/manual-review until credentials or sender posture are repaired
- documented the release rule that WhatsApp inbound/policy can stay active, but outbound customer-visible delivery must not be claimed as production-ready until a provider returns a verified send/delivered state
- updated `README.md`, `project.md`, and the PM operating board so P0-2 is `decision recorded, provider delivery still blocked`
- published the P0-2 decision closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/144011-bookedai-sprint-19-p0-2-whatsapp-provider-posture-decision.md`

Implementation update from `2026-04-26` (Sprint 19 P1-7 frontend UI/UX stabilization):

- closed the documented frontend P1-7 accessibility/mobile debt for the active Phase 17 stabilization lane
- linked the product assistant phone helper text to the phone input with `aria-describedby` in `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`, so assistive technology receives the email-or-phone requirement and SMS/WhatsApp guidance with the control
- linked the homepage booking form phone helper with `aria-describedby` in `frontend/src/apps/public/HomepageSearchExperience.tsx`, matching the same accessibility contract on the public booking surface
- replaced the admin bookings table horizontal-scroll fallback below `720px` with contained responsive booking cards, preserving the desktop grid while hiding the header and exposing per-field labels on narrow operator screens
- tightened product fallback-mode copy so the product surface no longer says booking confirmation is “enabled shortly”; it now reflects the current search, booking, and follow-up baseline
- verification passed with `npm --prefix frontend exec tsc -- --noEmit` and `cd frontend && npx playwright test tests/admin-bookings-filters.spec.ts --workers=1 --reporter=line` (`2 passed`)
- attempted `cd frontend && npx playwright test tests/product-app-regression.spec.ts --workers=1 --reporter=line`; the run first exposed stale selectors that were updated, then the rerun was terminated with exit `143` while another workspace Playwright smoke/build lane was still active, so full product-suite rerun remains a follow-up before live promotion
- published the partial closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/150208-sprint-19-p1-7-frontend-ui-ux-stabilization.md`

Implementation planning update from `2026-04-26` (SME, investor, judge, and financial wording upgrade):

- upgraded the selected BookedAI messages across `project.md`, `prd.md`, `README.md`, `DESIGN.md`, `docs/architecture/bookedai-master-prd.md`, `docs/architecture/bookedai-master-roadmap-2026-04-26.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, and `docs/development/next-phase-implementation-plan-2026-04-25.md`
- set the SME-facing hero around the painkiller promise: `Never lose a service enquiry to slow replies again`, with booking path, payment follow-up, and customer care as the concrete outcomes
- set the investor/judge narrative around the big-tech/startup thesis: BookedAI as an omnichannel agent layer that captures intent, creates booking references, tracks payment/follow-up posture, and records revenue actions in an auditable operating system
- made the financial story explicit in the planning baseline: setup fee, SaaS subscription, and performance-aligned commission or revenue share where appropriate, backed by booking references, payment posture, portal reopen, tenant Ops, audit/action evidence, and release gates
- tightened the omnichannel product requirement wording so it says BookedAI supports payment/receivable follow-up and records customer-care actions, avoiding overclaiming instant payment collection or lifecycle completion before backend state confirms it
- published the closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/143051-bookedai-sme-investor-judge-wording-upgrade.md`

Implementation planning update from `2026-04-26` (content, wording, launch, and lifecycle planning alignment):

- applied the requested content/startup/marketing/launch/email/experiment lenses to the active requirement and execution docs without changing the Phase `17-23` technical boundaries
- added a master content baseline to `project.md`: customer-facing message hierarchy, document layout order, startup-canvas trade-offs, North Star/supporting metrics, launch cadence, lifecycle email scope, and XYZ-style experiment hypotheses
- expanded `docs/architecture/bookedai-master-prd.md` with wording rules, a plain-English product message, working-backwards phase stories, content-market-fit topics, owned email segments, and experiment requirements
- updated `docs/architecture/implementation-phase-roadmap.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, and `docs/development/next-phase-implementation-plan-2026-04-25.md` so future plans lead with customer pain, shipped proof, measurable outcome, launch/email follow-up, and customer-safe copy before implementation inventory
- current approved plain-English message for docs and public copy is now: `BookedAI turns missed service enquiries into booked revenue. It captures intent across chat, calls, email, web, and messaging apps, then helps book, follow up, track payment posture, and show operators what revenue was won or still needs action.`
- published the closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/141225-bookedai-content-wording-and-launch-planning-alignment.md`

Implementation update from `2026-04-26` (Phase 23 release-gate security fixtures):

- completed the recommended Phase 23 follow-up by adding `backend/tests/test_release_gate_security.py` and wiring it into `scripts/run_release_gate.sh`
- added provider URL allowlisting inside `MessagingAutomationService`: Telegram result controls and chat-compatible service-search responses now only carry `http` or `https` provider URLs, while unsafe provider links are omitted or fall back to the BookedAI web assistant
- expanded the root backend gate to run chat-send, Telegram webhook, and WhatsApp webhook fixtures so customer-channel identity policy, reply controls, callback handling, and messaging intake stay inside the normal promote-or-hold check
- updated `docs/development/release-gate-checklist.md` and `docs/development/source-code-review-and-security-hardening-2026-04-26.md` to mark HTML rendering, provider URL allowlisting, and private-channel identity fixtures as closed gate additions
- verification passed with `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/tests/test_release_gate_security.py`, `.venv/bin/python -m pytest backend/tests/test_release_gate_security.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_lifecycle_ops_service.py -q` (`45 passed`), `.venv/bin/python -m unittest backend.tests.test_release_gate_security backend.tests.test_chat_send_routes backend.tests.test_telegram_webhook_routes backend.tests.test_whatsapp_webhook_routes` (`22 tests`), `npm --prefix frontend exec tsc -- --noEmit`, and `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh` (`all checks passed`)
- published the closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/140825-phase-23-release-gate-security-fixtures-added.md`

Implementation update from `2026-04-26` (source review and confirmation email security hardening):

- reviewed the active codebase through the installed architecture, backend security, API hardening, frontend/UI, DevOps, AI-agent, chat UI, and testing skill lenses, using `project.md` plus the current phase/sprint docs as the source-of-truth baseline
- fixed a shared confirmation email HTML rendering risk in `backend/service_layer/communication_service.py`: customer/provider-controlled confirmation values are now HTML-escaped, `mailto:` support links are safely encoded, and payment/manage/public app links must be `http` or `https` before rendering into the email CTA
- added regression coverage in `backend/tests/test_lifecycle_ops_service.py` proving script tags, HTML tags, injected image markup, and `javascript:` payment links do not render as active HTML/actions in confirmation emails
- documented the review and next recommendations in `docs/development/source-code-review-and-security-hardening-2026-04-26.md`; the main follow-up is to fold HTML rendering, provider URL allowlisting, and customer-channel identity fixtures into Phase 23 release governance
- verification passed with backend py_compile for communication/customer-agent modules, `.venv/bin/python -m pytest backend/tests/test_lifecycle_ops_service.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py -q` (`34 passed`), and `npm --prefix frontend exec tsc -- --noEmit`
- published the closeout to Notion and Discord via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/135315-source-review-and-confirmation-email-security-hardening.md`

Implementation planning update from `2026-04-26` (architecture, phase, sprint, and urgent execution lock):

- added a refreshed whole-project architecture baseline to `project.md`, treating BookedAI as one AI Revenue Engine across customer acquisition surfaces, customer action channels, tenant surfaces, operator surfaces, FastAPI/backend contracts, revenue core, Messaging Automation Layer, data/integration rails, and governance/release discipline
- locked the current executable phase sequence as Phase `17` through `23`: full-flow stabilization, revenue-ops ledger control, customer-care/status agent, widget/plugin runtime, confirmation wallet plus Stripe return continuity, billing/receivables/subscription truth, reusable multi-tenant templates, and release governance/scale hardening
- translated the older sprint chain into the current operating sprint map: Sprint `1-3` baseline lock, Sprint `4-7` truth/reporting/workflow foundations, Sprint `8-10` tenant/admin commercial foundations, Sprint `11-16` SaaS user-surface and release hardening, then Sprint `17-23` as the active capture-to-retention execution program
- closed the urgent execution priority order for the next implementation window: first UI/UX stabilization, second the standard booking flow, third Messaging Automation Layer consolidation
- defined the standard booking journey as `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`, requiring explicit booking intent, durable booking reference, QR/portal handoff, email/calendar/chat continuity, and request-safe lifecycle changes
- defined the Messaging Automation Layer execution target as one shared channel policy across website chat, Telegram, WhatsApp, portal care, tenant notifications, and later SMS/email, with normalized Inbox events, safe identity lookup, booking-care status answers, and auditable workflow/action side effects
- synchronized the requirement-facing baseline in `project.md` and prepared the execution-side plan updates in `docs/development/next-phase-implementation-plan-2026-04-25.md` plus `docs/architecture/current-phase-sprint-execution-plan.md`

Implementation update from `2026-04-26` (tenant booking email CC and Telegram notification):

- refined homepage/product booking email handling for tenant-owned catalog services: BookedAI remains the operational sender/recipient through `BOOKING_BUSINESS_EMAIL` / `info@bookedai.au`, while the saved tenant service `business_email` is CC'd on the internal booking lead notification when present
- extended public catalog response items with tenant ownership metadata (`tenant_id`, `owner_email`) so booking-session logic can distinguish tenant-owned services from generic public catalog entries before deciding whether to CC tenant email
- added a tenant booking notification helper to `MessagingAutomationService`; it defaults tenant notifications to Telegram, reads flexible tenant settings such as `messaging_automation.tenant_notifications.telegram_chat_id(s)`, and queues a clear warning when no tenant Telegram chat id is configured yet
- homepage booking session events now record the tenant notification delivery state, giving operators an audit trail for whether the tenant was notified through the Messaging Automation Layer
- verification passed with `python3 -m py_compile backend/services.py backend/schemas.py backend/service_layer/messaging_automation_service.py backend/service_layer/admin_presenters.py backend/api/route_handlers.py` and `.venv/bin/python -m pytest backend/tests/test_booking_assistant_service.py -q` (`14 passed`)

Implementation update from `2026-04-26` (homepage shortcut search speed and vertical discovery):

- updated homepage shortcut copy so the first-click searches carry exact high-signal terms for `Future Swim`, `Co Mai Hung Chess`, and `WSTI AI Event / Western Sydney Startup Hub`
- added a fast-preview layer in `HomepageSearchExperience` that detects swim, chess, and WSTI/AI-event intent and shows matching BookedAI catalog or WSTI shortcut results immediately while live ranking, event discovery, and booking-path checks continue
- preserved the location guardrail for broad `near me` searches: shortcut previews do not appear for location-sensitive near-me queries unless the query includes an explicit area such as Sydney, Caringbah, or Western Sydney Startup Hub
- added Playwright coverage proving Future Swim, WSTI AI Event, and Co Mai Hung Chess shortcut searches render visible results before a deliberately delayed live ranking response completes
- verification passed with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, and `cd frontend && PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-live-read.spec.ts --grep "homepage shortcut searches" --workers=1 --reporter=line`
- additional broad Playwright guardrail grep for existing chess near-me/tenant-intent cases was attempted, but the worker was terminated with exit `143` before completion in this environment; the new focused shortcut regression passed

Implementation update from `2026-04-26` (BookedAI Manager Bot Telegram result UX):

- added existing-order search continuity for Telegram customer booking: when a resolved customer booking is active and the customer asks for another option, `BookedAI Manager Bot` now asks what should happen with the current order before searching further
- the confirmation menu includes `Open current order portal`, `Open order QR`, `Keep current booking, search BookedAI.au`, `Find Internet options, keep current booking`, and `Change current booking`
- booking-intent capture replies now include the `BookedAI.au` website, `https://portal.bookedai.au` portal link, and QR link for the order, preserving portal-first continuation from Telegram
- the keep-current-booking override now allows a new BookedAI.au or Internet search while appending a `Return to current order` Telegram control so the customer can come back to the old booking
- upgraded BookedAI customer Telegram replies from plain text to Telegram HTML rich text for service-search cards, existing-order confirmation, and booking handoff; dynamic content is HTML-escaped and the Telegram adapter now accepts `parse_mode="HTML"`
- action labels were tightened to Telegram-native buttons such as `Open full results`, `View option n`, `Book option n`, `Find more on Internet`, and `Return to current order`
- verification passed with `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/api/route_handlers.py`, `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py -q` (`10 passed`), and `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py -q` (`11 passed`)
- follow-up verification for rich Telegram rendering passed with `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py` and `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase::test_send_telegram_includes_html_parse_mode_when_requested -q` (`12 passed`)

- reviewed the current Telegram Bot API structure for `sendMessage`, inline keyboards, URL buttons, and callback buttons, then kept the customer bot payload plain-text plus `reply_markup` so messages remain resilient in Telegram clients
- reformatted service-search replies from long list copy into compact result cards: short heading, `Search:` context, `Option n` sections, provider/location/price/source posture, trimmed summary, and one clear booking instruction per option
- upgraded the inline keyboard structure to `Open full results in BookedAI`, per-option `View n` URL actions, per-option `Book n` callback actions, and `Find more on Internet near me` only before the search has already been expanded
- booking-intent capture replies now include a Telegram `Open booking portal` button beside the booking reference and portal URL, keeping the post-booking handoff native to Telegram while preserving the portal-first customer contract
- verification passed with `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py` and `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py -q` (`9 passed`)

Implementation update from `2026-04-26` (BookedAI customer booking support identity):

- added a backend customer-booking contact contract so BookedAI-managed support/contact defaults resolve to `info@bookedai.au` and `+61455301335` across customer booking channels
- exposed `BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL` and `BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE` in env examples, defaulting to the BookedAI email and phone while preserving existing `BOOKING_BUSINESS_EMAIL` and `WHATSAPP_FROM_NUMBER` behavior
- updated portal booking snapshots, care-turn replies, Telegram/WhatsApp fallback copy, and booking confirmation templates so customer-booking support mentions the BookedAI email and the phone as available for Telegram, WhatsApp, or iMessage instead of falling back to provider catalog contacts
- updated the portal UI fallback to show `info@bookedai.au`, `+61455301335`, and the Telegram/WhatsApp/iMessage channel posture when booking support data is missing
- verification passed with `python3 -m py_compile backend/core/customer_booking_contact.py backend/config.py backend/service_layer/communication_service.py backend/service_layer/messaging_automation_service.py backend/service_layer/tenant_app_service.py backend/api/route_handlers.py`, `.venv/bin/python -m pytest backend/tests/test_config.py backend/tests/test_api_v1_portal_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_booking_assistant_service.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase -q` (`51 passed`), and `npm --prefix frontend exec tsc -- --noEmit`

Implementation update from `2026-04-26` (homepage service booking email recipient alignment):

- fixed the legacy homepage `/booking-assistant/session` service-booking path so provider catalog email values such as Future Swim branch addresses are no longer used as the operational booking recipient/support identity
- `BookingAssistantService.create_session()` now routes service booking customer confirmations, internal booking-lead notifications, manual follow-up links, response `contact_email`, and workflow metadata through `BOOKING_BUSINESS_EMAIL`, defaulting to `info@bookedai.au`
- kept provider `business_email` values available in the catalog/admin data model, but removed them from homepage booking email delivery so public BookedAI bookings stay under the BookedAI mailbox
- verification passed with `.venv/bin/python -m pytest backend/tests/test_booking_assistant_service.py -q` (`13 passed`)

Implementation planning update from `2026-04-26` (omnichannel AI Revenue Engine product requirement):

- added the product requirement message that BookedAI connects WhatsApp, SMS, Telegram, email, and web chat into one AI Revenue Engine that captures intent, creates booking paths, supports payment and receivable follow-up, and records customer-care actions with operator-visible revenue evidence
- aligned the requirement with the current Messaging Automation Layer baseline: channel webhooks normalize customer messages into Inbox/conversation events, the shared booking-care policy resolves intent and booking identity, and workflow/audit/outbox side effects drive follow-up, payment support, and retention actions
- mapped the requirement into the active Phase 19-23 plan: Phase 19 owns omnichannel intake/status care, Phase 20 owns web-chat/widget distribution, Phase 21 owns payment and receivables continuity, Phase 22 owns reusable retention templates, and Phase 23 owns release-gated verification across the complete journey
- synchronized the planning language into `project.md`, `README.md`, `DESIGN.md`, `docs/development/next-phase-implementation-plan-2026-04-25.md`, and `docs/architecture/current-phase-sprint-execution-plan.md`

Implementation update from `2026-04-26` (Messaging Automation Layer and Telegram-first webhook):

- added `backend/service_layer/messaging_automation_service.py` as the shared customer messaging agent service for WhatsApp, Telegram, and future SMS/email/Apple Messages surfaces
- aligned the channel structure around two explicit entrypoints: website chat now calls `POST /api/chat/send` directly and receives the BookedAI AI Engine response on the web, while Telegram receives provider updates at `POST /api/webhooks/telegram` or `POST /api/webhooks/bookedai-telegram`, runs the same AI Engine, then replies through Telegram `sendMessage`
- kept `POST /api/booking-assistant/chat` and `POST /api/booking-assistant/chat/stream` as backward-compatible aliases while moving current website chat calls to `POST /api/chat/send` and the streaming companion `POST /api/chat/send/stream`
- created `deploy/openclaw/agents/bookedai-booking-customer-agent.json` as the always-on OpenClaw manifest for `BookedAI Booking Customer Agent`; it uses OpenAI auth through `OPENAI_API_KEY`, can search BookedAI service data plus internet/public-web fallback through the BookedAI AI Engine, and is explicitly customer-facing with no repo-write, deploy, or host-shell authority
- updated `python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent` so the default manifest sync installs `bookedai-booking-customer-agent`; the older WhatsApp-specific manifest remains available through `--legacy-whatsapp-agent`
- synced the new OpenClaw agent manifest into the live OpenClaw runtime at `/home/dovanlong/.openclaw-bookedai-v3/agents/bookedai-booking-customer-agent.json`
- clarified and enforced the surface split: website demo/product chat is a public web-user surface that can search all BookedAI catalog data and Internet/public-web expansion, while Telegram is a private customer-thread surface that can chat/search like the website but loads booking-specific answers only through booking reference or safe phone/email identity, never Telegram chat id alone
- updated the Telegram intent policy so booking-care phrases such as status/payment/confirm/reschedule/cancel are handled before new-booking intake; without a reference or phone/email identity, the bot now asks for the booking reference or booking email/phone instead of starting a new booking
- added `scripts/customer_telegram_bot_manager.py` as the safe activation/test helper for `BookedAI Manager Bot`; it reads `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN` from env, can run `getMe`, `setWebhook`, `getWebhookInfo`, inspect recent chats for a `chat_id`, and send a test `sendMessage` to a supplied chat id without printing the token
- live activation completed for `@BookedAI_Manager_Bot`: `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN` is present in the live secret env/backend container, Telegram `setWebhook` points at `https://api.bookedai.au/api/webhooks/bookedai-telegram`, and a controlled `sendMessage` test to the operator chat succeeded
- rebuilt/recreated production `backend` and `beta-backend` so the live API includes the Telegram webhook route and reads the customer Telegram secret; stack health passed after the recreate
- verified the full customer-agent loop internally: `POST /api/webhooks/bookedai-telegram` returned `200`, ran the BookedAI AI Engine/OpenAI path, and sent the Telegram reply through `sendMessage`; Telegram provider logging is now suppressed around `sendMessage` so bot tokens are not emitted in new backend logs
- named the customer-facing chat agent `BookedAI Manager Bot`; service metadata now records canonical agent id `bookedai_manager_bot`, Telegram display name `BookedAI Manager Bot`, preferred username `@BookedAI_Manager_Bot`, and fallback usernames for BotFather setup
- centralized the policy that was previously WhatsApp-specific: 60-day conversation window, last six turns of context, safe booking-reference resolution, booking-intake replies for new customers, portal-grounded status answers for known bookings, and audited cancellation/reschedule request queuing only when the portal action is enabled
- added Telegram Bot API outbound support to `CommunicationService` through `send_telegram()`, with unconfigured provider states recorded as queued/manual-review instead of failing the webhook path
- added `/api/webhooks/bookedai-telegram` with optional `X-Telegram-Bot-Api-Secret-Token` verification via `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN`; Telegram updates are normalized into the same Inbox/event shape as WhatsApp and stored as `telegram_inbound`; `/api/webhooks/telegram` remains a compatibility alias
- separated the customer-facing Booking AI Agent from OpenClaw/operator Telegram: customer replies use `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN`, while `BOOKEDAI_TELEGRAM_*` remains reserved for trusted repo/deploy/admin operator tooling
- added the customer Telegram env namespace in code and tests so this Booking AI Agent cannot be confused with the existing OpenClaw/Telegram programming and deployment control surface
- expanded Telegram from status-care only into the first BookedAI representative channel: service discovery messages now search active BookedAI catalog records and return top options with provider, location, price posture, `Book 1` instructions, and a prefilled web assistant link
- connected Telegram service discovery to the same BookedAI customer-agent response shape used by the web chat: search replies now store `bookedai_chat_response` with `status`, `reply`, `matched_services`, `matched_events`, `suggested_service_id`, and location-request posture so downstream API/UI consumers can render the same structure
- added the first Internet expansion path for `BookedAI Manager Bot`: customers can tap or send `Find more on Internet near me`; the webhook keeps the request inside the BookedAI API/service layer, calls the configured public search service when available, and marks sourced results as `public_web_search`
- tightened customer identity handling for chat booking care: Telegram messages now parse email/phone from the private chat text for booking lookup, while booking data still resolves only through explicit booking reference or a safe single phone/email identity match for that channel's conversation window
- added Telegram direct booking-intent capture from prior shortlist context: `Book 1` plus customer name and email/phone creates a real contact, lead, `booking_intents` row, booking reference, portal link, and pending payment/follow-up state
- changed WhatsApp/Twilio/Meta/Evolution inbound paths to call `MessagingAutomationService`, so WhatsApp and Telegram now share the same customer-care agent policy instead of duplicating request logic in route handlers
- added `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN` and `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN` to env examples; the intended customer webhook target is `https://api.bookedai.au/api/webhooks/bookedai-telegram`
- follow-up, bill/payment, confirmation, reschedule, cancel, support, and retention questions for existing bookings remain grounded in the portal booking-care turn once the booking reference or safe identity match is available
- verification passed with `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py backend/api/webhook_routes.py backend/config.py scripts/customer_telegram_bot_manager.py scripts/telegram_workspace_ops.py`, JSON validation for `deploy/openclaw/agents/bookedai-booking-customer-agent.json`, `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q`, the full focused communication/webhook regression where `23 passed`, the latest Telegram/customer-agent lane where `14 passed`, the web/Telegram entrypoint lane where `7 passed` plus frontend `tsc --noEmit`, the identity/intent lane where `8 passed`, the latest communication/Telegram lane where `10 passed`, live stack health, Telegram webhook info, and the internal webhook-to-Telegram loop returning `200`

Implementation update from `2026-04-26` (WhatsApp bot outbound provider follow-up):

- hardened `CommunicationService` for Evolution API sendText compatibility by preserving the current v2 payload (`number` + `text`) and retrying the legacy `textMessage.text` payload only when the bridge returns schema-style failures
- changed WhatsApp provider status reporting so fallback-capable delivery can surface the actual configured delivery provider instead of only the primary adapter label when the primary is not usable
- upgraded `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status` so Evolution fallback is treated as a personal WhatsApp bridge; the check now downgrades readiness when the bridge connection state cannot be verified as `open`
- applied the backend patch live by copying the touched backend files into `bookedai-backend-1` and `bookedai-beta-backend-1` and restarting only those containers, avoiding a full deploy while the worktree contains unrelated frontend/admin changes
- live send probes now reach the API and record outbound attempts as `queued` under `whatsapp_evolution`; the remaining delivery blocker is the Evolution instance `bookedai61481993178` reporting `state: connecting`, so the WhatsApp QR/session must be reconnected before end-to-end replies can deliver
- verification passed with `python3 -m py_compile scripts/telegram_workspace_ops.py backend/service_layer/communication_service.py backend/api/v1_integration_handlers.py backend/api/v1_routes.py`, `.venv/bin/python -m pytest backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase backend/tests/test_api_v1_integration_routes.py::Apiv1IntegrationRoutes::test_integration_provider_statuses_returns_success_envelope -q`, previous focused WhatsApp route tests, `bash scripts/healthcheck_stack.sh`, and live direct Evolution `connectionState` probe
- follow-up operator override: Evolution is now out of the live outbound send path and production uses Meta/WhatsApp Cloud primary with Twilio fallback (`WHATSAPP_FALLBACK_PROVIDER=twilio`)
- direct provider probes after the override: Meta Graph can read the configured BookedAI phone identity, but message send returns `(#133010) Account not registered`; Twilio Account and Messages endpoints return `401 Authenticate` for the configured API key, so outbound delivery remains blocked until Meta registration and/or Twilio credentials are repaired
- backend/beta-backend were recreated with the new env and then re-hotpatched with the current backend files; stack health and `whatsapp-bot-status` passed after the Evolution removal, and a controlled API send probe returned `queued` under `whatsapp_twilio` with manual-review warning
- later operator override made Twilio the only default WhatsApp chat path: `.env` now sets `WHATSAPP_PROVIDER=twilio` and leaves `WHATSAPP_FALLBACK_PROVIDER` empty, backend/beta-backend were recreated again with the new env, and `whatsapp-bot-status` reports `whatsapp_provider=whatsapp_twilio`
- controlled Twilio-only WhatsApp probe returned `message_id=87f12c98-e867-4bb1-a06d-21ba98ffabf0`, `provider=whatsapp_twilio`, and `delivery_status=queued`; this confirms routing is Twilio-only while provider-side delivery still needs Twilio credential/sender repair
- Twilio Account SID/Auth Token auth was then configured for the WhatsApp path and backend/beta-backend were recreated again; direct Twilio account probe now passes as active Trial account `BookedAI.au`
- configured sender `whatsapp:+61455301335` still cannot send through Twilio because Twilio returns `63007` (`could not find a Channel with the specified From address`), while the Twilio sandbox sender `whatsapp:+14155238886` successfully queued a message to `+61481993178` with SID `SMc9fb54c0be9b33e70c00974aeda6c2af`
- current practical path: use the sandbox sender for test automation, or register `+61455301335` as a Twilio WhatsApp sender before expecting production sender delivery
- latest operator-directed runtime now treats Meta Cloud API as the official chat connection and Twilio as the delivery fallback/default sender: `WHATSAPP_PROVIDER=meta`, `WHATSAPP_FALLBACK_PROVIDER=twilio`, `WHATSAPP_META_PHONE_NUMBER_ID=1033646899839617`, and `WHATSAPP_FROM_NUMBER=+14155238886`
- Meta must use the newer Cloud API phone identity `Bookedai.au1` / `+1 555-939-9566` / phone number id `1033646899839617`; do not route Meta sending through the older `+61 455 301 335` phone id because that path remains `ON_PREMISE`/not registered for Cloud API sends
- verification after backend/beta-backend recreate: stack health passed, `whatsapp-bot-status` reports `whatsapp_provider=whatsapp_meta` with configured Twilio fallback, and a controlled agent send to `+61481993178` returned BookedAI message id `b683d9ef-1c40-4b17-b92a-d5e1e0bb9586` plus Twilio provider id `SMd5e0be05f296371308e42ad4fa2cc179` in queued state after Meta primary failed over

Implementation update from `2026-04-26` (portal status-first A/B telemetry):

- implemented the next portal UAT recommendation in `frontend/src/apps/portal/PortalApp.tsx`: `portal_variant=control` keeps the prior overview/edit/reschedule/pause/downgrade/cancel IA, while the default `status_first` variant tests the customer-first order `Status -> Pay -> Reschedule -> Ask for help -> Change plan -> Cancel`
- added lightweight portal funnel telemetry without a third-party dependency: events write to `window.__bookedaiPortalEvents`, optional `dataLayer`, and `bookedai:portal-event` for lookup submit, booking loaded, lookup failed, action navigation, request composer opened, request submitted or failed, and care-turn completion or failure
- added dedicated `Pay`, `Ask for help`, and `Change plan` content states so the action rail reads like a customer support workspace instead of an internal request taxonomy; pause and downgrade remain request-safe actions under `Change plan`
- expanded `frontend/tests/portal-enterprise-workspace.spec.ts` so the portal regression now checks status-first action ordering, telemetry emission, existing reschedule submission, and mobile no-horizontal-overflow behavior
- deployed live through `python3 scripts/telegram_workspace_ops.py deploy-live`; verification passed with `cd frontend && npx tsc --noEmit`, `cd frontend && npx playwright test tests/portal-enterprise-workspace.spec.ts --reporter=line`, `cd frontend && npm run build`, `bash scripts/healthcheck_stack.sh`, and production browser smoke on `https://portal.bookedai.au/?booking_reference=v1-2fd9f35965&portal_variant=status_first` confirming action labels, loaded/pay-click events, zero console/request failures, and `390px` mobile overflow `0`

Implementation update from `2026-04-26` (tenant A/B acquisition telemetry):

- implemented the next UAT recommendation for `tenant.bookedai.au` by adding a measurable tenant acquisition experiment in `frontend/src/apps/tenant/TenantApp.tsx`; `tenant_variant=control` preserves the current gateway promise, while `tenant_variant=revenue_ops` tests the sharper investor/SME headline `Turn every enquiry into tracked revenue operations`
- added query-string override, persisted assignment via `bookedai.tenant.variant`, random fallback assignment, and event emission without adding a third-party analytics dependency
- tenant funnel events now write to `window.__bookedaiTenantEvents`, optional `dataLayer`, and `bookedai:tenant-event`, covering variant assignment, sign-in/create/claim mode changes, Google prompt attempts or blocks, email-code request and verification outcomes, workspace panel navigation, and mobile preview-detail toggles
- expanded `frontend/tests/tenant-gateway.spec.ts` so the tenant gateway regression checks the revenue-ops variant copy and verifies emitted tenant acquisition events for assignment plus create-account mode switching
- verification passed with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, and `cd frontend && npx playwright test tests/tenant-gateway.spec.ts --workers=1 --reporter=line`
- live deployment completed through `python3 scripts/telegram_workspace_ops.py deploy-live`; post-deploy `bash scripts/healthcheck_stack.sh` passed, `https://tenant.bookedai.au/?tenant_variant=revenue_ops` returned `200`, and a live mobile Playwright smoke confirmed the revenue-ops headline, persisted `revenue_ops` assignment, emitted `tenant_variant_assigned` and `tenant_auth_mode_changed` events, no horizontal overflow at `390px`, and no BookedAI console/request failures

Implementation update from `2026-04-26` (portal valid-reference production fix):

- fixed the production `portal.bookedai.au` valid-reference failure found in the live UAT review: freshly created public `v1-*` booking references now reopen the booking workspace instead of returning backend `500`, browser CORS noise, and customer-visible `Failed to fetch`
- added a regression test proving `build_portal_booking_snapshot` rolls back after optional academy enrichment fails, then continues to render the core booking snapshot, payment posture, support route, allowed actions, and timeline
- refreshed portal customer copy around the lookup and error state: the hero now says `Review your booking and request changes in one place`, helper copy no longer exposes `booking_reference` implementation language, and recoverable network failures explain that the booking reference is saved with retry/support actions
- updated the portal Playwright spec to lock the new customer-facing hero copy while preserving the workspace render, reschedule request, and mobile no-overflow checks
- deployed live through `python3 scripts/telegram_workspace_ops.py deploy-live`; the deploy command hit a transient Hermes container-name conflict during compose, but the production stack recovered and `backend`, `web`, `beta-web`, `beta-backend`, `hermes`, `proxy`, and `n8n` were confirmed running
- verification passed with `.venv/bin/python -m pytest backend/tests/test_api_v1_portal_routes.py backend/tests/test_api_v1_booking_routes.py -q`, `cd frontend && npx tsc --noEmit`, direct frontend build steps, `cd frontend && npx playwright test tests/portal-enterprise-workspace.spec.ts --reporter=line`, `bash scripts/healthcheck_stack.sh`, live `GET /api/v1/portal/bookings/v1-2fd9f35965` returning `200`, live `POST /care-turn` returning `200`, and browser Playwright proof on `https://portal.bookedai.au/?booking_reference=v1-2fd9f35965` with no console errors and `390px` mobile overflow `0`

Implementation update from `2026-04-26` (product UAT enterprise polish):

- applied the live `product.bookedai.au` UAT follow-ups in `frontend/src/apps/public/ProductApp.tsx` and `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`: semantic `h1/h2` landmarks now exist, icon-only product controls have accessible names, and the product host now passes the `bookedai-au` tenant runtime context into v1 handoffs
- tightened mobile first-screen ergonomics by replacing the cropped quick-search carousel with two full-width prompt cards plus concise guidance, preserving no-horizontal-overflow behavior at `390px`
- changed zero-value public result pricing to a trust-preserving `Price TBC` posture unless a real price posture is present, and softened no-result copy so `near me` searches ask for suburb/location instead of ending at a dead result state
- sanitized customer-visible automation warnings and booking detail copy so provider/runtime errors such as `Candidate not found`, provider HTTP failures, or WhatsApp transport degradation read as operations-review states while the booking reference and portal remain available
- verification passed with `npm --prefix frontend run build` and local Playwright desktop/mobile smoke against the generated product bundle; local static preview still shows the expected unauthenticated `401` for backend calls outside the live runtime

Implementation update from `2026-04-26` (portal auto-login production recovery):

- fixed the live portal continuation gap found during homepage UAT: valid `v1-*` booking references now hydrate `GET /api/v1/portal/bookings/{booking_reference}` instead of surfacing a browser CORS/`Failed to fetch` state
- hardened `build_portal_booking_snapshot` so optional payment mirror, academy snapshot, and portal audit lookups degrade with a best-effort rollback while the core booking, customer, service, payment posture, actions, support route, and timeline still render
- tightened `frontend/scripts/run_portal_auto_login_smoke.mjs` so the release gate now fails when the reference only appears in the error screen; it must render the booking workspace, portal actions, and no fatal console errors
- deployed live through `python3 scripts/telegram_workspace_ops.py deploy-live`; post-deploy `curl` confirmed `https://api.bookedai.au/api/v1/portal/bookings/v1-db55e991fd` returns `200` with `Access-Control-Allow-Origin: https://portal.bookedai.au`
- verification passed with `.venv/bin/python -m pytest backend/tests/test_api_v1_portal_routes.py -q`, `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py -q`, `bash scripts/healthcheck_stack.sh`, API health probe, and live browser portal auto-login smoke for `v1-db55e991fd` (`booking_loaded=true`, `error_state=false`, `console_errors=0`)

Implementation update from `2026-04-26` (homepage verified chess tenant prompt alignment):

- replaced the generic homepage chess quick prompt with `Book Co Mai Hung Chess Sydney pilot class this week`, so the live product prompt aligns with the verified tenant proof instead of drifting into public web fallback results
- updated the public homepage proof row from broad `Grandmaster Chess` wording to `Co Mai Hung Chess / Verified tenant booking / Grandmaster proof`, keeping investor proof copy closer to the runtime result
- updated English and Vietnamese homepage suggestion content to use the same Co Mai Hung tenant-specific query
- verification passed with frontend typecheck, frontend production build, local Playwright prompt smoke, live deploy, live prompt smoke on `https://bookedai.au/?homepage_variant=control`, manual proxy restart plus n8n workflow activation, stack healthcheck, and API/homepage `200` probes
- live prompt smoke confirmed `Co Mai Hung` tenant result visibility, tenant signal visibility, no `No strong tenant catalog candidates` fallback warning, no console/request failures, and no horizontal overflow

Implementation update from `2026-04-25` (homepage booking confirmation persistence and A/B funnel tracking):

- removed the homepage booking-confirmation auto-return timer from `frontend/src/apps/public/HomepageSearchExperience.tsx`, so the Thank You state, booking reference, portal QR, and follow-up actions remain visible until the customer chooses another action
- replaced the previous countdown chip with persistent portal/QR guidance and added Playwright assertions that `Returning to the main BookedAI screen` is absent after booking and still absent after a wait
- added homepage experiment/funnel telemetry hooks around the product-first variant, primary CTA focus, suggested-search clicks, search start, top research visibility, result selection, booking start, and booking submission so investor/customer conversion behavior can be compared without adding an external analytics dependency
- verification passed with frontend typecheck, production build, homepage responsive/A-B Playwright coverage, live-read booking smoke, legacy homepage smoke, and backend v1 booking route tests

Implementation update from `2026-04-25` (product app scrollable layout, search stepper, QR wallet handoff, and dead-bottom-sheet cleanup):

- reworked `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` and `frontend/src/apps/public/ProductApp.tsx` so `product.bookedai.au` is now a single scrollable column instead of a fixed-height shell with a draggable bottom sheet; the chat panel and search composer flow naturally with the page, and the booking panel appears below the chat only after the customer has selected a result
- progressive disclosure now drives what is visible at each stage on `product.bookedai.au`: the booking panel stays hidden until the customer has started a conversation, the booking form/shortlist stays hidden until a result is selected, and the workflow/process step guide stays hidden until a booking has been submitted, so the chat-first flow is no longer overlapped by guidance panels at first paint
- replaced the static spinner inside the search resolving panel with an animated multi-stage stepper: progress bar from `0%` to `100%`, `Step N/4` counter, per-stage status pills with completed/active/pending visual states, and three skeleton placeholder result cards while the real results stream in, so the customer sees concrete progress instead of a generic loading icon
- removed the booking-confirmation auto-redirect timer entirely, so the Thank You hero stays in view until the customer leaves; the previous `Returning to the main BookedAI screen in 5s` chip is replaced with a `Scan the QR or open the portal — your booking stays here as long as you need it` hint
- enlarged the confirmation QR (`128px` mobile, `144px` tablet/desktop) and made the QR card itself an `Open booking portal` link, with an `Auto-login link with reference {booking_reference}` chip making the portal handoff explicit; portal URL still routes through `https://portal.bookedai.au/?booking_reference=...` for reference-bound auto-login
- added `Copy` for the booking reference, `Copy portal link` for the portal URL, and `Save PNG` for the QR image to the confirmation hero, so the customer can hand the booking off through other channels without retyping anything
- introduced `frontend/src/shared/utils/qrCode.ts` to generate QR codes locally via the `qrcode` npm package with an in-memory cache, and wired both the confirmation hero and the secondary booking-portal card to use the locally generated data URL with the legacy `api.qrserver.com` URL kept only as a fallback so confirmation no longer hard-depends on a third-party runtime
- moved the result preview popup to a viewport-level `fixed inset-0` modal with internal scrolling and a `max-h-[90dvh]` cap, so `View details` now reliably renders the full content (image, summary, price, duration, location, why-it-matches, provider details, confidence chips, action buttons) instead of being clipped by the booking panel container
- removed the dead bottom-sheet code that backed the previous overlay UX: `productSheetDragOffset`, `productSheetDragStateRef`, `handleProductSheetPointerDown/Move/End`, `isCompactProductBottomBarVisible`, `thankYouReturnCountdown`, and the related `productBookingSheetPeek/Half`, `productSheetVisibleHeight`, `productSheetOpenRatio`, and `compactProductFooterOffset` calculations, so the assistant component no longer carries the swipe/auto-redirect machinery that the new flow does not use
- documented the next-phase deliverables in `docs/development/next-phase-implementation-plan-2026-04-25.md` (`Phase 17` extended; new `Phase 20.5 - Confirmation Wallet And Stripe Return Continuity`) and the QA criteria in `docs/development/sprint-13-16-user-surface-delivery-package.md` so subsequent UAT runs and Stripe/Wallet/portal-auto-login follow-up are tracked beside the rest of the customer-surface work
- verification: `cd frontend && npx vite build` passes (`✓ built in 25.94s`); production bundle `BookingAssistantDialog-*.js` shrinks from `175.77 kB` to `175.02 kB` after dead-code cleanup while the new QR utility and stepper UI fit inside the same chunk
- follow-ups still open: verify `portal.bookedai.au/?booking_reference=...` actually resolves a portal session under the production session policy, run the Stripe `success_url` swap so payment completion returns to a booking-aware URL instead of the public homepage, generate Apple/Google Wallet passes for confirmed bookings, and run the new flow on real iOS Safari and Android Chrome devices before promotion

Implementation update from `2026-04-26` (public pitch video replacement):

- replaced the homepage and pitch embedded MP4 with `https://upload.bookedai.au/videos/df25/8woKUebBF8HMMD_RMSA0LQ.mp4`
- updated both `bookedai.au` (`PublicApp.tsx`) and `pitch.bookedai.au` (`PitchDeckApp.tsx`) to use the same new uploaded video URL for native playback and direct fallback links
- direct media verification confirmed the replacement MP4 returns `206`, `content-type: video/mp4`, and byte-range support

Implementation update from `2026-04-25` (public pitch video placement):

- added the uploaded pitch video as a native controlled video section on `pitch.bookedai.au`
- placed the pitch video after the hero/chess proof area on the pitch surface so investors and buyers can watch the story before continuing into problem, solution, product proof, pricing, and architecture
- added the same video to `bookedai.au` directly after the opening hero/proof block and before the `Why BookedAI` narrative so homepage visitors can watch the short overview before trying the live product
- updated homepage and pitch navigation to expose the `Pitch video` anchor, while preserving direct open-video fallback links for browsers that prefer a separate media tab
- verification passed with `cd frontend && ./node_modules/.bin/tsc --noEmit --pretty false`, `npm --prefix frontend run build`, live deploy through `python3 scripts/telegram_workspace_ops.py deploy-live`, stack healthcheck, production Playwright smoke on `https://bookedai.au/` and `https://pitch.bookedai.au/`, and direct media checks confirming the uploaded MP4 returns `video/mp4` with byte-range support

Implementation update from `2026-04-25` (homepage chat inline results and booking-flow regression):

- reworked `frontend/src/apps/public/HomepageSearchExperience.tsx` so homepage assistant results render as compact booking cards inside the chat bubble instead of relying on a detached shortlist after the conversation
- chat result cards now show the booking-critical scan layer: option/category, price or explicit missing-price state, duration, location, confidence, fit/next-step copy, and direct details/maps/provider/select/book actions
- suggestion chips now remain inside assistant chat bubbles under `Suggested chat refinements`, preserving a single conversational path from ask to refine to book
- redesigned the homepage chat frame so the conversation/results area scrolls above a Claude-style bottom composer with attachment, textarea, voice, and send icon controls
- added `Top research` framing to the assistant result bubble so the top summarized options are clearly reviewable in-chat before the user selects or books
- expanded in-chat result actions with Mail and Call paths beside Details, Maps, Provider, Select, and Book, making real-world follow-up feel attached to the found result
- removed the duplicate standalone assistant summary whenever an assistant chat reply already exists, keeping the UI tighter and less repetitive
- enriched live-read candidates from the loaded catalog by id where possible, and made missing booking fields explicit with `Price not listed`, `Duration TBD`, and `Location TBD` fallbacks
- expanded the live-read Playwright booking smoke to assert the inline chat result card, booking-critical facts, suggestion refinements, and in-chat `Book` action before submitting the authoritative v1 booking intent
- verification passed with frontend typecheck, production build, live-read Playwright smoke, legacy homepage responsive smoke, backend `test_api_v1_booking_routes.py`, live deploy, stack healthcheck, public-surface production smoke, and non-mutating live homepage composer/search/status smoke with no console/request failures or mobile overflow
- full homepage UAT and A/B review was rerun after deployment: production desktop, tablet, and mobile passed with `19/19` heuristic scores, screenshots/JSON were saved under `frontend/output/playwright/homepage-full-uat-ab-2026-04-25/`, and the recommended next experiment is a product-first `Start with a request` variant measured against search-start, booking-start, and investor-click events

Implementation update from `2026-04-25` (architecture showcase page and big-tech pitch visualization):

- added `frontend/src/apps/public/ArchitectureApp.tsx` as a standalone `/architecture` showcase for technical buyers and investors, with an architecture image, revenue-engine control map, system lane map, design capability cards, product proof imagery, and enterprise posture section
- wired `/architecture`, `/architecture/`, and `architecture.bookedai.au` into `frontend/src/app/AppRouter.tsx`
- linked the architecture showcase from the pitch nav, pitch hero/pricing CTAs, and public homepage nav so architecture review is discoverable without re-expanding the main pitch page
- upgraded the in-pitch architecture section from a short four-step operating loop into a professional multi-layer infographic: customer demand surfaces, AI orchestration, revenue transaction core, operations control plane, partner/integration rails, and infrastructure/technology stack are grouped directly in the pitch flow
- the pitch infographic now explicitly names BookedAI surfaces, customer-turn/search/revenue-ops/care agents, booking/payment/QR/email-calendar modules, tenant/admin/action-ledger/support controls, Stripe, Meta WhatsApp, Twilio, n8n, CRM/webhook recovery, OpenClaw, Telegram, Notion, Discord, React, TypeScript, Vite, Tailwind, FastAPI, Supabase, Postgres, Docker Compose, Nginx, and Cloudflare DNS/TLS
- kept the pitch page concise while giving the architecture story a dedicated big-tech-style layout focused on visual system design, governance, and real product surfaces
- verified with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, and local Playwright desktop/mobile smoke for `/architecture` and `/pitch-deck`; `/architecture` and the pitch architecture infographic have no horizontal overflow, required layers/integrations/stack labels are present, the proof images load, and there are no console/page/request failures
- deployed live with `python3 scripts/telegram_workspace_ops.py deploy-live`; production smoke passed for `https://bookedai.au/architecture` and `https://pitch.bookedai.au/architecture` on desktop/mobile, and `https://pitch.bookedai.au/` now exposes four `/architecture` links while preserving one pricing section and zero horizontal overflow
- follow-up pitch deployment published the expanded multi-layer architecture infographic directly inside `https://pitch.bookedai.au/`; production desktop/mobile smoke confirmed the architecture image, all layer/integration/stack labels, one pricing section, no horizontal overflow, and no browser console/page/request failures

Implementation update from `2026-04-25` (pitch UAT rewording and layout compression):

- reworked `frontend/src/apps/public/PitchDeckApp.tsx` after UAT review so the pitch now reads as a shorter buyer/investor flow: outcome-led hero, live tenant proof, problem, solution, product proof, pricing, one operating-model architecture visual, surfaces, trust/team, and final CTA
- moved pricing immediately after product proof and removed the oversized architecture-detail infographic from the pitch runtime, leaving a single `demand -> qualification -> booking -> ops ledger` operating-model section
- tightened copy around captured demand, booking-ready action, operator workflow visibility, and commercial terms instead of repeating long system-layer language
- added native required/min-length validation to the SME registration form for business name, website/app URL, business type, email, phone, name, and preferred setup time
- verified with `npm --prefix frontend run build` and local Playwright desktop/mobile smoke for `/pitch-deck` plus `/register-interest`; mobile pitch height is about `21.1kpx`, there is one pricing section, no architecture-detail section, no horizontal overflow, and no console/page/request errors
- deployed the pitch rework live with `python3 scripts/telegram_workspace_ops.py deploy-live`; production smoke on `https://pitch.bookedai.au/` confirmed the target hero copy, one pricing section before architecture, no old `architecture-detail` section, the `Demand -> Qualification -> Booking -> Ops ledger` flow, no horizontal overflow, and no console/page/request failures on desktop and mobile

Implementation update from `2026-04-25` (public homepage investor/customer redesign):

- redesigned `frontend/src/apps/public/PublicApp.tsx` from a sidebar-first search shell into an executive acquisition homepage that explains BookedAI as an AI revenue engine for service businesses
- rebuilt the first viewport around the promise `Turn demand into booked revenue`, with concise stats, product and investor CTAs, the Grandmaster Chess proof visual, Future Swim tenant proof, and the WhatsApp booking-care channel
- preserved the real `HomepageSearchExperience` as the live product workspace, then added compact sections for the market problem, revenue outcomes, operating model, investor thesis, customer value, and final CTA
- adjusted responsive header behavior to avoid the repo's legacy `.hidden { display:none!important }` override by using default-visible desktop controls with max-width hiding instead of `hidden lg:flex`
- verified with `npm --prefix frontend run build`, local Playwright desktop/mobile screenshots under `frontend/output/playwright/homepage-redesign-2026-04-25/`, desktop header visibility checks, and mobile no-horizontal-overflow measurement at `390px`; local preview still reports the expected unauthenticated conversation-session `401` without a signed backend session
- deployed live with `python3 scripts/telegram_workspace_ops.py deploy-live`; the deploy hit the known transient Docker compose recreate `No such container` race, retried with orphan cleanup, and completed successfully
- live verification passed on `https://bookedai.au`: Playwright confirmed title, H1, desktop nav, mobile no-horizontal-overflow at `390px`, and zero console errors; evidence lives under `frontend/output/playwright/homepage-live-redesign-2026-04-25/`
- updated `scripts/healthcheck_stack.sh` so root `bookedai.au` is expected to serve the BookedAI homepage shell directly instead of redirecting to `pitch.bookedai.au`; the refreshed stack health check passed
- completed a follow-up live public-surface smoke after the routing change: `bookedai.au`, `product.bookedai.au`, `pitch.bookedai.au`, `bookedai.au/roadmap`, `tenant.bookedai.au`, `portal.bookedai.au`, and `admin.bookedai.au` all returned `200`, matched expected visible copy, had no browser console errors or failed requests, and had no mobile horizontal overflow at `390px`; evidence lives under `frontend/output/playwright/public-surfaces-live-smoke-2026-04-25/`

Implementation update from `2026-04-25` (tenant gateway and Future Swim UAT follow-up):

- implemented the live UAT content/UX recommendations for `tenant.bookedai.au` and `tenant.bookedai.au/future-swim`
- reframed the tenant gateway around business outcomes instead of auth mechanics, updated the value chips, softened the auth card copy, added a visible first-party Google CTA fallback above the third-party iframe, and shortened the mobile email-code button to `Send code`
- moved Future Swim revenue proof into a prominent summary section immediately after the tenant hero, rewrote the hero and activation copy, compressed the mobile workspace menu into a two-column jump-style layout, and removed the repeated lower revenue proof block from the overview stack
- verified with `npm --prefix frontend run build`
- deployed live through the host-level wrapper via `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "bash scripts/deploy_live_host.sh"` after an earlier direct deploy attempt hit a transient Docker container-name conflict during compose recreate
- final live checks passed: API health, tenant gateway, and Future Swim routes returned `200`; live Playwright desktop/mobile smoke reported no console errors, page errors, request failures, or horizontal overflow, and Future Swim tenant APIs returned `200`
- final evidence lives under `frontend/output/playwright/live-tenant-ux-final-2026-04-25/`
- follow-up polish then hid the Google iframe container from the mobile-visible auth surface so the native BookedAI Google CTA is the only visible Google control on small screens, reframed the gateway source label into trust-oriented copy, and corrected the Future Swim `Next follow-up` card to show tenant attention signals instead of a demand-source label
- the polish build and deploy also passed; final polish smoke confirmed the mobile Google iframe is not visible, the native Google CTA remains visible, Future Swim revenue proof appears once, Future Swim tenant APIs returned `200`, and no console errors, page errors, failed requests, or horizontal overflow were detected
- polish evidence lives under `frontend/output/playwright/live-tenant-ux-polish-2026-04-25/`
- continued the UAT follow-up with a compact tenant-gateway proof row covering booking flow, revenue proof, customer care, and automation, plus visible support contacts for `info@bookedai.au` and `+61 455 301 335`
- added stable Future Swim anchors and a mobile quick navigation strip for revenue proof, activation, workspace menu, bookings, and catalog readiness so long tenant previews are easier to scan on small screens
- the proof/navigation pass built and deployed live through the host wrapper; Playwright live smoke confirmed desktop/mobile gateway and Future Swim routes returned `200`, gateway proof/support copy is visible, Future Swim mobile quick nav and anchors are present, the mobile Google iframe remains hidden, Future Swim tenant APIs returned `200`, and no console errors, page errors, failed requests, or horizontal overflow were detected
- proof/navigation evidence lives under `frontend/output/playwright/live-tenant-ux-proof-nav-2026-04-25/`
- ran a full interaction UAT across gateway auth modes, mobile quick navigation, and all Future Swim panels; this found `GET /api/v1/tenant/leads?tenant_ref=future-swim` was missing from the modular live tenant router and then, after route restoration, exposed a production-schema mismatch in tenant lead reporting
- restored `GET /api/v1/tenant/leads` in `backend/api/v1_tenant_routes.py` / `backend/api/v1_tenant_handlers.py`, fixed `ReportingRepository.list_tenant_leads()` to read normalized contact fields from `contacts` and latest service context from `booking_intents`, and added regression coverage in `tests/test_api_v1_tenant_routes.py` plus `tests/test_phase2_repositories.py`
- verification passed with `python3 -m py_compile backend/repositories/reporting_repository.py backend/api/v1_tenant_handlers.py backend/api/v1_tenant_routes.py` and `cd backend && ../.venv/bin/python -m pytest -q tests/test_phase2_repositories.py tests/test_api_v1_tenant_routes.py` (`53 passed`)
- final live UAT after deploy passed for desktop/mobile gateway and Future Swim: gateway mode switching works, mobile quick nav works, all Future Swim panels open, `tenant/leads` returns `200`, checked tenant APIs return `200`, and there are no app console errors, page errors, request failures, or horizontal overflow; third-party Google iframe font/log aborts are recorded separately as non-app blockers
- full UAT evidence lives under `frontend/output/playwright/live-tenant-full-uat-fixed-2026-04-25/`

Implementation update from `2026-04-25` (portal live UAT, content, and UX review):

- ran a live UAT/content/UX review for `portal.bookedai.au` using the workspace `qa-testing-vi` structure plus manual startup/investor/content review lenses
- created a public booking-intent UAT record `v1-6879356dc2`; creation succeeded, but `GET /api/v1/portal/bookings/v1-6879356dc2` and the matching `care-turn` endpoint returned live `500`
- confirmed the browser customer experience currently degrades to `Booking not available` / `Failed to fetch`, with console CORS symptoms because the failed API response does not carry CORS headers
- invalid references still return a structured `404 portal_booking_not_found` with CORS headers, and the tested desktop/mobile error layouts had no horizontal overflow
- wrote the detailed review and rewrite/layout recommendations to `docs/development/portal-bookedai-uat-content-ux-review-2026-04-25.md`; top follow-up is hardening portal snapshot hydration for public `v1-*` booking-intent records before UI polish

Implementation update from `2026-04-25` (product assistant native event attendance handoff):

- extended `backend/schemas.py` so `BookingAssistantSessionRequest` accepts event attendance metadata (`event_title`, summary, timing, venue/location, organizer, URL) and `ServiceCatalogItem.amount_aud` can be zero for event-style confirmations
- updated `backend/services.py` so `BookingAssistantService.create_session()` accepts synthetic `service_id` values shaped like `event:<url>`, builds an internal event proxy service for confirmation/session persistence, skips Stripe/manual payment routing for attendance requests, and returns event-specific confirmation copy instead of the normal paid-booking posture
- rewired `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` so product assistant event selection now posts the real event metadata into `/booking-assistant/session` rather than stopping at a frontend-only handoff
- added backend regression coverage in `backend/tests/test_booking_assistant_service.py` for event attendance requests and kept the existing frontend regression/build lane intact
- live runtime verification in this workspace was partially blocked because the available Python installation has no `pip`, cannot create a venv via `ensurepip`, and lacks installed deps like `pydantic`, `fastapi`, `httpx`, and `pytest`; as a fallback, source-level verification confirmed the backend event path fields, zero-price schema allowance, synthetic `event:` session handling, event proxy creation, and payment-skip confirmation behavior, while frontend source checks confirmed the event metadata is now posted into `/booking-assistant/session`

Implementation update from `2026-04-25` (search result maps, thumbnails, and progressive response):

- added a shared Google Maps URL builder for result cards so physical-place matches open a direct `map_url` when provided or a venue/location/service Google Maps query fallback when not
- updated homepage and product assistant result cards to show a top-left image thumbnail or branded preview fallback, keeping the card scan order visual first and then decision facts
- added Google Maps actions to homepage/product result cards and detail popups so customers can inspect the specific place without leaving the BookedAI chat/search context
- made search progress feel faster by advancing staged progress copy sooner, lowering delayed-nudge timing, and explicitly showing early-match copy while maps, booking paths, and fit checks continue
- kept refinement prompts inside the BookedAI chat conversation, preserving the ChatGPT-like ask/refine/results/book flow
- verified with `npm --prefix frontend run build`

Implementation update from `2026-04-25` (OpenClaw WhatsApp bot readiness):

- added `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status` as a read-only OpenClaw/Telegram operator check for the BookedAI WhatsApp bot
- clarified the runtime contract as a dedicated `BookedAI WhatsApp Booking Care Agent` for `bookedai.au`: it answers all service questions tied to already-booked records, while OpenClaw is the safe gateway/operator surface rather than a customer-visible persona
- updated the active WhatsApp provider contract so `WHATSAPP_PROVIDER=evolution` can be the near-term personal WhatsApp QR-session path for `+61455301335` while Meta/WhatsApp Business verification remains blocked; Meta and Twilio remain later business-provider paths
- added the repo-owned OpenClaw agent manifest at `deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json` plus `python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent` to install/update that manifest under the live OpenClaw runtime `agents/` directory
- kept `openclaw.json` schema-safe for OpenClaw v2026.4.15 by not forcing the rich BookedAI agent contract into `agents.list`; the live runtime retains `main` there while the BookedAI WhatsApp agent manifest is supervised through OpenClaw commands and the BookedAI API gateway
- the check verifies `bot.bookedai.au` gateway health, `api.bookedai.au` backend health, `/api/v1/integrations/providers/status` WhatsApp provider posture, and the active webhook path; for `whatsapp_evolution` it probes `/api/webhooks/evolution`, and for Meta/Twilio it keeps the `/api/webhooks/whatsapp` verify-route probe
- added `whatsapp_bot_status` to the default OpenClaw/Telegram action vocabulary in the wrapper, OpenClaw compose, and OpenClaw env templates, and updated the live OpenClaw `.env` action list
- kept the check non-sending by design, so it can be safely run from OpenClaw without triggering a real WhatsApp conversation
- previous verification with `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status` returned `status: ok`, `openclaw_gateway_live: true`, `api_live: true`, `whatsapp_provider: whatsapp_twilio`, `whatsapp_provider_status: connected`, and webhook verify-route `403`; the updated probe now also reports Evolution webhook reachability when the personal WhatsApp bridge is configured

Implementation update from `2026-04-25` (ChatGPT-like search workspace polish):

- restyled the public homepage search frame in `frontend/src/apps/public/HomepageSearchExperience.tsx` as a calmer ChatGPT-like composer with a clearer message area, status copy, prompt chips, voice/send controls, and a softer workspace shell
- replaced the homepage result card body with a purpose-built compact layout: thumbnail or initials, option/top-match/category badges, provider/title, price or price posture, duration, location/provider, confidence, one short fit/next-step line, and the existing compact action row
- mirrored the more compact result information hierarchy in `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` for inline assistant results and product suggested services, so product search and homepage search now read with the same scan pattern
- wrapped the product assistant chat input in a cleaner composer shell so it feels more like a professional chat workspace while preserving voice/search behavior
- tightened the product welcome state after browser review so the search composer is visible in the first desktop viewport, reducing the hero and quick-prompt height to match search-first user behavior
- verified with `npm --prefix frontend run build` plus local Playwright screenshots at `output/playwright/product-saas-polish-desktop-v3.png` and `output/playwright/product-saas-polish-after-search.png`; local preview still shows expected unauthenticated API `401`/static fallback `404` calls when not connected to the live backend

Implementation update from `2026-04-25` (portal customer-care support escalation):

- extended the portal customer-care turn so explicit human-support, escalation, urgent, or broken payment-link messages can queue a `support_request` through the existing portal booking request/audit/outbox path
- added `portal.support_request.requested` to the admin portal support queue and support action resolution path, so operator Billing Support can review or escalate AI-created care cases beside reschedule and cancel requests
- added `created_request` to the portal care-turn response contract and surfaced the queued support case in the portal care agent card
- kept reschedule/cancel/pause/downgrade as explicit customer action flows; the AI care turn only auto-queues general support/escalation cases with the original message as customer note
- verified with `python3 -m py_compile backend/service_layer/tenant_app_service.py backend/service_layer/admin_dashboard_service.py backend/api/v1_tenant_handlers.py backend/api/v1_tenant_routes.py`, `.venv/bin/python -m pytest backend/tests/test_api_v1_portal_routes.py -q`, `.venv/bin/python -m pytest backend/tests/test_api_v1_tenant_routes.py backend/tests/test_academy_action_worker.py -q`, `cd frontend && npx tsc --noEmit`, and `npm --prefix frontend run build`

Implementation update from `2026-04-25` (portal customer-care status agent):

- added `POST /api/v1/portal/bookings/{booking_reference}/care-turn` as a booking-reference anchored customer-care turn contract for the portal
- added `build_portal_customer_care_turn` so status replies are generated from portal booking snapshot truth, payment posture, support contact, academy/report context, enabled portal actions, and recent revenue-ops action runs
- wired `frontend/src/apps/portal/PortalApp.tsx` with a customer-care status agent card that lets returning customers ask payment, reschedule, class/report, pause/downgrade/cancel, or support questions from inside the booking workspace
- kept lifecycle changes request-safe: the portal agent returns enabled next actions and support routes, while unsupported or incomplete paths remain escalation/manual-review cases
- verified with `.venv/bin/python -m pytest backend/tests/test_api_v1_portal_routes.py backend/tests/test_api_v1_tenant_routes.py backend/tests/test_academy_action_worker.py -q`, `cd frontend && npx tsc --noEmit`, and `npm --prefix frontend run build`

Implementation update from `2026-04-25` (WhatsApp customer-care booking channel):

- upgraded `/api/webhooks/whatsapp` so configured inbound WhatsApp messages can trigger an automatic customer-care reply, not only foundation event logging
- set the default BookedAI WhatsApp sender to `+61455301335` and tightened booking-confirmation WhatsApp copy so customers know they can reply there for questions, reschedule, or cancellation review while `info@bookedai.au` remains the email support identity
- added booking-reference extraction and safe customer booking resolution by reference, WhatsApp phone, or email, with ambiguous phone/email matches asking for the booking reference before exposing booking details
- reused `build_portal_customer_care_turn` so WhatsApp answers are grounded in the portal booking snapshot, payment status, support contact, academy/report state, and recent revenue-ops action runs
- clear WhatsApp cancellation and reschedule requests now queue the same audited portal request path used by `portal.bookedai.au`, keeping changes manual-review and outbox-backed rather than pretending instant mutation
- added lifecycle follow-through for WhatsApp change requests: email confirmation is sent or recorded, CRM gets a task mirror via lifecycle email sync, and tenant Bookings now exposes a recent WhatsApp/portal request queue with cancellation/reschedule/support counts
- verified with backend py_compile, `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_api_v1_portal_routes.py backend/tests/test_api_v1_tenant_routes.py backend/tests/test_api_v1_communication_routes.py -q`, `npm --prefix frontend exec tsc -- --noEmit`, live deploy through `python3 scripts/telegram_workspace_ops.py deploy-live`, stack health, live API health, and the live WhatsApp webhook verification route reaching FastAPI

Implementation update from `2026-04-25` (public/product search-results flow refinement):

- added a shared verified-tenant detection layer for BookedAI chess services, so search results for the reviewed `Co Mai Hung Chess Class` / Grandmaster Chess tenant surface tenant-specific capabilities without interrupting result browsing
- updated homepage and product assistant result cards to show compact tenant capability chips for Book, Stripe, QR payment, QR confirmation, calendar, email, WhatsApp Agent, and portal edit when a chess tenant result is present
- updated the selected-booking and confirmation copy so tenant-confirmed chess bookings explicitly keep QR/portal confirmation, Stripe or QR transfer posture, calendar, email, and WhatsApp Agent follow-up visible
- synchronized the requirement into `prd.md`, `DESIGN.md`, the master PRD, detailed landing/product design spec, Sprint 13-16 package, next-phase plan, roadmap register, sprint checklist, implementation roadmap, current sprint plan, and public roadmap dataset so Phase 17 keeps the current proof and Phase 22 owns reusable template extraction
- changed `frontend/src/apps/public/HomepageSearchExperience.tsx` so completed searches no longer auto-scroll or focus the booking side panel; users can pause on the results list, scroll, compare, and choose the next action intentionally
- moved clarification/follow-up prompts into the visible BookedAI chat thread as actionable suggestion chips, while removing the separate clarification panel that competed with the result surface
- tightened homepage result cards so the list shows only essential comparison facts and compact actions; full summary, provider context, confidence, next step, map/provider links, and booking continuation remain in the detail popup
- changed `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` so popup/product assistant results do not auto-select the first returned match; `View details` opens the popup and `Book` is the explicit route into customer details
- verified with `npm --prefix frontend run build`

Implementation update from `2026-04-25` (tenant AI operations automation connection plan):

- added a tenant automation connection plan to the `GET /api/v1/tenant/integrations` payload, summarizing platform messaging, CRM write-back, webhook/workflow automation, customer-care state readiness, action routes, dispatch endpoints, and guardrails
- added `POST /api/v1/tenant/operations/dispatch`, scoped to the signed tenant and restricted to tenant admins/operators, so tenants can run policy-gated queued revenue-ops actions without using the global admin dispatch endpoint
- wired `frontend/src/apps/tenant/TenantApp.tsx` so the Integrations workspace shows the automation connection plan and the Ops workspace exposes a `Run policy automation` control with scoped dispatch result feedback
- kept the execution model conservative: the worker only processes supported queued actions under current policy, and missing contacts, unsupported actions, or degraded provider paths move to manual review
- verified with `python3 -m py_compile backend/service_layer/tenant_app_service.py backend/api/v1_tenant_handlers.py backend/api/v1_tenant_routes.py`, `./.venv/bin/python -m pytest backend/tests/test_api_v1_tenant_routes.py -q`, `cd frontend && npx tsc --noEmit`, and `npm --prefix frontend run build`

Implementation update from `2026-04-25` (roadmap and pitch architecture visualization):

- added a buyer-readable architecture flow visual to `pitch.bookedai.au` before the detailed architecture section, mapping `customer surfaces -> AI agents -> booking core -> operations truth`
- updated the roadmap UI dataset so Phase/Sprint `17-23` now appear directly in the public roadmap code instead of only in planning documents
- refreshed the roadmap technical architecture language around the current implementation baseline: customer-turn contract, revenue-ops action ledger, tenant Ops, portal-first confirmation, chess/Future Swim vertical proofs, billing truth, widget runtime, and release governance
- synchronized `project.md`, `prd.md`, roadmap/progress planning docs, README, DESIGN, and system overview so the request-facing docs and execution-tracking docs describe the same architecture and next-phase sequence

Implementation update from `2026-04-25` (pitch rewording and layout compression):

- rewrote the pitch hero around a simpler buyer promise: AI receptionist and revenue operations for service businesses
- moved the live Grandmaster Chess tenant proof directly after the hero, so the pitch shows a working booking surface before the system explanation
- moved pricing immediately after product proof, making commercial terms visible before deeper architecture/platform detail
- removed the oversized detailed architecture infographic from the pitch runtime and kept one concise operating-model visual: `demand -> qualification -> booking -> ops ledger`
- updated the pitch navigation order to match the new story: Overview, Product, Problem, Solution, Pricing, Architecture, Surfaces, Trust
- verification passed with `npm --prefix frontend run build` and local Playwright desktop/mobile smoke at `1440x950` and `390x844`; mobile height dropped from the previous roughly `44.9kpx` live review issue to about `21.0kpx`, with no console errors, page errors, failed requests, or horizontal overflow
- live verification passed after production web refresh: `https://pitch.bookedai.au` now serves the new pitch chunk with the hero `AI receptionist and revenue ops for service businesses.`, pricing before architecture, and the concise operating-model visual; Playwright desktop/mobile UAT saved under `output/playwright/pitch-live-reword-uat-2026-04-25/` reported no console errors, page errors, failed requests, horizontal overflow, or overflowing elements
- follow-up deploy verification cleared the earlier Docker-only `PublicApp` resolution caveat: a clean frontend Docker build passed, `python3 scripts/telegram_workspace_ops.py deploy-live` completed successfully, and a scoped `web`/`beta-web` refresh published the final hero copy; post-deploy smoke confirmed API health, all production services running, and pitch desktop/mobile rendering the new hero with no browser issues or overflow
- conversion-path UAT continued from the pitch: `RegisterInterestApp` now sets a page-specific browser title (`Register Interest | BookedAI SME Setup`), production `web`/`beta-web` were refreshed, and live desktop/mobile CTA-to-registration flows submitted to `/api/pricing/consultation` with `200` responses, confirmation references, preserved pitch attribution, no app browser errors, and no mobile horizontal overflow

Implementation update from `2026-04-25` (tenant login hero visual proof):

- added the operator-provided tenant workspace screenshot to the `tenant.bookedai.au` login hero as a professional desktop/tablet preview panel beside the Google-first auth card
- optimized the uploaded PNG into responsive local WebP assets under `frontend/public/branding/optimized/` so the gateway does not depend on the remote upload URL or ship the full original image weight
- kept the mobile login path focused by hiding the preview frame below the tablet breakpoint while preserving the Google, create-account, and email-code auth controls
- verified with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, local Playwright desktop/mobile QA, live web deploy, stack health, and live Playwright checks confirming the image renders, console is clean, and mobile has no horizontal overflow

Implementation update from `2026-04-25` (tenant live QA and Future Swim workspace stability):

- ran a live QA pass on `tenant.bookedai.au` covering the shared login gateway, Google/create-account surfaces, Future Swim tenant workspace, tenant API CORS posture, desktop rendering, and mobile horizontal-overflow checks
- fixed a live Future Swim workspace failure where asyncpg could not infer nullable audit-log filters by casting optional `tenant_ref` and `event_type` filters before `is null` checks
- fixed the live `/api/v1/tenant/revenue-metrics` failure by replacing text interval concatenation with `make_interval(days => cast(:days as integer))`, keeping integer day parameters safe for asyncpg
- fixed the tenant workspace blank-screen crash by removing ready-only `useMemo` calls that executed after loading/error return paths in `TenantApp`
- deployed refreshed backend and web services, then verified stack health, all tenant workspace endpoints including `revenue-metrics` returning `200` with `https://tenant.bookedai.au` CORS, no browser console errors, no `Failed to fetch`, and no mobile horizontal overflow
- verified with `.venv/bin/python -m pytest backend/tests -q`, `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, `bash scripts/healthcheck_stack.sh`, and live Playwright QA for `/` plus `/future-swim`

Implementation update from `2026-04-25` (portal enterprise workspace redesign):

- redesigned `frontend/src/apps/portal/PortalApp.tsx` into a denser enterprise customer workspace with a secure lookup card, booking/payment/support status cards, command navigation, provider/customer detail panels, academy progress context, timeline, and sticky desktop action rail
- replaced duplicated portal view/action copy with shared `portalViewItems`, added clearer status/path label helpers, and fixed request-composer close behavior so the portal returns to `overview` and syncs URL state cleanly
- kept request-safe backend behavior intact: reschedule, cancel, pause, and downgrade remain queued portal requests through existing `/api/v1/portal/bookings/{booking_reference}/...` endpoints
- added `frontend/tests/portal-enterprise-workspace.spec.ts` covering portal render, reschedule request submission, and mobile no-horizontal-overflow behavior
- verified with `npm --prefix frontend run build`, `.venv/bin/python -m unittest backend.tests.test_api_v1_portal_routes`, and `PLAYWRIGHT_EXTERNAL_SERVER=1 npx playwright test tests/portal-enterprise-workspace.spec.ts` against a local `vite preview` server

Implementation update from `2026-04-25` (product booking flow enterprise UX pass):

- tightened `frontend/src/apps/public/HomepageSearchExperience.tsx` for the product/public booking runtime: first likely catalog matches now render while live ranking continues, so slow search feels progressive instead of blank
- changed shortlist behavior so selecting a result marks it active without opening the detail popup or jumping to the customer form; detail, provider link, contact, phone/SMS, and `Book` now sit in one compact responsive icon/action row per result
- changed booking commitment so the customer detail form opens only from explicit `Book this match`/`Book` actions, preserving compare/review behavior before the customer commits
- changed the booking confirmation QR fallback to always target `portal.bookedai.au` with the booking reference, then added compact portal, email, calendar, chat, and home actions beside the confirmation state
- superseded the earlier Thank You auto-return behavior: the booking confirmation now stays visible until the customer chooses another action, while chat continuation remains available from the same confirmed-booking context
- verified with `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py backend/tests/test_api_v1_search_routes.py backend/tests/test_api_v1_communication_routes.py -q`, `npm --prefix frontend run build`, and `PLAYWRIGHT_SKIP_BUILD=1 npm --prefix frontend run test:playwright:live-read`

Implementation update from `2026-04-25` (tenant gateway Google-first login and account creation):

- simplified `tenant.bookedai.au` into a cleaner enterprise login gateway: concise hero, compact trust signals, Google-first sign-in/create, and email-code fallback
- changed the frontend Google auth payload so gateway `Sign in` uses `auth_intent: sign-in`, while gateway `Create account` uses `auth_intent: create`
- hardened backend tenant Google auth so sign-in intent with no active membership returns `tenant_google_membership_not_found` instead of creating a new workspace or tenant membership implicitly
- kept the explicit Google create-account path for new tenant workspaces and covered the split with a new focused backend tenant auth regression test
- verified with `.venv/bin/python -m pytest backend/tests/test_api_v1_tenant_routes.py -q`, `npm --prefix frontend run build`, and local Playwright desktop/mobile QA for `/tenant` with no console errors and no mobile horizontal overflow

Implementation update from `2026-04-25` (admin login routing recovery and workspace layout):

- diagnosed the current `admin.bookedai.au` login failure as an ingress/static-routing issue: live `POST /api/admin/login` returned frontend nginx `405`, while `/api/health` on the admin host returned the admin HTML shell instead of backend JSON
- added an explicit `/api/` backend proxy to the `admin.bookedai.au` server block in `deploy/nginx/bookedai.au.conf`, restoring the shipped shared-frontend admin login path to FastAPI
- added the same `/api/` proxy before SPA fallback in `frontend/nginx/default.conf` so direct frontend-container serving also routes admin, tenant, and product API calls to the backend instead of static HTML
- reorganized the shipped admin workspace from a large card selector into a sidebar-led shell in `frontend/src/components/AdminPage.tsx` and `frontend/src/features/admin/workspace-nav.tsx`, grouping workspaces into `Operate`, `Tenants`, `Revenue`, and `Platform` lanes with lucide icons and a compact active-surface summary; the Catalog workspace now stacks partner profile management ahead of service import so protected partner mutations remain viewport-safe beside the sidebar
- verified with `npm --prefix frontend run build`; live proxy `nginx -t` passed through `sudo -n docker compose ... exec proxy nginx -t`, the proxy container was restarted, `https://admin.bookedai.au/api/health` returned backend JSON, and a bad-password login probe now returns backend `401 Invalid admin credentials` instead of frontend nginx `405`; targeted Playwright coverage passed for the previously failing partner create re-auth smoke
- final mainline QA and deployment then passed with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run test:playwright:admin-smoke`, `.venv/bin/python -m pytest backend/tests -q`, and `bash scripts/run_release_gate.sh`; commit `71436df` was pushed to `origin/main`, deployed through `python3 scripts/telegram_workspace_ops.py deploy-live`, stack health passed, and live admin probes confirmed `admin.bookedai.au` serves the refreshed bundle while `/api/health` and bad-password login reach the backend

Implementation update from `2026-04-25` (admin login same-origin hardening and enterprise entry redesign):

- traced the remaining browser-side admin login failure risk to the production admin bundle still honoring the global `VITE_API_BASE_URL=https://api.bookedai.au/api`; `frontend/src/shared/config/api.ts` now forces `admin.bookedai.au` to use same-origin `/api` before environment overrides, so login posts through the admin-host proxy that was already verified live
- wrapped `loginAdmin(...)` network failures in `frontend/src/features/admin/api.ts` so raw browser errors such as `Load failed`, `Failed to fetch`, or `NetworkError` become an operator-readable admin API reachability message instead of leaking transport text in the form
- redesigned `frontend/src/features/admin/login-screen.tsx` into a polished enterprise control-plane entry: dark command-center shell, secure sign-in panel, API-route posture indicator, BookedAI brand mark, operator intelligence copy, and compact operational status rows for booking ops, revenue posture, and platform control
- verification passed with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, `npm --prefix frontend run test:playwright:admin-smoke`, `.venv/bin/python -m pytest backend/tests -q`, and `bash scripts/run_release_gate.sh`; a hostname-mapped Playwright probe against the built bundle confirmed login now requests `http://admin.bookedai.au:<port>/api/admin/login` on the same origin

Implementation update from `2026-04-25` (admin live UAT and production session-secret runtime fix):

- follow-up live UAT found a second admin-login runtime gap: `docker-compose.prod.yml` passed the admin credential variables but not the session-signing secret family into `backend`/`beta-backend`, so successful credential checks could still fail while minting the signed admin session token
- `docker-compose.prod.yml` now passes `SESSION_SIGNING_SECRET`, `TENANT_SESSION_SIGNING_SECRET`, and `ADMIN_SESSION_SIGNING_SECRET` into both backend services
- production deployment initially hit a 100% root disk condition during Docker web image export; Docker build cache cleanup reclaimed space, after which `python3 scripts/telegram_workspace_ops.py deploy-live` completed successfully
- verification passed with live `/api/health`, live `/api/admin/login` returning `200`, and Playwright UAT artifacts under `output/playwright/admin-live-uat-2026-04-25/`; desktop and mobile login/navigation across all admin workspaces returned only `200` API responses, with no console errors, page errors, failed requests, or horizontal overflow

Implementation update from `2026-04-26` (admin investor/SME polish after full UAT review):

- tightened `frontend/src/features/admin/dashboard-header.tsx` and the admin shell CSS so mobile admin keeps session state in a full-width row, separates action buttons into a stable grid, and gives top KPI cards board-facing definitions for booking volume, AI capture rate, missed revenue, and Stripe-ready checkouts
- refined `frontend/src/features/admin/bookings-filters-bar.tsx`, `bookings-table-chrome.tsx`, and `bookings-table-row.tsx` so the booking search CTA no longer protrudes on mobile, table scrolling stays contained, and long booking/customer/service text wraps safely inside cells
- translated the Reliability lane from implementation-era prompt language into buyer/operator language across workspace insights, drill-downs, standby panels, config risk copy, and the revenue-ops ledger: visible UI now speaks in terms of AI quality, automation triage, and automation control
- verification passed with `npm --prefix frontend exec tsc -- --noEmit`, `cd frontend && npx vite build`, `node frontend/scripts/generate-hosted-html.mjs`, and local Playwright desktop/mobile layout probes under `output/playwright/admin-polish-local-2026-04-26/`; desktop/mobile had no horizontal scroll, no console errors, and no visible `Prompt 5`/`Prompt 11` copy in the Reliability workspace

Implementation update from `2026-04-25` (public brand/menu, live booking QA, and responsive regression):

- replaced the public/product/demo/shared header brand treatment with the uploaded BookedAI logo asset and added cropped responsive logo frames so top-left branding remains readable without causing horizontal overflow
- added the uploaded `Chess_screen` image to the public homepage and live pitch surface immediately before the hero prompt/overview as a professional proof band for the Grandmaster Chess booking flow, with responsive image framing, product context, and compact status cards
- adjusted the top `pitch.bookedai.au` chess proof image from cropped cover sizing into a padded professional screen frame using `object-contain` and a stable 3:2 aspect ratio, keeping the image fully visible inside its card
- refined the final `pitch.bookedai.au` CTA so the latest uploaded image now sits in a full-width responsive 3:2 frame, the CTA controls sit underneath the image, and the pitch footer hides the verbose positioning, tenant-currency badge, and release-source text that previously overflowed
- generated local optimized WebP variants for the uploaded logo, chess proof, final contact proof, and pitch team images under `frontend/public/branding/optimized/`; large proof images now use `srcSet` and `sizes` so mobile/desktop browsers avoid the original multi-megabyte upload files
- upgraded the shared landing menu defaults to professional runtime links (`Product`, `Live Demo`, `Tenant Login`, `Roadmap`) and lucide iconography
- restored regression-stable public homepage action names and visible status copy: `Open Web App`, `Send search`, `Ready to receive`, `Continue to booking`, and `Continue booking`
- hardened homepage live-read search so the newer customer-agent turn can fail closed into the established v1 matching/search helper instead of blocking the real booking path
- adjusted clarification gating so service + location queries can show a shortlist immediately while still asking for timing as follow-up context
- verified with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, `python3 scripts/telegram_workspace_ops.py deploy-live`, `bash scripts/healthcheck_stack.sh`, local and live Playwright request audits confirming `pitch.bookedai.au` no longer requests `upload.bookedai.au/images` during full-page image smoke, live `pitch.bookedai.au` browser smoke at `390px` and `1440px`, `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-homepage-responsive.spec.ts --project=live-read`, and focused live-read booking smoke coverage for the v1 booking-intent path plus near-me location guardrail

Planning and execution synchronization update from `2026-04-25` (next phase plan and GitHub closeout):

- added `docs/development/next-phase-implementation-plan-2026-04-25.md` as the executable bridge for the next BookedAI phases after the full-flow QA and Thank You handoff work
- locked the next phase sequence as `Phase 17` full-flow stabilization, `Phase 18` revenue-ops ledger control, `Phase 19` customer-care/status agent, `Phase 20` widget/plugin runtime, `Phase 21` billing and receivables truth, `Phase 22` reusable multi-tenant templates, and `Phase 23` release governance
- updated `prd.md`, `docs/architecture/implementation-phase-roadmap.md`, and `docs/architecture/current-phase-sprint-execution-plan.md` so the roadmap, PRD, and execution plan all point to the same implementation order
- the current verified release baseline remains the live pitch/product full-flow path with booking success, persistent portal-first Thank You confirmation, and downstream revenue-ops handoff

Implementation update from `2026-04-25` (Phase 18 revenue-ops ledger tenant visibility):

- extended the revenue-ops action ledger API so `GET /api/v1/agent-actions` now accepts deeper filters for `entity_type`, `entity_id`, `agent_type`, `dependency_state`, and `lifecycle_event` in addition to tenant, booking, student, status, and action type
- added a ledger summary payload for total, queued, in-progress, sent, completed, manual-review, failed, and needs-attention counts so admin and tenant surfaces can explain action posture without deriving it only from a limited page of rows
- added derived action metadata to each ledger response: lifecycle event, dependency state, policy mode, approval requirement, and evidence summary based on the existing action input/result payloads
- upgraded the admin Reliability ledger with entity-id, dependency-state, and lifecycle-event filters plus policy/evidence summary on each action card, making it easier to trace a booking lifecycle or provider-dependency chain
- added a tenant-facing `Ops` workspace panel in `frontend/src/apps/tenant/TenantApp.tsx` so tenant users can inspect BookedAI follow-up, payment reminder, CRM sync, customer-care, and webhook action state, including the event/policy/evidence posture, without receiving admin-only transition controls
- verified with `./.venv/bin/python -m pytest backend/tests/test_api_v1_academy_routes.py backend/tests/test_academy_action_worker.py -q`, `cd frontend && npx tsc --noEmit`, and `npm --prefix frontend run build`

Implementation update from `2026-04-25` (public AI-agent chat and SME revenue-ops handoff):

- added `POST /api/v1/agents/customer-turn` as the reusable customer-facing AI agent turn contract; it accepts a message, chat context, runtime channel context, attribution, and location, then returns an assistant reply, phase, missing context, suggestions, grounded search payload, and next-agent handoff metadata
- wired `frontend/src/apps/public/HomepageSearchExperience.tsx` to use the new customer-agent turn contract for live-read homepage searches before falling back to the older helper path, so the visible chat thread is now driven by a backend agent response rather than only client-side copy
- wired `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` to use the same customer-agent turn contract for popup/product assistant searches before falling back to legacy streaming, keeping the public-owned and embedded assistant surfaces aligned
- upgraded `frontend/src/apps/public/HomepageSearchExperience.tsx` so the homepage keeps an explicit chat thread with user turns, assistant replies, inline top-result mini cards, and suggestion chips that can continue the search from inside the conversation
- changed clarification-answer chips to continue the same chat path and rerun search with the added context, keeping the customer-facing agent flow closer to `ask -> refine -> show results -> book`
- added `POST /api/v1/revenue-ops/handoffs` on top of `agent_action_runs`, letting a booking lifecycle event queue SME revenue-operations actions for lead follow-up, payment reminder, CRM sync, customer-care status monitoring, and webhook callback
- wired homepage and popup/product post-booking automation to queue that revenue-ops handoff after payment, email, SMS, and WhatsApp best-effort steps, so the customer-facing search/conversation agent now spawns the downstream revenue operations agent across the main public assistant surfaces
- updated the revenue-ops worker policy and admin Reliability action filters so generic SME actions and academy actions can both progress through the existing action-run dispatcher without pretending unsupported provider delivery
- verified with `./.venv/bin/python -m pytest backend/tests/test_api_v1_search_routes.py backend/tests/test_api_v1_academy_routes.py backend/tests/test_academy_action_worker.py -q` and `npm --prefix frontend run build`

Implementation update from `2026-04-24` (public homepage app-shell polish continuation):

- continued the ChatGPT-like homepage redesign by adding a compact `chat -> match -> book` flow rail under the `bookedai.au` hero prompt chips
- changed the homepage booking side panel so the booking form no longer appears before the user selects a shortlist match; the empty state now explains that the form unlocks after a match is chosen
- kept the booking panel visible as the right-side output surface on desktop and stacked below chat on mobile, but made its initial state guidance-first rather than form-first
- verified with `npm --prefix frontend run build` and refreshed Playwright screenshots at `output/playwright/publicapp-chatgpt-redesign-desktop-v2.png` and `output/playwright/publicapp-chatgpt-redesign-mobile-v2.png`
- local prompt-click smoke confirms the UI transitions into the search state; the static preview still returns expected unauthenticated local `401` responses for `/api/v1/conversations/sessions`, `/api/v1/matching/search`, and `/api/booking-assistant/chat`

Implementation update from `2026-04-24` (public homepage ChatGPT-like web app redesign):

- redesigned the shipped public homepage in `frontend/src/apps/public/PublicApp.tsx` around a simple ChatGPT-like app shell with desktop sidebar, compact top navigation, short `bookedai.au` hero banner, and prompt chips that run the live assistant flow
- softened `frontend/src/apps/public/HomepageSearchExperience.tsx` so the main homepage now reads as a single chat-to-booking workspace instead of a heavier landing/dashboard composition
- kept the existing live search, shortlist, booking, payment, portal, and follow-up runtime contracts intact while changing the visual hierarchy and responsive layout
- verified the redesign with `npm --prefix frontend run build` and Playwright desktop/mobile screenshots at `output/playwright/publicapp-chatgpt-redesign-desktop.png` and `output/playwright/publicapp-chatgpt-redesign-mobile.png`
- local preview still logs the inherited unauthenticated local `/api/v1/conversations/sessions` `401`, which is expected when the static preview is not connected to an authenticated backend runtime

Implementation update from `2026-04-24` (chess subscription handoff and revenue-ops ledger):

- implemented the first Slice 2/3 chess handoff seam: `POST /api/v1/subscriptions/intents`
- added migration `018_academy_subscription_and_agent_action_runs.sql` for `academy_subscription_intents` and `agent_action_runs`
- extended `AcademyRepository` and `academy_service` so a booking-linked academy student can create a subscription intent and queue revenue-operations action runs for subscription confirmation, payment reminder, CRM sync, report generation, and retention evaluation
- extended academy student snapshots with latest subscription intent and recent agent actions, giving the future customer-care/status agent a durable state source
- wired `demo.bookedai.au` to call the subscription intent endpoint after booking and parent report preview creation, then show the queued revenue-agent actions in the booking panel
- added direct revenue-ops queue seams `POST /api/v1/reports/generate` and `POST /api/v1/retention/evaluate`, both backed by `agent_action_runs`, audit, and outbox entries
- verified with `python3 -m py_compile backend/repositories/academy_repository.py backend/service_layer/academy_service.py backend/api/v1_academy_handlers.py backend/api/v1_academy_routes.py`, `cd backend && ../.venv/bin/python -m pytest -q tests/test_api_v1_assessment_routes.py tests/test_api_v1_academy_routes.py tests/test_api_v1_contract.py`, and `npm --prefix frontend run build`
- remaining Slice 2/3 work is real Stripe subscription checkout, invoice/receivable linkage, action runners, and tenant/admin ledger workspaces

Implementation update from `2026-04-24` (demo bookedai full-flow workspace redesign):

- redesigned `demo.bookedai.au` as a more professional full-flow academy revenue workspace rather than a chat-only first screen
- added a visible flow rail for `intent -> assessment -> placement -> booking -> retain`, upgraded the header status treatment, and made the desktop layout show intake, academy matches, and revenue workflow together
- tightened the booking guardrail so result cards clearly show `Assess first` until placement is complete, avoiding a misleading pre-assessment booking CTA
- upgraded the revenue workflow panel language and state hierarchy around lead, booking intent, CRM, payment truth, and parent report continuity
- verified the frontend with `npm --prefix frontend run build` and Playwright screenshots at `output/playwright/demo-redesign-desktop-v3.png` plus `output/playwright/demo-redesign-mobile.png`; local browser API calls still return `401 Unauthorized` because the local Vite page is not connected to an authenticated backend runtime

Planning and execution synchronization update from `2026-04-24` (chess connected-agent implementation backlog):

- added `docs/development/chess-agent-implementation-backlog.md` as the concrete programming backlog for the new chess-first connected-agent wave
- the new backlog breaks the chess execution into API/contracts, data model, jobs and triggers, UI surfaces, dependencies, and acceptance tests instead of leaving the next step at PRD/roadmap level only
- the coding order is now explicit for implementation: assessment and placement -> subscription and payment handoff -> revenue-ops action queue and runners -> parent status/support -> report loop -> tenant/admin visibility -> reusable extraction
- this backlog is now the recommended implementation bridge between the chess blueprint and actual coding work

Planning and execution synchronization update from `2026-04-24` (connected-agent chess-first priority):

- tightened the requirement baseline again so the AI agents are no longer only listed separately in `prd.md`; the PRD now explicitly defines the handoff contract between `Search and Conversation Agent`, `Revenue Operations Agent`, and `Customer Care and Status Agent`
- locked the shared cross-agent context that must survive handoff: tenant identity, customer identity, source/channel, lifecycle state, confidence, action history, pending tasks, and escalation state
- raised `Grandmaster Chess Academy` again from demo blueprint to delivery priority: chess is now the first required end-to-end connected-agent implementation before the pattern is generalized across broader tenant templates
- updated `docs/architecture/implementation-phase-roadmap.md` and `docs/architecture/current-phase-sprint-execution-plan.md` so the next execution order is explicitly `chess intake/assessment -> chess booking/subscription/revenue-ops -> chess parent support/retention -> only then reusable multi-tenant extraction`
- updated `docs/architecture/demo-grandmaster-chess-revenue-engine-blueprint.md` so each agent's role in the chess flow is now explicit and the immediate programming slice starts with agent connections, not only generic new endpoints

Planning and execution synchronization update from `2026-04-24` (AI agent revenue-ops PRD expansion):

- expanded the new root `prd.md` so BookedAI is now requirement-locked as a coordinated AI agent system rather than only a search and booking flow
- the PRD now explicitly separates three first-class agent responsibilities:
  - `Search and Conversation Agent` for customer need capture, clarification, shortlist, quote, and booking handoff
  - `Revenue Operations Agent` for lead follow-up, reminders, CRM sync, webhook/API triggers, tenant billing, summaries, receivables, and retention actions
  - `Customer Care and Status Agent` for returning-customer support based on current booking, payment, invoice, subscription, and communication state
- expanded the tenant and admin requirement baseline to include action queues, receivable and renewal posture, retention-risk visibility, AI-trigger oversight, and customer-state support handling
- expanded the lifecycle requirement baseline so CRM, email, SMS, WhatsApp, webhook, billing, renewal, and retention triggers are now part of the declared product contract rather than implied later implementation
- updated `docs/architecture/implementation-phase-roadmap.md` so the roadmap now carries a dual-agent execution model plus concrete phase deliverables for search/booking agent, revenue-ops agent, billing and retention automation, and hardening
- updated `docs/architecture/current-phase-sprint-execution-plan.md` and `docs/development/sprint-13-16-user-surface-delivery-package.md` so near-term implementation now explicitly includes action queues, reminders, customer-state support, tenant billing automation, and AI-action oversight
- updated `docs/development/bookedai-sample-video-brief.md` and `docs/development/bookedai-video-script-and-shot-list.md` so the pitch story now shows `AI search + revenue operations + retention/billing/customer-care follow-through`, not only `chat -> booking`

Planning and execution synchronization update from `2026-04-24` (unified PRD export):

- synthesized the currently active requirement-side documents into a new root-level `prd.md` so the repo now has one operator-friendly consolidated PRD alongside `project.md`
- aligned the new PRD to the latest project baseline instead of the older April 18 snapshot: public entry remains split across `bookedai.au -> pitch.bookedai.au`, `demo.bookedai.au`, `product.bookedai.au`, `portal.bookedai.au`, `tenant.bookedai.au`, and `admin.bookedai.au`
- merged the active requirement set across public growth, landing/search UX, tenant workspace, admin enterprise workspace, pricing, tenant-first search truth, widget/plugin runtime, and the new chess-academy revenue-engine blueprint
- added the downstream doc sync for this documentation pass in `docs/development/roadmap-sprint-document-register.md` so future requirement updates can treat `prd.md` as a first-class synchronized artifact

Planning and execution synchronization update from `2026-04-24` (Grandmaster Chess revenue-engine blueprint):

- translated the operator's new `Grandmaster Chess Academy` requirement into a code-ready execution note at `docs/architecture/demo-grandmaster-chess-revenue-engine-blueprint.md`
- locked a broader product baseline for `demo.bookedai.au`: the current API-backed demo should now evolve from search-plus-booking proof into a full recurring-revenue academy proof that covers assessment, class placement, subscription-aware payment, coach reporting, parent report delivery, and retention actions
- aligned that blueprint to the current repo reality instead of greenfield assumptions: `demo.bookedai.au` remains the first-minute BookedAI proof, `chess.bookedai.au` remains the tenant-branded academy runtime, existing public v1 search / lead / booking / payment seams stay the foundation, and the next implementation wave should add assessment, placement, learning-ops, and retention APIs as bounded contexts rather than overloading the current booking-only surface
- locked the multi-tenant rule for that new academy slice too: chess is now the first vertical template, not a one-off branch, so assessment templates, placement rules, report prompts, billing policy, and retention policy should be tenant-configurable and reusable for later SME customers
- moved the first implementation wave from blueprint into product code: backend now exposes `POST /api/v1/assessments/sessions`, `POST /api/v1/assessments/sessions/{session_id}/answers`, `POST /api/v1/placements/recommend`, and `GET /api/v1/classes/availability` through the new assessment router, with deterministic Grandmaster Chess Academy scoring and placement logic isolated in `backend/service_layer/chess_revenue_engine_service.py`
- upgraded `demo.bookedai.au` from direct search-to-booking into a staged chess-academy flow: `frontend/src/apps/public/demo/useDemoBookingExperience.ts` now runs search, assessment, placement, then booking; the chat rail renders assessment Q&A; the results rail shows placement, suggested plan, and slot posture before booking opens
- added the next parent-facing seam on top of that same flow: backend now exposes `POST /api/v1/reports/preview` plus `GET /api/v1/reports/preview/{booking_reference}`, persists the generated preview under `booking_intents.metadata_json`, and the demo booking success state now renders a parent-report preview card in both modal and booking panel instead of stopping at payment or confirmation
- the same chess lane then connected into the customer-care portal on `2026-04-24`: portal booking detail now carries `academy_report_preview`, the customer-facing `PortalApp` renders parent progress and next-class context, and portal request handling now supports `pause_request` plus `downgrade_request` alongside the earlier `reschedule_request` and `cancel_request`
- the backend academy lane then moved from booking-metadata continuity into the first dedicated read model on `2026-04-24`: migration `017_academy_snapshot_read_models.sql` now adds tenant-scoped `academy_students`, `academy_assessment_snapshots`, `academy_enrollment_snapshots`, `academy_report_snapshots`, and `academy_portal_request_snapshots` as additive snapshot-first tables for the chess template and later vertical reuse
- `backend/repositories/academy_repository.py` plus `backend/service_layer/academy_service.py` now own the first academy persistence and read layer: booking-linked student upsert, latest assessment or enrollment or report reads, and queued pause or downgrade request persistence plus outbox and audit recording
- backend now also exposes stable academy read and retention seams through `GET /api/v1/academy/students/{student_ref}`, `GET /api/v1/academy/students/{student_ref}/report-preview`, `GET /api/v1/academy/students/{student_ref}/enrollment`, `POST /api/v1/portal/requests/pause`, and `POST /api/v1/portal/requests/downgrade` without reopening the current booking or payment write paths
- `/api/v1/reports/preview` now dual-writes: it still stores `academy_report_preview` under `booking_intents.metadata_json` for backward compatibility, and it now also persists academy student, assessment, enrollment, and report snapshots so the same booking can reopen as a longer-lived academy student record
- `backend/service_layer/tenant_app_service.py` portal snapshots now treat academy student/report context as best-effort read-model truth too, falling back cleanly when the new academy tables are not yet populated instead of breaking older portal bookings
- targeted backend verification passed with `cd backend && ../.venv/bin/python -m pytest -q tests/test_api_v1_assessment_routes.py tests/test_api_v1_academy_routes.py tests/test_api_v1_portal_routes.py tests/test_phase2_repositories.py`

Planning and execution synchronization update from `2026-04-24` (Slice 6: Tenant Leads Panel):

- shipped the Tenant Leads panel as part of the Golden Tenant Activation Loop (Slice 6)
- backend: added `list_tenant_leads` to `backend/repositories/reporting_repository.py` — LEFT JOINs against `crm_sync_records` to derive `crm_sync_status` and `crm_external_id` per lead; parameterised optional `status_filter`; ordered by `created_at desc`; limit 30
- backend: added `build_tenant_leads_snapshot` to `backend/service_layer/tenant_app_service.py` — resolves tenant context, loads leads list and overview summary, derives `needs_follow_up`, `converted`, and `crm_attention` counts for stat card display
- backend: added `GET /api/v1/tenant/leads` route to `backend/api/v1_routes.py` — resolves tenant via `_resolve_tenant_request_context`, accepts optional `?status=` query param, returns `build_tenant_leads_snapshot` result
- frontend: added `TenantLeadItem` and `TenantLeadsResponse` interfaces to `frontend/src/shared/contracts/api.ts`
- frontend: added `getTenantLeads(tenantRef, statusFilter, sessionToken)` to `frontend/src/shared/api/v1.ts` and registered it on the `apiV1` export object
- frontend: extended `TenantPanel` union type to include `'leads'` in `frontend/src/apps/tenant/TenantApp.tsx`
- frontend: extended `TenantLoadState` ready variant with `leads: TenantLeadsResponse | null` — loads lazily on-demand, not in initial `Promise.all`, to avoid blocking workspace load
- frontend: added two `useEffect` hooks — one resets `leads` to `null` on `leadsStatusFilter` change (triggering reload), one lazy-loads leads when `panel === 'leads'` and `leads === null`
- frontend: added swim-aware Leads panel render block in `TenantApp.tsx`: summary stat cards (total / active / needs follow-up / converted / CRM attention), status filter tabs (All / New / Active / Converted), leads list with name, status badge, CRM sync badge, follow-up indicator, email/phone, service name, and formatted date; skeleton loading states and empty state handled; Future Swim tenants see "Enquiries" / "Parent enquiries" throughout via `isFutureSwimTenant()`
- all backend files passed `python -m py_compile`; frontend passed `npx tsc --noEmit` with zero errors; build passed `npm --prefix frontend run build`; deployed via `python3 scripts/telegram_workspace_ops.py deploy-live`; stack health verified via `bash scripts/healthcheck_stack.sh`

Planning and execution synchronization update from `2026-04-24` (mobile pass and debt cleanup):

- shifted the public internet entry host again on `2026-04-24`: `deploy/nginx/bookedai.au.conf` now redirects both `http://bookedai.au` and `https://bookedai.au` plus `www.bookedai.au` to `https://pitch.bookedai.au`, so apex traffic now lands on the pitch surface instead of the demo host
- updated `scripts/healthcheck_stack.sh` to verify that apex redirect explicitly and then smoke-test `https://pitch.bookedai.au` as the current canonical public web surface
- synchronized `project.md`, `README.md`, and `docs/architecture/system-overview.md` to treat `bookedai.au` as the canonical redirect into the pitch host
- fixed the live pitch package-registration flow on `2026-04-24`: `/register-interest` and `/roadmap` now win over host-level pitch/product routing, `https://pitch.bookedai.au` is included in production CORS for the configured `api.bookedai.au` frontend API base, and pricing consultation creation now degrades calendar, Stripe, event-store, or dual-write side-effect failures into manual follow-up instead of surfacing `Failed to fetch`
- tightened the package-selection UI in `frontend/src/apps/public/RegisterInterestApp.tsx` into compact icon-led option boxes with line clamping, reducing mobile text overflow and vertical sprawl while keeping all five BookedAI package choices visible
- verification for that fix passed through `python3 -m py_compile`, `./.venv/bin/python -m pytest backend/tests/test_pricing_consultation_resilience.py -q`, `npm --prefix frontend run build`, `python3 scripts/telegram_workspace_ops.py deploy-live`, `bash scripts/healthcheck_stack.sh`, an API CORS preflight from `https://pitch.bookedai.au`, and a live browser flow from pitch pricing to confirmation reference `CONS-391FA9D5`
- fixed the live `product.bookedai.au` product QA flow on `2026-04-24`: product shell desktop/mobile layout is wider and less blank on first mobile view, and `/api/v1/payments/intents` no longer fails after public-web booking confirmation because booking lookup now accepts UUID text or `booking_reference`, casts mixed service/tenant joins, and persists payment state under the booking's real tenant
- verification for the product QA fix passed with `python3 -m py_compile backend/api/v1_booking_handlers.py`, `../.venv/bin/python -m pytest -q tests/test_api_v1_booking_routes.py`, `npm --prefix frontend run build`, live backend/web deploy recovery, `bash scripts/healthcheck_stack.sh`, direct product-origin curl to `/api/v1/payments/intents`, and final Playwright live booking `v1-1ed89a5995` with no console errors or failed requests
- hardened the production deploy/health path after that live recovery exposed a transient Docker Compose recreate failure on `hermes`: `scripts/deploy_production.sh` now retries the full production compose bring-up with orphan cleanup, and `scripts/healthcheck_stack.sh` now validates running production Compose services instead of relying on fixed container names that can drift during recreate recovery
- verification for the deploy hardening passed with `bash -n scripts/deploy_production.sh scripts/healthcheck_stack.sh`, host-level `docker compose -f docker-compose.prod.yml ps --services --status running` showing `hermes`, `backend`, `beta-backend`, `beta-web`, `n8n`, `proxy`, and `web`, plus `bash scripts/healthcheck_stack.sh` passing at `2026-04-24T17:05:26Z`

- confirmed all 216 backend tests pass — the `test_api_v1_routes.py` public-web fallback carry-forward note was stale; coverage now lives in bounded-context modules and all tests pass cleanly; `project.md` open-carry-forward list was updated accordingly
- completed a homepage mobile polish pass across `frontend/src/apps/public/PublicApp.tsx` and `frontend/src/apps/public/HomepageSearchExperience.tsx`:
  - removed dead `pb-28` bottom padding on mobile that was added for a fixed bottom bar which no longer exists in the render tree
  - removed dead `isBottomBarVisible` state, its associated scroll-tracking `useEffect`, its `setIsBottomBarVisible` effect, and the dead `mobileStatusLabel` derived value — none were used in JSX
  - added `hidden xl:block` to the sidebar "Keep search, selection, and booking in one place" decorative card so it no longer stacks below search results on mobile
  - added `hidden xl:block` to the sidebar "Booking workflow" steps panel so the workflow steps no longer clutter the mobile view when no service is selected
  - added `hidden xl:block` to the sidebar "Follow-up flow" panel for the same reason — on mobile the booking form itself is the correct CTA surface
  - made suggested search chips horizontally scrollable on mobile in `PublicApp.tsx` instead of wrapping across multiple rows, using `overflow-x-auto` with `shrink-0` chips and native scrollbar hiding
- production build passed through `npm --prefix frontend run build` and `cd frontend && npx tsc --noEmit`; deployed live through `python3 scripts/telegram_workspace_ops.py deploy-live`; stack health passed through `bash scripts/healthcheck_stack.sh`

Planning and execution synchronization update from `2026-04-23`:

- fixed a live homepage booking regression on `2026-04-24`: `frontend/src/apps/public/HomepageSearchExperience.tsx` no longer forces non-catalog shortlist matches through the legacy `/booking-assistant/session` path, so live-read and public-web results now stay on the authoritative v1 booking-intent flow instead of failing with `Selected service was not found`
- tightened the same booking lane again on `2026-04-24`: the live-read happy path now always resolves the immediate result from the authoritative v1 booking-intent response instead of trying to re-hydrate eligible shortlist matches back through the legacy catalog booking session, which keeps payment and follow-up posture derived from live-read truth instead of a mixed-session fallback
- redeployed that homepage booking fix through `python3 scripts/telegram_workspace_ops.py deploy-live`, and production health passed again via `bash scripts/healthcheck_stack.sh`
- completed the homepage runtime handoff on `2026-04-24`: the real production `bookedai.au` surface now serves the calmer Google-like search-first layout from `frontend/src/apps/public/PublicApp.tsx` instead of leaving that direction only in the parallel root Next.js shell, while still keeping the approved logo, existing navigation, live `HomepageSearchExperience`, and the shorter product-first `bookedai.au / pitch.bookedai.au / product.bookedai.au` split
- verification for that runtime move passed through `npm --prefix frontend run build`, `cd frontend && npx tsc --noEmit`, `python3 scripts/telegram_workspace_ops.py deploy-live`, and `bash scripts/healthcheck_stack.sh`; live proof was also captured in `artifacts/screenshots/publicapp-live-2026-04-24.png`
- synchronized planning again on `2026-04-24` around one clearer public priority: homepage work should now be treated as the lead responsive web-app UX stream for the project, with a stronger ChatGPT-like search-workspace direction, same-page results, and one adjacent desktop booking rail instead of allowing the homepage to drift back toward stacked landing-page sections
- started the next homepage UI pass for that priority in `frontend/src/apps/public/PublicApp.tsx`: the top surface now reads more like a product workspace than a marketing hero, with a calmer app-shell frame, tighter enterprise copy, a more compact query composer, responsive suggestion chips, and clearer framing that the page is one search-and-booking environment rather than a mixed narrative landing page

- added `docs/development/golden-tenant-activation-revenue-proof-loop-2026-04-23.md`, locking the next phase to a web-first `Golden Tenant Activation + Revenue Proof Loop`, with `Future Swim` as the primary wedge, `children's chess classes` and `AI Mentor 1-1` as follow-on adaptation templates, `frontend/` as the shipped truth, root Next.js as the controlled admin hardening lane, and React Native explicitly deferred until after the first repeatable tenant activation, billing, conversion, and revenue-proof loop is complete
- started implementation of `Slice 1` for that loop in the shipped tenant runtime: added `frontend/src/features/tenant-onboarding/tenantActivation.ts` to derive a tenant activation state from session plus onboarding plus workspace truth, added `frontend/src/features/tenant-onboarding/TenantActivationChecklistCard.tsx`, and wired the card into `frontend/src/apps/tenant/TenantApp.tsx` so tenants now see a clearer activation control tower with checkpoint status, vertical-aware guidance, and direct CTA routing into `Experience Studio`, `Catalog`, or `Billing` instead of only a generic progress bar
- continued directly into `Slice 2` for billing closure inside the shipped tenant runtime: `frontend/src/features/tenant-billing/TenantBillingWorkspace.tsx` now derives clearer commercial-truth labels for manual vs connected vs provider-backed billing posture, adds explicit billing-readiness and commercial-closure cues, and makes payment-method plus invoice sections read more truthfully for tenants by distinguishing placeholder seams from genuinely live self-serve billing states
- started `Slice 3` for lead conversion aftermath visibility in the root admin lane: `app/admin/leads/[leadId]/page.tsx` now resolves linked customer plus related booking artifacts after conversion and surfaces them in a dedicated `Conversion aftermath` card with downstream links and next-step guidance, while `app/admin/leads/page.tsx` now gives list and kanban operators lightweight downstream-result hints instead of leaving conversion state implicit after the stage changes
- continued into `Slice 4` inside `frontend/src/apps/tenant/TenantApp.tsx` by turning the revenue-capture card into a tenant-facing monthly value board: the overview now combines leads captured, bookings created, paid revenue, outstanding revenue, source contribution, and follow-up/CRM attention signals into one revenue-proof narrative so Future Swim and adjacent SME templates can show a clearer BookedAI value story from the shipped responsive web app
- hardened the same tenant value board for edge cases by replacing brittle source heuristics with booking-signal labels derived from status and payment dependency, adding invoice-backed paid-revenue fallback when higher-level revenue metrics are absent, and making empty-state narrative less misleading when the tenant has partial billing truth but not yet a full metrics sample
- started `Slice 5` for `Future Swim` vertical packaging in the shipped tenant runtime: `frontend/src/features/tenant-onboarding/tenantActivation.ts` and `frontend/src/apps/tenant/TenantApp.tsx` now switch key activation, onboarding, KPI, and value-story wording into swim-school language when the active tenant is Future Swim or another swim tenant, including `Parent enquiries`, `Lessons booked`, `Lesson revenue`, `Parent follow-up`, and swim-specific activation prompts instead of generic B2B SaaS labels
- continued the same `Slice 5` deeper across `frontend/src/features/tenant-onboarding/TenantBusinessProfileCard.tsx`, `frontend/src/features/tenant-plugin/TenantPluginWorkspace.tsx`, and the tenant catalog import/edit flow in `frontend/src/apps/tenant/TenantApp.tsx`, so Future Swim now gets swim-business wording for profile editing, parent-facing intro copy, widget/embed setup, lesson import prompts, class or lesson labels, centre-location placeholders, and parent-enquiry oriented catalog guidance instead of generic partner or service-language copy
- completed a repo-wide source ownership audit at `docs/development/source-ownership-audit-2026-04-23.md`, locking the next execution recommendation to: keep `frontend/` as the shipped product truth, treat root `app/` plus `lib/` plus `components/` as the parallel foundation lane, promote the booking-to-CRM-to-revenue golden flow, and reduce new breadth in root Next.js plus legacy `backend/api/v1_routes.py` until ownership and parity are clearer
- added `docs/development/admin-surface-parity-tracker-2026-04-23.md` to compare the shipped `frontend/` admin shell against the root `app/admin/*` foundation lane, concluding that the frontend lane should keep operator-shell ownership while root Next.js should keep auth, RBAC, repository, Prisma, and deeper module hardening until controlled module-by-module promotion is ready
- added `docs/development/admin-module-promotion-checklists-2026-04-23.md`, turning the parity tracker into concrete promotion gates for `Settings`, `Leads`, and `Customers`, with the recommended rollout order now locked to `Settings` first, then `Leads`, then `Customers`
- added `docs/development/settings-promotion-execution-plan-2026-04-23.md`, combining parallel milestone and risk analysis into the first concrete promotion plan: keep the shipped `frontend/` admin shell as the operator frame, promote root Next.js `Settings` through a controlled link-out handoff, make auth and tenant handoff the first implementation task, and block release if operator-target environments can still mutate fallback-only settings data
- added `docs/development/settings-ownership-mapping-2026-04-23.md` plus `docs/development/settings-auth-tenant-handoff-contract-2026-04-23.md`, freezing Settings ownership by concern and defining the first implementation contract for promotion: one trusted root-recognized session, one verified tenant, preserved support mode, and a clean return path back into the shipped admin shell
- added `docs/development/settings-promotion-technical-task-breakdown-2026-04-23.md`, breaking the next coding wave into implementation-ready streams across shipped frontend changes, root auth and tenant bridge changes, handoff route and param validation, and smoke plus release verification, with the recommended first code slice now locked to a shipped handoff URL helper, a root-side handoff validator, CTA wiring, and a shipped settings summary section
- started that first `Settings` promotion code slice in the repo: `frontend/src/features/admin/settings-handoff.ts` now centralizes shipped-shell handoff URL construction, `frontend/src/features/admin/workspace-settings-summary-section.tsx` adds a new summary plus CTA block inside shipped `Platform Settings`, `frontend/src/components/AdminPage.tsx` mounts that section ahead of live configuration inventory, `server/admin/settings-handoff.ts` now parses and sanitizes root-side handoff params, and `app/admin/settings/page.tsx` now recognizes shell handoff state, preserves a safe return affordance, and locks the page to read-only when the requested tenant does not match the resolved root tenant
- tightened the `Settings` promotion slice one step further: root `Settings` handoff state now distinguishes invalid return paths and missing tenant hints so the page can fall back to an explicit re-entry state instead of a confusing partial handoff, `frontend/tests/admin-workspace-upgrade.spec.ts` now covers the shipped `Open workspace settings` CTA and expected URL contract, and `frontend/scripts/run_admin_smoke.sh` now includes that new Settings handoff smoke case in the admin smoke pack
- added action-level verification for the handoff boundary itself: `server/admin/settings-handoff-core.ts` now holds the pure parser and guard-state logic, `server/admin/settings-handoff.test.ts` verifies trusted contract parsing plus the mutation-locking outcomes for unsafe return paths, missing tenant hints, and tenant mismatch, and `frontend/src/features/admin/settings-handoff.test.ts` verifies that shipped-shell URL generation stays deterministic for both tenant-aware and tenant-missing cases
- moved the `Settings` promotion guard from presentation-only into the mutation layer: `app/admin/settings/action-guard.ts` now enforces trusted tenant handoff fields against the resolved root tenant before any settings mutation proceeds, the `Settings` forms now submit hidden expected-tenant and handoff metadata across workspace, branch, billing, guides, gateway, and plugin mutations, and `app/admin/settings/action-guard.test.ts` now proves server-side rejection for tenant mismatch, missing tenant hints, and support-mode mutation attempts even if a caller bypasses the read-only UI
- closed more of the operator UX gap around that guard: `app/admin/settings/page.tsx` now explains read-only posture for support mode, handoff re-entry, and tenant mismatch in the main header state plus inline form-level warnings, and `components/admin/settings/workspace-settings-form.tsx` now shows a dedicated read-only reason block when the workspace form is disabled so operators understand why writes are blocked instead of only seeing inert controls
- tightened the release-gate coverage again for `Settings`: `app/admin/settings/action-guard.test.ts` now explicitly rejects unsafe return paths, and `components/admin/settings/workspace-settings-form.test.tsx` now proves the root workspace form renders the hidden handoff fields plus the inline read-only explanation that the mutation boundary depends on
- verification for this slice is now materially stronger: root and frontend TypeScript checks both passed via direct `node node_modules/typescript/bin/tsc --noEmit`, the expanded root release-gate tests passed via `node --import tsx --test app/admin/settings/action-guard.test.ts server/admin/settings-handoff.test.ts components/admin/settings/workspace-settings-form.test.tsx`, and the frontend handoff helper tests passed via `node --import tsx --test src/features/admin/settings-handoff.test.ts`; the remaining blocked layer is still browser Playwright execution because the required Chromium binary is not installed in this shell (`Executable doesn't exist ... chrome-headless-shell`)
- opened the next module wave for `Leads` with `docs/development/leads-promotion-baseline-2026-04-23.md`, locking the initial ownership call before any promotion coding: shipped `frontend/` should keep lead summary and operator framing, root `app/admin/leads/page.tsx` should keep mutation and conversion truth, and the next required artefacts are now explicit around ownership mapping, conversion contract, and a guarded execution plan instead of jumping straight into UI rewiring
- added `docs/development/leads-ownership-mapping-2026-04-23.md` and `docs/development/leads-conversion-contract-2026-04-23.md`, freezing the practical handoff model for the next module: shipped shell should own urgency, summary, and return framing, root `Leads` should own triage plus mutation plus conversion truth, and both convert-to-customer and convert-to-booking now have explicit operator-visible aftermath requirements before promotion can proceed
- completed the planning trio for `Leads` with `docs/development/leads-promotion-execution-plan-2026-04-23.md`, turning the module decision into an implementation sequence: first add guarded handoff and support-mode protections in root `Leads`, then make post-conversion aftermath explicit, then add shipped-shell summary plus CTA framing, and only then treat the module as promotion-ready once workflow, mutation, conversion, CRM, and smoke verification gates are satisfied
- started `Leads` implementation slice 1 by mirroring the hardened `Settings` handoff boundary into the root lead workflow: added `server/admin/leads-handoff-core.ts`, `app/admin/leads/action-guard.ts`, and guarded hidden handoff metadata across lead create, list-row actions, and detail-page mutations so support mode, tenant mismatch, and unsafe return paths now block lead writes instead of relying on UI discipline alone; targeted node tests for the new guard/core/form all passed, and root TypeScript now also passes with the new `Leads` handoff surface wired in
- reviewed the current public homepage and pitch surfaces again against the new operator request, then locked a new public content split in `docs/development/homepage-pitch-realignment-plan-2026-04-23.md`: `bookedai.au` should now be reduced into a simpler modern Google-like product-first landing page, while `pitch.bookedai.au` should become the canonical home for the current homepage's longer-form narrative, executive framing, architecture, proof, team, partner, trust, and pricing story instead of making the homepage carry both jobs at once
- synchronized that public-direction change back into `project.md` and `docs/development/sprint-13-16-user-surface-delivery-package.md`, so the active repo truth now explicitly treats homepage simplification plus homepage-to-pitch narrative migration as the next public implementation slice rather than leaving it as a one-off design note
- completed the first practical homepage-to-pitch realignment slice in code: `frontend/src/apps/public/PublicApp.tsx` now behaves as a shorter product-first landing surface with a simplified nav, live-search-first CTA flow, and a tighter `bookedai.au / pitch.bookedai.au / product.bookedai.au` surface split, while `frontend/src/apps/public/PitchDeckApp.tsx` now absorbs the migrated homepage narrative layers through the existing homepage brand, executive-board, proof, overview, implementation, trust, partners, pricing, team, and CTA sections so the long-form story no longer has to live on the homepage itself
- verified that public-surface refactor with a successful `npm --prefix frontend run build`, so the new homepage and pitch composition currently passes production frontend build validation
- polished the homepage one step further toward the requested Google-like product-first feel by replacing the heavier shared hero and closeout composition on `frontend/src/apps/public/PublicApp.tsx` with simpler local sections: a centered minimal hero, a lighter three-card explanation rail, a cleaner `bookedai.au` versus `pitch.bookedai.au` split note, and a shorter closing CTA block that keeps the homepage focused on product entry instead of enterprise board-style narrative density
- re-ran `npm --prefix frontend run build` after that homepage simplification pass, and the frontend production build still passed successfully
- applied the same public-direction intent to the parallel root Next.js homepage shell in `app/page.tsx`, `components/sections/hero-section.tsx`, and `components/sections/footer-section.tsx`: the page now keeps the current logo and nav, but the rest of the experience has been reduced toward a calmer Google-like light UI with a search-led hero, fewer support cards, wider spacing, lighter type weight, quieter CTA copy, and white/pale-blue section treatment instead of the earlier darker glass-heavy landing composition
- direct root verification for that shell also passed through `npm run lint`, so the current Next.js homepage implementation still type-checks cleanly after the simplification pass
- investigated the live `Continue booking` failure path on the public homepage and confirmed the current runtime split: live `/api/v1/leads` and `/api/v1/bookings/intents` were returning `500`, while the older `/api/booking-assistant/session` path still returned `200`; the public booking problem was therefore a real degraded-write issue in the newer lane rather than only CTA wiring or client-side state noise
- hardened the public booking submit flow against that degraded-write posture by adding a shared `shouldFallbackToLegacyBookingSession(...)` guard in `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts` and wiring fallback handling through `frontend/src/apps/public/HomepageSearchExperience.tsx`, `frontend/src/components/landing/sections/BookingAssistantSection.tsx`, and `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`, so `Continue booking` no longer strands the user when the v1 lane fails at server or network level
- the follow-up homepage refinement on `2026-04-24` then narrowed that fallback boundary again: legacy session creation remains a degraded-write recovery path, but the normal live-read success path no longer re-enters the legacy catalog session flow just to enrich the booking result payload
- tightened verification on the same pass: direct frontend type-checking via `cd frontend && npx tsc --noEmit` now passes for the current worktree, and repeated `npm --prefix frontend run build` runs continue to pass after the booking fallback and UX changes
- started the next public-flow polish slice immediately after the resilience fix so the full BookedAI journey reads more professionally under slower search conditions: `frontend/src/apps/public/HomepageSearchExperience.tsx` now exposes staged progress messaging while matching is running, shows clearer explanation of what the system is doing, and prompts the user to add suburb, timing, audience, or preference detail while ranking is still resolving
- mirrored that same slow-search treatment into `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`, so the popup and product-style assistant now use the same staged matching language instead of a flatter generic loading card
- also upgraded the embedded demo lane in `frontend/src/components/landing/sections/BookingAssistantSection.tsx` so its loading bubble now explains intent, locality, and shortlist-quality checks instead of only saying BookedAI is finding a match
- the current public-search requirement baseline is now stricter than the earlier enterprise-booking-only pass: the full BookedAI flow should stay smooth and confidence-building even when search is slow, which means visible progress, better matching-state copy, and contextual prompts for better query inputs are now part of the implementation expectation rather than optional polish
- captured that public-flow requirement and result set in a dedicated execution note at `docs/development/public-search-booking-resilience-ux-2026-04-23.md`, so future homepage and assistant work can inherit one explicit reference for degraded-write fallback, slow-search progress treatment, and query-improvement prompts instead of scattering those decisions across several broader docs
- locked the next architecture layer for the same flow in `docs/development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md`: BookedAI should now be treated as an embeddable multi-tenant runtime that can be installed as a receptionist / sales / customer-service widget on customer-owned SME websites while still preserving one shared booking, portal, payment, and follow-up lifecycle across many tenants
- extended the homepage realignment into a more explicit marketplace-direction visual pass on `2026-04-23`: copied the new strategy image into `frontend/public/branding/bookedai-marketplace-strategy-bg.jpg`, reworked `frontend/src/apps/public/PublicApp.tsx` so the first hero now uses that image as a cinematic backdrop for the SME services marketplace narrative, added restrained motion polish to the hero image layer, and reused the same visual system more lightly in deeper homepage sections so the category-expansion message reads as a coherent product direction instead of one isolated banner treatment

- the shared-frontend admin IA package moved one more practical step on `2026-04-23` from route homes into usable read-model workspaces for the new enterprise lanes:
  - `frontend/src/features/admin/billing-support-summary-section.tsx` now turns the existing admin support queue into a billing-support triage summary with counts for portal requests, payment-attention items, unresolved work, escalations, and reviewed cases
  - `frontend/src/features/admin/integration-health-section.tsx` now derives CRM, messaging, payments, and webhook posture from `recent_events` plus the shared support queue, surfacing attention items before operators drop into reliability or platform settings
  - `frontend/src/features/admin/audit-activity-section.tsx` now presents `Audit & Activity` as a chronology workspace with replay-oriented cards for customer messages, operator actions, provider signals, unresolved queue items, and a combined timeline
  - `frontend/src/features/admin/workspace-read-models.ts` now centralizes the lightweight derivation logic for those new workspace summaries so the broadened admin IA can deepen safely without waiting for another backend contract wave
  - `frontend/src/components/AdminPage.tsx` now mounts these richer workspace sections directly into `Billing Support`, `Integrations`, and `Audit & Activity` while preserving the existing queue, recent-events, reliability, and tenant flows

- the admin enterprise workspace lane moved one step further on `2026-04-23` into the first shared-frontend IA and route package aligned to the locked requirements baseline:
  - `frontend/src/features/admin/types.ts` now widens the admin workspace model from the earlier four-way split into the requested enterprise section map:
    - `Overview`
    - `Tenants`
    - `Tenant Workspace`
    - `Catalog`
    - `Billing Support`
    - `Integrations`
    - `Reliability`
    - `Audit & Activity`
    - `Platform Settings`
  - `frontend/src/components/AdminPage.tsx` now keeps hash-addressable workspace routing while treating older `#operations` links as backward-compatible aliases into `#overview`
  - `frontend/src/features/admin/workspace-nav.tsx` now presents the admin shell as a menu-first control surface organized by business function instead of a narrower four-card workspace selector
  - `frontend/src/features/admin/workspace-insights.tsx` now gives each workspace its own operator guidance, context cards, and panel jump links so the IA is useful even before every later read model lands
  - the admin tenant lane is now intentionally split into a lighter tenant-directory review surface plus the deeper mutable tenant workspace, which keeps tenant selection separate from branding, role, HTML, and catalog mutation
  - the same package also creates explicit current homes for:
    - portal/payment follow-up in `Billing Support`
    - CRM or email or webhook review in `Integrations`
    - event chronology in `Audit & Activity`
    - config and route review in `Platform Settings`
  - syntax-level verification passed through `frontend/node_modules/.bin/esbuild frontend/src/components/AdminPage.tsx --bundle --platform=browser --format=esm --outfile=/tmp/booked-admin-bundle.js`
  - broader frontend verification remains partially constrained in this workspace:
    - standalone `tsc --noEmit` again failed to finish before timeout without surfacing a concrete compiler error
    - `npm --prefix frontend run build` was started but did not complete within the local wait window, so this pass should currently be treated as syntax-verified rather than full-build-verified
- the planning baseline was then tightened again on `2026-04-23` so the next execution wave starts from current repo truth instead of the older pre-IA branch point:
  - `project.md` now records the shared `frontend/src` admin shell as the active operator-facing productization lane, while the root `Next.js` admin tree remains the parallel auth and repository foundation rather than the default next feature surface
  - the project-level auth baseline no longer describes `ADMIN_API_TOKEN` or `ADMIN_PASSWORD` as accepted session-signing fallback posture
  - the current phase execution plan now treats `Campaigns` as already-opened foundation work and locks the next growth-lane slice to `Messaging -> Workflows -> Automation`
  - the Sprint 13-16 package now also includes a concrete `Messaging` implementation slice so the next code wave can start from one shared backlog instead of operator interpretation
- the first practical `Phase 7` messaging slice then started on `2026-04-23` inside the active shared admin shell:
  - FastAPI admin now exposes `GET /api/admin/messaging`, `GET /api/admin/messaging/{source_kind}/{item_id}`, and `POST /api/admin/messaging/{source_kind}/{item_id}/{action}` for the first unified operator messaging lane
  - that lane reads from the current delivery truth across `email_messages`, `outbox_events`, and `crm_sync_records`, so operators can review communication and retry posture without stitching together separate reliability and CRM screens by hand
  - the shared `frontend/src` admin shell now includes a first-class `Messaging` workspace with channel, status, tenant, and search filters plus a detail panel that shows payload and event history for the selected record
  - the first low-risk operator actions now exist too:
    - `retry` for eligible `outbox_events`
    - `retry` for eligible `crm_sync_records`
    - `mark manual follow-up` for `email_messages`
  - the active growth-lane sequence should now be interpreted as `Campaigns -> Messaging -> Workflows -> broader Automation`
  - targeted verification passed through `python3 -m py_compile backend/service_layer/admin_messaging_service.py backend/api/route_handlers.py backend/api/admin_routes.py backend/schemas.py` and `frontend/node_modules/.bin/esbuild frontend/src/components/AdminPage.tsx --bundle --platform=browser --format=esm --outfile=/tmp/booked-admin-messaging-bundle.js`
  - local route-level unittest execution for the new admin messaging routes remains blocked in this shell because `fastapi` is not installed in the default Python runtime

Planning and execution synchronization update from `2026-04-22`:

- the whole-program planning baseline was synchronized again on `2026-04-22` so the master index, current phase plan, roadmap, sprint package, and sprint register all now inherit one shared execution truth:
  - the active chain remains `Sprint 1-3 baseline lock -> Sprint 4-7 truth/reporting/workflow foundation -> Sprint 8-10 tenant/admin foundation -> Sprint 11-16 user-surface SaaS completion and release hardening`
  - tenant auth should now be interpreted as `email-first` in all active plan documents
  - the richer Phase 2 matching contract, the cross-industry full-flow QA pack, and the Phase 7 `Campaigns` workspace are now recorded in the same planning baseline instead of only in code or point updates
  - the request-facing landing, pitch, storyboard, and sample-video docs are now registered as Sprint 15-16 proof-pack inputs rather than floating outside the delivery plan

- the public booking assistant user journey was tightened again on `2026-04-22` toward a more enterprise-grade visible flow:
  - `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` now shows a clearer `matching services` search state while live search is running instead of a more generic loading-only posture
  - the same public assistant now renders an explicit enterprise journey view across search, preview, booking capture, email, calendar, payment, CRM, thank-you, and SMS/WhatsApp follow-up, so the user-facing runtime communicates downstream operations more clearly
  - booking confirmation now also generates reusable customer communication drafts for email, SMS, and WhatsApp when the user provides the matching contact details, helping the public flow read more like a professional revenue-ops handoff instead of a simple thank-you screen
  - `frontend/src/shared/contracts/api.ts` and `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts` now preserve additive `crm_sync` response detail from the v1 booking-intent write path so the public confirmation flow can surface CRM linkage status without changing the backend contract
  - the same public booking submit path now also runs best-effort post-booking automation through the repo's existing v1 seams:
    - `createPaymentIntent(...)` for payment-intent recording
    - `sendLifecycleEmail(...)` for booking confirmation email
    - `sendSmsMessage(...)` and `sendWhatsAppMessage(...)` when a phone number is provided
  - confirmation state now also includes a delivery timeline so operators can inspect traceable booking, payment, email, SMS, WhatsApp, and CRM progression instead of only a single success card
  - payment automation no longer assumes one hardcoded checkout posture; the orchestration now derives payment option from live booking-path trust (`stripe_card`, `partner_checkout`, or `invoice_after_confirmation`)
  - confirmation state now reflects those automation results directly, including operator-attention warnings when provider orchestration remains queued or needs manual follow-up
  - the same enterprise-style booking result posture now also reaches the homepage runtime in `frontend/src/apps/public/HomepageSearchExperience.tsx`, which now preserves `crm_sync`, runs the same best-effort payment/email/SMS/WhatsApp automation after authoritative booking submit, and renders communication drafts plus a delivery timeline instead of a thinner homepage-only success card
  - the homepage authoritative-write path was then hardened again so the captured booking result renders immediately and post-booking automation continues asynchronously, preventing downstream provider calls from delaying the success card or hiding the booking reference
  - homepage sidebar parity also moved further toward `BookingAssistantDialog`: it now renders an explicit enterprise journey rail across search, preview, booking, email, calendar, payment, CRM, messaging, and aftercare directly on the homepage shell
  - homepage smoke coverage was tightened in the same pass: `frontend/tests/public-homepage-responsive.spec.ts` now uses stable homepage selectors and lighter viewport screenshots, and targeted Playwright verification passed for both desktop and mobile homepage shells
  - targeted live-read homepage booking verification also passed after the homepage runtime hardening: `frontend/tests/public-booking-assistant-live-read.spec.ts --grep "booking submit uses v1 booking intent as the authoritative write when live-read is enabled"`
  - backend demo and QA coverage for the same lane now also includes `backend/migrations/sql/016_cross_industry_full_flow_test_pack.sql`, which seeds 10 synthetic cross-industry full-flow bookings plus the matching operator note at `docs/development/bookedai-cross-industry-full-flow-test-pack.md`
  - repo migration execution exposed a real blocker in `backend/migrations/sql/012_demo_revenue_events_seed.sql`, where the older seed still targeted removed `payment_intents` columns; that migration now writes against the current schema using `payment_option`, `external_session_id`, `payment_url`, `currency`, and `metadata_json`
  - `scripts/verify_cross_industry_full_flow_test_pack.sh` now provides a reusable DB-level verifier for the 10-scenario pack, and the real database verification passed after apply:
    - `seeded_scenarios = 10`
    - every `testpack-*` booking now has `lead=1`, `payment=1`, `email=1`, `crm=4`, `outbox=5`, and `audit=1`
    - the status mix now covers pending and paid payment posture plus synced, retrying, manual-review, pending, and failed CRM posture as intended
  - the existing `scripts/verify_backend_migration_state.sh` also passed after the migration repair, confirming the broader migration chain remains healthy after the `012` fix
  - targeted frontend build verification now also passed during the homepage pass through `bash frontend/scripts/run_playwright_suite.sh legacy tests/public-homepage-responsive.spec.ts` and `bash frontend/scripts/run_playwright_suite.sh live-read tests/public-booking-assistant-live-read.spec.ts --grep "booking submit uses v1 booking intent as the authoritative write when live-read is enabled"`, while standalone `tsc --noEmit` still timed out in this workspace without emitting a concrete compiler error

- the BookedAI workspace memory policy was tightened on `2026-04-22` around memory hygiene for OpenClaw-assisted work:
  - `memory/README.md` now explicitly forbids storing routine shell history, raw command transcripts, git command sequences, and ordinary build or deploy logs in dated memory notes
  - `project.md` now carries the same rule at the project baseline level so future implementation passes preserve decisions, outcomes, blockers, risks, and next steps instead of replay-style execution logs
  - command-level detail should now only be preserved when it exposes a durable failure mode, environment constraint, or operator requirement worth remembering later

- the Zoho CRM integration lane moved from blueprint-only to runtime-backed foundation on `2026-04-22`:
  - `backend/config.py` now loads the full `ZOHO_CRM_*` environment family instead of only the earlier Zoho Calendar and Zoho Bookings settings
  - `backend/integrations/zoho_crm/adapter.py` now supports both direct access-token smoke tests and durable refresh-token exchange, while respecting Zoho `api_domain` responses for region-aware CRM calls
  - `/api/v1/integrations/providers/zoho-crm/connection-test` now exposes an operator-safe smoke test that fetches module metadata plus requested module field metadata so tenant mapping can be verified before live write-back begins
  - targeted backend verification passed with `python3 -m py_compile backend/config.py backend/integrations/zoho_crm/adapter.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`
  - repo-local `.env` inspection at implementation time showed no configured `ZOHO_CRM_*` values yet, so the new lane is implementation-ready but still awaiting tenant credentials before live activation
- the Zoho CRM activation lane then moved one more operator step on `2026-04-22`:
  - `backend/config.py` now auto-derives `ZOHO_ACCOUNTS_BASE_URL` from the configured Zoho CRM or Bookings API base URL when the env var is left blank, preventing AU rollouts from accidentally refreshing tokens against the default US accounts host
  - `scripts/zoho_crm_connect.py` now provides repo-local helper commands to print the correct consent URL, exchange an auth code for refresh/access tokens, optionally persist the result into root `.env`, and run a direct CRM connection smoke test
  - `.env.example`, `.env.production.example`, `README.md`, and `docs/development/env-strategy.md` now describe the preferred operator path for durable Zoho CRM activation instead of leaving the final token step as out-of-repo manual knowledge
- the Zoho CRM lane then moved from credentials-ready to live-connected on `2026-04-22`:
  - repo-local `.env` now contains a real `ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`, `ZOHO_CRM_ACCESS_TOKEN`, and `ZOHO_CRM_REFRESH_TOKEN`
  - `python3 scripts/zoho_crm_connect.py test-connection --module Leads` now returns `status: connected` against the AU Zoho CRM tenant
  - the live metadata read confirms BookedAI can see the expected default CRM modules including `Leads`, `Contacts`, `Accounts`, and `Deals`
  - the `Leads` module smoke test returned the core field contract needed by the current BookedAI write-back slice, including `Last_Name`, `Company`, `Email`, `Phone`, `Lead_Source`, and `Lead_Status`
- the Zoho CRM lane then moved from connectivity-only to end-to-end live write verification on `2026-04-22`:
  - `docker-compose.prod.yml` now passes the full Zoho provider env family into `backend` and `beta-backend`, fixing the production runtime gap where live containers stayed `provider_unconfigured` even though host `.env` already had real credentials
  - a live contact sync probe against `POST /api/v1/integrations/crm-sync/contact` now succeeds for test contact `zoho-test-contact-20260422081230`, returning:
    - `sync_status: synced`
    - `crm_sync_record_id: 5`
    - `external_entity_id: 120818000000569001`
  - follow-up live status read through `GET /api/v1/integrations/crm-sync/status?entity_type=contact&local_entity_id=zoho-test-contact-20260422081230` now returns the persisted CRM sync row with `sync_status: synced`, `external_entity_id`, payload echo, and `last_synced_at`
  - the live-write test exposed and then resolved a DB write-back bug in `backend/repositories/crm_repository.py`: `update_sync_record_status(...)` now uses asyncpg-safe `timestamptz` coercion plus a native `datetime` value instead of the earlier parameter shape that triggered runtime `AmbiguousParameterError` and then `DataError`
  - targeted verification passed with:
    - `python3 -m py_compile backend/repositories/crm_repository.py backend/tests/test_phase2_repositories.py`
    - host-level live deploys via `bash scripts/deploy_live_host.sh`
    - live API probe and container-log confirmation showing `POST https://www.zohoapis.com.au/crm/v8/Contacts/upsert "HTTP/1.1 200"`
  - local unittest execution for the new repository regression test is still blocked in this workspace because Python dependencies such as `sqlalchemy` are not installed in the default shell runtime
- the Zoho CRM lane then moved one step further on `2026-04-22` into the first local-first write-back path:
  - `backend/integrations/zoho_crm/adapter.py` now includes `Leads` upsert support using Zoho CRM v8 `/upsert`, with duplicate-check ordering anchored to `Email` and then `Phone`
  - `backend/service_layer/lifecycle_ops_service.py` now attempts a Zoho CRM lead upsert after local lead capture when credentials are present, while preserving the existing `crm_sync_records` ledger-first posture
  - sync status handling is now explicit:
    - `pending` when provider credentials are not configured
    - `manual_review_required` when contact email is missing or payload-level issues are detected
    - `failed` for retryable provider-side HTTP failures
    - `synced` when Zoho returns a successful record id
  - `backend/api/v1_routes.py` and `backend/api/v1_booking_handlers.py` now pass fuller lead context into that lifecycle orchestration so Zoho writes can include name, phone, and business context
  - targeted verification passed with `python3 -m py_compile backend/integrations/zoho_crm/adapter.py backend/service_layer/lifecycle_ops_service.py backend/api/v1_routes.py backend/api/v1_booking_handlers.py backend/tests/test_lifecycle_ops_service.py`
  - full runtime unit execution remains blocked in this environment because local Python dependencies such as `pydantic` are not installed
- the Zoho CRM lane then moved one step further again on `2026-04-22` into replayable operator recovery and contact sync foundation:
  - `backend/integrations/zoho_crm/adapter.py` now also supports `Contacts` upsert for later customer-sync flows
  - `backend/repositories/crm_repository.py` now returns `entity_type` plus stored `payload` from `crm_sync_records`, so replay can use the original sync input instead of only changing status flags
  - `backend/service_layer/lifecycle_ops_service.py` now includes:
    - `orchestrate_contact_sync(...)`
    - `execute_crm_sync_retry(...)`
    - replay helpers for both `lead` and `contact` payloads
  - `/api/v1/integrations/crm-sync/retry` now attempts a real replay through Zoho when configuration and payload permit, and returns the resulting `external_entity_id` when sync succeeds
  - targeted verification passed with `python3 -m py_compile backend/repositories/crm_repository.py backend/integrations/zoho_crm/adapter.py backend/service_layer/lifecycle_ops_service.py backend/service_layer/__init__.py backend/api/v1_integration_handlers.py backend/api/v1_routes.py backend/api/v1_booking_handlers.py backend/tests/test_lifecycle_ops_service.py backend/tests/test_api_v1_integration_routes.py`
  - full runtime unit execution remains blocked here because local Python dependencies such as `pydantic` are still unavailable
- the Zoho CRM lane then moved into the first admin-workspace bridge on `2026-04-22`:
  - backend now exposes `POST /api/v1/integrations/crm-sync/contact`, which runs the contact-sync orchestration and returns sync status, sync record id, and external entity id
  - root admin customer actions now call that backend contact-sync route through `lib/integrations/zoho-contact-sync.ts` after customer create and update operations
  - the bridge is best-effort and keeps the current architecture split intact: root admin remains the customer mutation surface while backend remains the Zoho CRM orchestration surface
  - targeted backend verification passed with `python3 -m py_compile backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`
  - project-wide `tsc --noEmit` was re-run but did not finish within the 30-second execution window in this environment, so TypeScript verification remains partial rather than confirmed complete
- the Zoho CRM lane then moved one step further again on `2026-04-22` into admin-visible sync posture:
  - backend now exposes `GET /api/v1/integrations/crm-sync/status`, backed by `CrmSyncRepository.get_latest_sync_record_for_entity(...)`, so the workspace can load the latest CRM sync row plus latest error and retry context for a local entity
  - `components/admin/shared/crm-sync-status-card.tsx` now provides a reusable Zoho status surface for admin detail pages instead of leaving CRM state hidden in backend logs
  - `app/admin/customers/[customerId]/page.tsx` now shows contact-sync state plus direct `Sync to Zoho contact` and `Retry Zoho sync` actions
  - `app/admin/leads/[leadId]/page.tsx` now shows lead-sync state and retry controls when a lead sync record already exists
  - targeted backend verification passed with `python3 -m py_compile backend/repositories/crm_repository.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`
- the Zoho-connected admin lane then moved one step further again on `2026-04-22` into list-level operator visibility:
  - `components/admin/shared/crm-sync-badge.tsx` now provides a compact CRM posture badge for list and kanban surfaces
  - `app/admin/customers/page.tsx` now shows a CRM sync badge on each customer row
  - `app/admin/leads/page.tsx` now shows a CRM sync badge on both lead list rows and kanban cards
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- the Zoho CRM lane then moved one step further again on `2026-04-22` into full booking-follow-up orchestration:
  - `backend/service_layer/lifecycle_ops_service.py` now includes `orchestrate_booking_followup_sync(...)`, which creates and updates CRM ledger rows for Zoho `Deals` and follow-up `Tasks`
  - `backend/integrations/zoho_crm/adapter.py` now includes `upsert_deal(...)` and `create_follow_up_task(...)` so booking requests can become commercial opportunities plus human follow-up inside Zoho
  - both booking-intent handlers in `backend/api/v1_routes.py` and `backend/api/v1_booking_handlers.py` now execute the full local-first CRM chain for `lead`, `contact`, `deal`, and `task`, and return that posture under a structured `crm_sync` response block
  - repo seed coverage now includes `backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql`, which creates one reusable Future Swim sample chain across `contacts`, `leads`, `booking_intents`, `payment_intents`, and `crm_sync_records`
  - targeted verification passed with `python3 -m py_compile backend/integrations/zoho_crm/adapter.py backend/service_layer/lifecycle_ops_service.py backend/api/v1_routes.py backend/api/v1_booking_handlers.py backend/tests/test_lifecycle_ops_service.py`
- the Zoho CRM lane is now also execution-mapped by named business events on `2026-04-22`:
  - a dedicated map now exists at `docs/architecture/bookedai-zoho-crm-integration-map.md`
  - the current start order is now locked as:
    - `booking created`
    - `lead qualified`
    - `call scheduled`
    - `email sent`
    - `deal won/lost`
  - outbound BookedAI -> Zoho work starts from booking/deal/task hardening and qualification-driven deal updates
  - inbound Zoho -> BookedAI work starts from `deal won/lost`, owner, stage, and task-completion dashboard feedback
- the next CRM execution slice then started immediately on `2026-04-22` with `lead qualified -> Zoho lead/contact/deal update`:
  - backend now exposes `POST /api/v1/integrations/crm-sync/lead-qualification`
  - `backend/service_layer/lifecycle_ops_service.py` now includes `orchestrate_lead_qualification_sync(...)`, which runs a local-first `lead`, `contact`, and `deal` sync summary for qualified leads
  - `app/admin/leads/actions.ts` now triggers that lane in best-effort mode after admin lead updates whenever the resulting lead status or pipeline stage is `qualified`
  - `lib/integrations/zoho-lead-qualification-sync.ts` now provides the server-side helper bridge from the root admin workspace into the backend qualification sync lane
  - targeted verification passed with `python3 -m py_compile backend/service_layer/lifecycle_ops_service.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_lifecycle_ops_service.py` and `node node_modules/typescript/bin/tsc --noEmit`
  - local unittest execution remains blocked here because the default shell runtime still lacks `pydantic`
- the next CRM event lane then started on `2026-04-22` with `call scheduled -> Zoho task/activity`:
  - backend now exposes `POST /api/v1/integrations/crm-sync/call-scheduled`
  - `backend/service_layer/lifecycle_ops_service.py` now includes `orchestrate_call_scheduled_sync(...)`, which records a local CRM task sync row and then attempts Zoho follow-up task creation for scheduled calls
  - `app/admin/leads/actions.ts` now triggers that backend lane in best-effort mode after `scheduleLeadFollowUp(...)`
  - `lib/integrations/zoho-call-scheduled-sync.ts` now provides the root-admin bridge into the backend call-scheduled CRM sync route
  - targeted verification passed with `python3 -m py_compile backend/service_layer/lifecycle_ops_service.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_lifecycle_ops_service.py` and `node node_modules/typescript/bin/tsc --noEmit`
  - local unittest execution remains blocked here because the default shell runtime still lacks `pydantic`
- the next CRM event lane then started on `2026-04-22` with `email sent -> Zoho task/note/activity mirror`:
  - `backend/service_layer/lifecycle_ops_service.py` now includes `orchestrate_email_sent_sync(...)`, which records a local CRM task sync row for lifecycle email outreach and then attempts Zoho follow-up task creation
  - both backend lifecycle-email entrypoints in `backend/api/v1_routes.py` and `backend/api/v1_communication_handlers.py` now call that mirror after local `email_messages/email_events` recording succeeds
  - lifecycle email responses now include a `crm_sync.task` block so callers can inspect the Zoho mirror posture for the sent email
  - targeted verification passed with `python3 -m py_compile backend/service_layer/lifecycle_ops_service.py backend/api/v1_routes.py backend/api/v1_communication_handlers.py backend/tests/test_lifecycle_ops_service.py backend/tests/test_api_v1_communication_routes.py` and `node node_modules/typescript/bin/tsc --noEmit`
  - local route-level unittest execution remains blocked here because the default shell runtime still lacks `fastapi`
- the first inbound CRM event lane then started on `2026-04-22` with `deal won/lost -> BookedAI dashboard/reporting feedback`:
  - backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook/register`, which calls Zoho `POST /actions/watch`, points `notify_url` back to BookedAI, and returns the recommended `channel_id/token` pair for env-backed verification
  - backend now also exposes `GET /api/v1/integrations/crm-feedback/zoho-webhook`, `POST /api/v1/integrations/crm-feedback/zoho-webhook/renew`, and `POST /api/v1/integrations/crm-feedback/zoho-webhook/disable`, so the same BookedAI runtime can inspect, extend, and unsubscribe Zoho notification channels
  - backend now also exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook/auto-renew`, which runs through the tracked-job seam, checks current `channel_expiry`, and renews the channel automatically when it is inside the configured threshold window
  - repo automation now also includes `scripts/run_zoho_crm_webhook_auto_renew.py` plus `scripts/install_zoho_crm_webhook_auto_renew_cron.sh`, giving production a low-overhead recurring runner that issues one short-lived maintenance request every 6 hours instead of adding a resident worker loop
  - the live production activation pass then hardened and clarified this lane further:
    - `backend/db.py` now wraps ORM bootstrap in a PostgreSQL advisory lock so parallel backend restarts no longer race on `TenantEmailLoginCode` sequence creation
    - `backend/integrations/zoho_crm/adapter.py` now prefers refresh-token exchange over stale direct access tokens, which restored durable Zoho CRM API calls for the AU tenant
    - `scripts/run_zoho_crm_webhook_auto_renew.py` now supports host-local maintenance routing through `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_API_URL`, host header override, and optional local TLS skip so cron can bypass Cloudflare
    - webhook registration is now live too: a fresh consent flow with `ZohoCRM.notifications.ALL` produced a new refresh token, `POST /api/v1/integrations/crm-feedback/zoho-webhook/register` succeeded for channel `1000000068001`, and `POST /api/v1/integrations/crm-feedback/zoho-webhook/auto-renew` now completes successfully in production
    - `docker-compose.prod.yml` now also passes `ZOHO_CRM_NOTIFICATION_TOKEN` and `ZOHO_CRM_NOTIFICATION_CHANNEL_ID` into `backend` and `beta-backend`, so live webhook verification and renewal read the same values as host `.env`
  - backend now exposes `POST /api/v1/integrations/crm-feedback/deal-outcome`
  - backend now exposes `GET /api/v1/integrations/crm-feedback/deal-outcome-summary`
  - backend now also exposes `POST /api/v1/integrations/crm-feedback/zoho-deals/poll`, which looks up known Zoho `Deals` by external id and ingests terminal `Closed Won` or `Closed Lost` posture into the same additive feedback ledger
  - backend now also exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook`, which accepts Zoho CRM Notifications callbacks, verifies configured `token/channel_id` when present, logs the raw webhook in `webhook_events`, and then ingests the referenced deal ids through the same terminal feedback path
  - `crm_sync_records` now stores additive `deal_feedback` rows so Zoho commercial outcomes can be projected into BookedAI without overwriting booking or payment truth
  - root admin `Revenue dashboard` and `Reports workspace` now show Zoho won/lost summary cards plus owner performance, lost reasons, stage breakdown, task-completion signals, and recent outcome rows
  - the reusable Future Swim sample chain now also includes seeded `won` and `lost` `deal_feedback` rows for full-loop demo coverage
  - targeted verification passed with `python3 -m py_compile backend/repositories/crm_repository.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py` and `node node_modules/typescript/bin/tsc --noEmit`
  - local route-level unittest execution remains blocked here because the default shell runtime still lacks `fastapi`
- the first practical `Phase 5` revenue-truth slice then started on `2026-04-22`:
  - `lib/db/admin-repository.ts` now computes dashboard revenue summary from `paid` payment records instead of only summing booking value
  - dashboard revenue series now groups by paid payment dates when payment truth exists, pushing the admin workspace closer to real revenue posture
  - `app/admin/page.tsx` now describes the revenue card and trend chart as payment-based rather than booking-estimate-based
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- that same `Phase 5` lane then moved one step further on `2026-04-22` into payment-outstanding posture:
  - `DashboardSummary` now also tracks `outstandingRevenueCents`, `paidBookings`, and `unpaidBookings`
  - `DashboardSnapshot.recentBookings` now carries derived payment posture per booking, including `paymentStatus`, `paidValueCents`, and `outstandingValueCents`
  - `app/admin/page.tsx` now surfaces those values through dedicated KPI cards and a richer recent bookings table with payment badges plus paid/outstanding breakdowns
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- that same `Phase 5` lane then moved one step further again on `2026-04-22` into collections operations:
  - `DashboardSnapshot` now also includes `agingSeries` and `collectionQueue`
  - receivables aging now groups outstanding booked revenue into `Current`, `1-7 days`, `8-14 days`, and `15+ days`
  - dashboard now includes a collection-priority queue that ranks outstanding bookings by overdue age and outstanding value so operator follow-up can be triaged from the revenue board itself
  - overdue follow-ups remain on the board as a separate panel instead of being replaced by collections posture
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- the first practical `Phase 6` reporting slice then started on `2026-04-22`:
  - `lib/db/admin-repository.ts` now exposes `getReportsSnapshot(...)` as a reporting read model separate from the operator dashboard snapshot
  - `app/admin/reports/page.tsx` now provides a dedicated reporting workspace with:
    - paid vs unpaid trend
    - collections aging report
    - recovered revenue chart
    - collection priority report
  - `features/admin/shell/navigation.tsx` now includes `Reports` in the admin sidebar so reporting can evolve as its own lane instead of remaining embedded only in `/admin`
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- that same `Phase 6` lane then moved one step further on `2026-04-22` into deeper reporting cuts:
  - `ReportsSnapshot` now also includes `repeatRevenueSeries`, `sourceAttribution`, and `retentionSegments`
  - reports now surface:
    - repeat revenue
    - repeat customer rate
    - retention segments
    - source-to-revenue attribution
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- that same `Phase 6` lane then moved one step further again on `2026-04-22` into source funnel reporting:
  - `ReportsSnapshot` now also includes `sourceFunnel`
  - `/admin/reports` now surfaces a `source -> lead -> booking -> paid revenue` funnel table with per-source lead counts, booking counts, booking conversion, and paid revenue
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- that same `Phase 6` lane then moved one step further again on `2026-04-22` into drill-down filtering:
  - `/admin/reports` now includes a filter bar for `source`, `owner`, and `date range`
  - `getReportsSnapshot(...)` now accepts report filter options and scopes charts/tables to the same selected report slice instead of leaving reports as an unfiltered global snapshot only
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- the first practical `Phase 7` growth slice then started on `2026-04-22` with `Campaigns`:
  - `prisma/schema.prisma` now includes a real `Campaign` model plus `CampaignStatus`, and `prisma/seed.ts` now seeds campaign examples aligned to existing source-attribution data
  - migration artifact `prisma/migrations/20260422095500_phase7_campaigns_foundation/migration.sql` now exists for the first campaign-table rollout
  - `lib/db/admin-repository.ts` now exposes list, detail, create, update, and archive seams for campaigns, with derived metrics for sourced leads, sourced customers, bookings, and paid revenue based on each campaign `sourceKey`
  - root admin navigation now includes `Campaigns`, and `/admin/campaigns` now provides filtered list, create/edit form, archive flow, and support-mode-safe UI
  - root admin now also exposes `/api/admin/campaigns` and `/api/admin/campaigns/:id` with validation and RBAC
  - targeted verification passed with `npx prisma generate`, `npx prisma validate`, and direct module import checks through `npx tsx`; project-wide `tsc --noEmit` and `next build` were re-run but timed out in this environment before returning a clean success or a concrete compiler error
- OpenClaw browser access was mapped into the production host plan on `2026-04-22`:
  - repo inspection confirmed the current OpenClaw runtime already exposes the official built-in `Control UI` through the gateway on port `18789`
  - `deploy/nginx/bookedai.au.conf` now includes `bot.bookedai.au` as a dedicated reverse-proxy host for that UI, with WebSocket-friendly proxy headers and long-lived read/send timeouts
  - `scripts/deploy_production.sh`, `scripts/bootstrap_vps.sh`, and `scripts/update_cloudflare_dns_records.sh` now include `bot.bookedai.au` so DNS automation, TLS issuance, and host bootstrap instructions stay aligned
  - `README.md`, `project.md`, `deploy/openclaw/README.md`, `docs/development/ci-cd-deployment-runbook.md`, and `docs/development/sprint-13-16-user-surface-delivery-package.md` were synchronized in the same pass so the bot-facing browser surface is documented as part of the active production map
- Telegram/OpenClaw operator permissions were widened in the repo on `2026-04-22` so trusted Telegram actors can now run live deploy, repo-scoped test commands, and broader whole-project workspace commands through `python3 scripts/telegram_workspace_ops.py` instead of relying on an undocumented implicit trust note only:
  - `scripts/telegram_workspace_ops.py` now resolves Telegram actor ids from `--telegram-user-id` or environment, prints a permissions snapshot through `permissions`, and enforces allowlisted elevated actions when an actor id is supplied
  - elevated Telegram action control is now documented and configurable through `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS` plus `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS`
  - the wrapper now also exposes `test --command ...` for validation flows and `workspace-command --command ...` for repo-scoped file-structure changes, broad refactors, and whole-project deployment helpers
  - `.env.example`, `.env.production.example`, `deploy/openclaw/.env.example`, and `deploy/openclaw/docker-compose.yml` now carry the Telegram/OpenClaw permission variables so the container runtime inherits the same authority model
  - `README.md`, `project.md`, `docs/development/env-strategy.md`, and `docs/development/ci-cd-deployment-runbook.md` were synchronized in the same pass so operator docs now match the actual Telegram permission model
- that operator-control lane was then extended again on `2026-04-22` with a safer host-maintenance path instead of broad full-server shell access:
  - `scripts/telegram_workspace_ops.py` now exposes `host-command --command "..."`, which parses arguments without `shell=True`, adds `sudo -n` automatically, and only permits a checked-in host binary allowlist that currently includes `apt`, `apt-get`, `docker`, `docker-compose`, `journalctl`, `service`, `systemctl`, `timedatectl`, and `ufw`
  - the `permissions` snapshot now also prints the resolved `allowed_host_programs` list so operators can see the exact host-maintenance surface inherited by the current runtime
  - `.env.example`, `.env.production.example`, `deploy/openclaw/.env.example`, and `deploy/openclaw/docker-compose.yml` now include `host_command` in the default Telegram/OpenClaw action vocabulary
  - `README.md`, `TOOLS.md`, `project.md`, `docs/development/env-strategy.md`, `docs/development/ci-cd-deployment-runbook.md`, and `docs/development/sprint-13-16-user-surface-delivery-package.md` were synchronized in the same pass so the safer host-ops model is documented as the approved alternative to blanket server access
- the OpenClaw repo-write path was then hardened directly on the VPS host on `2026-04-22` so a dedicated Linux user can edit the mounted BookedAI repo without taking ownership of the tree:
  - installed the host `acl` package, created Linux user `openclaw`, and granted `openclaw` execute-only traversal on `/home/dovanlong`
  - granted recursive and default ACL write access for `openclaw` on `/home/dovanlong/BookedAI`, which is the live host bind source for container path `/workspace/bookedai.au`
  - verified the permission change by creating, updating, renaming, and deleting test files plus a nested directory as `openclaw`
  - `README.md` and `deploy/openclaw/README.md` were synchronized in the same pass so the documented OpenClaw runtime path now matches the real host permission model
- that same OpenClaw repo-write lane was then re-applied again on `2026-04-22` across the full BookedAI tree to catch subdirectories that still had restricted inheritance:
  - re-ran recursive `setfacl` plus default ACLs for `openclaw` on `/home/dovanlong/BookedAI`
  - verified project-wide write ability again as `openclaw` with create, edit, rename, nested-directory create/delete, and cleanup actions
  - explicitly verified direct write access on `frontend/src/components/landing/sections/HomepageExecutiveBoardSection.tsx` and `frontend/src/components/landing/sections/HomepageOverviewSection.tsx`
  - `README.md`, `deploy/openclaw/README.md`, and `memory/2026-04-22.md` were synchronized in the same pass so the repo keeps the expanded permission note
- the OpenClaw repo-write lane then needed one more runtime-specific fix on `2026-04-22` after a memory flush still failed with `EACCES`:
  - inspection showed `openclaw-bookedai-gateway` runs as container user `node` (`uid 1000`) and writes the bind-mounted repo as that numeric host uid rather than as the host `openclaw` user
  - granted recursive plus default ACL write access on `/home/dovanlong/BookedAI` to host `uid 1000` as well, preserving the same bind-mount source for `/workspace/bookedai.au`
  - verified the fix from inside the live gateway container by appending to `/workspace/bookedai.au/memory/2026-04-22.md`, then removed the probe line immediately after confirmation
  - `README.md`, `deploy/openclaw/README.md`, and `memory/2026-04-22.md` were synchronized in the same pass so the runtime-user nuance is documented for later operator work
- the OpenClaw live-deploy control path then needed a tool-policy fix on `2026-04-22` after webchat reported that host-elevated execution was unavailable:
  - gateway logs showed the real blocker was `tools.elevated.allowFrom`: provider `webchat` was not allowed, so webchat requests for elevated exec such as `python3 scripts/telegram_workspace_ops.py deploy-live` were denied before build or deploy logic even started
  - inspection also showed `openclaw-bookedai-cli` was misconfigured with only the bare CLI entrypoint and therefore exited after printing help instead of holding the long-lived node-host process
  - live OpenClaw state at `/home/dovanlong/.openclaw-bookedai-v3/openclaw.json` now includes `tools.elevated.allowFrom.webchat=["*"]`, and `deploy/openclaw/docker-compose.yml` now runs `openclaw-cli` as `openclaw node run --host 127.0.0.1 --port 18789 --display-name bookedai-host-cli`
  - the OpenClaw stack was recreated after both fixes; `openclaw-bookedai-cli` now stays up instead of exiting immediately, and the previous webchat denial is now removed at the config gate level
- the Telegram/OpenClaw operator lane was then widened again on `2026-04-23` from allowlisted host maintenance to true full-server `host/elevated` control for trusted actors:
  - `scripts/telegram_workspace_ops.py` now exposes `host-shell --cwd / --command "..."`, which runs `/bin/bash -lc` through `sudo -n` and does not restrict execution to the BookedAI repo tree
  - the existing `host-command` allowlist path remains in place for safer maintenance-only usage, but `host-shell` is now the explicit lane for unrestricted Telegram/OpenClaw work anywhere on the VPS
  - default Telegram/OpenClaw permission vocabulary in `deploy/openclaw/docker-compose.yml` and `deploy/openclaw/.env.example` now includes `host_shell` alongside `host_command` and `full_project`
  - `README.md`, `project.md`, `deploy/openclaw/README.md`, `docs/development/env-strategy.md`, `docs/development/ci-cd-deployment-runbook.md`, and `docs/development/sprint-13-16-user-surface-delivery-package.md` were synchronized in the same pass so the operator docs now reflect the broader host execution model
- the Telegram lane then needed one more live runtime fix on `2026-04-23` after elevated requests still stopped at `pairing required`:
  - runtime inspection showed the OpenClaw gateway still had `channels.telegram.dmPolicy="pairing"` and the node-host device `bookedai-host-cli` still carried only `operator.read` on its operator token, while a pending scope-upgrade request for `operator.approvals` remained stuck in `devices/pending.json`
  - the live OpenClaw runtime state under `/home/dovanlong/.openclaw-bookedai-v3/` was updated so Telegram now runs with `channels.telegram.dmPolicy="allowlist"` plus `channels.telegram.allowFrom=["8426853622"]`, the `bookedai-host-cli` device now carries full operator scopes (`operator.admin`, `operator.approvals`, `operator.pairing`, `operator.read`, `operator.write`), and the stale pending approval request for that device was cleared
  - after restarting `openclaw-bookedai-gateway` and `openclaw-bookedai-cli`, trusted Telegram wrapper execution succeeded again through `host-shell`, including a host-level `apt-get update` smoke run and the earlier `python3-pip` / `python3-venv` installation command
- OpenClaw runtime verification on `2026-04-23` then surfaced one more reliability issue:
  - `openclaw-bookedai-cli` could still exit cleanly if it attempted its first node-host connection before `openclaw-bookedai-gateway` was ready, leaving the gateway healthy but the elevated node surface down
  - `deploy/openclaw/docker-compose.yml` now sets `restart: unless-stopped` on `openclaw-cli`, so the node host reconnects automatically after early gateway races instead of requiring manual intervention
- host-execution verification on `2026-04-23` then surfaced one last correctness gap:
  - the trusted wrapper path could execute commands successfully, but some commands such as `python3 -m pip --version` were still resolving against the privileged CLI container instead of the real VPS host
  - direct validation inside `openclaw-bookedai-cli` confirmed `nsenter --target 1 --mount --uts --ipc --net --pid` reaches the true host namespace, where `pip 24.0`, `python3-venv`, and the expected Ubuntu package set are present
  - `scripts/telegram_workspace_ops.py` now uses that `nsenter` host-exec prefix automatically when `/hostfs` plus `nsenter` are available, so both `host-command` and `host-shell` now target the real server rather than the container runtime
  - post-fix verification passed through the trusted Telegram wrapper with:
    - `host_exec_mode: nsenter-host` in `permissions`
    - `python3 -m pip --version`
    - `python3 -c "import venv; print(...)"` 
    - `host-command --command "apt-get --version"`
  - direct gateway health now returns `{\"ok\":true,\"status\":\"live\"}`, while Telegram `getWebhookInfo` confirms the correct webhook URL with `pending_update_count: 0`; Telegram still reports one prior `Read timeout expired` event in `last_error_message`, but not a current delivery backlog
- OpenClaw/Telegram deploy verification on `2026-04-23` then surfaced the remaining deploy-specific gap:
  - direct execution of `cd /workspace/bookedai.au && python3 scripts/telegram_workspace_ops.py deploy-live` inside `openclaw-bookedai-cli` still called the deploy wrapper in the container context and failed with `Live deploy requires the Docker host environment`
  - `deploy-live` now uses the same `nsenter` host-exec path as `host-shell` when `/hostfs` is mounted, resolving the host repo root to `/home/dovanlong/BookedAI` unless `BOOKEDAI_HOST_REPO_DIR` overrides it
  - re-running the exact OpenClaw container command succeeded end-to-end, rebuilt and restarted the live stack, restarted the proxy, and reactivated n8n workflow `stwMomWRq2qJoaTy`
- OpenClaw exec approval repair was added on `2026-04-26` after permission buttons could fail with `allow-always is unavailable because the effective policy requires approval every time`:
  - `scripts/telegram_workspace_ops.py` now exposes `fix-openclaw-approvals`, which updates both `openclaw.json` `tools.exec.ask` and the host `exec-approvals.json` defaults to `on-miss`
  - the repair preserves allowlist-based approval gating while making durable `allow-always` approvals valid again for commands that should become trusted
  - the checked-in Telegram/OpenClaw action vocabulary now includes `openclaw_runtime_admin` across the root env examples and OpenClaw compose/env templates, and README/project/OpenClaw docs describe the repair path
- OpenClaw full-access runtime repair was added on `2026-04-26` for the operator-requested webchat/Telegram full-control posture:
  - `scripts/telegram_workspace_ops.py` now exposes `enable-openclaw-full-access`, which sets `tools.exec.host=gateway`, `tools.exec.security=full`, `tools.exec.ask=off`, and mirrors `security=full`, `ask=off`, and `askFallback=full` into host `exec-approvals.json`
  - the command enables `tools.elevated.enabled`, sets `agents.defaults.elevatedDefault=full`, allows `bot.bookedai.au` webchat elevated access, and grants Telegram elevated access to the trusted Telegram ids by default
  - `--telegram-open` exists as an explicit opt-in for `channels.telegram.dmPolicy=open` plus `allowFrom=["*"]`; the default keeps Telegram scoped to `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS`
- production DNS origin pinning was tightened on `2026-04-23` for the new public IP `34.40.192.68`:
  - `deploy/nginx/bookedai.au.conf` now records the current production origin IP inline so the reverse-proxy config stays visually aligned with the live host move
  - `scripts/update_cloudflare_dns_records.sh` now accepts a pinned IPv4 from `CLOUDFLARE_AUTO_DNS_IPV4` or a first CLI arg, so boot-time Cloudflare reconciliation can preserve `34.40.192.68` instead of always trusting auto-detection
  - `scripts/verify_gcp_ingress_for_bookedai.sh`, `README.md`, and `docs/users/administrator-guide.md` were synchronized in the same pass so ingress checks and operator docs now point at the same production IP
- Cloudflare DNS automation was then shifted back to an always-auto-detect posture on `2026-04-23` so host restarts and later IP changes do not depend on a pinned origin value:
  - `scripts/install_cloudflare_dns_autoupdate.sh` now installs both `bookedai-cloudflare-dns.service` and a new recurring `bookedai-cloudflare-dns.timer`
  - the timer runs the existing DNS reconciliation service on a repeating schedule after boot, while the service still runs once immediately during installation and on normal machine startup
  - `.env.example`, `README.md`, and `docs/users/administrator-guide.md` were synchronized in the same pass so operator guidance now defaults back to public-IP auto-detection instead of encouraging a fixed `CLOUDFLARE_AUTO_DNS_IPV4` baseline
- the Cloudflare auto-update lane was then widened on `2026-04-23` so it covers the full production host set and sources IP data more directly from the machine environment:
  - root `.env` and `.env.example` now align `CLOUDFLARE_AUTO_DNS_RECORDS` with the active public host set, including `product`, `demo`, `portal`, `pitch`, `calendar`, and `bot`
  - `scripts/configure_cloudflare_dns.sh` now prefers cloud instance metadata endpoints for public IPv4 discovery before falling back to external echo services
  - after the config update, the Cloudflare reconciliation run can move the remaining stale public records off the old origin IP without requiring per-host manual edits
- the remaining Supabase public-edge failure was then narrowed and fixed on `2026-04-23`:
  - `supabase-kong` had been exiting with code `126` because the bind-mounted `/home/kong/kong-entrypoint.sh` was invoked directly and hit a container-side execute permission denial
  - `supabase/docker-compose.yml` now launches that same script through `/bin/bash`, avoiding exec-bit sensitivity on the mounted file while preserving the existing Kong bootstrap logic
  - after recreating `supabase-kong`, `supabase.bookedai.au` returned the expected `401` gateway response again, `scripts/healthcheck_stack.sh` passed end-to-end, and `bot.bookedai.au` also returned `200` again once the OpenClaw gateway completed its startup warm-up
- the planning baseline was synchronized again on `2026-04-22` around one concise whole-program summary:
  - the execution chain remains `Sprint 1-3 baseline lock -> Sprint 4-7 truth/reporting/workflow foundation -> Sprint 8-10 tenant/admin foundation -> Sprint 11-16 user-surface SaaS completion and release hardening`
  - the current phase view remains `Phase 0 done`, `Phase 1 implemented baseline`, `Phase 2 partial foundation`, `Phase 3 strongest active lane`, `Phase 4 partial`, `Phase 5 partial foundation`, `Phase 6 partially active`, `Phase 7 implemented foundation`, `Phase 8 implemented foundation`, and `Phase 9 partially active`
  - the current sprint view remains `Sprint 1-2 complete`, `Sprint 3 materially implemented`, `Sprint 4-5 partial`, `Sprint 6 substantial`, `Sprint 7 partial foundation`, `Sprint 8 materially implemented`, `Sprint 9-10 implemented foundations`, `Sprint 11-12 partial/incomplete`, `Sprint 13-14 active`, and `Sprint 15-16 planned with carry-forward overlap`
  - the immediate next-phase cadence is now date-locked:
    - freeze scope by Friday, April 24, 2026
    - get AI end-to-end working before any UI polish pass
    - submit the draft by Saturday, April 25, 2026
    - deliver the final edit by Sunday, April 26, 2026
    - use Monday, April 27, 2026 for final polish
  - the sprint package now reflects the corrected calendar interpretation too: `2026-04-24` is Friday, not Thursday
  - this synchronization pass updates `docs/architecture/current-phase-sprint-execution-plan.md`, `docs/development/sprint-13-16-user-surface-delivery-package.md`, and `docs/development/roadmap-sprint-document-register.md` so Notion and Discord can inherit one clean operator-facing summary without drift
- the admin redesign requirement baseline was formally recorded on `2026-04-21` in `docs/architecture/admin-enterprise-workspace-requirements.md`
- the current admin direction is now explicitly broader than dashboard polish:
  - enterprise login and shell redesign
  - menu-first information architecture
  - tenant list and tenant detail management
  - tenant branding and introduction HTML editing
  - tenant permission and role management
  - full tenant product and service CRUD from admin
- the root `Next.js` admin dashboard is now materially implemented on `2026-04-22`, not just scaffolded:
  - `app/admin/page.tsx` now renders real KPI cards for revenue, pipeline, bookings, and conversion
  - `lib/db/admin-repository.ts` now exposes a tenant-scoped `getDashboardSnapshot(...)` read model for revenue trend, booking-status distribution, lead-stage distribution, overdue follow-ups, and recent bookings
  - the dashboard also now surfaces audit highlights so the home screen starts behaving like an operator board instead of a generic landing page
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- the admin workspace plan was then re-reviewed and re-locked on `2026-04-22` against the actual codebase instead of the blueprint alone:
  - the current root `Next.js` admin lane should now be treated as the active implementation lane for the new workspace
  - the immediate execution order is now explicitly:
    - runtime decision
    - production auth plus tenant context plus RBAC plus immutable audit baseline
    - Prisma and repository parity
    - tenant or users or roles or settings or audit control-plane completion
    - revenue-ops hardening across customers or leads or services or bookings
    - payments and revenue-truth completion
    - dashboard and reporting expansion
    - only then growth modules such as campaigns, workflows, messaging, and automation
  - this review also locks one architectural caution into execution truth:
    - current admin CRUD and dashboard modules still lean on `getMockStore()` in the root admin repository, so later breadth work should not outrun the data-truth migration into Prisma-backed repositories
- the first `Phase 1` trust-foundation slice then moved into code on `2026-04-22`:
  - `lib/auth/session.ts` now verifies signed admin sessions with expiry instead of only trusting raw JSON header or cookie payloads
  - root admin auth seams now exist at `/api/admin/auth/login`, `/api/admin/auth/logout`, `/api/admin/auth/me`, and `/api/admin/auth/switch-tenant`
  - `lib/tenant/context.ts` now filters tenant selection against the signed session tenant list
  - `lib/rbac/policies.ts` now includes broader enterprise permission coverage for tenants, users, roles, settings, payments, and reports in addition to the already-built CRUD modules
  - `server/admin/identity.ts` now provides the first root-lane identity resolution seam, while `server/admin/session-cookie.ts` centralizes the admin cookie contract
  - auth events for login, logout, and tenant switching now append audit records through the root admin repository baseline
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/next/dist/bin/next build`
- the first practical `Phase 2` data-parity slice then moved into code on `2026-04-22`:
  - `prisma/schema.prisma` now carries the fields that the current root admin UI actually needs for customer full name, customer source, customer tags, customer notes summary, lead pipeline state, lead score, lead follow-up timestamps, and payments
  - `prisma/seed.ts` now seeds those richer customer and lead fields so Prisma-backed reads do not collapse back to the earlier thinner schema assumptions
  - `lib/db/admin-repository.ts` now prefers Prisma-backed reads and writes for dashboard, customers, leads, services, bookings, payments, and audit logs whenever Prisma is enabled
  - the mock store remains as a fallback compatibility path, but it is no longer the only implementation path for the new root admin workspace
  - verification passed with `npx prisma generate`, `node node_modules/typescript/bin/tsc --noEmit`, and `node node_modules/next/dist/bin/next build`
- that `Phase 2` parity lane then moved another step on `2026-04-22`:
  - Prisma models now also exist for `permissions`, `role_permissions`, `branches`, `tenant_settings`, `subscriptions`, and `invoices`
  - `prisma/seed.ts` now also seeds permission, role-permission, branch, branding-setting, subscription, and invoice records so later phase-3 control-plane work can start from real entities instead of another mock-only layer
  - `lib/db/admin-repository.ts` now also exposes preparatory Prisma-backed seams for `listUsers`, `listRoles`, `getTenantSettings`, and paginated `listPayments`
  - migration artifact `prisma/migrations/20260422034156_phase2_admin_prisma_parity/migration.sql` now captures both the richer customer and lead columns plus the new payment and control-plane tables
  - verification again passed with `npx prisma generate`, `node node_modules/typescript/bin/tsc --noEmit`, and `node node_modules/next/dist/bin/next build`
- that same `Phase 2` parity lane then moved one step further again on `2026-04-22` into tenant control-data visibility:
  - `lib/db/admin-repository.ts` now also exposes Prisma-backed `listBranches(...)` and `getTenantBillingOverview(...)`, so the already-modeled `branches`, `subscriptions`, and `invoices` entities stop being schema-only parity inside the root admin lane
  - the mock fallback now mirrors those same branch and billing records too, keeping non-DB admin behavior closer to the Prisma-backed UI contract instead of dropping back to branding-only assumptions
  - `app/admin/settings/page.tsx` now surfaces branch footprint plus subscription and invoice posture next to workspace branding controls, so settings starts reflecting broader tenant control data instead of stopping at profile fields only
  - verification passed with `node node_modules/typescript/bin/tsc --noEmit`; a follow-up `next build` rerun was blocked by an already-running build process in this workspace rather than a reported compile failure
- that same `Phase 2` parity lane then moved one step further again on `2026-04-22` into write coverage for those tenant-control entities:
  - `lib/db/admin-repository.ts` now supports `createBranch(...)`, `updateBranch(...)`, branch archive or reactivate state changes, and `updateTenantBillingSettings(...)`
  - `app/admin/settings/actions.ts` now wires those mutations into the root admin lane, and `app/api/admin/settings/route.ts` now returns branch plus billing parity data on the API read path too
  - `app/admin/settings/page.tsx` now includes branch add/edit/archive/reactivate controls and a billing-baseline edit form for provider, plan code, status, external id, and renewal date instead of leaving the new Phase 2 entities as read-only summaries
  - verification remains partially blocked by workspace build behavior: no TypeScript error surfaced during the rerun, but this repo's root `tsc` and `next build` processes continue to exit unclearly or hang in the current shell environment before returning a clean final success line
- that same `Phase 2` parity lane then moved one step further again on `2026-04-22` into explicit settings API parity:
  - root admin now exposes `GET/POST /api/admin/settings/branches`, `GET/PATCH /api/admin/settings/branches/:branchId`, and `GET/PATCH /api/admin/settings/billing`
  - the branch detail route supports both branch metadata edits and active-state mutation, so later client integrations can manage branch lifecycle without depending on server actions alone
  - import-level verification for the new API surface passed through `npx tsx` module loads with `settings-api-phase2-import-ok`
  - root `tsc --noEmit` remains inconclusive in this shell because the repo-wide process still hangs or exits unclearly before printing a final success line
- the root admin `Phase 3` settings lane then moved one step further again on `2026-04-22` into operational controls:
  - `lib/db/admin-repository.ts` now exposes `getWorkspaceGuides(...)`, `updateWorkspaceGuides(...)`, `getBillingGatewayControls(...)`, and `updateBillingGatewayControls(...)`, backed by `tenant_workspace` and `billing_gateway` settings data
  - the same pass also fixed a mock-store parity bug where branding saves could overwrite unrelated settings keys, so later settings slices no longer clobber each other when Prisma is not active
  - `app/admin/settings/page.tsx` now includes editable workspace-guide controls for `overview`, `experience`, `catalog`, `plugin`, `bookings`, `integrations`, `billing`, and `team`, plus billing-gateway controls for `merchantModeOverride`, `stripeCustomerId`, and `stripeCustomerEmail`
  - root admin now also exposes `GET/PATCH /api/admin/settings/guides` and `GET/PATCH /api/admin/settings/gateway`, keeping these new settings slices available through explicit admin APIs instead of server actions only
  - import-level verification for this Phase 3 pass succeeded through `npx tsx` with `settings-phase3-import-ok`; repo-wide `tsc --noEmit` still remains inconclusive in the current shell environment because the long-running process does not return a clean final success line
- the root admin `Phase 3` settings lane then moved one step further again on `2026-04-22` into plugin runtime controls:
  - `lib/db/admin-repository.ts` now exposes `getPluginRuntimeControls(...)` and `updatePluginRuntimeControls(...)`, backed by the existing `partner_plugin_interface` tenant settings slice instead of leaving plugin runtime posture tenant-only
  - `app/admin/settings/page.tsx` now includes a plugin runtime form covering partner site URL, BookedAI host, embed path, widget script path, widget id, headline, prompt, accent color, CTA labels, support contacts, and logo URL
  - root admin now also exposes `GET/PATCH /api/admin/settings/plugin`, and the aggregate `/api/admin/settings` response now includes `pluginRuntime`
  - verification passed cleanly for this slice with `npx tsx` import checks returning `settings-plugin-phase3-import-ok` and `node node_modules/typescript/bin/tsc --noEmit`
- the root admin `Phase 3` settings lane then moved one step further again on `2026-04-22` into integration operator posture:
  - `server/admin/backend-api.ts` now centralizes the root admin backend fetch base-url logic, and `server/admin/settings-integrations.ts` now assembles provider status, attention triage, CRM retry backlog, and reconciliation detail snapshots for the active tenant
  - `app/admin/settings/page.tsx` now includes an integration operator posture section showing provider status, retry/manual-review/failed counts, rollout-hold guidance, and reconciliation slices, plus a deep link back into the tenant integrations workspace for write-owned provider controls
  - root admin now also exposes `GET /api/admin/settings/integrations`, and the aggregate `/api/admin/settings` response now includes `integrations`
  - verification passed for this slice with `node node_modules/typescript/bin/tsc --noEmit`; the earlier `tsx` import probe was not used as a final signal because this workspace does not resolve `server-only` outside Next runtime
- that same root admin `Phase 3` integration settings slice then moved one step further again on `2026-04-22` into credential and runtime posture:
  - `server/admin/backend-api.ts` now also supports reading safe error envelopes from backend routes, so settings can inspect connection-test posture without discarding useful credential-safe details
  - `server/admin/settings-integrations.ts` now also pulls `Zoho CRM connection-test`, `integration runtime activity`, and `outbox backlog` into the same aggregated snapshot
  - `app/admin/settings/page.tsx` now also surfaces Zoho token-source or configured-field posture, outbox failed or retrying or pending counts, and a recent runtime activity feed beside the earlier provider, CRM retry, and reconciliation blocks
  - verification for this follow-on pass also passed cleanly with `node node_modules/typescript/bin/tsc --noEmit`
- that same integration settings slice then moved one step further again on `2026-04-22` into provider credential overview:
  - `server/admin/settings-integrations.ts` now derives a provider-by-provider credential-safe overview from the exposed `safe_config` summaries plus the richer Zoho connection posture
  - `app/admin/settings/page.tsx` now renders a compact credential overview grid so operators can compare enabled state, configured-field counts, exposed safe fields, and next-action guidance across providers in one place
  - verification for this follow-on pass also passed cleanly with `timeout 120s node node_modules/typescript/bin/tsc --noEmit`
- `docs/architecture/internal-admin-app-strategy.md`, `docs/users/administrator-guide.md`, `docs/architecture/implementation-phase-roadmap.md`, `docs/development/sprint-13-16-user-surface-delivery-package.md`, and `docs/development/roadmap-sprint-document-register.md` were synchronized in the same pass so the new admin-enterprise requirement now exists as inherited execution truth instead of a chat-only request
- the tenant workspace requirement baseline was expanded again on `2026-04-21`: tenant redesign now explicitly includes an enterprise-style menu or sidebar, section-specific guidance copy, clearer function-grouped layout, direct inline input or edit or save behavior, tenant-managed image upload, and HTML-editable introduction content with safe preview inside the tenant portal itself
- the requirement and execution docs were synchronized for this tenant UX wave across `project.md`, `docs/architecture/tenant-app-strategy.md`, `docs/architecture/implementation-phase-roadmap.md`, and `docs/development/sprint-13-16-user-surface-delivery-package.md` so future work inherits the same tenant-enterprise direction instead of treating the current shell as the final UX target
- the first tenant enterprise workspace implementation slice then moved into code on `2026-04-21`: tenant overview payloads now include tenant-managed workspace settings plus per-panel guidance, the tenant profile editor now behaves like an `Experience Studio` with logo or hero upload plus HTML introduction and guidance editing, and the tenant runtime now uses a more enterprise-style sidebar shell instead of only top-level pills with profile controls buried inside overview
- that tenant enterprise workspace slice was then promoted live on `2026-04-21`: frontend build passed, `bash scripts/deploy_live_host.sh` completed successfully, `https://tenant.bookedai.au` returned `HTTP/2 200`, `https://api.bookedai.au/api/health` returned `{\"status\":\"ok\",\"service\":\"backend\"}`, and the served live tenant bundle exposed the new `Experience Studio` marker through the active `TenantApp` asset
- the tenant enterprise workspace follow-up then landed on `2026-04-22`: the tenant catalog now supports direct `new service draft` creation from the tenant shell itself, the team lane now exposes a visible permission matrix for `tenant_admin`, `operator`, and `finance_manager`, and the catalog rail now explains the intended draft -> save -> publish workflow in-product instead of assuming operator knowledge
- tenant workspace permission hardening then landed on `2026-04-22`: `Experience Studio` edits are now restricted to `tenant_admin` and `operator`, billing-setup saves now respect the finance-safe role boundary in the frontend as well as the backend, authenticated tenant API calls now prefer the signed session tenant slug over stale URL tenant context, and plugin `tenant_ref` is now pinned to the signed-in tenant so a tenant cannot repoint embed configuration toward another tenant workspace
- this tenant hardening pass verified cleanly with `python3 -m py_compile backend/api/v1_tenant_handlers.py backend/service_layer/tenant_app_service.py backend/tests/test_api_v1_tenant_routes.py`, `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`, and `npm --prefix frontend run build`; targeted pytest execution is still unavailable in this runtime because `pytest` is not installed locally
- the tenant workspace hardening lane then moved one step further on `2026-04-22`: overview, plugin, billing, team, and integrations snapshots now expose section-level activity metadata so the tenant shell can show `last updated`, `last edited by`, and short audit summaries without opening admin-only audit tooling
- the tenant workspace UX now makes read-only boundaries more explicit: billing account inputs and team-invite fields disable at input level for restricted roles, and integration controls now surface an inline access-denied notice when the session can monitor but not edit provider posture
- this tenant audit/UX pass verified cleanly with `python3 -m py_compile backend/service_layer/tenant_app_service.py backend/api/v1_tenant_handlers.py`, `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`, and `npm --prefix frontend run build`
- the tenant Google gateway also received a live QA cleanup on `2026-04-22`: `TenantAuthWorkspace.tsx` no longer shows the old config-warning panel when Google is active, `TenantApp.tsx` now initializes Google Identity before rendering the button, and post-deploy Playwright snapshots confirmed the live gateway renders the expected `Sign in with Google` and `Sign up with Google` paths on `https://tenant.bookedai.au`
- this follow-up tenant pass was rebuilt, redeployed, and re-verified live on `2026-04-22`: `python3 -m py_compile backend/api/v1_routes.py backend/api/v1_tenant_handlers.py backend/service_layer/tenant_app_service.py`, `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`, `npm --prefix frontend run build`, and `bash scripts/deploy_live_host.sh` all completed successfully; post-deploy checks again returned `HTTP/2 200` for `https://tenant.bookedai.au` and `{\"status\":\"ok\",\"service\":\"backend\"}` for `https://api.bookedai.au/api/health`
- the tenant auth lane then moved again on `2026-04-22` into the requested `email-first` posture:
  - backend now exposes `POST /api/v1/tenant/auth/email-code/request` and `POST /api/v1/tenant/auth/email-code/verify`
  - tenant sign-in, invite acceptance, and email-led workspace creation can now share one verification-code mechanism instead of forcing username-first credentials
  - tenant auth now treats email as the primary identifier, while legacy password credentials remain only as compatibility fallback
  - the active tenant gateway UI now promotes `email code` plus `Google` on the same form, and no longer depends on username fields for the main tenant login/create flow
  - the repo now also carries `backend/migrations/sql/015_tenant_email_login_codes.sql` for the new tenant verification-code table
- the first admin enterprise tenant-management slice also moved into code on `2026-04-21`: admin now has dedicated tenant directory/detail APIs, tenant profile save flows, tenant role and status updates, tenant image upload support, HTML introduction editing with preview, and tenant-scoped product or service create or edit or delete actions inside a new `tenants` workspace in the admin shell
- this means the admin requirement is no longer only documentation truth: the shell now exposes a real menu-first tenant workspace, while carry-forward work shifts toward publish/archive safeguards, broader regression coverage, and remaining portal or billing dependencies
- the admin tenant workspace then moved one safety step further on `2026-04-22`: published tenant services can no longer be deleted directly from the admin route, the admin tenant catalog UI now exposes explicit publish/archive actions plus two-step delete confirmation, and publish from the form is guarded by booking-critical field checks before the save call is allowed
- regression coverage moved with that safety pass too: `frontend/tests/admin-prompt5-preview.spec.ts` now covers tenant workspace navigation plus tenant profile/member/catalog governance flows, including publish guardrails, archive-before-delete behavior, and inline admin update messaging
- a parallel root-stack admin foundation then moved into code on `2026-04-22` for the requested `Next.js + TypeScript + Tailwind + Prisma + PostgreSQL` architecture:
  - `prisma/schema.prisma` now defines multi-tenant core models for tenant, user, membership, customer, lead, service, booking, and audit log
  - root `app/admin/**` now contains dashboard, customers, leads, services, and bookings routes
  - `lib/auth/session.ts`, `lib/tenant/context.ts`, and `lib/rbac/policies.ts` now provide the first auth, tenant-context, and RBAC platform seams for this stack
  - customers is now the first full CRUD module there, with search, filter, pagination, detail editing, and soft delete
  - leads, services, bookings, and dashboard now exist as scaffolded modules on the same foundation
- that root-stack admin implementation is currently mock-backed by default while still Prisma-ready, which keeps the new admin workspace buildable today and preserves the intended PostgreSQL production model for later live wiring
- the root-stack admin foundation was then normalized further on `2026-04-22` around the requested app shape:
  - `features/admin/shell/**` now owns the sidebar layout, topbar, and workspace shell
  - `server/admin/**` now owns the server-side auth guard, tenant context seam, and RBAC-ready workspace bootstrap
  - `components/ui/shadcn/**` now provides a base shadcn-style primitive set for button, card, input, textarea, badge, label, and separator
  - `app/admin/layout.tsx` now resolves auth + tenant context through the server layer before rendering the workspace shell
- tenant auth UX was tightened again on `2026-04-21`: `TenantAuthWorkspace.tsx` and `TenantApp.tsx` now present Google as an explicit mode-aware path for both `Create account` and `Sign in`, switch the Google Identity button copy to match the current auth intent, clear stale Google-choice/auth-error state when operators switch auth modes or sign out, and promote both `Create account with Google` plus `Sign in with Google` as the recommended primary CTAs before the fallback password forms
- the tenant auth copy layer was then polished again on `2026-04-21`: gateway headings, benefit text, Google helper copy, and password-fallback messaging were tightened into shorter, more product-facing language so the tenant login and register surface reads more like a finished SaaS entry flow than an internal operator handoff screen
- the tenant auth visual layer was then polished again on `2026-04-21`: the auth card now uses stronger section hierarchy, premium Google-first highlight panels, softer dividers, clearer mode-switch chrome, and carded password fallback forms so the tenant entry surface reads more intentionally designed without changing the underlying auth contracts
- the surrounding tenant gateway shell was then polished in parallel on `2026-04-21`: `TenantApp.tsx` now gives `tenant.bookedai.au` a stronger hero, more product-facing entry cards, and a cleaner left-column information hierarchy so the gateway context matches the upgraded auth card instead of feeling like a separate rougher layer
- the Telegram or Notion or Discord operator path now supports `--discord-channel-id` through both `scripts/sync_telegram_update.py` and `python3 scripts/telegram_workspace_ops.py sync-doc`, so one-off updates can target a specific Discord channel without changing the global announce-channel config
- sprint-complete summary updates can now be sent directly to the dedicated Discord channel `1492396016563912875` while leaving the default announce path untouched for other operator notifications
- the repo now includes a dedicated `docs/development/ci-cd-collaboration-guide.md` summary so collaborators can quickly understand the real current delivery model: local validation, release gate, beta rehearsal, host-level production deploy, health verification, and documentation or Notion or Discord closeout
- the repo now also includes `docs/development/ci-cd-deployment-runbook.md` as the detailed deployment SOP, turning the earlier CI/CD summary into a fuller operator runbook with release flow, script ownership, production verification, rollback framing, and docs closeout sequencing
- the current CI/CD documentation baseline now distinguishes two layers clearly:
  - the collaboration guide for short team handoff
  - the deployment runbook for step-by-step beta and production execution
- Telegram and operator documentation closure is now tighter and more explicit in the repo workflow:
  - substantive changes are expected to update the requirement-facing document, `implementation-progress`, and the matching sprint or phase artifact in one completion pass
  - the operator toolchain now also includes `python3 scripts/telegram_workspace_ops.py sync-repo-docs` so the current repo documentation set can be batch-published into the live Notion workspace without manually replaying each file
  - `scripts/sync_telegram_update.py` now chunks long markdown content into larger Notion-safe blocks so large source-of-truth documents such as `project.md`, `README.md`, and `implementation-progress.md` can be written successfully through the API without exceeding the `children <= 100` validation limit
  - Discord delivery is now explicitly summary-first text, while Notion remains the long-form detail surface
  - the current Notion workspace sync baseline now covers the root source-of-truth docs, the `docs/` tree, and the `memory/` tree through the new batch sync path
- backend router registration is now split more explicitly in code: `backend/app.py` mounts `public_catalog_routes`, `upload_routes`, `webhook_routes`, `admin_routes`, `communication_routes`, and the bounded-context `v1_router`
- `/api/v1/*` is now further decomposed under `backend/api/v1_router.py` into:
  - `v1_booking_routes`
  - `v1_search_routes`
  - `v1_tenant_routes`
  - `v1_communication_routes`
  - `v1_integration_routes`
- compatibility import shims were preserved for older route modules such as `public_routes`, `automation_routes`, and `email_routes`, so the refactor tightens ownership without breaking older imports immediately
- current code still carries one major monolith in `backend/api/v1_routes.py`, but that file is now a shrinking legacy handler source instead of the only `/api/v1/*` ownership point
- tenant extraction has already started in code through `backend/api/v1_tenant_handlers.py`
- tenant and portal routes under `backend/api/v1_tenant_routes.py` are now fully rewired to `v1_tenant_handlers` instead of mixing new handlers with `v1_routes` legacy handlers
- the extracted tenant and portal implementation set now includes:
  - `tenant_google_auth`
  - `tenant_password_auth`
  - `tenant_create_account`
  - `tenant_claim_account`
  - `tenant_overview`
  - `tenant_bookings`
  - `tenant_integrations`
  - `tenant_integration_provider_update`
  - `tenant_billing`
  - `tenant_billing_account_update`
  - `tenant_billing_subscription_update`
  - `tenant_billing_invoice_mark_paid`
  - `tenant_billing_invoice_receipt`
  - `tenant_onboarding`
  - `tenant_team`
  - `tenant_profile_update`
  - `tenant_team_invite`
  - `tenant_team_member_update`
  - `tenant_team_member_resend_invite`
  - `tenant_catalog`
  - `tenant_catalog_import_website`
  - `tenant_catalog_update_service`
  - `tenant_catalog_publish_service`
  - `tenant_catalog_archive_service`
  - `portal_booking_detail`
  - `portal_booking_reschedule_request`
  - `portal_booking_cancel_request`
- session-signing secrets are now separated by actor boundary in code and env docs:
  - `SESSION_SIGNING_SECRET`
  - `TENANT_SESSION_SIGNING_SECRET`
  - `ADMIN_SESSION_SIGNING_SECRET`
- admin and tenant sessions no longer fall back to `ADMIN_API_TOKEN` or `ADMIN_PASSWORD`; actor-specific signing secrets or `SESSION_SIGNING_SECRET` are now required for signed session flows
- tenant workspace HTML is now sanitized through an allowlist path in both backend storage/readback and legacy frontend preview rendering, and legacy admin session persistence now prefers browser-session storage over long-lived local storage
- the root `Next.js` admin lane now supports per-user email verification code sign-in through `/admin-login`, `/api/admin/auth/request-code`, and `/api/admin/auth/verify-code`, with signed session-cookie issuance after code verification
- password bootstrap admin login is now break-glass only in the root `Next.js` lane and requires `ADMIN_ENABLE_BOOTSTRAP_LOGIN=1` before `/api/admin/auth/login` will accept `ADMIN_BOOTSTRAP_PASSWORD`
- rollout strategy then tightened again on `2026-04-23`: live `bookedai` database inspection showed the current production schema is still the legacy tenant/backend shape and already conflicts with the unfinished Prisma admin table set, so root admin auth now uses a compatibility path that resolves identities from `tenant_user_memberships` and persists admin verification codes into legacy `tenant_email_login_codes` until `BOOKEDAI_ENABLE_PRISMA=1` is intentionally promoted onto a schema-aligned database
- the same compatibility rollout was verified end-to-end against the live legacy schema on `2026-04-23`: local Next dev, pointed at the real Postgres container IP, successfully requested an admin code for `future-swim`, persisted an `admin-sign-in` row into `tenant_email_login_codes`, verified the code, issued `bookedai_admin_session`, and returned the real tenant in `/api/admin/auth/me` through the new legacy-aware tenant-resolution path
- central project documents were synchronized again on `2026-04-21` so roadmap, sprint, environment, backend-boundary, and master-index references now reflect the actual router split, session-secret split, and current carry-forward refactor backlog
- the active docs baseline should no longer describe backend routing as one undifferentiated `/api` monolith only, and should no longer imply one shared actor-signing secret as the target state
- public registration and booking-submit failure handling tightened again on `2026-04-21`: `frontend/src/shared/api/client.ts` now lifts backend `detail` and validation payloads into the thrown frontend error message, so BookedAI-owned public flows no longer collapse consultation or booking-submit failures into the opaque `API request failed: <status>` text
- `frontend/src/apps/public/RegisterInterestApp.tsx` now validates phone input the same way backend pricing consultation does, requiring at least 8 digits before submit so the SME registration path rejects obvious bad input client-side instead of failing later at the server boundary
- targeted browser verification now exists for this regression path too: `frontend/tests/pricing-demo-flows.spec.ts` includes a focused register-interest check that stubs a backend validation failure and confirms the user sees the real backend message instead of a generic transport-status failure
- the public homepage booking submit path was then tightened in the same pass on `2026-04-21`: `HomepageSearchExperience.tsx` now validates email and phone input with the same stricter rules used by the other booking-assistant surfaces before submit, and its legacy `/booking-assistant/session` failure handling now also routes through the shared API error-message resolver instead of showing raw fallback transport text
- live-read booking failure coverage now exists as well: `frontend/tests/public-booking-assistant-live-read.spec.ts` includes a targeted regression proving that an authoritative `/api/v1/bookings/intents` failure surfaces the backend error message directly in the customer-visible booking submit flow rather than degrading into a generic booking failure banner
- the remaining public assistant shells were then aligned too on `2026-04-21`: both `BookingAssistantDialog.tsx` and `BookingAssistantSection.tsx` now use the same shared API error-message resolver for catalog-load, chat, and booking-submit failures, so public homepage, modal, and section assistant surfaces now speak the same clearer backend-derived failure language instead of diverging by shell
- focused verification still passes for the critical live-read booking paths after that wider assistant pass, while one broader legacy smoke assertion currently still reports an inherited baseline mismatch around unexpected `/api/v1/*` calls in flag-off mode; that mismatch was observed during regression runs but was not introduced by the new error-handling changes themselves

An additional technical review artifact was also added on `2026-04-21`:

- `docs/development/codebase-review-2026-04-21.md`
- this review captures the current architecture assessment, code-smell list, refactor priority matrix, and recommended next-sprint technical action plan based on the checked-in repo state after the router split and first tenant-handler extraction

Carry-forward implementation truth after this pass:

- top-level backend router ownership is cleaner and easier to evolve safely
- bounded-context `/api/v1/*` router separation is now real in code, not just planned
- the next backend cleanup target remains continued extraction from `backend/api/v1_routes.py`
- that remaining split should move by context, not by arbitrary line-count slicing
- the active extraction order is now:
  - tenant auth and workspace completion
  - portal actions
  - integrations
  - communications
  - search and matching
  - booking

Verification snapshot from `2026-04-21`:

- syntax verification passed for the new session-token, router, and tenant-handler modules via `python3 -m py_compile`
- after the latest tenant extraction pass, `python3 -m py_compile backend/api/v1_tenant_handlers.py backend/api/v1_tenant_routes.py backend/api/v1_router.py backend/api/v1_routes.py backend/app.py` also passed
- tenant and portal route tests have now been split out of the old monolith test file into:
  - `backend/tests/test_api_v1_tenant_routes.py`
  - `backend/tests/test_api_v1_portal_routes.py`
- `backend/tests/test_api_v1_routes.py` now keeps the remaining non-tenant, non-portal route coverage instead of carrying every bounded context in one file
- syntax verification also passed for the split test modules via `python3 -m py_compile backend/tests/test_api_v1_routes.py backend/tests/test_api_v1_tenant_routes.py backend/tests/test_api_v1_portal_routes.py`
- direct pytest execution for the new split files is still blocked in the current shell because the available virtualenv Python environments do not currently provide the `pytest` module
- route-related suites previously passed for:
  - `backend/tests/test_admin_discord_handoff_routes.py`
  - `backend/tests/test_whatsapp_webhook_routes.py`
- app import smoke also passed after the router split
- one broader regression lane remains open outside the router work:
  - two `backend/tests/test_api_v1_routes.py` public-web fallback cases are still failing in the matching-search lane
- this issue should remain explicit carry-forward work for Sprint 15 and Sprint 16 hardening rather than being left as an undocumented local test note

Planning and execution synchronization update from `2026-04-19`:

- the public homepage baseline was tightened again on `2026-04-20`: package language was corrected from the intermediate `GPI Pro` wording back to the user-facing `Pro` naming, so the live public stack now reads consistently as `Freemium`, `Pro`, and `Pro Max`
- homepage conversion storytelling was compressed again on `2026-04-20`: hero, proof, pricing, trust, and CTA sections now use a shorter SME-first and investor-readable message hierarchy instead of the heavier repeated section phrasing that previously diluted the commercial narrative
- the registration offer lane was synchronized in parallel on `2026-04-20`: user-facing offer choices now read `Freemium`, `Free Setup for First 10 SMEs`, `Pro`, `Pro Max`, and `Advance Customize`, while older `upgrade1-3` query aliases are still accepted for compatibility
- project, roadmap, current-phase execution, sprint-package, and sprint-register documentation were updated again on `2026-04-20` so the latest homepage tightening, package vocabulary, and live deployment state are now recorded outside the codebase as inherited execution truth
- the latest public-copy tightening and documentation synchronization pass was followed by another successful live production deployment on `2026-04-20` through `sudo bash scripts/deploy_production.sh`

- the live homepage baseline advanced again on `2026-04-20`: `bookedai.au` now resolves to `frontend/src/apps/public/PublicApp.tsx` instead of the interim apex-domain `PitchDeckApp` routing, while `pitch.bookedai.au` and `/pitch-deck` remain the dedicated pitch surfaces
- homepage information architecture was compressed again on `2026-04-20`: duplicated public sections were removed from the main shell, and the public flow now centers on `Hero -> Revenue Engine proof -> Deployment -> Pricing -> Proof/FAQ -> CTA`
- homepage navigation and runtime linkage were tightened again on `2026-04-20`: the public menu now exposes direct paths for `Roadmap`, `Tenant`, `Admin Login`, plus tenant Google auth utility links routed through `tenant.bookedai.au`
- product-trial routing was tightened again on `2026-04-20`: homepage primary trial CTAs now continue directly into `https://product.bookedai.au/` instead of treating sales-contact or register-interest as the first runtime destination
- pricing language was rewritten again on `2026-04-20`: the old `Upgrade 1-3` vocabulary has been replaced in the live homepage stack with `Freemium`, `Pro`, and `Pro Max`, while the commercial model is now framed consistently as `setup fee + monthly + commission on real booked revenue`
- launch-offer positioning was tightened in parallel on `2026-04-20`: the homepage and pricing surfaces now state `first 10 SMEs free online setup` plus `1 month free` on paid plans as the shared public acquisition offer
- tenant auth entry was widened on `2026-04-20`: `TenantApp` now reads `?auth=create` and `?auth=sign-in` from the gateway URL so homepage tenant-auth links can land on the correct gateway mode instead of always defaulting to sign-in
- the latest homepage, pricing, routing, and tenant-auth entry changes were built successfully with `npm run build` in `frontend/` and then redeployed live to the production stack on `2026-04-20`

- the public-host split moved forward again on `2026-04-19`: homepage sales-deck CTA paths were tightened so `product demo` intent now routes to `https://product.bookedai.au/` instead of legacy mixed-shell entry points, while `https://demo.bookedai.au/` remains the lighter conversational demo surface
- the homepage information architecture also widened on `2026-04-19`: the sales deck now includes an explicit `agent surface` section that explains the split between homepage conversion, the live product agent on `product.bookedai.au`, and the separate demo host, so users are less likely to fall back into older route assumptions
- registration and roadmap continuity were tightened in parallel on `2026-04-19`: `RegisterInterestApp` and roadmap CTA fallbacks now send users to `product.bookedai.au` or `register-interest` directly instead of the earlier `/?demo=open` or assistant-open legacy shells
- README, system-overview, and code-audit documentation were updated again on `2026-04-19` so central docs now list `product.bookedai.au` as a first-class production surface rather than leaving the product host implicit

- the live public baseline changed materially again on `2026-04-19`: `bookedai.au` now resolves to the homepage sales-deck runtime instead of the earlier standalone search-first homepage runtime, and that host-level change was promoted live through the production `web` container after rebuild and verification
- homepage conversion architecture moved forward again on `2026-04-19`: the sales deck now routes primary trial CTAs into the BookedAI-owned `register-interest` flow with explicit attribution plus launch-offer defaults, while `product` and `demo` remain the deeper proof surfaces instead of carrying homepage-primary conversion responsibility
- homepage visual storytelling also moved forward on `2026-04-19`: the public sales deck now includes a dedicated flow-map section and CTA rail treatment so the route from traffic, to intent ranking, to booking and registration reads more visually and less like a sparse marketing shell
- the product route advanced again on `2026-04-19`: `ProductApp` now surfaces direct `Start Free Trial` entry points that continue into `register-interest`, which means the live product experience now participates directly in the same conversion funnel as the homepage instead of acting only as a self-contained booking demo
- booking-flow UX was tightened again on `2026-04-19`: `BookingAssistantDialog.tsx` now pushes the product flow directly into the booking-details step and focuses the customer form after a service is selected, rather than scrolling the user back through the panel chrome first
- package-booking UX was tightened in parallel on `2026-04-19`: `PricingConsultationModal.tsx` now auto-focuses the contact form when the selected package changes or the contact step opens, so package selection leads directly into information entry instead of leaving the user to manually reposition
- the latest public/product CTA and booking-focus improvements were built successfully with `npm run build` in `frontend/` and then redeployed live to the production `web` container on `2026-04-19`

- homepage sales-deck polish moved forward again on `2026-04-19`: the public homepage now includes a dedicated offer strip under hero, cleaner utility navigation for pricing and product-demo access, an explicit `See Pricing` utility CTA in hero, and a tighter section sequence so the page reads more like a premium SME sales deck while still driving one dominant action into the BookedAI-owned `register-interest` flow
- the homepage deployment story was also tightened on `2026-04-19`: implementation copy now explains the three approved deployment modes more directly, and the homepage CTA hierarchy now keeps `Start Free Trial` primary while treating sales-deck review and product-demo exploration as clearly secondary actions

- a full plan-versus-code audit has now been recorded in `docs/development/project-plan-code-audit-2026-04-19.md`
- the active code-aligned phase and sprint execution baseline is now `docs/architecture/current-phase-sprint-execution-plan.md`
- later sprint planning should therefore stop treating the public search shell, tenant workspace, admin workspace, release-gate tooling, and tenant catalog publish workflow as not-yet-started concepts where working code already exists
- the next execution emphasis is now explicitly narrowed to tenant identity completion, billing posture completion, tenant value visibility, and release-grade hardening across tenant and admin commercial workflows
- an additional cross-surface productization plan is now active in `docs/architecture/user-surface-saas-upgrade-plan.md`, which adds mandatory upgrade tracks for public frontend UX, customer portal productization, tenant login UX, admin login UX, billing SaaS flows, and whole-system UI/UX harmonization
- the next implementation wave is now also translated into an execution-ready delivery package at `docs/development/sprint-13-16-user-surface-delivery-package.md`, which breaks Sprint `13-16` down into concrete screens, API seams, backend work, and recommended build order for public, portal, tenant, admin, and billing surfaces
- the first portal productization slice has now landed in code on `2026-04-19`: the shared frontend runtime now includes a dedicated `PortalApp` for `portal.bookedai.au`, `/api/v1/portal/bookings/{booking_reference}` now exposes a customer-safe booking review snapshot, and the first portal surface now shows booking summary, service context, payment state, support contact, timeline, and request-safe follow-up actions instead of treating the portal as a bare redirect target only
- the portal lane then advanced again on `2026-04-19`: customer-facing `reschedule-request` and `cancel-request` endpoints now exist under `/api/v1/portal/bookings/{booking_reference}/...`, those requests are recorded through audit and outbox foundations for manual follow-up, and `PortalApp` now includes an in-product request composer so the portal behaves more like a real customer system and less like a read-only booking receipt
- the portal lane advanced a third time on `2026-04-19`: portal booking detail now includes a status summary tuned for completed, cancelled, payment-attention, and in-review states; the customer timeline now surfaces recent portal reschedule/cancel requests from audit history; and the runtime now handles invalid-reference and closed-booking messaging more explicitly so the portal reads more like a production customer workspace than a single happy-path receipt screen
- the portal lane advanced again on `2026-04-24`: `frontend/src/apps/portal/PortalApp.tsx` now reads only dedicated booking-reference query params (`booking_reference` and camel-case compatibility `bookingReference`) instead of the generic `ref` param, preventing tracker or release-token values from being misread as booking references and surfacing false `Booking not available` errors
- the portal lane advanced again later on `2026-04-24`: live production end-to-end booking verification surfaced two portal follow-up regressions for `v1-*` booking references, and both are now fixed in `backend/service_layer/tenant_app_service.py`; portal snapshot loading now skips UUID-only payment and audit queries for legacy-style booking intent ids, and the merchant-profile join now casts mixed `uuid` / `varchar` identifiers safely so `portal.bookedai.au` can reopen newly-created live bookings instead of failing with `Failed to fetch`
- portal and admin operations are now linked more directly on `2026-04-19`: admin overview payloads now include a `portal_support_queue`, the operations workspace now shows recent portal reschedule/cancel requests with outbox posture plus quick booking-open actions, and the queue is backed by audit-log plus outbox joins instead of a UI-only placeholder so support follow-up can start from the real operator surface
- the admin support lane advanced again on `2026-04-19`: portal support requests can now be marked `reviewed` or `escalated` directly from the admin operations workspace, those operator actions are recorded back into audit logs, and the queue read-model now surfaces latest internal resolution state so the portal support flow behaves more like a real support lifecycle than an unread task pile
- the same admin support lane widened again on `2026-04-19`: the queue now also includes `payment attention` items sourced from `payment_intents` in failed or follow-up-required states, so operator review can start from one combined support-and-billing exception lane instead of splitting customer follow-up and payment troubleshooting across separate surfaces

Current focus areas:

- the tenant-product requirement baseline was tightened on `2026-04-18`: `tenant.bookedai.au` is now the approved canonical tenant gateway, and follow-on product planning must treat tenant sign-up, sign-in, data input, revenue reporting, subscription visibility, invoice handling, and billing actions as one unified paid-SaaS workspace rather than separate optional surfaces

- the public search shell was tightened again on `2026-04-18` into a more professional workspace-style runtime: `PublicApp.tsx` now pairs a lighter top navigation and stronger hero search surface with a clearer handoff into `HomepageSearchExperience.tsx`
- the standalone homepage search runtime was redesigned on `2026-04-18` around a structured `search workspace` model: summary header, dominant query bar, quick suggestion chips, shortlist meta row, upgraded result cards, and a dedicated booking rail that reads like an operator side panel instead of a generic landing block
- the shared shortlist presentation baseline was strengthened on `2026-04-18`: `PartnerMatchCard.tsx` and `PartnerMatchActionFooter.tsx` now present clearer hierarchy, brighter selected states, and full action-link rendering for `Book now`, `Open Google map`, and related next-step cues so the public search surface behaves more like a professional booking application
- the standalone homepage runtime now also primes the Prompt 5 v1 public session directly, so the search-first homepage keeps the same shadow-session and live-read initialization guarantees that the older assistant dialog path expected
- final validation for that UI pass was recorded on `2026-04-18` with `npx tsc --noEmit`, `npx playwright test tests/public-homepage-responsive.spec.ts`, and targeted live-read regression checks covering authoritative-write session priming plus `top 3 + See more` shortlist behavior
- this UI pass should now be treated as the implemented Sprint 3 public-shell baseline, while a broader visual-system alignment pass for tenant and admin BookedAI surfaces remains later owned work rather than completed scope

- the live public homepage baseline has now changed again on `2026-04-18`: `frontend/src/apps/public/PublicApp.tsx` is no longer a section-first landing and is also no longer an embedded `BookingAssistantDialog` shell; it is now a standalone Google-like search homepage that runs its own search-results, shortlist, booking, and confirmation interface while reusing the same backend API flow
- the current public copy baseline is now `English by default` with a top-level language selector that already exposes `English` and `Tiếng Việt`, and later public-shell or documentation work must treat this as the current multilingual baseline instead of reintroducing mixed-language copy or popup-only conversion assumptions
- the homepage layout baseline has now been tightened further on `2026-04-18`: the main body should now show only the approved logo, a short `revenue engine for service SMEs` message, and the search box above the inline assistant flow, while the rest of the explanatory content is moved into the menu layer, top bar, or bottom bar so the maximum possible space is preserved for results and booking progression
- the requirement-side and execution-side baseline has now been tightened again on `2026-04-18`: all follow-on planning should assume BookedAI is optimizing first for revenue capture by service SMEs, with lightweight search-first and booking-first public design plus mobile-first responsive execution across any customer-facing conversion surface
- roadmap, sprint register, dependency map, Sprint 3 checklist, and core requirement docs are now being re-aligned so the post-Sprint-2 order prioritizes: lightweight homepage execution, assistant-truth contracts, reporting truth, search-quality release thresholds, recovery workflows, tenant supply truth, tenant workspace, and only then deeper admin and release-discipline expansion
- the live homepage baseline has now shifted again on `2026-04-18`: the public shell is being rebuilt into a larger-logo, Google-like search surface with a simpler professional dropdown menu, a dedicated on-page search-results frame, and less homepage chrome so more viewport area is reserved for search results and the full booking flow
- the mobile responsive baseline has now been tightened further on `2026-04-18`: BookedAI homepage mobile should follow a Google-like compact structure with a smaller top bar, tighter menu sheet, horizontal suggestion chips, and a taller results frame so search and booking controls consume the maximum useful viewport area
- the homepage search-result baseline has now been tightened again on `2026-04-18`: the standalone homepage runtime should attempt device-location detection at search time, prefer nearby services plus online-capable services when ranking, and reveal only the top `3` priority results before the user expands the remaining shortlist with `See more`
- the checked-in brand-asset baseline has now been tightened again on `2026-04-18`: `frontend/public/branding/` is the only approved logo/icon source for all BookedAI web, app, site, single-page, favicon, PWA, touch-icon, and mobile-responsive usage, and later work should update shared brand mappings rather than introducing route-local or remote logo sources
- the final logo cleanup pass also completed on `2026-04-18`: homepage, Next metadata, email confirmation branding, favicon wiring, shared brand renderers, and execution docs now all resolve to the checked-in raster assets in `frontend/public/branding/`, while older logo files are treated as legacy compatibility only and not as active implementation sources
- the brand cleanup was then tightened further on `2026-04-18`: the retired legacy logo files and root favicon duplicates were removed from the active repo asset set, `app/icon.svg` was removed, and `scripts/verify_brand_assets.sh` now fails if any of those deprecated branding files reappear
- Sprint 2 carry-forward documentation now also needs to be read with one extra context rule: whenever later sprint docs mention the old `popup assistant` or the later `embedded inline assistant` as the public conversion surface, teams should interpret both as historical context only and update new sprint-ready docs toward the current `standalone homepage search runtime` baseline before implementation begins
- the public-shell architecture baseline has now shifted again on `2026-04-18`: homepage search uses a dedicated standalone runtime in `frontend/src/apps/public/HomepageSearchExperience.tsx`, while the older landing narrative has been moved into a dedicated `Pitch Deck` route plus menu, top-bar, and bottom-bar navigation
- the semantic-search provider baseline has now shifted again on `2026-04-18`: OpenAI is now attempted before Gemini inside `backend/integrations/ai_models/semantic_search_adapter.py`, so provider-chain interpretation should now assume `openai -> gemini` when fallback is needed rather than the earlier `gemini -> openai` order
- frontend QA inheritance has now been partially realigned on `2026-04-18`: the release-gate live-read smoke cases in `frontend/tests/public-booking-assistant-live-read.spec.ts` have been confirmed against the standalone homepage search runtime, while broader legacy-assistant assumptions in the rest of that suite should still be treated as follow-up cleanup rather than production truth
- responsive QA for the standalone homepage search runtime also passed on `2026-04-18` through `frontend/tests/public-homepage-responsive.spec.ts`, confirming that the current Google-like shell keeps the search box, compact menu, and booking-results surface usable on both desktop and mobile before production promotion
- that homepage and documentation baseline has now also been deployed live on `2026-04-18` through `sudo bash scripts/deploy_production.sh`; production health returned `{"status":"ok","service":"backend"}`, and `https://bookedai.au` now serves the updated public shell behind the current production proxy
- Sprint 2 is now formally closed as an implemented and live inherited baseline: the closeout review, code-ready handoff, slice record, and Sprint 3 kickoff docs now agree that Sprint 2 should no longer be treated as an active blueprint-only sprint and that Sprint 3 must inherit the implemented branding, public CTA shell, assistant locality, and search-truth guardrails already closed out on `2026-04-18`
- Sprint 3 kickoff now has an explicit control lane, a first-week board, and a fill-in kickoff note template, with the inherited browser smoke gate `bash scripts/run_live_read_smoke.sh` documented as the minimum clean-build gate before broad implementation fan-out
- a live replay utility now exists at `scripts/run_matching_search_replay.py`, and the latest backend diagnostics hardening has now been deployed to both `backend` and `beta-backend` on `2026-04-18`; production replay now returns `search_diagnostics` live, and the latest retrieval hardening converts `kids haircut Sydney` into a clean safe no-result state with `retrieval_candidate_count = 0` instead of surfacing `blowdry-finish`, which confirms the mixed-result instability there has been removed
- the search-quality lane moved forward again on `2026-04-18`: OpenAI `Responses API + web_search` is now the official live public fallback after tenant miss, unsupported request parameters were removed from the production payload, and direct live validation now confirms sourced fallback results for hospitality, dental, childcare, and private-dining queries while the current 7-case English replay snapshot classifies production outcomes as `web_fallback = 4`, `missing_catalog = 2`, `blocked_by_gates = 1`, and `tenant_hit = 0`
- the replay lane also matured further on `2026-04-18`: `docs/development/english-search-replay-pack.json` now includes 5 production-validated tenant-positive cases, and a targeted harness run confirmed `tenant_hit = 5/5` with `expectation_mismatches = 0`, so replay now measures both tenant-backed truth and public-web fallback behavior instead of only tenant-miss scenarios
- release discipline for this lane also tightened on `2026-04-18`: the search replay gate now has an explicit baseline threshold of `5/5 tenant_hit`, `0 expectation mismatches`, `>= 4/7` sourced public-web fallback outcomes, and `0` wrong-domain tenant leaks before the intelligent-search rollout should be treated as promote-ready
- the gate is now executable through a dedicated command, `python3 scripts/run_search_replay_gate.py`, which writes promote-or-hold artifacts under `artifacts/search-replay-gate/`; `scripts/run_release_rehearsal.sh` can also include it through `--search-replay-gate` so release rehearsal captures search precision in the same pass
- the root release gate now also supports `RUN_SEARCH_REPLAY_GATE=true`, so CI or a release machine can include the production-shaped search replay decision directly inside `scripts/run_release_gate.sh` instead of relying on a separate manual command
- homepage search-state hardening also moved forward on `2026-04-18`: `HomepageSearchExperience.tsx` now treats live-read as the authority whenever it returns candidates or warnings, so `restaurant near me` no longer revives legacy hospitality rows when location permission is missing; targeted browser regressions now also cover `dentist near me`, `haircut near me`, and `childcare near me` to keep the homepage shortlist empty and warning-led in the same denied-location state
- live replay on `2026-04-18` also confirms that `swimming Sydney` currently returns `retrieval_candidate_count = 0`, so the gap for that flow is no longer search-truth logic alone: production still needs real SME swim-school catalog rows, tenant-safe login or ownership plumbing, and a publishable searchable or bookable product path before the assistant can surface saved customer business data from the BookedAI database
- a dedicated tenant onboarding and catalog-ingestion execution package now exists at `docs/development/sprint-8-tenant-catalog-onboarding-execution-package.md`, and the roadmap, sprint register, sprint 8 or 11 or 12 owner checklists, and Phase 7-8 package now explicitly treat Google sign-in, website or file import review, manual entry, publish-safe searchable rows, and the offline search corpus as a planned delivery lane rather than an implicit future idea

- the approved revenue-engine logo family has now been redesigned into a clearer `RE` monogram and deployed live to production and beta, with unified checked-in SVG variants, regenerated favicon/touch-icon/app-icon assets, and versioned public favicon paths to bypass stale cache from the legacy icon route
- the approved checked-in raster brand family now also exists in `frontend/public/branding/` as the single deployment-grade source for `bookedai-logo-light`, `bookedai-logo-dark-badge`, `bookedai-logo-black`, `bookedai-mark-gradient`, `bookedai-app-icon-1024`, and the generated `16/32/48/64/96/180/192/256/512` icon outputs used by homepage, shared brand-kit, favicon, and mobile-responsive surfaces
- a dedicated [Sprint Dependency And Inheritance Map](./sprint-dependency-and-inheritance-map.md) now exists, exporting the hard gates, inheritance rules, and parallel-execution allowances across Sprint 1 through Sprint 16 so teams no longer need to reconstruct cross-sprint sequencing from scattered roadmap and phase documents
- a leadership-level [master execution index](../architecture/master-execution-index.md) now exists so the full Phase 0 to Phase 9 program can be navigated from one short file before opening the deeper architecture and sprint docs
- a [Jira-ready delivery structure](./jira-ready-delivery-structure.md) now exists so the current execution model can be transferred into a tracker using the standard hierarchy `Initiative -> Phase -> Epic -> Story -> Task`
- a [Notion import-ready execution backlog](./notion-import-ready-execution-backlog.md) now exists with phase, epic, and sprint tables aligned to the current execution system
- the Notion MCP session is now authenticated as `info@bookedai.au`, and a live `BookedAI Execution Hub` has been created with linked `Program Phases`, `Delivery Epics`, `Sprint Execution`, and `Stories and Tasks` databases seeded from the repo planning structure
- the Notion workspace now also contains export-friendly detail pages for `Phase 1` through `Phase 9` plus `Sprint 1` through `Sprint 14`, with dedicated phase and sprint index pages so the execution program can be reviewed outside the database tables
- the `Stories and Tasks` database now includes self-relation support for parent and child backlog items, seeded `Story` rows for the active Phase 7-8 and planned Phase 9 execution lanes, plus concrete `Task` rows for active Sprint 14 operator work so the current admin-support backlog is executable inside Notion instead of living only in markdown breakdown docs
- each `Sprint 1` through `Sprint 14` detail page in Notion now also links directly to its related phase detail page and its `Sprint Execution` database row, so export-friendly pages and database-backed execution tracking are no longer separated
- the phase detail pages now also link back to their covered sprint detail pages, and Sprint 11 through Sprint 14 detail pages now deep-link into the seeded story rows that make up the active tenant and admin execution backlog
- the export-friendly Notion layer is now complete through `Sprint 16`: Sprint 15 and Sprint 16 detail pages now exist, Phase 9 links back to them, and both pages link into their seeded Phase 9 story rows plus the live `Sprint Execution` database rows
- a single `BookedAI Final Export Index` page now exists in Notion as the top-level share/export entry point for the full hub, databases, phase pages, sprint pages, and active execution links
- the final export page has now been reorganized into an executive-facing layout with `Executive snapshot`, `Current status`, `Next up`, `Key links`, and `Active execution links` ahead of the full navigation section so leadership can scan the program in under a minute
- that executive snapshot now also reflects the actual current Sprint 14 state from the repo docs: admin Prompt 5 preview and reconciliation reads are already present, Sprint 14 close-out still centers on support-flow completeness and rollout guardrails, and reconciliation is stronger but not yet presented as broad read-cutover truth
- Sprint 14 close-out review is now interactive in Notion: both the Sprint 14 detail page and the Final Export Index page include checkbox-based close-out items mapped from the owner checklist so sprint review can happen directly in the export workspace
- Sprint 14 close-out is now also database-backed in `Stories and Tasks` through one dedicated close-out story plus twelve linked task rows, so the same review lane can be tracked in table, board, page, and export views without duplicating execution state
- a master PRD now exists at `docs/architecture/bookedai-master-prd.md`, consolidating the current repo truth, target product shape, and forward phase requirements into one planning baseline that can now be rendered and shared outside the repo
- Phase 0 and Sprint 1 rebranding implementation has now started in code, with the shared frontend brand layer updated toward the revenue-engine narrative and the current brand renderers now resolving from the checked-in branding files in `frontend/public/branding/` instead of preferring a remote live logo asset
- the missing Phase 0 public-experience artifact now exists as `docs/architecture/landing-page-system-requirements.md`, locking the required section order, hero rules, widget vocabulary, CTA hierarchy, pricing framing, and truth-gate baseline that Sprint 1 needs before the deeper Phase 1-2 landing work continues
- a formal `docs/architecture/phase-0-exit-review.md` now exists as the closeout record for the reset phase, marking the core documentation stack as materially aligned, recording the remaining non-blocking assumptions, and stating that Sprint 2 is ready for explicit owner signoff rather than remaining informally implied
- `docs/architecture/sprint-2-implementation-package.md` has now been rewritten to match the actual Phase 1-2 plan, replacing an outdated backend-refactor framing with the correct Sprint 2 execution package for public brand system lock, design tokens, component tree, section mapping, widget vocabulary, and instrumentation assumptions
- Sprint 2 planning now also has concrete implementation-side companion artifacts for `frontend/src/theme/*`, `frontend/src/styles.css`, and `frontend/src/components/landing/*`, with `frontend-theme-design-token-map.md`, `landing-component-tree-and-file-ownership.md`, and `landing-page-execution-task-map.md` turning the landing requirements into file-level ownership and task-level execution guidance instead of leaving them as high-level requirements only
- Sprint 2 closeout now also has an explicit review artifact at `docs/architecture/sprint-2-closeout-review.md`, and the repo now includes an additive public CTA/source instrumentation baseline so pricing consultations, demo briefs, and assistant entry flows preserve originating section and CTA context instead of collapsing into one generic landing source
- the repo now also includes a concrete BookedAI brand UI kit artifact at `docs/architecture/bookedai-brand-ui-kit.md`, local SVG logo variants, a dark-mode-first `bookedai-brand-kit.css` token layer, and reusable `frontend/src/components/brand-kit/*` primitives so future Next.js-ready brand work can ship from one implementation baseline instead of ad-hoc landing-only styling
- a standalone Next.js App Router starter foundation now also exists at repo root through `app/page.tsx`, `app/globals.css`, `components/brand/logo.tsx`, `components/ui/button.tsx`, `components/ui/glass-card.tsx`, `components/sections/*`, and `tailwind.config.ts`, so the new BookedAI revenue-engine brand can be lifted into a production-ready Next app without re-translating the token system first
- that standalone Next starter now also includes `app/layout.tsx`, `package.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.mjs`, `postcss.config.js`, and dedicated `TrustBar` plus `FinalCTASection` blocks, so the root App Router foundation is no longer just loose page fragments and now has the minimum project wiring needed for a real Next.js install-and-run path
- governance now requires every module change to start from its existing description doc, re-read prior context, merge updates into that source-of-truth narrative, and record the result in the edited request-facing doc, implementation tracking, and the corresponding roadmap or sprint or phase artifact
- governance now also requires live-promoted work to be written back automatically once the last implementation step is complete, so `implemented`, `deployed live`, and `documented in progress + sprint + roadmap` are treated as one closure standard rather than separate follow-up tasks
- Prompt 5 additive API v1 foundation
- Prompt 5 shared frontend and backend contract alignment
- Prompt 5 UI adoption planning for public and admin surfaces
- Prompt 5 pricing shared contract/client alignment on the legacy consultation path
- Prompt 5 admin support adapter extraction for preview and triage flows
- roadmap page compact timeline and cluster-based drill-down refresh
- roadmap sprint sequence with per-sprint evidence, gaps, prompt order, and agent roster
- roadmap deep-link hash sync for phase/sprint selection plus mini-Gantt milestone strip
- roadmap phase and sprint detail subpages for shareable deep-dive delivery views
- roadmap sprint document register now maps each sprint to the real implementation docs in repo
- landing footer now surfaces a visible release badge plus source version and release date, so each new phase or version can be distinguished from the public page footer as well as from the source tree
- hero and branding polish now ship as release `1.0.3-hero-polish`, with the public footer showing the new wave metadata so landing changes are distinguishable from the earlier hardening cut
- Sprint 9 tenant shell has now started shipping as release `1.0.4-tenant-shell`, with a read-only tenant runtime, tenant-scoped overview API, and footer source version updated again so this phase is visually distinct from the prior hero polish wave
- Sprint 9 phase 2 now ships as release `1.0.5-tenant-panels`, extending the tenant shell into clustered `overview`, `bookings`, and `integrations` panels so the workspace reads like an operator console instead of one long dashboard
- Sprint 9 tenant phase 3 now ships as release `1.0.6-tenant-catalog-workspace`, adding a workspace-first tenant catalog panel, Google sign-in for tenant-authenticated actions, and AI-guided website import tuned toward booking-critical fields such as product or service name, duration, location, price, description, imagery, and booking links
- Sprint 9 tenant phase 4 now ships as release `1.0.7-tenant-publish-workflow`, adding persisted tenant membership, explicit catalog ownership fields, and the first tenant edit/publish/archive workflow for catalog rows
- tenant catalog read models now surface search-ready counts, warning counts, inactive counts, and quality-warning detail so the tenant surface can manage searchable supply truth directly instead of relying only on admin-side imports
- tenant Google-authenticated catalog import now writes into the BookedAI catalog path and immediately refreshes the tenant workspace, giving the tenant app its first controlled write-enabled workflow rather than remaining read-only
- release rehearsal wrapper now writes promote-or-hold artifacts after the root gate
- the latest release rehearsal artifact is now `promote_ready`, so Sprint 10 hardening has moved from chained-gate stabilization into next-phase handoff readiness
- the next roadmap execution lane after Sprint 10 hardening is now a tenant-facing read-heavy slice, starting with the first standalone tenant shell and overview summary instead of jumping straight into tenant write flows
- the tenant-facing slice now also includes dedicated tenant bookings and integrations read models, so the next follow-on can add deeper tenant detail without reworking the shell shape again
- release gate now uses a smaller `admin-smoke` Playwright lane instead of the full admin regression suite
- Playwright release lanes now clear preview-server ports before each run so repeated rehearsal passes are less likely to fail on stale local servers
- release gate now also runs smaller representative `legacy` and `live-read` smoke slices instead of the full tagged suites, while broader regression coverage remains available outside the gate
- the representative live-read release slice is now centered on the legacy-authoritative write-boundary case, while the more detailed request-counter live-read coverage remains outside the gate as a broader regression check
- Playwright admin and live-read lanes now also rebuild behind mode-safe preview bootstrapping, so stale legacy/live-read env bleed and expired-session fixtures are less likely to flip search-quality smoke outcomes
- Prompt 5 dependency mapping into Prompt 9, Prompt 10, and Prompt 11
- Prompt 5 backend contract test enablement in project-local virtualenv
- Prompt 5 public booking assistant shadow adoption
- Prompt 5 and Prompt 9 selective live-read adoption in the public booking assistant
- Prompt 9 trust-first matching and booking trust behavior on v1 endpoints
- Prompt 9 booking-path resolution and escalation-ready decision policy on v1
- admin Prompt 5 v1 preview surface
- Prompt 10 CRM sync and lifecycle email service foundations
- communication channel foundation for additive SMS and WhatsApp delivery
- inbound WhatsApp webhook capture plus admin communication-history visibility
- Prompt 10 lifecycle orchestration baseline with CRM manual-review ledger semantics
- Prompt 11 integration provider status, attention queue, and reconciliation read models
- Prompt 11 CRM retry backlog read model and admin drill-in for Sprint 10 hardening
- admin Prompt 5 preview expanded to lifecycle email, CRM seeding, integration health, attention queue, and reconciliation signals
- Phase 2 persistence foundations now include usable tenant-aware audit log, outbox, webhook event, and idempotency repositories instead of placeholder seams, so rollout-safe writes have a concrete repository layer before wider dual-write adoption
- Phase 2 runtime adoption now records additive audit/outbox activity for Prompt 5 v1 lead, booking-intent, payment-intent, email, SMS, and WhatsApp write paths, while inbound WhatsApp webhook capture now also uses webhook-event tracking plus idempotency gating to suppress duplicate ingestion without changing the live contract
- Phase 2 worker foundations now also include a basic pending-outbox dispatch loop with processed/failed status transitions, so the new outbox table is no longer write-only while broader provider-specific worker routing is still additive
- Phase 2 execution truth now also includes a tracked `job_runs` repository, scheduler helper, and reliability-facing runtime activity feed that merges recent job runs, outbox events, and webhook events inside the existing Prompt 11 read-model lane instead of creating a parallel admin surface
- admin Prompt 5 preview now also surfaces that runtime activity feed, so operators can inspect write-side runtime truth for job execution, outbox dispatch, and webhook ingestion from the same reliability lane already used for CRM retry and reconciliation review
- the first tracked worker producer path now exists via a `run_tracked_outbox_dispatch(...)` wrapper, so `job_runs` are no longer only seeded by test helpers or future plans; the outbox worker can now emit real execution truth through the same tracked-job seam used by Phase 2 scheduler foundations
- the first admin-triggered worker control path now exists at `/api/v1/integrations/outbox/dispatch`, and Prompt 5 preview can trigger that tracked outbox run directly inside the reliability lane so operators can initiate a controlled dispatch and immediately inspect the returned `job_run_id`, dispatch status, and detail summary
- Prompt 5 preview now also runs a short runtime-activity refresh loop after that dispatch action completes, so the operator can see the fresh `job_runs` feed update inside the same reliability card instead of relying only on the immediate action response
- the tracked outbox dispatch path now also performs a real additive worker-side effect by appending `outbox.event.dispatched` audit records for processed events, so the first Phase 2 worker control path is no longer a no-op shell and now leaves persistence-backed dispatch evidence behind each successful run
- Prompt 5 preview now also surfaces a dispatch-audit drill-in backed by `/api/v1/integrations/outbox/dispatched-audit`, so operators can review the latest `outbox.event.dispatched` evidence, aggregate IDs, worker actor identity, and idempotency references from the same reliability lane as runtime activity and tracked dispatch control
- Phase 2 reliability now also includes the first operator recovery action for failed outbox items, with `/api/v1/integrations/outbox/replay` re-queueing a single failed event into `retrying` state and the Prompt 5 runtime-activity card surfacing replay controls directly beside failed outbox entries instead of leaving recovery as a database-only action
- Phase 2 reliability now also tracks outbox retry depth and last failure context, with additive schema support for `attempt_count`, `last_error`, `last_error_at`, and `processed_at`, plus a dedicated `/api/v1/integrations/outbox/backlog` read model so operators can review backlog severity before replaying or dispatching again
- next-wave execution planning for Prompt 10 lifecycle orchestration, Prompt 11 attention read models, and selective live assistant adoption
- Sprint 4 release-readiness and rollout contract updates for Prompt 10, Prompt 11, and selective live assistant adoption
- Playwright smoke coverage for public assistant legacy fallback and live-read guidance
- frontend admin modularization
- frontend bookings list extraction
- frontend bookings table decomposition
- frontend shadow diagnostics decomposition
- backend admin read-flow extraction
- backend admin booking shadow-compare preparation
- backend booking assistant and public flow dual-write expansion
- backend demo workflow orchestration extraction
- repository seam hardening for demo brief and booking sync
- normalized mirror status propagation after callback flows
- deeper callback status propagation into payment lifecycle mirrors and normalized state
- backend callback/payment status mapping normalization
- backend lifecycle-state normalization and shadow validation expansion
- operator-facing diagnostics legend for shadow compare interpretation
- next-sprint planning for protected-action re-auth, Prompt 10 CRM retry ledger, and CI-ready release gating
- beta staging now has a dedicated rebuild and redeploy script so preview rollouts can target `beta.bookedai.au` by default before production promotion
- Sprint S3 search reliability now includes catalog import hardening, with category normalization and topic-category mismatch gating keeping non-search-ready records out of live retrieval
- Sprint S3 now also includes a catalog audit/backfill utility for existing `service_merchant_profiles`, so older records can be normalized and downgraded with the same search-readiness rules used at import time
- admin catalog-quality diagnostics now include dedicated quality summary and CSV export endpoints, so the team can prioritize and remediate search-data issues as an operator workflow rather than ad-hoc inspection
- Sprint S4 search evaluation is now in progress with a fixed-query evaluation pack and runnable harness, so common user intents like Sydney skincare, Melbourne facial no-match, housing, membership renewal, kids services, and signage suppression now have explicit pass/fail regression checks
- public assistant search presentation now defaults to the top 3 ranked matches with progressive `See more` reveal, while booking cards prioritize compact decision-ready facts such as price, duration, location, and why the service matches
- public assistant and admin Prompt 5 preview now also share the same partner-match card presenter and shortlist card component, so richer matching metadata renders with the same decision-ready semantics across both surfaces instead of drifting into separate UI interpretations
- public assistant and admin Prompt 5 preview now also share the same shortlist container behavior with `top 3 + See more`, so search-driven surfaces stay compact by default while still allowing progressive reveal of lower-ranked matches in batches of 3
- the standalone homepage search runtime now also applies that compact shortlist rule directly with location-aware prioritization, so the first visible `3` cards should represent the best nearby or online-capable booking options instead of an unfiltered mixed list
- public assistant and admin Prompt 5 preview now also share the same partner-match action footer semantics, so `Book now`, `Open Google map`, `View source`, and the `Next action` cue stay aligned instead of diverging between chat and admin preview
- Playwright regression coverage now also locks the shared shortlist and action-footer semantics in both public live-read chat and admin Prompt 5 preview, so `top 3 + See more`, `Book now`, `Open Google map`, `View source`, and `Next action` drift will surface quickly during search-quality changes
- tenant catalog ownership is now stronger than the earlier heuristic-only slice: Google sign-in creates a persisted tenant membership record, imported catalog rows now carry explicit `tenant_id` and `owner_email`, and publish rights can anchor to those records instead of only matching by email or business-name guesswork
- tenant workspace now includes the first edit and publish-state workflow for catalog rows, with draft or review save behavior, explicit publish and archive actions, and imported website rows defaulting to review state instead of entering public search immediately
- migration-ready SQL for this hardening lane now exists in `backend/migrations/sql/004_tenant_membership_and_catalog_publish_state.sql`, so the live ORM fallback and the planned additive schema path no longer diverge on tenant membership and catalog publish-state design
- the repo now also includes `scripts/apply_backend_migrations.sh` plus `docs/development/backend-migration-apply-checklist.md`, so staging or shadow apply of migrations `001-004` has a concrete operator path instead of depending on ad hoc shell history
- the release gate and migration lane now also have a lightweight schema-state verifier in `scripts/verify_backend_migration_state.sh`, and `scripts/run_release_gate.sh` can invoke it automatically when `DATABASE_URL` and `psql` are available
- the tenant membership and publish-state rollout now also has a dedicated production-shadow rehearsal runbook in `docs/development/tenant-publish-production-shadow-rehearsal.md`, covering beta or shadow apply, tenant sign-in, import-to-review, edit, publish, archive, and public-search safety checks
- the first official sample tenant from a real source document is now `co-mai-hung-chess-class`, seeded from `storage/uploads/documents/fe41/XesZr6pjpiOaMMduIhpspQ.pdf` via `backend/migrations/sql/005_co_mai_hung_chess_sample_tenant.sql`, with eight chess-class offerings loaded into review state
- the second official tenant seed is now `future-swim`, sourced from verified `https://futureswim.com.au` website pages via `backend/migrations/sql/007_future_swim_official_tenant.sql`, with six published swim-school catalog rows covering Caringbah, Kirrawee, Leichhardt, Miranda, Rouse Hill, and St Peters
- the third official tenant seed is now `ai-mentor-doer`, curated from operator-provided AI mentor product copy through `backend/migrations/sql/013_ai_mentor_tenant_seed.sql`, with ten published online mentoring rows covering private `1-1` and group delivery, tenant settings main message `Convert AI to your DOER`, and current contact/login identity `aimentor@bookedai.au`
- the AI mentor tenant seed now also includes a tenant-specific illustration pack under `frontend/public/tenant-assets/ai-mentor/` and mirrored `public/tenant-assets/ai-mentor/`, with package rows updated to use branded concept art instead of the earlier shared stock image
- the same AI mentor package rows now point `booking_url` and `source_url` to `https://ai.longcare.au`, so tenant 3 package cards can open the intended website instead of seed-only placeholder source metadata
- AI Mentor Pro now also has an official BookedAI partner plugin interface: `AIMentorProApp` can run on `ai.longcare.au` or under `/partner/ai-mentor-pro`, the runtime is tenant-scoped with `deployment_mode = plugin_integrated`, generated builds now include `ai-mentor-pro.html`, and the repo ships `frontend/public/partner-plugins/ai-mentor-pro-widget.js` so the tenant website can mount the BookedAI engine as an inline or modal embed
- tenant portal now also exposes a tenant-managed `Plugin` workspace on `tenant.bookedai.au/<tenant>#plugin`, backed by `tenant_settings`, so partner tenants can review runtime metadata, edit embed configuration, and copy official widget/button/iframe code for their own websites without codebase access
- legacy booking assistant catalog/chat/session reads were also tenant-scoped for this lane through `tenant_ref` query handling in `backend/api/route_handlers.py`, while v1 search strictness was tightened for plugin-integrated tenant flows so the AI Mentor widget stays on the tenant's 10 mentoring packages instead of drifting into generic public-web results
- tenant app auth now also supports a lightweight username-password path for pilot tenants through `backend/migrations/sql/008_tenant_password_credentials_seed.sql` and `/api/v1/tenant/auth/password`, with seeded credentials `tenant1` for `co-mai-hung-chess-class`, `tenant2` for `future-swim`, and `aimentor@bookedai.au` for `ai-mentor-doer`; `backend/migrations/sql/023_ai_mentor_contact_login_update.sql` upgrades older `tenant3 / 123` AI Mentor seeds to `aimentor@bookedai.au / FirstHundred1M$` and sets email/phone/WhatsApp/Telegram/iMessage contact channels to `aimentor@bookedai.au` plus `+84908444095`
- tenant auth sign-in UX was widened again on `2026-04-26`: the live `TenantAuthWorkspaceEmail` gateway and tenant-scoped auth card now expose both `Email code` and `Email and password` sign-in panels side by side for `sign-in` mode, wired into `tenantPasswordAuth` from `TenantApp.tsx`, while the existing Google and email-code flows remain intact; verified with `cd frontend && npm run build`
- a new reusable tenant-delivery requirements baseline now exists in `docs/development/tenant-implementation-requirements-framework.md`, defining how future branded tenant websites should inherit BookedAI platform behavior for tenant scope, assistant safety, lead capture, lifecycle messaging, CRM posture, and host activation
- the Future Swim brief is now also normalized into a tenant-specific implementation reference at `docs/development/future-swim-tenant-use-case.md`, so later swim-school or kids-services tenants can inherit the same strict tenant-search policy, branded runtime approach, BookedAI receptionist model, and CRM-plus-email orchestration pattern without re-deriving the whole design from scratch
- tenant operations now also have a reusable execution companion in `docs/development/tenant-onboarding-operations-checklist.md`, so future tenant launches can follow one consistent path from intake, to catalog setup, to assistant policy, to CRM/email readiness, to host activation instead of rebuilding ad hoc onboarding steps each time
- the Future Swim rollout now also has a launch-specific execution runbook in `docs/development/future-swim-launch-runbook.md`, covering content approval, catalog verification, tenant-strict assistant checks, lead and booking smoke tests, DNS/cert activation, and go-live hold conditions for `futureswim.bookedai.au`
- Future Swim now also has a dedicated content-approval pass in `docs/development/future-swim-content-copy-approval-checklist.md`, so brand tone, parent-facing copy, location truth, enquiry wording, and assistant language can be signed off before production promotion
- production activation for Future Swim is now documented in `docs/development/future-swim-production-activation-pack.md`, and `.env.example` now includes `https://futureswim.bookedai.au` in default CORS plus Cloudflare DNS defaults so the tenant host is represented in the shared production-preparation baseline instead of living only in code and deploy scripts
- the Future Swim production activation lane completed on `2026-04-21`: local `.env` was updated to use `futureswim@bookedai.au`, SMTP login for that mailbox was verified successfully, the Cloudflare DNS record for `futureswim.bookedai.au` was created and now resolves publicly with the existing wildcard TLS certificate, and a minimal clean-worktree rebuild of the active `bookedai` `web` plus `proxy` services promoted the host mapping live so `https://futureswim.bookedai.au/` now returns `HTTP 200` and `https://futureswim.bookedai.au/api/health` returns `{\"status\":\"ok\",\"service\":\"backend\"}`
- the Zoho CRM lane for tenant rollouts advanced on `2026-04-21`: a reusable architecture reference now exists in `docs/architecture/zoho-crm-tenant-integration-blueprint.md`, and Future Swim now has a tenant-specific rollout reference plus a seeded `integration_connections` blueprint for provider `zoho_crm` in `write_back + paused` posture so the platform records the intended relationship model before live OAuth credentials are introduced
- tenant portal phase progress moved forward again on `2026-04-18`: the backend now exposes `/api/v1/tenant/billing`, the frontend tenant workspace now includes a dedicated `Billing` panel, and the unified tenant gateway can now show billing account identity, subscription status, period history, and charge-readiness posture inside the same portal as login, catalog input, bookings, and integrations
- execution planning for the next tenant-product wave was then made code-ready on `2026-04-19`: `docs/development/tenant-billing-auth-execution-package.md` now translates the canonical tenant-host requirement into a unified auth, onboarding, billing, value-reporting, and rollout package, while Sprint `13-16` owner checklists now also carry detailed technical backlog items for that lane instead of only high-level mission statements
- the same tenant-product wave now also has a concrete slice map on `2026-04-19`: `docs/development/tenant-billing-auth-implementation-slices.md` breaks the lane into file-scoped execution slices `TB-S1` through `TB-S16`, with cleanup rules, sprint ordering, and owner boundaries so Sprint 13 can start from a code-ready backlog instead of re-planning the module split
- Sprint 13 tenant foundation also moved from planning into code on `2026-04-19`: the backend now exposes `POST /api/v1/tenant/account/create`, `POST /api/v1/tenant/account/claim`, and `GET /api/v1/tenant/onboarding`, while the tenant portal now includes first-pass `sign in / create account / claim workspace` UX plus onboarding-progress visibility inside the same unified tenant workspace
- tenant catalog pricing truth has now been extended again on `2026-04-18`: `currency_code` plus `display_price` now exist across schema, tenant API, tenant workspace editing, import guidance, and migration verification so non-AUD tenants can preserve real brochure or source-document pricing without forcing fake AUD conversion
- the first official chess-class sample tenant now uses that pricing-truth lane directly through `backend/migrations/sql/006_tenant_catalog_currency_display_price.sql`, which backfills truthful `VND` display pricing for the seeded rows while keeping `amount_aud` compatibility for the older search stack where needed
- this sample tenant still preserves one explicit carry-forward requirement: PDF-first onboarding can now represent non-AUD pricing truthfully inside tenant review, but public publish still needs stronger booking-path completeness and source-document review support before such rows should become publicly searchable
- to make `tenant-first chess search` testable without breaking that policy, the migration pack now also includes `backend/migrations/sql/009_co_mai_hung_chess_published_pilot_row.sql`, which adds exactly one curated `Sydney` pilot row in `published` state while keeping the original eight brochure-derived rows in `review`
- that migration was then applied on `2026-04-18`, and direct live validation against `https://api.bookedai.au/api/v1/matching/search` confirmed:
  - `chess classes in Sydney` now returns `co-mai-hung-chess-sydney-pilot-group` from `service_catalog` with no public-web fallback needed
  - `chess near me` still returns a safe empty result plus the location-permission warning, so the tenant-positive chess path did not weaken the denied-location safeguards
- homepage runtime hardening then continued on `2026-04-18`: `HomepageSearchExperience.tsx` now respects recommendation-led live-read ordering, suppresses shortlist rendering entirely for `near me` queries when location permission is still missing, and applies a lightweight query-intent filter before rendering customer-visible cards so broad same-category noise does not outrank the requested service on the homepage surface
- targeted browser regression now locks that chess behavior explicitly: `chess near me` must stay empty with the location warning, while `chess classes in Sydney` must keep `Kids Chess Class - Sydney Pilot` visible and suppress `Future Swim` noise in the homepage shortlist
- search-priority hardening also moved forward again on `2026-04-18`: homepage shortlist ordering now uses `intent/content score first`, then `location fit`, so even when multiple tenant-backed rows share a broad category, only the rows whose content matches the user query should survive or win the visible ranking
- the intelligent-search lane was then reviewed again on `2026-04-19` against the active code-aligned planning baseline, and a new consolidated requirement-plus-gap-plus-upgrade document now exists at `docs/development/intelligent-search-core-review-and-upgrade-plan-2026-04-19.md` so later search-core work can stay synchronized with the broader phase and sprint plan instead of living only in incremental tuning notes
- the first implementation slice from that new review has now started on `2026-04-19`: `backend/service_layer/prompt9_matching_service.py` and `/api/v1/matching/search` now expose a canonical `query_understanding` payload, and the public homepage assistant has begun consuming backend-supplied intent terms before falling back to UI-only ranking heuristics
- the next search-core slice also landed on `2026-04-19`: deterministic backend ranking is now applied after relevance and display gates, `/api/v1/matching/search` now emits catalog recommendations in backend-ranked top-3 order, and homepage regression coverage confirms the chess query path keeps direct-intent tenant results ahead of same-city activity noise
- the search lane then moved into booking-decision detail shaping on `2026-04-19`: candidate payloads now include clearer result-detail fields such as `why_this_matches`, `source_label`, `price_posture`, `booking_path_type`, `next_step`, `availability_state`, and `booking_confidence`, and the shared shortlist card presenter now shows more of that truth directly on public result cards
- popup assistant runtime hardening also advanced on `2026-04-19`: `BookingAssistantDialog.tsx` now treats live-read as the authoritative search path before any legacy fallback, preserves booking-decision detail metadata through popup normalization, and targeted Playwright coverage now locks the popup/product dialog for `tenant-first`, `public-web`, `near me`, and `wrong-domain suppression` search cases instead of leaving that surface protected only indirectly through homepage regressions
- backend verification for the tenant pricing-truth lane is now stronger on `2026-04-18`: the repo-local `.venv-backend` executed `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service` successfully after bringing the lifecycle test fixture up to date with the current `Settings` contract
- the root release gate was also corrected on `2026-04-18` so Playwright smoke suites build with the correct mode-specific public-assistant flags instead of reusing a stale shared `dist`; that fix restored the live-read authoritative-write smoke path and the homepage `near me -> location warning -> geo hint` smoke path
- the current tenant currency-truth slice has now also been deployed live on `2026-04-18` through `sudo bash scripts/deploy_production.sh`; post-deploy health returned `{\"status\":\"ok\",\"service\":\"backend\"}`, and `https://bookedai.au` plus `https://api.bookedai.au` are serving from the refreshed production stack
- the self-hosted Supabase app database was then reviewed directly on `2026-04-18` through `supabase-db` using TCP `psql` inside Docker, confirming that live production already contains `tenant_user_memberships`, the `tenant_id/owner_email/publish_state/currency_code/display_price` columns, the seeded `co-mai-hung-chess-class` tenant, and all `8` VND-priced chess-class rows in `review` state
- migration helper tooling now also supports that environment explicitly: `scripts/apply_backend_migrations.sh` and `scripts/verify_backend_migration_state.sh` can fall back to `sudo docker exec supabase-db psql ...` when host-level `psql` is unavailable, and the verification helper now passes against the live Supabase-backed BookedAI database from the repo machine
- Sprint S2 query normalization now also covers Brisbane precinct phrasing such as `Fortitude Valley` and `James Street`, plus higher-intent phrase aliases like `wedding hair`, `bridal hair`, `gp clinic`, and `medical clinic`, so search ranking stays closer to the customer request before semantic rerank is even applied
- the fixed-query search eval pack now also covers Brisbane bridal-hair intent, giving the current search-quality lane `8/8` passing eval cases across skincare, housing, membership, kids services, signage suppression, and suburb-to-metro hair matching
- Catalog Quality Agent rules now also normalize `bridal/wedding hair` into `Salon`, map `Castle Hill` into the Sydney metro tag set, and keep healthcare import synonyms aligned with the richer search query lane, so topic and location metadata stay consistent between seed/import data and runtime matching
- the seed catalog audit now also reports warning-class counts and normalized category distribution, and the current seed baseline is `26/26` metro-tagged records with `0` quality warnings across the audited sample
- Semantic Ranking Agent now also exposes provider chain, fallback state, normalized query, inferred location, inferred category, and budget summary in `semantic_assist`, so Gemini/OpenAI failover is transparent in the matching response rather than hidden behind a single provider label
- semantic candidate evidence and reasons are now normalized more consistently before they flow into top-ranked shortlist metadata, which keeps semantic explanations shorter and cleaner across primary and fallback model paths
- contract-level QA now also locks semantic fallback transparency on `/api/v1/matching/search`, so provider chain, fallback state, and normalized semantic context are verified alongside the existing search eval pack instead of being left as implementation-only detail
- matching search retrieval is now stricter about truthfulness: topic/category intent and location are applied as separate filters at SQL retrieval time, so records that only match the city but not the requested service topic are less likely to enter the shortlist before Prompt 9 reranking
- public assistant live-read now keeps the visible shortlist pure to the v1 ranked candidates when live-read is active, so legacy chat payload noise can no longer re-introduce off-topic records into the customer-facing `top 3 + See more` results
- Phase 2 intelligent-booking delivery has now started on the matching path itself: `/api/v1/matching/search` returns additive structured booking context such as inferred party size, schedule hint, intent label, and a trust-aware next step, so the assistant can move from “best match list” toward “best next booking action” without changing authoritative booking writes yet
- that Phase 2 matching lane moved another step on `2026-04-22`: `backend/core/contracts/matching.py` and `backend/domain/matching/service.py` now define the richer intelligent-matching read model, `/api/v1/matching/search` now emits normalized `booking_fit` summaries plus `stage_counts` diagnostics per search, and the frontend v1 contract layer now normalizes the same richer response so shortlist reasoning can expand without reopening route-local payload drift
- semantic transparency is now surfaced in lightweight admin and public diagnostics as well, so operators can see when search stayed on primary Gemini versus when it failed over to OpenAI, without needing to inspect raw API payloads
- the Phase 2 roadmap, program timeline, and implementation package are now also synchronized around the current search-quality lane, so query normalization, catalog quality, semantic transparency, shared shortlist UX, and booking-context extraction are tracked in the same source-of-truth documents instead of drifting across isolated progress notes
- live-read search is now being hardened around query-grounded truthfulness: a fresh user request should not automatically inherit a previously selected service or category unless the user explicitly refers back to it, and no-result live-read states should stay empty instead of reviving unrelated legacy shortlist rows
- the semantic lane is now also being tightened as a Gemini-first, OpenAI-fallback verifier and concise summarizer for the active query, so the shortlist stays compact, accurate, and booking-ready rather than padded with generic stored matches
- production smoke tests have now also confirmed a broader search-truth gap in the legacy assistant chat lane: customer-visible replies can still mix unrelated events or weak city-only catalog rows into a service-consultation request, so later sprints must treat query-grounded retrieval and domain separation as a hard remediation program rather than a tuning nice-to-have
- the remediation direction is now locked: hard topic or location filtering must happen before model-written answer composition, and the semantic model should act as verifier and concise summarizer instead of the authority that invents relevance from stored system content
- the current preferred semantic stack for this remediation is OpenAI Responses API reasoning on top of strict retrieval, with a cost-efficient model such as `gpt-5-mini` for verification and summary plus a capable embedding model such as `text-embedding-3-large` for recall expansion after hard filters; this follows current official OpenAI model guidance and should be re-checked against official docs when the sprint implementing it begins
- admin catalog now also surfaces search-readiness counts, warning-state pills, local quality filters, and CSV export for non-search-ready records, so catalog cleanup can follow the same quality gate that live search already enforces
- public assistant search presentation now has explicit browser regression coverage for the top-3 shortlist and progressive reveal behavior, so future search-quality work is less likely to regress into thin or noisy result layouts
- admin shadow diagnostics now supports real recent drift examples payloads and operator drill-in affordances for booking detail triage
- frontend admin diagnostics now surface lifecycle drift breakdowns for booking, payment, workflow, email, and meeting comparisons in the bookings surface
- frontend admin diagnostics now surface recent drift examples and top drift references, so operators can move from category counts to concrete cases when reviewing rollout gaps
- frontend diagnostics now support surfacing recent drift examples alongside the aggregate breakdown, so the compare surface can show representative cases instead of only counts
- frontend diagnostics now support richer drift example payloads, so operator review can include booking reference, category, observed time, side-by-side legacy versus shadow values, and reference links where available
- recent drift examples are now case-rich review records rather than simple count companions, so operators can move from summary signals to concrete triage candidates without leaving the admin compare view
- a shadow review workflow now runs from diagnostics to references and then into booking detail triage for follow-up inspection
- the shadow review workflow now also includes a lightweight review queue, so operators can step through prioritized drift cases without changing the authoritative booking path
- booking detail drill-in now includes scroll/focus behavior from diagnostics, so the selected triage target is easier to inspect while staying additive and optional
- the shadow review queue now preserves local review state, so selected categories and reviewed/pending markers survive refreshes without introducing backend workflow state
- the shadow review queue now also supports bulk review actions and local sort modes, so operators can work through visible drift slices faster without changing the backend contract
- the shadow review queue now surfaces quick slice stats and a review-next action, so operators can see pending load and move to the next unreviewed case faster
- the shadow review queue now supports optional auto-advance and local operator notes per case, so review can stay sequential and documented without creating backend workflow state

## Phase 2 Review Snapshot

Date: `2026-04-17`

Current source-of-truth assessment for `Phase 2 intelligent booking search`:

- Done:
  - `/api/v1/matching/search` already returns ranked candidates, trust-aware recommendations, booking-context hints, and semantic transparency metadata
  - query normalization already covers phrase aliases, budget extraction, suburb-to-metro location expansion, and separate topic/location retrieval filters
  - semantic assist, strict relevance gating, shared public/admin shortlist presentation, and top-3 progressive reveal are implemented
  - catalog quality gating, warning exports, and operator remediation views are implemented
  - fixed-query evaluation coverage and Prompt 9 matching tests protect the core search lane
  - lightweight operator-facing diagnostics now surface semantic provider, provider chain, and fallback state in both admin preview and public live-read guidance
  - compact shortlist cards now reserve most space for summary, price, duration, location, and next action, while imagery is reduced to a small symbolic thumbnail when no partner image exists
- Partially done:
  - booking-intelligence extraction is present, but still lightweight and not yet a full search-to-booking handoff contract
  - semantic rollout is instrumented, but search tuning is not yet driven by production query replay or hard promotion thresholds
  - the app uses shared v1 API normalization, but the matching-specific shared contract layer is still thinner than the richer response actually used at runtime
  - query-grounded live-read behavior is being enforced in the active assistant surface, but broader operator feedback loops and release thresholds are still needed before the semantic lane can be treated as fully release-grade search truth
- Not done:
  - stronger industry-aware routing and human escalation policy
  - feedback loops that convert wrong results and safe empty-result cases into labeled tuning work
  - distance-aware ranking from granted live coordinates
  - vertical-specific acceptance criteria tied to release gating

Priority next actions:

1. Capture live search traffic into labeled eval inputs and make semantic or ranking changes pass release thresholds before promotion.
2. Expand search-ready catalog coverage in the highest-value verticals before increasing model complexity.
3. Promote booking-context hints into one normalized contract shared by matching, booking intent creation, and lifecycle handoff.
4. Add operator feedback capture for wrong-match, missing-catalog, and no-match-good outcomes.
5. Deepen escalation policy for ambiguous, high-value, or unsupported intents so the assistant fails safe.
6. Add hard wrong-domain suppression for assistant chat so service-consultation asks cannot pull AI-event or unrelated catalog rows into the visible answer.
7. Add hard stale-context suppression so a fresh query cannot reuse older shortlist rows unless the user explicitly refers back to them.
8. Add location-truth suppression in assistant chat so a city-qualified ask such as `in Sydney` does not continue surfacing interstate options unless explicitly labeled as fallback.

Execution follow-on prepared:

- `docs/development/sprint-6-search-quality-execution-package.md`
  - packages the open Sprint 6 work into four concrete lanes:
    - search telemetry foundation
    - production eval loop and release thresholds
    - operator feedback workflow
    - richer search-to-booking context contract

## Phase 2 Sprint 3-6 Status

Snapshot date: `2026-04-17`

### Sprint 3 — Platform safety tables and runtime foundations

- Done:
  - migration `001` and tenant anchor foundations exist
  - feature flags, audit, outbox, webhook, idempotency, and job-run repository seams now exist in code
  - multiple v1 write paths already record additive audit or outbox activity instead of leaving these tables schema-only
- In progress:
  - audit, idempotency, webhook, and outbox adoption is still uneven across the broader platform
  - some reliability and worker control paths are live, but wider runtime standardization is still incomplete
- Not done:
  - consistent coverage across every external callback, mutation path, and future async worker lane

### Sprint 4 — Dual-write mirrors and lifecycle normalization

- Done:
  - booking assistant, pricing consultation, and demo request flows already dual-write into normalized mirrors
  - admin shadow compare and drift diagnostics already exist
  - runtime activity, retry visibility, and outbox recovery controls now extend the read-side reliability lane
- In progress:
  - callback-driven lifecycle normalization for payment, email, workflow, and meeting drift is still being completed
  - reconciliation truth is stronger than before, but not yet complete enough for confident read cutover
- Not done:
  - full parity and acceptance thresholds for mirror truth across the broader lifecycle journey

### Sprint 5 — Domain API v1 foundation

- Done:
  - additive `/api/v1/*` route families are live
  - shared success or error envelopes and typed frontend normalization are already used
  - matching, booking trust, booking path, lifecycle, integration, and tenant read slices now all use the v1 lane
- In progress:
  - contract ownership is still split between generic shared API contracts and matching-specific types
  - not every downstream domain has the same level of explicit contract maturity yet
- Not done:
  - full convergence where v1 is the single clear source of truth for all new domain-first delivery work

### Sprint 6 — Matching, trust, and intelligent booking search

- Done:
  - query normalization, phrase aliases, suburb-to-metro expansion, budget extraction, semantic rerank, and relevance gating are all active
  - booking-context hints and trust-aware next-step guidance are now returned directly from `/api/v1/matching/search`
  - catalog-quality remediation and fixed-query eval coverage are already in place
  - public and admin search-driven shortlist behavior is visually aligned
- In progress:
  - search evaluation discipline exists, but still depends on repo-local fixed cases rather than production-query replay
  - booking-intelligence extraction is present, but still lighter than the downstream handoff model needs
  - industry-aware routing is improving, but not yet mature enough for complex or high-value escalation scenarios
- Not done:
  - operator feedback loop for wrong matches and safe empty-result cases
  - distance-aware ranking based on granted live coordinates
  - release thresholds that can block promotion when search quality regresses in a key vertical

## Frontend Progress

`frontend/src/components/AdminPage.tsx` has been reduced from a mega-page into page composition plus orchestration.

Admin sections extracted so far:

- `bookings-section`
- `selected-booking-panel`
- `recent-events-section`
- `service-catalog-section`
- `partners-section`
- `live-configuration-section`
- `api-inventory-section`
- bookings controls have been extracted into smaller feature-local pieces, so the section is now organized around composition rather than a single dense render block

Current shape:

- `AdminPage.tsx` now keeps page composition and wiring, while state/orchestration has moved into `frontend/src/features/admin/use-admin-page-state.ts`
- section-specific rendering lives in `frontend/src/features/admin/`
- admin state and side effects are moving out of the page component into feature-local hooks and modules
- login screen, dashboard header, and informational notes are also moving into feature components so the page can converge toward a composition shell
- bookings list rendering has been isolated from the section shell, and bookings summary/header rendering is now being split into smaller feature-local components as the next decomposition slice
- bookings table rendering is now being decomposed one layer deeper, so row rendering and table chrome can evolve separately from the section shell
- bookings table header and chrome are now being split out as their own decomposition slice, so the table shell can evolve independently from row rendering and higher-level section composition
- shadow diagnostics is also being decomposed into smaller feature-local pieces so the compare status, metrics, and presentation can evolve independently without changing the live contract
- mismatch diagnostics are now surfaced in the admin UI as category-level breakdowns, so operators can distinguish missing mirror data, status drift, amount drift, and other lifecycle inconsistencies without leaving the bookings surface
- the admin UI now includes an operator-facing diagnostics legend so the mismatch categories are easier to interpret during rollout and support review
- the next shadow-diagnostics phase has moved from reference-only review into real recent drift examples payloads with operator drill-in affordances, so the admin surface can move from counts to cases without changing the live path
- admin feature extraction remains rollout-safe and contract-preserving
- Prompt 5 public adoption has now started in additive shadow mode, with `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts` and `VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED` enabling background v1 session priming, candidate search, and lead or booking-intent writes while the legacy booking assistant flow remains authoritative
- the public booking assistant now also supports a selective live-read slice behind `VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ`, so v1 candidate ranking, booking trust, and booking-path guidance can drive the visible selection state while legacy chat completion and booking writes remain authoritative
- admin now also has a Prompt 5 v1 preview surface through `frontend/src/features/admin/prompt5-preview-section.tsx`, so operators can run additive search and booking-trust previews without replacing the current admin source-of-truth flows
- the admin Prompt 5 preview surface now goes one layer deeper, so operators can also inspect booking-path resolution, lifecycle email preview writes, lead or CRM seeding, integration provider status, and reconciliation summary signals from the same additive panel
- the admin Prompt 5 preview surface now also shows public assistant rollout mode for shadow priming, live-read selection, and the legacy-write boundary, so release-readiness can be reviewed without leaving the admin shell
- landing branding now uses a standalone BookedAI mark without the adjacent domain wordmark in header or footer chrome, and the hero headline has now moved to the revenue-engine framing instead of the earlier receptionist-led wording
- hero mobile polish has now simplified the above-the-fold layout into one clearer handset-focused composition, with a more natural phone aspect ratio, tighter responsive spacing, and shorter in-device copy so the surface reads less crowded on small screens
- `product.bookedai.au` has now been refit as a mobile-native product shell instead of a standalone static HTML entry, so the host stays on the shared SPA runtime and no longer depends on a parallel `product.html` flow
- production CORS now explicitly allows `https://product.bookedai.au`, removing the live catalog read failure that previously caused the product host to render without meaningful content
- compact product mobile layout now collapses the intro block into a small top bar, keeps the main viewport focused on BookedAI agent conversation, and moves primary mode switching into a bottom bar with `Chat` and `Booking`
- booking content on compact product mobile is now hidden by default while the user is in chat, then reopened through the bottom navigation as a secondary sheet that still preserves the same BookedAI flow across shortlist, options, details, and confirmation
- the booking sheet and related modules have been compressed for phone widths so tabs stay visible earlier in the viewport and no longer require the user to scroll past a large welcome section before seeing the active booking state
- responsive fixes now explicitly prevent horizontal overflow on tested narrow phone widths, with local and production verification performed on iPhone SE and iPhone 12 class viewports
- the latest live product frontend bundle was promoted on `2026-04-17` and verified on `https://product.bookedai.au`, with the current public response showing `last-modified: Fri, 17 Apr 2026 07:13:39 GMT`
- the public booking assistant popup now also has a dedicated mobile-responsive chat-first mode: the top `Voice / Chat / Booking` strip is reduced to a shorter horizontal slider, auto-hides after the first search while the user stays in chat, and reappears when the user enters booking
- popup mobile now keeps the live search chrome out of the way after the first search, delays booking-panel exposure until the user explicitly selects a result, auto-focuses the booking form after selection, and compresses the selected-result summary into a one-line bottom strip so chat results keep maximum vertical space
- compact search-result cards now place the thumbnail summary on the left side instead of the right for both service matches and event matches, so the eye can scan image -> title -> price/duration/location in a more natural left-to-right rhythm across popup and product surfaces
- the new landing template now gives the BookedAI logo more visual weight and cleaner spacing in the main header and footer, so the brand reads larger, clearer, and more professionally balanced without crowding the navigation or CTA controls
- the public landing rebuild is now also materially aligned to the visual-first design requirement itself: hero, problem, solution, and product-proof sections now communicate primarily through graphics, funnel/status imagery, and infographic-style layout while keeping only concise commercial copy and keyword-level support text
- the latest live popup-mobile frontend bundle was promoted on `2026-04-17` and verified on `https://bookedai.au`, with the current public response showing `last-modified: Fri, 17 Apr 2026 12:49:12 GMT`

## Backend Progress

The backend admin and demo workflow paths have been refactored in layers:

Prompt 5 API v1 groundwork is now present as an additive path:

- `backend/app.py` now mounts additive `/api/v1/*` routes
- `backend/api/v1_routes.py` now exposes the first Prompt 5 route family
- `backend/api/v1/_shared.py` now standardizes success and error envelopes for new v1 routes
- `backend/core/contracts/` now carries the shared Prompt 5 contract layer used by the new v1 path
- `frontend/src/shared/contracts/` and `frontend/src/shared/api/v1.ts` now define the typed frontend contract and client side of the same Prompt 5 path
- Prompt 10 lifecycle and CRM foundations now also have additive service seams:
  - `backend/service_layer/lifecycle_ops_service.py`
  - `backend/repositories/crm_repository.py`
  - `backend/repositories/email_repository.py`
- Prompt 10 has now moved one step beyond record-first persistence:
  - lead-triggered CRM sync now flows through lifecycle orchestration helpers instead of route-local insert logic
  - CRM sync records can now move into `manual_review_required` when lead capture lacks an email address
  - lifecycle email persistence now records both delivery-facing state and additive operational review state for later Prompt 11 attention reads
  - SMS and WhatsApp now also have additive provider-aware delivery seams, with manual-review fallback when live messaging credentials are not configured
- Prompt 11 read-side integration seams are now also present:
  - `backend/repositories/integration_repository.py`
  - `backend/service_layer/prompt11_integration_service.py`
  - additive `/api/v1/integrations/providers/status`
  - additive `/api/v1/integrations/attention`
  - additive `/api/v1/integrations/reconciliation/summary`
  - additive `/api/v1/integrations/reconciliation/details`

- admin read flow:
  - route shell in `backend/api/route_handlers.py`
  - orchestration in `backend/service_layer/admin_dashboard_service.py`
  - repository seam in `backend/repositories/conversation_repository.py`
- demo workflow flow:
  - route shell in `backend/api/route_handlers.py`
  - orchestration in `backend/service_layer/demo_workflow_service.py`
  - repository seam in `backend/repositories/conversation_repository.py`

Implemented seam coverage:

- `admin_overview(...)` delegates payload assembly to the service layer
- `admin_bookings(...)` delegates payload assembly to the service layer
- `admin_booking_detail(...)` now flows through the service layer and repository seam
- `admin_booking_confirm_email(...)` now flows through the service layer and repository seam
- `demo_brief(...)` delegates orchestration to the service layer
- `sync_demo_booking_from_brief(...)` now flows through the service layer
- `ConversationRepository` now owns latest-event lookup for demo brief and synced demo booking records
- `booking_assistant_session(...)` can now dual-write normalized `booking_intents` and `payment_intents` behind `new_booking_domain_dual_write`
- callback-driven status updates are now being carried deeper into normalized mirrors so booking/payment/contact/lead state can stay aligned after booking, payment lifecycle, and demo callbacks
- callback and payment status aliases are being normalized more aggressively so callback payload variations still converge on the same mirror fields
- pricing consultation and demo request paths are now part of the same dual-write expansion plan, so the normalized mirror model can cover the main public capture flows in a consistent rollout sequence
- contact and lead persistence foundations are now part of the same dual-write path, so normalized identity and pipeline records can start filling alongside booking/payment mirrors
- lead and contact pipeline states are now treated as normalized lifecycle states, not just identity records, so callback and follow-up transitions can be compared more explicitly across the mirrored read model

Current shape:

- API handlers remain thin wrappers
- orchestration is no longer embedded directly in the route layer
- Prompt 9 matching and booking-trust behavior now runs through a dedicated service-layer helper for v1 instead of staying as inline placeholder route logic
- Prompt 9 booking-path decisions now run through a dedicated escalation-ready policy helper on the same v1 path instead of branching into a separate API style
- Prompt 11 visibility now flows through the same v1 envelope style, so integration provider health and reconciliation attention signals can be surfaced without inventing a separate admin-only contract family
- Prompt 11 now also exposes additive attention buckets and section-level reconciliation detail, so admin can review retryable or manual-review states without turning those reads into operational mutations
- Prompt 11 now also exposes an additive CRM retry backlog read model, so admin can inspect record-level retry truth, latest error context, and rollout-hold posture beyond summary pills alone
- Prompt 10 lifecycle orchestration now has its own backend unit-test seam in `backend/tests/test_lifecycle_ops_service.py`, so CRM sync and lifecycle email status behavior can evolve without hiding logic in route tests alone
- backend route coverage now also includes provider status, reconciliation summary, matching search, booking trust, and booking-path resolution, which makes the current admin-preview and public live-read read surface more release-ready without changing source-of-truth ownership
- repository access is moving toward tenant-aware and query-specific ownership
- admin booking read and confirmation flows now share the same service/repository extraction direction
- admin bookings now have an additive shadow-compare seam against normalized booking/payment mirrors, while legacy reads remain authoritative
- admin shadow diagnostics are already surfaced in the bookings UI as additive compare status, so operators can see shadow health without changing the live read path
- shadow diagnostics UI is now being split further into presentation subcomponents, making the compare surface easier to iterate without touching the orchestration shell
- backend drift diagnostics are now being expanded beyond summary parity into mismatch-type reporting, so operators can distinguish missing mirrors, status drift, amount drift, and other lifecycle inconsistencies more precisely
- backend drift diagnostics are now being expanded further to cover meeting, email, and workflow lifecycle transitions, so the compare surface can detect drift outside the core booking/payment path
- backend drift diagnostics now expose recent drift examples and top drift references, so the operator can inspect representative drift cases instead of only aggregate mismatch counts
- meeting lifecycle drift is now called out as its own comparison slice, and operator drill-in can use recent drift examples to inspect concrete meeting-state cases
- backend drift diagnostics now expose richer example references, so operator review can capture booking reference, lifecycle category, observed value, normalized mirror value, and other case metadata when the backend has enough data to provide it
- the shadow review workflow is now a first-class admin path, with diagnostics, references, and booking detail surfaces supporting case-by-case triage after aggregate compare signals
- the operator flow is now diagnostics -> references/examples -> booking detail triage, so aggregate counts can be converted into concrete follow-up actions without changing the live path
- the operator flow now also supports a lightweight shadow review queue, so prioritized cases can be stepped through in order while the aggregate summary remains authoritative
- booking detail drill-in now includes scroll/focus affordances from diagnostics, so triage can land the operator on the relevant record without changing the live read contract
- the operator flow now also keeps local review memory for queue filters and reviewed markers, so operators can resume triage after refresh without changing the authoritative booking model
- queue triage now includes bulk actions for the visible slice and local sort modes such as pending-first and time-based ordering, so review can move faster without introducing new source-of-truth behavior
- queue triage now also includes pending/reviewed slice stats and a next-case shortcut, so operators can keep momentum while staying inside the additive review surface
- queue triage now also supports optional auto-advance and client-side notes per drift case, so operators can keep sequential review context without changing the authoritative booking model
- dual-write foundations now exist across booking assistant, pricing consultation, and demo request flows, and those writes now extend into normalized contact/lead records as well as booking/payment mirrors
- callback status updates are now expected to land in the same normalized mirror path so read-side validation can compare live and mirrored state with less drift, especially once payment lifecycle callbacks are added
- frontend bookings list extraction is the next visible UI decomposition step after controls extraction, so the remaining list rendering can be isolated from the section shell
- lifecycle-state normalization is now being treated as a first-class backend concern, so booking, payment, contact, and lead states can be compared more explicitly across callback variants and status transitions
- shadow validation is expanding from summary parity checks into deeper lifecycle-state comparison, giving operators a clearer signal when mirrored state diverges from legacy flow state
- shadow validation is now being extended into meeting/email/workflow lifecycle comparisons as well, so rollout validation reflects the broader operational journey instead of only the capture step
- meeting lifecycle drift is now treated as its own classification slice inside shadow validation, so compare output can distinguish meeting-state drift from broader workflow/email/payment differences
- recent drift examples and top drift references are now part of the rollout UX, so the admin compare surface can progress from summary health to operator-friendly case review without changing the live path

## Verification

Latest verification status:

- `npm run build` in `frontend/` passed
- `python3 -m py_compile` on the touched backend files passed
- `python3 -m py_compile backend/tests/test_api_v1_routes.py` passed
- backend Prompt 5 contract tests now exist in `backend/tests/test_api_v1_routes.py`
- a local backend virtualenv now exists at `.venv-backend` with `backend/requirements.txt` installed for Prompt 5 verification
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` now passes
- `npm run build` still passes after the public booking assistant Prompt 5 shadow adapter and the Prompt 9 search or trust behavior update
- `npm run build` still passes after adding the admin Prompt 5 preview surface
- targeted Playwright admin regression fixes now cover session-expiry fixture drift, Prompt 5 preview CRM backlog stubs, and preview-server mode isolation for legacy versus live-read lanes
- `npm run test:playwright:legacy` passes against the representative legacy release slice
- `npm run test:playwright:live-read` passes against the representative live-read release slice after replacing expired hard-coded Sydney booking slots with future-safe test inputs
- `PLAYWRIGHT_SKIP_BUILD=1 npm run test:playwright:admin-smoke` passes against the representative admin release slice
- `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck` now produces `/home/dovanlong/BookedAI/artifacts/release-rehearsal/release-rehearsal-20260416T141613Z.md` with decision `promote_ready`
- backend Prompt 10 lifecycle changes still preserve the current Prompt 5 contract suite, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` remaining green after CRM sync seeding and lifecycle email persistence moved behind service or repository seams
- backend Prompt 11 integration status and reconciliation summary additions still preserve the current Prompt 5 contract suite, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` remaining green
- Phase 2 repository foundations now pass `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_feature_flag_repository backend.tests.test_phase2_repositories`, locking tenant-aware audit/outbox/webhook/idempotency behavior behind focused unit coverage
- route-level Phase 2 adoption now also passes `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_phase2_repositories backend.tests.test_api_v1_routes backend.tests.test_whatsapp_webhook_routes`, covering v1 write-side audit/outbox hooks and WhatsApp inbound duplicate suppression
- outbox worker foundations now also pass `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_outbox_worker backend.tests.test_phase2_repositories backend.tests.test_api_v1_routes backend.tests.test_whatsapp_webhook_routes`, covering the basic dispatch loop alongside route-side Phase 2 adoption
- Phase 2 runtime-activity and tracked-job additions now also pass `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_job_scheduler backend.tests.test_outbox_worker backend.tests.test_phase2_repositories backend.tests.test_api_v1_routes backend.tests.test_whatsapp_webhook_routes`, covering `job_runs`, the new `/api/v1/integrations/runtime-activity` envelope, and the admin reliability feed wiring on top of the earlier repository and route foundations
- `npm run build` in `frontend/` passes after extending the admin Prompt 5 preview with runtime activity cards for `job_runs`, `outbox_events`, and `webhook_events`
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_outbox_worker backend.tests.test_job_scheduler` passes after wiring the tracked outbox dispatch wrapper, confirming the first live worker path now records through the tracked-job seam
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_outbox_worker backend.tests.test_job_scheduler` passes after adding the additive admin outbox-dispatch route and response envelope
- `npm run build` in `frontend/` still passes after wiring the Prompt 5 reliability panel with the new tracked outbox dispatch action
- `npx tsc --noEmit` and `npm run build` in `frontend/` still pass after adding the post-dispatch runtime-activity refresh loop inside Prompt 5 preview
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_outbox_worker backend.tests.test_api_v1_routes` passes after replacing the outbox dispatch no-op with an additive audit-backed dispatcher
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` passes after adding the additive dispatched-audit drill-in endpoint and envelope
- `npm run build` in `frontend/` passes after extending the Prompt 5 reliability panel with the outbox dispatch audit trail cards
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_phase2_repositories backend.tests.test_api_v1_routes` passes after adding the single-event outbox replay seam and route coverage
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_outbox_worker backend.tests.test_phase2_repositories backend.tests.test_api_v1_routes` passes after adding outbox failure-context tracking and backlog read-model coverage
- `npx tsc --noEmit` and `npm run build` in `frontend/` pass after extending Prompt 5 reliability with the outbox backlog card, last-error visibility, and retry-depth surfacing

## Phase 2 Agent Lanes

- `Persistence Foundation Agent`
  - owns tenant-aware repositories, migration alignment, and constructor/transaction consistency across audit, webhook, outbox, idempotency, and job-run seams
- `Runtime Adoption Agent`
  - owns additive write-path wiring in `backend/api/v1_routes.py` and webhook ingestion wiring in `backend/api/route_handlers.py`, with the rule that public contracts remain unchanged
- `Worker Execution Agent`
  - owns outbox dispatch, tracked job execution, scheduler hooks, and status transitions inside `backend/workers/`
- `Reliability Read-Model Agent`
  - owns `backend/repositories/integration_repository.py` and `backend/service_layer/prompt11_integration_service.py` so operator-facing reliability truth comes from one read-model lane instead of scattered ad-hoc queries
- `Admin Reliability Agent`
  - owns `frontend/src/features/admin/prompt5-preview-section.tsx` and adapter wiring so new Phase 2 runtime truth lands inside the existing reliability workspace without reopening the broader admin shell
- `Verification Agent`
  - owns focused unittest coverage for repositories, workers, v1 envelopes, webhook dedupe, and frontend build stability before any broader rollout claim is made
- `npm run build` still passes after expanding the admin Prompt 5 preview surface to include booking-path resolution, lifecycle preview writes, and Prompt 11 integration or reconciliation visibility
- search-quality rollout docs are now aligned across `implementation-progress`, `implementation-phase-roadmap`, `mvp-sprint-execution-plan`, `phase-2-6-detailed-implementation-package`, `target-platform-architecture`, and `next-wave-prompt-10-11-live-adoption-plan`, so Phase 2 implementation truth is captured in both progress logs and the higher-level program timeline
- Prompt 9 booking-path policy updates still preserve the current Prompt 5 contract suite, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` remaining green after moving booking-path decisions behind the dedicated service helper
- admin Prompt 5 preview now surfaces lifecycle preview IDs, provider status, and reconciliation summary from additive v1 calls while `npm run build` remains green
- Prompt 10 lifecycle orchestration baseline now preserves both the v1 contract suite and the new service-layer unit tests, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service` passing after adding CRM manual-review transitions and lifecycle email review-state recording
- additive communication delivery now preserves the same backend verification lane, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service` covering the new `/api/v1/sms/messages/send` and `/api/v1/whatsapp/messages/send` route seams
- inbound WhatsApp webhook coverage now also preserves the same additive backend lane, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service backend.tests.test_whatsapp_webhook_routes` passing after adding Meta verification and inbound Twilio or Meta payload capture into `conversation_events`
- `npm run build` still passes after reshaping the admin `recent-events` panel into a clearer communication-history view for WhatsApp and SMS activity
- latest search-quality product pass now preserves Prompt 9 matching and v1 route behavior with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_prompt9_matching_service backend.tests.test_api_v1_routes` passing after phrase-level intent aliases, implicit query parsing, and suburb-to-metro normalization were added
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_prompt9_matching_service backend.tests.test_prompt9_semantic_search_service backend.tests.test_search_eval_pack` now passes on `2026-04-17`, confirming the current matching, semantic rerank, and fixed-query eval pack are green together
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` now also passes on `2026-04-17` after hardening `/api/v1/matching/search` against partial semantic-outcome objects, removing a fragile metadata assumption in the route layer
- catalog quality enrichment now preserves the import-quality gate with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_catalog_quality_service` passing after metro location tags were added to normalized catalog tags
- metro location coverage now also maps `Fortitude Valley` and `James Street` into `brisbane`, so suburb-level salon or event catalog rows do not miss city-level retrieval and rerank signals
- the backfill utility now returns a structured error payload when the configured database is unreachable, so catalog remediation runs fail more cleanly in partial local environments instead of dumping a raw stack trace
- the seed catalog audit harness now runs offline through the same quality gate as import and backfill flows, so metro coverage regressions can be caught even when a live database is not reachable from the current environment
- runtime backfill has now been executed inside `bookedai-backend-1` against the live `service_merchant_profiles` database, confirming `32` rows total with `26` active and `6` inactive rows after the quality pass
- the runtime backfill pass confirmed the only remaining warnings are `6` already-inactive NOVO PRINT rows with `missing_location`, so no new downgrade was required during this apply window
- post-deploy live verification now shows `skin care Sydney under 150` returning only the top 3 skincare or facial candidates, `signage Sydney` returning no candidates, and `haircut Fortitude Valley` correctly ranking the James Street result first
- a trusted remediation script now exists at `scripts/remediate_known_service_locations.py`, and the NOVO PRINT signage rows have been updated from the official site contact location to `Castle Hill, Sydney NSW, Australia`
- after the NOVO PRINT remediation, the runtime catalog now has `32` active rows and `0` inactive rows, with signage rows carrying `sydney` metro tags and returning as search-ready again
- signage query ranking has now been tightened after the remediation, so `signage Sydney` and `a-frame signage Sydney` rank direct signage products such as `Snap A Frame` and `Signflute Insertable A Frame` ahead of generic print-stock records
- partner-sourced matching data is now being synchronized across backend and frontend contracts, with `/api/v1/matching/search` returning additive partner metadata such as category, summary, venue, location, booking URL, source URL, image URL, amount, duration, tags, and featured state per candidate
- the frontend v1 client now normalizes matching candidates into a single camel-case shape before the public assistant and admin preview consume them, so live-read no longer depends on raw snake-case transport fields or a thin ID-only shortlist
- public assistant live-read now maps v1 matching candidates directly into booking-ready shortlist cards when partner metadata is available, instead of relying only on local catalog lookup to fill booking URLs, locations, or service details
- a shared frontend presenter now exists for partner match cards, so public assistant and admin Prompt 5 preview use the same rules for location label, next step label, confidence notes, and booking-ready card metadata

## Search Quality Roles

- `PM Integrator`
  - sequence the sprint, keep roadmap and progress aligned, and hold acceptance on no-wrong-topic output
- `Search Query Agent`
  - improve free-form query understanding, intent alias expansion, budget parsing, location parsing, and location normalization
- `Catalog Quality Agent`
  - improve `service_merchant_profiles` quality, taxonomy cleanliness, and operator remediation flow
- `Semantic Ranking Agent`
  - keep semantic rerank useful but fail-safe, with OpenAI fallback and trust-first ordering
- `Eval and QA Agent`
  - expand fixed-query eval coverage and keep admin/live-read smoke stable
- `Conversation UX Agent`
  - keep chat shortlist compact, decision-ready, and aligned with the stricter backend ranking output
- Prompt 11 attention and reconciliation detail additions still preserve the v1 contract suite, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service` passing after adding `/api/v1/integrations/attention` and `/api/v1/integrations/reconciliation/details`
- `npm run build` still passes after extending the admin Prompt 5 preview surface to include Prompt 11 attention cards and reconciliation detail sections
- selective live-read adoption for the public assistant now preserves both the frontend build and backend contract suite, with `npm run build` green after adding `VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ` and `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service` still passing while legacy writes remain authoritative
- Prompt 8 panel-level deep-link implementation now preserves the frontend build and admin smoke suite, with `npx playwright test tests/admin-prompt5-preview.spec.ts --project=legacy` green after adding `#workspace:panel` navigation, panel quick links, and additive panel anchors inside the split admin runtime
- Prompt 11 triage snapshot now preserves both the backend contract suite and admin smoke coverage, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` and `npx playwright test tests/admin-prompt5-preview.spec.ts --project=legacy` covering the new read-only reliability board
- reliability workspace extraction and admin route-level lazy loading now preserve the frontend build and admin smoke suite, while build output is chunked across runtime and workspace boundaries instead of keeping the admin entry path monolithic
- the catalog workspace now consumes the search-quality diagnostics lane directly, so operator cleanup and customer-facing search quality are connected inside the same admin runtime instead of living only in backend endpoints
- roadmap overview and detail-route split now preserve the frontend build, with `/roadmap/phase/<slug>` and `/roadmap/sprint/<slug>` giving shareable deep-dive pages alongside the compact overview
- frontend build remains green after adding roadmap-linked sprint document references and the admin Prompt 11 CRM retry backlog drill-in
- release rehearsal now gets through representative legacy smoke and admin-smoke, but still holds on the live-read representative smoke when run inside the full chained gate, so Sprint 10 release-baseline hardening remains in progress rather than promote-ready

## Release Readiness

Current release-readiness snapshot:

- `public_booking_assistant_v1_live_read` is now documented as a visible read-path flag only; session completion, booking intent, and payment writes remain legacy-authoritative
- `prompt11_integration_attention_v1` is now documented as read-only and advisory; it must not trigger retries or mutations
- admin Prompt 5 preview now exposes rollout-mode context for public assistant shadow priming, live-read selection, and the legacy-write boundary
- backend route coverage now extends to provider status, reconciliation summary, matching search, booking trust, and booking-path resolution in addition to the earlier Prompt 10 and Prompt 11 seams
- browser-level smoke coverage now exists through `frontend/tests/public-booking-assistant-live-read.spec.ts` and `frontend/tests/admin-prompt5-preview.spec.ts`, covering `flag-off` legacy fallback, `flag-on` live-read guidance, the legacy-authoritative booking submit path, and additive admin preview visibility
- `npm run test:playwright:smoke` is now green for the current Prompt 5 rollout slice, so the minimum browser release checklist covers public legacy mode, public live-read mode, and admin preview mode
- admin booking operations now also have browser smoke coverage for list-to-detail review, Stripe checkout link visibility, event timeline rendering, and manual confirmation follow-up from the selected booking panel
- public assistant payment and confirmation success states now also have browser smoke coverage for the Stripe-ready card, calendar-event CTA, email-sent state, and post-payment homepage success banner
- pricing and demo public flows now also have browser smoke coverage for package booking success, post-payment pricing banner state, demo brief capture, Zoho booking sync linkage, and inline demo calendar readiness
- admin bookings regression coverage now also includes search, payment/email/workflow filters, date slicing, and selected-booking refresh after dashboard refetch
- pricing cancelled-state and retry messaging now also have browser smoke coverage through the public banner path
- demo sync pending-state now also has browser smoke coverage so operators can see the waiting state before Zoho booking linkage completes
- admin session regression coverage now also includes refresh behavior, persisted session-expiry visibility, logout return-to-sign-in flow, and local-storage session clearing
- demo sync coverage now also includes prolonged-wait guidance and explicit fallback messaging when Zoho sync stays pending or errors after the brief is saved
- admin auth coverage now also includes forced session-expiry handling, automatic return to sign-in, and immediate re-auth recovery from an expired server-side session
- admin auth coverage now also includes protected-action mutation expiry recovery for `Send confirmation email`, so mutation failure can force re-auth without leaving the operator in a stale dashboard state
- admin auth coverage now also includes protected-action mutation expiry recovery for partner create/save, so a second representative admin mutation is covered before widening the re-auth lane further
- Prompt 10 planning has now started moving into additive CRM retry truth, with a v1 retry lane and lifecycle service coverage ready for `retrying` state verification
- frontend release verification now has a single `npm run test:release-gate` command that packages build plus Playwright smoke for local release checks
- Prompt 10 CRM retry ledger now has an additive v1 retry route and lifecycle service coverage for `retrying`, giving Prompt 11 a real write-side retry state to observe later
- Playwright admin regression now covers protected-action re-auth on `Send confirmation email`, so mutation expiry is tested separately from dashboard-load expiry
- admin Prompt 5 preview now calls out queued CRM retries as their own operator-visible lane, so `retrying` is no longer visually buried inside generic Prompt 11 attention and reconciliation output
- admin Prompt 5 preview now also supports an additive CRM retry queue action against a known record ID, so operators can test retry-path wiring from the same preview surface without widening live admin flows
- admin Prompt 5 preview now also includes a small retry drill-in block, so queued retry load, manual-review backlog, failed records, and latest retry signal can be read in one place
- admin Prompt 5 preview now also includes retry-state summary pills for `Retry attention`, `Manual review`, and `Needs operator action`, so operators can scan CRM retry posture faster before reading the full detail block
- Prompt 8 has now moved beyond section extraction into a true admin workspace split, so operations, catalog, and reliability views can be opened independently instead of forcing one long dashboard surface
- frontend runtime now treats `admin.bookedai.au` as an explicit first-class host for `/api` resolution, which removes ambiguity when the admin app is served on its dedicated subdomain
- Prompt 8 now also includes issue-first workspace insight cards and hash deep-link support, so `admin.bookedai.au#reliability` can open directly into the reliability triage surface with summary context already visible
- Prompt 8 now also goes one layer deeper toward panel-level entry, so operators can land directly on additive panels such as `#reliability:prompt5-preview` or `#catalog:partners` without introducing a heavyweight router rewrite
- Prompt 11 now also exposes an additive triage snapshot read model, so admin can separate immediate operator action, monitor-only retry posture, and source-level reliability slices without stitching raw attention rows by hand
- reliability insights now also include issue-first drill-down launchers for operator action, config risk, and contract review, so operators can jump into the correct reliability panel from the triage frame instead of scanning the whole workspace
- reliability workspace now also has an active drill-down section tied to the current panel, so operator action, config risk, and contract review each get their own focused checklist and next action instead of sharing one generic reliability shell
- Prompt 5 preview inside reliability is now lazy-loaded separately from the rest of the reliability workspace, so the heaviest operator-action panel no longer has to ship with config and contract review by default
- config-risk and contract-review now each load through their own lazy drill-down modules inside the reliability workspace, so `admin.bookedai.au` can deep-link into narrower operator lanes without paying for the whole reliability stack
- the new config-risk and contract-review modules now include operator notes plus export-ready cues, so rollout follow-up can be handed off without inventing backend workflow state
- direct hash-entry into the narrower reliability lanes now also re-focuses the active panel container, so lazy modules like `#reliability:live-configuration` and `#reliability:api-inventory` behave more like stable operator views than passive scroll targets
- reliability panel controls now expose explicit active state alongside focused panel shells, so browser coverage can verify the current lane without relying on scroll position or duplicated copy
- reliability drill-down now supports local operator-note capture plus export-ready packaging, so admins can hand off config-risk or contract-review findings without widening backend workflow state
- note persistence now stays scoped to the current reliability lane, which keeps operator follow-up additive and makes export packaging more useful during repeated triage passes
- reliability handoff packaging now also loads as its own lazy module, so the main drill-down checklist and navigation do not pay for the local note/export tools before operators need them
- reliability handoff packaging now supports richer local export formats for Slack, ticket, and incident follow-up, so operators can choose a handoff shape without adding backend workflow state
- the `build + preview` release harness now uses a longer startup timeout and a single release-gate command, which keeps the new local release check stable across legacy, live-read, and admin suites
- phase 2 matching search now uses broader term-based catalog retrieval plus Prompt 9 reranking signals for exact phrase, location, tags, requested service, direct booking path, and budget fit, so candidate discovery is less dependent on a single full-query `ILIKE`
- `/api/v1/matching/search` now returns additive ranking metadata including `match_score`, `trust_signal`, `is_preferred`, confidence evidence, and `search_strategy`, so selective live-read and admin diagnostics can reason about candidate quality more explicitly
- backend regression coverage now includes dedicated Prompt 9 matching unit tests for location or budget fit and requested-service preference, alongside route coverage for additive scored-candidate response metadata
- pricing consultation now routes through `frontend/src/shared/api/pricing.ts` and `frontend/src/shared/contracts/pricing.ts`, so the legacy commercial flow shares one typed client path instead of keeping request and response shapes inside `PricingSection.tsx`
- admin Prompt 5 preview now routes through `frontend/src/features/admin/prompt5-support-adapter.ts`, so support and triage actions are isolated from the component shell while legacy admin reads remain on `frontend/src/features/admin/api.ts`
- targeted frontend verification is green for `tests/pricing-demo-flows.spec.ts` and the admin Prompt 5 preview and drill-down slices touched in this wave, while the broader admin Playwright suite still shows a later-stage preview-server refusal that needs a separate stability pass before claiming full-suite green
- the standalone roadmap page now groups agent lanes as outer execution clusters and phase work as selectable time-sequenced cards with expandable registers, so `/roadmap` reads like an operating timeline instead of one long board dump
- the standalone roadmap page now also carries a dedicated sprint sequence rail with per-sprint outcome, repo evidence, main gap, next prompt, and named agents, so execution can be read at `phase -> sprint -> agent` depth without expanding the entire roadmap at once
- the roadmap page now also supports roadmap-specific hash state for selected phase and sprint, and includes a mini-Gantt strip across milestones `M0` to `M4`, so shared links can land closer to the active execution lane instead of only jumping to a broad section anchor
- Prompt 9 matching now also has an additive semantic model-assist seam with config-backed provider routing, optional Gemini Maps grounding support, and a DB flag gate `semantic_matching_model_assist_v1`, so semantic rerank can be deployed behind immediate fail-open fallback to the heuristic path
- `/api/v1/matching/search` now surfaces additive semantic assist metadata including `semantic_score` per candidate plus response-level `semantic_assist` provider or evidence summary, so live-read rollout and admin diagnostics can distinguish heuristic-only ranking from model-assisted ranking
- backend verification now also covers semantic rerank merge behavior and route-level semantic assist metadata, so Prompt 9 search quality work can expand without coupling semantic failures to the authoritative booking-trust path
- Prompt 9 search quality now also includes a strict relevance gate after heuristic plus semantic ranking, so location, budget, or featured boosts can no longer surface obviously wrong-domain candidates as top matches when the catalog lacks true intent alignment
- the current bookedai runtime database now includes migration `001_platform_safety_and_tenant_anchor.sql`, and `semantic_matching_model_assist_v1` is enabled for `default-production-tenant`, so production and beta backends can exercise the semantic rerank lane against real runtime flags instead of test-only toggles
- production runtime smoke now confirms Gemini-backed semantic assist is active on `/api/v1/matching/search`, while the quality gate correctly returns zero candidates with a relevant warning when the live catalog does not contain a strong match rather than recommending a wrong-domain service
- beta runtime now also has Gemini semantic search config loaded, and provider transient failures still fail open to the heuristic path; semantic adapter retry support has been added for transient `429` and `5xx` responses plus read timeouts to improve rollout resilience
- semantic provider routing now explicitly falls back from Gemini or other primary semantic providers to OpenAI when the primary lane errors, so model-assist availability is more resilient without changing the trust-first search contract
- default seed catalog quality has been upgraded with Sydney `Spa` and `Facial` services, so `service_merchant_profiles` now contains direct beauty or spa candidates for the semantic and heuristic search stack instead of relying on unrelated location-only matches
- tenant-aware feature flag reads and writes now accept both tenant UUIDs and tenant slugs, so runtime routes using `default-production-tenant` can actually activate `semantic_matching_model_assist_v1` instead of silently falling back to heuristic-only ranking
- public assistant starter prompts and backend fallback examples now bias toward concrete, topic-specific requests that exist in the live catalog, so users are less likely to trigger vague cross-topic searches from the first interaction
- Prompt 9 matching now also expands controlled topic synonyms for high-volume intents such as facial or skincare, membership renewal, housing or property consultation, team dinner, and signage or expo printing, so search is less brittle to wording changes without reopening cross-topic noise
- Prompt 9 query understanding now also infers location and budget directly from natural search text when the client payload omits them, so requests like `skin care Sydney under 150` and `team dinner Melbourne below 90` can still rank and filter against the correct intent constraints
- Prompt 9 location normalization now also expands suburb-to-metro signals for key cities, so requests like `facial Paddington under 150` can still land on the correct Sydney shortlist even when catalog rows are stored at CBD or city level instead of the exact suburb phrasing
- Catalog quality hardening now also enriches `service_merchant_profiles` with derived metro location tags such as `sydney`, `melbourne`, and `brisbane`, so retrieval and rerank have cleaner city-level signals even when source rows are stored at suburb or precinct granularity
- the metro enrichment pass now covers Brisbane precinct wording such as `Fortitude Valley` and `James Street`, closing a remaining gap in the default seed catalog for city-level salon discovery
- Prompt 9 relevance gating now treats explicit user location as a hard filter for returned search results, so the live response no longer keeps out-of-location records just because they are topically similar
- `Sprint S3` search quality hardening has started with a catalog quality gate for `service_merchant_profiles`, so records missing category, location, price, or usable topic tags are automatically kept out of live search until an operator fixes them
- `Sprint S3` has now also been applied against the reachable runtime database, so the production catalog is no longer relying only on import-time guards or offline audit assumptions for search readiness
- `Sprint S3` now also includes trusted-source remediation for known catalog partners, so rows with missing fields can be restored safely when the operator has source-backed location evidence instead of leaving those services permanently out of search
- `Sprint S4` now also includes post-remediation query tuning for signage intent, so broad category requests do not let generic print-stock items outrank direct signage products in the top shortlist
- `Sprint S4` now also includes frontend/backend contract sync for partner-sourced matching records, so public chat and admin preview are reading the same candidate structure and metadata semantics instead of reconstructing them differently on each surface
- `Sprint S4` now also includes a shared frontend partner-match presenter, so UI-facing shortlist semantics are being consolidated after the transport contract sync instead of drifting across public and admin surfaces
- the roadmap page now groups active specialist agents by delivery role cluster and renders them in denser cards, so the execution roster remains visible without stretching too far below the first viewport
- release verification now also has a root-level `./scripts/run_release_gate.sh` command, which runs the frontend release gate plus backend v1 and lifecycle tests in one promote-or-hold sequence
- release verification now also has an explicit promote, hold, and rollback checklist in `docs/development/release-gate-checklist.md`, so the gate is no longer only a command contract
- release verification now also has `./scripts/run_release_rehearsal.sh`, which turns the root gate into a timestamped rehearsal report with explicit `promote_ready` or `hold` output
- release verification now separates `admin-smoke` from the broader `@admin` suite, so promote-or-hold checks stay representative without pulling the whole admin regression surface into every gate run
- the release-gate baseline is now complete enough to treat `Member I` as closed, because the root script plus checklist have already passed together as the current promote-or-hold contract
- the earlier Prompt 8 next-wave items for reliability module extraction and admin bundle-size reduction have now moved into execution, with a dedicated reliability workspace module and route-level lazy loading in place before the next optimization pass
- residual risk has narrowed to broader browser regression coverage beyond this targeted rollout slice, not the absence of a frontend harness
- `admin bookings` shadow status is now exposed via additive response headers, not payload breakage
- frontend admin shadow diagnostics UI is in place, including shadow status and compare-oriented messaging in the bookings section
- frontend admin mismatch diagnostics are now visible as a breakdown of lifecycle drift categories, not only a single shadow health badge
- frontend admin mismatch diagnostics now include an operator-facing legend so the categories and their rollout meaning are visible without leaving the bookings surface
- bookings controls extraction is complete for the main admin surface, so the page now behaves more like a composition shell than a monolith
- bookings list rendering and summary/header rendering are now both moving into feature-local subcomponents, keeping the section shell focused on composition
- bookings table decomposition has advanced beyond the list wrapper into row-level and table-level separation, making it easier to evolve table behavior without touching the page shell
- bookings table decomposition is now moving into header/chrome separation as the next UI slice, so table presentation can change without disturbing row rendering
- shadow diagnostics decomposition is following the same pattern, so compare state, metrics, and badge presentation can be evolved independently
- backend drift diagnostics now report mismatch categories instead of only aggregate parity, which makes lifecycle-state drift easier to inspect during rollout
- backend drift diagnostics now also classify meeting/email/workflow lifecycle drift, not just booking/payment drift, which makes rollout validation more representative of the full operational path
- backend drift diagnostics now expose broader lifecycle categories in a way that can be surfaced directly in the admin compare UI, so operator review can stay in one place
- backend lifecycle normalization now includes lead/contact pipeline states in addition to booking/payment mirrors, so rollout validation can track the full capture path rather than only the booking record
- backend lifecycle normalization is now being treated as a multi-surface concern spanning booking, payment, meeting, email, and workflow transitions, so operator validation can follow the full customer journey rather than only the initial capture step
- backend shadow diagnostics now emit record-level recent drift examples and operator drill-in affordances as additive review data, while the aggregate shadow summary remains authoritative for comparison
- backend shadow diagnostics now also support a lightweight review queue and detail drill-in flow, while the aggregate shadow summary remains authoritative for comparison
- frontend diagnostics breakdowns now reflect the expanded lifecycle categories, not just a single shadow health badge, so the admin surface mirrors the backend drift taxonomy
- frontend diagnostics now support richer example-driven review, so the operator can inspect concrete drift records in addition to aggregate counts and category buckets
- the rollout review path now looks like a shadow review workflow, where aggregate compare, diagnostic references/examples, and booking detail inspection are used together for operator triage
- the rollout review path now also includes queue-based triage and diagnostics-driven scroll/focus handoff into booking detail, so operators can review cases in sequence without changing the live path
- the rollout review path now preserves queue state locally, so operators can keep category context and reviewed markers across refreshes without turning review memory into backend source-of-truth data
- the rollout review path now also supports bulk queue actions and persisted sort modes, so operators can review visible slices quickly while all queue behavior remains advisory and client-side
- the rollout review path now also exposes quick queue stats and next-case navigation, so operators can step through pending slices more efficiently without introducing new backend semantics
- the rollout review path now also includes optional auto-advance and client-side operator notes, so sequential review can be faster and better documented while remaining fully advisory
- `scripts/deploy_beta.sh` now exists as the default staging rollout command, so beta rebuild and redeploy work can happen on `beta.bookedai.au` without invoking the full production promotion flow

## Plan Alignment

This progress matches the current plan direction:

- continue frontend admin modularization until `AdminPage.tsx` is only a composition shell
- continue backend extraction from route handlers into service and repository seams
- keep documentation synchronized with each meaningful structural change
- use the next wave plan to sequence Prompt 10 write-side lifecycle truth before Prompt 11 operator attention read models
- move public assistant adoption from shadow to selective live read behavior only behind a dedicated rollout flag and immediate fallback path
- use the next sprint plan to sequence protected-action re-auth, CRM retry truth, and release-gate standardization before broader retry/reconciliation UI work

## Next Sprint Plan

The next execution-ready sprint is now defined in:

- [Next Sprint Protected Reauth Retry Gate Plan](./next-sprint-protected-reauth-retry-gate-plan.md)

Planned workstream order:

1. protected-action re-auth on admin mutation failure
2. Prompt 10 CRM retry ledger for additive retrying state
3. CI-ready release gate packaging for build, smoke, and backend lifecycle tests
4. operator-visible Prompt 11 surfacing for queued CRM `retrying` state
5. grouped roadmap presentation for active specialist agents by role cluster
6. additive CRM retry preview control in the admin Prompt 5 or Prompt 11 surface
7. root-level release gate script for promote-or-hold verification
8. retry-state summary pills and operator decision cues inside the admin preview
9. close release-gate baseline after script and checklist both pass in one run
10. Prompt 8 deeper admin workspace split across operations, catalog, and reliability views
11. search reliability sprint S1: tighten topic-safe retrieval and starter prompt specificity
12. search reliability sprint S2: add taxonomy and synonym normalization for high-volume service intents
13. search reliability sprint S3: improve `service_merchant_profiles` import validation and category coverage
14. search reliability sprint S4: add fixed-query evaluation coverage for in-topic ranking and fallback behavior
11. explicit admin.bookedai.au runtime linkage for frontend API base resolution
12. issue-first workspace insight cards and deep-linkable workspace entry on the admin runtime
13. panel-level deep-link behavior so admin.bookedai.au can open directly into reliability triage panels

## Active Agent Roster

Current execution has also been running through a specialist multi-agent pattern under PM integration.

### Coordination and release

- `PM Integrator`
  - role: coordinates sprint slicing, integrates outputs, resolves cross-module conflicts, and keeps roadmap or progress artifacts synchronized with implementation reality
  - status: `In Progress`
- `Member D`
  - role: release-readiness wording, rollout contract alignment, and smoke-test planning
  - status: `Completed`
- `Member D1`
  - role: release-readiness documentation and rollout contract wording
  - status: `Completed`
- `Member I`
  - role: CI-ready release gate planning lane for build, smoke, and backend verification standardization
  - status: `Completed`
- `Member I2`
  - role: root-level release gate script and command-order standardization for frontend plus backend verification
  - status: `Completed`
- `Member I3`
  - role: promote-or-hold checklist framing around the release gate script and rollback boundaries
  - status: `Completed`

### Backend and integration lanes

- `Worker A`
  - role: backend Prompt 5 contract foundations and additive API groundwork
  - status: `Completed`
- `Worker B`
  - role: backend v1 route implementation lane for Prompt 5, later absorbed into main integration lane when direct patch delivery was incomplete
  - status: `Completed`
- `Member A`
  - role: Prompt 10 lifecycle orchestration and write-side CRM or email baseline
  - status: `Completed`
- `Member B`
  - role: Prompt 11 attention queue and reconciliation read models
  - status: `Completed`
- `Member H`
  - role: Prompt 10 CRM retry ledger lane with first admin-visible Prompt 11 surfacing for queued `retrying` state
  - status: `In Progress`
- `Member H2`
  - role: additive admin preview control for queueing CRM retry work against a known record ID
  - status: `Completed`
- `Member H3`
  - role: operator retry drill-in card for queued counts, latest signal, and backlog interpretation in admin preview
  - status: `Completed`
- `Member H4`
  - role: retry-state summary pills and quick operator cues inside the admin preview
  - status: `Completed`
- `Member J`
  - role: Prompt 8 workspace split for operations, catalog, and reliability inside the admin surface
  - status: `Completed`
- `Member J2`
  - role: admin runtime linkage so `admin.bookedai.au` uses explicit frontend API base behavior
  - status: `Completed`
- `Member K`
  - role: reliability workspace triage summary using existing Prompt 5, Prompt 11, config, and route signals
  - status: `Completed`
- `Member L`
  - role: Prompt 8 issue-first workspace insights and hash deep-link behavior for the admin runtime
  - status: `Completed`
- `Member M`
  - role: smoke coverage for workspace navigation and direct reliability deep-link entry
  - status: `Completed`
- `Member N`
  - role: reliability panel deep-link framing for prompt preview, config, and route inventory surfaces
  - status: `Completed`
- `Member O`
  - role: issue-first panel deep-links and panel naming for the Prompt 8 admin IA
  - status: `Completed`
- `Member P`
  - role: smoke coverage for panel-level deep-link behavior in admin workspaces
  - status: `Completed`

### Frontend and rollout lanes

- `Worker C`
  - role: frontend shared contracts and typed API v1 client foundations
  - status: `Completed`
- `Member C`
  - role: selective live-read adoption in the public booking assistant with legacy writes preserved
  - status: `Completed`
- `Member D2`
  - role: admin operator strip and rollout-mode visibility design
  - status: `Completed`
- `Member D3`
  - role: smoke coverage gap verification and browser harness recommendations
  - status: `Completed`
- `Member G`
  - role: protected-action re-auth planning lane for admin mutation recovery
  - status: `In Progress`
- `Member G2`
  - role: `Send confirmation email` re-auth recovery coverage as the first protected mutation slice
  - status: `Completed`
- `Member G3`
  - role: second representative protected mutation coverage using partner create/save re-auth
  - status: `Completed`

### QA and reconnaissance

- `Halley`
  - role: admin booking-flow selector audit, drift or triage smoke-test guidance, and the partner-create re-auth slice recommendation
  - status: `Completed`
- `Meitner`
  - role: public booking assistant payment or confirmation selector audit and success-state verification guidance
  - status: `Completed`
- `Locke`
  - role: pricing and demo flow selector audit, route stub planning, and browser-test risk review
  - status: `Completed`
- `Socrates`
  - role: admin search/filter regression planning, query-param audit, and locator hardening guidance
  - status: `Completed`
- `Raman`
  - role: demo sync fallback and prolonged-wait reconnaissance for the next QA hardening sprint
  - status: `Completed`
- `Hegel`
  - role: admin session-expiry and re-auth reconnaissance for the next auth-hardening sprint
  - status: `Completed`
- `Mencius`
  - role: provider-side retry and reconciliation reconnaissance plus the admin preview surfacing recommendation for queued retries
  - status: `Completed`
- `Nash`
  - role: smoke flake reconnaissance for pricing-flow timing inside the release-gate lane
  - status: `Completed`

## Related References

- `2026-04-17`
  - lane: `Brand UI kit starter code`
  - update: generated the first App Router starter files for the BookedAI revenue-engine brand, including root `app/page.tsx`, `app/globals.css`, reusable logo/button/glass-card components, hero/pricing/dashboard sections, and a matching `tailwind.config.ts` that uses the exact dark-mode brand tokens
  - verification: source files created and aligned to the documented brand token system
- `2026-04-18`
  - lane: `Brand UI kit starter code`
  - update: completed the missing Next.js App Router scaffolding by adding root layout, Next package/config files, TS alias config, PostCSS wiring, and the missing trust/final-CTA sections so the BookedAI revenue-engine starter is structurally ready for dependency install and runtime boot
  - verification: `npm install` and `npm run build` at repo root passed after narrowing the Next starter `tsconfig.json` scope to the App Router starter files instead of the whole monorepo
- `2026-04-17`
  - lane: `Sprint 2 brand system foundation`
  - update: added a concrete BookedAI revenue-engine brand UI kit with local SVG logo variants, exact dark-mode brand tokens, Tailwind theme exposure, reusable foundation and CTA components, and a source document structured for direct Next.js App Router adoption
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 2 closeout and rollout baseline`
  - update: completed a formal `sprint-2-closeout-review.md` artifact and implemented additive public CTA attribution across landing CTA opens, pricing consultation submissions, demo brief submissions, backend event metadata, and dual-write mirrors so Sprint 2 is no longer only a planning lock but also a rollout-ready source baseline
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: added shared landing UI primitives in `frontend/src/components/landing/ui/*` and refactored `HeroSection`, `ProblemSection`, `SolutionSection`, and `CallToActionSection` onto reusable `SectionCard`, `SignalPill`, and `FeatureCard` patterns
  - verification: `npm run build` in `frontend/`
- `2026-04-19`
  - lane: `Sprint 14 tenant invite acceptance and catalog gates`
  - update: upgraded the existing tenant claim flow so invited members can accept an invite and set their first password from the tenant portal, while catalog import, edit, publish, and archive actions are now restricted to `tenant_admin` and `operator` roles with matching read-only UX cues for finance-oriented users
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-19`
  - lane: `Sprint 14 tenant access control`
  - update: added a tenant `Team` workspace with team roster, invite flow, and member role or status updates, while backend now enforces role-aware billing permissions so only `tenant_admin` and `finance_manager` can change billing setup or plans and only `tenant_admin` can manage tenant roles
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-19`
  - lane: `Sprint 14 tenant billing seams`
  - update: extended the tenant billing workspace with truthful invoice history derived from subscription periods, payment-method readiness state, billing settings, and a recent audit timeline backed by `audit_logs`, while tenant profile, billing-account, and subscription writes now append explicit tenant audit entries for later support drill-ins
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-19`
  - lane: `Sprint 13 tenant portal self-serve billing`
  - update: extended the tenant billing tab from read-only status into a self-serve workspace with billing account setup, plan cards, and trial or plan-switch actions wired through new tenant billing account and subscription APIs, while keeping onboarding progress refreshed after each billing action
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-19`
  - lane: `Sprint 13 tenant portal foundation`
  - update: added `PATCH /api/v1/tenant/profile` so signed-in tenant operators can save workspace business basics and refresh onboarding state in one flow, and split the tenant portal auth/onboarding surfaces into feature-level modules to keep the portal ready for the next onboarding and billing slices
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: extended the same shared primitives into `ProductProofSection`, `TrustSection`, and the top narrative surfaces of `PricingSection` so the public landing path now shares a more consistent card and signal vocabulary without changing booking-flow logic
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: moved more of the pricing modal and `DemoBookingDialog` surfaces onto shared `SectionCard` and `SignalPill` primitives so the booking and consultation layers now reuse the same card and badge system as the landing path
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: redesigned `HeroSection`, `ProblemSection`, `SolutionSection`, and `ProductProofSection` toward a more professional visual-first landing narrative, where each section now spends most of its surface on graphics, infographic-style status blocks, flow rails, proof cards, and conversion visuals while reserving copy for high-value keywords and decision-critical statements
  - verification: `npm run build` in `frontend/`; deployed `frontend/dist` to `bookedai-web-1` and `bookedai-beta-web-1`; `curl -Ik https://bookedai.au` returned `HTTP/2 200` with `last-modified: Fri, 17 Apr 2026 15:32:37 GMT`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: completed the same visual-first treatment across `PricingSection`, `TrustSection`, and `CallToActionSection`, adding pricing flow graphics, proof-wall trust blocks, FAQ signal boards, and a more graphic-led closing CTA so the whole landing path now follows the same `80%` visual and `20%` high-value copy system instead of mixing redesigned sections with older text-heavier layouts
  - verification: `npm run build` in `frontend/`; deployed refreshed `frontend/dist` to `bookedai-web-1` and `bookedai-beta-web-1`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: polished `PricingPlanCard` and `PartnersSection` so pricing choices now read as compact decision cards with stronger scan cues, while the partner and infrastructure trust wall now uses signal metrics, grouped trust framing, and badge-led logo cards that match the premium visual-first landing system
  - verification: `npm run build` in `frontend/`; deployed refreshed `frontend/dist` to `bookedai-web-1` and `bookedai-beta-web-1`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: upgraded `BookingAssistantSection` to the same premium visual-first system, adding a proof-led intro column, live-flow signal cards, and a stronger framed product shell around the existing chat and booking preview so the interactive demo now reads like core product storytelling instead of a utility-only widget
  - verification: `npm run build` in `frontend/`; deployed refreshed `frontend/dist` to `bookedai-web-1` and `bookedai-beta-web-1`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: extracted the stateful pricing plan card into `frontend/src/components/landing/sections/PricingPlanCard.tsx`, reducing `PricingSection` size and aligning plan-card rendering with the shared landing card and pill system
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: extracted the recommendation block and consultation modal out of `PricingSection` into `PricingRecommendationPanel.tsx` and `PricingConsultationModal.tsx`, leaving the section closer to orchestration-only while preserving the existing package-booking flow behavior
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: centralized pricing types, constants, and pure helpers into `frontend/src/components/landing/sections/pricing-shared.ts`, so the pricing section and its child components now share one source of truth for plan data, recommendations, booking helpers, and consultation-form contracts
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: finished shared-surface cleanup for the remaining landing lanes in `Footer`, `ImplementationSection`, `TeamSection`, and `ProductFlowShowcaseSection`, and upgraded brand presentation so the landing header logo is larger and the hero now includes a dedicated prominent logo banner instead of a barely visible mark
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: restructured the visible landing layout toward a more professional visual-first sales surface by tightening text blocks, shifting the main sections to heavier visualization ratios, upgrading header and footer hierarchy, and making `Hero`, `Problem`, `ProductProof`, `Solution`, and `Trust` read more like infographic boards than long-form copy sections
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: ran screenshot-based desktop and mobile visual QA against the local landing preview, then tightened logo cropping and responsive brand presentation in `Header`, `HeroSection`, `Footer`, and theme sizing so the new mark reads clearly instead of disappearing inside oversized whitespace on smaller screens
  - verification: `npm run build` in `frontend/`; reviewed `frontend/output/playwright/landing-qa/desktop-full.png` and `frontend/output/playwright/landing-qa/mobile-top-v2.png`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: polished the final commercial conversion surfaces by upgrading `PricingRecommendationPanel` into a more visual decision board with recommendation rails and scan-friendly setup cues, and by rebuilding the closing `CallToActionSection` around a stronger visual closeout board so the last two landing sections now match the same visual-first language as the rest of the page
  - verification: `npm run build` in `frontend/`
- `2026-04-17`
  - lane: `Sprint 3 landing rebuild`
  - update: completed beta deploy acceptance for the refreshed landing by confirming `https://beta.bookedai.au` returned `HTTP/2 200`, `/api/health` returned `{"status":"ok","service":"backend"}`, and capturing desktop/mobile screenshots of the live `Pricing` and `CTA` surfaces for visual review
  - verification: reviewed `frontend/output/playwright/landing-qa/beta-pricing-desktop.png`, `frontend/output/playwright/landing-qa/beta-cta-desktop.png`, `frontend/output/playwright/landing-qa/beta-pricing-mobile.png`, and `frontend/output/playwright/landing-qa/beta-cta-mobile.png`
- `2026-04-21`
  - lane: `Sprint 3 landing rebuild`
  - update: re-polished the public homepage shell in `PublicApp.tsx` toward a more professional and more visual executive-sales-deck presentation by strengthening the global background system, upgrading the brand-intro board, adding a new `HomepageExecutiveBoardSection` with workflow and commercial summary rails, and reworking `HeroSection` plus `HomepageOverviewSection` so the top half of the homepage reads more like a serious product-and-operations system instead of a stack of disconnected content blocks
  - verification: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`
- `2026-04-21`
  - lane: `Sprint 3 landing rebuild`
  - update: tightened the top-of-homepage message hierarchy again so the first-minute story now favors enterprise and investor-ready signals over generic feature copy, updating `data.ts`, `HeroSection`, `HomepageBrandStatementSection`, `HomepageExecutiveBoardSection`, `HomepageOverviewSection`, and `TrustSection` to emphasize operating-layer framing, workflow discipline, visibility, and scale posture while filtering out lower-value filler
  - verification: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`
- `2026-04-21`
  - lane: `Sprint 3 landing rebuild`
  - update: extended the same enterprise-first framing into `PricingSection`, `PricingPlanCard`, `PricingRecommendationPanel`, `pricing-shared.ts`, and the homepage pricing or FAQ source copy in `data.ts`, so the commercial section now reads less like retail package marketing and more like a clear operating-model buying story with visible rollout scope, approval logic, and scale posture
  - verification: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`
- `2026-04-21`
  - lane: `Sprint 3 landing rebuild`
  - update: completed the closing enterprise-consistency pass across `PublicApp.tsx`, `TeamSection.tsx`, `CallToActionSection.tsx`, `Footer.tsx`, and supporting homepage source copy so header navigation, leadership framing, closeout CTA language, and footer commercial cues now align with the same enterprise and investor-ready story as the hero, pricing, and trust sections; then redeployed the updated public stack live through `bash scripts/deploy_live_host.sh`
  - verification: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`; `curl -I https://bookedai.au`; `curl -I https://tenant.bookedai.au`; `curl -I https://product.bookedai.au`; `curl -s https://api.bookedai.au/api/health`
- `2026-04-23`
  - lane: `Homepage responsive-first runtime`
  - update: locked the public homepage and frontend messaging to the new runtime decision that BookedAI should sell and ship the responsive web app first, created `docs/architecture/frontend-runtime-decision-record.md`, rewrote the top-of-homepage CTA and strategy framing toward `Open Web App`, and updated `HeroSection`, `HomepageExecutiveBoardSection`, `HomepageOverviewSection`, `Footer`, and `PublicApp.tsx` so `bookedai.au` now clearly presents responsive web as the active product while native mobile is deferred to a later phase
  - verification: `cd frontend && npx vite build`; `cd frontend && PLAYWRIGHT_EXTERNAL_SERVER=1 npx playwright test tests/public-homepage-responsive.spec.ts`; `bash scripts/deploy_live_host.sh`; `curl -I https://bookedai.au`
- `2026-04-23`
  - lane: `Responsive-web-first doc synchronization`
  - update: continued the same upgrade by aligning phase, sprint, and delivery-package docs with the new frontend runtime decision, removing remaining `native mobile immediate phase` ambiguity from active execution artifacts and updating lingering public-surface CTA wording in `ProductProofSection`, `ArchitectureInfographicSection`, `PartnersSection`, `TeamSection`, and `PitchDeckApp` so homepage-adjacent surfaces now consistently point to the live web runtime as `Open Web App`
  - verification: `cd frontend && npx tsc --noEmit`; `cd frontend && npx vite build`
- `2026-04-23`
  - lane: `Responsive-web-first source-of-truth cleanup`
  - update: finished the next documentation pass by aligning `README.md`, `user-surface-saas-upgrade-plan.md`, `public-growth-app-strategy.md`, `implementation-phase-roadmap.md`, and `landing-page-system-requirements.md` to the same responsive-web-first runtime language, so operator guidance, active UX strategy, and requirement-side landing docs now all describe homepage as the acquisition or orientation surface for the current web runtime instead of falling back to older search-first-only or native-immediate interpretations
  - verification: documentation-only sync review against the active architecture and implementation set
- `2026-04-21`
  - lane: `Tenant portal`
  - update: tightened tenant Google-login failure handling so missing Google OAuth env configuration now returns one explicit setup message from backend and frontend prompt handling, instead of surfacing generic `loading` or `failed` copy when `VITE_GOOGLE_CLIENT_ID` or `GOOGLE_OAUTH_CLIENT_ID` is missing
  - verification: `python3 -m py_compile backend/api/v1_routes.py`; `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`
- `2026-04-21`
  - lane: `Tenant portal`
  - update: completed the production env wiring for tenant Google login by teaching `frontend/Dockerfile` to accept `VITE_GOOGLE_CLIENT_ID`, passing `GOOGLE_OAUTH_CLIENT_ID` into `backend` and `beta-backend` through `docker-compose.prod.yml`, and forwarding the frontend build arg from `VITE_GOOGLE_CLIENT_ID` with a fallback to the same backend client ID so tenant Google auth can be enabled from the real BookedAI deploy path instead of only existing in local component code
  - verification: `python3 -m py_compile backend/api/v1_routes.py backend/config.py`; `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`
- `2026-04-21`
  - lane: `Tenant portal`
  - update: configured the shared BookedAI Google OAuth web client `1060951992040-ne31cd37bi707ctg85mcu840ucpa5rqr.apps.googleusercontent.com` into both `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_ID`, then redeployed production so `tenant.bookedai.au` now serves a tenant bundle with the real Google client ID instead of the missing-config fallback
  - verification: `bash scripts/deploy_live_host.sh`; `docker compose -f docker-compose.prod.yml --env-file .env config | rg "GOOGLE_OAUTH_CLIENT_ID|VITE_GOOGLE_CLIENT_ID"`; `curl -I https://tenant.bookedai.au`; `curl -s https://api.bookedai.au/api/health`; `curl -s https://tenant.bookedai.au/assets/TenantApp-Cvw-8WFg.js | grep "1060951992040-ne31cd37bi707ctg85mcu840ucpa5rqr.apps.googleusercontent.com"`
- `2026-04-19`
  - lane: `Tenant portal`
  - update: added tenant invite delivery from the `Team` workspace, generating canonical `tenant.bookedai.au/<slug>` invite links with `Accept invite` query context, sending invite email when SMTP is configured, surfacing manual-link fallback when it is not, and upgrading tenant auth to prefill first-login invite details plus role-aware onboarding cues
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-19`
  - lane: `Tenant portal`
  - update: marked tenant `Integrations` as an explicit read-only monitoring surface by returning access metadata from `/api/v1/tenant/integrations` and reflecting the current role/write posture in the portal UI so permission boundaries stay truthful before integration write actions are introduced
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-19`
  - lane: `Tenant portal`
  - update: upgraded tenant integrations from read-only monitoring to first-write provider posture controls, adding role-gated provider status and sync-mode updates in the tenant portal for `tenant_admin` and `operator`, wiring authenticated integration access reads, and surfacing the new controls directly in the workspace
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-19`
  - lane: `Tenant portal`
  - update: expanded tenant team invite observability with recent invite audit activity in the team workspace so operators can trace invite delivery state, recipient, role, actor, and generated portal links from the same surface used to invite members
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-19`
  - lane: `Tenant portal`
  - update: extended the tenant invite lifecycle with admin-side `resend invite` actions in the team roster, a shared invite delivery helper for first-send and resend flows, and audit capture when an invited member activates the workspace so the tenant portal now records `invited`, `resent`, and `accepted` milestones
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-20`
  - lane: `Tenant portal`
  - update: added first invoice actions to the tenant billing workspace with backend routes for `mark paid` and `receipt` seams, wired download-ready receipt text generation from tenant billing state, and upgraded the billing UI so tenants can mark invoice seams paid and download a receipt file directly from the portal
  - verification: `.venv/bin/pytest backend/tests/test_api_v1_routes.py -q`; `npm --prefix frontend run build`
- `2026-04-21`
  - lane: `Tenant portal`
  - update: linked tenant billing to the real BookedAI Stripe runtime by adding tenant-hosted Stripe Checkout and Billing Portal session routes, persisting Stripe customer/session linkage in tenant settings, surfacing live Stripe payment-method and invoice state in the billing snapshot, and updating the tenant billing UI so package selection redirects into Stripe while Stripe-backed invoices and payment-method management open the hosted Stripe surfaces directly
  - verification: `python3 -m py_compile backend/service_layer/tenant_app_service.py backend/api/v1_tenant_handlers.py backend/api/v1_tenant_routes.py`; `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`
- `2026-04-21`
  - lane: `Prompt 9 search guardrails`
  - update: hardened live-read matching so tenant search stays grounded to tenant-owned, intent-matching results; `online`-tagged services are no longer incorrectly excluded by locality gates; public-web fallback remains internet-grounded and only appears when no strong tenant catalog result survives the guardrails; and homepage live-read now requests GPS just in time instead of eagerly for non-nearby searches, then echoes `Current location` back into the visible search intent summary after permission is granted
  - verification: `.venv-backend/bin/python -m unittest backend.tests.test_prompt9_matching_service backend.tests.test_api_v1_search_routes backend.tests.test_api_v1_search_location_guardrails`; `npm --prefix frontend run test:playwright:live-read`; `PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-location-guardrails.spec.ts` in `frontend/`
- `2026-04-21`
  - lane: `Homepage search shortcuts and restaurant live-read`
  - update: extended the compact homepage shortcut rail with `Haircut` and `Restaurant`, made restaurant discovery web-live-search-only on public surfaces so BookedAI does not mix stored tenant catalog rows into venue search results, and propagated public-web `contact_phone` through backend + frontend so venue records can expose either direct booking links or compact call-to-book actions in the shortlist UI
  - verification: `npm --prefix frontend run build`; `.venv-backend/bin/python -m unittest backend.tests.test_api_v1_search_routes`; `npm --prefix frontend run test:playwright:live-read`; `PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-live-read.spec.ts --grep "in-progress search state"` in `frontend/`
- `2026-04-21`
  - lane: `Live-read booking success handoff`
  - update: restored the rich booking success card for live-read flows when trust/path resolution allows immediate checkout, so the homepage and product assistant now continue to show booking reference, payment CTA, calendar link, and email handoff states after the authoritative `v1 booking intent` write instead of downgrading every live-read submit to the minimal callback-style confirmation payload
  - verification: `npm --prefix frontend run build`; `cd frontend && PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-live-read.spec.ts --grep "booking submit uses v1 booking intent as the authoritative write when live-read is enabled|payment and confirmation success card surfaces stripe, calendar, and email handoff states"`; `cd frontend && PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-location-guardrails.spec.ts`; `.venv-backend/bin/python -m unittest backend.tests.test_lifecycle_ops_service backend.tests.test_api_v1_booking_routes`
- `2026-04-22`
  - lane: `Next.js admin Prisma foundation`
  - update: replaced the provisional admin Prisma schema with a multi-tenant revenue-ops baseline covering `tenants`, `users`, `roles`, `user_roles`, `customers`, `leads`, `services`, `bookings`, and `audit_logs`; normalized Prisma runtime/config handling so the repo's SQLAlchemy-style `postgresql+asyncpg://` env can be converted for Prisma/pg usage; added a deterministic sample-data seed script; and generated a checked-in initial migration SQL artifact under `prisma/migrations/20260422011500_init_multi_tenant_revenue_ops/`
  - verification: `npm install`; `npx prisma validate`; `npx prisma generate`; `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`; note: `npx prisma migrate dev` and `npx prisma db seed` remain blocked from this workspace because the configured `supabase-db` Postgres host is not reachable here, so the migration artifact was generated but not applied to the live/local database from this session
- `2026-04-22`
  - lane: `Admin workspace blueprint synchronization`
  - update: promoted the new BookedAI admin blueprint into repo truth by adding `docs/architecture/admin-workspace-blueprint.md` as the detailed source for module scope, role model, permission matrix, entity inventory, API baseline, UI page map, KPI model, validation rules, phased sprint plan, and Codex execution prompts; then synchronized that blueprint into `project.md`, admin requirements, internal admin strategy, sprint package, and roadmap docs
  - verification: documentation synchronization only; no code runtime verification required for this update
- `2026-04-22`
  - lane: `Admin customers CRUD`
  - update: upgraded the root `Next.js` admin `Customers` module from a starter page into a richer revenue-ops workspace by extending the mock repository with customer source, tags, notes summary, payments, and customer-specific audit records; tightening customer validation so email or phone is required; redirecting create and archive actions into cleaner end-to-end flows; and rebuilding the customers list and detail routes with KPI summary cards, search and filter controls, sort options, row-level archive actions, reusable customer form components, and detail tabs for overview, bookings, payments, and notes plus audit
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin customers API layer`
  - update: completed the backend API slice for the root `Next.js` `Customers` module by adding `GET/POST /api/admin/customers` plus `GET/PATCH/DELETE /api/admin/customers/:id`, introducing Zod query/body/id schemas for route validation, adding a shared admin API response helper for permission-aware JSON errors, and exposing paginated list responses plus detail payloads that include linked bookings, payments, and audit history while keeping delete soft-delete-only
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin leads pipeline module`
  - update: upgraded the root `Next.js` `Leads` module into a real pipeline workspace by extending the repository with lead pipeline stages, scoring, owner assignment, follow-up dates, soft delete, and conversion helpers; adding server actions for create, update, archive, convert-to-customer, and convert-to-booking; creating admin API routes for list, detail, update, archive, and both conversion flows; adding Zod schemas for lead payloads, list queries, route ids, and booking-conversion input; and rebuilding the leads page with both list and kanban views, filter and sort controls, reusable create form, inline owner and stage updates, and booking/customer conversion actions
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 3 control plane`
  - update: started the root admin `Phase 3` slice by extending sidebar navigation with `Team`, `Payments`, and `Settings`; adding `Team` support for user creation plus status or primary-role assignment through page, server-action, repository, and `/api/admin/users*` plus `/api/admin/roles` routes; adding `Settings` support for tenant profile and branding HTML edits through page, server-action, repository, and `/api/admin/settings`; and adding `Payments` support for filtered ledger read, payment creation, and payment status updates through page, server-action, repository, and `/api/admin/payments*`
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 3 audit and permissions`
  - update: extended the same root admin `Phase 3` lane with a dedicated `Roles` workspace for tenant-scoped permission editing, a dedicated `Audit` workspace for searchable and paginated audit review, repository support for `listPermissions`, `updateRolePermissions`, `listRecentAuditLogs`, and paginated `listAuditLogs`, plus matching admin APIs at `/api/admin/roles` and `/api/admin/audit`
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 4 revenue-core hardening`
  - update: started the first practical `Phase 4` slice by adding a dedicated lead detail workspace at `/admin/leads/[leadId]` with edit controls, conversion actions, and follow-up timeline; adding a shared `ActivityTimeline` component; extending the repository with `listLeadTimeline` and `listCustomerTimeline`; upgrading customer detail to render one unified timeline across notes, tags, bookings, payments, and audit events; and extending `/api/admin/leads/[leadId]` plus `/api/admin/customers/[customerId]` to include timeline payloads
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 4 booking revenue coupling`
  - update: extended the same `Phase 4` lane with a dedicated booking detail workspace at `/admin/bookings/[bookingId]`, upgraded the bookings list to deep-link into that workspace, added repository support for `listBookingPayments` and `listBookingTimeline`, and extended `/api/admin/bookings/[bookingId]` to return payments, derived payment status, and timeline payloads so bookings now behave more like revenue-linked service records instead of flat schedule rows
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 4 lead write seam`
  - update: extended the same `Phase 4` lane with explicit lead quick actions by adding `appendLeadNote` and `scheduleLeadFollowUp` repository methods, wiring dedicated quick-action forms into `app/admin/leads/[leadId]/page.tsx`, and exposing matching admin APIs at `/api/admin/leads/[leadId]/add-note` and `/api/admin/leads/[leadId]/schedule-follow-up` so note capture and follow-up scheduling no longer depend on the generic lead edit form only
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 4 lead write seam`
  - update: extended the same `Phase 4` lane with explicit lead quick actions by adding `appendLeadNote` and `scheduleLeadFollowUp` repository methods, wiring dedicated quick-action forms into `app/admin/leads/[leadId]/page.tsx`, and exposing matching admin APIs at `/api/admin/leads/[leadId]/add-note` and `/api/admin/leads/[leadId]/schedule-follow-up` so note capture and follow-up scheduling no longer depend on the generic lead edit form only
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 3 audit and permissions`
  - update: extended the same root admin `Phase 3` lane with a dedicated `Roles` workspace for tenant-scoped permission editing, a dedicated `Audit` workspace for searchable and paginated audit review, repository support for `listPermissions`, `updateRolePermissions`, `listRecentAuditLogs`, and paginated `listAuditLogs`, plus matching admin APIs at `/api/admin/roles` and `/api/admin/audit`
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Zoho CRM inheritance note for admin CRM modules`
  - update: synchronized the admin workspace blueprint and sprint package so `Customers` and `Leads` are now explicitly treated as `Zoho CRM`-connected modules with future provider-sync, retry, and manual-review seams, rather than local-only CRUD surfaces
  - verification: documentation synchronization only
- `2026-04-22`
  - lane: `Admin services simple CRUD`
  - update: upgraded the root `Next.js` `Services` module into a lightweight CRUD slice with a simplified data model centered on `name`, `duration`, and `price`; added reusable service form UI, create/update/archive server actions, service list sorting and search, edit-via-selection flow on the same page, `GET/POST /api/admin/services`, `GET/PATCH/DELETE /api/admin/services/:id`, service validation schemas, and soft-delete-safe repository mutations
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin bookings scheduling module`
  - update: upgraded the root `Next.js` `Bookings` module into a scheduling workspace with list view, date-grouped calendar view, create-booking form, explicit customer/service linkage, status actions for confirm and cancel, reschedule actions with start/end validation, richer booking repository records, server actions for create/confirm/cancel/reschedule, and admin API routes at `GET/POST /api/admin/bookings`, `GET/PATCH /api/admin/bookings/:id`, plus dedicated `confirm`, `cancel`, and `reschedule` action routes
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 3 tenant investigation and support mode`
  - update: extended the root admin `Phase 3` control plane with a dedicated `/admin/tenants` investigation workspace for tenant auth posture, billing readiness, and CRM retry state; added server-side tenant investigation reads against the production tenant runtime; and added audited `read_only` tenant support mode with reason capture, topbar bannering, and explicit start/end audit events instead of a silent write-capable impersonation path
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 3 tenant investigation deep links and next-plan lock`
  - update: extended `/admin/tenants` with direct deep links into tenant runtime `overview`, `billing`, `team`, and `integrations` sections so operators can pivot from support investigation into the tenant-facing runtime without manual URL reconstruction; also locked the next execution sequence in `docs/architecture/current-phase-sprint-execution-plan.md` around tenant investigation timeline, support-mode banner expansion, cross-surface return links, and regression coverage
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 3 tenant investigation timeline`
  - update: extended `/admin/tenants` with a unified investigation feed that merges tenant-auth activity, invite backlog, billing posture, CRM retry backlog, integration attention signals, and support-session audit events into one read-only support-case timeline; kept the synthesis server-side in `server/admin/tenant-investigation.ts` so future tenant-support expansions can add new evidence without rewriting the page shell
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 3 tenant support regression coverage`
  - update: added root admin regression coverage for the tenant-support lane by extracting support-mode session and audit builders into `lib/admin/tenant-support.ts`, moving investigation-timeline synthesis into a testable helper, and adding `node:test` coverage for support-mode start/end contracts plus investigation-timeline rendering through `lib/admin/tenant-support.test.ts` and `server/admin/tenant-investigation.test.tsx`
  - verification: `npx tsx --test lib/admin/tenant-support.test.ts server/admin/tenant-investigation.test.tsx`; `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-22`
  - lane: `Admin phase 3 support-mode banner expansion`
  - update: expanded tenant support-mode visibility beyond `/admin/tenants` by adding a shared server-rendered support-context banner to the main root admin workspaces, including dashboard, customers, leads, bookings, services, payments, reports, settings, team, roles, and audit; the new banner keeps tenant context visible and adds direct links back to `/admin/tenants` plus the relevant tenant runtime section
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-23`
  - lane: `Public homepage live-read release hardening`
  - update: completed the final homepage/live-read QA hardening pass in `frontend/src/apps/public/HomepageSearchExperience.tsx`; homepage search now submits on `Enter` while keeping `Shift+Enter` for multiline input, no-result live-read summaries now prefer location-specific guidance without duplicating the exact warning string already rendered in pills, and homepage Stripe return params now surface booking success/cancel banners directly on `/?booking=...&ref=...`
  - verification: `cd frontend && bash scripts/run_playwright_suite.sh legacy tests/public-booking-assistant-live-read.spec.ts:3233`; `cd frontend && bash scripts/run_playwright_suite.sh live-read tests/public-booking-assistant-live-read.spec.ts tests/public-booking-assistant-location-guardrails.spec.ts`
- `2026-04-23`
  - lane: `Homepage redeploy and pitch executive redesign`
  - update: redeployed the public stack first to lock the homepage release sequence, then redesigned `frontend/src/apps/public/PitchDeckApp.tsx` into a clearer executive-brief surface with sharper hero framing, audience-specific summary cards, launch-path framing, and decision-rail messaging; also updated `frontend/src/components/landing/sections/PartnersSection.tsx` so pitch can intentionally prefer static partner data and avoid the production `pitch.bookedai.au -> api.bookedai.au/api/partners` CORS fetch noise
  - verification: `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; `npm --prefix frontend run build`; `node node_modules/typescript/bin/tsc --noEmit`
- `2026-04-22`
  - lane: `Tenant support cross-surface return-link polish`
  - update: completed the two-way tenant-support navigation loop by passing admin support context into tenant-runtime links from the root admin lane and rendering tenant-side return banners in `TenantApp`, so operators can jump back from tenant `overview`, `billing`, `team`, or `integrations` into the same admin investigation or admin workspace they came from
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`; `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`
- `2026-04-22`
  - lane: `Tenant support read-only enforcement hardening`
  - update: hardened the root admin tenant-support baseline so read-only support mode now blocks all non-`view` permissions inside `requirePermission(...)`, updates the shared support banner to state that write actions are blocked, and disables the main mutation forms plus high-signal destructive buttons across customers, leads, services, payments, settings, team, and roles
  - verification: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next build`
- `2026-04-24`
  - lane: `Homepage booking load-failed hotfix`
  - update: traced the live homepage booking failure to a backend `asyncpg.exceptions.AmbiguousParameterError` in `backend/repositories/contact_repository.py` during public-web contact lookup, then hardened nullable bind handling in both `ContactRepository` and `LeadRepository` by casting nullable text params inside the SQL predicates so public-web lead and booking-intent writes no longer fail before the CRM and follow-up steps
  - verification: `./.venv/bin/python -m pytest backend/tests/test_phase2_repositories.py -q`; `./.venv/bin/python -m pytest backend/tests/test_api_v1_contract.py -q`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; direct `curl` probes to `https://api.bookedai.au/api/v1/leads` and `https://api.bookedai.au/api/v1/bookings/intents`; live Playwright smoke test on `https://bookedai.au` with `kids swimming lessons sydney`
- `2026-04-24`
  - lane: `Homepage messaging follow-up resilience`
  - update: removed the remaining homepage post-booking console failures by normalizing local Australian mobile inputs to E.164 before SMS and WhatsApp automation in the public booking surfaces, then hardening `CommunicationService` so Twilio/WhatsApp auth failures and upstream 5xx responses fall back to `queued` manual-review status instead of surfacing as `422` or `502` transport errors after booking confirmation
  - verification: `./.venv/bin/python -m pytest backend/tests/test_lifecycle_ops_service.py -q`; `./.venv/bin/python -m pytest backend/tests/test_api_v1_communication_routes.py -q`; `cd frontend && npx tsc --noEmit`; `npm --prefix frontend run build`; `python3 scripts/telegram_workspace_ops.py deploy-live`; direct `curl` probes to `https://api.bookedai.au/api/v1/sms/messages/send` and `https://api.bookedai.au/api/v1/whatsapp/messages/send`; live Playwright smoke test on `https://bookedai.au` with `kids swimming lessons sydney`
- `2026-04-24`
  - lane: `Demo host chat-first redesign`
  - update: replaced the older story-led `demo.bookedai.au` landing page with a modular dark premium runtime in `frontend/src/apps/public/demo/*` plus a new `DemoLandingApp.tsx` shell; the new experience treats `chat = input`, `booking = output`, and `revenue = outcome` as one workspace with a conversation rail, live booking cards, and an inline booking-plus-payment panel instead of a static preview page
  - update: wired that demo runtime to the real BookedAI public v1 flow by priming a public session, using live-read search + booking-path resolution for shortlist generation, creating authoritative `lead + booking intent` records through the existing public assistant helpers, and preparing payment through `apiV1.createPaymentIntent` so the demo host now behaves like product proof rather than only narrative chrome
  - update: added `framer-motion` to the frontend bundle and used it for staged SaaS-style motion across the hero, chat, result cards, and revenue panel to align the surface more closely with the requested Stripe / Linear / OpenAI-grade product direction
  - verification: `cd frontend && npx vite build`
- `2026-04-24`
  - lane: `Demo host ChatGPT-like booking hero`
  - update: refined `frontend/src/apps/public/demo/DemoHeader.tsx`, `DemoChatStage.tsx`, `useDemoBookingExperience.ts`, and `constants.ts` so the demo host now opens with logo-only navigation, the requested centered headline and subcopy, a larger rounded composer with focus-glow treatment, the approved booking suggestion chips, instant chip-triggered search, subtle animated gradient background motion, and browser voice-input support
  - verification: `cd frontend && npm run build`
- `2026-04-24`
  - lane: `Demo host fast intelligent chat interaction`
  - update: reworked the demo chat state logic in `frontend/src/apps/public/demo/useDemoBookingExperience.ts` so BookedAI now asks at most `1-2` concise clarification questions, combines short follow-up answers back into the base query, and still shows ranked results immediately instead of waiting through a longer intake flow
  - update: upgraded `frontend/src/apps/public/demo/DemoChatStage.tsx` with a lightweight assistant typing state plus animated assistant message reveal so the conversation feels active and fast without drifting into long paragraph responses
  - verification: `cd frontend && npm run build`
- `2026-04-24`
  - lane: `Demo host real-time booking results panel`
  - update: upgraded `frontend/src/apps/public/demo/DemoResultsPanel.tsx`, `types.ts`, `utils.ts`, and `DemoLandingApp.tsx` so desktop now uses a `40/60` chat-to-results split, mobile shows results in a slide-up bottom sheet, and each result renders as a richer booking card with image, synthetic rating/review posture, price, availability slots, `Book Now` CTA, hover-glow treatment, fade-in entry motion, and skeleton loading while live search resolves
  - verification: `cd frontend && npm run build`
- `2026-04-24`
  - lane: `Demo host inline booking modal`
  - update: added `frontend/src/apps/public/demo/DemoBookingModal.tsx` and extended `useDemoBookingExperience.ts`, `DemoResultsPanel.tsx`, `DemoLandingApp.tsx`, `DemoBookingPanel.tsx`, and `types.ts` so `Book Now` now opens an inline modal flow with progress bar, minimal detail confirmation, local autofill memory, Stripe-ready payment stage, in-place success state, confirmation animation, and email/SMS confirmation previews instead of forcing the main path through a separate page or long side-panel form
  - verification: `cd frontend && npm run build`
- `2026-04-24`
  - lane: `Demo host autoplay product walkthrough`
  - update: extended `frontend/src/apps/public/demo/useDemoBookingExperience.ts` and `DemoChatStage.tsx` so the homepage now waits `3s` of idle time, then automatically types `Tutor for kids`, runs the live search flow, answers the first clarification with `Math`, opens inline booking, autofills demo contact data, and walks through the same booking-intent plus payment-intent path while showing an autoplay status badge; user interaction before autoplay begins cancels the sequence
  - update: replaced the still-active local mock `DemoLandingApp` route with the modular API-backed demo runtime, so the shipped `demo.bookedai.au` surface now actually uses `primePublicBookingAssistantSession(...)`, `getPublicBookingAssistantLiveReadRecommendation(...)`, `createPublicBookingAssistantLeadAndBookingIntent(...)`, and `apiV1.createPaymentIntent(...)` instead of local `setTimeout` simulation
  - update: tightened demo payment truthfulness against the declared contract by removing the fake inline `paid` transition; if the current v1 payment-intent contract returns only `pending` or no checkout URL, the UI now moves into `payment opened` or `awaiting confirmation` states, opens checkout only when a real URL exists, and keeps confirmation previews aligned with that real posture
  - update: completed the next backend payment slice in `backend/api/v1_booking_handlers.py` so `/api/v1/payments/intents` now performs real checkout orchestration for the declared options: `stripe_card` builds a hosted Stripe Checkout session when the service has a numeric price, `partner_checkout` returns the service booking URL directly, and both the payment-intent mirror plus booking-intent payment dependency state are updated with the resulting `payment_url` / session metadata instead of staying as a pure stub
  - update: expanded backend contract coverage with new route tests for Stripe-ready and partner-checkout-ready payment intents, while updating the older payment-intent contract test to reflect the new confirmation-first warning path for `invoice_after_confirmation`
  - verification: `cd frontend && npm run build`
  - verification: `cd frontend && npx vite build`
  - verification: `cd backend && ../.venv-backend/bin/python -m unittest tests.test_api_v1_booking_routes tests.test_api_v1_contract`

- [Project Documentation Root](../../project.md)
- [Documentation Root](../README.md)
- [Next Wave Prompt 10 11 Live Adoption Plan](./next-wave-prompt-10-11-live-adoption-plan.md)
- [Backend Boundaries](./backend-boundaries.md)
- [Folder Conventions](./folder-conventions.md)
- Hardened tenant Google verification on `2026-04-23` so invalid, malformed, or expired Google ID tokens from the tenant gateway now return an actionable `google_identity_token_invalid` auth response and prompt operators to verify again, rather than exposing the raw Google `400` tokeninfo failure.
- Live verification for that tenant Google fix passed on `2026-04-23`: `python3 scripts/telegram_workspace_ops.py deploy-live` completed, `scripts/healthcheck_stack.sh` passed, and a production invalid-token probe against `/api/v1/tenant/auth/google` returned `401 google_identity_token_invalid`.
- Elevated the live OpenClaw execution lane on `2026-04-22` by moving `deploy/openclaw/docker-compose.yml` to a split-privilege model: `openclaw-cli` now runs as `root` with `privileged`, host PID access, `/hostfs`, and `/var/run/docker.sock`, while `openclaw-gateway` stays in its standard mode for UI and Telegram stability.
- Verified the VPS already had `ffmpeg` available from apt (`7:6.1.1-3ubuntu5`) while applying the OpenClaw runtime change.
- `2026-04-24`
  - lane: `Chess revenue-ops action ledger transitions`
  - update: extended the Grandmaster Chess connected-agent foundation so `agent_action_runs` now has tenant/admin readable list and detail seams plus a status-transition endpoint. Operators can filter action runs by student, booking reference, status, and action type, then move a run through `queued`, `in_progress`, `sent`, `completed`, `failed`, `manual_review`, or `skipped` with audit and outbox evidence.
  - update: added frontend v1 client contracts for listing and transitioning revenue-agent actions so later tenant/admin UI surfaces can consume the ledger without bespoke fetch code.
  - verification: `python3 -m py_compile backend/repositories/academy_repository.py backend/service_layer/academy_service.py backend/api/v1_academy_handlers.py backend/api/v1_academy_routes.py`; `cd backend && ../.venv/bin/python -m pytest -q tests/test_api_v1_academy_routes.py tests/test_api_v1_assessment_routes.py tests/test_api_v1_contract.py`; `npm --prefix frontend run build`
- `2026-04-24`
  - lane: `Chess revenue-ops action runner`
  - update: added the first tracked worker execution seam for the Grandmaster Chess revenue-ops ledger. `workers/academy_actions.py` now processes queued `agent_action_runs`, moves each run through `in_progress`, and resolves it to `sent`, `completed`, `manual_review`, or `failed` based on current action type and parent-contact policy.
  - update: exposed `POST /api/v1/agent-actions/dispatch` so tenant/admin operators can trigger a bounded dispatch run and receive `job_run_id`, status, retryability, and processed/manual-review/failed counts. Frontend v1 contracts now include `dispatchRevenueAgentActions` for the upcoming operator workspace.
  - verification: `python3 -m py_compile backend/workers/academy_actions.py backend/api/v1_academy_handlers.py backend/api/v1_academy_routes.py`; `cd backend && ../.venv/bin/python -m pytest -q tests/test_academy_action_worker.py tests/test_api_v1_academy_routes.py tests/test_api_v1_assessment_routes.py tests/test_api_v1_contract.py`; `npm --prefix frontend run build`
- `2026-04-24`
  - lane: `Admin revenue-ops ledger UI`
  - update: added the first dedicated admin operator surface for the Grandmaster Chess revenue-ops ledger in `frontend/src/features/admin/revenue-ops-action-ledger.tsx` and mounted it inside the Reliability workspace. Operators can now filter action runs by status and action type, refresh the queue, trigger `POST /api/v1/agent-actions/dispatch`, and move individual actions to `completed` or `manual_review` from the UI.
  - update: wired the panel to the selected tenant reference from the admin shell so tenant-scoped investigation can flow from tenant selection into revenue-ops queue control without leaving Reliability.
  - verification: `cd backend && ../.venv/bin/python -m pytest -q tests/test_academy_action_worker.py tests/test_api_v1_academy_routes.py tests/test_api_v1_assessment_routes.py tests/test_api_v1_contract.py`; `npm --prefix frontend run build`
- `2026-04-24`
  - lane: `Demo bookedai flow polish and bug fixes`
  - update: tightened `demo.bookedai.au` layout and runtime behavior after a local Playwright smoke pass. The results rail no longer clips taller shortlist content on desktop, the booking modal now has viewport-safe max-height scrolling plus dialog semantics, result cards render a branded fallback instead of a broken image when a candidate lacks media, and the booking panel now presents revenue-agent actions as a clearer handoff timeline with status tones and reasons.
  - update: fixed a flow bug where an assessment API failure could be shown as a global search failure after live-read had already completed. Assessment creation is now isolated so search results stay truthful, the user sees an `Assessment delayed` message, and bundle suggestions are suppressed when no real shortlist exists.
  - verification: `npm --prefix frontend run build`; Playwright CLI smoke against `http://127.0.0.1:4174/demo` with viewport screenshot at `output/playwright/demo-polish-2026-04-24.png` (local API calls still returned expected unauthorized responses outside the authenticated production runtime)
- `2026-04-24`
  - lane: `Demo bookedai deep QA regression`
  - update: added Playwright live-read regression coverage for `/demo` so the academy proof now locks two critical flows: partial assessment API failure must not collapse live search state, and the mobile full flow must progress through search, assessment, placement, booking, report preview, and revenue-agent handoff.
  - update: fixed QA findings from that regression pass: assessment normalization now accepts both `assessment` and `result` payload fields, placement normalization accepts both backend and direct contract shapes, placement-selected slots are converted into valid `datetime-local` values, fast assessment answers no longer miss the latest result shortlist, and payment success copy no longer says checkout opened when no checkout URL exists.
  - verification: `PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/demo-bookedai-full-flow.spec.ts --project=live-read`; `npm --prefix frontend run build`
- `2026-04-24`
  - lane: `Full-flow go-live QA`
  - update: completed the full release gate for the active booking/register/demo/admin revenue-ops surfaces, then deployed live through the approved Telegram operator workflow. The pass caught and fixed a stale payment metadata contract expectation, demo-origin CORS for `/api/v1/conversations/sessions`, and the `chess.bookedai.au` Cloudflare DNS record missing from the runtime DNS override list.
  - update: backend default CORS now includes the active public app hosts (`beta`, `demo`, `futureswim`, and `chess`) in addition to the existing product, pitch, portal, tenant, admin, and upload hosts. Runtime `.env` was aligned for the live deploy, and `chess.bookedai.au` was corrected to a proxied Cloudflare record on the current origin.
  - verification: `python3 -m py_compile backend/config.py`; `python3 -m py_compile backend/api/v1_booking_handlers.py backend/api/v1_academy_handlers.py backend/api/v1_assessment_handlers.py backend/service_layer/academy_service.py backend/workers/academy_actions.py backend/service_layer/booking_assistant_runtime.py`; `cd backend && ../.venv/bin/python -m pytest -q tests/test_api_v1_booking_routes.py tests/test_api_v1_contract.py tests/test_api_v1_portal_routes.py tests/test_api_v1_assessment_routes.py tests/test_api_v1_academy_routes.py tests/test_academy_action_worker.py tests/test_pricing_consultation_resilience.py tests/test_booking_assistant_runtime.py`; `npm --prefix frontend run build`; `PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/demo-bookedai-full-flow.spec.ts --project=live-read`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; production probes for `/api/health`, demo CORS preflight, revenue-ops API, host HEAD responses, DNS, and browser sweep across demo, pitch/register, product, admin, and chess
- `2026-04-24`
  - lane: `Pitch package booking deep QA`
  - update: completed a live deep-QA pass on `pitch.bookedai.au` after the package-registration routing/CORS hotfix. The pricing CTA now reaches `RegisterInterestApp` on the pitch host, package registration submits to the production pricing consultation API, and the customer-facing submit completes instead of showing a load failure.
  - update: removed the mobile register-page fixed bottom CTA that could overlay form content, tightened long package-title wrapping in the package selector, and adjusted the shared landing footer so logo, brand copy, release badge, and compact icon-led CTA buttons do not compress into narrow mobile columns.
  - verification: `./.venv/bin/python -m pytest backend/tests/test_pricing_consultation_resilience.py -q`; `npm --prefix frontend run build`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; production CORS preflight from `https://pitch.bookedai.au`; Playwright live desktop/tablet/mobile sweeps with no horizontal overflow or console errors; mobile end-to-end confirmation `CONS-022CCEA9`
- `2026-04-24`
  - lane: `Admin revenue-ops ledger operator polish`
  - update: continued the Reliability revenue-ops ledger surface so summary counts are tenant-wide rather than filter-local, filters now include student and booking reference search, action cards expose input/result evidence drawers, and refresh/dispatch/complete/manual-review controls use compact icon-led buttons.
  - update: fixed a live API readiness gap found during production probing. Migration `018_academy_subscription_and_agent_action_runs.sql` now grants `bookedai_app` access to `academy_subscription_intents` and `agent_action_runs`, and the migration was reapplied on the live DB so `/api/v1/agent-actions` no longer fails with table permission errors.
  - verification: `./.venv/bin/python -m pytest backend/tests/test_api_v1_academy_routes.py backend/tests/test_academy_action_worker.py -q`; `npm --prefix frontend run build`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; live `GET /api/v1/agent-actions?channel=admin&tenant_ref=tenant1...` returned `status: ok`; live `POST /api/v1/agent-actions/dispatch` returned `dispatch_status: completed`
- `2026-04-24`
  - lane: `Full booking thank-you handoff`
  - update: added the requested end-of-flow thank-you state and automatic return across the BookedAI booking surfaces. `HomepageSearchExperience`, `BookingAssistantDialog`, `FutureSwimApp`, and `ChessGrandmasterApp` now show a prominent Thank You confirmation after booking/enquiry capture, display a 5-second countdown, and return to the main screen automatically while keeping manual return available.
  - update: the product/embedded assistant return path reuses one reset function for the Thank You hero and Home action, while homepage search resets booking state back to the main search surface. Tenant runtimes reset their form state and scroll back to the top after the countdown.
  - verification: `./.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py -q`; `npm --prefix frontend run build`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; live Playwright `product.bookedai.au` flow created booking `v1-ce0d20a95d`, observed the Thank You countdown, confirmed API calls for leads/bookings/payment/email/SMS/WhatsApp returned `200`, and verified auto-return after 5 seconds
- `2026-04-25`
  - lane: `Public homepage investor proof polish`
  - update: tightened `frontend/src/apps/public/PublicApp.tsx` after live review so the hero chess proof image is contained inside its frame, the top proof language is shorter and more visual, and the investor-facing cards now expose concise `Wedge`, `Proof`, `Moat`, and `Scale` signals before the live search workspace.
  - update: restored the regression-tested `Open Web App` CTA label and fixed the backend `Settings` dataclass field order in `backend/config.py`, unblocking release-gate imports after the WhatsApp Evolution defaults were added.
  - verification: `npm --prefix frontend exec tsc -- --noEmit`; `npm --prefix frontend run build`; `npm --prefix frontend run test:playwright:legacy`; `npm --prefix frontend run test:playwright:live-read`; `npm --prefix frontend run test:playwright:admin-smoke`; `.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service`; `.venv-backend/bin/python scripts/run_search_eval_pack.py`; live deploy; `bash scripts/healthcheck_stack.sh`; live public-surface smoke; hero Playwright check confirming `object-fit: contain` and no desktop/mobile overflow
- `2026-04-25`
  - lane: `Homepage chat full booking flow UX`
  - update: upgraded `HomepageSearchExperience` so the homepage workspace now exposes a customer-facing `Ask -> Match -> Book -> Confirm` rail, clearer booking brief helper cards, required name/time fields, and confirmation copy centered on QR portal, edit, reschedule, cancellation request, and follow-up.
  - update: fixed a form accessibility issue found by the new full-flow regression: phone helper text now sits outside the `<label>`, so `Email` and `Phone` accessible names stay distinct.
  - update: escaped the pitch architecture arrow text so Docker/Node 20 production builds no longer fail on JSX `>` parsing.
  - verification: `npm --prefix frontend exec tsc -- --noEmit`; `npm --prefix frontend run build`; `npm --prefix frontend run test:playwright:live-read`; `npm --prefix frontend run test:playwright:legacy`; production deploy through the host wrapper; `bash scripts/healthcheck_stack.sh`; live public-surface smoke across home/product/pitch/roadmap/tenant/portal/admin; live homepage smoke confirmed the rail/copy render, clean console/request state, and no mobile overflow
- `2026-04-25`
  - lane: `Pitch architecture and bottom-section overflow polish`
  - update: tightened `frontend/src/apps/public/PitchDeckApp.tsx` so the pitch architecture section now includes a compact SVG architecture image plus four short support rails instead of dense nested chip grids that could create low-value mobile scroll.
  - update: simplified the final pitch CTA into a short dark band and added a compact shared-footer mode for the pitch page, removing the verbose brand-positioning block and reducing bottom-page text pressure.
  - verification: `npm --prefix frontend run build`; local Playwright preview smoke at `390x844` and `1440x950` showed `scrollWidth === clientWidth`, no overflowing elements, no console/page errors, and the removed brand-copy text absent from the pitch page body.
  - live deploy: `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; live Playwright desktop/mobile pitch smoke confirmed the architecture image is present, removed footer text is absent, no horizontal overflow remains, and the uploaded pitch video still serves `206 video/mp4` byte ranges.
- `2026-04-26`
  - lane: `Tenant live UAT and A/B review`
  - update: completed a live unauthenticated UAT, visual, content, SME, investor, and A/B review for `https://tenant.bookedai.au/` and `https://tenant.bookedai.au/future-swim`, preserving the findings in `docs/development/tenant-bookedai-uat-ab-investor-review-2026-04-26.md`.
  - update: follow-up live tenant UAT confirmed `https://futureswim.com.au/locations/miranda/` is a real `404` in browser GET, not just a HEAD artifact; prepared `backend/migrations/sql/020_future_swim_miranda_booking_url_hotfix.sql` to replace the published Miranda booking/source URL with `https://futureswim.com.au/locations/`. The migration was applied live later on `2026-04-26`, and the public catalog now exposes the corrected booking URL.
  - result: gateway and Future Swim passed desktop/mobile load, app error, request, API health, interaction, and horizontal-overflow checks; remaining polish is focused on the duplicated email-code accessible name, Future Swim mobile length, and buyer-facing treatment of internal runtime/source labels.
  - evidence: `frontend/output/playwright/tenant-review-static-2026-04-26/`
- `2026-04-26`
  - lane: `Tenant enterprise polish implementation`
  - update: implemented the tenant review follow-ups by giving the email-code CTA one stable accessible name, replacing first-scan internal runtime/source labels with buyer-facing access/trust posture copy, tightening follow-up microcopy, and compressing Future Swim mobile brand/AI-import detail behind a disclosure while keeping desktop proof depth intact.
  - update: refreshed `frontend/tests/tenant-gateway.spec.ts` so the regression follows the current outcome-led gateway copy and catches any return of the duplicated responsive email label.
  - verification: `npm --prefix frontend exec tsc -- --noEmit`; `npm --prefix frontend run build`; local Vite preview plus `PLAYWRIGHT_EXTERNAL_SERVER=1 npx playwright test tests/tenant-gateway.spec.ts --workers=1`
  - live deploy: the default parallel `deploy-live` path hit Docker frontend build `exit code 143`, so production was deployed through host-level sequential Docker builds with `COMPOSE_PARALLEL_LIMIT=1`; `bash scripts/healthcheck_stack.sh` passed, tenant/API probes returned `200`, and live desktop/mobile Playwright smoke confirmed the email accessible-name fix, buyer-facing access/trust posture, no raw internal role/source labels, no horizontal overflow, and the Future Swim mobile disclosure.
- `2026-04-26`
  - lane: `Release gate and deploy hardening`
  - update: hardened `scripts/deploy_production.sh` so production builds happen in the same memory-safe order used for the successful tenant live deploy: backend images first, then `web`, then `beta-web`, with `COMPOSE_PARALLEL_LIMIT` defaulting to `1` and compose up using already-built images.
  - update: added `frontend/scripts/run_tenant_smoke.sh`, `npm run test:playwright:tenant-smoke`, and a root release-gate call so the tenant gateway outcome copy, create-account path, Google re-verification chooser, and email-code accessible-name regression are part of the standard promote-or-hold gate.
  - verification: `bash -n scripts/deploy_production.sh scripts/run_release_gate.sh frontend/scripts/run_tenant_smoke.sh`; `npm --prefix frontend run test:playwright:tenant-smoke`
- `2026-04-26`
  - lane: `BookedAI email sender default alignment`
  - update: aligned the whole bookedai.au email/support fallback posture on `info@bookedai.au`; backend SMTP username and From defaults now resolve to that address when env values are omitted, and portal/customer-care fallback support mailto/copy no longer falls back to `support@bookedai.au`.
  - verification: `./.venv/bin/python -m pytest backend/tests/test_config.py backend/tests/test_api_v1_communication_routes.py backend/tests/test_api_v1_tenant_routes.py -q`
- `2026-04-26`
  - lane: `Tenant 2017 BTC login CTA recovery`
  - update: fixed tenant preview sign-in CTAs so `Open tenant sign-in` and activation `Open sign-in` open the auth card instead of returning to the overview panel; logout now resets the tenant auth role back to `sign-in` and clears the password field so re-login is immediately available.
  - verification: `npm --prefix frontend exec tsc -- --noEmit`; `npm --prefix frontend run build`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; live Playwright smoke on `https://tenant.bookedai.au/2017-btc?smoke=auth-fix-20260426` confirmed `#catalog`, visible auth workspace, enabled password CTA after input, and no horizontal overflow.
- `2026-04-27`
  - lane: `OpenClaw and Telegram full deploy host execution context`
  - update: changed `scripts/telegram_workspace_ops.py deploy-live` so trusted host users `openclaw` and `telegram` run live deployment through the full VPS host-shell context from `/home/dovanlong/BookedAI`, matching the already-approved root/Docker posture. `permissions` now reports the current OS user and trusted host deploy-user status for easier operator diagnostics.
  - update: hardened `scripts/deploy_live_host.sh` so direct wrapper calls from a privileged OpenClaw runtime with `/hostfs` but no container-local Docker CLI self-reexec through `nsenter --target 1 ...` into the real Docker host before continuing.
  - verification: `python3 -m py_compile scripts/telegram_workspace_ops.py`; `bash -n scripts/deploy_live_host.sh scripts/deploy_production.sh`; `permissions` as both `openclaw` and `telegram` showed `trusted_host_deploy_user=true`; `deploy-live` as `telegram` completed production rebuild/recreate and n8n activation; `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T08:56:59Z`; API/public/OpenClaw live probes returned `200`.
- `2026-04-27`
  - lane: `OpenClaw sudo-less host-shell deploy repair`
  - update: fixed the remaining runtime blocker where `host-shell` prepended `sudo` even when `nsenter` host context was available, causing `FileNotFoundError: No such file or directory: 'sudo'` in slim OpenClaw runtimes. `scripts/telegram_workspace_ops.py` now runs `nsenter` host-context commands directly and only falls back to `sudo -n` when there is no host namespace prefix and the process is not already root.
  - update: `permissions` now reports `sudo_available` and `nsenter_path`, so operator diagnostics can distinguish host namespace availability from sudo availability.
  - verification: `python3 -m py_compile scripts/telegram_workspace_ops.py`; simulated no-sudo/nsenter execution path completed without trying to exec `sudo`; host deploy completed with `bash scripts/deploy_live_host.sh`; `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T08:59:56Z`; API/public/product/OpenClaw live probes returned `200`.
- `2026-04-27`
  - lane: `Telegram customer booking payment/status care`
  - update: fixed a customer Telegram false-escalation path where prior assistant history containing `Support contact` could be included in the portal-care message and accidentally queue a support request when the latest customer turn only asked for payment/status on an existing booking such as `v1-6dfc0946e4`.
  - update: existing-booking Telegram care replies now include booking portal and QR inline controls so a pending-payment/status response has a direct reopen path instead of only plain support copy.
  - verification: `.venv/bin/python -m py_compile backend/service_layer/messaging_automation_service.py backend/tests/test_telegram_webhook_routes.py`; `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py -q` (`14 passed`).
- `2026-04-27`
  - lane: `Operator and customer Telegram bot activation`
  - update: reactivated the OpenClaw operator bot `@Bookedairevenuebot` webhook at `https://api.bookedai.au/telegram-webhook` with trusted allowlist/elevated config intact, and confirmed operator outbound send to trusted actor `8426853622`.
  - update: reactivated the customer booking bot `@BookedAI_Manager_Bot` webhook at `https://api.bookedai.au/api/webhooks/bookedai-telegram`, confirmed customer token/secret are present in live backend env, and configured tenant `co-mai-hung-chess-class` tenant notifications to Telegram chat id `8426853622`.
  - update: fixed a live customer Telegram processing defect in the shared repository tenant lookup SQL: `tenant_ref` is now cast to text in common tenant lookup and nullable filters so asyncpg no longer raises `AmbiguousParameterError` during idempotency reservation.
  - verification: backend repository `py_compile` passed; live deploy completed with `bash scripts/deploy_live_host.sh`; stack health passed at `2026-04-27T09:08:58Z`; operator webhook info showed pending `0` and no last error; customer webhook pending is `0`; synthetic customer Telegram webhook returned `200` / `messages_processed=1`, created a conversation event, and backend logs showed no idempotency SQL errors; customer bot test send returned message id `79`, operator bot test send returned message id `550`.
- `2026-04-27`
  - lane: `OpenClaw/Telegram host-shell sudo support and live deploy`
  - update: hardened `scripts/telegram_workspace_ops.py` host execution so non-root runtimes with `nsenter` first try direct host namespace execution, then fall back to `sudo -n nsenter ...` if direct `nsenter` is denied. Commands executed after entering host context can use host `sudo`, so trusted OpenClaw/Telegram sessions can run commands such as `sudo -n docker ps` through `host-shell`.
  - verification: `python3 -m py_compile scripts/telegram_workspace_ops.py`; `host-shell --command "sudo -n id && sudo -n docker ps"` passed as Linux users `openclaw` and `telegram`; `deploy-live` completed backend/web/beta rebuild and container recreate; `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T09:46:28Z`; API/public/product/OpenClaw probes returned `200`.
- `2026-04-27`
  - lane: `OpenClaw host-exec alias and host live deploy`
  - update: added `host-exec` to `scripts/telegram_workspace_ops.py` as the explicit OpenClaw-friendly alias for full `host-shell` execution, gated by the existing `host_shell` permission scope and capable of running host commands that use `sudo -n`.
  - verification: `python3 -m py_compile scripts/telegram_workspace_ops.py`; `host-exec --command "sudo -n id && sudo -n docker ps"` passed as both `openclaw` and `telegram`; live deploy was run through `host-exec --cwd /home/dovanlong/BookedAI --command "bash scripts/deploy_live_host.sh"`; stack health passed at `2026-04-27T09:54:52Z`; API/public/product/OpenClaw probes returned `200`.
- `2026-04-26`
  - lane: `BookedAI Manager Bot full retest and live redeploy`
  - update: reran the full release gate after activating the customer-facing `@BookedAI_Manager_Bot`, then redeployed the production stack through the approved host-level live deploy entrypoint. Backend, beta-backend, web, and beta-web images rebuilt successfully, containers were recreated, proxy restarted, and the n8n booking intake workflow remained active.
  - update: confirmed the live backend has the customer Telegram token injected, the Telegram webhook still targets `https://api.bookedai.au/api/webhooks/bookedai-telegram`, and a fresh internal webhook event processed through the live backend with `200` / `{"status":"processed","messages_processed":1}`.
  - verification: `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py backend/api/webhook_routes.py backend/config.py scripts/customer_telegram_bot_manager.py scripts/telegram_workspace_ops.py`; `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py backend/tests/test_api_v1_communication_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_config.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase -q` (`27 passed`); `npm --prefix frontend exec tsc -- --noEmit`; `npm --prefix frontend run build`; `bash scripts/run_release_gate.sh`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; Telegram `getWebhookInfo` showed `pending_update_count=0`; live log probe confirmed the new Telegram send path no longer emits Telegram Bot API token URLs.
- `2026-04-26`
  - lane: `BookedAI Manager Bot Telegram reply UX`
  - update: reformatted service-search replies sent to Telegram so they now read like compact BookedAI chat result cards: short title, provider, location/price/source posture, a trimmed service summary, and one clear quick-book instruction per option instead of long pipe-delimited rows.
  - update: replaced the single reply-keyboard action with Telegram inline controls: `Open BookedAI to view and book`, `Book 1/2/3` quick actions, and `Find more on Internet near me` when the search has not already been expanded. The web button carries the same query/service context into `bookedai.au` so customers can review richer details and book on the site.
  - verification: `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py`; `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py -q` (`8 passed`); `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py backend/tests/test_api_v1_communication_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_config.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase -q` (`27 passed`); `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; live internal Telegram webhook probe returned `200` / `messages_processed=1`, with backend logs showing the Telegram webhook request completed and no Telegram Bot API token URL emitted.
- `2026-04-26`
  - lane: `Customer booking agent UAT and fixes`
  - update: completed full UAT review for the BookedAI customer booking agent across web chat, Telegram message webhook, Telegram callback webhook, service discovery, identity policy, booking-intent capture guardrails, release gate, and live probes. Findings and next recommendations are captured in `docs/development/customer-booking-agent-uat-2026-04-26.md`.
  - update: fixed two UAT findings: Telegram inline callback taps are now acknowledged through `answerCallbackQuery` before the normal reply is sent, and web assistant ranking now prioritizes discriminating service intent such as `chess` over generic category/location overlap such as `kids`, `class`, or `Sydney`. Lifecycle test Settings constructors were also aligned with the customer booking support contact fields.
  - verification: `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py backend/api/v1_search_handlers.py backend/api/webhook_routes.py`; `.venv/bin/python -m pytest backend/tests/test_booking_assistant_runtime.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py backend/tests/test_api_v1_search_routes.py::ApiV1SearchRoutesTestCase::test_customer_agent_turn_returns_reply_search_and_handoff backend/tests/test_api_v1_communication_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_config.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase -q` (`33 passed`); `.venv/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service`; `bash scripts/run_release_gate.sh`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; live `/api/chat/send` ranked `Kids Chess Class - Sydney Pilot` first for a chess query; live internal Telegram message and callback probes returned `200` / `messages_processed=1`.
- `2026-04-26`
  - lane: `Customer booking agent UAT recommendations implemented`
  - update: implemented the UAT follow-ups for `BookedAI Manager Bot`: added `messaging_channel_sessions` as a compact per-channel session state store for Telegram shortlist/query/reply-control continuity, added delivery/callback status snapshots, and kept callback booking selection able to recover from the session state rather than depending only on conversation-event history.
  - update: added protected customer-agent health at `/api/customer-agent/health` and `/api/admin/customer-agent/health`, returning recent channel event counts, webhook pending posture, last reply/callback status, top failed identity-resolution reasons, and recent channel-session snapshots.
  - update: added `scripts/customer_agent_uat.py` as the first-class UAT runner for web chat search plus Telegram message/callback webhooks when customer Telegram test credentials are present; added the live-safe `chess-class-sydney-live-safe` search eval case to keep `Kids Chess Class - Sydney Pilot` first for `Find a chess class in Sydney this weekend`.
  - verification: `python3 -m py_compile backend/db.py backend/service_layer/messaging_automation_service.py backend/api/route_handlers.py backend/api/public_catalog_routes.py backend/api/admin_routes.py scripts/customer_agent_uat.py`; `.venv/bin/python scripts/run_search_eval_pack.py` (`14/14 passed`); `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_booking_assistant_runtime.py backend/tests/test_chat_send_routes.py backend/tests/test_api_v1_search_routes.py::ApiV1SearchRoutesTestCase::test_customer_agent_turn_returns_reply_search_and_handoff -q` (`13 passed`); `.venv/bin/python -m pytest backend/tests/test_api_v1_routes.py backend/tests/test_lifecycle_ops_service.py -q` (`21 passed`); `bash scripts/run_release_gate.sh`; `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; `python3 scripts/customer_agent_uat.py --api-base https://api.bookedai.au` passed web-chat UAT with `Kids Chess Class - Sydney Pilot` first; protected health returned `401` for an invalid token and `200` for a valid admin token.
- `2026-04-26`
  - lane: `Cross-stack review and Sprint 19-22 plan integration`
  - update: published `docs/development/full-stack-review-2026-04-26.md` capturing a seven-lane review (architecture+UAT, frontend UI/UX, corporate/business, backend, API+integrations, DevOps, conversational chat) with eight P0 items (`P0-1` portal `v1-*` snapshot 500, `P0-2` WhatsApp provider posture, `P0-3` Telegram/Evolution webhook HMAC, `P0-4` inbound webhook idempotency, `P0-5` `actor_context.tenant_id` validator, `P0-6` GitHub Actions CI, `P0-7` expanded `.env.production.example` with checksum guard, `P0-8` OpenClaw root drop), ten P1 items (`P1-1` to `P1-10`), a 16-experiment A/B testing matrix across acquisition/conversion/retention/conversational/tenant lanes, and a Sprint 19-22 sequencing overlay (`2026-04-27 → 2026-05-24`) mapped onto the existing `Phase 17-23` model.
  - update: synchronized the canonical roadmap docs with the review: added the new doc to `docs/architecture/current-phase-sprint-execution-plan.md` source-of-truth inputs and added a Sprint 19-22 cross-stack execution overlay; added a `2026-04-26 Cross-Stack Review Integration` section in `docs/development/next-phase-implementation-plan-2026-04-25.md` with phase-level deltas for `Phase 17`, `Phase 18`, `Phase 19`, `Phase 20`, `Phase 20.5`, `Phase 21`, `Phase 22`, `Phase 23`; added the doc to `docs/development/roadmap-sprint-document-register.md` baseline plus per-sprint registers for Sprint 19-22; added a new `Cross-stack security and reliability gates (2026-04-26 review)` section to `docs/development/release-gate-checklist.md` with all P0 and P1 gate items.
  - verification: documentation-only change; `ls docs/development/full-stack-review-2026-04-26.md` confirms the canonical doc is present; downstream closeouts must update both `docs/development/full-stack-review-2026-04-26.md` and the matching roadmap doc when a P0 or P1 lands.
- `2026-04-26`
  - lane: `Whole-project master roadmap consolidation`
  - update: published `docs/architecture/bookedai-master-roadmap-2026-04-26.md` as the single end-to-end roadmap covering Phase 0 through Phase 23 plus the post-Sprint-22 horizon. The roadmap applies the seven-lane review retroactively to historical phases by anchoring each finding to the phase it originated in (`R1` portal continuity originated in Phase 7-8/Phase 9, `R2` channel parity in Phase 3/Phase 7, `R3` service-layer monolith in Phase 7, `R4` operational hygiene in Phase 6/Phase 9), then names the phase that resolves it (`Phase 17`, `Phase 19`, `Phase 22`, `Phase 23`). The roadmap also names the post-Sprint-22 horizon themes for `Sprint 23 Vertical Expansion` and `Sprint 24 Investor and Compliance Closeout`.
  - update: synchronized the leadership-level documentation chain so the new master roadmap is the canonical reference. `docs/architecture/master-execution-index.md` now lists Phase 0 through Phase 23, Sprint 1 through Sprint 22 with phase targets, and adds leadership checkpoints at Sprint 19, Sprint 20, and Sprint 22. `docs/architecture/implementation-phase-roadmap.md` now has Phase 17-23 sections after Phase 9 and Sprint 17-22 entries appended to the recommended sprint mapping. `docs/architecture/solution-architecture-master-execution-plan.md` now has Phase 17-23 summaries after Phase 9 and Sprint 17-22 entries after Sprint 16. `prd.md` documentation rule now requires updating the master roadmap when phase scope, sprint sequencing, or the seven-lane review backlog changes. `project.md` now lists the master roadmap and the seven-lane review at the top of the documentation map.
  - verification: documentation-only change; `ls docs/architecture/bookedai-master-roadmap-2026-04-26.md` confirms the canonical doc is present; subsequent closeouts must update the master roadmap whenever phase, sprint, or review-item status changes.
- `2026-04-26`
  - lane: `Sprint 19 P0-3 webhook signature hardening`
  - update: kept the customer Telegram webhook on Telegram's official `X-Telegram-Bot-Api-Secret-Token` verification path and added Evolution webhook HMAC-SHA256 verification through `WHATSAPP_EVOLUTION_WEBHOOK_SECRET`. When configured, `/api/webhooks/evolution` now rejects missing/invalid `X-BookedAI-Signature` or `X-Hub-Signature-256` before parsing or processing the payload.
  - update: added `WHATSAPP_EVOLUTION_WEBHOOK_SECRET` to env examples and `docker-compose.prod.yml`, aligned the release-gate wording so Telegram is tracked as token verification while Evolution is tracked as HMAC verification, generated live runtime secrets without printing them, and reactivated the Telegram webhook with `secret_token`.
  - verification: `.venv/bin/python -m py_compile backend/api/route_handlers.py backend/config.py`; `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q` (`23 passed`); security/backend slice (`34 passed`); backend release unittest lane (`47 tests OK`); search eval (`14/14 passed`); tenant smoke (`3 passed`)
  - live deploy: `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh` passed at `2026-04-26T15:17:38Z`; live missing-token Telegram and missing-HMAC Evolution probes returned `403`, while valid-token and valid-HMAC ignored-payload probes returned `200`
- `2026-04-26`
  - lane: `Sprint 19 P0-4 inbound webhook idempotency routing`
  - update: inspected the existing inbound webhook foundation and found `webhook_events` plus `idempotency_keys` already present, with `/api/webhooks/whatsapp` using them for duplicate suppression while Telegram and Evolution still bypassed that shared gate.
  - update: routed `/api/webhooks/bookedai-telegram`, `/api/webhooks/telegram`, and `/api/webhooks/evolution` through the same idempotency reservation and webhook-event processing ledger before downstream customer-care side effects; duplicate provider events now return `messages_processed: 0`.
  - update: added `backend/migrations/sql/022_inbound_webhook_idempotency_evidence_indexes.sql` with additive status/scope indexes for later ledger evidence queries.
  - verification: `.venv/bin/python -m py_compile backend/api/route_handlers.py backend/repositories/idempotency_repository.py backend/repositories/webhook_repository.py`; `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py -q` (`21 passed`)
- `2026-04-26`
  - lane: `Sprint 19 P0-5 public assistant tenant validation`
  - update: added a route-level tenant session check so public assistant v1 routes reject `actor_context.tenant_id` when it does not match the authenticated tenant session.
  - update: kept `/api/chat/send` unchanged as the website AI Engine entrypoint because it does not accept `actor_context`; existing chat-send coverage still verifies the public web chat route.
  - verification: `.venv/bin/python -m py_compile backend/api/v1_routes.py backend/api/v1_booking_handlers.py backend/api/route_handlers.py`; `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py backend/tests/test_chat_send_routes.py -q` (`8 passed`); `.venv/bin/python -m pytest backend/tests/test_api_v1_search_routes.py -q` (`21 passed`)
- `2026-04-26`
  - lane: `UI/UX + Designer + Marketing review Tier 1 quick-wins`
  - update: ran a four-lane second-pass review (UI/UX walkthrough, frontend code-quality + A11y + mobile, designer tokens + hierarchy + brand, marketing wording + CTA) across all seven web apps and shipped eight Tier 1 quick-wins (`QW-1` through `QW-8`) inline. The new Tier 2 (`FX-1` to `FX-7`) and Tier 3 (`RF-1` to `RF-10`) backlog plus the A/B matrix expansion from sixteen to twenty-four experiments are recorded in the addendum section of `docs/development/full-stack-review-2026-04-26.md` and rolled into `docs/architecture/bookedai-master-roadmap-2026-04-26.md`.
  - update: `QW-1` removed implementation jargon from customer copy. In `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` the messaging-fallback string changed from `Messaging follow-up is queued for operations review; the booking and portal remain available.` to `Your booking is confirmed. We are sending the messaging follow-up — your booking and portal stay available.`, the SMS/WhatsApp pending value changed from `Messaging queued` to `Sending shortly`, and the revenue-ops handoff warning changed from `Revenue operations handoff could not be queued.` to `We could not start the booking follow-up automatically. Our team will follow up shortly.`. In `frontend/src/apps/portal/PortalApp.tsx` the care-turn fallback changed from `A support request has been queued for manual review.` to `Your request is being reviewed. We will confirm the next step shortly.`. In `frontend/src/apps/public/HomepageSearchExperience.tsx` both the messaging pending status and the revenue-ops warning use the same customer-safe phrasing as the dialog.
  - update: `QW-2` introduced a shared `customerContactHelperId` so the booking form's email and phone inputs both link via `aria-describedby` to `At least one of email or phone is required.`, with the SMS/WhatsApp guidance kept on the phone field as a separate helper.
  - update: `QW-3` raised `.booked-button` `min-height` from `40px` to `44px` in `frontend/src/theme/minimal-bento-template.css` to satisfy WCAG 2.5.5 touch-target size.
  - update: `QW-4` added `role="region"` and `aria-label="Admin bookings table"` to the wrapper in `frontend/src/features/admin/bookings-table-chrome.tsx` so screen readers do not skip the structure.
  - update: `QW-5` was verified rather than changed — the existing `<label class="block"><div>caption</div><input/></label>` pattern in `frontend/src/features/tenant-auth/TenantAuthWorkspaceEmail.tsx` is the WAI-ARIA implicit-label pattern and computes the accessible name correctly.
  - update: `QW-6` upgraded the public hero in `frontend/src/components/landing/data.ts` from `Turn enquiries into booked revenue with one modern operating system.` to `Never lose a service enquiry again.` with a body lead that names the channels (`WhatsApp, SMS, Telegram, email, or web chat`) and a kept body-rest paragraph.
  - update: `QW-7` upgraded primary and secondary CTAs across `heroContent`, `pricingContent`, and `ctaContent`: primary `Open Web App` → `Try BookedAI Free`, secondary `Talk to Sales` → `Schedule a Consultation`.
  - update: `QW-8` upgraded the empty search-state copy in `frontend/src/apps/public/homepageContent.ts` and `frontend/src/apps/public/HomepageSearchExperience.tsx` from `No strong match yet. BookedAI stays precise instead of forcing a weak recommendation.` to `Let's refine your request — tell us a suburb, preferred time, or service detail and we will find the best fit.`.
  - update: synced the canonical docs. `docs/development/full-stack-review-2026-04-26.md` now includes a `2026-04-26 UI/UX/Designer/Marketing review addendum` section with cross-cutting themes (`T1` to `T10`), Tier 1 closure record, Tier 2 and Tier 3 backlog (`FX-1` to `FX-7`, `RF-1` to `RF-10`), the eight new A/B experiments (`CW-1` to `CW-6`, `DS-1`, `DS-2`), the updated Wave 1 and Wave 2 cadence, and the phase rollup (`Phase 17` adds `FX-1`/`FX-3`/`FX-4`/`FX-5`/`FX-7`/`RF-10`; `Phase 19` adds `FX-2`/`FX-6`; `Phase 21` adds `RF-9`; `Phase 22` adds `RF-1` through `RF-8`). `docs/architecture/bookedai-master-roadmap-2026-04-26.md` carries the same integration plus a change-log entry. `docs/development/release-gate-checklist.md` now has a `UI/UX and copy gates (2026-04-26 review addendum)` section recording the customer-copy jargon ban, `aria-describedby` parity, the `min-height: 44px` touch-target gate, the admin table `role="region"` gate, the new hero/CTA/empty-state baselines, and the future gates that activate when `FX-1` through `FX-7` ship.
  - verification: `cd frontend && npx tsc --noEmit` passes; jargon grep `queued for operations review|Messaging queued|Revenue operations handoff could not be queued|support request has been queued for manual review|No strong match yet|Open Web App|Talk to Sales` returns zero hits across the six touched frontend files; `min-height: 44px` confirmed in `minimal-bento-template.css`; `role="region"` confirmed in `bookings-table-chrome.tsx`; `customerContactHelperId` confirmed at four call sites in `BookingAssistantDialog.tsx`. Release-gate Playwright run is the next required verification before promote.
- `2026-04-26`
  - lane: `Architecture recommendations execution baseline`
  - update: promoted the Top 5 architecture recommendations into the executive and PM execution baseline: schema normalization dual-write for `bookings`/`payments`/`audit_outbox`/`tenants`, split public/admin/portal frontend artifacts, centralized backend permission registry, Prometheus + structured logs + error-tracker observability, and one canonical architecture layer map.
  - update: added concrete owners, Sprint/Phase dates, acceptance gates, and leadership open questions for canonical layer-map selection and error-tracker choice.
  - verification: documentation-only change; internal PM/architecture markdown links were previously link-checked and the updated docs remain in `docs/executive-briefing/`, `docs/pm/`, and `docs/architecture/archimate/`.
- `2026-04-26`
  - lane: `Sprint 19 follow-on FX-2/FX-5/FX-7 closures`
  - update: with the eight Sprint 19 P0 items already mostly closed (only operator-side `P0-2` WhatsApp provider posture remains), shipped three Tier 2 fixes from `docs/development/full-stack-review-2026-04-26.md`. The `Phase 17` and `Phase 19` backlog now records `FX-2`, `FX-5`, `FX-7` as `closed` with the carry-forward note for direct-fetch cleanup left under `FX-2`.
  - update: `FX-2` AbortController + 30-second timeout on the shared API client. `frontend/src/shared/api/client.ts` now exports `API_REQUEST_DEFAULT_TIMEOUT_MS = 30_000` and a `fetchWithTimeout` helper that wraps `fetch` with an `AbortController`, honours any caller-supplied `init.signal`, and converts a timeout into an `ApiClientError` with status `0` and the customer-safe message `Network request timed out. Please try again.`. `apiRequest` now calls `fetchWithTimeout` so every typed API call inherits the timeout. Direct `fetch` cleanup in admin uploads, streaming, and legacy public fetch paths is a carried follow-up tracked under the same backlog id.
  - update: `FX-5` focus restoration on dialog close. `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` now holds a `dialogTriggerElementRef = useRef<HTMLElement | null>(null)`, captures `document.activeElement` when the dialog opens (skipping `standalone` and `embedded` mounts that do not have a single popup-style trigger), and restores focus to the same element on close with `preventScroll: true` plus a `document.body.contains(...)` safety check so a removed trigger does not throw.
  - update: `FX-7` portal `booking_reference` URL canonicalization is closed live. `readPortalReferenceFromUrl()` in `frontend/src/apps/portal/PortalApp.tsx` now reads four sources (`booking_reference`, `bookingReference`, `ref`, and a new `readPortalReferenceFromHash()` helper that accepts `#v1-xxxx` plain refs as well as `#booking_reference=v1-xxxx`/`#ref=v1-xxxx` URLSearchParams form), keeps the first non-empty value as the canonical reference, emits a `console.warn` listing the conflicting alternative so support and operators can spot ambiguous links, and then rewrites the browser URL to a single `booking_reference` query param while removing `bookingReference`, `ref`, and hash sources after load.
  - update: synced `docs/development/full-stack-review-2026-04-26.md` and `docs/architecture/bookedai-master-roadmap-2026-04-26.md` Tier 2 sections to mark `FX-2`, `FX-5`, `FX-7` as closed with the implementation summary; `FX-1`, `FX-3`, `FX-4`, `FX-6` remain open and will be picked up in Sprint 20.
  - verification: `npm --prefix frontend exec tsc -- --noEmit`; `cd frontend && npx playwright test tests/portal-enterprise-workspace.spec.ts --workers=1 --reporter=line` (`6 passed`); `npm --prefix frontend run build`; `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh` passed with frontend smoke lanes, tenant smoke (`3 passed`), backend unittest (`52 tests OK`), and search eval (`14/14`); `python3 scripts/telegram_workspace_ops.py deploy-live`; `bash scripts/healthcheck_stack.sh`; live portal smoke confirmed `bookingReference` + `ref` + hash rewrote to `?booking_reference=v1-db55e991fd`, cleared hash, warned on conflict, and loaded the booking workspace.
