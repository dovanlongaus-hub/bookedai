# BookedAI Change Governance

## Purpose

This document defines how BookedAI must be changed going forward so that upgrades remain synchronized across product, platform, and documentation layers.

## Mandatory Change Workflow

### Step 1. Read existing documentation first

Before making a change, review:

- `project.md`
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

### Step 5. Update documentation before closure

A change is not considered complete until the corresponding architecture and audience documents are updated where needed.

If a prompt introduces substantial new architecture, module, migration, workflow, governance, or product-structure description, that description should also be written back into the corresponding `.md` files and reflected in `project.md` as part of the closure standard.

For any substantive module or behavior update, record the result in all three documentation layers below unless the user explicitly asks not to:

- the request-facing source document that was revised for that area
- the implementation-tracking document in `docs/development/`
- the matching roadmap, sprint, plan, or phase document that carries delivery sequencing

When the change is fully implemented through the last mile and promoted to the live environment, this documentation write-back is not optional or deferred:

- update the implementation result immediately in `docs/development/implementation-progress.md`
- update the requirement or description document for the affected sprint, module, or workflow
- update the matching roadmap, sprint, plan, or phase artifact that carries delivery sequencing
- treat live deployment and documentation synchronization as one closure action, not two separate tasks

## Synchronization Rules

### If frontend changes

Review:

- API contracts
- schema expectations
- user guide wording
- admin flow impact if shared

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
2. the related documentation is aligned
3. previous behavior descriptions were reviewed before upgrading them
4. the final state is internally consistent for all affected audiences
5. substantial prompt-level descriptions have been recorded into the relevant documentation files and `project.md` unless the user explicitly chooses otherwise
6. existing module updates have been merged back into the old source document and logged in requirement, execution, and roadmap or sprint or phase records
7. if the change was deployed live, the deployment outcome and final delivered state have also been written back into implementation tracking and the relevant sprint or roadmap documents before closure

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
- sprint owner checklist
- roadmap or sprint register alignment

This formula applies to later phases as well, not only Phase 0.
