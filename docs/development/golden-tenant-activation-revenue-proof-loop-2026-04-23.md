# Golden Tenant Activation + Revenue Proof Loop Execution Package

Date: `2026-04-23`

Document status: `active execution package`

## Purpose

This package locks the next BookedAI execution wave to one commercial outcome:

- take one tenant from activation to visible revenue proof inside the shipped responsive web app
- turn that path into the first repeatable SME revenue engine template
- delay React Native and any native-mobile-first expansion to a later phase

This package exists because the repo now has enough breadth across public, tenant, admin, CRM, billing, messaging, and reporting surfaces that the next bottleneck is no longer feature absence.

The bottleneck is now:

- tenant activation friction
- incomplete self-serve commercial closure
- missing tenant-facing proof-of-value loop
- too much risk of opening more breadth before the first repeatable paid loop is fully closed

## Locked execution decision

For this phase, BookedAI should optimize for:

- shipped responsive web app first
- current `frontend/` runtime as the main operator and tenant delivery truth
- root `app/` plus `components/` plus `lib/` as the controlled admin module hardening and promotion lane
- one golden tenant activation and revenue proof loop before wider workflow or automation breadth

Do not treat the current phase as a mobile-app phase.

Native mobile and React Native should remain explicitly deferred until after the current loop is complete, measurable, and commercially credible.

## Strategic outcome

At the end of this wave, BookedAI should be able to demonstrate one end-to-end truthfully productized business loop:

1. a tenant can create or claim access
2. the tenant can complete first-run setup
3. the tenant can publish and operate real offers
4. leads and bookings can move into CRM and operator follow-up truth
5. billing and subscription posture are visible and support safe
6. the tenant can see revenue and value created by BookedAI
7. the same loop can be adapted quickly for adjacent SME service businesses

## Vertical focus

### Primary wedge for this loop

Use `Future Swim` as the first fully hardened commercial wedge.

Reason:

- it already exists in repo truth and launch documents
- it maps cleanly to family booking flows, class or session inventory, lead capture, follow-up, and repeat service revenue
- it is concrete enough to demo and narrow enough to harden quickly

### Secondary template validations

Use the following as adjacent proof templates after the Future Swim loop is stable:

1. `Children's chess classes`
   - beginner to advanced progression
   - class cohorting plus private coaching upsell
   - parent-led enquiry and recurring learning plans
2. `AI Mentor 1-1`
   - first AI build in 60 minutes
   - guided project-based mentoring
   - enterprise AI mentoring and implementation packages
   - high-ticket service and retainer expansion path

### Cross-SME generalization rule

Every decision in this wave should help the same loop fit other service-led SMEs such as:

- tutoring centres
- coaching businesses
- clinics
- music schools
- after-school academies
- boutique agencies
- consulting and implementation services

That means the loop should be expressed in generic terms:

- offer catalog
- lead capture
- qualification
- booking or consultation conversion
- payment or invoice posture
- follow-up and retention
- revenue proof and monthly value visibility

## The golden loop

### Loop statement

`Acquire -> Activate -> Convert -> Deliver -> Get Paid -> Prove Value -> Renew`

### Product translation

1. `Acquire`
   - public traffic lands on a responsive web property
   - visitor understands the offer quickly
   - visitor can search, enquire, or request booking
2. `Activate`
   - tenant can create or claim a workspace
   - tenant can verify identity by email
   - tenant can complete business profile, operating basics, and first-run checklist
3. `Convert`
   - captured lead becomes follow-up-ready inside admin and CRM
   - operator can convert lead into customer or booking without ambiguity
4. `Deliver`
   - booking, class, or mentoring service status is visible
   - operator can coordinate messaging and follow-up posture
5. `Get Paid`
   - plan, invoices, payment status, and subscription state are visible
   - billing does not pretend to be fully self-serve where provider truth is still incomplete
