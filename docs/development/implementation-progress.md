# BookedAI Implementation Progress

## Purpose

This note records the latest implementation progress in a way that stays aligned with the project plan and the current documentation baseline.

It is also the required implementation-tracking document for substantive module updates after the old module description has been re-read and the request-facing source document has been updated.

It is also the mandatory write-back target whenever a change has been completed end-to-end and deployed live: the delivered result should be recorded here in the same closure pass that updates the relevant sprint, roadmap, and requirement-side documents.

## Status Snapshot

Date: `2026-04-17`

Current focus areas:

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
- Phase 0 and Sprint 1 rebranding implementation has now started in code, with the shared frontend brand layer updated toward the revenue-engine narrative and the primary logo renderer now prepared to prefer the live logo asset `https://upload.bookedai.au/images/ef4d/i1_STdSm_tw-k6loI5aIEA.png` while safely falling back to the checked-in branding files if that source is unavailable
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
- public assistant and admin Prompt 5 preview now also share the same partner-match action footer semantics, so `Book now`, `Open Google map`, `View source`, and the `Next action` cue stay aligned instead of diverging between chat and admin preview
- Playwright regression coverage now also locks the shared shortlist and action-footer semantics in both public live-read chat and admin Prompt 5 preview, so `top 3 + See more`, `Book now`, `Open Google map`, `View source`, and `Next action` drift will surface quickly during search-quality changes
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
- semantic transparency is now surfaced in lightweight admin and public diagnostics as well, so operators can see when search stayed on primary Gemini versus when it failed over to OpenAI, without needing to inspect raw API payloads
- the Phase 2 roadmap, program timeline, and implementation package are now also synchronized around the current search-quality lane, so query normalization, catalog quality, semantic transparency, shared shortlist UX, and booking-context extraction are tracked in the same source-of-truth documents instead of drifting across isolated progress notes
- live-read search is now being hardened around query-grounded truthfulness: a fresh user request should not automatically inherit a previously selected service or category unless the user explicitly refers back to it, and no-result live-read states should stay empty instead of reviving unrelated legacy shortlist rows
- the semantic lane is now also being tightened as a Gemini-first, OpenAI-fallback verifier and concise summarizer for the active query, so the shortlist stays compact, accurate, and booking-ready rather than padded with generic stored matches
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

- [Project Documentation Root](../../project.md)
- [Documentation Root](../README.md)
- [Next Wave Prompt 10 11 Live Adoption Plan](./next-wave-prompt-10-11-live-adoption-plan.md)
- [Backend Boundaries](./backend-boundaries.md)
- [Folder Conventions](./folder-conventions.md)
