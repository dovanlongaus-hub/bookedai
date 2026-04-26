# Full-Stack Review and Next-Phase Plan

Date: `2026-04-26`

Status: `active execution input`

## Purpose

This document is the canonical synthesis of a seven-lane review (`architecture + UAT`, `frontend UI/UX`, `corporate/business`, `backend`, `API + integrations`, `DevOps`, `conversational chat`) executed on `2026-04-26` against the live BookedAI codebase and the synchronized planning set.

It exists to:

- record the cross-stack findings from the review pass in one place instead of scattering them across separate UAT, audit, and runbook notes
- map every P0 and P1 finding into the existing `Phase 17-23` execution model so no finding floats outside the active roadmap
- carry the proposed A/B testing matrix as a reusable input for `Phase 17` UI/UX, `Phase 19` messaging, and `Phase 21` billing
- give the next four sprints a sequenced execution plan with owners and exit criteria that fit the current sprint cadence

This document should be read alongside:

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/next-phase-implementation-plan-2026-04-25.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/implementation-progress.md`

## Top-level findings

The seven-lane review confirms three structural gaps that block the `AI Revenue Engine` narrative end-to-end:

1. `Portal continuity` is the central trust handoff for the canonical journey `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`, but recent UAT shows fresh `v1-*` references can return `500` on the portal snapshot path. Without this resolved, every other surface inherits a broken last mile.
2. `Tenant proof loop` is scaffolded but not yet revenue-evidenced. Future Swim, Co Mai Hung Chess, and AI Mentor are activated; what is missing is one closed lead-to-booking-to-payment-to-follow-up loop with documented metrics suitable for investor or SME reference.
3. `Channel parity` for the BookedAI Manager Bot is uneven: website chat and Telegram are policy-complete, while WhatsApp lacks inline action controls, lacks integration test coverage at parity with Telegram, and inbound webhooks still need full idempotency. Telegram secret-token verification exists, Evolution HMAC verification landed in Sprint 19 P0-3, and SMS/Apple Messages remain documented in `DESIGN.md` but have no adapter yet.

A fourth structural risk sits across `backend` and `DevOps`:

4. `Service-layer monolith and operational hygiene gaps`: `backend/service_layer/tenant_app_service.py` has grown to a single very large file with no direct unit tests; the API layer still executes raw SQL in `backend/api/route_handlers.py` instead of always going through repositories; `.env.production.example` is a stub vs the full `.env.example`; the production beta tier shares the production database; OpenClaw runs as `root` with the host Docker socket mounted; and there is no GitHub Actions CI gate on the main branch.

## Lane scorecards

### Lane 1 — Architecture and UAT

- portal `GET /api/v1/portal/bookings/v1-{ref}` snapshot path is returning `500` for fresh references in the last UAT pass; this is the highest-impact stabilization defect for `Phase 17`
- admin live UAT on `2026-04-26` is green for shell, navigation, and protected re-auth coverage
- tenant live UAT on `2026-04-26` is partial: preview shell, gateway copy, and Future Swim render correctly, but full authenticated write paths for tenant billing, tenant team, and tenant catalog edit are not yet covered
- homepage UAT and A/B baseline doc from `2026-04-25` is in place, but the assignment infrastructure and telemetry are not yet running for any A/B
- release-gate checklist is current but does not yet include search-replay green for the `tenant-positive` cohort as a hard gate at every promotion

### Lane 2 — Frontend UI/UX

- design-token usage and Apple-style baseline are consistent across `public`, `product`, `portal`, `tenant`, and `admin`; the unified source of truth lives in the minimal-bento template CSS
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` carries an accessibility risk: the phone field helper text is rendered as a sibling element and is not linked to the phone input via `aria-describedby`, so the field's accessible name does not include the `email or phone is required` guidance
- the admin bookings table sets `min-width: 860px` while the layout breakpoint sits at `720px`, so widths between `390px` and `720px` can force horizontal scroll on operator mobile sessions
- `frontend/src/apps/public/PitchDeckApp.tsx` has no Playwright regression coverage; investor-facing surface drift is silent
- the QR confirmation hero does not visually distinguish between Stripe checkout, QR transfer, and manual-review payment posture, so customers cannot tell what state the booking is in

### Lane 3 — Corporate and business

- pricing model and package vocabulary (`Freemium`, `Pro`, `Pro Max`, `Advance Customize`) are consistent across docs and acquisition surfaces
- BookedAI customer support contact defaults `info@bookedai.au` and `+61455301335` are now consistent in code and docs after the `2026-04-26` alignment work
- Future Swim and Grandmaster Chess tenants are live but no published evidence yet exists for revenue or paid bookings; the investor narrative remains at `activated tenants` rather than `revenue-generating tenants`
- AI Mentor is positioned correctly as a next-template adjacency rather than a current proof tenant
- compliance posture (Privacy Act, WhatsApp Business Service Provider, Telegram commercial terms, PCI scope) is not consolidated into a single audit document yet; investor due diligence and first paid customer both require this

