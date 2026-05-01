# BL-14A Sub-Slice Breakdown

Date: `2026-05-01`

Status: `active implementation breakdown`

## Purpose

This document breaks `BL-14A` into execution-ready sub-slices.

It exists so Phase 21 monetization work can move from one high-level commercial requirement into concrete implementation sequencing.

Primary parent spec:

- `docs/development/bl-14a-monetization-and-commission-operating-spec-2026-05-01.md`

## Execution rule

Sub-slices should be implemented in order from foundational truth to operator visibility.

Do not start with dashboard polish before the underlying commercial model, state model, and event model are stable.

## BL-14A-1. Tenant commercial profile contract

### Goal
Define the tenant-level commercial truth object that all later monetization flows depend on.

### Scope
- tenant commercial profile fields
- plan/package assignment model
- partner-type and exception fields
- billing/finance contact fields
- read/write contract ownership

### Key outputs
- data contract
- API contract
- validation rules
- tenant/admin visibility baseline

### Dependency role
This is the root dependency for all later BL-14A slices.

## BL-14A-2. Setup fee and subscription state machine

### Goal
Make setup-fee and subscription posture explicit, truthful, and operable.

### Scope
- setup fee states and transitions
- subscription states and transitions
- due/paid/overdue/grace/pause/cancel/manual-review handling
- timestamps and references required for operator truth

### Key outputs
- state registry
- transition rules
- operator actions
- edge-case handling rules

### Dependency role
Depends on `BL-14A-1`.

## BL-14A-3. Commission policy and commission event pipeline

### Goal
Make booking-linked commission logic explicit and traceable.

### Scope
- commission policy object
- commission event creation rules
- policy snapshotting or policy binding model
- pending/recognized/disputed/waived/manual-review posture
- linkage from booking or attributable event into commission truth

### Key outputs
- commission policy contract
- commission event contract
- calculation rules
- review/dispute posture

### Dependency role
Depends on `BL-14A-1` and should align with `BL-14A-2` commercial status posture.

## BL-14A-4. Revenue summary and operator action queue

### Goal
Turn the commercial truth model into usable operator control.

### Scope
- BookedAI revenue summary minimums
- setup/subscription/commission action-needed queue
- owner, due date, amount, cause, next action posture
- tenant/admin panel read model for commercial operations

### Key outputs
- dashboard/read-model contract
- action queue contract
- operator visibility rules
- priority queue categories

### Dependency role
Depends on `BL-14A-1`, `BL-14A-2`, and `BL-14A-3`.

## BL-14A-5. Audit, wording, and acceptance gate

### Goal
Close the monetization slice with truthful language, auditability, and implementation-ready completion criteria.

### Scope
- truthful wording for commercial states
- audit trail requirements for manual changes
- minimum regression and contract verification list
- definition-of-done for BL-14A rollout

### Key outputs
- wording map
- audit event list
- QA acceptance checklist
- release-gate expectations

### Dependency role
Depends on all earlier BL-14A sub-slices.

## Recommended implementation order

1. `BL-14A-1 Tenant commercial profile contract`
2. `BL-14A-2 Setup fee and subscription state machine`
3. `BL-14A-3 Commission policy and commission event pipeline`
4. `BL-14A-4 Revenue summary and operator action queue`
5. `BL-14A-5 Audit, wording, and acceptance gate`

## Phase alignment

### Phase 21 early slices
The first practical Phase 21 order should be:

1. BL-14A-1
2. BL-14A-2
3. BL-14A-3
4. BL-14A-4
5. BL-14A-5

### Cross-phase dependencies
- `BL-1` and `BL-2` should help keep commercial states and confirmation language truthful
- `BL-4` should align evidence and operator queue patterns with BL-14A visibility needs
- `BL-14` tenant revenue proof dashboard should inherit BL-14A truth instead of inventing separate financial semantics
- `BL-15` and later scale/installability work should inherit the commercial contracts created here

## Short management rule

Implement the money layer in this order:

- define tenant commercial truth
- define setup/subscription truth
- define commission truth
- expose operator revenue truth
- then harden wording, audit, and acceptance gates
