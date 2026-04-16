# BookedAI Change Governance

## Purpose

This document defines how BookedAI must be changed going forward so that upgrades remain synchronized across product, platform, and documentation layers.

## Mandatory Change Workflow

### Step 1. Read existing documentation first

Before making a change, review:

- `project.md`
- the relevant file in `docs/architecture/`
- the relevant file in `docs/users/`

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
| governance / process changes | `project.md` and this file |

## Completion Standard

A request should only be considered fully handled when:

1. the code change is aligned across affected modules
2. the related documentation is aligned
3. previous behavior descriptions were reviewed before upgrading them
4. the final state is internally consistent for all affected audiences
5. substantial prompt-level descriptions have been recorded into the relevant documentation files and `project.md` unless the user explicitly chooses otherwise
