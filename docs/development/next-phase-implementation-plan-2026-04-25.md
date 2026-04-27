# BookedAI Next Phase Implementation Plan

Date: `2026-04-25`

Status: `active implementation plan`

## Purpose

This plan converts the completed full-flow QA and connected-agent work into the next executable delivery phases for BookedAI.

It should be read with:

- `project.md`
- `prd.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/development/full-stack-review-2026-04-26.md`

## Current Release Baseline

The latest verified baseline is:

- product requirement message: `BookedAI connects every customer message - WhatsApp, SMS, Telegram, email and web chat - into one AI Revenue Engine that captures intent, creates booking paths, supports payment and receivable follow-up, and records customer-care actions with operator-visible revenue evidence.`
- upgraded market-facing message: `BookedAI turns missed service enquiries into booked revenue. It captures intent across chat, calls, email, web, and messaging apps, then helps book, follow up, track payment posture, and show operators what revenue was won or still needs action.`
- investor/judge message: `BookedAI is an AI Revenue Engine for service businesses: an omnichannel agent layer that captures intent, creates booking references, tracks payment and follow-up posture, and records every revenue action in an auditable operating system.`
- this requirement extends the current Messaging Automation Layer into the roadmap plan: customer messages must normalize into Inbox/conversation events, resolve intent and booking identity through one booking-care policy, then trigger booking, payment, follow-up, and retention side effects through auditable workflow/action records
- pitch package registration completes from `pitch.bookedai.au` through `/register-interest`
- product booking completes from `product.bookedai.au` through search, match, booking intent, payment intent, and communication best-effort work
- booking success now shows a portal-first Thank You state that stays visible until the customer chooses another action; the homepage booking flow no longer auto-returns to the main BookedAI screen
- portal auto-login for valid `v1-*` booking references is now part of the live release baseline: `portal.bookedai.au/?booking_reference=...` must render the booking workspace, not only the reference in an error state
- reviewed chess tenant search now has an explicit design contract: tenant-backed results stay in the normal shortlist, show verified BookedAI tenant capability chips, and continue into booking/payment/QR/calendar/email/WhatsApp/portal only after an explicit `Book` action
- public/product search cards now require top-left thumbnail/preview treatment, Google Maps actions for physical places, faster staged progress copy, and early-match visibility while deeper checks continue
- homepage shortcut search now has a fast-preview contract for proof verticals: exact Future Swim, Co Mai Hung Chess, and WSTI AI Event prompts should show relevant catalog/shortcut results immediately while deeper live ranking continues, without bypassing the near-me location guardrail
- the homepage customer-facing agent now keeps a visible chat thread and can spawn revenue-ops handoff actions after booking
- the default BookedAI email sender and support fallback for bookedai.au flows is `info@bookedai.au`, including SMTP username/From defaults when explicit env overrides are omitted
- the legacy homepage/product service booking session path now follows that same mailbox rule: public service bookings use `BOOKING_BUSINESS_EMAIL` / `info@bookedai.au` for customer confirmation copy, internal lead notification, follow-up links, response contact email, and workflow metadata; tenant-owned catalog emails are used only as internal CC recipients and tenant notification context
- confirmation email HTML rendering is now part of the security baseline: customer/provider-controlled confirmation values are escaped before entering HTML, and confirmation CTA URLs must be `http` or `https` before rendering into the action link
- provider URLs returned through Messaging Automation service-search are now part of the same security baseline: Telegram controls and chat-compatible responses only carry `http` or `https` provider URLs, with unsafe provider links omitted or falling back to BookedAI-owned handoff URLs
- tenant-owned service bookings should notify tenants through the Messaging Automation Layer, with Telegram tenant delivery as the first default channel and queued/manual-review posture when a tenant has not configured a Telegram chat id yet
- the revenue-ops action ledger has admin visibility, dispatch, transition, and evidence inspection seams
- the pitch and roadmap now visualize the implementation sequence and system architecture directly: `customer surfaces -> AI agents -> booking core -> operations truth`, plus Phase/Sprint `17-23` in the public roadmap dataset
- production deploy and stack health checks passed after the full-flow release gate

## Content, Wording, Launch, And Email Workstream

This plan now includes a cross-phase workstream for content, wording, document structure, launch readiness, and lifecycle email. This workstream does not create a new phase; it shapes the artifacts and acceptance gates inside Phase `17-23`.

### Message baseline

Use this customer-facing sentence when rewriting public copy or planning docs:

`BookedAI turns missed service enquiries into booked revenue. It captures intent across chat, calls, email, web, and messaging apps, then helps book, follow up, track payment posture, and show operators what revenue was won or still needs action.`

Use the sharper SME line for first-view hero, ad, outreach, and short deck moments:

`Never lose a service enquiry to slow replies again. BookedAI turns chats, calls, emails, and website visits into confirmed booking paths, payment follow-up, and customer care.`

Use the investor/judge line when explaining why this can become a big startup or platform company:

`BookedAI is an AI Revenue Engine for service businesses: an omnichannel agent layer that captures intent, creates booking references, tracks payment and follow-up posture, and records every revenue action in an auditable operating system.`

The financial story must stay visible in pitch and roadmap artifacts: setup fee, SaaS subscription, and performance-aligned commission or revenue share on booked revenue where appropriate; revenue claims must be backed by booking references, payment posture, portal reopen, tenant Ops, and audit/action evidence.

### Document structure baseline

Each requirement or execution document should now follow:

