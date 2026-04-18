# Sprint 6 Search Quality Execution Package

## Purpose

This package turns the current Sprint 6 search-quality lane into an execution-ready plan.

It is intended for:

- Prompt 9 delivery sequencing
- search-quality implementation planning
- telemetry and evaluation design
- admin feedback workflow design
- release-gate alignment for Phase 2 intelligent booking search

Date of plan: `2026-04-17`

## Current baseline

As of `2026-04-17`, the repo already has a real search-quality lane in production-shaped code:

- `/api/v1/matching/search` returns ranked candidates, trust-aware recommendations, booking-context hints, and semantic transparency metadata
- lexical retrieval already includes phrase aliases, suburb-to-metro location expansion, implicit budget parsing, and topic or location filtering before rerank
- semantic rerank and strict relevance gating already exist
- catalog-quality gating already removes non-search-ready rows from live search and exposes operator remediation in admin
- repo-local evaluation coverage already protects fixed-query search cases and Prompt 9 matching helpers
- public live-read and admin preview already share one shortlist presentation model

The current gap is no longer feature existence.

The real gap is quality maturity:

- production-query telemetry is missing
- release thresholds are missing
- operator feedback is not yet captured as structured tuning input
- booking-context output is still lighter than the downstream booking handoff needs
- assistant chat still needs stronger protection against wrong-domain blending, stale shortlist revival, and city-only weak matches that look plausible but do not satisfy the user's actual ask
- some live no-result cases are not ranking failures at all; they are `missing_catalog` gaps caused by the absence of tenant-published, search-ready SME product records

Live replay note as of `2026-04-18`:

- `kids haircut Sydney` was reduced to a safer no-result after retrieval hardening, which confirms the prior issue was shortlist truth
- `swimming Sydney` still returns `retrieval_candidate_count = 0` on live, which indicates no published swim-service SME data is currently available to search
- this means Sprint 6 must explicitly separate `wrong_match` tuning from `missing_catalog` supply gaps, and must not treat every empty result as a semantic-model problem

Current upgrade focus as of `2026-04-18`:

- prioritize `text-input grounded retrieval` before broader ranking changes
- normalize multilingual and chat-style queries, including Vietnamese queries with diacritics, into stable intent terms before retrieval and rerank
- suppress candidates that only look locally plausible but do not match the actual requested service topic
- keep the public shortlist empty when confidence is weak rather than filling the UI with unrelated stored results
- treat this lane as the active intelligent search and booking upgrade slice because it directly improves search-to-booking trust
- use OpenAI Responses API `web_search` as the official public internet-search fallback after tenant miss, rather than adding a second search engine integration in this sprint
- verify the tenant-first/public-web-second behavior with targeted E2E coverage on the public homepage assistant surface

## Delivery goal

Sprint 6 should deliver four connected outcomes without breaking current public behavior:

1. real search telemetry from production-shaped traffic
2. a promotable evaluation loop using labeled cases and release thresholds
3. an operator feedback workflow for wrong matches and safe empty-result outcomes
4. a richer search-to-booking context contract that downstream lifecycle flows can trust
5. objective suppression of wrong-domain, wrong-location, and stale-context answers before customer-visible summary composition

## Workstream map

### Workstream 0 — Search truth policy lock

Owner:

- Search Truth Agent

Primary goal:

- formalize the rule that retrieval truth outranks answer fluency in every customer-facing search path

Expected outputs:

- one approved search-truth policy covering:
  - domain-intent matching
  - location-truth states
  - stale-context suppression
  - fallback labeling
  - escalation conditions
- one implementation decision on semantic stack:
  - OpenAI Responses API verifier and summarizer path
  - embedding recall path
  - optional Google grounding path for place disambiguation only

Definition of done:

- later search work does not have to reopen whether the model may invent or broaden relevance beyond retrieval evidence

Immediate sprint slice:

- strengthen query normalization for multilingual free text
- make retrieval-term generation deterministic so ranking behavior is stable across runs
- require stronger topic anchoring from the current text input before a candidate survives shortlist gating
- enforce `tenant-first, public-web-second` routing in the matching path
- add E2E coverage for tenant success, tenant miss to public web fallback, and in-progress search UI states
- keep live-read search authoritative even when trust-resolution enrichment is unavailable, so search truth does not fall back to stale legacy shortlist rows

## Current verified E2E slice

Targeted public assistant E2E coverage verified on `2026-04-18`:

- tenant-grounded shortlist survives trust-resolution gaps and suppresses unrelated legacy noise
- tenant miss renders sourced public web results from the OpenAI fallback path
- loading state shows `BookedAI is finding the best option for your request.`
- stale shortlist rows are hidden while a new search is resolving

Current guarded tests live in:

- [frontend/tests/public-booking-assistant-live-read.spec.ts](/home/dovanlong/BookedAI/frontend/tests/public-booking-assistant-live-read.spec.ts)

## Production rollout note

Production backend rollout validated on `2026-04-18`:

- deployed a backend-only search-quality image update to `api.bookedai.au` using a clean backend snapshot so unrelated worktree changes were not shipped
- post-deploy stack health passed at `2026-04-18T16:00:20Z` via `scripts/healthcheck_stack.sh`
- post-deploy replay confirmed `restaurant table for 6 in Sydney tonight` no longer leaks `catering-enquiry`
- post-deploy replay confirmed `NDIS support worker at home in Western Sydney tomorrow` no longer broadens into housing or property
- current live replay distribution after rollout:
  - `tenant_hit = 0`
  - `web_fallback = 0`
  - `missing_catalog = 5`
  - `blocked_by_gates = 2`
- this means the rollout improved truthfulness by suppressing wrong matches, but the next remediation phase must focus on why live OpenAI public-web fallback is not surfacing for these replay-pack miss cases

Follow-up remediation validated on `2026-04-18`:

- root cause for missing public-web fallback was confirmed in live backend logs: OpenAI `Responses API` rejected `web_search` requests when `reasoning.effort` was set to `minimal`
- backend fallback was updated to use `reasoning.effort = low`, `search_context_size = low`, and request-level `X-Client-Request-Id` headers for production debugging
- backend now logs `openai_public_web_search_http_error` and `openai_public_web_search_transport_error` with `x-request-id` and trimmed response body when the fallback fails
- live replay after this fix confirmed at least one true `public_web_search` success path:
  - `physio for shoulder pain near Parramatta tomorrow morning` now returns sourced public-web options with direct booking links
- replay harness default timeout was raised from `20s` to `60s` because real web-search fallback can legitimately exceed the earlier replay timeout
- residual live gap:
  - some hospitality queries such as `restaurant table for 6 in Sydney tonight` still return `results: []` from the OpenAI web-search step itself, even after technical fallback repair
  - this is now a prompt-policy / retrieval-coverage issue rather than an API-contract failure

### Workstream A — Search telemetry foundation

Owner:

- Search Telemetry Agent

Primary goal:

- capture production-shaped search requests and outcomes in a way that is auditable, privacy-safe, and reusable for evaluation

Target areas:

- `backend/api/v1_routes.py`
- future repository seam under `backend/repositories/`
- future service seam under `backend/service_layer/`
- `docs/development/rollout-feature-flags.md`

Expected outputs:

- additive telemetry event schema for search request, search result, and selection outcome
- tenant-safe persistence or export seam for replayable search samples
- rollout flag for telemetry capture depth
- explicit redaction rules for contact or free-text sensitive data

Definition of done:

- every search request can be recorded with normalized query context, candidate IDs, strategy, provider chain, and fallback state
- telemetry can distinguish no-result safety cases from weak-result failures
- telemetry can distinguish `missing_catalog` from `wrong_match`, including cases where retrieval returns zero candidates for a legitimate vertical query
- the design does not require changing current customer-visible contracts

### Workstream B — Production eval loop and release thresholds

Owner:

- Eval and QA Agent

Primary goal:

- turn search quality into something measurable enough to block or promote changes

Target areas:

- `backend/evals/search_eval_pack.py`
- `scripts/run_search_eval_pack.py`
- release-gate documentation and future gate wiring
- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`

Expected outputs:

- labeled replay dataset format sourced from telemetry
- evaluation dimensions for relevance, wrong-domain suppression, location correctness, and safe no-result behavior
- evaluation dimensions for stale-context suppression and service-vs-event intent separation
- vertical-level pass thresholds
- promote, hold, and rollback guidance for search-quality releases

Definition of done:

- repo-local fixed cases remain the fast smoke lane
- replay cases can be added without rewriting the harness
- release criteria define what counts as acceptable degradation or block-worthy regression

### Workstream C — Operator feedback workflow

Owner:

- Admin Feedback Agent

Primary goal:

- let operators turn bad search outcomes into structured tuning work instead of one-off investigation notes

Target areas:

- `frontend/src/features/admin/`
- future admin feedback route or queue seam under `backend/api/v1_routes.py`
- future repository seam for feedback capture
- `docs/architecture/internal-admin-app-strategy.md`

Expected outputs:

- operator actions for:
  - wrong match
  - missing catalog
  - no-result-good
  - ranking looks weak
- feedback payload linked to query context, candidate IDs, and search strategy
- lightweight queue or export format for triage and tuning follow-up
- explicit path for routing `missing_catalog` cases into later tenant-catalog onboarding or publish work, rather than only search-model tuning

Definition of done:

- operators can capture structured feedback from the existing admin search-quality surface
- feedback can be tied back to telemetry or eval cases
- no authoritative booking behavior is changed by this workflow

### Workstream D — Search-to-booking context contract

Owner:

- Matching Contract Agent

Primary goal:

- promote lightweight booking-context hints into a stronger normalized handoff contract

Target areas:

- `backend/api/v1_routes.py`
- `backend/service_layer/prompt9_matching_service.py`
- `frontend/src/shared/contracts/api.ts`
- `frontend/src/shared/api/v1.ts`

Expected outputs:

- normalized search-context contract for:
  - party size
  - timing intent
  - location intent
  - service or category intent
  - confidence or trust-safe next-step posture
- clearer ownership between shared API contracts and matching-specific runtime types
- downstream handoff guidance for booking intent creation and lifecycle orchestration

Definition of done:

- matching output can be consumed by later booking or lifecycle flows without ad-hoc reinterpretation
- frontend and backend shared contracts describe the same Phase 2 handoff model

## Proposed telemetry model

### Search request record

- request timestamp
- tenant reference
- channel and deployment mode
- raw query
- normalized query
- inferred location
- inferred category
- budget summary
- near-me requested
- user-location granted
- provider chain
- fallback applied
- search strategy

### Search result record

- candidate IDs returned
- top candidate ID
- confidence score and gating state
- booking-context summary
- warning set
- empty-result flag
- retrieval-candidate count before semantic rerank
- primary drop reason when the result is empty or fully gated

### Search outcome record

- selected candidate ID when available
- operator feedback label when available
- downstream booking-intent created or not
- safe no-result affirmed or not

## Proposed evaluation dimensions

- relevance at top 1
- relevance in shortlist
- wrong-domain suppression
- wrong-location suppression
- stale-context suppression
- event-vs-service intent separation
- safe empty-result behavior
- missing-catalog classification accuracy
- fallback transparency preserved
- booking-context extraction quality

## Proposed operator feedback labels

- `wrong_match`
- `missing_catalog`
- `no_result_correct`
- `ranking_weak`
- `escalation_should_have_triggered`

## Recommended sequencing

1. lock search-truth policy and semantic-stack decision
2. define telemetry schema and redaction rules
3. add additive telemetry capture behind a rollout flag
4. define replay dataset format and extend the eval harness
5. add release thresholds and document promote or hold rules
6. add operator feedback capture in admin
7. unify the richer search-to-booking contract across backend and frontend

## Recommended semantic-stack decision

Current recommendation, based on official OpenAI model documentation reviewed on `2026-04-18`, is:

- use strict retrieval and rule filters first
- use `text-embedding-3-large` for semantic recall expansion only after hard filters are applied
- use the Responses API with `gpt-5-mini` as the default verifier and concise summarizer for search truth
- reserve larger reasoning models for offline eval labeling, difficult adjudication, or replay analysis rather than every live query
- treat Google APIs as optional grounding for place or map normalization, not as a replacement for category and trust gating

## Verification plan

- backend unit coverage for telemetry normalization and feedback payload shaping
- route-level contract coverage for new additive search metadata or feedback endpoints
- frontend type-check and build coverage for admin feedback UI
- evaluation harness run against both fixed-query and replay datasets
- release-gate document updated to state how Sprint 6 search changes are promoted or held

## Risks to watch

- telemetry capture becoming too noisy or too sensitive without redaction discipline
- replay datasets overfitting to one tenant or one vertical
- feedback workflows creating admin complexity without a clean triage model
- richer matching contracts drifting away from shared API ownership
- release thresholds being too weak to block regressions or too strict to allow useful tuning
- search-quality work being asked to compensate for catalog supply gaps that really belong to later tenant login, catalog ownership, and publish flows

## Definition of done for Sprint 6 follow-on

- telemetry exists for production-shaped search analysis
- replayable eval inputs can be generated from captured search traffic
- release thresholds exist for key verticals
- admin operators can record structured search-quality feedback
- search-to-booking context is clearer and more normalized than the current lightweight hint model
- `missing_catalog` outcomes can be handed off cleanly into the Phase 4 tenant-catalog backlog, including cases like `swimming Sydney` where BookedAI needs real SME product data before search can succeed

## Related references

- [Implementation Progress](./implementation-progress.md)
- [Roadmap Sprint Document Register](./roadmap-sprint-document-register.md)
- [Prompt 5 API V1 Execution Package](./prompt-5-api-v1-execution-package.md)
- [Implementation Phase Roadmap](../architecture/implementation-phase-roadmap.md)
- [MVP Sprint Execution Plan](../architecture/mvp-sprint-execution-plan.md)
- [AI Router Matching Search Strategy](../architecture/ai-router-matching-search-strategy.md)
- [QA Testing Reliability AI Evaluation Strategy](../architecture/qa-testing-reliability-ai-evaluation-strategy.md)
