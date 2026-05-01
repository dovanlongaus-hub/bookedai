# Change Request Governance Baseline

Date: `2026-05-01`

Status: `active governance baseline`

## Purpose

This document defines how BookedAI accepts, evaluates, prioritizes, defers, merges, or rejects change requests during project delivery.

It exists so the project can keep shipping business-critical work while still absorbing:

- new feature requests
- business-model changes
- operator feedback
- customer feedback
- technical upgrade proposals
- architecture adjustments
- new revenue ideas
- new vertical or partner opportunities

Without this governance, the project will drift, lose sequence discipline, and damage both delivery speed and business continuity.

## 1. Core rule

All meaningful changes must enter the project as a managed `Change Request`.

No important feature, upgrade, architecture adjustment, workflow change, pricing idea, or business-model change should bypass this process once the baseline has been set.

Short rule:

`New ideas are welcome, but they must compete through the baseline rather than override it informally.`

## 2. Why this is required

BookedAI is not only building software.

It is also:
- operating toward live revenue
- serving real customer journeys
- refining business model and commercial packaging
- evolving technical architecture
- learning from operator and market feedback in real time

That means change is normal.

The risk is not change itself.

The risk is unmanaged change.

## 3. What counts as a Change Request

A Change Request should be opened for any request that materially affects:

- project priority
- roadmap sequencing
- product behavior
- tenant onboarding
- booking flow
- portal/customer-care flow
- payment or revenue logic
- pricing, subscription, or commission rules
- API contracts
- widget/installability contracts
- architecture direction
- infrastructure/deploy model
- data model or integration ownership
- definition of done, UAT, or release gates

Small bug fixes that stay inside an already approved scope do not need a separate strategic Change Request.

## 4. Change Request categories

### CR-A. Revenue-critical
Affects revenue capture, booking conversion, payment completion, or customer continuity.

Examples:
- new search behavior that materially improves booking conversion
- payment recovery change
- booking confirmation truth fix
- installability improvement that shortens tenant time-to-live

### CR-B. Customer-serving
Affects search quality, booking safety, portal continuity, support experience, or customer trust.

### CR-C. Business-model
Affects setup fee, subscription, commission, packaging, offer structure, partner model, or tenant commercial operations.

### CR-D. Technical foundation
Affects frontend target, backend structure, data truth, automation boundaries, infrastructure posture, container model, or scale strategy.

### CR-E. Vertical or market expansion
Affects new tenant types, new vertical templates, new partner paths, new channels, or new geography assumptions.

### CR-F. Operational or governance
Affects process, release gating, QA/UAT, phase controls, acceptance criteria, documentation, or delivery accountability.

## 5. Required fields for every Change Request

Every Change Request should capture at minimum:

1. `CR id`
2. `title`
3. `request type`
4. `request source`
5. `problem or opportunity`
6. `proposed change`
7. `why now`
8. `expected business impact`
9. `affected surfaces`
10. `affected modules or systems`
11. `risk if accepted`
12. `risk if deferred`
13. `baseline alignment assessment`
14. `priority recommendation`
15. `decision status`
16. `target phase or backlog lane`
17. `required doc updates`
18. `owner`
19. `approval date`

## 6. Baseline alignment test

Before acceptance, every Change Request must be tested against the whole-system order.

Primary questions:

1. Does it improve `searchable`?
2. Does it improve `installable`?
3. Does it improve `bookable`?
4. Does it improve `full-loop operable`?
5. Does it improve monetization truth or control?
6. Does it improve repeatable scale?
7. Or is it later-stage complexity trying to jump the queue?

If a request sits mostly in category `7`, it should usually be deferred unless there is a strong business reason.

## 7. Priority decision matrix

Every Change Request should be forced into one of these decisions:

### P0. Approve now
Use only when the change:
- protects live revenue
- protects customer trust
- unblocks active phase execution
- fixes a serious architecture mistake early
- materially shortens time-to-revenue

### P1. Approve in current active phase
Use when the change materially strengthens the current baseline without destabilizing committed delivery.

### P2. Queue for next phase
Use when the change is valuable, but not worth interrupting current execution.