### Lane 4 — Backend

- the repository and bounded-context module map under `backend/repositories/` and `backend/service_layer/` is sound
- `backend/service_layer/tenant_app_service.py` is the largest single service file with no direct unit-test coverage; it owns billing, catalog, plugin config, team, onboarding, portal, and integrations snapshots in one place
- `backend/api/route_handlers.py` still runs `session.execute(text(...))` raw SQL for several admin reads, breaking the documented API to repository to service boundary in `docs/development/backend-boundaries.md`
- bare `except Exception` blocks in `tenant_app_service.py` swallow integration errors without using the structured `AppError`/`IntegrationAppError` types defined in `backend/core/errors.py`
- multiple service files (notably `messaging_automation_service.py`, `academy_service.py`) have no direct unit-test coverage; current coverage relies on integration patterns in route tests

### Lane 5 — API and integrations

- the v1 router decomposition under `backend/api/v1_router.py` is in good shape; total live route count is large but bounded across booking, search, tenant, communication, integration, public catalog, webhook, and admin handlers
- `/api/chat/send` and `/api/booking-assistant/chat` are dual-routed aliases; this is documented in design but not yet annotated in the OpenAPI surface, so external clients can hard-code either alias without deprecation guidance
- customer Telegram webhook verification uses Telegram's official secret-token header; Evolution now has optional HMAC verification through `WHATSAPP_EVOLUTION_WEBHOOK_SECRET`; remaining webhook risk is idempotency/replay handling across inbound providers
- inbound webhook idempotency is not enforced anywhere; a replayed delivery would be processed twice
- public assistant routes accept `actor_context.tenant_id` from the client payload; there is no validator that rejects requests where the supplied `tenant_id` does not match the authenticated session
- error envelope shape is consistent through `build_error_envelope`, and CORS/rate-limit primitives exist but are unevenly applied

### Lane 6 — DevOps

- production deployment runs through `docker-compose.prod.yml` plus `scripts/deploy_production.sh`, which now does memory-safe sequential builds (`backend`, `web`, `beta-web`) after the `2026-04-26` hardening
- `.env.production.example` is a stub of fewer than ten variables while `.env.example` carries 100+ keys; production secret injection has no tracked baseline
- there is no `.github/workflows/` pipeline; release-gate is local-only, run via `./scripts/run_release_gate.sh` and the rehearsal wrapper
- the production beta runtime tier shares the production database; this prevents safe rehearsal of destructive migrations
- the OpenClaw operator runtime under `deploy/openclaw/` runs as `root` with `/var/run/docker.sock` and a host filesystem mount, paired with a Telegram bot that can trigger host-shell commands; this is a privileged surface that needs scope and isolation review
- there is no Prometheus/Grafana/AlertManager stack in the repo; alerting is currently a Discord webhook without routing rules
- there is no image registry; production images are built locally per release rather than pulled from a tagged registry, which makes rollback slower and reproducibility weaker

### Lane 7 — Conversational chat

- `BookedAI Manager Bot` brand and identity are consistent for Telegram and website chat; WhatsApp does not yet enforce the same sender identity in outbound payloads
- identity gate (booking reference or safe single phone or email match before sharing booking detail) is enforced for Telegram and WhatsApp via `MessagingAutomationService`
- mutation safety (queued review for cancel/reschedule, never instant) is enforced for Telegram and WhatsApp through the portal request queue
- WhatsApp outbound replies do not carry inline keyboard/quick-action controls equivalent to the Telegram `View n` / `Book n` / `Find more` row, breaking parity promised in `DESIGN.md`
- WhatsApp webhook integration test coverage is shallow (essentially the Meta log path and one duplicate-idempotency check); Telegram has a much fuller suite
- SMS and Apple Messages are referenced in `DESIGN.md` as future channels under the same shared policy but have no adapter, route, or test today

## Consolidated P0 and P1 backlog

### P0 — must close before `2026-05-03`

- `P0-1` portal `GET /api/v1/portal/bookings/v1-{ref}` snapshot returns `500` for fresh references; harden the snapshot builder, add a structured error envelope, ensure CORS on error paths
  - owner: `Backend`
  - files: `backend/api/v1_routes.py`, `frontend/src/apps/portal/PortalApp.tsx`
  - phase: `Phase 17`
