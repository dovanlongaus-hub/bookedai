# BookedAI User Surface and SaaS Upgrade Plan

Date: `2026-04-19`

Document status: `active experience and productization plan`

## Purpose

This document adds a user-layer upgrade plan on top of the existing phase and sprint roadmap.

It exists to make sure later execution does not improve backend contracts, tenant workflows, or release gates in isolation while leaving the real product surfaces inconsistent, confusing, or below expected SaaS standards.

This plan should now be read together with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/frontend-runtime-decision-record.md`
- `docs/architecture/public-growth-app-strategy.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/development/tenant-billing-auth-execution-package.md`

## Core design rule

All major user-facing and operator-facing surfaces should now be upgraded as one coherent system:

- public frontend
- customer booking portal
- tenant workspace
- admin login and admin workspace
- billing and plan experience

No single surface should feel like it belongs to a different product generation.

## System-wide UX principles

Every upgrade lane in this plan should inherit these rules:

1. `User-friendly before feature-heavy`
   - simplify flows first
   - reduce visual noise
   - make the next action obvious
2. `Search and action first`
   - primary screens should behave like working product surfaces, not brochure pages
   - key actions should be visible without digging
3. `SaaS-standard trust`
   - identity, billing, subscriptions, invoices, booking records, and settings should feel reliable, auditable, and clear
4. `One design language`
   - public, portal, tenant, and admin should feel related even when their density differs
5. `Professional state design`
   - loading, empty, success, warning, blocked, expired-session, and error states must be designed intentionally
6. `Mobile-safe where it matters`
   - public, portal, and tenant need mobile-usable daily flows
   - admin can remain desktop-first but should not feel broken on narrower screens

## User-layer upgrade lanes

## Lane 1 - Public frontend rebuild to feel like a real search product

Primary user:

- prospect or end customer

Target outcome:

- the public experience should feel closer to a real search-and-action system than a typical startup landing page
- users should be able to search, compare, understand the next step, and move forward with confidence

Current baseline:

- a real public search-first shell already exists
- shortlist and booking-ready progression already exist
- responsive smoke coverage already exists
- the current approved runtime direction is now `responsive web app first`, with homepage as acquisition or orientation surface and deeper live product interaction routed into the web runtime

Main gaps:

- the current public shell still needs stronger product-grade information architecture, query refinement, trust framing, and consistency across results, details, and booking action states
- some older public surfaces still create additive drift

Upgrade scope:

- simplify and strengthen homepage information hierarchy
- improve result-card scanability and side-panel decision support
- improve query refinement, empty states, near-me guidance, and recovery states
- keep the public story aligned to one responsive web product path rather than implying a parallel native-mobile-first rollout
- make the public surface feel closer to a "Google for service booking intent" standard:
  - prominent search box
  - fast result comprehension
  - clean shortlist transitions
  - confident next-step actions
- unify typography, spacing, motion, and surface states across public routes
- review all public feature affordances and remove duplicate or low-signal UI

Definition of done:

- public users can understand where to type, what they got back, why it is relevant, and what to do next within seconds

## Lane 2 - Customer portal as a professional booking-review surface

Primary user:

- customer who already booked or requested a booking

Target outcome:

- `portal.bookedai.au` should become a real post-booking customer surface, not just a redirect target or booking-reference handoff

Current baseline:

- the system already generates `portal.bookedai.au/?booking_reference=...`
- portal access is already part of the booking handoff language
- there is not yet a mature dedicated portal application surface in the repo

Main gaps:

- no clear professional portal UX for reviewing booking details
- no polished post-booking information architecture
- no clearly designed actions for edit, cancel, reschedule, payment follow-up, or confirmation review

Upgrade scope:

- introduce a dedicated customer portal runtime or route-owned portal shell
- add a clean booking detail page for:
  - booking summary
  - service and provider summary
  - date, time, location, and channel details
  - payment status
  - follow-up status
  - support contact path
- add clear customer actions:
  - review booking
  - reschedule request
  - cancel request
  - payment completion
  - save/share booking details
- add better QR, mobile, and confirmation-screen continuity
- align the portal visually with public and tenant surfaces while keeping it simpler

Definition of done:

- customers can open the portal and clearly understand their booking state and allowed next actions without needing staff help

Cross-lane execution note:

- for the current phase, public, portal, tenant, and admin surface planning should all assume the responsive web runtime is the active product baseline
- native mobile remains a later expansion path, not a current user-surface delivery assumption

## Lane 3 - Tenant login and tenant workspace experience upgrade

Primary user:

- SME operator or tenant owner

Target outcome:

- tenant sign-in and first-run experience should feel like a polished paid SaaS product

Current baseline:

- tenant workspace already exists
- Google and password auth foundations already exist
- overview, catalog, bookings, integrations, and billing panels already exist

Main gaps:

- login feels foundational rather than premium
- onboarding and account creation are incomplete
- workspace still needs stronger UX framing, action prioritization, and SaaS-grade account posture

Upgrade scope:

- redesign tenant auth entry as one canonical product gateway
- add create-account and claim-account flows
- add clearer workspace selection and onboarding progress
- redesign tenant home around:
  - what changed
  - what needs action
  - what is at risk
  - what value was generated
- improve panel navigation, density, and mobile behavior
- unify empty states, warnings, and success states
- make catalog, bookings, integrations, and billing feel like one product instead of separate panels

Definition of done:

- tenant users can sign in, understand the account state, and find their next important action without learning the system first

## Lane 4 - Backend admin login and admin entry experience upgrade

Primary user:

- internal operator or admin

Target outcome:

- admin login should feel secure, professional, and aligned with a serious internal ops product

Current baseline:

- admin login screen already exists
- admin workspace already exists with multiple operational areas

Main gaps:

- admin entry still reads more like an early internal screen than a mature secure ops gateway
- trust, role, session, and support-entry clarity can improve

Upgrade scope:

- redesign admin login around:
  - trust
  - operational clarity
  - role-aware expectations
  - safer session feedback
- improve error messaging, lockout/invalid state handling, and session-expiry UX
- prepare for later role-aware admin entry, MFA seam, and audit-friendly access flows
- align login shell styling with the rest of the BookedAI system without making admin look like a consumer product

Definition of done:

- admin operators get a clean, secure, credible sign-in experience that matches the seriousness of the internal console

## Lane 5 - Billing, plan, and SaaS-standard user flows

Primary users:

- tenant owner
- finance-aware operator
- internal support or billing ops

Target outcome:

- billing and plan experiences should behave like a true SaaS product instead of a partial operational read model

Current baseline:

- tenant billing read models and billing panel exist
- backend billing seams exist
- admin reliability and reconciliation foundations exist
- tenant billing now also includes self-serve setup, plan selection, trial posture, invoice seam, and payment-method seam
- tenant team and role workspace now exists as the first multi-user tenant control surface

Main gaps:

- real payment method management is missing
- provider-backed invoice history is missing
- plan posture and charge-readiness need stronger UX and workflow completion
- invite delivery and first-login acceptance polish are still missing

Upgrade scope:

- define SaaS-standard billing information architecture:
  - current plan
  - billing status
  - payment method
  - invoices
  - subscription actions
  - usage or value summary
- design billing flows for:
  - start trial
  - upgrade plan
  - update payment method
  - review invoices
  - retry failed payment
  - cancel or pause flow where applicable
- align tenant and admin views around the same billing truth
- make billing, subscription, and value reporting readable and non-ambiguous

Definition of done:

- a tenant can understand what they pay for, what failed, what is due next, and what action is available without support intervention

## Lane 6 - Whole-system feature and UI/UX harmonization

Primary users:

- all user groups

Target outcome:

- BookedAI should feel like one product system, not a collection of separately evolved surfaces

Current baseline:

- major surfaces already exist, but they reached maturity at different speeds

Main gaps:

- interaction patterns, information density, state design, and product polish are not yet fully consistent across all surfaces

Upgrade scope:

- define one cross-surface UX system for:
  - navigation logic
  - page headers
  - cards and lists
  - search/filter patterns
  - status badges
  - modals and drawers
  - empty states
  - error states
  - success confirmations
  - account and billing patterns
- review feature inventory surface by surface and remove low-value duplication
- align public, portal, tenant, and admin around one system map:
  - discover
  - shortlist
  - book
  - review
  - operate
  - pay
  - support
- make sure each user layer has the right complexity for its audience

Definition of done:

- public, portal, tenant, and admin feel like clearly related parts of one coherent SaaS platform

## Recommended sprint mapping

### Sprint 13

Primary UX targets:

- tenant login upgrade
- create-account and claim-account design
- admin login upgrade specification
- cross-surface UX inventory and harmonization audit

### Sprint 14

Primary UX targets:

- tenant workspace shell refinement
- billing information architecture
- admin support-safe entry and billing investigation patterns
- portal product architecture and first dedicated portal surface spec

### Sprint 15

Primary UX targets:

- customer portal implementation
- billing UX implementation
- tenant value and plan posture experience
- cross-surface regression and usability verification

### Sprint 16

Primary UX targets:

- system-wide polish pass
- release-grade UX regression gate
- final consistency review across public, portal, tenant, and admin

## Review checklist for every surface

Every user surface touched by this plan should now be reviewed against the same questions:

1. Is the primary action obvious?
2. Is the page understandable in under ten seconds?
3. Are loading, empty, error, and blocked states intentionally designed?
4. Does the surface feel trustworthy enough for a real SaaS product?
5. Does the same design language exist across nearby surfaces?
6. Is the mobile experience acceptable for the intended user?
7. Are the available actions appropriate for the user role?
8. Does the surface reduce support burden instead of creating more confusion?

## Success criteria

This plan should be considered successful when:

- public search feels like a real product surface
- portal becomes a professional booking review experience
- tenant sign-in and workspace feel like a polished SaaS control surface
- admin login and admin entry feel secure and professional
- billing and subscription flows feel complete enough for self-serve SaaS expectations
- all major surfaces feel harmonized into one overall system
