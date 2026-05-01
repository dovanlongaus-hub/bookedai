# BookedAI Whole-System Rearchitecture Baseline

Date: `2026-05-01`

Status: `active master rearchitecture baseline`

## Purpose

This document re-architects the whole BookedAI program around the shortest revenue-producing and customer-serving path.

The new top priority is not feature breadth.

The new top priority is this loop:

- searchable
- installable
- bookable
- full-loop operable

In plain terms:

1. the customer can search and find the right thing fast
2. a tenant or partner can install BookedAI quickly
3. the customer can book or request safely
4. the tenant and BookedAI can complete the payment, portal, support, and follow-up loop reliably

## 1. New top-level architecture rule

BookedAI should now be organized around four execution layers in this exact order:

### Layer 1. Searchable
BookedAI must help customers discover, refine, compare, and choose quickly.

### Layer 2. Installable
BookedAI must be easy for a tenant or partner to set up, connect, and launch.

### Layer 3. Bookable
BookedAI must reliably turn intent into booking, request, or payment posture.

### Layer 4. Full-loop operable
BookedAI must support portal truth, customer care, follow-up, retention, revenue visibility, and operator action queues.

If a feature does not strengthen one of these four layers, it stays below priority.

## 2. Whole-system target direction

### Frontend
- long-term primary runtime target: `Next.js`
- current Vite runtime: transition lane only
- no new strategic platform expansion should default to Vite
- main surfaces to unify over time: tenant, admin, portal, public
- migration should follow the active consolidation plan: `docs/architecture/frontend-consolidation-migration-plan-2026-05-01.md`

### Backend
- `FastAPI` modular monolith
- domain-first modules
- explicit API families
- queue/outbox and worker discipline

### Data
- `Postgres` as durable truth
- self-hosted `Supabase` acceptable as current operational packaging
- commercial truth and lifecycle truth remain backend-owned

### Automation
- `n8n` as glue only
- never the hidden source of booking, payment, revenue, or commission truth

### Infrastructure
- Docker/container-first baseline from the earliest phases
- explicit service boundaries for frontend, backend, proxy, worker, automation, database-support lanes

## 3. Revenue-first customer-serving product core

The minimum serious BookedAI product should now be defined as:

### A. Search core
- search input
- clarification/refinement
- ranked result cards
- compare-before-book flow
- explicit final choice

### B. Install core
- tenant onboarding
- widget/API install path
- tenant ingestion/bootstrap path
- domain/config verification
- first live search/booking proof

### C. Booking core
- booking or request creation
- payment posture
- booking reference
- truthful status vocabulary
- customer-safe confirmation

### D. Full-loop core
- portal truth
- support/help/change/cancel flows
- operator action queue
- payment and follow-up posture
- revenue and commission truth

This is the shortest real revenue engine.

## 4. Recommended whole-project implementation order

### Stage 0. Foundation decision package
Decide early:
- frontend target
- backend/domain-boundary target
- Postgres/Supabase scale discipline
- n8n role boundary
- container topology

### Stage 1. Searchable first
Implement and harden:
- search UX trust
- ranking and compare clarity
- result-card truth
- explicit select vs book separation
- fast mobile-safe discovery experience

### Stage 2. Installable second
Implement and harden:
- tenant onboarding path
- widget/embed path
- API credentials and webhook setup
- tenant ingestion/bootstrap flow
- first-time install verification

### Stage 3. Bookable third
Implement and harden:
- final-choice confirmation
- booking and request flows
- payment posture
- booking references
- truthful async/degraded states

### Stage 4. Full-loop operable fourth
Implement and harden:
- portal truth
- customer care/status flows
- support request handling
- follow-up and retention basics
- tenant/admin evidence and revenue visibility

### Stage 5. Monetization operating layer
Implement and harden:
- setup fee
- subscription
- commission
- operator commercial action queues
- BookedAI revenue visibility

### Stage 6. Repeatable partner/platform scale
Implement and harden:
- installability standardization
- partner pricing and ownership model
- API family maturity
- shared vs dedicated portal strategy
- reusable onboarding and ingestion patterns

### Stage 7. Vertical deepening and enterprise exceptions
Implement only after the earlier stages are credible.

## 5. Exact priority reset

From now on, the recommended priority order across the whole system is:

1. `search works`
2. `installation works`
3. `booking works`
4. `portal and support loop works`
5. `money layer works`
6. `partner repeatability works`
7. `deeper vertical and enterprise complexity later`

This is the clearest revenue-first order for the entire project.

## 6. What this changes in practice

### Deprioritize
- broad marketplace polish before installability
- heavy enterprise billing before basic booking/commercial truth
- deep vertical specialization before repeatable search/install/book flow
- keeping mixed frontend ownership indefinitely
- hiding business-critical logic inside `n8n`

### Prioritize
- search trust
- tenant launch speed
- booking truth
- portal truth
- customer help loop
- operator actionability
- monetization visibility
- containerized operational consistency

## 7. Best-direction recommendation

If one single direction must be approved now, it should be this:

- `Next.js` long-term unified frontend target
- `FastAPI` modular monolith backend
- `Postgres` truth with self-hosted Supabase currently acceptable
- `n8n` glue only
- Docker/container-first operations
- product execution ordered as `Searchable -> Installable -> Bookable -> Full-loop operable -> Monetization -> Scale breadth`

## 8. Change request governance baseline

Because BookedAI is expected to absorb many feature requests, business ideas, upgrade proposals, and delivery adjustments while still operating commercially, the rearchitecture must include formal change governance.

That means:

- meaningful changes should enter through a managed `Change Request` process
- every change should be tested against the priority order `searchable -> installable -> bookable -> full-loop operable -> monetization -> repeatable scale`
- current-phase work should not be destabilized by every attractive idea
- revenue-critical and trust-critical changes may interrupt current execution, but other changes should be merged into the correct future phase or backlog lane

The active governance baseline for this is:

- `docs/architecture/change-request-governance-baseline-2026-05-01.md`

## 9. Immediate next managed deliverables

The next planning deliverables should be:

1. Phase A technical foundation decision package
2. change request governance baseline
3. search/install/book/full-loop execution map
4. installability architecture spec
5. BL-14A monetization execution chain
6. frontend consolidation migration plan

Current status:

- `frontend consolidation migration plan` is now created and active as `docs/architecture/frontend-consolidation-migration-plan-2026-05-01.md`

## Short rule

BookedAI should now be re-architected as:

`Search first, install second, book third, full loop fourth, money truth fifth, scale breadth later.`