- `P0-2` WhatsApp Cloud API delivery is blocked on `Account not registered` while Twilio sandbox is the only working sender; resolve provider posture so the active path is documented and live
  - owner: `Integrations`
  - files: `backend/service_layer/communication_service.py`, `backend/config.py`
  - phase: `Phase 19`
- `P0-3` customer Telegram and Evolution webhook verification: closed live on `2026-04-26`; Telegram secret-token verification and Evolution HMAC verification both reject missing credentials in production
  - owner: `Backend Security`
  - files: `backend/api/route_handlers.py`, `backend/api/webhook_routes.py`
  - phase: `Phase 19`
- `P0-4` no inbound webhook idempotency; introduce a `webhook_events` table with provider id and processed flag, and route Tawk, WhatsApp, Telegram, Evolution, and Zoho through it
  - owner: `Backend`
  - files: new `backend/repositories/webhook_idempotency_repository.py`, `backend/api/webhook_routes.py`
  - phase: `Phase 19`
- `P0-5` public assistant routes accept `actor_context.tenant_id` from the client without validating it against the authenticated session; add a `_resolve_tenant_id` validator that rejects mismatches with `403`
  - owner: `Backend Security`
  - files: `backend/api/v1_routes.py`
  - phase: `Phase 19`
- `P0-6` no GitHub Actions CI; add `.github/workflows/ci.yml` covering lint, type-check, backend unit tests, frontend build, and image build, plus branch protection on `main`
  - owner: `DevOps`
  - files: new `.github/workflows/ci.yml`
  - phase: `Phase 23`
- `P0-7` `.env.production.example` is a stub; expand to mirror `.env.example` keys with explicit `required` vs `optional` markers and no default secrets, then add a checksum/diff guard to `scripts/deploy_production.sh`
  - owner: `DevOps`
  - files: `.env.production.example`, `scripts/deploy_production.sh`
  - phase: `Phase 23`
- `P0-8` OpenClaw runtime runs as `root` with the host Docker socket mounted; drop root, scope the mount to the BookedAI deploy directory, document the operator authority boundary
  - owner: `DevOps Security`
  - files: `deploy/openclaw/docker-compose.yml`, `deploy/openclaw/README.md`
  - phase: `Phase 23`

### P1 — must close inside the next two sprints (`2026-05-03` to `2026-05-17`)

- `P1-1` tenant authenticated UAT for catalog edit, billing activation, and team controls is not yet covered; complete the email-code login round-trip then run the write-path UAT pack
  - owner: `QA`
  - files: `docs/development/tenant-live-uat-2026-04-26.md`
  - phase: `Phase 17`
- `P1-2` WhatsApp outbound replies lack inline action controls and do not enforce the `BookedAI Manager Bot` sender identity; add a `reply_markup`-equivalent payload through Twilio/Meta and align sender metadata
  - owner: `Chat`
  - files: `backend/service_layer/messaging_automation_service.py`, `backend/service_layer/communication_service.py`
  - phase: `Phase 19`
- `P1-3` WhatsApp webhook integration tests are shallow; mirror the Telegram suite for identity-gate, queued cancel, queued reschedule, and Internet expansion
  - owner: `QA`
  - files: `backend/tests/test_whatsapp_webhook_routes.py`
  - phase: `Phase 19`
- `P1-4` `backend/service_layer/tenant_app_service.py` is too large for safe iteration and has no direct unit tests; split into `tenant_overview_service`, `tenant_billing_service`, `tenant_catalog_service` and add unit coverage for the snapshot builders
  - owner: `Backend`
  - files: `backend/service_layer/tenant_app_service.py` and new bounded files
  - phase: `Phase 22`
- `P1-5` `backend/api/route_handlers.py` runs raw SQL for admin reads; move the remaining `session.execute(text(...))` blocks into repository read models so the API boundary is consistent
  - owner: `Backend`
  - files: `backend/api/route_handlers.py`, `backend/repositories/`
  - phase: `Phase 22`
- `P1-6` production beta runtime shares the production database; provision a dedicated beta database (or a snapshot-restored copy) and update `docker-compose.prod.yml` plus `.env.production.example` to point beta at it
  - owner: `DevOps`
  - files: `docker-compose.prod.yml`, `supabase/`, `.env.production.example`
  - phase: `Phase 23`
- `P1-7` accessibility and mobile breakpoint debt: phone field guidance must link via `aria-describedby`, admin booking table needs a responsive card layout below `720px`
  - owner: `Frontend`
  - files: `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`, `frontend/src/theme/minimal-bento-template.css`, `frontend/src/components/AdminPage.tsx`
  - phase: `Phase 17`
