# BookedAI doc sync - docs/development/project-plan-code-audit-2026-04-19.md

- Timestamp: 2026-04-21T12:51:09.361470+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/project-plan-code-audit-2026-04-19.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Project Plan vs Code Audit Date: `2026-04-19` Document status: `audit snapshot` ## Purpose

## Details

Source path: docs/development/project-plan-code-audit-2026-04-19.md
Synchronized at: 2026-04-21T12:51:09.162747+00:00

Repository document content:

# BookedAI Project Plan vs Code Audit

Date: `2026-04-19`

Document status: `audit snapshot`

## Purpose

This note reviews the current BookedAI project plan against the checked-in codebase and identifies:

- what is already implemented in code
- what is partially implemented or still foundation-only
- what remains unstarted relative to the active roadmap
- what should happen next

This audit is based on:

- `README.md`
- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/coding-implementation-phases.md`
- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/development/implementation-progress.md`
- direct inspection of `backend/`, `frontend/`, `deploy/`, `scripts/`, `backend/migrations/sql/`, and the checked-in test suites

## Verification status used for this audit

Verified directly in this pass:

- frontend production build succeeds with `npm run build` in `frontend/`
- host and deployment wiring exists for `bookedai.au`, `api.bookedai.au`, `admin.bookedai.au`, `product.bookedai.au`, `demo.bookedai.au`, `portal.bookedai.au`, and `tenant.bookedai.au`
- backend `/api/v1/*` surface, tenant auth, tenant catalog workflow, admin surface, migration SQL, and release-gate scripts exist in code

Could not be fully verified in this shell:

- backend pytest suites were not executed because `pytest` is not installed in the current environment
- live production behavior was not re-verified from the network in this audit pass

## Executive summary

The project is materially ahead of a planning-only state.

BookedAI already has:

- a real public search-first frontend
- a real admin frontend
- a real tenant frontend
- additive `/api/v1/*` backend contracts
- tenant auth foundations with Google and password login
- tenant catalog import, review, publish, and archive flows
- tenant billing and workspace read models
- matching and search quality work with replay and release-gate scripts
- deployment and host routing for the main public, product, admin, tenant, portal, demo, beta, and API surfaces
- additive SQL migration packages for the commercial and tenant foundation

The main gap is no longer "build the first version."

The main gap is now:

- completing the tenant product from foundation into a polished paid SaaS flow
- tightening commercial truth and release thresholds across more than just the search lane
- converting several read-model and scaffold areas into full operational workflows

## Priority reset recommended on `2026-04-19`

Recommended delivery order from this audit:

1. `Priority 1 - Stable core journeys`
   Keep the live flow simple but dependable across public user, tenant, and admin surfaces. The first acceptance bar is accurate search results, correct result rendering, reliable payment flow, confirmation email delivery, and QR-based portal revisit.
   This priority still has to preserve premium branding, investor appeal, and user attraction on the public surface.
2. `Priority 2 - Module detail uplift`
   Once the core flow is stable, deepen each module individually: tenant workspace, admin diagnostics, catalog and publishing, reporting widgets, portal detail views, lifecycle messaging, and payment recovery.
3. `Priority 3 - Advanced, legal, and user-group data review`
   Review advanced features, legal or compliance requirements, and detailed data structures for each user group only after the stable flow and module-level upgrades are already working well.

This means the roadmap should favor hardening already-existing surfaces over introducing broader new capability early.
It also means real SME customers should be onboarded early as live validation, either in standalone mode or through links into the broader BookedAI portal experience.
It also means public pricing and registration surfaces should use one package vocabulary consistently:
`Freemium`, `Top 10 SMEs`, and `Upgrade 1-3`, with `Starter / Growth / Pro` treated only as internal mapping if still required by the current backend contract.

## Phase-by-phase assessment

### Phase 0 - Narrative and architecture reset

Status: `mostly done`

Evidence:

- PRD and roadmap documents are aligned around the AI revenue engine positioning
- README and deployment docs reflect the multi-surface architecture
- public, tenant, and admin hosts are consistently referenced across docs and deploy config

Remaining gaps:

- some execution docs still describe inherited historical baselines and require ongoing cleanup when new work lands

### Phase 1 - Public growth and premium landing rebuild

Status: `implemented baseline, still evolving`