1. customer problem
2. target segment and current proof vertical
3. promise and measurable outcome
4. shipped baseline
5. next workflow
6. phase/sprint owner
7. acceptance gate
8. launch, lifecycle email, support, Notion/Discord closeout

### Phase-specific content jobs

- `Phase 17`: rewrite public/product/portal/tenant copy for clarity, mobile scanability, customer-safe degraded states, and proof-first layout.
- `Phase 18`: explain revenue-ops ledger work as `what needs action, what happened, and what is safe to retry`, not as internal queue mechanics.
- `Phase 19`: make BookedAI Manager Bot copy channel-native, short, identity-safe, and explicit about request-safe follow-up.
- `Phase 20`: prepare widget install copy around `capture, book, confirm, reopen portal` with origin/tenant trust language.
- `Phase 20.5`: frame wallet/Stripe return as continuity for the customer, not as payment plumbing.
- `Phase 21`: explain billing and receivables as owner-visible revenue truth, reminder posture, and reconciliation.
- `Phase 22`: package chess, Future Swim, and event flows as repeatable vertical launch templates with content checklists.
- `Phase 23`: make release-gate evidence readable to operators: what was tested, what passed, what is held, and who owns the next action.

### Launch and content cadence

- soft launch each proof vertical with UAT screenshots, booking reference proof, portal reopen proof, and operator closeout
- convert only validated proof into external launch copy, short video/demo, register-interest CTA, and email sequence
- keep one primary content platform plus owned email before adding paid acquisition
- use PR-style working-backwards summaries for major external stories, but keep claims tied to shipped proof

### Lifecycle email baseline

The first email plans should cover:

- SME/operator welcome and catalog readiness
- booking customer confirmation and portal revisit
- abandoned booking or incomplete payment recovery
- tenant weekly revenue proof and unresolved action summary
- support escalation and manual-review status

Before any Mailchimp or external automation is considered live, document the segment, trigger, subject, preview text, CTA, event tags, and revenue attribution fields.

### Experiment template

Every new wording or content test must state:

`At least X% of Y will do Z within T after seeing the change.`

Required fields: audience, channel/page, variant, metric, threshold, hold condition, owner phase, and evidence path.

## 2026-04-26 Urgent Execution Lock

This plan now has three urgent tracks that must be treated as the next practical delivery order.

### Track 1 - UI/UX stabilization

Goal:

- make every high-traffic surface feel coherent, scan-friendly, mobile-safe, and commercially credible before widening features.

Immediate work:

- keep homepage, product, pitch, tenant, portal, and admin first screens readable at mobile, tablet, and desktop widths
- remove clipped panels, accidental horizontal overflow, duplicate hidden text that breaks accessibility checks, and implementation-style copy that customers should not see
- keep search loading progressive with early useful results, staged status, and skeleton cards instead of blank or spinner-only waiting
- keep result cards compact but inspectable: thumbnail/preview, location/price/duration posture, confidence/fit summary, maps/provider/detail actions, and explicit `Book`
- keep portal and tenant workspaces status-first: customers and tenants should understand booking/payment/support/automation state before seeing deep diagnostics

Exit gate:

- Playwright smoke for public/product/tenant/portal/admin at `390px` and desktop, no horizontal overflow, no console/page/request failures for app-owned paths, and accessible names for primary actions.

### Track 2 - Standard booking flow

Goal:

- preserve one canonical customer journey across website, product, widget, Telegram, WhatsApp, and portal.

Canonical journey:

- `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`

Immediate work:

- `Ask`: customer can start from homepage/product/widget/chat/channel with natural language or shortcut prompt
- `Match`: BookedAI returns tenant/catalog/internet-assisted candidates with source posture and location guardrails
- `Compare`: customer can inspect results, maps, provider details, price/duration posture, and fit explanation without accidentally booking
- `Book`: customer details open only after explicit `Book`, and the system records contact, lead, booking intent, booking reference, payment posture, and tenant/runtime context
- `Confirm`: Thank You state remains visible, includes reference, QR, portal auto-login link, copy actions, calendar/email/chat options, and clear manual-review states when downstream providers degrade
- `Portal`: `portal.bookedai.au/?booking_reference=...` must hydrate the booking workspace for valid references and keep request-safe action states
- `Follow-up`: revenue-ops handoff, tenant notification, customer email, messaging reply, CRM/payment/calendar actions, and audit records run best-effort without claiming completion when queued/manual-review

Exit gate:

- one fresh live booking can be created, reopened in portal, answered by care-turn, and traced through action/audit/notification posture without breaking the customer UI.

### Track 3 - Messaging Automation Layer

Goal:

- make all customer messages flow through shared policy instead of channel-specific business logic.

Immediate work:

- keep website chat on `/api/chat/send` and Telegram on `/api/webhooks/bookedai-telegram`; keep compatibility aliases only where needed
- keep `BookedAI Manager Bot` separate from OpenClaw/operator Telegram and deny repo/deploy/host authority to customer-facing agents
- normalize Telegram, WhatsApp, web chat, portal care, tenant notification, and later SMS/email into Inbox/conversation events
- resolve booking identity only by explicit booking reference, signed portal context, or safe single email/phone match
- answer booking/payment/support/status questions from portal and action-ledger truth
- queue reschedule/cancel/payment-help/support/plan-change requests as audited side effects instead of pretending instant mutation
- surface provider delivery states honestly: sent, queued, failed, manual-review, or unconfigured

Exit gate:

- Telegram, WhatsApp, website chat, and portal care fixtures exercise the same booking-care policy; unsafe identity or unsupported actions ask for reference/escalate instead of exposing data or faking completion.