- `P1-8` `frontend/src/apps/public/PitchDeckApp.tsx` has no Playwright coverage; add a `pitch-deck-rendering.spec.ts` covering desktop and `390px` mobile, plus `1440px` desktop investor view
  - owner: `QA`
  - files: new `frontend/tests/pitch-deck-rendering.spec.ts`
  - phase: `Phase 17`
- `P1-9` Future Swim Miranda booking URL returns `404` in browser; apply `backend/migrations/sql/020_future_swim_miranda_booking_url_hotfix.sql` on a host with database access
  - owner: `Tenant Ops`
  - files: `backend/migrations/sql/020_future_swim_miranda_booking_url_hotfix.sql`
  - phase: `Phase 17`
- `P1-10` confirmation/notification email templates are channel-agnostic; add channel-aware support posture so templates name `info@bookedai.au` plus the available chat channel in customer copy
  - owner: `Chat`
  - files: `backend/service_layer/communication_service.py`
  - phase: `Phase 19`

## A/B testing matrix

The following experiments inherit the existing telemetry pattern (query parameter assignment, local-storage persistence, and browser-event emission with optional `dataLayer` push) already used by the `tenant_variant=control|revenue_ops` and `portal_variant=status_first|control` lanes.

Each experiment ships only when assignment, telemetry, and exposure log are wired and an exit threshold (impressions per variant and statistical guard) is documented.

### Acquisition (`Phase 17` UI/UX track)

- `AC-1` `bookedai.au` hero composition: control = current investor/customer split with live search; variant = chat composer led above hero. Metric: search start rate. MDE: `+15%`.
- `AC-2` `bookedai.au` chat CTA copy: control = `Start with a request`; variant = `What do you want to book?`. Metric: search submit rate. MDE: `+10%`.
- `AC-3` `pitch.bookedai.au` deck pacing: control = current narrative; variant = compact eight-frame visual flow. Metric: time on page plus investor demo bookings. MDE: `+20%`.

### Conversion (`Phase 17` plus `Phase 19`)

- `BC-1` search-result missing-data state: control = hide missing price/duration; variant = explicit `Price not listed` / `Duration TBD` placeholders. Metric: proceed-to-booking rate. MDE: `+8%`.
- `BC-2` confirmation hero payment posture: control = QR plus portal link; variant = QR plus payment-state badge (`Stripe ready`, `QR transfer`, `Manual review`). Metric: portal completion within seven days. MDE: `+12%`.
- `BC-3` verified tenant card (chess proof): control = current capability list; variant = trust badge plus capability chips. Metric: tenant booking conversion. MDE: `+10%`.
- `BC-4` phone field accessibility: control = sibling-span guidance; variant = `aria-describedby` linked guidance. Metric: assistive-tech completion rate via NVDA/JAWS smoke. MDE: `+15%`.

### Retention (`Phase 17` portal lane, builds on existing `portal_variant`)

- `RT-1` portal hero copy: control = current copy; variant = `Review your booking and request changes`. Metric: lookup submit rate. MDE: `+12%`.
- `RT-2` portal action ordering: control = technical order; variant = `Status -> Pay -> Reschedule -> Ask -> Change plan -> Cancel` (already shipped under `status_first`, now run as a real A/B). Metric: time to first action. MDE: `-25%`.
- `RT-3` portal error recovery copy: control = `Failed to fetch`; variant = `Your reference is saved. Try again or contact support.`. Metric: retry click rate. MDE: `+18%`.

### Conversational (`Phase 19`)

- `CH-1` WhatsApp inline controls: control = plain text reply; variant = plain text plus `View` / `Book` / `Find more` quick actions. Metric: click-through to booking. MDE: `+15%`.
- `CH-2` Telegram cancel-request copy: control = `Đã ghi nhận yêu cầu`; variant = `Đã queue cho team review, sẽ confirm trong 1h`. Metric: support escalation rate. MDE: `-10%`.
- `CH-3` WhatsApp post-booking confirmation: control = email only; variant = email plus WhatsApp reference plus portal QR plus inline `View Booking`. Metric: `where is my booking` follow-ups. MDE: `-20%`.
- `CH-4` cross-channel support contact phrasing: control = generic; variant = `Telegram/WhatsApp: @BookedAI_Manager_Bot or info@bookedai.au`. Metric: cross-channel switch rate. MDE: `<5%`.
- `CH-5` Telegram presentation: control = HTML rich text; variant = plain text plus inline keyboard. Metric: delivery success plus click rate. MDE: `+5%`.

### Tenant acquisition

- `TN-1` `tenant.bookedai.au` headline: continue the existing `tenant_variant=control|revenue_ops` experiment; promote the winner once each variant has at least `500` impressions and the conversion delta is stable for two consecutive weeks.

