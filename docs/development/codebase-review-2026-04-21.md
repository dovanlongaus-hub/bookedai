# BookedAI Codebase Review

Date: `2026-04-21`

Document status: `active review snapshot`

## Purpose

This review records the current code-level state of the BookedAI repository after the router modularization and first tenant-handler extraction pass.

It is intended to be used immediately for:

- architecture review
- code-smell triage
- refactor prioritization
- next-sprint technical execution

This is not a greenfield review.

The baseline for this review is the checked-in repo state under `/workspace/bookedai.au` as inspected on `2026-04-21`.

## Executive summary

The codebase is materially implemented and commercially shaped.

BookedAI already contains:

- a real multi-surface product footprint
- an active FastAPI backend with public, tenant, admin, portal, communication, webhook, and integration seams
- a real tenant workspace baseline
- a real admin support baseline
- a real public search and booking-assistant baseline
- meaningful billing, portal, search, matching, and integration foundations

The main engineering problem is no longer missing product scope.

The main engineering problem is concentrated technical debt in a small number of oversized mixed-responsibility files.

Current top risk concentrations:

- `backend/api/v1_routes.py`
- `backend/services.py`
- `backend/tests/test_api_v1_routes.py`
- `frontend/src/apps/tenant/TenantApp.tsx`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`

The codebase is therefore best described as:

- commercially ahead of prototype stage
- architecturally on the right path
- currently in a transitional modularization phase

## Repository shape review

### Strong implementation signals

The repo already shows a real product platform rather than one demo shell:

- root App Router surface exists
- legacy frontend runtime still exists under `frontend/`
- backend runtime is active and non-trivial
- deployment, docs, tests, and integration seams are present
- tenant, admin, and portal flows are real implementation concerns

### Large-file hotspots observed in this pass

Most relevant large files in the checked-in project:

- `backend/services.py`
- `backend/api/v1_routes.py`
- `backend/tests/test_api_v1_routes.py`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/apps/tenant/TenantApp.tsx`
- `backend/api/route_handlers.py`
- `backend/service_layer/prompt9_matching_service.py`
- `backend/service_layer/tenant_app_service.py`

Interpretation:

- the product is implemented deeply enough to accumulate real operational code
- responsibility concentration is now the main maintainability risk
- safe future delivery depends more on ownership clarity than on net-new scaffolding

## Architecture review

## 1. Backend routing direction

### What is good now

Top-level API ownership is clearer than before.

`backend/app.py` now mounts explicit route groups:

- `public_catalog_routes`
- `upload_routes`
- `webhook_routes`
- `admin_routes`
- `communication_routes`
- `v1_router`

Within `/api/v1/*`, routing is also decomposed through `backend/api/v1_router.py`:

- booking routes: `5`
- search routes: `2`
- tenant routes: `27`
- communication routes: `3`
- integration routes: `12`

This is real modularization, not just documentation intent.

### What is still weak

`backend/api/v1_routes.py` remains the main legacy handler concentration point.

It still mixes:

- payload models
- route handlers
- auth and actor resolution
- search logic orchestration
- booking and payment paths
- communication entrypoints
- tenant and portal actions
- integration status and reconciliation reads

This means the project has separated the router surface faster than the handler ownership.

That is a good incremental tactic, but it is only half the refactor.

### Architecture judgment

The direction is correct.

The remaining work is not to redesign the routing model again.

The remaining work is to finish handler ownership extraction by bounded context.

## 2. Bounded-context status

### Current state

The repo now clearly expresses these backend contexts:

- booking
- search
- tenant
- communications
- integrations
- portal
- admin

Tenant is the first context with live handler extraction through `backend/api/v1_tenant_handlers.py`.

Current tenant routes are in mixed mode:

- some routes use `v1_tenant_handlers`
- many still call legacy handlers from `v1_routes`

### Review judgment

This is the right migration pattern:

- router split first
- move handler logic gradually
- keep legacy handlers available during transition
- cut over route-by-route rather than big-bang rewrite

The risk is not the migration strategy.

The risk is stalling halfway and leaving permanent dual ownership.

## 3. Auth and secret boundary

### What is good now

Session-signing separation is a strong improvement.

Current secret model:

- `SESSION_SIGNING_SECRET`
- `TENANT_SESSION_SIGNING_SECRET`
- `ADMIN_SESSION_SIGNING_SECRET`

The shared helper module `backend/core/session_tokens.py` is a good architectural move because it:

- removes duplicated signing logic
- makes actor-boundary auth intent explicit
- reduces accidental coupling to admin credentials

### Remaining caution

Compatibility fallback still reaches:

- `ADMIN_API_TOKEN`
- `ADMIN_PASSWORD`

That is acceptable for migration, but it should remain explicitly transitional.

### Review judgment

The secret separation work is sound and should be preserved through the remaining refactor.

No later auth cleanup should collapse these actor boundaries again.

## 4. Service-layer structure

### Current state

The repo has meaningful service-layer seams already, for example:

- `tenant_app_service`
- `prompt9_matching_service`
- `prompt11_integration_service`
- `admin_presenters`
- `communication_service`
- `email_service`

This is a positive sign because the codebase is not purely route-driven.

### Main issue

`backend/services.py` is still a second monolith.

Observed concerns from file shape and contents:

- mixed utility and orchestration responsibilities
- public/demo/product flow logic mixed with generic helpers
- pricing plan definitions living beside geocoding, HTML parsing, map URL generation, and AI integration helpers
- too many reasons for unrelated features to import one shared file

### Review judgment

`backend/services.py` should not be the next immediate refactor target before handler extraction finishes.

But it is the next major debt cluster after `v1_routes.py`.

## 5. Test architecture

### Current state

`backend/tests/test_api_v1_routes.py` is too large and spans multiple concerns.

It currently mixes:

- search helper tests
- route envelope tests
- communication route tests
- tenant or integration-oriented API behavior
- many mocks and app setup helpers in one file

### Why this matters

When one test file mirrors one monolith route file, the test suite inherits the same ownership problem:

- hard to locate failures by context
- harder review scope
- more brittle fixtures
- discourages bounded-context refactor because tests stay centralized

### Review judgment

Test modularization should track handler extraction.

As contexts move out of `v1_routes.py`, tests should move with them.

## 6. Frontend architecture review

### Tenant app

`frontend/src/apps/tenant/TenantApp.tsx` is feature-rich and operationally valuable.

It already coordinates:

- auth mode selection
- tenant session handling
- gateway and invite context
- panel routing and hash sync
- overview, bookings, integrations, billing, onboarding, team, and catalog state
- form-state coordination
- partner match presentation logic

This is functionally strong, but file concentration is high.

### Public booking assistant

`frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` is also doing too much.

It combines:

- dialog state
- session priming
- live-read behavior
- shadow search and booking-intent behavior
- geo handling
- voice recognition browser integration
- product-sheet state transitions
- result rendering and shortlist behaviors

### Review judgment

Both frontend files are strong indicators of product maturity, not failure.

But they are now too large to remain the long-term ownership unit.

The right next step is not a UI rewrite.

The right next step is extraction into:

- screen containers
- feature hooks
- presentational subcomponents
- side-effect helpers

## Code smell list

### Critical smells

1. `Legacy concentration point`
- `backend/api/v1_routes.py` remains too broad
- impact: cross-context regression risk, slow review, auth drift risk

2. `Second-monolith service file`
- `backend/services.py`
- impact: unclear ownership, duplicated utility growth, high change blast radius

3. `Monolithic route test file`
- `backend/tests/test_api_v1_routes.py`
- impact: difficult failure isolation, poor context-based confidence

### High-priority smells

4. `Mixed router and handler ownership during migration`
- acceptable temporarily, dangerous if left unresolved
- impact: ambiguity about source of truth

5. `Frontend container overgrowth`
- `TenantApp.tsx`
- `BookingAssistantDialog.tsx`
- impact: difficult UI regression isolation and slow iteration

6. `Shared helper sprawl`
- generic helpers, product behavior, and integration logic living too close together
- impact: import gravity and context leakage

### Medium-priority smells

7. `Documentation can drift faster than code during refactor`
- some docs were already behind the actual extraction order
- impact: wrong sprint sequencing or incorrect technical assumptions

8. `Context boundaries exist in naming before they exist fully in implementation`
- route modules are cleaner than handler modules
- impact: false sense of completion if not tracked carefully

## Refactor priority matrix

## Priority 1, must do now

### A. Finish tenant bounded-context extraction

Move the remaining tenant and portal-adjacent handlers from `backend/api/v1_routes.py` into `backend/api/v1_tenant_handlers.py`.

Remaining target set:

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

Why first:

- tenant is already the active extraction lane
- it has the most route volume
- it touches auth, billing, onboarding, team, and portal continuity
- finishing one context is safer than starting many half-extracted contexts