## 2026-04-26 Cross-Stack Review Integration

The seven-lane review captured in `docs/development/full-stack-review-2026-04-26.md` adds the following delta to each active phase. The phase boundaries themselves do not change; only the explicit P0/P1 backlog and the activated A/B experiments are added.

### Delta for Phase 17 — Full-Flow Stabilization

- `P0-1` portal `GET /api/v1/portal/bookings/v1-{ref}` snapshot path returns `500` for fresh `v1-*` references; harden the snapshot builder, add a structured error envelope, ensure CORS on error paths
- `P1-1` complete the authenticated tenant write-path UAT (catalog edit, billing activation, team controls) after the email-code login round-trip
- `P1-7` accessibility and mobile breakpoint debt: local implementation now links phone field guidance via `aria-describedby` and converts the admin booking table into responsive cards below `720px`; full product regression rerun remains required before live promotion
- `P1-8` add Playwright coverage for `frontend/src/apps/public/PitchDeckApp.tsx` at desktop and `390px` mobile
- `P1-9` closed live on `2026-04-26`: `backend/migrations/sql/020_future_swim_miranda_booking_url_hotfix.sql` was applied to the Future Swim Miranda row after pre-check confirmed the old branch URL returned `404`; live catalog now points to `https://futureswim.com.au/locations/`
- A/B activation: `AC-1`, `AC-2`, `AC-3`, `BC-1`, `BC-3`, `BC-4`, `RT-1`, `RT-2`, `RT-3`

### Delta for Phase 18 — Revenue-Ops Ledger Control

- preserve the existing P18 deliverables; layer the tenant-id query validator from `Phase 22` plan onto the action ledger queries when the validator ships, so no new ledger code can be merged without tenant scoping
- ledger evidence drawers should now expose webhook idempotency state; P0-4 route-level idempotency and the additive evidence indexes are live, while the operator evidence drawer remains the carried UI follow-up

### Delta for Phase 19 — Customer-Care And Status Agent

- `P0-2` resolve the WhatsApp provider posture: either complete Meta Cloud business registration for `+61455301335` or document Twilio as the active default with a sandbox-vs-production matrix
- `P0-3` enforce Telegram's official webhook secret-token verification for `/api/webhooks/telegram` and `/api/webhooks/bookedai-telegram`, and add HMAC-SHA256 verification for the Evolution webhook when `WHATSAPP_EVOLUTION_WEBHOOK_SECRET` is configured
- `P0-4` route WhatsApp, customer Telegram, and Evolution through the shared `webhook_events`/`idempotency_keys` gate; code, duplicate-event tests, and additive evidence indexes are live, with Telegram customer UAT and the operator evidence drawer carried
- `P0-5` closed live: `_resolve_tenant_id` rejects any `actor_context.tenant_id` that does not match the authenticated tenant session, and live smoke returned `403`
- `P1-2` ship inline action controls on WhatsApp outbound replies and align the sender identity to `BookedAI Manager Bot`
- `P1-3` closed locally: WhatsApp webhook tests now mirror Telegram coverage for identity-gate, queued cancel, queued reschedule, and Internet expansion
- `P1-10` make customer-facing email templates channel-aware so support copy names `info@bookedai.au` and the available chat channel
- A/B activation: `CH-1`, `CH-2`, `CH-3`, `CH-4`, `CH-5`
- schema delta: add `location_posture` to the chat response shape and propagate through web, Telegram, WhatsApp; this unlocks `BC-1`

### Delta for Phase 20 — Widget And Plugin Runtime

- precondition: `P0-3` and `P0-5` are live; `P0-4` code/indexes are live but still needs Telegram customer UAT and evidence-drawer surfacing; `P1-2` remains open before the widget runtime can extend the same shared messaging policy to embedded surfaces
- when shipping the widget, reuse the same A/B telemetry contract documented in `docs/development/full-stack-review-2026-04-26.md` so embed-mode experiments do not require a separate analytics path

### Delta for Phase 20.5 — Confirmation Wallet And Stripe Return Continuity

- pair the wallet pass and Stripe `success_url` work with `BC-2` (confirmation hero payment-state badge); the visual posture clarifies which payment state is active when the pass downloads or the Stripe return resolves

### Delta for Phase 21 — Billing, Receivables, And Subscription Truth

- ship the `Tenant Revenue Proof` dashboard (investor-only or limited tenant access) as the first new surface; this is the bridge artifact the seven-lane review identified as the missing investor signal
- ship pricing and commission visibility inside the tenant workspace: current plan, commission rate, and billing history must be on screen, not only documented
- preserve the audited reminder/recovery action posture; do not introduce instant-completion claims on receivable actions

### Delta for Phase 22 — Multi-Tenant Template Generalization

- `P1-4` split `backend/service_layer/tenant_app_service.py` into `tenant_overview_service`, `tenant_billing_service`, `tenant_catalog_service` and add direct unit-test coverage for each snapshot builder
- `P1-5` move the remaining `session.execute(text(...))` raw SQL out of `backend/api/route_handlers.py` into repository read models so the documented API → repository → service boundary holds
- add a `BaseRepository` validator that fails any tenant-scoped query missing a `tenant_id` filter, then run a chaos test to confirm the validator catches drift
- ship the SMS adapter at `/api/webhooks/sms` reusing the shared identity/mutation policy

### Delta for Phase 23 — Release Governance And Scale Hardening