## Sprint integration plan

### Sprint 19 — `2026-04-27` to `2026-05-03` — `Stabilize and Sign`

Theme: close all P0 reliability and security gaps before any new feature lands.

- portal P0-1: fix the v1 reference snapshot path and re-run the portal A/B baseline UAT
- WhatsApp P0-2: confirm the active outbound path (Meta Cloud or Twilio) and document the matrix
- security P0-3 and P0-4: keep Telegram secret-token verification, add Evolution HMAC verification, then ship the inbound idempotency table
- security P0-5: add the `_resolve_tenant_id` validator on the public assistant routes
- DevOps P0-6 and P0-7: ship `.github/workflows/ci.yml` and the expanded `.env.production.example` with checksum guard
- DevOps P0-8: drop OpenClaw root, scope the mount, document the operator authority boundary
- frontend P1-7: ship `aria-describedby` for the phone helper and the admin booking responsive card breakpoint

Exit criteria:

- portal UAT for `v1-*` fresh references is green and recorded in `implementation-progress.md`
- `release-gate-checklist.md` records the new webhook signature, idempotency, and tenant_id validator gates as required for promote
- CI pipeline blocks any PR that fails lint, type-check, or backend unit tests
- OpenClaw container can no longer issue host-shell commands as `root`

### Sprint 20 — `2026-05-04` to `2026-05-10` — `First Real Revenue Loop`

Theme: produce one fully traced Future Swim revenue loop and turn on the first batch of A/B experiments.

- Future Swim: complete one real lead-to-booking-to-payment-to-follow-up loop with documented metrics; apply migration `020_future_swim_miranda_booking_url_hotfix.sql` (`P1-9`) before customer-visible probes
- tenant UAT P1-1: complete the authenticated tenant write-path UAT for catalog, billing, and team
- A/B activation: ship assignment/telemetry/exposure log for `AC-1`, `RT-1`, `RT-3`, `CH-1`
- backend P1-5: migrate the remaining raw SQL out of `route_handlers.py` into repository read models
- DevOps observability: stand up Prometheus, Grafana, AlertManager with on-call routing through Discord first
- chat P1-2: ship WhatsApp inline action controls and sender identity alignment
- compliance: produce the first version of `Commercial and Compliance Checklist` covering Privacy Act, WhatsApp BSP, Telegram terms, PCI scope, and tenant data isolation

Exit criteria:

- one Future Swim booking is documented end to end with reference, payment posture, follow-up evidence, and dashboard snapshot
- four A/B experiments have at least `500` impressions per variant and a winning or no-winner decision recorded
- observability dashboards expose `5xx` rate, DB latency, and queue lag with a documented alert path

### Sprint 21 — `2026-05-11` to `2026-05-17` — `Refactor and Coverage`

Theme: reduce backend monolith risk and extend test coverage so the next vertical template work is safe.

- backend P1-4: split `tenant_app_service.py` into the three bounded services
- backend hygiene: replace bare `except Exception` blocks in service layer with `IntegrationAppError` / `ValidationAppError` plus structured logging
- chat P1-3: ship the WhatsApp webhook integration tests at parity with Telegram
- chat schema: add a `location_posture` field to the chat response shape and propagate through web, Telegram, and WhatsApp; this unlocks `BC-1`
- DevOps P1-6: separate beta from production database, push images to a registry with `git-sha` and `latest` tags
- frontend P1-8: ship `pitch-deck-rendering.spec.ts` and the `390px` breakpoint suite for tenant and admin

Exit criteria:

- `tenant_app_service.py` is gone or shrunk to a thin re-export shim; the three bounded services each have at least ten unit tests
- the release gate now includes the new chat tests and the pitch coverage
- a tagged image rollback can be executed in under five minutes on staging

### Sprint 22 — `2026-05-18` to `2026-05-24` — `Multi-tenant and Multi-channel`

Theme: scale the platform without weakening tenant isolation or channel parity.