6. `Prove Value`
   - tenant sees leads, bookings, paid revenue, outstanding revenue, follow-up activity, and source contribution
   - BookedAI can tell a truthful monthly impact story
7. `Renew`
   - tenant can understand plan-to-value linkage
   - operator can support renewal, upgrade, or rescue workflows from the same truth set

## Execution order

### Workstream 1 — Tenant identity and activation completion

Priority: `P0`

Outcome:

- one clear tenant auth entry
- create-account and claim-account paths stop feeling like compatibility leftovers
- first-run setup state is visible and actionable

Must include:

- email-first create, sign-in, verify, and claim flow continuity
- tenant workspace bootstrap state machine
- explicit `setup progress` read model
- first-run business profile capture
- first-run empty and incomplete states that drive the tenant forward
- clear distinction between `no access yet`, `claimed`, `active`, and `setup incomplete`

### Workstream 2 — Billing and commercial closure

Priority: `P0`

Outcome:

- tenant and admin can both read truthful billing posture
- subscription state is useful enough for paid pilots and renewals
- payment and invoice seams stop feeling disconnected from the product value story

Must include:

- billing account identity clarity
- plan state and trial state clarity
- invoice history contract and truthful empty states
- payment method status seam
- support-safe admin billing investigation links and posture
- explicit labels for mocked, manual, pending, or provider-backed states

### Workstream 3 — Lead-to-booking and lead-to-customer aftermath

Priority: `P0`

Outcome:

- root admin `Leads` becomes commercially usable instead of only technically guarded
- every conversion action produces visible downstream results

Must include:

- clear post-conversion destination and success state
- immediate visibility of linked customer or booking artifacts
- CRM sync status after qualification and conversion
- no dead-end `converted but what happened?` operator state
- preserved support-mode and tenant-handoff safety guards

### Workstream 4 — Tenant revenue proof and monthly value reporting

Priority: `P0`

Outcome:

- tenant can open the workspace and understand what BookedAI is doing for revenue
- founder, operator, and investor demo story all get materially stronger

Must include a first tenant-facing value board with:

- leads captured
- bookings created
- paid revenue
- outstanding revenue
- conversion by source
- follow-up and messaging posture
- CRM sync or lifecycle completion posture
- monthly value narrative such as `BookedAI helped capture X leads, convert Y bookings, and surface Z paid revenue this month`

### Workstream 5 — Vertical packaging and cross-SME portability

Priority: `P1`

Outcome:

- Future Swim is the hardened wedge
- chess and AI mentor become rapid adaptation templates instead of separate product lines

Must include:

- service taxonomy conventions that fit swim, chess, and AI mentor
- example KPI wording that stays truthful across classes, bookings, consultations, and mentoring packages
- reusable onboarding prompts for different SME types
- commercial copy that works for parent-led, individual-led, and enterprise-led service businesses

Current implementation baseline from `2026-04-23`:

- the shipped tenant workspace now begins the `Future Swim` packaging pass directly in product copy, not only in planning docs
- activation headlines and next-step actions now switch into swim-school language when the tenant is `Future Swim` or another swim tenant
- the tenant value board now uses swim-specific KPI wording such as `Parent enquiries`, `Lessons booked`, `Lesson revenue`, and `Parent follow-up`
- the same overview narrative now explains monthly value in Future Swim language so lesson, class, parent enquiry, and enrolment follow-up all read like the real business instead of generic SaaS terminology
- the Experience Studio now also switches into swim-school wording for business profile, parent-facing introduction HTML, preview, and workspace guidance so Future Swim operators are editing a swim business, not a generic tenant shell
- the catalog import and edit flow now uses swim-specific prompts and placeholders for lesson categories, centre locations, parent-facing descriptions, lesson pricing, and lesson tags
- the plugin/embed workspace now speaks in Future Swim website language, including widget framing, lesson counts, parent-facing CTA embed descriptions, and Future Swim-only widget settings

## Immediate non-goals

Do not prioritize these before the golden loop is complete:

