# BookedAI Pre-Coding Implementation Backlog

Date: `2026-05-01`

Status: `active backlog baseline`

## Purpose

This backlog translates `docs/development/master-gap-analysis-2026-05-01.md` into implementation-ready management slices.

This is not a coding order for every possible feature.

It is the recommended backlog order after the CTO baseline merge, so coding starts from the highest-value, truth-layer gaps first.

## Priority logic

Open work in this order:

1. truth-layer continuity
2. cross-surface status and confirmation consistency
3. simple commercial control and cashflow truth
4. repeatable scale/installability foundations
5. vertical-proof depth
6. revenue proof and retention expansion
7. reusable templates and broader scale lanes

Sequencing rule:

- move from simple to complex
- move from immediate business control to broader platform depth
- move from revenue collection truth to richer automation and customization
- if a task is more complex but does not improve near-term operating control, cashflow, booking capture, or revenue visibility, it should stay lower

---

## Wave 1. Truth-layer continuity

### BL-1. Final-choice confirmation matrix
- Priority: `P0`
- Phase target: `17`, `19`
- Owner lanes: `Product/PM`, `Frontend`, `Backend`, `QA/UAT`
- Goal: map and implement final-choice confirmation consistently across booking, payment, reschedule, cancel, document submission, and human-handoff flows
- Key outputs:
  - flow matrix by surface and mutation type
  - shared confirmation contract
  - UI copy/state rules
  - regression coverage

### BL-2. Canonical status vocabulary rollout
- Priority: `P0`
- Phase target: `17`, `19`, `21`
- Owner lanes: `Product/PM`, `Frontend`, `Backend`, `Content/GTM`
- Goal: unify `available`, `limited`, `waitlist`, `request received`, `confirmed`, `payment pending`, `paid`, `synced`, `manual review`, `recoverable`, and related statuses across surfaces and messaging
- Key outputs:
  - canonical status registry
  - copy map by surface/channel
  - rendering contract by app and channel

### BL-3. Portal truth completion pass
- Priority: `P0`
- Phase target: `17`, `19`
- Owner lanes: `Frontend`, `Backend`, `QA/UAT`
- Goal: close the portal as the customer truth layer for summary, payment posture, documents, messages, and request-safe actions
- Key outputs:
  - portal home truth contract
  - booking detail truth contract
  - identity and verification edge-case matrix
  - live reopening/UAT proof

### BL-4. Tenant and admin evidence visibility pass
- Priority: `P0`
- Phase target: `18`, `19`, `21`
- Owner lanes: `Backend`, `Frontend`, `Data/Revenue`, `QA/UAT`
- Goal: make evidence, sync state, action queue, and failure posture consistently visible to operators
- Key outputs:
  - evidence drawer contract
  - sync-failure/retry operator states
  - webhook idempotency evidence UI follow-up

---

## Wave 2. Surface completeness against CTO baseline

### BL-5. `bookedai.au` search-to-book truth pass
- Priority: `P0`
- Phase target: `17`
- Owner lanes: `Frontend`, `Backend`, `QA/UAT`
- Goal: finish the search-first acquisition flow with trustworthy result cards, explicit book gate, confirmation continuity, and safe degraded behavior

### BL-6. `tenant.bookedai.au` SME command-center pass
- Priority: `P0`
- Phase target: `21`
- Owner lanes: `Frontend`, `Backend`, `Data/Revenue`
- Goal: close the tenant dashboard, leads, bookings, payments, revenue, automations, and operator-action posture toward the command-center spec, while keeping the first management layer simple, commercially useful, and revenue-effective

### BL-7. `admin.bookedai.au` platform control-room pass
- Priority: `P0`
- Phase target: `21`, `22`
- Owner lanes: `Frontend`, `Backend`, `Security/Validation`
- Goal: close tenant management, AI action review, webhook/integration monitoring, and support-mode guardrails against the control-room spec

### BL-8. `product.bookedai.au` scope guard pass
- Priority: `P1`
- Phase target: `20`
- Owner lanes: `Product/PM`, `Frontend`
- Goal: keep product/demo valuable without letting marketplace breadth outrun truth-layer maturity

---

## Wave 3. Simple commercial control and cashflow truth

### BL-14A. BookedAI monetization and commission operating baseline
- Priority: `P0`
- Phase target: `21`
- Owner lanes: `Product/PM`, `Backend`, `Frontend`, `Data/Revenue`
- Goal: define and deliver the simple but professional operating layer for tenant setup fees, subscriptions, booking-linked commission, BookedAI revenue visibility, and commercial action-needed queues
- Spec: `docs/development/bl-14a-monetization-and-commission-operating-spec-2026-05-01.md`
- Breakdown: `docs/development/bl-14a-sub-slice-breakdown-2026-05-01.md`
- Execution note: treat this as one of the earliest Phase `21` slices and as a dependency for later commercial scale maturity
- First sub-slice order: `BL-14A-1` commercial profile, `BL-14A-2` setup/subscription state machine, `BL-14A-3` commission pipeline, `BL-14A-4` revenue summary/action queue, `BL-14A-5` audit/acceptance gate

## Wave 4. Repeatable scale and installability foundations

### BL-15. Scale-ready API family architecture map
- Priority: `P0`
- Phase target: `22`, `23`
- Owner lanes: `Architecture`, `Backend`, `Security/Validation`
- Goal: define the detailed API family architecture for discovery, ingestion, booking, portal, partner install, webhook, admin, and analytics with tenant-safe auth and long-horizon scale posture

