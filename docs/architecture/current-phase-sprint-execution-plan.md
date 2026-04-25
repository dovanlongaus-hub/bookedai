# BookedAI Current Phase and Sprint Execution Plan

Date: `2026-04-25`

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

This execution baseline now also assumes a dual-agent product direction:

- a customer-facing `search and conversation agent`
- a BookedAI-side `revenue operations agent` that continues from lead through retention, billing, reminders, CRM sync, and action orchestration

Latest next-phase update from `2026-04-25`:

- the immediate execution plan after the full-flow QA pass is now documented in `docs/development/next-phase-implementation-plan-2026-04-25.md`
- current closeout is `Phase 17 - Full-flow stabilization`, covering pitch package registration, product booking, payment-intent preparation, communication best-effort work, Thank You confirmation, and return to the main BookedAI screen after `5s`
- the next implementation sequence is now `Phase 18` revenue-ops ledger control, `Phase 19` customer-care/status agent, `Phase 20` widget/plugin runtime, `Phase 21` billing and receivables truth, `Phase 22` reusable tenant templates, and `Phase 23` release governance
- the public brand/menu and live booking lane were re-checked after the uploaded logo rollout: demo/product/pitch/tenant now render without horizontal overflow on mobile and desktop, the customer-agent live-read path falls back to the v1 matching/search contract when needed, and the live stack health gate passed after deployment

## Source-of-truth inputs

This execution baseline inherits from:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/coding-implementation-phases.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/development/homepage-pitch-realignment-plan-2026-04-23.md`
- `docs/development/public-search-booking-resilience-ux-2026-04-23.md`
- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/project-plan-code-audit-2026-04-19.md`
- `docs/development/bookedai-chatbot-landing-implementation-plan.md`
- `docs/development/bookedai-sample-video-brief.md`

## Current implementation baseline

As of `2026-04-23`, the codebase already includes:

- a real public homepage plus pitch application pair, now being actively re-split into a lighter product-first homepage and a deeper narrative pitch surface
- an explicit public frontend runtime decision that the responsive web app is the current primary product surface, with native mobile deferred to a later phase
- a real public search-first application still available as deeper routed runtime inventory
- a public booking lane that now has to be treated as both a resilience lane and a UX lane: user-facing booking submit must survive degraded v1 writes, and slow search must still feel guided and legible instead of looking broken
- a real admin application
- a real tenant application
- a production multi-surface frontend runtime still served from `frontend/`
- a parallel root Next.js runtime lane that now builds successfully but does not yet replace the deployed Vite surface
- a large additive `/api/v1/*` backend contract surface
- a top-level backend router split across public catalog, uploads, webhooks, admin, communications, and bounded-context `v1` mounting
- `/api/v1/*` router decomposition through `backend/api/v1_router.py` and separate booking, search, tenant, communication, and integration route modules
- first-step tenant handler extraction through `backend/api/v1_tenant_handlers.py`
- tenant Google and password authentication foundations
- tenant `email-first` authentication with verification-code request and verify flows, with Google retained as the fast continuation path
- tenant catalog import, edit, publish, and archive workflows
- tenant overview, bookings, integrations, billing, and catalog panels
- matching, search quality, replay, and release-gate infrastructure
- a richer Phase 2 matching contract with normalized `booking_fit` summaries and `stage_counts` diagnostics across backend and frontend contract layers
- a reusable `016_cross_industry_full_flow_test_pack.sql` seed plus verifier coverage for 10 synthetic enterprise booking journeys
- a first explicit admin growth lane through `/admin/campaigns`, tied to source attribution and paid-revenue reporting
- additive SQL migrations for tenant and commercial foundations
- deploy wiring for public, API, admin, beta, demo, portal, and tenant hosts
- request-facing landing, pitch, storyboard, and promo-video working docs under `docs/development/` so Sprint 15-16 narrative assets inherit the same repo-truth baseline as code delivery

The main delivery problem is therefore no longer:

- "build the first working system"

The main delivery problem is now:

- finish incomplete commercial product loops
- close the tenant paid-SaaS gaps
- harden release discipline across more workflows
- keep requirement documents aligned with the already-shipped product baseline
- upgrade the major user surfaces so the whole system feels coherent, user-friendly, and SaaS-grade
- keep the full BookedAI search-to-booking flow confidence-building even under slow search or partial backend degradation
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

## Program summary snapshot

Date: `2026-04-22`

### Overall plan

The current BookedAI program should be read as one linked delivery chain rather than as isolated greenfield projects:

- Sprint 1 through Sprint 3:
  - reset narrative, architecture, branding, and the public acquisition spine
- Sprint 4 through Sprint 7:
  - harden search truth, reporting semantics, lifecycle workflows, and commercial foundations
- Sprint 8 through Sprint 10:
  - establish tenant onboarding, tenant workspace, and admin commercial operations as real code paths
