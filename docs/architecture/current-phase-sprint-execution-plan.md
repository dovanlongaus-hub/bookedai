# BookedAI Current Phase and Sprint Execution Plan

Date: `2026-04-21`

Document status: `active execution baseline`

## Purpose

This document converts the current repository truth into one execution plan that is:

- phase-aware
- sprint-aware
- explicit about what is already implemented
- explicit about what remains incomplete
- explicit about what should happen next

This document should now be used as the shortest planning bridge between:

- requirement-side product and architecture documents
- implementation-side sprint execution documents
- the actual checked-in codebase

It exists because the project is no longer in a planning-only state.

BookedAI already has substantial public, backend, tenant, admin, deploy, migration, and release-gate implementation in code, so the next planning baseline must start from what already exists instead of re-planning from a greenfield assumption.

## Source-of-truth inputs

This execution baseline inherits from:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/coding-implementation-phases.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/project-plan-code-audit-2026-04-19.md`

## Current implementation baseline

As of `2026-04-21`, the codebase already includes:

- a real public homepage sales-deck application
- a real public search-first application still available as deeper routed runtime inventory
- a real admin application
- a real tenant application
- a production multi-surface frontend runtime still served from `frontend/`
- a parallel root Next.js runtime lane that now builds successfully but does not yet replace the deployed Vite surface
- a large additive `/api/v1/*` backend contract surface
- a top-level backend router split across public catalog, uploads, webhooks, admin, communications, and bounded-context `v1` mounting
- `/api/v1/*` router decomposition through `backend/api/v1_router.py` and separate booking, search, tenant, communication, and integration route modules
- first-step tenant handler extraction through `backend/api/v1_tenant_handlers.py`
- tenant Google and password authentication foundations
- tenant catalog import, edit, publish, and archive workflows
- tenant overview, bookings, integrations, billing, and catalog panels
- matching, search quality, replay, and release-gate infrastructure
- additive SQL migrations for tenant and commercial foundations
- deploy wiring for public, API, admin, beta, demo, portal, and tenant hosts

The main delivery problem is therefore no longer:

- "build the first working system"

The main delivery problem is now:

- finish incomplete commercial product loops
- close the tenant paid-SaaS gaps
- harden release discipline across more workflows
- keep requirement documents aligned with the already-shipped product baseline
- upgrade the major user surfaces so the whole system feels coherent, user-friendly, and SaaS-grade
- finish the remaining bounded-context handler cleanup inside `backend/api/v1_routes.py` without breaking current public or operator paths

## User-layer upgrade overlay

In addition to the phase and sprint map below, all later execution should now inherit one cross-surface productization overlay:

- `docs/architecture/user-surface-saas-upgrade-plan.md`

This overlay is now mandatory context for:

- public frontend upgrades
- portal upgrades
- tenant login and tenant workspace upgrades
- admin login upgrades
- billing and subscription flow upgrades
- system-wide UI and UX harmonization

## Program status by phase

### Phase 0 - Narrative and architecture reset

Status: `done baseline`

Delivered baseline:

- PRD and roadmap are aligned around the AI revenue engine positioning
- pricing and architecture documents have already moved away from the old chatbot-first framing

Carry-forward work:

- keep later sprint docs aligned with the current shipped product baseline instead of older historical assumptions

### Phase 1 - Public growth and premium landing rebuild

Status: `implemented baseline`

Delivered baseline:

- public search-first shell is live in code
- multilingual locale switching exists
- BookedAI branding has a shared asset source under `frontend/public/branding/`
- public responsive and live-read browser suites exist
- the homepage sales-deck polish lane is now also active in code, with a cleaner CTA hierarchy, launch-offer strip, and stronger separation between homepage conversion, product demo, and deeper public runtime behavior
- `bookedai.au` is now live on the tighter sales-deck runtime, with trial CTA routing centered on `product.bookedai.au` and sales-contact continuity still flowing into `register-interest`
- `product.bookedai.au` is now the explicit live product-demo and booking-agent host in current execution, while `demo.bookedai.au` stays as the lighter narrative demo host rather than the main product-proof route
- homepage CTA routing and roadmap or registration fallbacks should no longer point to the older `/?demo=open` mixed-shell path where the product host now has a cleaner dedicated runtime
- the homepage now has a dedicated flow-map and CTA-rail layer, so the public acquisition story is more visual and more conversion-led than the earlier search-first baseline
- `product` now also exposes explicit `Start Free Trial` continuation so product proof and registration flow stay commercially linked
- the latest approved public package vocabulary is now `Freemium`, `Pro`, and `Pro Max`, while the registration-only custom lane may present `Advance Customize` above the standard paid tiers
- the latest homepage copy pass also tightened the message hierarchy for two audiences at once: quick-scan SME buyers and investor reviewers who need a clearer revenue-engine narrative

Carry-forward work:

- preserve one active public spine
- keep long-form public narrative subordinate to the sales-deck conversion path and the deeper `product/demo` runtime surfaces
- preserve the current compact homepage section order and avoid re-expanding duplicated proof or pricing copy into the main public shell unless a later approved sprint explicitly changes that baseline

### Phase 2 - Commercial data foundation

Status: `partial foundation complete`

Delivered baseline:

- additive tenant and catalog schema support exists
- SQL migration package exists through `009`
- repository, domain, integration, and shared-contract seams exist

Carry-forward work:

- continue moving from additive foundations into a clearer normalized commercial truth model

### Phase 3 - Multi-channel capture and conversion engine

Status: `strongest active implementation lane`

Delivered baseline:

- matching and search routes are real
- booking-path and booking-intent routes are real
- semantic transparency and replay tooling are real
- browser and API checks exist for public search behavior
- the product-route public booking runtime now enforces a clearer search-to-booking sequence:
  - search results first
  - detail preview popup on result tap
  - explicit `Book` action before entering the booking form
  - confirmed or thank-you state after successful booking creation

Carry-forward work:

- keep search truth strong while broadening the same discipline to more non-search channels
- keep preview-state, booking-state, and confirmation-state boundaries explicit as more public and tenant booking flows inherit this runtime

### Phase 4 - Revenue workspace and reporting

Status: `partial`

Delivered baseline:

- tenant and admin reporting read surfaces exist
- revenue, bookings, integrations, billing, and catalog views exist at workspace level

Carry-forward work:

- finish monthly value, attribution clarity, and stronger shared commercial reporting semantics

### Phase 5 - Recovery, payments, and commission operations

Status: `partial foundation`

Delivered baseline:

- payments, reconciliation, outbox, retry, and reliability support seams exist
- admin support lanes already expose operator-facing reliability behavior
- top-level route ownership is now clearer for admin, webhook, upload, communication, and bounded-context v1 surfaces

Carry-forward work:

- complete self-serve billing and invoice/productized payment operations
- complete clearer commission operations
- eliminate undocumented critical-path ownership ambiguity inside the remaining mixed `/api/v1/*` surface

### Phase 6 - Optimization, evaluation, and scale hardening

Status: `partially active`

Delivered baseline:

- release-gate scripts exist
- replay gate exists
- beta and production deploy scripts exist
- browser smoke coverage exists
- route-level verification passed after the current router split
- backend validation now passes for public-web fallback and tenant session-signing after the latest compatibility cleanup

Carry-forward work:

- extend promote-or-hold discipline beyond the search lane
- keep the restored public-web fallback and tenant-session compatibility checks green while broader release gates expand to billing, publish, and support flows

### Phase 7 - Tenant revenue workspace

Status: `real foundation implemented`

Delivered baseline:

- tenant workspace shell exists
- tenant auth exists
- tenant catalog ownership and publish-safe workflow exists
- tenant billing and operational panels exist
- tenant session signing now prefers a tenant-specific secret instead of relying only on shared admin credentials

Carry-forward work:

- finish account creation, claim flow, team membership, and value-reporting maturity
- continue extracting the remaining tenant and portal handlers from `backend/api/v1_routes.py` into `backend/api/v1_tenant_handlers.py`, then move on to integrations, communications, search, and booking

### Phase 8 - Internal admin optimization and support platform

Status: `real foundation implemented`

Delivered baseline:

- admin workspace structure exists
- drift review, diagnostics, and support-safe preview tooling exist

Carry-forward work:

- deepen operational closure loops, role safety, and commercial support tooling

### Phase 9 - QA, release discipline, and scale hardening

Status: `partially active`

Delivered baseline:

- release checklist exists
- release rehearsal exists
- search replay gate exists

Carry-forward work:

- add release-grade thresholds for tenant auth, publish, billing, recovery, and admin support flows

## Sprint-by-sprint current execution map

## Sprint 1

Theme:

- product, roadmap, and architecture reset

Current assessment:

- complete as a requirement baseline

## Sprint 2

Theme:

- brand system and public implementation spine

Current assessment:

- complete as an inherited baseline

Notes:

- later work must inherit the shared branding source and the current public shell direction

## Sprint 3

Theme:

- public search-first homepage runtime

Current assessment:

- materially implemented in code, but no longer the live homepage baseline

Implemented evidence:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/apps/public/HomepageSearchExperience.tsx`
- `frontend/tests/public-homepage-responsive.spec.ts`
- `frontend/tests/public-booking-assistant-live-read.spec.ts`

Remaining gaps:

- continue reducing drift from older public routes and historical public assumptions
- keep this sprint inherited as a still-valid deeper public runtime baseline, but not as the current homepage-host baseline

## Sprint 4

Theme:

- assistant truth and commercial contract foundations

Current assessment:

- partially implemented

Implemented evidence:

- `/api/v1/matching/search`
- `/api/v1/bookings/path/resolve`
- `/api/v1/bookings/intents`
- shared contract and v1 API layers

Remaining gaps:

- commercial truth still needs fuller normalization beyond the strongest active read models

## Sprint 5

Theme:

- reporting read models and widget vocabulary

Current assessment:

- partially implemented

Implemented evidence:

- tenant overview and billing panels
- admin insights and diagnostics

Remaining gaps:

- monthly value reporting and fully unified reporting semantics still need work

## Sprint 6

Theme:

- search quality, replay, thresholds, and attribution discipline

Current assessment:

- substantially implemented

Implemented evidence:

- `scripts/run_matching_search_replay.py`
- `scripts/run_search_replay_gate.py`
- search-focused backend tests
- browser search smoke coverage
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` now records the current product-route interaction truth:
  - shortlist before booking
  - preview popup with tenant or provider detail
  - explicit booking commit from preview
  - confirmed state after submit

Remaining gaps:

- comparable threshold discipline still needs to spread to more workflows
- the next active implementation slice is now the canonical query-understanding contract, so backend and homepage search can share one intent and constraint interpretation before more ranking or fallback expansion is added
- deterministic backend ranking has also now started, so search output order is being pulled back toward one API truth instead of diverging across separate homepage heuristics
- the next documentation and QA pass should make this same preview-to-book-to-confirm pattern explicit in reusable browser tests so later public-flow changes cannot collapse the states back together

## Sprint 7

Theme:

- recovery workflows

Current assessment:

- partial foundation only

Implemented evidence:

- integration retry and reliability support exists
- lifecycle and reliability service lanes exist

Remaining gaps:

- missed-revenue recovery is not yet fully productized across tenant and admin

## Sprint 8

Theme:

- tenant onboarding and searchable supply

Current assessment:

- materially implemented

Implemented evidence:

- tenant auth
- tenant catalog import
- tenant catalog edit/review/publish/archive
- publish-state-aware schema and APIs

Remaining gaps:

- no finished create-account or claim-account journey
- onboarding state still needs stronger end-user completion

## Sprint 9

Theme:

- tenant revenue workspace

Current assessment:

- implemented foundation

Implemented evidence:

- `frontend/src/apps/tenant/TenantApp.tsx`
- `/api/v1/tenant/overview`
- `/api/v1/tenant/bookings`
- `/api/v1/tenant/integrations`
- `/api/v1/tenant/billing`

Remaining gaps:

- tenant value reporting and commercial clarity still need deepening

## Sprint 10

Theme:

- internal admin commercial operations

Current assessment:

- implemented foundation

Implemented evidence:

- `frontend/src/components/AdminPage.tsx`
- `frontend/src/features/admin/`
- reliability workspace and drill-in behavior

Remaining gaps:

- stronger role safety, workflow closure, and full commercial reconciliation maturity

## Sprint 11

Theme:

- tenant IA and canonical workspace ownership

Current assessment:

- partly implemented through the current tenant shell, but not complete relative to target

Next required work:

- canonical auth entry
- create-versus-claim flow
- onboarding status and progress model

## Sprint 12

Theme:

- tenant workspace completion and publish-safe product behavior

Current assessment:

- current code already overlaps this sprint, but completion is still pending

Next required work:

- stronger onboarding completion
- better tenant action queues
- clearer monthly commercial visibility

## Sprint 13

Theme:

- unified tenant identity and onboarding completion

Current assessment:

- still active, but public-surface productization work has already overlapped it on the public route

Must deliver next:

- create-account flow
- claim-account flow
- onboarding state model
- correct redirect and session continuity inside `tenant.bookedai.au`
- continue harmonizing tenant entry quality with the now-live public homepage and product-route conversion expectations

## Sprint 14

Theme:

- tenant billing workspace and admin support readiness

Current assessment:

- still active, with cross-surface UX productization already partially overlapping it

Must deliver next:

- invoice read model seam
- payment-method seam
- plan and billing action states
- admin support-safe drill-ins for tenant billing/auth investigation
- keep portal, tenant, admin, and billing UX quality aligned with the now-live homepage and product-route conversion standards

## Sprint 15

Theme:

- monthly value reporting, regression coverage, and tenant retention loops

Current assessment:

- pending, but public-surface regression coverage has moved ahead of this sprint in the homepage and product CTA lanes

Must deliver next:

- tenant value reporting
- promote-or-hold checks for tenant and billing flows
- broader regression coverage across commercial workflows
- add explicit browser and release checks for homepage sales-deck CTA continuity, register-interest routing, and booking-form focus behavior

## Sprint 16

Theme:

- release discipline and scale readiness

Current assessment:

- pending final hardening

Must deliver next:

- cross-lane release thresholds
- rollback discipline for tenant and commercial lanes
- scale-readiness and operational confidence review

## Detailed next execution order

### Execution wave A

Primary target:

- finish the tenant identity spine and upgrade tenant entry UX

Included scope:

- create account
- claim workspace
- onboarding status
- first-run setup
- session continuity and capability model cleanup
- professional tenant login shell and clearer onboarding entry
- cross-surface UX inventory for public, tenant, admin, portal, and billing

Primary sprint ownership:

- Sprint 13

### Execution wave B

Primary target:

- finish the tenant billing and paid-SaaS posture while defining the portal and admin-entry upgrade baseline

Included scope:

- plan state clarity
- payment-method seam
- invoice seam
- subscription action seam
- admin support-safe billing visibility
- admin login and session-entry refinement
- portal runtime architecture and booking-review UX definition
- tenant workspace shell refinement so catalog, bookings, integrations, and billing read as one product

Primary sprint ownership:

- Sprint 14

### Execution wave C

Primary target:

- make portal, tenant value, and billing behavior release-grade

Included scope:

- monthly value cards
- value-to-plan narrative
- regression checks for tenant auth, tenant publish, and tenant billing
- admin smoke for support and retry paths
- first dedicated professional customer portal implementation
- billing UX implementation for self-serve SaaS expectations
- public and portal UI continuity verification

Primary sprint ownership:

- Sprint 15

### Execution wave D

Primary target:

- close phase 9 hardening

Included scope:

- promote or hold thresholds across search, tenant, billing, and admin workflows
- rollback guidance by lane
- final release-readiness baseline
- whole-system visual and interaction harmonization review across public, portal, tenant, and admin
- release-grade UX regression checks for the highest-value user flows

Primary sprint ownership:

- Sprint 16

## Documentation synchronization rule from this baseline

After `2026-04-19`, every later planning or implementation update should assume:

- the current codebase already contains real public, tenant, admin, backend, and release-gate foundations
- planning should not describe tenant, billing, admin, or public search as not-yet-started when code already exists
- future sprint docs should describe unfinished areas as `completion`, `hardening`, or `productization` work where that is the real state

## Definition of planning success

This plan should be considered correctly adopted when:

- requirement docs reflect the current code baseline
- sprint planning no longer resets already-shipped foundations back to zero
- the next execution wave is clearly focused on tenant identity, billing posture, and release-grade hardening
