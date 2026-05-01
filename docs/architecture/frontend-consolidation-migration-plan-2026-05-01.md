# Frontend Consolidation Migration Plan

Date: `2026-05-01`

Status: `active migration baseline`

## Purpose

This document defines how BookedAI will migrate from mixed frontend runtime ownership toward one unified React runtime.

The goal is not merely to reduce technical confusion.

The goal is to improve delivery speed, design consistency, runtime clarity, shared business logic, and long-term operational control.

## 1. Frontend decision locked

BookendAI frontend direction is now locked as:

- long-term unified frontend runtime target: `Next.js`
- current `Vite` runtime: transitional only
- no permanent equal-first dual runtime ownership

Important clarification:

- this is not `Vite -> React`
- this is `mixed React runtimes -> one React runtime`
- `Next.js` is the chosen unified runtime target

## 2. Why this migration is now required

Keeping mixed frontend ownership for too long creates:

- duplicated UI patterns
- duplicated routing/app-shell logic
- duplicated auth and session posture
- confusing design ownership
- harder testing and deploy coordination
- slower feature rollout across public, portal, tenant, and admin surfaces
- higher risk that the system feels like separate products instead of one BookedAI platform

## 3. Migration objective

The migration objective is:

- unify frontend execution around one runtime
- keep live revenue paths stable during migration
- stop expanding strategic surface area on Vite
- move shared design, shell, auth, and business-facing UI patterns into the unified target
- close the Vite lane once the remaining transitional surfaces are retired

## 4. Core migration rules

### Rule F1. No new strategic frontend expansion on Vite
Allowed on Vite:
- keep-live fixes
- bug fixes
- low-risk maintenance
- temporary compatibility work needed to protect live revenue paths

Not allowed on Vite by default:
- new strategic platform foundations
- new long-term shared shell investments
- major new surface launches when the same work should live in the unified target runtime

### Rule F2. Migrate by surface, not by random component drift
Migration should move in managed surface slices, not through unstructured partial rewrites that increase confusion.

### Rule F3. Shared primitives before broad surface migration
The platform should first stabilize:
- shared design primitives
- shared layout/app shell
- shared auth/session rules
- shared navigation conventions
- shared API/client boundary posture

### Rule F4. Revenue continuity beats migration purity
Do not break active lead, booking, portal, tenant, or admin flows just to migrate faster.

### Rule F5. Business-critical duplication should shrink every phase
If duplicate logic or duplicate UI rules exist in both lanes, the plan should reduce that duplication deliberately, not normalize it.

## 5. Recommended migration priority order

### Step 1. Shared frontend foundation
Build or normalize:
- shared design primitives
- shared brand primitives
- shared shell/layout conventions
- shared auth/session posture
- shared API client posture
- shared responsive behavior rules

### Step 2. `tenant.bookedai.au`
Why early:
- central tenant operating surface
- high leverage for onboarding, billing, reporting, and installability
- strong need for shared app-shell consistency

### Step 3. `admin.bookedai.au`
Why early:
- operator control surface
- highest need for truth, consistency, diagnostics, and shared internal UX patterns

### Step 4. `portal.bookedai.au`
Why next:
- customer continuity surface
- requires stable booking/payment/status truth and good mobile-safe experience
- benefits strongly from shared shell and auth/session patterns already proven in tenant/admin

### Step 5. `bookedai.au` and other public growth surfaces
Why after internal/control surfaces:
- public growth surfaces can benefit most from Next.js SSR/SEO and structured composition
- but they should migrate after the platform shell and operational surfaces are more stable

### Step 6. secondary/demo/vertical surfaces
Examples:
- `product.bookedai.au`
- `pitch.bookedai.au`
- `roadmap.bookedai.au`
- vertical proof/demo surfaces

These should follow the main platform migration, unless one becomes a direct revenue-critical exception.

## 6. Surface handling posture during migration

### `tenant.bookedai.au`
Target posture:
- become one of the earliest major Next.js-owned surfaces
- act as proof for shared shell, auth, billing, reporting, and installability UX

### `admin.bookedai.au`
Target posture:
- migrate early after or alongside tenant foundations
- unify internal operator UX and diagnostics posture

### `portal.bookedai.au`
Target posture:
- migrate after shell/auth truth is stable
- preserve customer-safe mobile revisit and payment/status continuity

### `bookedai.au`
Target posture:
- migrate when shared primitives and platform shell are stable enough
- preserve growth, search trust, and conversion continuity

### Vite lane during transition
Target posture:
- maintenance and continuity only
- no indefinite ownership normalization
- explicit retirement target after surface migrations complete

## 7. What not to do

Do not:
- rewrite all frontend surfaces in one big-bang pass
- keep both runtimes as equal-first permanent platform targets
- continue adding strategic shared UI foundations in the Vite lane
- split design-system ownership across both runtimes indefinitely
- migrate in ways that interrupt revenue-critical live flows without strong justification

## 8. Delivery integration rule

The frontend migration plan should be integrated into the whole-project order like this:

1. technical foundation decision is locked
2. container and environment posture is clarified
3. backend truth and scale discipline strengthens
4. monetization operating truth continues
5. frontend convergence advances in controlled slices
6. partner/installability scale expands on top of a clearer frontend foundation

This means frontend migration is a high-priority foundation program, but not a reason to ignore revenue continuity.

## 9. Acceptance criteria for the migration program

The migration program should be considered structurally complete only when:

- `Next.js` is the clear owner of the main platform frontend surfaces
- Vite is no longer receiving strategic platform expansion
- shared shell/design/auth/API posture is unified enough across surfaces
- tenant, admin, and portal are no longer split by avoidable runtime confusion
- remaining secondary surfaces have either migrated or are explicitly marked temporary exceptions
- Vite retirement is planned or complete

## 10. Change request rule for frontend direction

Any proposal that changes this frontend direction must now enter through the Change Request process.

That includes:
- reopening dual-runtime strategy
- introducing a third strategic runtime
- major new Vite-based platform investments
- reordering the surface migration priority in ways that affect revenue or delivery risk materially

## 11. Immediate next execution artifacts

This plan should be followed by:

1. container topology and service boundary spec
2. shared frontend foundation inventory
3. surface-by-surface migration backlog
4. Vite retirement criteria
5. Next.js target app-shell and routing blueprint

## Short rule

BookedAI should now converge from mixed frontend ownership into one React runtime:

`Next.js becomes the long-term owner, Vite becomes the temporary bridge, and migration happens by controlled surface order.`