- broad workflow builder expansion
- broad automation authoring
- full admin runtime migration from shipped `frontend/` into root Next.js
- React Native or native-mobile productization
- large architecture-only backend rewrites that do not improve activation, conversion, billing, or revenue proof

## Recommended tenant sequencing

### Sequence A — Future Swim first

Use this as the main production-hardening lane.

Focus metrics:

- enquiry to booking conversion rate
- paid vs outstanding lesson revenue
- lead follow-up timeliness
- repeat booking posture
- parent trust and clarity in the flow

### Sequence B — Children's chess classes

Use this as the first adjacency template for educational class businesses.

Focus metrics:

- beginner-to-advanced class progression
- trial class to recurring booking conversion
- parent-led lead capture and follow-up quality
- teacher or coach assignment clarity

### Sequence C — AI Mentor 1-1

Use this as the second adjacency template for higher-ticket service businesses.

Focus metrics:

- consultation to package conversion
- short workshop to larger implementation upsell
- enterprise inquiry capture quality
- package revenue and follow-up quality

## SME portability guidance

The revenue proof loop should generalize to most service-led SMEs by preserving these invariants:

- the `service` can be a class, consultation, assessment, lesson, or mentoring offer
- the `booking` can represent a session request, trial class, consult slot, or service intake
- the `customer` can be a parent, student, buyer, or company contact
- the `revenue event` can come from direct payment, invoice settlement, deposit, or confirmed paid booking
- the `value story` must show both pipeline and realized revenue, not only one of them

## Codebase mapping

### Shipped truth for this wave

- `frontend/src/apps/tenant/*`
- `frontend/src/features/tenant-auth/*`
- `frontend/src/features/tenant-onboarding/*`
- `frontend/src/features/tenant-billing/*`
- `frontend/src/features/admin/*` for operator framing and summaries
- `backend/api/*`, `backend/domain/*`, `backend/repositories/*` for the source workflow truth

### Controlled foundation lane

- `app/admin/*`
- `app/api/admin/*`
- `lib/db/*`
- `lib/auth/*`
- `lib/tenant/*`
- `server/admin/*`

Use the controlled foundation lane to harden admin mutation truth for settings, leads, customers, and payments without disrupting the shipped responsive web app as the main product surface.

## Implementation slices

### Slice 1

- finish tenant activation map and setup-progress contract
- connect first-run onboarding state to auth outcomes
- make incomplete setup obvious in tenant workspace

### Slice 2

- harden tenant billing truth labels and invoice or payment seams
- improve admin support visibility for billing posture
- make manual vs provider-backed billing states explicit

### Slice 3

- complete lead conversion aftermath in root admin
- make linked customer or booking outcomes obvious
- expose CRM sync aftermath in conversion success states

### Slice 4

- build tenant value board v1 in shipped frontend
- wire paid, outstanding, booking, and lead signals into one monthly story
- align wording so swim, chess, and AI mentor all fit the same semantics

### Slice 5

- package the loop for Future Swim production hardening
- produce chess-class and AI-mentor adaptation guidance from the same contract

## Success criteria

This wave is successful when:

- a new or invited tenant can activate without operator confusion
- a tenant can understand setup status and next action in under 60 seconds
- a lead can be converted and the operator can immediately see what happened next
- tenant billing posture is readable and does not overclaim readiness
- the tenant sees a monthly proof-of-value surface grounded in real repo truth
- Future Swim can be shown as the primary vertical demo
- the same loop can be adapted quickly to children's chess classes and AI mentor offerings

## Documentation sync rule

Changes in this wave must update, in order:

1. `project.md`
2. `docs/architecture/current-phase-sprint-execution-plan.md`
3. `docs/development/implementation-progress.md`
4. the workstream-specific execution note or checklist

## Recommendation summary

BookedAI should stop expanding sideways for this phase.

The right next move is to complete the first repeatable web-based SME revenue loop:

- Future Swim first
- chess classes second
- AI Mentor third
- React Native later