- `P0-6` add `.github/workflows/ci.yml` covering lint, type-check, backend unit tests, frontend build, and image build, plus branch protection on `main`
- `P0-7` expand `.env.production.example` to mirror `.env.example` with explicit `required` vs `optional` markers and add a checksum/diff guard to `scripts/deploy_production.sh`
- `P0-8` closed live on `2026-04-26`: drop OpenClaw root by default, remove default hostfs/Docker-socket mounts, remove full host actions from the default Telegram vocabulary, document the operator boundary in `deploy/openclaw/README.md`, recreate the live OpenClaw stack, and verify gateway health plus reduced-authority operator smoke
- `P1-8` closed locally on `2026-04-26`: add pitch deck Playwright coverage for desktop investor view, `390px` mobile containment, no horizontal overflow, and refreshed video source; promote with the next frontend release gate
- `P1-6` separate the production beta runtime tier from the production database, then push backend and frontend images to a registry (`git-sha` plus `latest` tags) so rollback is a tag swap rather than a rebuild
- bring up Prometheus, Grafana, and AlertManager with a documented alert path through Discord, then add PagerDuty (or equivalent) for `5xx` rate, DB offline, and disk pressure
- the release-gate checklist must record the new webhook signature, idempotency, and tenant_id validator gates as required for promote
- the release-gate checklist must record the documentation-sync gate against `docs/development/full-stack-review-2026-04-26.md` so closeouts do not drift away from the seven-lane backlog

## Detailed Phase Execution Matrix

| Phase | Delivery objective | First execution steps | Required proof |
| --- | --- | --- | --- |
| `17` | Full-flow stabilization | close UI/UX defects, standardize result cards, keep confirmation/portal handoff stable, rerun mobile/desktop smoke | public/product/tenant/portal/admin smoke, booking-to-portal reference proof, no overflow |
| `18` | Revenue-ops ledger control | finish filters, evidence drawers, tenant Ops visibility, dispatch idempotency, manual-review posture | action-run tests, admin Reliability trace, tenant Ops explanation |
| `19` | Customer-care/status agent | expand shared messaging policy, harden Telegram/WhatsApp/web/portal identity, queue safe requests, tenant notifications | channel fixtures, webhook tests, safe identity tests, live customer bot smoke |
| `20` | Widget/plugin runtime | build tenant/origin-scoped embed shell, install diagnostics, CORS tests, shared booking/payment/portal contract | one tenant widget can search/book/confirm/reopen portal |
| `20.5` | Wallet and Stripe return continuity | wallet pass generation, booking-aware Stripe success URL, portal auto-login self-test | test charge returns to booking context, wallet pass downloads, portal smoke evidence |
| `21` | Billing/receivables/subscription truth | link invoices/payment states, reminder actions, tenant billing summary, admin reconciliation | no overstated payment state, reminder replay safety, reconciled summaries |
| `22` | Multi-tenant templates | extract chess/Future Swim/event policies, channel playbooks, vertical smoke fixtures | at least three verticals reuse the same lifecycle contracts |
| `23` | Release governance/scale hardening | make capture-to-retention release gate mandatory, evidence packs, docs/memory/Notion/Discord closeout | release gate blocks regressions and records operator-ready proof |

## Phase 17 - Full-Flow Stabilization

Objective:

- keep pitch, product, demo, portal, tenant, admin, and API flows stable as one connected revenue engine

Deliverables:

- preserve the `search -> match -> book -> pay/prepare payment -> follow up -> Thank You -> stay-on-confirmation` customer journey; auto-redirect from Thank You back to homepage is removed so the customer keeps the QR/portal handoff in view until they choose to leave
- preserve results-first search behavior, including reviewed tenant matches; tenant matches may show richer verified capability chips but must not auto-jump to booking
- preserve result-card inspection basics: thumbnail/preview, direct or fallback Google Maps, provider/detail actions, early-match rendering, and chat-based refinement prompts
- preserve portal-first tenant confirmation: booking reference, QR to `portal.bookedai.au`, Stripe/QR/manual payment posture, email/calendar actions, WhatsApp Agent follow-up, and portal review/edit/reschedule/cancel links
- product-app surface (`product.bookedai.au`) must use a single scrollable column with progressive disclosure: chat-first welcome state, animated multi-stage search progress (no static spinner) with skeleton placeholder cards, booking form revealed only after a result is selected, and confirmation hero only after submit; bottom-sheet drag/overlay behaviors must stay removed
- the booking confirmation hero must surface QR + portal auto-login as the primary action: enlarged scannable QR (≥ `128px`), `Open booking portal` link, copy-to-clipboard on booking reference and portal link, `Save PNG` download for the QR image, and an explicit `Auto-login link with reference` chip so the customer understands the link carries identity
- QR codes must be generated in-process via the `qrcode` npm package (`frontend/src/shared/utils/qrCode.ts`), not via the third-party `api.qrserver.com` runtime call, so confirmation does not depend on external service availability; the legacy URL stays as the fallback path only
- preview/details popup must render as a true viewport-level modal (`fixed inset-0`) with internal scroll so long content stays inspectable without being clipped by the parent panel
- keep package registration resilient when calendar, Stripe, event-store, or dual-write side effects degrade
- keep public booking confirmation immediate while downstream automation runs best effort
- maintain compact mobile UI for package boxes, result cards, forms, and action controls; product-app mobile must not have a fixed bottom bar that overlays content
- keep the pitch architecture visual current whenever the agent, booking, tenant/admin, or integration boundaries change
- remove the dead product bottom-sheet code that backed the previous overlay UX (`productSheetDragOffset`, `productSheetDragStateRef`, `handleProductSheetPointer*`, `isCompactProductBottomBarVisible`, `thankYouReturnCountdown`, and the `productBookingSheetPeek/Half`, `productSheetVisibleHeight`, `productSheetOpenRatio`, `compactProductFooterOffset` calculations) and keep the assistant component free of the old swipe/auto-redirect behavior