- backend tenant safety: add a `BaseRepository` validator that fails any query missing a `tenant_id` filter where the model is tenant-scoped; run a chaos test
- chat SMS adapter: add `/api/webhooks/sms` (Twilio first) reusing the shared identity and mutation policy; this unlocks `CH-3`
- tenant proof v2: ship the `Tenant Revenue Proof` dashboard for investor-only or limited tenant access
- pricing UI: tenant workspace shows current plan, commission rate, and billing history
- A/B wave 2: run `BC-2`, `CH-1`, `CH-3` together
- API hygiene: extend rate-limiting to `/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, and webhooks
- compliance: ship public footer and tenant terms updates from the Sprint 20 audit

Exit criteria:

- one new vertical (chess or AI Mentor) reuses the shared template path with no custom-only branch
- SMS booking-care answer is reachable from at least one tenant
- tenant revenue proof dashboard renders one tenant's real revenue evidence

## A/B telemetry contract (reusable across surfaces)

Every experiment shipped from this plan must follow the same telemetry pattern:

- assignment is read from a query parameter on first hit, then persisted in `localStorage` under a stable key (`bookedai_ab_<experiment>` style)
- exposure events fire on first render with experiment id, variant id, surface id, and a stable user pseudo id
- conversion events use the same pseudo id and reference the exposure event
- events are emitted as a `window` custom event for in-process listeners and pushed to `dataLayer` when present
- no third-party JavaScript is required for this contract; vendor analytics may attach later

Each experiment doc must record:

- hypothesis, variant copy/spec, primary metric, MDE, exposure threshold, and a kill-switch description
- decision posture: promote, hold, or rollback, and the date the decision was recorded

## Cross-cutting policy notes

- this review does not change the canonical journey `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`; it only sharpens the gates that protect each step
- this review preserves the BookedAI Manager Bot persona across customer-facing channels and continues to keep OpenClaw and operator Telegram separate from customer chat
- this review preserves the customer support contact defaults `info@bookedai.au` and `+61455301335` and does not introduce new contact identities
- this review does not change the existing pricing vocabulary or the tenant proof tenancy order (Future Swim primary, Co Mai Hung Chess and AI Mentor as adjacencies)

## Closeout responsibilities

Whenever a P0 or P1 from this document is delivered, the closeout pass must update:

- `docs/development/implementation-progress.md` with a dated entry that links back to this review and to the canonical phase document
- the requirement-facing or description-facing document for the affected surface
- `docs/development/release-gate-checklist.md` if a new gate or threshold is introduced
- `docs/architecture/current-phase-sprint-execution-plan.md` and `docs/development/next-phase-implementation-plan-2026-04-25.md` for any phase-level scope or sequencing change

## 2026-04-26 UI/UX/Designer/Marketing review addendum

A second-pass review on `2026-04-26` ran four parallel deep dives (UI/UX full-flow walkthrough, frontend code-quality + A11y + mobile-safety, designer tokens + hierarchy + brand consistency, marketing wording + CTA + value proposition) across all seven web apps. The pass produced ≥45 NEW findings beyond the original seven-lane review and is consolidated below.

### Cross-cutting themes (T1-T10)

- `T1` async state lies and jargon leak — `queued`, `manual review`, `Revenue operations handoff` were leaking to customer copy. Closed in Tier 1 quick-wins on `2026-04-26`.
- `T2` payment posture lacks visual hierarchy — confirmation hero does not visually distinguish Stripe ready vs QR transfer vs manual review. Tracked as `FX-1` and pairs with `BC-2`.
- `T3` mobile 390px-720px is a dead zone — admin table `min-width: 860px`, sticky sidebars overlap CTA, button `min-height: 40px` shortfall fixed in Tier 1. Larger responsive table fix tracked as `FX-3`.
- `T4` accessibility debt at scale — `text-[10px]` 942 instances, button touch-target shortfall (closed in Tier 1), missing `htmlFor` (verified: implicit-label pattern is correct).
- `T5` component drift cross-app — booking confirmation card has 3 implementations across Homepage, Dialog, Demo; status badge has zero shared component.
- `T6` design token drift — 619 raw hex outside the token system, 22 box-shadow + 153 arbitrary `shadow-[]`, 518 arbitrary `rounded-[]`, two competing CSS systems (`minimal-bento` vs `bookedai-brand-kit`).
- `T7` trust elements missing — no testimonial, live booking count, SLA, or social proof in hero or pricing.
- `T8` network resilience zero — 47 fetch calls without AbortController or timeout; mobile 3G hangs indefinitely.
- `T9` bundle monolith risk — `BookingAssistantDialog.tsx` 6000 LOC, `TenantApp.tsx` 4900 LOC, no code-split.
- `T10` empty/loading/error states are bland — generic copy without recovery path.

### Tier 1 quick-wins delivered on 2026-04-26 (CLOSED)

These shipped inline and need release-gate verification on next Sprint 19 run.

- `QW-1` removed jargon from customer copy: `Messaging follow-up is queued for operations review` → `Your booking is confirmed. We are sending the messaging follow-up — your booking and portal stay available.`; `Messaging queued` → `Sending shortly`; `Revenue operations handoff could not be queued.` → `We could not start the booking follow-up automatically. Our team will follow up shortly.`; `A support request has been queued for manual review.` → `Your request is being reviewed. We will confirm the next step shortly.`. Files: `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`, `frontend/src/apps/portal/PortalApp.tsx`, `frontend/src/apps/public/HomepageSearchExperience.tsx`.
- `QW-2` added shared `customerContactHelperId` so both email and phone fields announce `At least one of email or phone is required.` via `aria-describedby`. File: `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`.
- `QW-3` bumped `.booked-button { min-height }` from `40px` to `44px` to satisfy WCAG 2.5.5 touch target. File: `frontend/src/theme/minimal-bento-template.css`.
- `QW-4` added `role="region"` and `aria-label="Admin bookings table"` to the admin booking table wrapper so screen readers do not skip the structure. File: `frontend/src/features/admin/bookings-table-chrome.tsx`.
- `QW-5` verified — the existing `<label class="block"><div>caption</div><input/></label>` pattern is the WAI-ARIA implicit-label pattern; accessible-name computation is correct. No code change needed.
- `QW-6` upgraded hero headline from `Turn enquiries into booked revenue with one modern operating system.` (vague, B2B) to `Never lose a service enquiry again.` (concrete, SME pain). File: `frontend/src/components/landing/data.ts`.
- `QW-7` upgraded primary CTA from `Open Web App` (passive) to `Try BookedAI Free` and secondary from `Talk to Sales` to `Schedule a Consultation` (outcome-driven, lower friction). File: `frontend/src/components/landing/data.ts`.
- `QW-8` upgraded empty-state copy from `No strong match yet. BookedAI stays precise instead of forcing a weak recommendation.` (passive, no next action) to `Let's refine your request — tell us a suburb, preferred time, or service detail and we will find the best fit.`. Files: `frontend/src/apps/public/homepageContent.ts`, `frontend/src/apps/public/HomepageSearchExperience.tsx`.

