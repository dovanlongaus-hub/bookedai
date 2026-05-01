# BookedAI Master Gap Analysis

Date: `2026-05-01`

Status: `active pre-coding gap analysis`

## Purpose

This document compares the current BookedAI management baseline against the `BookedAI CTO Master Spec v2` direction and the checked-in project/documentation baseline.

It exists to answer one question before coding starts:

`What is already aligned, what is partial, and what is still missing?`

It should be read with:

- `project.md`
- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/bookedai-master-roadmap-2026-04-26.md`
- `docs/development/pre-coding-master-checklist-2026-05-01.md`
- `docs/development/implementation-progress.md`

## Read rule

This is a management gap analysis, not a claim that the code is absent.

Status meanings:

- `aligned`: already reflected clearly in the current baseline
- `partial`: present in some code/docs but not yet coherent or fully governed
- `missing`: not yet sufficiently represented in the current managed baseline

---

## 1. Product definition and governance

| Area | Status | Notes |
|---|---|---|
| AI Revenue Engine OS positioning | `aligned` | now merged through project, PRD, roadmap, execution, and leadership docs |
| Management-before-coding governance | `aligned` | source-of-truth chain and PM gating now documented |
| Pre-coding PM/CTO checklist | `aligned` | explicit checklist created |
| Definition of done with truthful-state and audit requirements | `aligned` | now documented at baseline level |
| Full requirement-to-roadmap synchronization discipline | `partial` | core docs are aligned, but older edge docs may still use older framing |

## 2. Core product loop

| Loop segment | Status | Notes |
|---|---|---|
| Search / Ask | `partial` | strong live/search groundwork exists, but not all verticals have equal requirement depth |
| Intent understanding and rank/match | `partial` | partially implemented and documented; still uneven under degraded/fallback conditions |
| Choose and final confirmation | `partial` | final-choice rule is now documented strongly, but cross-surface implementation consistency remains an active gap |
| Book / Request | `partial` | booking flow exists across several surfaces, but not yet uniformly governed by the same managed contract |
| Pay / Payment posture | `partial` | Stripe and manual payment truth improved, but full continuity across all surfaces and tenants is still uneven |
| Portal truth | `partial` | portal baseline is strong, but the full CTO portal scope is broader than current documented closure |
| CRM / Calendar / Messaging | `partial` | Zoho and messaging layers are real, but parity and proof breadth remain incomplete |
| Care / Follow-up / Retention / Revenue proof | `partial` | revenue-ops and care are active, but retention and proof layers are not yet complete end-to-end |

## 3. Surface map

| Surface | Status | Notes |
|---|---|---|
| `bookedai.au` | `partial` | strong acquisition/search baseline, but still ongoing UX and contract hardening |
| `portal.bookedai.au` | `partial` | booking truth and action posture exist, but CTO spec expects a fuller customer truth hub |
| `tenant.bookedai.au` | `partial` | substantial workspace exists, but the SME command-center scope is broader |
| `admin.bookedai.au` | `partial` | real admin foundation exists, but full platform control-room scope is not yet closed |
| `futureswim.bookedai.au` | `partial` | designated strictest proof lane, but full operational vertical scope is not yet closed |
| `chess.bookedai.au` | `partial` | proof lane exists, but still below full Chess-specific target scope |
| `aimentor.bookedai.au` | `partial` | tenant runtime is live, but package/workspace/document-aware scope is still broader |
| `pitch.bookedai.au` | `partial` | story surface exists, but investor-flow details still depend on ongoing sync |
| `roadmap.bookedai.au` | `partial` | roadmap visualization exists, but should keep syncing to the new managed plan |
| `product.bookedai.au` | `partial` | important demo/product lane, but correctly deprioritized beneath truth-layer delivery |

## 4. Architecture and domain model

| Area | Status | Notes |
|---|---|---|
| Modular monolith direction | `aligned` | now consistently documented |
| Domain-module map | `partial` | high-level modules are now named, but not all module ownership docs are equally detailed |
| Core entity model | `partial` | project baseline captures the target entity model, but not every entity has implementation-grade ownership docs |
| API contract baseline | `partial` | several contracts exist, but full CTO API-set coverage is not yet managed as one complete contract set |
| Webhook safety baseline | `partial` | signature and idempotency progress is real, but parity and evidence UI are incomplete |
| Audit ledger and evidence model | `partial` | active foundation exists, but not yet uniformly surfaced across all operator paths |
| Scale-ready API family architecture | `missing` | now required more explicitly for partner installability and long-horizon tenant scale |
| Widget/install architecture | `missing` | partner-friendly install, config, and docs posture still needs a fuller managed requirement layer |
| Tenant-isolated AI ingestion architecture | `missing` | tenant-specific text/file ingestion into isolated service databases is now a stronger baseline requirement |
| Shared-portal with enterprise exception strategy | `partial` | shared portal is strong as default direction, but explicit dual-mode portal strategy needs further planning detail |

## 5. UX system and truthful-state rules

| Area | Status | Notes |
|---|---|---|

| Area | Status | Notes |
|---|---|---|
| Search-first UX | `aligned` | locked in planning baseline |
| Decision-ready cards | `partial` | present in direction and some flows, but not yet uniformly closed across all surfaces |
| Canonical status set | `partial` | now governed at requirement level, but still needs stronger cross-surface application |
| Final-choice confirmation | `partial` | now a baseline rule; implementation parity remains a major pre-coding focus |
| Mobile-first responsive truth | `partial` | strong recent progress, but not all surfaces/modules are equally proven |
| Failure recovery posture | `partial` | improved in several flows, but not yet complete platform-wide |

## 6. Revenue engine and automation

| Area | Status | Notes |
|---|---|---|
| Revenue opportunities | `partial` | concept and some operational layers exist, but not yet full product proof |
| Action queue and next-best-action | `partial` | foundations exist; deeper tenant/admin/customer usage still pending |
| Recoverable revenue detection | `missing` | described in the CTO baseline, not yet clearly closed in the managed system |
| Retention automation | `missing` | still more roadmap intent than governed implementation truth |
| Revenue proof dashboards | `partial` | planned and partially scaffolded, but not yet broadly delivered |

## 7. Vertical-proof requirements

| Vertical | Status | Notes |
|---|---|---|
| Future Swim full family/student ops scope | `missing` | now named as the strictest lane, but much of the iClassPro-style depth remains future work |
| Chess class/lesson/homework/game-analysis scope | `missing` | partial proof exists, full vertical product scope not yet closed |
| AI Mentor document/session/action-plan scope | `missing` | live tenant exists, but much of the mentoring product depth remains future work |

## 8. Revenue-first enterprise refinement overlay

The latest refinement adds a stronger interpretation layer:

- `Google-quality booking discovery` should drive search UX, suggestion behavior, ranking trust, compare-before-book flow, and location confidence
- `AI Revenue Engine execution` should drive feature priority: capture, convert, collect, support, recover, and prove revenue
- `full lifecycle customer journey` should drive requirement review across booking, payment, portal, support, follow-up, and rebook
- `enterprise UX and operator control` should drive tenant/admin clarity, evidence posture, retry safety, and status truth

This sharper interpretation raises the importance of several existing partial gaps, especially portal truth, canonical statuses, evidence visibility, and recoverable revenue.

## 9. Governance gaps that still matter before coding

1. older supporting docs may still carry older sequencing or weaker product framing
2. final-choice confirmation is well specified now, but should be mapped explicitly to every mutation-capable flow before coding expands
3. canonical status vocabulary should be enforced more deliberately across public, portal, tenant, admin, and channel messaging
4. Future Swim, Chess, and AI Mentor need explicit gap-to-backlog translation at the vertical feature level
5. recoverable revenue, retention, and revenue-proof layers remain more partial than the new executive baseline expects
6. Google-like search trust and enterprise UX discipline should be translated into more explicit surface-level acceptance criteria before major frontend implementation waves
7. scale-ready API families, partner widget installability, tenant-isolated AI ingestion, and shared-vs-dedicated portal strategy now need explicit architecture and backlog treatment before broader partner distribution work begins

---

## Executive summary

BookedAI now has a much stronger managed planning baseline than before.

The main gap is no longer `missing high-level direction`.

The main gap is now `turning the synchronized executive baseline into a controlled implementation backlog, especially for final-choice truth, portal/tenant/admin completeness, vertical-proof depth, retention, and revenue proof`.
