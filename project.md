# BookedAI Master Index

## Purpose

`project.md` is the root-level control document for the `bookedai.au` project.

Current synchronized release baseline: `1.0.1-stable`.

From this point onward, it serves three purposes:

- act as the master index for all project documentation
- define the change discipline for future upgrades
- ensure every new request is synchronized across all affected modules

## Documentation Map

### Core documentation

- [Project Documentation Root](./docs/README.md)
- [System Overview](./docs/architecture/system-overview.md)
- [Module Hierarchy](./docs/architecture/module-hierarchy.md)
- [Change Governance](./docs/governance/change-governance.md)

### Audience-specific documentation

- [End User Guide](./docs/users/end-user-guide.md)
- [SME Customer Guide](./docs/users/sme-customer-guide.md)
- [Administrator Guide](./docs/users/administrator-guide.md)

## Current Documentation Standard

The project documentation is now organized according to a professional structure:

1. architecture documents describe the platform by system layers and boundaries
2. module documents describe responsibilities and integration points
3. audience guides describe the platform by user type
4. governance documents define how changes must be synchronized

## Mandatory Rules for Future Requests

### 1. Read old context first

Before modifying any feature, always review the existing relevant documentation first.

Minimum reading path:

- this file
- the relevant architecture document
- the relevant audience document

### 2. Summarize every new request

Every new request must be summarized into:

- goal
- affected modules
- affected audiences
- affected integrations
- affected configuration or deployment surface

### 3. Do not patch one layer in isolation

If the change affects more than one layer, it must be handled as a synchronized change across:

- frontend
- backend
- data
- AI / assistant behavior
- automation
- infrastructure
- documentation

### 4. Update documentation as part of the change

No substantial change is complete unless related docs are updated in the correct place.

### 5. Upgrade old features with full context

When enhancing an existing feature:

- read the old feature description first
- compare it with the current code state
- update all dependent areas together
- record the upgraded state in the proper document

## Synchronization Checklist

### If frontend changes

- review backend API contracts
- review end-user experience documentation
- review admin impact if shared code paths exist

### If backend changes

- review frontend call sites
- review schemas and persistence assumptions
- review automation payload contracts
- review SME and admin guides

### If data changes

- review database setup
- review admin visibility
- review catalog consumers
- review migration and seed assumptions

### If AI behavior changes

- review assistant UX
- review business expectations
- review workflow trigger behavior

### If automation changes

- review backend trigger contracts
- review callback auth and status handling
- review admin operating procedures

### If infrastructure changes

- review deploy scripts
- review compose topology
- review routing
- review env handling
- review admin operational guidance

## Change Logging Policy

For every meaningful future upgrade, documentation should make clear:

- what existed before
- what changed
- which modules were updated together
- which user groups are affected

## Project Formation Reference

The current repository history still indicates this high-level creation sequence:

1. `5d00edd` - initial full-stack foundation
2. `7d66810` - removal of the old `bookedai-video` side module
3. `9bcc64e` - production architecture clarification
4. `d98b641` - production web startup decoupling

## Current Refactor Baseline

The latest structural refactor now establishes:

- frontend runtime separation through `src/app`, `src/apps/public`, `src/apps/admin`, and `src/shared`
- backend startup separation through `main.py`, `app.py`, and `api/routes.py`
- shared frontend API base URL logic in a single reusable utility
- backend route separation through domain-specific router modules
- backend handler preservation in `api/route_handlers.py`
- backend operational service extraction into `service_layer/` for `n8n`, `email`, and event persistence

This is the minimum baseline that future refactors should build on rather than collapse back into a single entrypoint file.

## Current Refactor Status

Completed:

- frontend app composition refactor
- backend app factory refactor
- backend route aggregator plus domain router split
- backend service extraction for `N8NService`, `EmailService`, and `store_event`

Still pending in later phases:

- extract pricing logic from the large `services.py` module
- extract AI and booking logic into bounded backend modules
- introduce clearer shared API contracts between frontend and backend

## Working Commitment Going Forward

From this point onward, all future BookedAI changes should follow this discipline:

- read existing documentation first
- summarize the new request
- identify every affected module
- upgrade the system in a synchronized way
- update the correct documentation before closing the task