### B. Split the route tests alongside tenant extraction

Create context-aligned test modules such as:

- `backend/tests/test_api_v1_tenant_routes.py`
- `backend/tests/test_api_v1_portal_routes.py`
- `backend/tests/test_api_v1_search_routes.py`
- `backend/tests/test_api_v1_booking_routes.py`
- `backend/tests/test_api_v1_integration_routes.py`
- `backend/tests/test_api_v1_communication_routes.py`

Why now:

- avoids locking future tests to legacy file shape
- makes each extraction step verifiable

### C. Restore the known failing public-web fallback cases

Explicit open regression lane:

- two public-web fallback cases in `backend/tests/test_api_v1_routes.py`

Why now:

- this is a release-truth issue, not cosmetic debt
- Sprint 15 and Sprint 16 should not inherit undocumented search fallback instability

## Priority 2, next after tenant closeout

### D. Extract integration handlers

Why next:

- integration routes already have a bounded router module
- they are operationally important but less risky than search-core refactor
- a cleaner integration slice will reduce admin and support coupling

### E. Extract communication handlers

Why next:

- small route count
- good candidate for clean separation after tenant and integrations
- should become low-risk once message templates and delivery adapters stay behind service-layer seams

## Priority 3, after the pattern is proven

### F. Extract search and booking handlers

Why later:

- this area is the most trust-sensitive
- public-web fallback regressions are already present
- search quality, ranking, and booking handoff need careful regression protection

### G. Split `backend/services.py`

Suggested future seams:

- `service_layer/catalog_assets.py`
- `service_layer/geo_utils.py`
- `service_layer/public_booking_runtime.py`
- `service_layer/pricing_plans.py`
- `service_layer/content_normalization.py`
- `service_layer/demo_orchestration.py`

Why not first:

- it is valuable, but it opens a second large refactor front
- handler extraction is currently the cleaner and more urgent ownership problem

## Next sprint technical action plan

## Sprint objective

Convert the current partial modularization into one fully completed bounded context and improve release confidence in parallel.

## Sprint theme

`Tenant and portal ownership closeout with regression-safe verification`

## Sprint outcomes

### Outcome 1
All tenant and portal routes under `/api/v1/*` resolve through `v1_tenant_handlers.py`, not directly through legacy tenant handlers in `v1_routes.py`.

### Outcome 2
Tenant and portal tests are split into context-based modules.

### Outcome 3
The known public-web fallback regressions are either fixed or isolated with explicit documentation and narrow failing scope.

### Outcome 4
Docs stay synchronized with the real extraction order and resulting ownership map.

## Suggested sprint work breakdown

### Lane 1, backend tenant closeout

1. extract billing handlers
2. extract onboarding and team handlers
3. extract catalog handlers
4. extract portal handlers
5. rewire `v1_tenant_routes.py` so tenant and portal paths no longer depend on legacy tenant handlers
6. run syntax verification

### Lane 2, test modularization

1. move tenant route tests into a dedicated file
2. move portal route tests into a dedicated file
3. keep temporary compatibility imports only where necessary
4. reduce shared fixture sprawl in the old monolith test file

### Lane 3, regression hardening

1. isolate the two public-web fallback failures
2. identify whether the issue is ranking logic, fallback policy, or test expectation drift
3. restore passing behavior without weakening tenant-first search policy

### Lane 4, documentation sync

1. update implementation progress
2. update current phase and sprint execution plan
3. update roadmap register if extraction order changes again
4. write memory summary for continuity

## Recommended acceptance checks

Minimum acceptance checks for the next active sprint:

- `python3 -m py_compile` for all touched backend modules
- context-targeted route tests for tenant and portal slices
- a focused rerun of the failing public-web fallback tests
- app import smoke for backend route registration
- doc sync pass for project, phase, and implementation status when ownership changes materially

## What should not happen next

Do not do these first:

- do not rewrite search and booking logic while tenant extraction is half-complete
- do not split `backend/services.py` before the `v1_routes.py` ownership problem is reduced further
- do not leave the repo in a long-lived mixed state where router files are modular but tests and handlers remain permanently monolithic
- do not let compatibility fallback secrets become the de facto long-term auth model again

## Final recommendation

The best next engineering move is not another planning cycle.

The best next engineering move is:

1. finish tenant and portal extraction fully
2. split tests along the same ownership line
3. fix the known fallback regressions
4. only then expand the same pattern to integrations and communications

That path gives the highest maintainability gain with the lowest architecture risk.
