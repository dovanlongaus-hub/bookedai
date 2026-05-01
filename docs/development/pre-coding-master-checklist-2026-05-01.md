# BookedAI Pre-Coding Master Checklist

Date: `2026-05-01`

Status: `active governance checklist`

## Purpose

This checklist is the final PM/CTO review gate before a new coding slice is opened.

It exists to make sure new requirement material has been merged into the current BookedAI management system before engineering starts.

It should be used with:

- `project.md`
- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/bookedai-master-roadmap-2026-04-26.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/phase-execution-operating-system-2026-04-26.md`
- `docs/development/implementation-progress.md`

## Core rule

Do not open coding just because a feature idea is clear.

Open coding only when the requirement baseline, execution baseline, roadmap baseline, and phase-management baseline all agree.

---

## A. Product baseline

- [ ] BookedAI is framed correctly as `AI Revenue Engine OS for service businesses`
- [ ] The change clearly supports acquire, convert, retain, or recover revenue
- [ ] The product loop impact is identified in this chain:
  `Search / Ask -> Intent Understanding -> Match / Rank -> Choose -> Final Confirmation -> Book / Request -> Pay / Payment Posture -> Portal -> CRM / Calendar / Messaging -> Care / Follow-up -> Retention -> Revenue Proof`
- [ ] The affected surfaces are named explicitly
- [ ] Surface priority is clear: `P0`, `P1`, or `P2`

## B. Requirement-document merge

- [ ] `project.md` updated if project-level scope or direction changed
- [ ] `docs/architecture/bookedai-master-prd.md` updated if product requirements changed
- [ ] Any vertical-specific requirement doc updated if the work changes Future Swim, Chess, or AI Mentor behavior
- [ ] Definition of done is still clear for this slice

## C. Execution and roadmap merge

- [ ] `docs/architecture/current-phase-sprint-execution-plan.md` updated if execution priority or gating changed
- [ ] `docs/architecture/bookedai-master-roadmap-2026-04-26.md` updated if phase ownership or sequence changed
- [ ] `docs/development/roadmap-sprint-document-register.md` updated if sprint-level interpretation changed
- [ ] `docs/development/phase-execution-operating-system-2026-04-26.md` updated if PM gates changed

## D. Architecture and data baseline

- [ ] Module ownership is clear
- [ ] Data entities affected are identified
- [ ] API contracts are identified or drafted
- [ ] Webhook implications are identified if any inbound/outbound provider path is touched
- [ ] Audit/event evidence expectations are identified
- [ ] Tenant isolation expectations are identified

## E. UX and truth-state gates

- [ ] Final-choice confirmation requirement is handled if the slice can cause an irreversible or tenant-visible action
- [ ] Truthful state wording is defined, no fake `confirmed`, `paid`, or `synced` posture
- [ ] Canonical statuses are identified
- [ ] Desktop and mobile states are considered
- [ ] Loading, empty, error, and success states are considered
- [ ] Recovery path for failure is defined

## F. Vertical-proof governance

- [ ] Check whether this should land first in `Future Swim`
- [ ] If not, explain why another surface or vertical should lead
- [ ] Reuse/shared-core implications for `Chess` and `AI Mentor` are noted

## G. Verification and promotion plan

- [ ] Automated verification approach identified
- [ ] UAT evidence required is identified
- [ ] Live deploy requirement is known
- [ ] Live smoke requirement is known
- [ ] Release-risk level is named

## H. Closeout path

- [ ] `docs/development/implementation-progress.md` has a planned write-back target
- [ ] `memory/YYYY-MM-DD.md` update is planned
- [ ] Notion/archive closeout requirement is decided
- [ ] Discord is skipped unless explicitly requested for this task
- [ ] Next owner lane is clear

---

## Approval note

A coding slice is considered ready only when this checklist is materially satisfied, not when a single spec or chat instruction looks complete in isolation.
