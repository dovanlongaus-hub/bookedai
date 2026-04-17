# BookedAI Notion Import-Ready Execution Backlog

Date: `2026-04-17`

Document status: `active import-ready backlog`

## Purpose

This document is the Notion-friendly import layer for the current BookedAI execution system.

It is built from the current standardized planning model:

- phase plan
- Epic -> Story -> Task breakdown
- sprint owner checklists
- roadmap and sprint alignment

It is intended for:

- Notion database import
- manual page creation in Notion
- tracker seeding before deeper task expansion

## Recommended databases in Notion

Create three linked databases:

1. `Program Phases`
2. `Delivery Epics`
3. `Sprint Execution`

Optional fourth database:

4. `Stories and Tasks`

## Recommended properties

### Program Phases

- `Title`
- `Status`
- `Phase Range`
- `Primary Outcome`
- `Core Docs`
- `Sprint Range`

### Delivery Epics

- `Title`
- `Phase`
- `Owner`
- `Status`
- `Priority`
- `Dependencies`
- `Source Doc`

### Sprint Execution

- `Title`
- `Sprint`
- `Phase`
- `Focus`
- `Owner Checklist Doc`
- `Status`
- `Dependencies`

### Stories and Tasks

- `Title`
- `Type`
- `Epic`
- `Sprint`
- `Owner`
- `Status`
- `Acceptance Criteria`
- `Source Doc`

## Import table - phase level

| Title | Status | Phase Range | Primary Outcome | Core Docs | Sprint Range |
|---|---|---|---|---|---|
| Program Reset and Alignment | Ready | Phase 0 | One aligned product, pricing, architecture, and roadmap baseline | `phase-0-detailed-implementation-plan.md` | Sprint 1 |
| Public Revenue-Engine Experience | Ready | Phase 1-2 | Premium public narrative, brand system, landing implementation, and growth instrumentation | `phase-1-2-detailed-implementation-package.md` | Sprint 2-3 |
| Commercial Platform Foundation | Ready | Phase 3-6 | Attribution, reporting, payments, recovery, and commercial operations foundation | `phase-3-6-detailed-implementation-package.md` | Sprint 4-10 |
| Operator-Facing Revenue Workspaces | Ready | Phase 7-8 | Tenant revenue workspace and internal admin commercial support platform | `phase-7-8-detailed-implementation-package.md` | Sprint 11-14 |
| QA and Release Hardening | Ready | Phase 9 | Regression protection, telemetry, release gates, rollback discipline, and scale readiness | `phase-9-detailed-implementation-package.md` | Sprint 15-16 |

## Import table - epic level