### Tier 2 — Sprint 19 / Sprint 20 fix backlog (FX-1 to FX-7, NEW P1)

Each of these is a discrete PR-sized fix; assignment recorded against the existing Phase model.

- `FX-1` payment-state badge component — create `PaymentStateBadge.tsx` with four variants (`Stripe ready` green, `QR transfer` amber, `Manual review` orange, `Pending` slate). Apply across `HomepageSearchExperience`, `BookingAssistantDialog`, `PortalApp`. Pairs with `BC-2` A/B. Phase: `17`.
- `FX-2` AbortController + 30s timeout on `frontend/src/shared/api/client.ts` — wrap all 47 fetch calls so mobile 3G no longer hangs indefinitely. Phase: `19`.
- `FX-3` admin booking responsive card layout `390px-720px` — replace forced horizontal scroll with stacked card layout below `720px`, table at `≥860px`. Phase: `17`.
- `FX-4` destructive action confirmation modal — cancel booking, logout, downgrade in `PortalApp.tsx` and `TenantApp.tsx` must show modal confirm before submission. Phase: `17`.
- `FX-5` focus restoration on dialog close — capture and restore focus when `BookingAssistantDialog` closes; add `data-autofocus-return` pattern. Phase: `17`.
- `FX-6` tenant session expiry 5-minute warning + extend button — proactive guard before silent expiry mid-edit. File: `frontend/src/features/tenant-auth/TenantAuthWorkspaceEmail.tsx`. Phase: `19`.
- `FX-7` portal `booking_reference` URL canonicalization — normalize four param sources (`booking_reference`, `bookingReference`, query, hash) into one canonical form; warn on conflict. File: `frontend/src/apps/portal/PortalApp.tsx`. Phase: `17`.

### Tier 3 — Sprint 21 / Sprint 22 refactor backlog (RF-1 to RF-10, NEW P2)

- `RF-1` ESLint rule blocks raw hex in `className`; migrate 619 hex usages to design tokens. Phase: `22`.
- `RF-2` shadow consolidation — reduce 22 CSS shadows + 153 arbitrary `shadow-[]` to four semantic slots (card, glow, float, none). Phase: `22`.
- `RF-3` border-radius cleanup — replace 16 CSS + 518 arbitrary `rounded-[]` with five tokens (micro `5px`, standard `8px`, comfortable `14px`, large `24px`, pill `999px`). Phase: `22`.
- `RF-4` button consolidation — merge 12 button styles (`booked-button`, `booked-button-secondary`, `bookedai-saas-button-primary`, `bookedai-saas-button-secondary`, inline pill, etc.) into four (primary, secondary, tertiary, ghost). Phase: `22`.
- `RF-5` code-split `BookingAssistantDialog.tsx` (6K LOC) into four lazy-loaded chunks (`AssistantSearch`, `BookingForm`, `Confirmation`, `WorkflowGuide`). Phase: `22`.
- `RF-6` code-split `TenantApp.tsx` (4.9K LOC) into bounded modules per workspace nav. Phase: `22`.
- `RF-7` reusable `BookingConfirmationPanel` component — replace three duplicate implementations across Homepage, Dialog, Demo. Phase: `22`.
- `RF-8` empty-state pattern library — illustration plus headline plus body plus CTA template applied to Tenant `no bookings`, Admin `no leads`, Portal `reference not found`. Phase: `22`.
- `RF-9` pricing tier persona reframe — `Solo` / `Growing studio` / `Clinic` / `Enterprise` instead of feature lists. Phase: `21`.
- `RF-10` Pitch deck Playwright coverage at `1440px` desktop and `390px` mobile. Phase: `17` (already tracked as `P1-8`).