Acceptance gates:

- backend booking tests pass
- backend portal route tests pass, including degraded optional payment/audit/academy lookup coverage for public `v1-*` booking references
- frontend production build passes
- live browser smoke reaches Thank You and stays on the QR/portal hero (no automatic homepage redirect)
- live portal auto-login smoke passes for a freshly created booking reference with `booking_loaded=true`, no error state, and no browser console errors
- `2026-04-26` production fix verified this against `v1-2fd9f35965`: portal detail and care-turn returned `200`, the browser workspace loaded without console errors, and `390px` mobile overflow stayed `0`
- preview popup opens with full content visible and scrollable on `390px` mobile and tablet widths
- product-app stepper completes the search progression and a placeholder skeleton row is visible while results stream in
- copy-to-clipboard for booking reference and portal link succeeds in production browsers; QR PNG download produces a valid file with the booking reference in its name
- no horizontal overflow on pitch, product, demo, or registration mobile views

Mobile UAT verification (must run on at least one real device per family before promotion):

- iOS Safari at `390px`: sticky composer behaves with software keyboard, scrollable chat does not lose position when keyboard opens, QR card stays inside viewport on landscape
- Android Chrome at `360px`: bottom safe-area insets are respected, no fixed-position chrome covers the booking form, modal preview can be dismissed by tapping the backdrop
- iPadOS Safari (split view): the dialog is centered, side-by-side desktop grid kicks in at the right breakpoint, and the QR/portal block does not push booking form below fold without user scroll

## Phase 18 - Revenue-Ops Ledger Control

Objective:

- make post-booking revenue operations inspectable, dispatchable, and tenant/admin-safe

Deliverables:

- expand action-run filters by tenant, booking, student/customer, lifecycle event, status, and dependency state
- add tenant-facing visibility for queued, sent, failed, manual-review, and completed actions
- add operator evidence drawers for outbox, audit, job-run, CRM, payment, and webhook traces
- require policy metadata for auto-run versus approve-first actions

Acceptance gates:

- action queue tests cover dispatch, transition, idempotency, and degraded provider states
- admin Reliability can show the complete handoff chain for a booking
- tenant workspace can explain what BookedAI did after a lead or booking event

Implementation status from `2026-04-25`:

- `GET /api/v1/agent-actions` now supports deeper ledger filters for entity type, entity id, agent type, dependency state, and lifecycle event
- ledger responses now include summary counts for the current tenant/filter scope
- `GET /api/v1/tenant/integrations` now includes a tenant automation connection plan for platform messaging, CRM write-back, webhook/workflow automation, customer-care state, action routes, dispatch endpoints, and guardrails
- `POST /api/v1/tenant/operations/dispatch` now gives signed tenant admins/operators a tenant-scoped way to run policy-gated queued revenue-ops actions
- ledger responses now expose derived lifecycle event, dependency state, policy mode, approval requirement, and evidence summary fields so surfaces do not need to parse raw JSON first
- admin Reliability exposes entity, dependency, and lifecycle filters plus policy/evidence summary on action cards
- tenant workspace now has an `Ops` panel for read-only tenant visibility into follow-up, reminder, CRM, customer-care, and webhook actions, including event/policy/evidence posture

## Phase 19 - Customer-Care And Status Agent

Objective:

- let returning customers ask about bookings, payments, subscriptions, reports, and support state without losing lifecycle context
- turn WhatsApp, SMS, Telegram, email, and web chat into one customer-message intake layer for the AI Revenue Engine

Deliverables:

- one normalized message envelope for WhatsApp, SMS, Telegram, email, and web chat, stored in Inbox/conversation events with channel, customer, tenant, booking-reference, and consent/window metadata
- identity resolution by email, phone, booking reference, and signed portal session
- intent capture for booking, payment help, reschedule/cancel, follow-up, support escalation, and retention signals
- status answers backed by booking, payment, subscription, report, communication, and action-run truth
- safe request flows for reschedule, pause, downgrade, cancel, payment help, and human escalation
- channel reply policy that keeps customer chat concise while moving evidence, audit, and operator detail into portal/admin surfaces
- chess academy parent status flow as the first complete proof case

Acceptance gates:

- Telegram, WhatsApp, SMS/email/web-chat fixtures can enter the same service contract without channel-specific business logic forks
- portal and assistant can reopen the same booking/student lifecycle state
- unsupported actions escalate instead of pretending completion
- support answers cite current state and next step without exposing another tenant's data

Implementation status from `2026-04-25`:

- `POST /api/v1/portal/bookings/{booking_reference}/care-turn` now gives the portal a first booking-reference anchored customer-care status turn
- portal care replies use booking status, payment posture, support contact, academy/report context, recent revenue-ops action runs, and enabled portal actions as the response basis
- `portal.bookedai.au` now includes a customer-care status agent card so returning customers can continue asking about payment, reschedule, class/report status, pause/downgrade/cancel, or support escalation in the same booking workspace
- explicit human-support, escalation, urgent, or broken payment-link messages in the portal care turn now queue a `support_request` through the existing portal audit/outbox path
- admin Billing Support now includes `portal.support_request.requested` in the same review/escalation queue as reschedule and cancel portal requests
- the care-turn response includes `created_request`, allowing the portal UI to show customers when their AI-assisted support case has actually been queued
- unsupported or incomplete lifecycle changes remain request-safe next actions or escalation paths rather than simulated instant mutations