### P3. Backlog for later
Use when useful but not aligned tightly enough with current sequence.

### P4. Reject or archive
Use when the change conflicts with baseline, adds complexity too early, or lacks business justification.

## 8. Decision statuses

Each Change Request must hold one explicit status:

- `draft`
- `under review`
- `approved now`
- `approved next phase`
- `approved later backlog`
- `deferred`
- `rejected`
- `merged into existing scope`
- `implemented`
- `closed`

## 9. Governance rule for active execution

Active phases must not be destabilized by every new idea.

So the delivery rule is:

- revenue-critical or trust-critical change may interrupt current work
- strong improvement aligned to the current phase may be merged into the current phase
- all other changes should be routed to the next valid phase, backlog, or future baseline review

Short rule:

`Keep the business running, keep the project moving, and let change enter through controlled gates.`

## 10. Mandatory decision questions

Before accepting a Change Request, the PM or operator should answer:

1. Is this revenue-critical now?
2. Is this customer-trust critical now?
3. Does this conflict with the locked architecture direction?
4. Does this create hidden scope explosion?
5. Does this move work out of the `search -> install -> book -> full-loop` order?
6. Is this really a current-phase item or a next-phase item?
7. What must be delayed if this is accepted now?
8. What docs and gates must change if this is accepted?

## 11. Delivery integration rule

If a Change Request is accepted, it must update the right execution stack, not only a chat note.

Required sync path:

1. update the requirement or architecture doc that changed
2. update `project.md` if project-level priority or meaning changed
3. update roadmap or execution plan if sequence changed
4. update `docs/development/implementation-progress.md`
5. update daily memory
6. include in Notion/Discord closeout when operator-visible

## 12. Change Request lanes

Change Requests should be routed by primary impact:

- `Product/PM`
- `Frontend`
- `Backend`
- `Security/Validation`
- `QA/UAT`
- `DevOps/Live`
- `Data/Revenue`
- `Content/GTM`

Complex changes may require multiple lanes, but there should still be one clear owner.

## 13. Business-idea intake rule

New business ideas are allowed and expected.

But they must be split into one of three buckets:

### Bucket 1. Immediate business leverage
The idea helps current revenue, onboarding, conversion, support, retention, or commission truth.

Default action:
- likely `P0` or `P1`

### Bucket 2. Strategic but not immediate
The idea is strong but should not interrupt the active phase.

Default action:
- likely `P2` or `P3`

### Bucket 3. Attractive distraction
The idea sounds exciting but is not aligned with the current baseline.

Default action:
- likely `P4` or archive

## 14. Technical-upgrade intake rule

Not every technical improvement should be prioritized immediately.

Technical changes must prove one of these:

- reduces architecture risk materially
- reduces live-operating risk materially
- protects future scale materially
- unblocks revenue-critical delivery
- reduces repeated delivery drag across phases

Otherwise, the change should wait.

## 15. Recommended CR template

```markdown
## Change Request

- CR id:
- Title:
- Category:
- Source:
- Problem / opportunity:
- Proposed change:
- Why now:
- Expected business impact:
- Affected surfaces:
- Affected modules:
- Risk if accepted now:
- Risk if deferred:
- Whole-system alignment:
- Priority recommendation:
- Decision status:
- Target phase / backlog lane:
- Required docs to update:
- Owner:
- Approval date:
```

## 16. Baseline control rule

The baseline is allowed to evolve.

But baseline evolution itself must be explicit.

That means:
- if a Change Request changes architecture direction, business model, or project ordering, the baseline documents must be updated directly
- if it does not change the baseline, it should be implemented inside the existing baseline rather than silently redefining it

## 17. PM operating rule

The PM should not ask only `Is this a good idea?`

The PM should ask:

- `Is this the right idea now?`
- `What does it displace?`
- `Does it strengthen the current revenue-first path or dilute it?`
- `Should this become baseline, backlog, or rejection?`

## 18. Short operator rule

BookedAI should welcome many changes without becoming chaotic.

So the project rule is:

`Every meaningful change must be captured, classified, aligned to the baseline, explicitly prioritized, and then either merged, deferred, or rejected.`
