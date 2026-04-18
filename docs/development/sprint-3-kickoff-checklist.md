# BookedAI Sprint 3 Kickoff Checklist

Date: `2026-04-17`

Document status: `active sprint kickoff checklist`

## 1. Purpose

This document is the short-form operational checklist for opening Sprint 3 and running daily execution.

It is intentionally shorter than the implementation package and owner checklist.

Use it in:

- Sprint kickoff
- daily standup
- mid-sprint dependency review
- sprint closeout review

Primary source documents:

- `docs/architecture/sprint-3-implementation-package.md`
- `docs/development/sprint-3-owner-execution-checklist.md`
- `docs/development/sprint-2-code-ready-development-handoff.md`
- `docs/development/sprint-3-kickoff-closeout-note.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`
- `docs/architecture/coding-implementation-phases.md`

## 2. Sprint 3 mission

Build the premium public landing foundation from the locked Sprint 1 and Sprint 2 blueprint without reopening strategy or drifting from approved copy, pricing, and truth boundaries.

## 3. Kickoff gate

Do not start coding fan-out until all items below are true:

- Sprint 2 implemented closeout baseline is acknowledged from `docs/development/sprint-2-code-ready-development-handoff.md`
- `data.ts` is confirmed as the single content source
- `PublicApp.tsx` is confirmed as the page composition root
- primitive ownership is assigned
- section-lane ownership is assigned
- the minimum live-read smoke gate passes on a clean build:
  - `bash scripts/run_live_read_smoke.sh`
- Product, Frontend lead, Backend lead, and QA each confirm start readiness

Interpretation rule:

- Sprint 3 should inherit the real implemented Sprint 2 baseline, not the earlier blueprint-only wording from older Sprint 2 planning docs
- if Sprint 2 planning language conflicts with Sprint 2 implemented closeout, use the later code-ready handoff as the execution baseline

## 4. Lane assignment sheet

Fill this before implementation starts.

| Lane | Scope | Owner | Backup | Status |
|---|---|---|---|---|
| Lane 1 | foundation and page assembly | `____` | `____` | `Not started` |
| Lane 2 | header and hero | `____` | `____` | `Not started` |
| Lane 3 | core narrative sections | `____` | `____` | `Not started` |
| Lane 4 | trust, pricing, and close | `____` | `____` | `Not started` |
| Lane 5 | conversion compatibility and QA | `____` | `____` | `Not started` |

## 5. Day 1 kickoff checklist

### Product lead

- confirm copy in `data.ts` is frozen for implementation start
- confirm CTA hierarchy is frozen
- confirm pricing wording is frozen
- confirm trust and FAQ wording is frozen

### Frontend lead

- freeze primitive API and naming
- confirm file boundaries by lane
- confirm merge order for shared primitives before section fan-out
- confirm responsive breakpoint targets
- confirm the startup-grade design bar, logo treatment, and `80/20` visual-to-text rule are understood by all FE owners
- confirm route-level logo treatment rules for `landing`, `product`, `admin`, and `roadmap` before visual fan-out continues

### Backend lead

- confirm current assistant, demo, and pricing flows must remain stable
- confirm any current payload constraints the frontend must not break
- confirm Sprint 4 contract notes stay out of Sprint 3 scope unless blocking

### QA or release owner

- define acceptance breakpoints
- define core CTA paths to verify
- define screenshot or evidence expectations for each lane
- confirm the minimum reusable browser gate for Sprint 3 remains:
  - `bash scripts/run_live_read_smoke.sh`
- confirm this gate should be run with a clean build before treating it as release evidence
- define which runner backlog must be prepared during Sprint 3 for Sprint 4+:
  - contract runner seed
  - browser smoke runner carry-forward
  - locality-sensitive assistant query checks

### PM or sprint manager

- assign lane owner and backup owner
- confirm daily standup format
- confirm blocker escalation path
- confirm carryover log location

## 6. Daily standup script

Use these questions for each lane owner:

1. What moved yesterday?
2. What is the next mergeable outcome today?
3. Are you blocked by primitives, copy, backend compatibility, or QA feedback?
4. Did your lane introduce any copy, pricing, or truth-boundary exception?
5. Is any issue likely to spill into Sprint 4?

## 7. Daily PM tracking checklist

- primitive lane is still the source for reused section patterns
- no lane is bypassing `data.ts` for content edits
- no lane is changing another lane's files without alignment
- no new widget label or pricing phrase has been introduced without review
- no lane is drifting into text-heavy sections or mixed brand styles
- QA has started validating landed work instead of waiting for sprint end
- carryover items are logged explicitly, not kept as verbal notes
- test-runner carry-forward notes are being recorded instead of left as implied future work

## 8. Mid-sprint integration check

Run this check when at least two section lanes have landed:

- shared primitives still cover all implemented sections
- section order in `PublicApp.tsx` still matches the approved flow
- header, hero, and pricing CTAs still open the correct flows
- assistant, demo, and pricing modals still behave correctly
- logo treatment remains consistent across header, hero, and footer
- route-level logo contrast and lockup usage still hold across `landing`, `product`, `admin`, and `roadmap`
- mobile layout still holds after merged section changes
- no section has become text-heavy compared with the visual-first target
- `bash scripts/run_live_read_smoke.sh` still passes after integration changes that touch assistant, attribution, CTA shell, or public flow state

## 8A. Week 1 execution order

Use this order for the first working week of Sprint 3:

1. confirm Sprint 2 inherited baseline and lane ownership
2. run the clean-build smoke gate once before fan-out
3. freeze `PublicApp.tsx`, `data.ts`, and shared primitive contracts
4. begin section fan-out only after primitive ownership is stable
5. log any Sprint 3 visible trust regression straight into Sprint 4 or Sprint 6 carry-forward artifacts in the same pass

Week 1 mandatory outputs:

- one named owner per lane
- one agreed primitive contract set
- one confirmed clean-build smoke run
- one explicit carry-forward log location for Sprint 3 discoveries

## 9. Closeout gate

Sprint 3 should not close until all items below are true:

- required landing sections are present
- shared primitives are reused across the page
- hero, pricing, and closing CTA are implemented
- assistant, demo, and pricing entry paths still work
- desktop and mobile verification evidence exists
- route-level brand evidence exists for `landing`, `product`, `admin`, and `roadmap`
- the minimum live-read smoke gate passes on a clean build at sprint closeout
- Sprint 4+ test-runner backlog is written with named runner types and owner candidates
- carryover list is written and separated into:
  - polish-only
  - responsive cleanup
  - Sprint 4 contract follow-up
  - Sprint 4+ test-runner foundation work

## 10. Quick escalation rules

Escalate immediately if:

- a lane needs to change pricing wording
- a lane needs to rename widget vocabulary
- a lane needs to change page assembly order
- a lane breaks assistant, demo, or pricing conversion behavior
- a lane needs a new backend behavior that was not part of Sprint 3 start assumptions

Escalation reviewers:

- Product lead
- Frontend lead
- Solution architect
- Backend lead if flow compatibility is affected

## 11. Recommended usage

Use this document as the meeting sheet.

Use `docs/development/sprint-3-kickoff-closeout-note.md` as the fill-in note for the actual kickoff decision and smoke-gate record.

Use `docs/architecture/sprint-3-implementation-package.md` for implementation detail.

Use `docs/development/sprint-3-owner-execution-checklist.md` for owner accountability and closeout.