Implementation status from `2026-04-26`:

- the Phase 19 channel layer now has a shared `MessagingAutomationService` that sits behind channel webhooks and owns the booking-care policy: conversation window, safe identity resolution, booking-intake reply, portal-grounded status answer, and request-safe workflow trigger
- website chat now uses `POST /api/chat/send` as the direct BookedAI AI Engine entrypoint, while Telegram uses `POST /api/webhooks/telegram` or `POST /api/webhooks/bookedai-telegram` and replies through Telegram `sendMessage`
- website demo/product chat is allowed to search all BookedAI catalog data plus Internet/public-web expansion; Telegram can search/chat like the website but remains a private customer-thread path where booking details are loaded only by booking reference or safe phone/email identity
- the customer-facing agent name is `BookedAI Manager Bot`; Telegram should use display name `BookedAI Manager Bot` and preferred username `@BookedAI_Manager_Bot`
- the default customer booking support identity for BookedAI-managed channels is `info@bookedai.au` plus `+61455301335`, with the phone available for Telegram, WhatsApp, or iMessage; provider contact details can remain in catalog data but should not override the BookedAI support fallback in customer-booking handoffs
- Telegram is now the preferred first rollout channel for the generalized customer messaging automation path: configure `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN`, optionally configure `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN`, and point the customer Telegram Bot API webhook at `https://api.bookedai.au/api/webhooks/bookedai-telegram`
- this customer Booking AI Agent is separate from OpenClaw and the operator Telegram path used to program, test, deploy, or administer the repo; the customer bot must not inherit `BOOKEDAI_TELEGRAM_*` operator trust, repo-write, host-shell, or OpenClaw permissions
- Telegram inbound updates are stored in the BookedAI Inbox event stream as `telegram_inbound`, answered through the same AI booking-care policy as WhatsApp, and can queue the same audited cancellation/reschedule requests when a booking is safely resolved
- Telegram now covers the first service-search and chat-booking slice: search/discovery messages query active catalog records and return compact top options plus native inline controls for full results, per-option view, per-option book, and Internet expansion; results are stored in the same `bookedai_chat_response` shape as bookedai.au chat, and `Book 1` callbacks/messages with contact details create a real contact, lead, booking intent, booking reference, and portal continuation
- Telegram shortlist/session continuity is now backed by `messaging_channel_sessions`, and operator health for the customer booking agent is available at `/api/customer-agent/health` and `/api/admin/customer-agent/health`; `scripts/customer_agent_uat.py` is the repeatable UAT lane for web chat plus Telegram webhook/callback probes
- when a Telegram customer already has a safely resolved booking and asks to search for another option, the bot must first ask how to handle the current booking, expose the current `https://portal.bookedai.au` order and QR link, then let the customer keep the booking while searching BookedAI.au or Internet options and return to the old order from the Telegram menu
- Telegram customer messages should prefer Telegram-native HTML rich text plus inline keyboards for normal bot replies; service results, order continuity, and booking handoffs should read like compact action cards, with plain text reserved as fallback
- WhatsApp inbound processing now uses the same messaging service instead of its own embedded route policy, preserving current Twilio/Meta/Evolution payload support while making the channel logic reusable for SMS, Apple Messages, and email later
- the portal IA now has a default `status_first` experiment with the customer-first action order `Status -> Pay -> Reschedule -> Ask for help -> Change plan -> Cancel`, while `portal_variant=control` keeps the previous action taxonomy available for comparison
- portal funnel telemetry records lookup, booking-loaded/failure, action navigation, request composer, request submission, and care-turn outcomes into local event memory, optional `dataLayer`, and a browser custom event so investor/SME UAT can compare behavior without adding an analytics vendor
- dedicated `Pay`, `Ask for help`, and `Change plan` states make payment support, human/agent help, and academy plan changes explicit; pause and downgrade continue to queue auditable review requests rather than instantly mutating records
- focused portal Playwright coverage now verifies status-first order, event emission, reschedule submission, and mobile no-overflow behavior
- WhatsApp is now the first live channel attached to Phase 19 customer-care behavior
- WhatsApp should be treated as the dedicated `BookedAI WhatsApp Booking Care Agent` for `bookedai.au`: it answers all service questions tied to an already-booked record and uses OpenClaw as the safe gateway/operator supervision surface, not as customer-visible chat copy
- the OpenClaw agent contract is repo-owned at `deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json` and syncs into the live OpenClaw runtime `agents/` directory with `python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent`
- the configured BookedAI WhatsApp identity is the main support number `+61455301335`, paired with `info@bookedai.au` for email confirmation and support continuity
- `/api/webhooks/whatsapp` still accepts the configured Twilio form payload and Meta JSON payload, but now also runs a customer-care response when the backend communication service is available
- booking identity resolution prefers a booking reference in the WhatsApp message, then falls back to the sender phone or email only when exactly one booking is found
- the response is generated from `build_portal_customer_care_turn`, so the answer uses portal booking, payment, support, academy/report, and action-run truth
- clear WhatsApp cancellation and reschedule messages queue the same portal request records as `portal.bookedai.au`, preserving audit/outbox behavior and manual-review guardrails
- WhatsApp-driven cancel/reschedule requests now run lifecycle follow-through: customer email confirmation is sent or recorded, CRM gets a task mirror through lifecycle email sync, and tenant bookings expose a recent request queue for dashboard visibility
- ambiguous or unresolved identity asks the customer for a booking reference instead of exposing booking detail
- OpenClaw/Telegram operators can now run `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status` to verify the customer WhatsApp bot surface without sending a message: OpenClaw gateway, backend API health, WhatsApp provider status, and webhook verify-route reachability are checked in one read-only command
- OpenClaw runtime approval repair now has a repo-owned operator command: `python3 scripts/telegram_workspace_ops.py fix-openclaw-approvals` aligns `tools.exec.ask` plus host `exec-approvals.json` to `on-miss` when `allow-always` fails under an effective `ask: always` policy
- OpenClaw trusted full-control posture now has a repo-owned operator command: `python3 scripts/telegram_workspace_ops.py enable-openclaw-full-access` gives `bot.bookedai.au` webchat and trusted Telegram operators full elevated exec/no-approval behavior, with `--telegram-open` reserved for deliberately public Telegram control
- `2026-04-26` outbound follow-up narrowed the live blocker to the Evolution QR-session layer: backend sendText payload handling now supports the current Evolution v2 `text` contract with a guarded legacy retry, but live probes still queue replies because instance `bookedai61481993178` is `connecting` instead of `open`
- Phase 19 readiness now requires both backend/webhook health and an open Evolution bridge when the personal WhatsApp fallback is part of the delivery path; `whatsapp-bot-status` should report attention required until the WhatsApp session is reconnected
- later on `2026-04-26`, the operator asked to temporarily remove Evolution from outbound delivery; the live path is now Meta/WhatsApp Cloud primary with Twilio fallback, and direct probes show Meta send blocked by `Account not registered` plus Twilio blocked by `401 Authenticate`
- Phase 19 direct-provider readiness therefore now depends on completing Meta/WhatsApp Cloud registration for the BookedAI number or repairing the Twilio WhatsApp credential/sender posture
- the latest operator preference makes Twilio the default and only active WhatsApp chat transport for now (`WHATSAPP_PROVIDER=twilio`, no fallback), so further bot send tests should validate Twilio first rather than Meta or Evolution

