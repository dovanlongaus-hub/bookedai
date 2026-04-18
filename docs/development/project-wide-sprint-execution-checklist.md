# BookedAI Project-Wide Sprint Execution Checklist

Date: `2026-04-18`

Document status: `active default sprint checklist`

## 1. Purpose

This checklist is the default execution checklist for every later sprint in BookedAI.

It exists so sprint owners do not need to rediscover the same control rules each time a new sprint starts.

Use this checklist:

- before sprint kickoff
- during sprint planning
- during sprint closeout

This checklist applies unless a newer approved sprint-specific document explicitly overrides part of it.

## 2. Baseline-first rule

Before starting sprint work:

- read `project.md`
- read `docs/governance/change-governance.md`
- read the latest approved requirement, execution, and code-ready handoff documents for the target area
- confirm which document set is the current source-of-truth stack

Do not start by reinterpreting the area from scratch.

## 3. Scope control rule

Before tasks are assigned:

- identify the active implementation spine for the target surface
- identify the active composition root
- identify the active content source
- identify the active token ownership model
- identify any deferred or additive inventory that should stay out of mandatory scope

Do not silently promote deferred inventory into the sprint.

## 4. Runtime rule

Before implementation begins:

- confirm the live runtime target
- confirm whether any additive starter or migration surface is only supportive
- confirm that the sprint is upgrading the live implementation in place unless migration is explicitly approved

Do not assume a forward-compatible starter is the live runtime unless that promotion was explicitly approved.

## 5. Cleanup rule

For every active implementation lane:

- identify old-path drift in the touched area
- include cleanup in the same delivery plan

Typical cleanup items:

- duplicated shared primitives
- copy drift outside the approved content source
- token or style ownership drift
- stale assumptions about mandatory scope
- wrong runtime or build-config assumptions

## 6. Shared-surface rule

For every major active surface, preserve:

- one content source of truth
- one composition root
- one shared primitive layer
- one token ownership model

Do not create:

- competing page roots
- competing token systems
- parallel primitive layers
- shadow content sources inside JSX

When an earlier sprint has already shipped approved shared upgrades, also preserve:

- the active brand token vocabulary
- the active logo API and surface-switching rules
- the active `frontend/public/branding/` source-of-truth folder and its shared brand mappings
- the active motion layer
- the active KPI or proof-widget primitives
- the active responsive comparison and footer patterns
- the active production hotfix rules that protect trust or relevance on live conversion flows
- the active test-runner layer that already covers the touched risk surface

## 7. Visual-consistency rule

If a surface has already been approved as visual-first:

- keep that presentation model
- do not drift back into text-heavy layouts
- keep lower-page conversion surfaces aligned with the same visual system as the upper narrative surfaces

## 8. Sprint planning checklist

Before coding starts:

- confirm the exact source-of-truth document stack
- confirm sprint scope versus deferred inventory
- define lane ownership
- define file ownership boundaries
- confirm that touched app/web/mobile shells will continue to resolve logo, favicon, touch-icon, and responsive icon usage from `frontend/public/branding/` rather than route-local or remote sources
- define cleanup slices alongside implementation slices
- define build and QA gates
- define which runner type the sprint must introduce or expand:
  - contract
  - integration
  - browser smoke
  - AI/search quality
- define what is out of scope
- identify the latest implemented upgrade baseline that this sprint must inherit from prior sprints
- identify which patterns are allowed to extend that baseline versus which are locked and must not fork

## 9. In-sprint checklist

During implementation:

- keep changes inside approved file ownership boundaries
- route copy changes through the active content source
- route shared UI changes through the active primitive layer
- record any truth-boundary exceptions explicitly
- keep additive inventory out of mandatory execution unless explicitly approved
- validate conversion compatibility if public flows are touched
- preserve already-approved branding, logo, motion, and primitive inheritance unless the sprint explicitly carries an approved replacement
- preserve previously approved locality or trust gates for assistant and recommendation flows unless the sprint explicitly carries an approved replacement
- preserve previously approved query-grounded search rules, so the system does not auto-fill customer answers with unrelated stored data, mixed domains, or out-of-scope fallback rows
- land the sprint's promised runner additions early enough that feature work can use them before closeout
- when a later-sprint bug or logic gap is discovered, assign it into the correct later sprint artifact immediately instead of leaving it as a loose note

## 10. Closeout checklist

Before the sprint is considered complete:

- verify the live runtime still builds
- verify the sprint did not split content, composition, token, or primitive ownership
- verify deferred inventory was not silently promoted
- verify cleanup items touched by the sprint were handled
- update requirement-facing docs
- update implementation-tracking docs
- update roadmap, sprint, or phase docs
- update the next sprint handoff and owner checklist when this sprint creates a new inherited baseline
- record any production-discovered trust regression and the guardrail that now prevents it
- record which runner suites were added, expanded, or still missing for the next sprint
- record any query-grounded search failure where the system answered with content that did not match the user's keywords, domain intent, or location intent
- record any discovered later-sprint bug or logic gap in two places:
  - the current sprint artifact as a carry-forward item
  - the correct next sprint, phase, or task artifact as owned future work
- make the carry-forward entry specific enough to execute without rediscovery

If the work was promoted live:

- update implementation progress immediately
- update the related sprint or roadmap artifact in the same pass
- run at least one locality-sensitive or trust-sensitive smoke test for each public recommendation or assistant flow touched by the sprint
- run at least one wrong-domain suppression smoke test for each public search or assistant flow touched by the sprint
- run at least one stale-context suppression smoke test when the flow can hold a visible shortlist between queries

## 11. Copy-forward rule

When creating a new sprint-specific checklist:

- start from this file
- add only sprint-specific scope, owners, and acceptance conditions
- do not rewrite the project-wide rules unless they were formally changed

When creating the next sprint handoff or checklist after a meaningful implementation sprint:

- copy forward the latest completed implementation baseline
- name the exact files, primitives, and behavioral patterns the next sprint must inherit
- make any locked carry-forward rules explicit rather than relying on memory
- copy forward any unresolved but already identified logic defects with exact failing scenarios, not generic placeholders

## 12. Related references

- [Project Master Index](../../project.md)
- [Change Governance](../governance/change-governance.md)
- [Coding Implementation Phases](../architecture/coding-implementation-phases.md)
