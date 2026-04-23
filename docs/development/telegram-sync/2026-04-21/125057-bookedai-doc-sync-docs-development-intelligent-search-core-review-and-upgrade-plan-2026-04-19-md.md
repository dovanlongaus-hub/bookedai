# BookedAI doc sync - docs/development/intelligent-search-core-review-and-upgrade-plan-2026-04-19.md

- Timestamp: 2026-04-21T12:50:57.424162+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/intelligent-search-core-review-and-upgrade-plan-2026-04-19.md` from the BookedAI repository into the Notion workspace. Preview: # Intelligent Search Core Review And Upgrade Plan Date: `2026-04-19` Document status: `active review and upgrade plan` ## Purpose

## Details

Source path: docs/development/intelligent-search-core-review-and-upgrade-plan-2026-04-19.md
Synchronized at: 2026-04-21T12:50:57.270863+00:00

Repository document content:

# Intelligent Search Core Review And Upgrade Plan

Date: `2026-04-19`

Document status: `active review and upgrade plan`

## Purpose

This document reviews the current BookedAI intelligent search requirement against:

- current production-shaped code
- current Sprint 6 search-quality execution work
- the active code-aligned planning baseline in `docs/architecture/current-phase-sprint-execution-plan.md`

It then turns that review into a more detailed upgrade plan for the core search engine so BookedAI can:

1. understand what the user truly wants
2. show only results that actually match that intent
3. prefer tenant truth only when the tenant content genuinely matches
4. use internet fallback only when tenant truth is insufficient
5. provide enough booking-critical detail for the user to make a real booking decision

## Inputs reviewed in this pass

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/project-plan-code-audit-2026-04-19.md`
- `docs/development/intelligent-search-booking-engine-rd-spec.md`
- `docs/development/openai-official-search-engine-requirements-plan.md`
- `docs/development/sprint-6-search-quality-execution-package.md`
- `docs/development/implementation-progress.md`
- `backend/api/v1_routes.py`
- `backend/services.py`
- `backend/service_layer/prompt9_matching_service.py`
- `frontend/src/apps/public/HomepageSearchExperience.tsx`
- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`
- `frontend/tests/public-booking-assistant-live-read.spec.ts`

## Executive review

The intelligent search lane is no longer a prototype.

BookedAI already has:

- a real `tenant-first, public-web-second` backend search path
- strict search gating that can suppress wrong-domain results
- OpenAI `Responses API + web_search` as the official internet fallback
- replay packs, release thresholds, and production-shaped search gate tooling
- public homepage runtime logic that is moving toward recommendation-led shortlist truth
- tenant-positive validation for real catalog-backed search scenarios

The current problem is not lack of infrastructure.

The current problem is that the core search engine still needs to become more consistently `query-authoritative` at every layer:

- query understanding
- tenant retrieval
- tenant ranking
- public web fallback
- homepage display ordering
- booking-detail shaping

In short:

- BookedAI is already good at `not showing obviously wrong results`
- BookedAI is improving at `showing sourced fallback instead of silence`
- BookedAI still needs to get better at `showing the exact right result with enough decision-ready detail`

## Requirement review

### Requirement A - Search must match what the user actually means

This requirement is now partially implemented.

Strong current behavior:

- query normalization exists
- semantic assist exists
- strict gates can reject wrong-domain candidates
- homepage now uses intent-aware filtering and recommendation-led ordering

Still incomplete:

- some broad same-category candidates can still enter the candidate pool before later filtering removes them
- some verticals still depend too much on category alignment instead of stronger service-term alignment
- hospitality and support-worker style queries still show variability across repeated production runs

### Requirement B - Location must be treated as a first-class condition

This requirement is partially implemented and mostly correct in the current architecture.

Strong current behavior:

- explicit location is used in matching
- suburb-to-metro normalization exists
- `near me` can fail-safe when location is unavailable
- homepage suppresses shortlist rendering when denied-location queries cannot be ranked safely

Still incomplete:

- the engine still needs stronger location granularity for suburb, precinct, and radius-sensitive use cases
- explicit location should remain a hard gate more consistently across both tenant and web fallback paths

### Requirement C - Tenant data should win only when it truly matches

This requirement is now much better aligned than before.

Strong current behavior:

- tenant truth is primary only after relevance survives the gates
- tenant-positive replay cases now exist
- a curated published chess pilot row now proves the tenant-first rule in a real production-shaped case

Still incomplete:

- tenant presence alone must never imply display eligibility
- tenant rows need stronger booking-path completeness and richer content completeness to become high-confidence booking candidates
- some verticals still lack tenant supply entirely, so the engine must clearly distinguish `tenant miss` from `tenant mismatch`

### Requirement D - Internet fallback should be precise, not broad

This requirement is meaningfully implemented, but still needs reliability work.

Strong current behavior:

- OpenAI `web_search` is live as the official fallback
- fallback receives booking context, preferences, and other constraints
- result count is already capped to top 3
- weak or wrong-domain web candidates can be gated out

Still incomplete:

- hospitality retrieval is improved but not fully stable
- some healthcare/support-worker queries still intermittently fail to surface good public-web results
- internet fallback still needs more vertical-specific query shaping

### Requirement E - Search results must contain enough booking detail

This is the largest remaining gap.

Current state:

- result cards already surface location, duration, booking path, and why-it-matches style detail
- booking handoff and trust path exist for tenant-backed results
- public web fallback is visually and behaviorally closer to sourced discovery

Still incomplete:

- many results do not yet provide enough information for fast booking decisions across all verticals
- booking-critical detail should become more explicit and structured:
  - price posture
  - duration or service time
  - location certainty
  - booking path type
  - availability confidence
  - source or verification state
  - why this result matches the user’s actual request

## Current state summary by layer

### 1. Query understanding

Current state:

- lexical and semantic normalization exist
- multilingual and conversational phrasing is partially normalized
- some query-intent extraction also exists in the homepage runtime

Gap:

- query understanding is still split across backend and frontend layers
- service-term extraction should become one canonical engine-owned contract

### 2. Tenant retrieval and ranking

Current state:

- ranking and gating exist
- category and topic mismatch suppression exist
- publish-state and catalog-quality rules already affect eligibility

Gap:

- retrieval still needs stronger phrase-level service constraints for some verticals
- ranking should consistently use `intent > location > booking-readiness > featured`

### 3. Internet fallback

Current state:

- official OpenAI fallback exists
- fallback is already constrained and top-3 capped

Gap:

- vertical-specific retrieval rewrite is still needed
- fallback stability is not yet uniform enough across all major booking categories

### 4. Homepage display and shortlist

Current state:

- homepage is now closer to live-read truth
- stale shortlist suppression exists
- `near me` suppression exists
- recommendation-led ordering exists
- intent-first visible ranking has started

Gap:

- homepage display rules still need to become a direct mirror of the backend truth contract instead of maintaining parallel logic

### 5. Booking handoff

Current state:

- tenant-backed booking path resolution exists
- public web fallback stays advisory

Gap:

- booking-ready result detail still needs to be richer and more standardized
- selection should communicate:
  - whether BookedAI verified availability
  - whether the user is booking directly or leaving BookedAI
  - which details are confirmed vs inferred

## Alignment to the current execution baseline

This search lane is aligned with the current code-aligned plan in `docs/architecture/current-phase-sprint-execution-plan.md`.

Why:

- search quality is already recognized there as one of the strongest active implementation lanes
- replay, release gate, and production discipline are already part of the active program
- the next search work should be treated as product-hardening, not greenfield invention

This search lane also supports the broader user-surface upgrade plan because:

- the public search runtime is now the primary public surface
- search quality directly determines whether the public app feels SaaS-grade
- booking confidence and result clarity shape the customer’s conversion path

## Core upgrade decision

The next upgrade wave should treat `core intelligent search` as a three-part engine:

1. `Query Understanding Engine`
2. `Match Truth Engine`
3. `Booking Decision Engine`

These three parts should remain tightly connected but conceptually separate.

## Detailed upgrade plan

### Phase S6-A - Canonical query understanding contract

Goal:

- move all key query interpretation into one shared backend contract

Deliver:

- one canonical normalized request structure for:
  - service intent
  - exact service terms
  - location
  - near-me state
  - time intent
  - party size
  - budget
  - extra constraints
  - booking-readiness signals

Definition of done:

- homepage no longer needs ad hoc term logic to compensate for missing backend understanding
- backend and frontend use the same search meaning

Implementation update on `2026-04-19`:

- the first code slice of this phase is now in progress and wired into the live search contract
- `backend/service_layer/prompt9_matching_service.py` now builds a canonical query-understanding payload that combines:
  - normalized query
  - inferred location
  - core intent terms
  - expanded intent terms
  - booking and timing constraints
  - budget cap
  - category preference
  - near-me and chat-style flags
- `/api/v1/matching/search` now returns that payload as `query_understanding`
- the public homepage assistant has been updated to consume backend intent terms before falling back to UI-only term heuristics

### Phase S6-B - Intent-first tenant retrieval

Goal:

- only retrieve tenant rows that are genuinely plausible for the requested service

Deliver:

- stronger phrase and topic retrieval guards
- better synonym groups by vertical
- harder rejection for same-category but wrong-content rows

Definition of done:

- `tenant exists` is never enough
- `tenant content matches` becomes the actual eligibility test

### Phase S6-C - Deterministic ranking policy

Goal:

- keep ranking stable and explainable

Required order:

1. intent match
2. location fit
3. constraint fit
4. booking-path quality
5. trust/completeness
6. featured or promotional tie-break only after the above

Definition of done:

- same-category noise can no longer outrank direct-intent matches

Implementation update on `2026-04-19`:

- the first backend slice of this phase is now active
- catalog matches now pass through a deterministic ranking policy after relevance and display gates
- the current ranking order is explicitly anchored to:
  - intent fit
  - location fit
  - constraint fit
  - booking-path quality
  - result completeness
  - only then score and featured tie-breaks
- `/api/v1/matching/search` now emits up to 3 catalog recommendations in the final backend order, so homepage runtime can follow backend truth more directly

### Phase S6-D - Internet fallback precision upgrade

Goal:

- make public web fallback feel like a professional booking search, not a weak backup

Deliver:

- vertical-specific rewrite strategy for:
  - hospitality
  - healthcare
  - support worker / care services
  - kids activities and tutoring
- stronger official-source and booking-path acceptance rules

Definition of done:

- fallback is both safer and more reliable, without broadening wrongly

### Phase S6-E - Booking decision detail contract

Goal:

- every shown result should contain enough detail for a user to decide what to click

Required result detail:

- service name
- provider name
- exact or inferred location
- time or duration detail when available
- price or price posture
- booking-path type
- tenant-vs-public-web source state
- why this matches
- trust or availability status when known

Definition of done:

- the user can compare results quickly without guessing what is verified

Implementation update on `2026-04-19`:

- the first slice of this phase is now active across backend payloads and shared UI presenters
- search candidates now begin carrying:
  - `why_this_matches`
  - `source_label`
  - `price_posture`
  - `booking_path_type`
  - `next_step`
  - `availability_state`
  - `booking_confidence`
- the shared partner-match presenter now surfaces source state, booking status, and clearer match rationale directly on result cards

### Phase S6-F - Homepage truth convergence

Goal:

- make homepage runtime a faithful presenter of backend search truth

Deliver:

- homepage display contract should consume:
  - ordered recommendations
  - warnings
  - booking-context hints
  - source state
- reduce parallel UI-only ranking logic over time

Definition of done:

- production UI and production API tell the same story

Implementation update on `2026-04-19`:

- homepage truth convergence is now joined by popup truth convergence on the `BookingAssistantDialog` product-route surface
- targeted browser regressions now lock:
  - `tenant-first` popup ordering
  - `public-web` popup fallback rendering
  - `near me` popup fail-safe warning behavior
  - `wrong-domain suppression` popup behavior
- this means the main customer-facing search surfaces now share one stricter truth policy instead of leaving the popup runtime behind the homepage runtime

### Phase S6-G - Replay and release hardening

Goal:

- make search quality promotable based on measurable truth, not confidence alone

Deliver:

- expand replay pack by vertical
- add more tenant-positive and tenant-negative cases
- add result-detail quality review cases
- add location-sensitive cases

Definition of done:

- release gate covers:
  - tenant-first correctness
  - public-web fallback correctness
  - wrong-domain suppression
  - booking-detail sufficiency

## Priority build order

Recommended order:

1. canonical query understanding contract
2. intent-first tenant retrieval hardening
3. deterministic ranking policy
4. booking decision detail contract
5. internet fallback precision upgrade by vertical
6. homepage truth convergence
7. replay and release-threshold expansion

## Specific decisions the team can now make

### Decision 1 - What should be treated as a blocker?

Recommended blocker:

- any result shown to the user that is not clearly aligned with the requested service intent

### Decision 2 - What should be allowed to fail-safe?

Recommended fail-safe:

- missing location permission
- weak tenant supply
- weak public web fallback

These should return a safe no-result state rather than a misleading shortlist.

### Decision 3 - What should be considered booking-ready?

Recommended standard:

- a result is booking-ready only if the card contains enough detail for the user to compare and act confidently

### Decision 4 - What is the real success metric?

Recommended success metric:

- not just `result shown`
- but `correct result shown with enough detail to decide booking`

## Recommended next implementation slice

The next strongest implementation slice is:

- move more of the current homepage intent logic into the backend normalized search contract
- expand booking-detail shaping in the candidate presenter
- add replay coverage for:
  - same-category tenant noise
  - explicit-location vs metro fallback
  - booking-detail sufficiency by vertical

## Documentation sync rule

After each substantive search-core change:

- update this document
- update `docs/development/sprint-6-search-quality-execution-package.md`
- update `docs/development/implementation-progress.md`

This keeps the intelligent search lane aligned with the active code-aligned execution baseline rather than drifting into isolated tuning notes.