## Phase 20 - Widget And Plugin Runtime

Objective:

- make the BookedAI customer-facing agent installable on SME-owned websites while preserving shared platform truth
- make web chat another first-class intake channel into the same AI Revenue Engine rather than a separate website chatbot

Deliverables:

- widget deployment identity for tenant, host origin, page source, campaign, and install mode
- embed-safe assistant shell for receptionist, sales, and customer-service entry
- shared booking, payment, portal, and revenue-ops handoff contracts
- web-chat conversation events that reuse the Phase 19 normalized envelope and can be compared with WhatsApp, Telegram, SMS, and email journeys
- tenant install instructions and admin validation diagnostics

Acceptance gates:

- at least one tenant-branded widget can complete search, booking, Thank You, and portal continuation
- origin and tenant scoping are visible in logs and action runs
- cross-origin behavior is covered by CORS and browser smoke tests

## Phase 20.5 - Confirmation Wallet And Stripe Return Continuity

Objective:

- extend the post-booking handoff so the customer can carry the booking outside the browser tab and the payment loop returns the customer to a context-aware state rather than dumping them on the homepage

Deliverables:

- Apple Wallet `.pkpass` and Google Wallet pass generation for confirmed bookings, anchored on the booking reference and tenant brand, with a `Save to wallet` button on the confirmation hero next to the existing QR and copy controls
- Stripe checkout `success_url` should resolve to a booking-aware return URL (for example `https://product.bookedai.au/booking/{booking_reference}` or `https://portal.bookedai.au/?booking_reference=...`) so the customer lands back inside the booking story instead of the homepage
- portal auto-login verification: confirm that `https://portal.bookedai.au/?booking_reference={ref}` resolves a portal session for the matched booking without requiring the customer to type the reference again, and document the resolution path so support knows what to recreate when the link breaks
- a self-test command or smoke step that opens the auto-login URL, asserts the booking is bound to the session, and records evidence under `frontend/output/playwright/`

Acceptance gates:

- a Stripe-backed booking returns the customer to the booking-aware URL (not the public homepage) after a successful test charge
- a Wallet pass downloads from the confirmation card on iOS Safari and Android Chrome and opens correctly in the platform Wallet app
- portal auto-login smoke records a passing run with screenshots, JSON status, and reference-bound state

## Phase 21 - Billing, Receivables, And Subscription Truth

Objective:

- connect customer payment state, tenant billing posture, commission, and subscription renewal into one auditable commercial layer
- let the AI Revenue Engine collect or chase payment without overstating collection state

Deliverables:

- real subscription checkout and invoice linkage where supported
- payment reminder and receivable recovery actions
- payment-intent, invoice, QR/manual-payment, and failed-payment states that can be referenced safely from WhatsApp, SMS, Telegram, email, web chat, portal, tenant Ops, and admin Reliability
- tenant billing summaries for paid, outstanding, overdue, and manual-review revenue
- admin reconciliation views for payment dependency state and follow-up actions

Acceptance gates:

- payment and subscription states never overstate paid status
- receivable reminders are policy-gated and replay-safe
- tenant/admin revenue summaries reconcile to the same source records

## Phase 22 - Multi-Tenant Template Generalization

Objective:

- extract the chess and Future Swim proof paths into reusable tenant templates without weakening the first verticals.
- package capture, booking, payment, follow-up, and retention policy as reusable vertical templates

Deliverables:

- vertical template contracts for intake, placement, booking, payment, report, and retention policy
- channel playbooks per template for WhatsApp, SMS, Telegram, email, and web chat copy, escalation, retention nudges, and human handoff rules
- reusable verified-tenant search-result contract covering shortlist badge/chips, explicit booking consent, Stripe/QR payment posture, QR confirmation, WhatsApp Agent continuation, and portal change actions
- tenant-configurable copy and workflow settings for education, kids activities, wellness, trades, and professional services
- reusable smoke fixtures for each approved vertical
- migration notes for moving one-off demo logic into tenant-safe policy/config records

Acceptance gates:

- new verticals reuse the same lifecycle/action contracts rather than branching into custom-only code
- demo, product, and tenant flows can identify which template policy drove the visible behavior
- tests prove at least three vertical templates can reach booking and revenue-ops handoff

## Phase 23 - Release Governance And Scale Hardening

Objective:

- make deployment, QA, observability, rollback, and documentation sync boring and repeatable.

Deliverables:

- one release-gate suite covering pitch registration, product booking, demo academy flow, portal continuation, tenant workspace, admin ledger, and API health
- stronger trace ids from public session through booking, payment, action run, job run, and outbox
- documented rollback and hold criteria for public, backend, worker, and proxy changes
- Notion and Discord closeout automation for meaningful releases

Acceptance gates:

- release gate runs before production promotion
- failures identify the exact surface and lifecycle stage
- docs and memory are updated in the same closeout as code changes

Tenant proof polish note from `2026-04-26`:

- `tenant.bookedai.au` and `/future-swim` should stay in the Phase 23 release gate as public SaaS proof routes, including checks for the tenant email-code accessible name, buyer-facing access/trust metadata, Future Swim mobile overflow, and the compressed mobile detail disclosure.
- the root release gate now includes the `tenant-smoke` Playwright lane for the tenant gateway copy, create-account path, Google re-verification chooser, and email-code accessible-name regression; live Future Swim visual checks remain part of production smoke until a fully local preview fixture covers tenant workspace data.
- the root release gate now also includes Phase 23 backend security fixtures for confirmation email HTML escaping, provider URL allowlisting, private-channel identity policy, website chat entrypoint, Telegram webhook, and WhatsApp webhook behavior.

## Immediate Execution Order

1. Close the urgent UI/UX stabilization pass across homepage, product, tenant, portal, and admin: mobile no-overflow, accessible primary controls, progressive loading, customer-safe copy, and compare-first result cards.
2. Run and harden the canonical booking journey end to end: `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`, using one fresh booking reference as the trace anchor.
3. Finish the current Phase 19 Messaging Automation Layer consolidation: Telegram, WhatsApp, website chat, portal care, and tenant notification should share one policy for identity, booking care, request-safe actions, and provider delivery posture.
4. Complete Phase 18 ledger evidence gaps that block trust in follow-up automation: action filters, tenant Ops visibility, admin Reliability trace, dispatch idempotency, and manual-review clarity.
5. Promote Phase 20 widget/plugin runtime only after the core website/product booking path and messaging policy are stable enough to reuse without forking.
6. Promote Phase 20.5 and Phase 21 after booking/portal/messaging truth is reliable: Stripe return continuity, wallet pass, payment state, receivable reminders, tenant billing, and reconciliation.
7. Generalize into Phase 22 templates after chess, Future Swim, and WSTI/event proof paths remain green through release gates.
8. Fold each phase into Phase 23 release governance before broadening scope, with evidence for message intake, booking, payment, follow-up, retention, docs, memory, Notion, and Discord closeout.

## Sprint 19-22 Sprint-Level Execution Order (2026-04-26 review)

Inherits the canonical phase model above. Each sprint maps onto the existing `Phase 17-23` work with concrete P0/P1 owners and exit gates from `docs/development/full-stack-review-2026-04-26.md`.

- Sprint 19 (`2026-04-27 → 2026-05-03`) `Stabilize and Sign`: close the eight P0 items (`P0-1` to `P0-8`); ship `P1-7` (A11y phone helper, admin booking responsive); exit gate is portal `v1-*` UAT green, CI blocks failures, OpenClaw rootless.
- Sprint 20 (`2026-05-04 → 2026-05-10`) `First Real Revenue Loop`: close `P1-1`, `P1-2`, `P1-5`, `P1-9`; document one Future Swim revenue loop end-to-end; bring up observability stack; activate A/B `AC-1`, `RT-1`, `RT-3`, `CH-1`; publish v1 of the Commercial and Compliance Checklist.
- Sprint 21 (`2026-05-11 → 2026-05-17`) `Refactor and Coverage`: `P1-3` is already closed locally; close `P1-4`, `P1-6`, `P1-10`; keep `P1-8` live-promotion coverage in the frontend gate; add `location_posture` field unlocking `BC-1`; replace bare except blocks; tagged image rollback verified on staging.
- Sprint 22 (`2026-05-18 → 2026-05-24`) `Multi-tenant and Multi-channel`: tenant_id validator with chaos test; SMS adapter; Tenant Revenue Proof dashboard; pricing/commission visibility in tenant workspace; A/B wave 2 (`BC-2`, `CH-1`, `CH-3`); rate-limiting on remaining public endpoints; compliance terms updates from Sprint 20 audit.

## Verification Plan

Each phase must include:

- focused backend tests for API/repository/service behavior
- frontend build or typecheck for touched UI surfaces
- Playwright browser smoke for customer-visible flows
- live or preview smoke only after local tests pass
- docs, memory, roadmap, and implementation-progress updates before GitHub submission