### A/B matrix expansion (16 → 24)

Eight new experiments added beyond the original 16. Telemetry contract is the same query-parameter-plus-`localStorage` pattern documented above.

#### Conversion-copy wave

- `CW-1` hero headline — control: `Turn enquiries into booked revenue with one modern operating system.` (legacy, kept for measurement); variant: `Never lose a service enquiry again. Turn customer messages into confirmed bookings, every time.` Metric: hero scroll plus search start. MDE: `+18%`. Surface: `bookedai.au`.
- `CW-2` primary CTA verb — control: `Open Web App`; variant: `Try BookedAI Free`. Metric: CTA click rate. MDE: `+15%`. Surface: hero, pricing, final CTA.
- `CW-3` empty search-state — control: `No strong match yet. BookedAI stays precise instead of forcing a weak recommendation.`; variant: `Let's refine your request — tell us a suburb, preferred time, or service detail and we will find the best fit.`. Metric: refinement input rate. MDE: `+25%`. Surface: homepage chat empty state.
- `CW-4` payment confirmation copy — control: `Messaging follow-up is queued for operations review`; variant: `Your confirmation is on the way. Check portal.bookedai.au or reply with questions.`. Metric: support inquiry rate. MDE: `-20%`. Surface: confirmation hero.
- `CW-5` cancel-request portal copy — control: `A support request has been queued for manual review.`; variant: `Your cancel request is being reviewed. We will confirm within 1 hour.`. Metric: support escalation rate. MDE: `-12%`. Surface: portal care turn.
- `CW-6` pricing tier framing — control: feature list; variant: persona-based (`Solo` / `Growing studio` / `Clinic` / `Enterprise`). Metric: tier select clarity. MDE: `+10%`. Surface: pricing.

#### Designer-system wave

- `DS-1` payment posture badge — control: text-only; variant: colored badge plus icon (`Stripe ready` green, `QR transfer` amber, `Manual review` orange). Metric: portal completion within seven days. MDE: `+14%`. Pairs with `FX-1`.
- `DS-2` empty-state hero — control: text only; variant: illustration plus headline plus CTA. Metric: re-engagement rate. MDE: `+8%`. Pairs with `RF-8`.

### A/B activation cadence (cumulative)

- Wave 1 in `Sprint 20`: `AC-1`, `RT-1`, `RT-3`, `CH-1`, plus the new `CW-1`, `CW-2`, `CW-3` (homepage copy refresh now safe to A/B because the new copy already shipped via `QW-6`/`QW-7`/`QW-8`).
- Wave 2 in `Sprint 22`: `BC-2`, `CH-1`, `CH-3`, plus the new `CW-4`, `CW-5`, `DS-1`, `DS-2` (these depend on `FX-1` payment-state badge and the shared empty-state pattern from `RF-8`).
- Continuing experiment `CW-6` runs in `Sprint 21` once the pricing reframe in `RF-9` ships.

### Phase rollup of new backlog items

- Phase `17` adds: `FX-1`, `FX-3`, `FX-4`, `FX-5`, `FX-7`, `RF-10`
- Phase `19` adds: `FX-2`, `FX-6`
- Phase `21` adds: `RF-9`
- Phase `22` adds: `RF-1`, `RF-2`, `RF-3`, `RF-4`, `RF-5`, `RF-6`, `RF-7`, `RF-8`

## Change log

- `2026-04-26` initial publication after the seven-lane review
- `2026-04-26` UI/UX/Designer/Marketing review addendum: ≥45 new findings, eight Tier 1 quick-wins shipped (`QW-1` to `QW-8`), seven Tier 2 fixes (`FX-1` to `FX-7`) and ten Tier 3 refactors (`RF-1` to `RF-10`) added to the backlog, A/B matrix expanded from 16 to 24 experiments
