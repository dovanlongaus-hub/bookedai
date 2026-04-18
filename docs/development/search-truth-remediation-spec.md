# BookedAI Search Truth Remediation Spec

Date: `2026-04-18`

Document status: `active remediation spec`

## 1. Purpose

This document turns the current search-quality trust problems into one concrete remediation program.

It exists to solve one class of failure end to end:

- the system answers with content that is not objectively aligned to what the user actually asked

This includes:

- wrong-domain results
- wrong-location results
- stale shortlist revival
- mixed event-and-service responses when the user only asked for one lane
- fluent summaries that sound plausible but are not grounded to retrieval truth

This spec is intended to be the implementation bridge between:

- Sprint 4 contract work
- Sprint 6 search-quality execution
- Sprint 10 release gating
- Sprint 15 replay-grade promotion criteria

## 2. Problem Statement

Production and smoke-test evidence now shows that the current system can still:

- answer a service-consultation request with event results
- answer a local request with interstate rows
- revive unrelated shortlist rows from older state
- use weak token overlap such as city-only matches to justify customer-facing results
- use semantic fluency to bridge gaps that hard retrieval did not actually support

These failures break trust even when the UI looks polished.

The remediation goal is not “better sounding answers”.

The remediation goal is:

- search results that are objectively faithful to the user's words, domain intent, and location intent

## 3. Non-Negotiable Rules

### 3.1 Query truth outranks answer fullness

If the system does not have enough evidence to answer well:

- return a safe no-result state
- request location just in time
- ask for clarification
- or escalate

Do not fill the gap with broad stored content.

### 3.2 Retrieval truth outranks semantic fluency

The model may:

- verify
- rerank
- summarize
- explain

The model may not:

- invent domain relevance
- override hard category filtering
- override hard location filtering
- revive stale shortlist rows
- mix events into service answers unless the user explicitly asked for events

### 3.3 Location truth outranks shortlist length

If the user asked for:

- `near me`
- a suburb
- a city
- a region

the system must prefer:

- no result
- need-location
- clarification

over an out-of-region shortlist that merely looks helpful.

### 3.4 Domain truth outranks weak overlap

If the user asked for:

- housing consultation
- clinic consult
- restaurant booking
- salon service
- membership help

the system must stay in that service domain unless the user explicitly broadens scope.

## 4. Failure Classes To Eliminate

### F1. Wrong-domain retrieval

Example:

- `housing consultation in Sydney`
- result contains `AI event` or `signage`

### F2. Wrong-location retrieval

Example:

- `restaurant near me`
- result shows another state as if it were local

### F3. Stale-context revival

Example:

- previous shortlist still influences the new answer even when the new query no longer supports it

### F4. Event-vs-service blending

Example:

- service consultation request also returns `WSTI` or `AI summit` event cards

### F5. Model-led broadening

Example:

- the model sees weak semantic overlap and composes a helpful-looking answer that retrieval did not justify

## 5. Target Architecture

The target search pipeline should be:

1. `query intake`
2. `hard intent extraction`
3. `hard filters`
4. `candidate retrieval`
5. `semantic rerank`
6. `trust gating`
7. `customer-facing summary composition`

The critical rule is:

- steps `2` through `4` define the evidence boundary
- steps `5` through `7` may refine inside that boundary, but may not escape it

## 6. Hard Intent Extraction Layer

The system should explicitly extract:

- `domain_intent`
- `request_type`
- `location_intent`
- `location_truth_state`
- `budget_intent`
- `time_intent`
- `party_size_intent`
- `needs_clarification`
- `needs_device_location`
- `allow_event_lane`
- `allow_cross_domain_fallback`

### Required meanings

#### `domain_intent`

Examples:

- `housing_and_property`
- `healthcare_service`
- `food_and_beverage`
- `salon`
- `membership_and_community`
- `ai_events`

#### `request_type`

Examples:

- `service_search`
- `consultation_request`
- `booking_request`
- `event_discovery`
- `compare_options`
- `clarification`

#### `location_truth_state`

Examples:

- `explicit_query_location`
- `device_location_granted`
- `semantic_location_inferred_only`
- `location_missing`

System rule:

- inferred-only location is weaker than explicit query location or granted device location

## 7. Retrieval Policy

### 7.1 Hard filters before embeddings

The system must first apply:

- supported domain filtering
- event-vs-service lane split
- hard location filtering when explicit location exists
- budget guardrails when explicit enough
- obvious unsupported-domain suppression

Only after that should embedding or semantic recall expansion run.

### 7.2 Embedding recall after hard filters

Recommended baseline:

- `text-embedding-3-large`

Use it for:

- recall expansion within the already filtered candidate pool
- semantic neighborhood ranking inside the allowed domain

Do not use it for:

- bypassing hard location filters
- bypassing domain intent

### 7.3 Semantic verifier and summarizer

Recommended baseline:

- OpenAI Responses API
- default live verifier: `gpt-5-mini`

Use it for:

- verifying shortlist fit
- concise answer composition
- explanation generation
- trust-aware next-step language

Do not use it for:

- deciding that a disallowed result is actually relevant

### 7.4 Google grounding usage

Google APIs may be used for:

- place normalization
- suburb/city disambiguation
- geocoding and map grounding
- distance-aware enrichment

Google APIs should not be used as the reason to skip:

- domain filtering
- trust gating
- no-result behavior

## 8. Trust Gate Policy

Before anything becomes customer-visible, the gate must check:

- domain alignment
- location alignment
- explicit-event-intent alignment
- stale-context suppression
- fallback eligibility

### Allowed outcomes

- `show_ranked_results`
- `show_ranked_results_with_labeled_fallback`
- `need_device_location`
- `need_clarification`
- `no_strong_relevant_match`
- `escalate`