| Title | Phase | Owner | Status | Priority | Dependencies | Source Doc |
|---|---|---|---|---|---|---|
| Product Narrative Reset | Phase 0 | Product + Architecture | Ready | P0 | PRD baseline | `phase-0-epic-story-task-breakdown.md` |
| Commercial Model and Pricing Reset | Phase 0 | Product + Architecture | Ready | P0 | Product narrative reset | `phase-0-epic-story-task-breakdown.md` |
| Solution Architecture Reset | Phase 0 | Architecture | Ready | P0 | Product narrative reset | `phase-0-epic-story-task-breakdown.md` |
| Phase and Sprint Reset | Phase 0 | Product + Architecture | Ready | P0 | Solution architecture reset | `phase-0-epic-story-task-breakdown.md` |
| Public Experience Specification | Phase 0 | Product + Frontend | Ready | P1 | Narrative and pricing reset | `phase-0-epic-story-task-breakdown.md` |
| Governance and Execution Control | Phase 0 | Product + Architecture + QA | Ready | P1 | Phase reset | `phase-0-epic-story-task-breakdown.md` |
| Public Narrative and Messaging System | Phase 1-2 | Product | Ready | P0 | Phase 0 complete | `phase-1-2-epic-story-task-breakdown.md` |
| Design System and Premium UI Language | Phase 1-2 | Frontend | Ready | P0 | Narrative locked | `phase-1-2-epic-story-task-breakdown.md` |
| Landing Component Architecture | Phase 1-2 | Frontend | Ready | P0 | Design system | `phase-1-2-epic-story-task-breakdown.md` |
| Hero and Premium Experience Implementation | Phase 1-2 | Frontend | Ready | P0 | Component architecture | `phase-1-2-epic-story-task-breakdown.md` |
| Core Landing Sections Implementation | Phase 1-2 | Frontend + Product | Ready | P0 | Narrative and architecture | `phase-1-2-epic-story-task-breakdown.md` |
| Growth Instrumentation and Metadata Alignment | Phase 1-2 | Frontend + Backend | Ready | P1 | Public implementation baseline | `phase-1-2-epic-story-task-breakdown.md` |
| Commercial Contracts and Data Models | Phase 3-6 | Backend + Data | Ready | P0 | Phase 1-2 outputs | `phase-3-6-epic-story-task-breakdown.md` |
| Multi-Channel Attribution and Funnel Stitching | Phase 3-6 | Backend + Product Ops | Ready | P0 | Commercial contracts | `phase-3-6-epic-story-task-breakdown.md` |
| Payment and Revenue Lifecycle | Phase 3-6 | Backend + Integrations | Ready | P0 | Commercial contracts | `phase-3-6-epic-story-task-breakdown.md` |
| Recovery Workflow System | Phase 3-6 | Backend + Product | Ready | P1 | Lifecycle and attribution baseline | `phase-3-6-epic-story-task-breakdown.md` |
| Tenant Revenue Workspace | Phase 3-6 | Frontend + Backend | Ready | P1 | Reporting readiness | `phase-3-6-epic-story-task-breakdown.md` |
| Admin Commercial Operations | Phase 3-6 | Frontend + Backend | Ready | P1 | Reporting and recovery readiness | `phase-3-6-epic-story-task-breakdown.md` |
| Optimization and Hardening | Phase 3-6 | QA + DevOps + Backend | Ready | P1 | Working commercial flows | `phase-3-6-epic-story-task-breakdown.md` |
| Tenant Workspace Foundation | Phase 7-8 | Frontend + Product | Ready | P0 | Shared contracts and tenant strategy | `phase-7-8-epic-story-task-breakdown.md` |
| Tenant Commercial Dashboard | Phase 7-8 | Frontend + Backend | Ready | P0 | Workspace foundation | `phase-7-8-epic-story-task-breakdown.md` |
| Tenant Lifecycle and Integrations Visibility | Phase 7-8 | Frontend + Backend | Ready | P1 | Tenant dashboard | `phase-7-8-epic-story-task-breakdown.md` |
| Internal Admin Commercial IA | Phase 7-8 | Frontend + Product Ops | Ready | P0 | Internal admin strategy | `phase-7-8-epic-story-task-breakdown.md` |
| Internal Admin Tooling | Phase 7-8 | Frontend + Backend | Ready | P0 | Admin IA | `phase-7-8-epic-story-task-breakdown.md` |
| Rollout and Usability Hardening | Phase 7-8 | QA + Architecture | Ready | P1 | Tenant and admin surfaces | `phase-7-8-epic-story-task-breakdown.md` |
| Reporting and Widget Regression Coverage | Phase 9 | QA + Frontend + Backend | Ready | P0 | Tenant and admin surfaces live | `phase-9-epic-story-task-breakdown.md` |
| Workflow and Lifecycle Regression Coverage | Phase 9 | QA + Backend | Ready | P0 | Payment and recovery flows live | `phase-9-epic-story-task-breakdown.md` |
| Telemetry and Replay Readiness | Phase 9 | Backend + QA | Ready | P1 | Commercial platform coverage | `phase-9-epic-story-task-breakdown.md` |
| Release-Gate Discipline | Phase 9 | QA + DevOps + Product Ops | Ready | P0 | Regression scope and telemetry | `phase-9-epic-story-task-breakdown.md` |
| Worker and Integration Hardening | Phase 9 | Backend + DevOps | Ready | P1 | Release discipline | `phase-9-epic-story-task-breakdown.md` |

## Import table - sprint level

