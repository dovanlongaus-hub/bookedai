# BookedAI Implementation Progress

## Purpose

This note records the latest implementation progress in a way that stays aligned with the project plan and the current documentation baseline.

## Status Snapshot

Date: `2026-04-16`

Current focus areas:

- Prompt 5 additive API v1 foundation
- Prompt 5 shared frontend and backend contract alignment
- Prompt 5 UI adoption planning for public and admin surfaces
- Prompt 5 pricing shared contract/client alignment on the legacy consultation path
- Prompt 5 admin support adapter extraction for preview and triage flows
- Prompt 5 dependency mapping into Prompt 9, Prompt 10, and Prompt 11
- Prompt 5 backend contract test enablement in project-local virtualenv
- Prompt 5 public booking assistant shadow adoption
- Prompt 5 and Prompt 9 selective live-read adoption in the public booking assistant
- Prompt 9 trust-first matching and booking trust behavior on v1 endpoints
- Prompt 9 booking-path resolution and escalation-ready decision policy on v1
- admin Prompt 5 v1 preview surface
- Prompt 10 CRM sync and lifecycle email service foundations
- Prompt 10 lifecycle orchestration baseline with CRM manual-review ledger semantics
- Prompt 11 integration provider status, attention queue, and reconciliation read models
- admin Prompt 5 preview expanded to lifecycle email, CRM seeding, integration health, attention queue, and reconciliation signals
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
- backend Prompt 10 lifecycle changes still preserve the current Prompt 5 contract suite, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` remaining green after CRM sync seeding and lifecycle email persistence moved behind service or repository seams
- backend Prompt 11 integration status and reconciliation summary additions still preserve the current Prompt 5 contract suite, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` remaining green
- `npm run build` still passes after expanding the admin Prompt 5 preview surface to include booking-path resolution, lifecycle preview writes, and Prompt 11 integration or reconciliation visibility
- Prompt 9 booking-path policy updates still preserve the current Prompt 5 contract suite, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` remaining green after moving booking-path decisions behind the dedicated service helper
- admin Prompt 5 preview now surfaces lifecycle preview IDs, provider status, and reconciliation summary from additive v1 calls while `npm run build` remains green
- Prompt 10 lifecycle orchestration baseline now preserves both the v1 contract suite and the new service-layer unit tests, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service` passing after adding CRM manual-review transitions and lifecycle email review-state recording
- Prompt 11 attention and reconciliation detail additions still preserve the v1 contract suite, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service` passing after adding `/api/v1/integrations/attention` and `/api/v1/integrations/reconciliation/details`
- `npm run build` still passes after extending the admin Prompt 5 preview surface to include Prompt 11 attention cards and reconciliation detail sections
- selective live-read adoption for the public assistant now preserves both the frontend build and backend contract suite, with `npm run build` green after adding `VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ` and `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service` still passing while legacy writes remain authoritative
- Prompt 8 panel-level deep-link implementation now preserves the frontend build and admin smoke suite, with `npx playwright test tests/admin-prompt5-preview.spec.ts --project=legacy` green after adding `#workspace:panel` navigation, panel quick links, and additive panel anchors inside the split admin runtime
- Prompt 11 triage snapshot now preserves both the backend contract suite and admin smoke coverage, with `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes` and `npx playwright test tests/admin-prompt5-preview.spec.ts --project=legacy` covering the new read-only reliability board
- reliability workspace extraction and admin route-level lazy loading now preserve the frontend build and admin smoke suite, while build output is chunked across runtime and workspace boundaries instead of keeping the admin entry path monolithic

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
- Prompt 9 relevance gating now treats explicit user location as a hard filter for returned search results, so the live response no longer keeps out-of-location records just because they are topically similar
- `Sprint S3` search quality hardening has started with a catalog quality gate for `service_merchant_profiles`, so records missing category, location, price, or usable topic tags are automatically kept out of live search until an operator fixes them
- the roadmap page now groups active specialist agents by delivery role cluster and renders them in denser cards, so the execution roster remains visible without stretching too far below the first viewport
- release verification now also has a root-level `./scripts/run_release_gate.sh` command, which runs the frontend release gate plus backend v1 and lifecycle tests in one promote-or-hold sequence
- release verification now also has an explicit promote, hold, and rollback checklist in `docs/development/release-gate-checklist.md`, so the gate is no longer only a command contract
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

- [Project Documentation Root](../../project.md)
- [Documentation Root](../README.md)
- [Next Wave Prompt 10 11 Live Adoption Plan](./next-wave-prompt-10-11-live-adoption-plan.md)
- [Backend Boundaries](./backend-boundaries.md)
- [Folder Conventions](./folder-conventions.md)
