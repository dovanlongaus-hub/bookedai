# BookedAI doc sync - project.md

- Timestamp: 2026-04-21T12:49:34.872608+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `project.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Master Index ## Purpose `project.md` is the root-level control document for the `bookedai.au` project. Current synchronized release baseline: `1.0.1-stable`.

## Details

Source path: project.md
Synchronized at: 2026-04-21T12:49:34.714345+00:00

Repository document content:

# BookedAI Master Index

## Purpose

`project.md` is the root-level control document for the `bookedai.au` project.

Current synchronized release baseline: `1.0.1-stable`.

Latest infrastructure update date: `2026-04-16`.

Latest product-surface update date: `2026-04-21`.

From this point onward, it serves three purposes:

- act as the master index for all project documentation
- define the change discipline for future upgrades
- ensure every new request is synchronized across all affected modules

## Source Of Truth Rule

`project.md` is the single project-level source of truth for:

- current project scope
- active delivery baseline
- documentation hierarchy
- synchronization rules between product, architecture, and implementation docs

All other documents should be treated as supporting or specialized documents.

That means:

- `README.md` explains setup, repo usage, and operator-facing entry points
- `DESIGN.md` captures design-system or UX implementation intent
- `docs/architecture/*` contains domain, platform, and execution deep-dives
- `docs/development/*` contains working plans, rollout notes, and implementation packages
- `docs/users/*` contains audience-specific guides

If any supporting document conflicts with `project.md`, treat `project.md` as authoritative until the inconsistency is explicitly resolved.

Every meaningful implementation change that affects direction, architecture, roadmap, or delivery state should update `project.md` first, then sync the downstream document set.

## Latest Synced Delivery Note

As of `2026-04-21`, the synchronized repo baseline now includes both product-surface continuity work and a backend ownership cleanup pass.

The current inherited truth is:

- the production multi-surface frontend currently still runs from the React + TypeScript + Vite application under `frontend/`
- the root `app/` and `components/` Next.js subtree now exists as a parallel marketing/runtime experiment, but it is not yet the sole production web source
- the backend top-level router is now mounted in `backend/app.py` through explicit modules:
  - `public_catalog_routes`
  - `upload_routes`
  - `webhook_routes`
  - `admin_routes`
  - `communication_routes`
  - `tenant_routes`
- compatibility router shims remain in place for older imports, so the cleanup improves ownership without forcing an immediate breaking import change
- the main remaining backend monolith is now explicitly identified as `backend/api/v1_routes.py`
- the approved backend bounded-context target is now:
  - `booking`
  - `tenant`
  - `admin`
  - `search_matching`
  - `communications`
  - `integrations`
- session-signing is now split by actor boundary in code and docs through:
  - `SESSION_SIGNING_SECRET`
  - `TENANT_SESSION_SIGNING_SECRET`
  - `ADMIN_SESSION_SIGNING_SECRET`
- legacy `ADMIN_API_TOKEN` and `ADMIN_PASSWORD` fallback still exists for compatibility, but should now be treated as migration support rather than the desired end-state
- route-related backend verification passed after the router split, and the previously failing `matching/search public-web fallback` and tenant session-signing regressions are now restored in the backend validation pass

This baseline is now synchronized across:

- `README.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/users/administrator-guide.md`

Broader tenant, portal, admin, billing, search-hardening, and bounded-context extraction work remains active and should still be treated as continuing delivery rather than closed scope.

## Current Project Truth

This section is the canonical project-level baseline for future upgrades.

When later work needs one short authoritative read before touching code, use this section first.

### Product definition

BookedAI is currently defined as:

- an AI revenue engine for service businesses
- a multi-surface product spanning public acquisition, product proof, booking capture, tenant operations, admin support, communications, integrations, and deployment/runtime operations
- a platform that must stay truthful about search quality, booking state, billing posture, support readiness, and rollout maturity

The platform should not be framed as:

- only a chatbot
- only a landing page
- only an internal admin console

### Active runtime surfaces

Current approved surface map:

- `bookedai.au`
  - homepage sales-deck and acquisition surface
- `product.bookedai.au`
  - deeper product demo and booking-agent proof surface
- `demo.bookedai.au`
  - lighter conversational or story-led demo surface
- `tenant.bookedai.au`
  - tenant sign-in, onboarding, catalog, billing, and team workspace gateway
- `portal.bookedai.au`
  - customer booking review and support-follow-up surface
- `admin.bookedai.au`
  - operator and internal support surface
- `api.bookedai.au`
  - FastAPI backend
- `upload.bookedai.au`
  - upload and hosted asset surface
- `n8n.bookedai.au`
  - automation editor and workflow runtime
- `supabase.bookedai.au`
  - data, auth, storage, and operator tooling through Supabase
- `hermes.bookedai.au`
  - knowledge or documentation service

### Current repo shape

Current checked-in repo truth:

- primary deployed frontend:
  - active React + TypeScript + Vite multi-surface app under `frontend/`
- parallel frontend experiment:
  - Next.js app under `app/` and `components/` for newer marketing/runtime exploration
- backend:
  - FastAPI app under `backend/`
- data and infra:
  - `supabase/`, `deploy/`, `scripts/`, `storage/`
- Telegram/OpenClaw live deploy authority is intentionally scoped to host-level elevated execution on the Docker VPS, with `scripts/deploy_live_host.sh` as the preferred entrypoint

Future work must not assume the repo is greenfield or single-runtime.

### Current backend architecture baseline

Active backend entrypoint:

- `backend/app.py`

Current top-level router ownership:

- `backend/api/public_catalog_routes.py`
- `backend/api/upload_routes.py`
- `backend/api/webhook_routes.py`
- `backend/api/admin_routes.py`
- `backend/api/communication_routes.py`
- `backend/api/tenant_routes.py`

Compatibility router shims still exist:

- `backend/api/public_routes.py`
- `backend/api/automation_routes.py`
- `backend/api/email_routes.py`
- `backend/api/routes.py`

Current main backend debt item:

- `backend/api/v1_routes.py` is still a large mixed-surface route module

Approved bounded-context split target:

- `booking`
- `tenant`
- `admin`
- `search_matching`
- `communications`
- `integrations`
- `portal`

### Current auth and session baseline

Approved session-signing baseline:

- `SESSION_SIGNING_SECRET`
- `TENANT_SESSION_SIGNING_SECRET`
- `ADMIN_SESSION_SIGNING_SECRET`

Current compatibility fallback still accepted by code:

- `ADMIN_API_TOKEN`
- `ADMIN_PASSWORD`

Rule for future upgrades:

- actor-specific session signing is the target baseline
- legacy fallback is compatibility support only
- later work must not silently collapse tenant and admin signing back into one shared secret model

### Current implementation baseline by capability

Implemented or materially active:

- public homepage and product proof flow
- booking assistant and booking session flow
- matching and search infrastructure
- public-web fallback lane and replay tooling
- tenant auth foundations
- tenant catalog import, review, publish, archive, and workspace reads
- tenant billing and team foundations
- portal booking detail and request-safe support actions
- admin overview, bookings, support queue, partner management, and catalog quality flows
- communication surfaces through email and Discord
- Telegram or OpenClaw operator sync tooling for repo-side change summaries, Notion writeback, and Discord update mirroring
- provider and integration support seams
- outbox, scheduler, and release-gate foundations

Still active and incomplete:

- full bounded-context extraction of `/api/v1/*`
- tenant paid-SaaS completion
- billing self-serve completeness
- stronger value reporting
- release-grade auth, portal, and billing hardening
- remaining search fallback regression fixes

### Current source-of-truth documents

Project-wide master:

- `project.md`

Operator and repo entry:

- `README.md`

Primary active planning and execution docs:

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/implementation-progress.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`

Operational and audience companion docs:

- `docs/users/administrator-guide.md`
- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`

If any narrower doc conflicts with this baseline, update the narrower doc or update `project.md` explicitly. Do not let the inconsistency drift.

## Active Upgrade Baseline

The currently approved upgrade direction is:

1. keep the live runtime stable
2. continue upgrading the user-facing surfaces into one coherent SaaS product system
3. continue reducing backend ownership ambiguity
4. continue moving hidden operational assumptions into explicit code and documentation
5. harden release discipline as real flows become tenant- and customer-facing

### Current required upgrade tracks

- public:
  - preserve compact acquisition-first homepage posture
  - preserve direct continuation into product and registration paths
- tenant:
  - continue hardening onboarding, billing, team, and role-safe operations
- portal:
  - continue productizing booking review and customer request flows
- admin:
  - continue support, billing-investigation, and operational trust workflows
- backend:
  - continue bounded-context router extraction and service ownership cleanup
- auth:
  - preserve actor-specific signing-secret separation
- release discipline:
  - extend search-grade rigor into auth, billing, portal, and support flows

## Open Carry-Forward Items

These items are explicitly open and should not be treated as resolved:

- `backend/api/v1_routes.py` still needs bounded-context extraction
- the repo still has a dual frontend reality:
  - active Next.js root app
  - legacy Vite subtree
- two `backend/tests/test_api_v1_routes.py` public-web fallback cases are still failing and belong to the active search-hardening lane
- tenant billing, invoice, payment-method, and value-reporting experience still need further productization
- release gates for tenant auth, billing, and portal flows are not yet complete enough to be treated as fully closed

## Decision Rules For Future Upgrades

When future work changes scope, architecture, delivery sequence, or core implementation assumptions:

- update `project.md` first
- then update the active planning and execution docs
- then update narrower requirement or audience docs

When future work is only local or tactical, still check whether it changes:

- active route ownership
- active product surface ownership
- auth or secret policy
- sprint carry-forward scope
- release criteria

If yes, sync it back into `project.md`.

## Documentation Map

### Core documentation

- [Project Documentation Root](./docs/README.md)
- [Release Note - 2026-04-20 Homepage Product Live](./docs/development/release-note-2026-04-20-homepage-product-live.md)
- [Investor Update - 2026-04-20](./docs/development/investor-update-2026-04-20.md)
- [System Overview](./docs/architecture/system-overview.md)
- [Module Hierarchy](./docs/architecture/module-hierarchy.md)
- [Target Platform Architecture](./docs/architecture/target-platform-architecture.md)
- [BookedAI Product Requirements Document](./docs/architecture/bookedai-master-prd.md)
- [SaaS Domain Foundation](./docs/architecture/saas-domain-foundation.md)
- [Phase 0-1 Execution Blueprint](./docs/architecture/phase-0-1-execution-blueprint.md)
- [Implementation Phase Roadmap](./docs/architecture/implementation-phase-roadmap.md)
- [Master Execution Index](./docs/architecture/master-execution-index.md)
- [MVP Sprint Execution Plan](./docs/architecture/mvp-sprint-execution-plan.md)
- [Team Task Breakdown](./docs/architecture/team-task-breakdown.md)
- [Jira Epic Story Task Structure](./docs/architecture/jira-epic-story-task-structure.md)
- [Notion Jira Import Ready Backlog](./docs/architecture/notion-jira-import-ready.md)
- [Coding Implementation Phases](./docs/architecture/coding-implementation-phases.md)
- [Coding Phase File Mapping](./docs/architecture/coding-phase-file-mapping.md)
- [Coding Phase 1 2 3 Technical Checklist](./docs/architecture/coding-phase-1-2-3-technical-checklist.md)
- [Sprint 1 Implementation Package](./docs/architecture/sprint-1-implementation-package.md)
- [Sprint 2 Implementation Package](./docs/architecture/sprint-2-implementation-package.md)
- [Phase 1.5 Data Implementation Package](./docs/architecture/phase-1-5-data-implementation-package.md)
- [Phase 2 6 Detailed Implementation Package](./docs/architecture/phase-2-6-detailed-implementation-package.md)
- [Repo And Module Strategy](./docs/architecture/repo-module-strategy.md)
- [Data Architecture And Migration Strategy](./docs/architecture/data-architecture-migration-strategy.md)
- [API Architecture And Contract Strategy](./docs/architecture/api-architecture-contract-strategy.md)
- [Public Growth App Strategy](./docs/architecture/public-growth-app-strategy.md)
- [Tenant App Strategy](./docs/architecture/tenant-app-strategy.md)
- [Internal Admin App Strategy](./docs/architecture/internal-admin-app-strategy.md)
- [AI Router Matching And Grounded Search Strategy](./docs/architecture/ai-router-matching-search-strategy.md)
- [CRM Email And Revenue Lifecycle Strategy](./docs/architecture/crm-email-revenue-lifecycle-strategy.md)
- [Integration Hub And Sync Architecture](./docs/architecture/integration-hub-sync-architecture.md)
- [Auth RBAC And Multi-tenant Security Strategy](./docs/architecture/auth-rbac-multi-tenant-security-strategy.md)
- [DevOps Deployment CI-CD And Scaling Strategy](./docs/architecture/devops-deployment-cicd-scaling-strategy.md)
- [QA Testing Reliability And AI Evaluation Strategy](./docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md)
- [Analytics Metrics Revenue And BI Strategy](./docs/architecture/analytics-metrics-revenue-bi-strategy.md)
- [Pricing Packaging And Monetization Strategy](./docs/architecture/pricing-packaging-monetization-strategy.md)
- [Go-To-Market Sales And Event Strategy](./docs/architecture/go-to-market-sales-event-strategy.md)
- [Demo Script Storytelling And Video Strategy](./docs/architecture/demo-script-storytelling-video-strategy.md)
- [Change Governance](./docs/governance/change-governance.md)
- [Project-Wide Sprint Execution Checklist](./docs/development/project-wide-sprint-execution-checklist.md)

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
5. a master execution index provides leadership-level navigation across the full program
6. phase-level execution packages define implementation detail
7. phase-level Epic -> Story -> Task documents define backlog structure
8. sprint-level owner execution checklists define practical delivery control
9. a Jira-ready delivery structure provides tracker translation guidance
10. a Notion import-ready execution backlog provides phase, epic, and sprint seed data for workspace import

## Mandatory Rules for Future Requests

### 1. Read old context first

Before modifying any feature, always review the existing relevant documentation first.

Minimum reading path:

- this file
- the relevant architecture document
- the relevant audience document

If the request is for an existing module or workflow, also read the prior description for that exact area first and use it as the baseline for any merge, correction, or upgrade.

When the request asks to edit or adjust an existing module, do not start from scratch:

- find the existing description document for that module first
- re-read the prior context and current documented scope
- merge or revise that existing source-of-truth document according to the new request instead of writing a disconnected replacement

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

Documentation capture rule:

- when a prompt contains substantial architecture, product, system, repo, module, migration, workflow, or governance description, that description should be recorded into the appropriate `.md` files in `docs/` and reflected in `project.md`
- this rule should be treated as the default working expectation for future prompts unless the user explicitly asks not to update documentation
- when updating an existing area, do not write the new state in isolation; merge it into the existing source description for that area after re-reading the prior context
- each substantive update should be recorded in three places: the edited request-facing document, the implementation-tracking document, and the corresponding roadmap or sprint or plan or phase artifact

Three-place recording rule for module changes:

- update the requirement-facing document that was changed or reinterpreted
- update the implementation or execution tracking document that explains what is now being done
- update the corresponding roadmap or sprint or plan or phase document so scheduling and delivery context stay synchronized

Live-promotion closure rule:

- whenever an update has been implemented successfully through the final step and promoted to live, automatically write the delivered result back into implementation tracking before considering the work closed
- update the corresponding sprint, requirement, or module description document in the same completion pass
- update the matching roadmap or sprint or phase artifact in the same completion pass
- treat `implemented + live deployed + documented` as one completion standard

### 5. Upgrade old features with full context

When enhancing an existing feature:

- read the old feature description first
- compare it with the current code state
- update all dependent areas together
- record the upgraded state in the proper document
- make sure the upgraded state is also reflected in implementation tracking and the relevant roadmap or sprint or phase plan

### 5A. Route later-sprint logic issues into the correct later sprint

If work in the current sprint exposes a bug, gap, or logic flaw that properly belongs to a later sprint or phase:

- do not leave it as an informal note or memory-only carryover
- add it to the correct sprint, phase, story, task, or checklist artifact where that work is supposed to happen
- record it in the current sprint artifact as a carry-forward issue with enough detail that the next sprint can act on it immediately

The current sprint must explicitly record:

- what the issue is
- why it was not fully solved in the current sprint
- which later sprint or phase now owns the fix
- what exact behavior, acceptance rule, or regression case the later sprint must handle

The later sprint artifact must explicitly record:

- the new or revised task that now owns the issue
- the expected implementation scope
- the acceptance or regression checks needed to close it

Do not treat cross-sprint logic defects as resolved just because they were discovered and discussed.

### 6. Apply the latest approved implementation baseline by default

When a later sprint builds on an already-approved direction:

- inherit the latest approved source-of-truth stack first
- do not reopen solved structure, scope, or ownership questions unless a truth issue is discovered
- treat the latest code-ready handoff for that area as the default execution baseline

### 7. Preserve the live runtime and repo shape unless migration is explicitly approved

Default project rule:

- upgrade the live implementation in place
- preserve the current repo shape where possible
- avoid rewrite-first moves unless a rewrite has been explicitly approved as scope

Do not assume that:

- a forward-compatible starter replaces the live runtime
- an additive architecture experiment is automatically the new production target

### 8. Keep one active implementation spine and demote deferred inventory

For any major user-facing flow:

- there must be one explicit active implementation spine
- files or sections outside that spine should be treated as additive, deferred, or separately approved inventory
- later sprints must not silently promote deferred inventory into mandatory scope

### 9. Keep one source of truth for content, composition, and tokens

For every active product surface, later sprints should preserve:

- one content source of truth
- one page or flow composition root
- one token ownership model
- one shared primitive layer for reusable UI

Do not allow later sprints to reintroduce:

- copy drift across JSX files
- competing page roots
- competing token systems
- parallel primitive layers for the same surface

### 10. Cleanup and migration are part of implementation, not optional polish

If an area contains old-path drift, later sprints should treat cleanup as part of delivery.

Examples:

- duplicate primitives
- text-heavy legacy layouts that conflict with the approved visual system
- stale assumptions about active scope
- build wiring that depends on the wrong runtime or config chain

### 10A. Carry-forward detail must be specific, not generic

When the current sprint hands an issue forward:

- do not write vague notes such as `follow up later` or `fix in next sprint`
- write the exact query, scenario, payload shape, or UI behavior that failed
- write the exact risk if it is left unresolved
- write the exact sprint or phase that owns the next fix

This rule is especially important for:

- search or assistant truth failures
- public conversion regressions
- contract drift
- release-gate gaps

### 11. Visual-first approved surfaces should not regress to older presentation patterns

When a surface has already been approved as visual-first:

- future changes should preserve that presentation model
- sections should not drift back into long-form text-first treatment
- pricing, trust, and closing conversion surfaces should remain aligned with the same approved visual system as the upper narrative sections

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
- the public landing rebuild is now materially in its visual-first implementation stage, with the core hero, problem, solution, and product-proof sections redesigned toward infographic-led, graphic-heavy storytelling instead of text-heavy marketing blocks
- the active public design direction now targets roughly `80%` graphic, flow, chart, proof-state, and status-image treatment with the remaining `20%` reserved for high-value positioning copy, commercial keywords, and action-driving statements
- that visual-first treatment now also extends through pricing, trust, and final CTA surfaces, so the active landing path reads as one coherent premium narrative rather than mixing redesigned sections with older text-heavier sections
- pricing plan cards and the partner trust wall are now also polished to the same premium scan-first system, so mid-page decision blocks and lower-page credibility blocks no longer feel visually behind the upper narrative sections
- the booking assistant preview section now also uses the same visual-first framing with a proof-led intro panel and a stronger live-product shell, so the interactive demo block reads like core product storytelling rather than a standalone utility widget
- backend startup separation through `main.py`, `app.py`, and `api/routes.py`
- shared frontend API base URL logic in a single reusable utility
- backend route separation through domain-specific router modules
- backend handler preservation in `api/route_handlers.py`
- backend operational service extraction into `service_layer/` for `n8n`, `email`, and event persistence

This is the minimum baseline that future refactors should build on rather than collapse back into a single entrypoint file.

The current frontend slicing baseline now also includes:

- route-level lazy loading across `public`, `product`, `roadmap`, and `admin` runtime entrypoints
- an extracted `reliability-workspace` module inside the admin runtime
- issue-first reliability launchers that route operators into Prompt 5 or Prompt 11 preview, configuration review, or API contract review from the reliability workspace itself
- separate lazy drill-down modules for `config-risk` and `contract-review`, with read-only operator notes and export-ready cues for reliability follow-up
- direct hash-entry now also restores focus onto the active reliability panel shell, so the admin reliability lanes behave like stable views instead of pure scroll anchors
- local operator-note capture and export-ready handoff packaging now live inside the reliability drill-down layer, so admins can document follow-up without turning the preview surface into a backend workflow editor
- the reliability handoff tooling is now isolated as its own lazy frontend module, so local note and export packaging no longer sit on the critical path for every drill-down render
- that handoff tooling now also supports richer local Slack, ticket, and incident packaging formats, while still avoiding any new server-side note or workflow state

## Current Deployment Progress

As of `2026-04-15`, the deployment surface now has two different runtime tiers:

- production tier:
  - `bookedai.au`
  - `admin.bookedai.au`
  - `api.bookedai.au`
- beta staging tier:
  - `beta.bookedai.au`

The current beta rollout is now materially safer than the original single-route beta setup because:

- `beta.bookedai.au` now routes to dedicated `beta-web` and `beta-backend` containers
- TLS and Cloudflare DNS are explicitly provisioned for the beta subdomain
- beta traffic is isolated from the production web and backend runtime processes
- production now also reserves `portal.bookedai.au` as a first-class routed subdomain for the customer booking portal path rather than leaving post-booking continuation on an implicit host

The current beta tier still has important shared infrastructure constraints:

- it still shares the current database and most third-party integrations with production unless beta-specific secrets are later introduced
- it is a runtime-isolated staging layer, not yet a fully data-isolated staging environment

This means the solution has advanced from:

- no real staging entrypoint

to:

- production plus a dedicated beta runtime path

but has not yet reached:

- fully isolated staging data, billing, and provider sandbox separation

## Current Architecture Progress

The current solution-wide progress should now be understood as:

- experience architecture:
  - public landing, roadmap, admin, and demo surfaces are live
  - beta and production now have separate routed runtime entrypoints
- application architecture:
  - production API and beta API are now served by separate backend containers
  - major business logic is still concentrated in legacy service modules and remains a refactor target
  - the admin runtime is no longer treated as a single frontend bootstrap path because route-level splitting and workspace-level lazy loading now isolate the reliability surface more cleanly
  - reliability no longer boots every review lane at once, because config-risk and contract-review now lazy-load as narrower drill-down modules behind the existing hash-based admin IA
  - active reliability panel controls and focused panel shells now move together, which makes direct deep-links and browser verification more stable
  - local reliability notes now persist per lane and can be turned into export-ready summaries for Slack, ticket, or incident handoff without adding new server-side state
  - the note/export tooling for that handoff path now lazy-loads separately from the main drill-down shell, which keeps the reliability surface easier to scale incrementally
  - richer handoff formats now exist entirely on the client side, so operators can choose a packaging style without changing backend contracts or rollout safety
- platform architecture:
  - Cloudflare DNS, Nginx routing, Docker Compose deployment, and TLS provisioning now explicitly support production and beta tiers
  - `portal.bookedai.au` is now part of the production subdomain matrix and routes through the shared frontend plus backend proxy path
  - deploy automation is aware of beta domain issuance and rollout, and now also includes the customer portal host in DNS and certificate coverage
- environment architecture:
  - `beta.bookedai.au` is now the required rehearsal surface before promotion to `bookedai.au`
  - `scripts/deploy_beta.sh` is now the default rebuild and redeploy path for staging previews on `beta.bookedai.au`
  - full staging-grade isolation remains a next-step infrastructure milestone
  - `admin.bookedai.au` now benefits from separate reliability workspace loading and issue-first drill-down entry, which makes operational review flows easier to extend without regressing the initial admin shell
  - deep links such as `admin.bookedai.au#reliability:live-configuration` and `admin.bookedai.au#reliability:api-inventory` now resolve into narrower lazy reliability modules with operator-facing follow-up cues

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

## Architecture Baseline Added

The current architecture baseline now also includes a long-horizon platform direction for:

- SEO and growth attribution
- GTM and sales execution
- matching and recommendation quality
- booking trust and availability verification
- payment orchestration
- CRM lifecycle
- email lifecycle
- tenant-aware SaaS evolution
- mobile-ready product surfaces

Future platform work should review:

- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/saas-domain-foundation.md`
- `docs/architecture/phase-0-1-execution-blueprint.md`
- `docs/architecture/repo-module-strategy.md`
- `docs/architecture/go-to-market-sales-event-strategy.md`
- `docs/architecture/demo-script-storytelling-video-strategy.md`

This baseline is intended to protect production continuity while guiding multi-phase evolution toward a more complete SME platform.

## Latest Synchronized Strategy Scope

The latest synchronized documentation set now explicitly records:

- current repo and module reality
- current coupling and risk zones
- reusable versus decomposable code areas
- target repo and module structure
- domain-to-module mapping for growth, matching, booking trust, payments, CRM, email, billing, deployment modes, and integrations
- frontend, backend, domain, repository, integration, shared, and worker coding boundaries
- naming conventions and structure conventions
- mobile-ready structure implications
- technical decision timing for framework, app split, deploy split, workers, and integration boundaries
- migration-safe module transition sequencing
- ICP and high-intent SME segmentation
- GTM channel priorities across SEO, direct outreach, events, referrals, and partnerships
- event-led selling motion and rapid demo conversion strategy
- founder-usable sales playbook, objection handling, and follow-up discipline
- 30-second pitch structure and 2 to 3 minute demo flow
- scenario-based storytelling for swim school, clinic, salon, tutor, and trade use cases
- video demo scripting and post-demo CTA discipline

This means future structural work should not start from scratch. It should inherit and follow the synchronized baseline captured in:

- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/saas-domain-foundation.md`
- `docs/architecture/phase-0-1-execution-blueprint.md`
- `docs/architecture/repo-module-strategy.md`
- `docs/architecture/go-to-market-sales-event-strategy.md`
- `docs/architecture/demo-script-storytelling-video-strategy.md`

## Public Growth Surface Baseline

The synchronized documentation baseline now also includes a dedicated public growth strategy covering:

- current public-site structure and route reality
- homepage and landing architecture
- CTA taxonomy and lead-capture direction
- booking trust messaging on the public site
- SEO page family strategy
- industry page and deployment-mode page strategy
- attribution-aware public conversion design
- mobile-first public UX priorities
- safe rollout sequencing for public growth changes

Future public-site work should inherit:

- `docs/architecture/public-growth-app-strategy.md`

This is intended to keep the current production site stable while evolving the public app into a stronger acquisition, SEO, conversion, and trust surface.

## Tenant Surface Baseline

The synchronized documentation baseline now also includes a dedicated tenant app strategy covering:

- tenant host and gateway role on `tenant.bookedai.au`
- unified tenant sign-up, sign-in, and account ownership model
- current tenant-facing reality versus internal admin reality
- tenant app product role and operational goals
- page families and information architecture
- dashboard, leads, conversations, matching, booking trust, billing, CRM, email, and integrations visibility
- deployment-mode-aware tenant UX
- mobile-usable tenant workflows
- reusable component families for tenant and admin evolution
- safe rollout sequencing from internal admin toward a real SME product surface

Future tenant-facing product work should inherit:

- `docs/architecture/tenant-app-strategy.md`

This is intended to help the team evolve from an internal admin console toward a true SME operational app without breaking the current production system.

Latest confirmed tenant baseline on `2026-04-18`:

- standalone `TenantApp` now exists as a real tenant route entry, not just a planning target
- `tenant.bookedai.au` is now the approved tenant-facing host and should be treated as the single tenant product gateway
- tenant workspace now includes `overview`, `catalog`, `bookings`, and `integrations` panels
- tenant catalog panel now uses the same search-result card language as the public search workspace
- tenant sign-in now exists as the first tenant-safe authenticated path for write-enabled catalog actions
- tenant website import now supports AI-guided extraction tuned toward booking-critical fields such as service name, duration, location, price, description, imagery, booking URL, and related booking metadata
- tenant catalog snapshot now exposes search-readiness counts and review warnings so catalog quality can be managed inside the tenant surface instead of only through admin flows
- the next required tenant upgrade is now locked in product scope: one canonical tenant account system should cover sign-up, sign-in, data input, reporting, subscription, invoice visibility, and billing actions rather than splitting those flows across multiple surfaces
- migration-ready rollout for tenant membership and catalog publish-state now includes a repo-local apply helper plus an operator checklist for staging and shadow environments
- migration-safe rollout now also includes a repo-local verification helper that can be used after apply or wired into the release gate when database access exists
- tenant publish rollout now also has a dedicated production-shadow rehearsal checklist so beta or shadow validation can be run as a repeatable operational sequence
- the first official sample tenant is now a chess-class onboarding sample derived from a real uploaded PDF source, giving the tenant-catalog lane one concrete non-website onboarding baseline to inherit from

Latest confirmed tenant baseline on `2026-04-19`:

- the tenant portal now behaves as one unified product gateway across `sign in`, `create account`, and `accept invite or claim workspace`
- tenant password auth is live alongside Google continuation, and tenant sessions now survive reload and tenant switching safely
- onboarding now includes business profile capture plus a visible progress model inside the tenant workspace
- the tenant workspace now includes `billing` and `team` panels in addition to `overview`, `catalog`, `bookings`, and `integrations`
- the billing workspace now includes self-serve billing setup, plan selection, trial-start or plan-switch actions, invoice-history seam, payment-method seam, billing settings, and billing audit trail
- the tenant team workspace now includes membership roster, invite flow, and tenant role or status updates
- the first tenant role model is now active:
  - `tenant_admin`
  - `finance_manager`
  - `operator`
- role-aware write rules are now part of the implemented product baseline:
  - only `tenant_admin` and `finance_manager` can change billing setup or plans
  - only `tenant_admin` can manage team membership and role changes
  - only `tenant_admin` and `operator` can import, edit, publish, or archive catalog records
- invite acceptance is now handled through the existing tenant claim path, so invited members can set their first password from the tenant portal
- billing, profile, subscription, and team mutations now append tenant audit events so later support drill-ins have real evidence to inherit from

## Internal Admin Baseline

The synchronized documentation baseline now also includes a dedicated internal admin strategy covering:

- current internal admin reality and limits
- internal admin role as ops, support, billing, trust, integration, audit, and rollout console
- admin information architecture and issue-first navigation
- tenant management and tenant detail support views
- booking reliability, billing ops, CRM ops, email ops, integration ops, webhook ops, and audit visibility
- role-aware internal workflows
- mobile-tolerant internal usage patterns
- safe coexistence between the current admin page and future internal admin expansion

Future internal admin work should inherit:

- `docs/architecture/internal-admin-app-strategy.md`

This is intended to preserve the current production admin utility while evolving it into a stronger internal platform console.

## AI And Matching Baseline

The synchronized documentation baseline now also includes a dedicated AI router and matching strategy covering:

- the exact role of AI in BookedAI
- what AI may do versus what AI must never do
- AI router architecture and task taxonomy
- provider and model positioning
- grounded search and local discovery policy
- matching pipeline design
- booking-trust-aware and payment-aware AI behavior
- structured outputs, confidence tiers, and trust gating
- multi-layer fallback strategy
- cost, latency, and quality strategy
- observability and evaluation requirements
- channel-agnostic AI behavior

Future AI, matching, and search work should inherit:

- `docs/architecture/ai-router-matching-search-strategy.md`

This is intended to evolve the current AI stack from a useful production booking assistant into a stronger, trust-first matching and routing engine without letting AI become the system of record.

## CRM And Revenue Lifecycle Baseline

The synchronized documentation baseline now also includes a dedicated CRM, email, and revenue lifecycle strategy covering:

- the full lifecycle from acquisition to retention
- system-of-record boundaries between Zoho CRM, BookedAI, billing state, and email providers
- CRM lifecycle architecture and sync model
- email communications architecture, template system, and delivery tracking
- lifecycle workflow design for onboarding, invoices, reminders, thank-you messages, monthly reports, and renewal paths
- attribution-to-revenue linkage
- idempotency, retry, and outbox-driven recovery
- tenant and internal admin visibility requirements

Future CRM, email, billing-reminder, and monthly-reporting work should inherit:

- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`

This is intended to evolve the current production flows into a stronger lifecycle and revenue platform without collapsing operational truth into Zoho or into the email provider layer.

## Integration Hub Baseline

The synchronized documentation baseline now also includes a dedicated integration hub and sync architecture strategy covering:

- integration classification across CRM, payments, communications, business operations, and external data sources
- local-versus-external source-of-truth boundaries
- read-only, write-back, and bi-directional sync modes
- mapping strategy for contacts, leads, deals, bookings, payments, services, and slots
- sync engine direction with jobs, workers, retry, rate-limit handling, and reconciliation
- domain-specific idempotency strategy
- conflict detection and manual-versus-automatic resolution rules
- booking and slot sync safety
- revenue sync and accounting alignment
- internal admin and tenant visibility requirements

Future integration, sync, reconciliation, POS, accounting, inventory, and external booking work should inherit:

- `docs/architecture/integration-hub-sync-architecture.md`

This is intended to let BookedAI scale safely across external systems without turning integrations into a brittle tangle or letting stale and conflicting data damage booking or billing trust.

## Security And Tenant Isolation Baseline

The synchronized documentation baseline now also includes a dedicated auth, RBAC, and multi-tenant security strategy covering:

- authentication architecture for public, tenant, internal admin, integrations, and webhook providers
- tenant and internal role models
- permission abstraction and sensitive-action controls
- tenant isolation and tenant-scoped query discipline
- session, token, refresh, and storage direction
- API access control by actor type and endpoint class
- webhook verification and replay protection
- integration credential scoping
- audit logging and security-event recording
- migration-safe rollout from the current admin-only auth reality toward a real SaaS identity model

Future auth, RBAC, security, and tenant-isolation work should inherit:

- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`

This is intended to help BookedAI scale into a safer multi-tenant SaaS platform without breaking the current production admin flow or introducing a risky auth rewrite too early.

## DevOps And Deployment Baseline

The synchronized documentation baseline now also includes a dedicated DevOps, deployment, CI/CD, and scaling strategy covering:

- current deployment reality and confirmed infrastructure facts
- target deploy units and runtime separation by phase
- local, development, staging, and production environment strategy
- container and runtime direction
- CI safety gates and release discipline
- database, storage, backup, and restore strategy
- worker, queue, scheduler, and webhook runtime strategy
- observability, monitoring, and alerting expectations
- secrets and config handling
- rollout, rollback, and scaling-phase guidance

Future infrastructure, deployment, worker-hosting, backup, and release work should inherit:

- `docs/architecture/devops-deployment-cicd-scaling-strategy.md`

This is intended to help BookedAI scale operations safely without replacing the current Docker-based production deployment before the product and traffic justify a more complex platform.

## QA And Reliability Baseline

The synchronized documentation baseline now also includes a dedicated QA, testing, reliability, and AI evaluation strategy covering:

- testing pyramid guidance for unit, integration, E2E, AI eval, and business-scenario layers
- core business-flow regression priorities
- matching, booking trust, payment, CRM, email, and integration validation strategy
- failure, retry, idempotency, and degraded-mode testing
- realistic test data guidance
- QA automation and nightly regression direction
- production monitoring and support-feedback loops into QA

Future QA, testing, AI eval, reliability, and regression work should inherit:

- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`

This is intended to protect BookedAI trust as a live system handling real bookings, payments, lifecycle automation, and integrations, rather than treating testing as a final polish step.

## Analytics And Revenue Intelligence Baseline

The synchronized documentation baseline now also includes a dedicated analytics, metrics, revenue tracking, and BI strategy covering:

- analytics architecture from raw events to processed facts to aggregates
- event taxonomy for growth, matching, booking trust, payment, CRM, email, and subscriptions
- attribution models linking SEO and conversion to revenue and LTV
- product, revenue, CRM, email, and integration metrics
- dashboard strategy for growth, product, ops, finance, and tenant stakeholders
- data pipeline direction
- data quality, idempotency, and consistency rules for trustworthy metrics

Future analytics, BI, attribution, and revenue-intelligence work should inherit:

- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`

This is intended to help BookedAI measure what actually drives growth, trust, bookings, and revenue, rather than reporting disconnected operational counts.

## Pricing And Monetization Baseline

The synchronized documentation baseline now also includes a dedicated pricing, packaging, and monetization strategy covering:

- value-based pricing principles for Australian SMEs
- hybrid pricing structure with subscription-led entry and controlled expansion levers
- plan ladder design for Starter, Growth, Pro, and Enterprise
- free-trial and low-friction entry strategy
- value metric selection tied to bookings, qualified leads, and operational complexity
- upsell and expansion paths
- pricing psychology and pricing-section guidance for the public site
- billing logic and monetization success metrics

Future pricing, packaging, monetization, and public pricing-page work should inherit:

- `docs/architecture/pricing-packaging-monetization-strategy.md`

This is intended to help BookedAI charge in a way that is easy for SMEs to buy, profitable to operate, and closely aligned with the real business value created by matching, booking trust, and lifecycle automation.

## Repository Structuring Baseline

The repo now also has an explicit structuring baseline for:

- current repo maturity
- current module boundaries
- reuse versus decomposition decisions
- target repo and module shape
- domain-aligned folder strategy
- integration boundary strategy
- worker and outbox direction
- app and surface separation strategy
- coding boundaries
- naming conventions

This baseline should be used before large refactors so the team does not accidentally:

- rewrite too much too early
- mix growth, matching, booking trust, payment, CRM, and email logic again
- keep public and admin coupled without a transition path
- block future tenant, widget, plugin, or headless modes

## Working Commitment Going Forward

From this point onward, all future BookedAI changes should follow this discipline:

- read existing documentation first
- summarize the new request
- identify every affected module
- upgrade the system in a synchronized way
- update the correct documentation before closing the task
- record substantial prompt-level descriptions into the corresponding documentation files and `project.md`

## Latest Foundation Scaffold Added

The repo now also includes a first additive scaffold for future implementation work, without replacing the current production flows.

This scaffold introduces:

- backend core foundations for config, logging, observability, feature flags, contracts, and error handling
- backend domain skeletons for growth, matching, booking trust, booking paths, payments, CRM, email, billing, deployment modes, AI routing, conversations, and integration hub
- backend repository seams for future tenant-aware persistence work
- backend provider adapter seams for Stripe, Zoho CRM, email, WhatsApp, AI/search, n8n, and external system integration
- worker and outbox skeletons for later async lifecycle work
- shared frontend contracts for API-first and channel-agnostic domain reuse

This scaffold should be treated as:

- additive
- migration-safe
- production-safe
- not yet a feature-complete implementation

Related reference:

- `docs/development/foundation-scaffold.md`

Additional development references for this scaffold:

- `docs/development/folder-conventions.md`
- `docs/development/env-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/backend-boundaries.md`
- `docs/development/rollout-feature-flags.md`
- `docs/development/deployment-modes-notes.md`

## Data Architecture Baseline Added

The documentation baseline now also includes an explicit data architecture and schema migration strategy for:

- current confirmed database usage
- current blob-heavy operational truth risks
- target tenant-aware data domains
- booking trust and availability truth modeling
- payment and billing lifecycle modeling
- CRM and email lifecycle persistence
- growth and SEO attribution to revenue
- integration sync, reconciliation, outbox, and idempotency
- migration ordering and rollback-aware schema evolution

Future persistence and migration work should review:

- `docs/architecture/data-architecture-migration-strategy.md`
- `docs/architecture/phase-1-5-data-implementation-package.md`

## API Architecture Baseline Added

The documentation baseline now also includes an explicit API architecture and contract strategy for:

- current confirmed API routes and interaction points
- current production-critical public, admin, upload, webhook, automation, and email surfaces
- target domain-aligned API grouping
- request and response DTO conventions
- booking trust and payment gating semantics
- tenant scoping and actor-role assumptions
- webhook verification and idempotency rules
- widget, plugin, headless, and mobile-ready API direction
- phased rollout and backward compatibility planning

Future API evolution work should review:

- `docs/architecture/api-architecture-contract-strategy.md`

## Phase 1.5 Persistence Package Added

The repo now also includes a first persistence implementation package for the next safe migration step.

This package adds:

- migration-ready SQL files for platform safety, tenant anchor, lead/contact/booking/payment mirrors, and CRM/email/integration/billing seed tables
- repository seams for tenant, audit, outbox, idempotency, webhook, lead, contact, booking intent, and payment intent persistence
- an implementation package document describing migration order, dual-write order, and rollback posture

This package is intended to support:

- default tenant rollout
- first normalized mirror tables
- first outbox and idempotency infrastructure
- first CRM/email/billing lifecycle persistence
- later booking trust and availability truth work