| Title | Sprint | Phase | Focus | Owner Checklist Doc | Status | Dependencies |
|---|---|---|---|---|---|---|
| Sprint 1 Execution | Sprint 1 | Phase 0 | PRD reset, architecture reset, pricing reset, execution formula lock | `sprint-1-owner-execution-checklist.md` | Ready | Phase 0 docs |
| Sprint 2 Execution | Sprint 2 | Phase 1-2 | Brand system, landing architecture, design tokens | `sprint-2-owner-execution-checklist.md` | Ready | Phase 0 complete |
| Sprint 3 Execution | Sprint 3 | Phase 1-2 | Public landing implementation, premium hero, pricing rollout | `sprint-3-owner-execution-checklist.md` | Ready | Sprint 2 complete |
| Sprint 4 Execution | Sprint 4 | Phase 3-6 | Commercial contracts and data foundations | `sprint-4-owner-execution-checklist.md` | Ready | Phase 1-2 outputs |
| Sprint 5 Execution | Sprint 5 | Phase 3-6 | Reporting read models and widget APIs | `sprint-5-owner-execution-checklist.md` | Ready | Sprint 4 contracts |
| Sprint 6 Execution | Sprint 6 | Phase 3-6 | Attribution and conversion metrics | `sprint-6-owner-execution-checklist.md` | Ready | Sprint 4-5 baseline |
| Sprint 7 Execution | Sprint 7 | Phase 3-6 | Recovery workflows and lifecycle execution | `sprint-7-owner-execution-checklist.md` | Ready | Attribution and lifecycle baseline |
| Sprint 8 Execution | Sprint 8 | Phase 3-6 | Tenant revenue baseline | `sprint-8-owner-execution-checklist.md` | Ready | Reporting baseline |
| Sprint 9 Execution | Sprint 9 | Phase 3-6 | Admin commercial operations baseline | `sprint-9-owner-execution-checklist.md` | Ready | Reporting and recovery baseline |
| Sprint 10 Execution | Sprint 10 | Phase 3-6 | Optimization and hardening baseline | `sprint-10-owner-execution-checklist.md` | Ready | Commercial flows baseline |
| Sprint 11 Execution | Sprint 11 | Phase 7-8 | Tenant workspace IA and API preparation | `sprint-11-owner-execution-checklist.md` | Ready | Phase 3-6 outputs |
| Sprint 12 Execution | Sprint 12 | Phase 7-8 | Tenant workspace implementation | `sprint-12-owner-execution-checklist.md` | Ready | Sprint 11 complete |
| Sprint 13 Execution | Sprint 13 | Phase 7-8 | Internal admin commercial IA and drill-ins | `sprint-13-owner-execution-checklist.md` | Ready | Tenant/admin contract alignment |
| Sprint 14 Execution | Sprint 14 | Phase 7-8 | Admin support tooling and rollout readiness | `sprint-14-owner-execution-checklist.md` | Ready | Sprint 13 baseline |
| Sprint 15 Execution | Sprint 15 | Phase 9 | Telemetry, replay, and regression coverage | `sprint-15-owner-execution-checklist.md` | Ready | Phase 7-8 complete |
| Sprint 16 Execution | Sprint 16 | Phase 9 | Release gates, rollback discipline, scale readiness | `sprint-16-owner-execution-checklist.md` | Ready | Sprint 15 coverage |

## Recommended Notion setup order

1. Create the `Program Phases` database.
2. Create the `Delivery Epics` database and add a relation to `Program Phases`.
3. Create the `Sprint Execution` database and add a relation to `Program Phases`.
4. Create the optional `Stories and Tasks` database with relations to both `Delivery Epics` and `Sprint Execution`.
5. Import the three tables above.
6. Link each imported row back to its source document inside the repo.

## Live Notion workspace structure

The current Notion workspace structure has now been created and seeded.

- Hub page: `https://www.notion.so/345b21fdf8c78164af16d35bcc96fb95`
- Program Phases database: `https://www.notion.so/0c094fd9935b47209431af146cd1a923`
- Delivery Epics database: `https://www.notion.so/4d27fdc795364deda4d4add7684195a6`
- Sprint Execution database: `https://www.notion.so/6b2d4af8b0254eb6b9c1db1206c9191d`
- Stories and Tasks database: `https://www.notion.so/384bb898b6f2462ba73bbd88e105332e`

Seed status alignment used during creation:

- completed historical phases and sprints were mapped to `Done`
- the active execution lane around Sprint 14 and Phase 7-8 was mapped to `In progress`
- future Phase 9 work and later sprints were mapped to `Not started`

Created starter views:

- `Sprint Overview`
- `Epic Overview`
- `Task Board`

Created export-friendly detail pages:

- Phase detail index: `https://www.notion.so/345b21fdf8c78168954bd76ff714c7b2`
- Sprint detail index: `https://www.notion.so/345b21fdf8c78144be78cf712aa9bad5`
- Dedicated standalone pages now exist for `Phase 1` through `Phase 9`
- Dedicated standalone pages now exist for `Sprint 1` through `Sprint 14`

Backlog execution seeding now in place:

- the `Stories and Tasks` data source now includes self-linked parent and child item relations so story-to-task structure is no longer flat
- `Story` rows are seeded for active `Phase 7-8` and planned `Phase 9` execution lanes with sprint, epic, owner, status, source-doc, and embedded task checklist content
- concrete `Task` rows are now seeded for active `Sprint 14` work, linked back to their parent stories for admin support tooling, reconciliation, and rollout-readiness execution
- each sprint detail page from `Sprint 1` through `Sprint 14` now contains direct cross-links to the matching phase detail page and the live `Sprint Execution` row in the database