### BL-16. Partner widget and installability baseline
- Priority: `P0`
- Phase target: `20`, `22`
- Owner lanes: `Product/PM`, `Frontend`, `Backend`
- Goal: make widget and embeddable install paths easy for third-party partners, with tenant config, domain allowlisting, keys/secrets, and safe degraded behavior

### BL-17. Tenant-isolated AI ingestion pipeline map
- Priority: `P0`
- Phase target: `22`
- Owner lanes: `Backend`, `Architecture`, `Data/Revenue`
- Goal: define how tenant-specific text, file, form, and future feed ingestion becomes an isolated tenant database/search corpus connected back into BookedAI APIs and webhooks

### BL-18. Shared-portal plus enterprise-portal strategy
- Priority: `P1`
- Phase target: `21`, `22`
- Owner lanes: `Product/PM`, `Frontend`, `Backend`
- Goal: keep `portal.bookedai.au` as the default shared truth layer while defining the optional dedicated-portal path for larger businesses without fragmenting truth semantics

## Wave 5. Vertical-proof depth

### BL-9. Future Swim proof-lane closeout map
- Priority: `P0`
- Phase target: `21`, `22`
- Owner lanes: `Product/PM`, `Frontend`, `Backend`, `Data/Revenue`, `QA/UAT`
- Goal: translate the full Future Swim requirement set into phased implementation slices: family profiles, students, attendance, progress, makeup, waitlist, payments, retention, swim BI

### BL-10. Chess proof-lane expansion map
- Priority: `P1`
- Phase target: `22`
- Owner lanes: `Product/PM`, `Frontend`, `Backend`
- Goal: translate class placement, homework, coach notes, PGN/game intake, and progress reporting into structured slices

### BL-11. AI Mentor proof-lane expansion map
- Priority: `P1`
- Phase target: `22`
- Owner lanes: `Product/PM`, `Frontend`, `Backend`
- Goal: translate package matching, session workspace, attachment intake, action plans, and follow-up continuity into structured slices

---

## Wave 6. Revenue proof and retention expansion

### BL-12. Recoverable revenue model pass
- Priority: `P0`
- Phase target: `21`
- Owner lanes: `Data/Revenue`, `Backend`, `Product/PM`
- Goal: define and implement recoverable-revenue states such as abandoned draft, unpaid payment link, no-response lead, missed class/session, and uncontacted waitlist release

### BL-13. Retention automation baseline
- Priority: `P1`
- Phase target: `21`, `22`
- Owner lanes: `Backend`, `Data/Revenue`, `Content/GTM`
- Goal: establish rebook, inactivity, milestone, and follow-up automation rules with auditable posture

### BL-14. Tenant Revenue Proof dashboard closeout
- Priority: `P0`
- Phase target: `21`, `22`
- Owner lanes: `Frontend`, `Backend`, `Data/Revenue`
- Goal: make revenue won, pending, lost, recoverable, and action-needed truth visible in one operator-grade tenant dashboard

## Wave 7. Reusable platform generalization

### BL-19. Domain-boundary extraction plan
- Priority: `P1`
- Phase target: `22`
- Owner lanes: `Backend`, `Architecture`
- Goal: move from partial service concentration toward clearer module ownership aligned to the CTO domain map

### BL-20. Reusable vertical-template pack
- Priority: `P1`
- Phase target: `22`
- Owner lanes: `Product/PM`, `Frontend`, `Backend`, `Content/GTM`
- Goal: package the shared core into reusable search/booking/care/revenue templates for new tenants and verticals

### BL-21. Release-governance finalization
- Priority: `P0`
- Phase target: `23`
- Owner lanes: `DevOps/Live`, `QA/UAT`, `Security/Validation`
- Goal: make CI, release gates, env parity, observability, rollback proof, and promotion discipline mandatory for the expanded platform

---

## Revenue-first requirement note

All backlog items should now be screened through the stricter requirement lens documented in `docs/development/revenue-first-enterprise-requirements-refinement-2026-05-01.md`.

In practice this means:

- search work should inherit Google-like trust, refinement speed, and compare confidence
- customer-flow work should inherit full lifecycle continuity, not only booking-start optimization
- operator-flow work should inherit enterprise evidence, status truth, and safe-mutation patterns
- roadmap priority should favor revenue capture, revenue protection, and recoverable revenue over decorative or speculative expansion

## Recommended immediate next coding-prep order

1. `BL-1 Final-choice confirmation matrix`
2. `BL-2 Canonical status vocabulary rollout`
3. `BL-3 Portal truth completion pass`
4. `BL-4 Tenant/admin evidence visibility pass`
5. `BL-14A BookedAI monetization and commission operating baseline`
6. `BL-15 Scale-ready API family architecture map`
7. `BL-16 Partner widget and installability baseline`
8. `BL-17 Tenant-isolated AI ingestion pipeline map`
9. `BL-18 Shared-portal plus enterprise-portal strategy`
10. `BL-9 Future Swim proof-lane closeout map`
11. `BL-12 Recoverable revenue model pass`
12. `BL-14 Tenant Revenue Proof dashboard closeout`

## Go/no-go rule

No backlog item should move into active coding until it passes `docs/development/pre-coding-master-checklist-2026-05-01.md`.
