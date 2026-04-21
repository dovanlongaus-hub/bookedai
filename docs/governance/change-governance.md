# BookedAI Change Governance

## Purpose

This document defines how BookedAI must be changed going forward so that upgrades remain synchronized across product, platform, and documentation layers.

## Mandatory Change Workflow

### Step 1. Read existing documentation first

Before making a change, review:

- `project.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/implementation-progress.md`
- the relevant file in `docs/architecture/`
- the relevant file in `docs/users/`

When the request targets an existing module, feature, workflow, or document set:

- find and read the old description for that exact area first
- re-read the existing context before changing code or prose
- treat the old document as the baseline to merge, refine, or supersede rather than writing a disconnected replacement

### Step 2. Summarize the request

Every new request must be reduced into:

- objective
- affected modules
- affected audience
- affected interfaces
- affected infrastructure or configuration

### Step 3. Check cross-module impact

At minimum, evaluate whether the change affects:

- frontend
- backend
- data
- chat agent
- automation
- integrations
- infrastructure
- user documentation

### Step 4. Implement in a synchronized way

Do not patch one layer only if the behavior change clearly spans more than one layer.

### Step 4A. Inherit the latest approved baseline before changing active scope

For any sprint that continues an already-approved area:

- read the latest approved source-of-truth and code-ready handoff documents first
- inherit the active implementation baseline rather than reinterpreting the area from scratch
- only reopen structure, ownership, or scope if a truth-boundary issue or explicit reprioritization requires it

When the prior sprint already delivered implemented upgrades, inheritance must include the delivered UI and implementation baseline as well, not only the planning narrative.

Typical examples include:

- approved brand token names and CSS utility conventions
- approved logo API and light or dark surface treatment rules
- approved sticky header or mobile navigation behavior
- approved motion and animation layer
- approved KPI, proof, footer, or comparison-table primitives
- approved production hotfix behavior that protects trust, relevance, or conversion integrity on live surfaces

### Step 4B. Preserve the live runtime unless migration is explicitly in scope

Default rule:

- improve the live runtime in place
- preserve the repo shape unless a migration has been explicitly approved
- treat additive starters, experiments, or forward-compatible translation outputs as supportive references unless they have been explicitly promoted to live-runtime status

### Step 4C. Keep one active implementation spine

For any major product surface:

- name one active implementation spine
- keep one composition root for that surface
- keep one structured content source for that surface
- keep one shared primitive layer and one token ownership model for that surface

Files or sections outside the active spine should be treated as additive or deferred inventory unless explicitly promoted.

Later sprints must not fork a second active baseline for the same surface through:

- a new token vocabulary that duplicates the approved one
- a second logo system with different variant semantics
- a separate motion layer for the same landing surface
- a parallel KPI or proof-widget vocabulary
- a disconnected starter or route-level pattern set that ignores the inherited baseline

### Step 4D. Treat cleanup and migration as part of delivery

If the touched area contains old-path drift, the implementation plan should include cleanup in the same delivery pass.

Typical drift includes:

- duplicated primitive layers
- copy drift outside the approved content source
- token or style ownership drift
- stale assumptions about mandatory scope
- build or runtime wiring that points at the wrong config chain

### Step 5. Update documentation before closure

A change is not considered complete until the corresponding architecture and audience documents are updated where needed.

If a prompt introduces substantial new architecture, module, migration, workflow, governance, or product-structure description, that description should also be written back into the corresponding `.md` files and reflected in `project.md` as part of the closure standard.

For any substantive module or behavior update, record the result in all three documentation layers below unless the user explicitly asks not to:

- `project.md`
- the request-facing source document that was revised for that area
- the implementation-tracking document in `docs/development/`
- the matching roadmap, sprint, plan, or phase document that carries delivery sequencing

When the change is fully implemented through the last mile and promoted to the live environment, this documentation write-back is not optional or deferred:

- update `project.md` first when the change affects project-wide scope, architecture baseline, route ownership, auth policy, or delivery sequence
- update the implementation result immediately in `docs/development/implementation-progress.md`
- update the requirement or description document for the affected sprint, module, or workflow
- update the matching roadmap, sprint, plan, or phase artifact that carries delivery sequencing
- treat live deployment and documentation synchronization as one closure action, not two separate tasks

When the change also introduces or extends backend SQL migration inventory:

- add or update a repo-local apply helper when feasible
- add or update a migration apply checklist in `docs/development/`
- record shadow, staging, or production apply status in `docs/development/implementation-progress.md`

For sprint-to-sprint continuity, also update the next active sprint artifacts with explicit inheritance notes whenever the completed sprint introduced a new approved baseline that later teams must follow.

For public conversion surfaces, that inheritance note must also capture any production-discovered trust regression and the exact rule that fixed it.

If the current sprint discovers a bug or logic gap that properly belongs to a later sprint or phase:

- add the issue to the correct later sprint, phase, owner checklist, execution package, or task-breakdown document in the same documentation pass
- do not leave the issue only in the current sprint closeout notes
- also record the issue in the current sprint document as an explicit carry-forward item

That carry-forward entry must include:

- the exact failing scenario
- the reason it was not fully resolved in the current sprint
- the sprint or phase that now owns the work
- the acceptance or regression condition the next sprint must satisfy

## Synchronization Rules

### If frontend changes

Review:

- API contracts
- schema expectations
- user guide wording
- admin flow impact if shared
- public CTA shells and dialog-open behavior when shared conversion flows are touched

### If backend changes

Review:

- frontend call sites
- persistence model expectations
- workflow payload contracts
- admin operational impact

### If data changes

Review:

- queries
- admin displays
- seed behavior
- import and export flows

### If AI behavior changes

Review:

- prompt contracts
- frontend assistant behavior
- workflow triggering rules
- business-facing expectations
- locality, relevance, and trust behavior for live shortlist or recommendation flows

### If automation changes

Review:

- backend payload structure
- auth headers or tokens
- callback semantics
- operator runbooks

### If infrastructure changes

Review:

- compose files
- deploy scripts
- proxy config
- env setup
- healthcheck and boot procedures
- live smoke-test commands needed to confirm the deployed surface still behaves as intended

## Production Smoke-Test Rule

When a public surface, CTA path, assistant flow, pricing flow, or demo flow is deployed live:

- verify the live URL responds successfully
- verify the main conversion CTA shells open correctly on the live site
- verify at least one trust-sensitive scenario that could mislead users if wrong

For assistant or recommendation surfaces, this must include:

- at least one locality-sensitive query when the UI claims local or nearby matching
- preference for no-result or gated output instead of misleading geographically wrong recommendations
- at least one wrong-domain suppression query where the system must not answer with unrelated stored content just because the model finds a weak semantic overlap
- at least one stale-context suppression query when the UI can carry prior shortlist or selected-service state between requests

## Search Truth Rule

For customer-facing search, assistant, recommendation, or booking-discovery flows:

- do not let the model answer beyond the evidence supported by retrieval and trust gates
- do not let stored system content override the user's active keywords, domain intent, or location intent
- do not let event results appear in service-consultation flows unless the user explicitly asked for events
- do not let out-of-region rows appear as local matches unless they are explicitly labeled as fallback and the product requirement allows that fallback
- prefer `no strong relevant match`, `need location`, or escalation states over fluent but misleading mixed answers

When the search stack is changed, the documentation update must say:

- what hard filters run before semantic or model reasoning
- what model or provider is only allowed to rerank or summarize after retrieval
- what promotion tests prove wrong-domain, wrong-location, and stale-context suppression

## Required Documentation Targets

| Change Type | Documentation to Review |
|---|---|
| public UX | `docs/users/end-user-guide.md` |
| business operations | `docs/users/sme-customer-guide.md` |
| admin / operator behavior | `docs/users/administrator-guide.md` |
| architecture / module changes | `docs/architecture/*` |
| implementation tracking | `docs/development/implementation-progress.md` |
| roadmap / sprint / phase alignment | the relevant roadmap, sprint, plan, or phase file in `docs/architecture/` or `docs/development/` |
| governance / process changes | `project.md` and this file |

## Completion Standard

A request should only be considered fully handled when:

1. the code change is aligned across affected modules
2. `project.md`, implementation tracking, and the relevant execution artifact are aligned
3. previous behavior descriptions were reviewed before upgrading them
4. the final state is internally consistent for all affected audiences
5. substantial prompt-level descriptions have been recorded into the relevant documentation files and `project.md` unless the user explicitly chooses otherwise
6. existing module updates have been merged back into the old source document and logged in requirement, execution, and roadmap or sprint or phase records
7. if the change was deployed live, the deployment outcome and final delivered state have also been written back into implementation tracking and the relevant sprint or roadmap documents before closure
8. future-sprint work has preserved the active implementation spine, content source, page or flow root, and token or primitive ownership model unless an explicit approved exception changed them
9. additive or deferred inventory has not been silently treated as mandatory scope
10. any completed sprint-level upgrade baseline that later work must inherit has been written into the next sprint handoff and checklist documents
11. any newly discovered bug, trust regression, or logic gap that belongs to a later sprint has been written into both:
   - the current sprint document as an explicit carry-forward item
   - the correct later sprint, phase, or task artifact as owned future work

## Standard Execution Formula

The default formula for substantial product, architecture, or delivery planning work is now:

1. record the requirement in the relevant source document
2. define or update the phase structure for the work
3. create a dedicated task breakdown for each phase using:
   - Epic
   - Story
   - Task
4. create a practical owner-based execution checklist for each active sprint
5. synchronize requirement, execution, and roadmap or sprint artifacts in the same update cycle

### Mandatory planning rule

For every meaningful phase:

- the phase must have its own task breakdown
- the phase must have explicit owners
- the active sprint for that phase must have a real execution checklist by owner
- closure should not rely on abstract planning only

### Standard artifacts expected

For meaningful initiatives, the documentation set should include:

- requirement or source document
- phase plan
- Epic -> Story -> Task breakdown
- project-wide sprint execution checklist as the inherited default
- sprint owner checklist
- roadmap or sprint register alignment

This formula applies to later phases as well, not only Phase 0.