- Sprint 11 through Sprint 16:
  - complete the user-surface SaaS upgrade across tenant, admin, portal, billing, release discipline, and cross-surface UX consistency

### Current phase status

- Phase 0:
  - `done baseline`
- Phase 1:
  - `implemented baseline`
- Phase 2:
  - `partial foundation complete`
- Phase 3:
  - `strongest active implementation lane`
- Phase 4:
  - `partial`
- Phase 5:
  - `partial foundation`
- Phase 6:
  - `partially active`
- Phase 7:
  - `real foundation implemented`
- Phase 8:
  - `real foundation implemented`
- Phase 9:
  - `partially active`

### Sprint status summary

Public execution note from `2026-04-23`:

- homepage realignment is now active, not speculative: `bookedai.au` is the simpler product-entry surface, while `pitch.bookedai.au` is the deeper story surface
- public search quality is now judged on interaction quality as well as correctness, which means slow matching states, result confidence, and booking-submit resilience are part of the sprint baseline

- Sprint 1:
  - `complete as a requirement baseline`
- Sprint 2:
  - `complete as an inherited baseline`
- Sprint 3:
  - `materially implemented in code`
- Sprint 4:
  - `partially implemented`
- Sprint 5:
  - `partially implemented`
- Sprint 6:
  - `substantially implemented`
- Sprint 7:
  - `partial foundation only`
- Sprint 8:
  - `materially implemented`
- Sprint 9:
  - `implemented foundation`
- Sprint 10:
  - `implemented foundation`
- Sprint 11:
  - `partly implemented`
- Sprint 12:
  - `overlapping implementation exists, completion still pending`
- Sprint 13:
  - `active`
- Sprint 14:
  - `active`
- Sprint 15:
  - `planned, with some implementation overlap already present`
- Sprint 16:
  - `planned release-hardening closeout`

### Admin workspace execution order

The admin workspace should now be executed in the following order from current repo reality, rather than replaying the whole blueprint as if the codebase were still greenfield:

- `Phase 0`:
  - runtime and production-ownership decision for the new root `Next.js` admin lane
- `Phase 1`:
  - production auth
  - signed session
  - tenant context
  - RBAC parity
  - immutable audit baseline
- `Phase 2`:
  - Prisma and repository parity so current admin modules stop depending on mock-only data truth
- `Phase 3`:
  - tenant
  - users
  - roles
  - settings
  - audit control-plane completion
- `Phase 4`:
  - customers
  - leads
  - services
  - bookings hardening on real tenant data
  - `Zoho CRM` seam continuation for customers and leads
- `Phase 5`:
  - payments and revenue-truth completion
- `Phase 6`:
  - dashboard
  - reporting
  - operator analytics expansion
- `Phase 7`:
  - campaigns
  - messaging
  - workflows
  - automation

Immediate next sequence after the current reporting baseline:

- keep `Campaigns` and the first `Messaging` workspace as already-opened growth-lane foundations, but do not let them become the main breadth-expansion lane for the current phase
- lock the next explicit execution package to `docs/development/golden-tenant-activation-revenue-proof-loop-2026-04-23.md`
- treat the shipped responsive web app as the phase truth and keep React Native or native-mobile work deferred
- use `Future Swim` as the primary vertical wedge for the first fully hardened commercial loop
- use `children's chess classes` and `AI Mentor 1-1` as secondary adaptation templates after the Future Swim loop is stable
- execute the next coding slices in this order:
  - tenant identity and activation completion
  - billing and commercial closure
  - lead-to-booking and lead-to-customer aftermath visibility
  - tenant revenue proof and monthly value reporting
- only after that loop is commercially credible should the next explicit growth slice move into broader `Workflow` definitions and then `Automation`

Immediate agent-specific execution overlay:

- `Slice A - Search and conversation agent hardening`
  - keep search/chat intake, clarification, shortlist, and booking handoff truthful and fast
- `Slice B - Revenue operations agent foundation`
  - create action queues for new leads, incomplete bookings, unpaid bookings, and follow-up due events
  - trigger email, SMS, WhatsApp, CRM sync, and webhook callbacks from auditable lifecycle policies
- `Slice C - Customer-state support agent`
  - allow returning customers to ask for booking, payment, invoice, or status help using verified email, phone, or booking reference
- `Slice D - Tenant billing and retention agent`
  - calculate fees, remind overdue tenants, send financial summaries, and flag churn-risk or rescue opportunities

Chess-first execution note:

- the next connected-agent implementation should use `Grandmaster Chess Academy` as the first required proof case
- do not start by designing the agent platform only as a generic abstraction without closing the chess end-to-end loop
- the required order is:
  - chess intake and assessment handoff
  - chess placement and booking handoff
  - chess subscription, reminder, and billing actions
  - chess parent support and retention handling
  - then reusable multi-tenant generalization
- the current checked-in step inside that order now includes:
  - parent-report preview persisted from booking success into portal continuation
  - portal-safe `reschedule`, `pause`, `downgrade`, and `cancel` request actions for academy follow-up
  - customer-care portal UX that reads the same academy lifecycle state instead of a disconnected booking-only receipt