### Forbidden outcomes

- unlabeled out-of-region shortlist presented as local
- mixed event/service answer without explicit user request
- stale shortlist reuse after a contradictory new query

## 9. UI Behavior Requirements

### 9.1 No stale shortlist carryover

If the latest query returns:

- empty results
- blocked results
- needs location
- needs clarification

the UI must clear the previous shortlist from the active decision surface.

### 9.2 Just-in-time location

If the user asks for nearby/local matching and the system lacks trusted location:

- request device location in context
- do not show broad fallback rows first

### 9.3 Fallback labeling

If fallback is allowed by product policy, the UI must label it clearly:

- `Fallback option`
- `Outside requested area`
- `Closest available supported match`

If fallback is not allowed:

- do not show the row

## 10. Operator Workflow Requirements

Operators must be able to flag:

- `wrong_match`
- `wrong_location`
- `wrong_domain`
- `stale_shortlist`
- `event_service_mixed`
- `no_result_correct`
- `missing_catalog`
- `ranking_weak`
- `should_escalate`

Each feedback item must carry:

- raw query
- normalized query
- domain intent
- location truth state
- returned candidate IDs
- selected candidate ID if any
- provider chain
- fallback applied or not

## 11. Replay and Eval Requirements

The replay pack must include:

- high-value customer queries from production
- locality-sensitive cases
- event-vs-service separation cases
- no-result-good cases
- stale-context cases
- cross-query stateful chat cases

### Required evaluation dimensions

- top-1 relevance
- shortlist relevance
- wrong-domain suppression
- wrong-location suppression
- stale-context suppression
- event-vs-service separation
- safe no-result behavior
- fallback labeling correctness
- escalation correctness

## 12. Epic -> Story -> Task Breakdown

## Epic A — Search Truth Contract

### Story A1 — Normalize search-intent contract

#### Tasks

- define `domain_intent`
- define `request_type`
- define `location_truth_state`
- define `fallback_scope`
- define `escalation_reason`
- align backend and frontend shared contracts

### Story A2 — Trust-gate response vocabulary

#### Tasks

- define allowed customer-visible states
- define blocked states
- define fallback-label semantics
- define no-result semantics

## Epic B — Query-Grounded Retrieval

### Story B1 — Event-vs-service lane split

#### Tasks

- split event discovery triggers from generic city/location tokens
- block event blending into service-consultation flows
- add regression coverage for mixed-lane failures

### Story B2 — Hard domain filtering

#### Tasks

- enforce category/domain filtering before semantic rerank
- suppress weak city-only and keyword-only matches
- add domain-specific no-result behavior

### Story B3 — Hard location filtering

#### Tasks

- separate explicit location from inferred location
- add fallback labeling policy
- block unlabeled out-of-region results

## Epic C — Semantic Layer Discipline

### Story C1 — Embedding recall discipline

#### Tasks

- add embeddings after hard filters
- define filtered recall boundaries
- log candidate-pool provenance

### Story C2 — Responses API verifier

#### Tasks

- define verifier prompt contract
- restrict verifier to candidate-bound reasoning
- log verification outcomes and confidence

## Epic D — State and UI Integrity

### Story D1 — Stale shortlist suppression

#### Tasks

- clear shortlist on no-result
- clear shortlist on need-location
- clear shortlist on need-clarification
- add stateful UI regression coverage

### Story D2 — Just-in-time location flow

#### Tasks

- trigger device-location request only when needed
- show blocked state if location is denied
- rerun query when location becomes available

## Epic E — Telemetry, Replay, and Release Gates

### Story E1 — Production telemetry

#### Tasks

- record query and candidate telemetry
- record fallback and trust-gate outcomes
- redact sensitive free text

### Story E2 — Replay eval harness

#### Tasks

- define replay dataset format
- add replay runner
- add vertical pass thresholds

### Story E3 — Promotion gates

#### Tasks

- define hold thresholds
- define rollback thresholds
- define block-on-failure classes

## 13. Sprint Mapping

### Sprint 3

Must deliver:

- no stale shortlist revival on the public assistant surface
- no mixed event/service visible answer drift in the public assistant surface
- just-in-time location behavior preserved on live UI

### Sprint 4

Must deliver:

- explicit search-truth contract fields
- fallback semantics
- escalation semantics
- frontend/backend contract alignment

### Sprint 6

Must deliver:

- telemetry
- replay evals
- wrong-domain and wrong-location thresholds
- operator feedback workflow
- semantic-stack implementation discipline

### Sprint 10

Must deliver:

- release gates that can block promotion on search-truth regressions

### Sprint 15

Must deliver:

- replay-grade release criteria on customer-facing search
- objective promotion rules based on real query classes

## 14. Acceptance Criteria

The remediation program is only complete when:

- the system no longer mixes service and event lanes without explicit user permission
- explicit city or suburb asks do not surface unlabeled out-of-region results
- stale shortlist rows cannot revive after contradictory or unsupported new queries
- model summaries never claim evidence that retrieval and trust gates did not support
- replay packs can catch the failure classes that production already exposed

## 15. Recommended Implementation Order

1. lock contract and truth vocabulary
2. split event-vs-service lane triggers
3. enforce hard domain and location filters
4. implement stale-context suppression
5. enforce verifier-after-retrieval semantic stack
6. add telemetry and replay harness
7. add release thresholds

## 16. Related References

- [Sprint 2 Code-Ready Development Handoff](./sprint-2-code-ready-development-handoff.md)
- [Sprint 6 Search Quality Execution Package](./sprint-6-search-quality-execution-package.md)
- [Project-Wide Sprint Execution Checklist](./project-wide-sprint-execution-checklist.md)
- [Change Governance](../governance/change-governance.md)