Evidence:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/apps/public/HomepageSearchExperience.tsx`
- multilingual homepage baseline with `English` and `Tiếng Việt`
- public branding assets under `frontend/public/branding/`
- responsive and live-read Playwright suites under `frontend/tests/`
- frontend build succeeded in this audit pass

Assessment:

- the public surface has moved well beyond a brochure shell
- the current homepage is a search-first runtime, which matches the latest plan better than the older narrative-heavy versions

Remaining gaps:

- premium public narrative and product marketing are present, but the strongest maturity is in the search runtime itself rather than a fully finished revenue-proof growth site
- some older landing and assistant paths still exist as additive inventory and should continue being treated as secondary to the active homepage spine

### Phase 2 - Commercial data foundation

Status: `partially done`

Evidence:

- `backend/db.py` includes tenant and catalog support fields such as `owner_email`, `publish_state`, `currency_code`, and `display_price`
- `backend/migrations/sql/001...009`
- repository and service seams exist in `backend/repositories/`, `backend/domain/`, and `backend/service_layer/`
- shared contracts exist in `frontend/src/shared/contracts/`

Assessment:

- the repo has credible additive persistence foundations and migration discipline
- the project has started the shift away from all logic living directly in legacy concentration points

Remaining gaps:

- several roadmap-level entities are still represented as operational read models or additive mirrors rather than a complete normalized commercial domain
- migration posture still depends on SQL packages plus app coexistence rather than a fully consolidated migration/runtime authority

### Phase 3 - Multi-channel capture and conversion engine

Status: `meaningfully implemented, with known truth gaps`

Evidence:

- `/api/v1/matching/search`
- `/api/v1/conversations/sessions`
- `/api/v1/bookings/path/resolve`
- `/api/v1/bookings/intents`
- `/api/v1/payments/intents`
- `/api/v1/email/messages/send`
- `/api/v1/sms/messages/send`
- `/api/v1/whatsapp/messages/send`
- search and semantic test coverage in `backend/tests/`
- replay and eval scripts in `scripts/run_matching_search_replay.py` and `scripts/run_search_replay_gate.py`

Assessment:

- this is one of the strongest implemented lanes in the repo
- matching, semantic transparency, shortlist behavior, and booking-intent hints are already beyond prototype level

Remaining gaps:

- broader multi-channel stitching still appears uneven compared with the search lane maturity
- search has the clearest replay thresholds today; equivalent truth gates for other commercial flows are less mature
- search-to-booking handoff still needs a more normalized contract and stronger escalation policy

### Phase 4 - Revenue workspace and reporting

Status: `partially done`

Evidence:

- tenant overview, bookings, integrations, billing, and catalog routes exist
- admin dashboards and diagnostics exist
- tenant and admin UIs both expose commercial and operational state

Assessment:

- reporting visibility exists in code
- the product already has usable operator-facing read surfaces

Remaining gaps:

- reporting truth appears stronger in selected slices than as a fully unified commercial reporting model
- monthly value reporting, attribution clarity, and broader revenue narrative still need deeper tenant-facing completion

### Phase 5 - Recovery, payments, and commission operations

Status: `partial foundation`

Evidence:

- payment intent route exists
- billing read models exist
- integration reconciliation and outbox routes exist
- admin reliability and retry workflows exist

Assessment:

- the repo contains real operational scaffolding for payment, retry, reconciliation, and workflow support
- this phase is not empty, but it is less complete than search and tenant catalog lanes

Remaining gaps:

- self-serve billing actions are not complete
- invoice ledger and payment-method management are not yet implemented
- commission logic is discussed broadly in plan docs but is not yet obviously complete as a first-class end-to-end product workflow
- recovery appears more support-oriented and partial than fully productized across tenant and admin

### Phase 6 - Optimization, evaluation, and scale hardening

Status: `partially done and actively advancing`

Evidence:

- release gate scripts exist
- replay gate scripts exist
- Playwright suites exist for public and admin
- backend test suite is sizeable
- deploy scripts, beta deploy path, and rehearsal scripts exist

Assessment:

- the repo has meaningful QA and release discipline foundations
- this is a real delivery lane, not a placeholder

Remaining gaps:

- release thresholds appear strongest for the search lane, not yet uniformly across all critical commercial workflows
- backend verification is currently environment-sensitive because this shell lacks pytest, which is also a reminder that reproducible local test bootstrap should stay a priority

### Phase 7 - Tenant revenue workspace

Status: `implemented foundation with a real product shell`

Evidence:

- `frontend/src/apps/tenant/TenantApp.tsx`
- `/api/v1/tenant/overview`
- `/api/v1/tenant/bookings`
- `/api/v1/tenant/integrations`
- `/api/v1/tenant/billing`
- `/api/v1/tenant/catalog`
- `/api/v1/tenant/catalog/import-website`
- `/api/v1/tenant/catalog/{service_id}`
- `/api/v1/tenant/catalog/{service_id}/publish`
- `/api/v1/tenant/catalog/{service_id}/archive`

Assessment:

- this lane is already real in code, not just planned
- tenant users can sign in, view workspace panels, import catalog data, edit, review, publish, and archive records
- tenant billing posture is visible at read-model level

Remaining gaps:

- no polished self-serve sign-up flow
- no canonical create-account or claim-account flow
- no invite or multi-user team workflow
- no production-grade role matrix beyond the first authenticated slice
- no complete monthly value and retention-oriented tenant reporting loop

### Phase 8 - Internal admin optimization and support platform

Status: `implemented foundation with good operational depth`

Evidence:

- `frontend/src/components/AdminPage.tsx`
- `frontend/src/features/admin/`
- admin reliability workspace lazy loading
- bookings, diagnostics, drift review, recent examples, and retry-related operator tooling
- admin Discord handoff route and supporting services

Assessment:

- admin is no longer just a thin internal page
- there is already a credible operations console structure with multiple workspaces

Remaining gaps:

- deeper support workflows, audit tooling, and role-aware controls still need finishing
- some reliability and reconciliation tooling remains additive and operator-assistive rather than fully closed-loop

### Phase 9 - QA, release discipline, and scale hardening

Status: `partially done`

Evidence:

- `docs/development/release-gate-checklist.md`
- `scripts/run_release_gate.sh`
- `scripts/run_release_rehearsal.sh`
- `scripts/run_search_replay_gate.py`
- browser suites and backend tests are present in the repo

Assessment:

- the release-discipline architecture exists and is already connected to search replay
- this is stronger than a typical early-stage project

Remaining gaps:

- not all important tenant, billing, recovery, and admin flows appear to have release-grade thresholds equal to the search lane
- final promote-or-hold logic is still uneven by domain

## Surface-by-surface status

### Public app

Status: `strong`

What is done:

- search-first homepage runtime
- multilingual baseline
- inline shortlist and booking progression
- portal handoff support
- production build verified

What still needs work:

- continue pruning legacy parallel public paths
- deepen revenue-proof storytelling without reducing search usability

### Backend API and services

Status: `strong but uneven`

What is done:

- large `/api/v1/*` surface
- tenant auth endpoints
- matching and booking-intent routes
- payment, email, SMS, WhatsApp, reconciliation, outbox, and tenant routes

What still needs work:

- continue moving new logic away from legacy concentration files
- complete deeper commercial domain normalization

### Tenant workspace

Status: `real foundation`

What is done:

- dedicated tenant app shell
- Google and password auth
- overview, catalog, bookings, integrations, billing panels
- import, update, publish, and archive workflows

What still needs work:

- onboarding and account creation
- team and roles
- self-serve billing actions
- monthly value reporting

### Admin workspace

Status: `real foundation`

What is done:

- multiple workspaces and panels
- operational diagnostics
- review queue and drift investigation
- support-oriented reliability tooling

What still needs work:

- stronger workflow closure loops
- sharper permissions and support-safe boundaries

### Migrations and data safety

Status: `good additive foundation`

What is done:

- ordered SQL migration set
- apply and verify helper scripts
- tenant/catalog schema hardening

What still needs work:

- staging or shadow apply discipline should remain mandatory
- longer-term migration authority is still transitional

## Items that are clearly not done yet

These are the clearest roadmap items still missing or incomplete:

- polished tenant self-serve sign-up
- canonical tenant account creation and claim workflow
- invite and multi-user membership management
- payment-method management
- invoice ledger
- self-serve subscription changes
- complete role and permission matrix
- broader commercial release thresholds outside the search lane
- fully unified monthly value and retention reporting for tenants
- end-to-end commission operations as a clearly complete product workflow

## Recommended next-step plan

### Priority 1 - Finish the tenant product spine

Why:

- tenant foundation is already real
- this is the shortest path from "internal/operator-heavy platform" to "credible paid SaaS workspace"

Recommended scope:

- create-account and claim-account flow
- onboarding status model and first-run setup
- plan and billing UX completion
- invoice and payment-method seams
- role and membership model v1

### Priority 2 - Turn billing and commercial truth into first-class tenant-facing product behavior

Why:

- billing visibility exists, but actionability is still behind the target product

Recommended scope:

- payment-method state
- invoice ledger read model
- subscription status transitions
- clearer value-to-plan reporting

### Priority 3 - Harden release gates beyond search

Why:

- search already has a credible replay discipline
- the rest of the commercial platform needs similar promote-or-hold confidence

Recommended scope:

- tenant auth smoke lane
- tenant catalog publish smoke lane
- tenant billing read-contract checks
- admin reconciliation and retry smoke lane
- recovery and payment-path regression checks

### Priority 4 - Continue backend modularization around commercial truth

Why:

- the current repo has good seams, but some heavy legacy files still remain

Recommended scope:

- reduce new logic landing in `backend/services.py`
- reduce new logic landing in `backend/api/route_handlers.py`
- keep v1 and tenant work on repository and service seams

## Practical implementation sequence

1. Close Sprint 13-14 style tenant identity and billing workspace gaps first.
2. Add release-grade runner coverage for tenant auth, tenant publish, and tenant billing.
3. Implement team membership and role-safe actions.
4. Add invoice and payment-method flows.
5. Expand tenant monthly value reporting and plan-to-value framing.
6. Tighten admin support workflows around the same tenant and billing truth.
7. Only then broaden deeper phase-9 hardening and scale-readiness gates.

## Final assessment

BookedAI is not at the "start building" stage anymore.

The repo already contains a substantial product foundation across public, backend, tenant, admin, deployment, and release tooling.

The next program phase should focus less on inventing new architecture and more on:

- finishing the tenant commercial product spine
- completing billing and account workflows
- standardizing commercial truth and release gates across more lanes
- reducing the remaining gap between strong foundations and fully closed-loop product behavior