### Next phase deadline

The immediate post-Sprint-16 working cadence is now locked to:

- freeze scope by Friday, April 24, 2026
- get AI end-to-end working before any UI polish pass
- post one one-line daily update in Discord
- submit the draft by Saturday, April 25, 2026
- record a rough video over the April 25-26, 2026 weekend
- deliver the final edit by Sunday, April 26, 2026
- use Monday, April 27, 2026 for final polish

### Next phase implementation order

The post-release implementation order is now:

1. finish `Phase 17` documentation and GitHub submission for the verified full-flow stabilization work
2. extend `Phase 18` so admin and tenant operators can inspect, filter, dispatch, transition, and audit revenue-ops action runs, including lifecycle-event, dependency, policy, and evidence-summary posture
3. implement `Phase 19` customer-care/status replies using booking, payment, subscription, report, communication, and action-run state
4. implement `Phase 20` widget/plugin install identity for SME-owned websites and prove one tenant-branded embed flow end to end
5. implement `Phase 21` billing, receivable, subscription, reminder, and commission truth after the ledger evidence model is stable
6. generalize `Phase 22` templates from chess and Future Swim only after both verticals remain green through the release gate
7. make `Phase 23` release governance the closeout requirement for every phase, including tests, traces, rollback notes, memory, Notion, and Discord sync
 

## Program status by phase

### Phase 0 - Narrative and architecture reset

Status: `done baseline`

Delivered baseline:

- PRD and roadmap are aligned around the AI revenue engine positioning
- pricing and architecture documents have already moved away from the old chatbot-first framing

Carry-forward work:

- requirement and pitch materials now need to describe the product as an AI agent system, not only a booking/search flow

- keep later sprint docs aligned with the current shipped product baseline instead of older historical assumptions
- keep homepage, popup assistant, and embedded booking assistant flows aligned so search-state wording, progress treatment, and booking-submit resilience do not drift apart again

### Phase 1 - Public growth and premium landing rebuild

Status: `implemented baseline`

Delivered baseline:

- public search-first shell is live in code
- multilingual locale switching exists
- homepage and pitch are now explicitly being separated by role, with the current code already moving toward a shorter product-first homepage and a deeper pitch narrative surface
- the public booking flow now has a first resilience patch for degraded v1 writes by falling back to the older booking-session lane when server or network failure would otherwise strand `Continue booking`
- the public search experience now has a first staged-progress treatment so slower matching can explain what BookedAI is doing and invite better query detail while results are still resolving
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
- keep `bookedai.au` focused on first-minute product entry while `pitch.bookedai.au` absorbs the longer explanatory narrative
- treat slow-search progress treatment and safe booking-submit fallback as active public requirements, not optional polish

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

- portal, tenant-value, and narrative asset production

Current assessment:

- planned, with execution overlap already present across portal-adjacent runtime work, homepage regression coverage, and the newly added landing/video/pitch documentation set

Must deliver next:

- first professional customer portal runtime and booking-review continuity
- tenant value reporting
- stronger billing and retention posture for paid-product expectations
- broader regression coverage across commercial workflows
- add explicit browser and release checks for homepage sales-deck CTA continuity, register-interest routing, and booking-form focus behavior
- turn the current landing and story assets into one coherent production package:
  - `docs/development/bookedai-chatbot-landing-implementation-plan.md`
  - `docs/development/bookedai-sample-video-brief.md`
  - `docs/development/bookedai-investor-pitch-deck.html`

## Sprint 16

Theme:

- release discipline, final polish, and publish-ready proof

Current assessment:

- planned release-hardening closeout, with the final April 24-27 delivery cadence now explicitly locked in the synced plan set

Must deliver next:

- cross-lane release thresholds
- rollback discipline for tenant and commercial lanes
- scale-readiness and operational confidence review
- final wording, visual, and proof-pack polish across homepage, pitch, and promo-video assets so the public narrative and shipped product evidence stay aligned

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

## Immediate next plan

Current lane owner: `root Next.js admin Phase 3 tenant support`

Just completed:

- dedicated `/admin/tenants` investigation workspace
- audited `read_only` tenant support mode
- deep links from admin investigation into tenant runtime `overview`, `billing`, `team`, and `integrations`
- unified tenant investigation timeline across auth, billing, CRM, integrations, and support-session audit events
- regression coverage for support-mode start/end contracts and tenant investigation timeline rendering
- support-mode banner expansion across the main admin workspaces with return-to-investigation links
- cross-surface return-link polish so tenant runtime can jump back into the originating admin investigation or admin workspace

Next recommended sequence:

1. `Tenant-support lane closeout`
   - treat the read-only tenant support loop as a usable baseline across admin and tenant runtime
   - only add more tenant-support behavior when a later approved slice needs deeper guided actions or stricter write blocking
