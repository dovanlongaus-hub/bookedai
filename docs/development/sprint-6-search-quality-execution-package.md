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

## Delivery goal

Sprint 6 should deliver four connected outcomes without breaking current public behavior:

1. real search telemetry from production-shaped traffic
2. a promotable evaluation loop using labeled cases and release thresholds
3. an operator feedback workflow for wrong matches and safe empty-result outcomes
4. a richer search-to-booking context contract that downstream lifecycle flows can trust

## Workstream map

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
- safe empty-result behavior
- fallback transparency preserved
- booking-context extraction quality

## Proposed operator feedback labels

- `wrong_match`
- `missing_catalog`
- `no_result_correct`
- `ranking_weak`
- `escalation_should_have_triggered`

## Recommended sequencing

1. define telemetry schema and redaction rules
2. add additive telemetry capture behind a rollout flag
3. define replay dataset format and extend the eval harness
4. add release thresholds and document promote or hold rules
5. add operator feedback capture in admin
6. unify the richer search-to-booking contract across backend and frontend

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

## Definition of done for Sprint 6 follow-on

- telemetry exists for production-shaped search analysis
- replayable eval inputs can be generated from captured search traffic
- release thresholds exist for key verticals
- admin operators can record structured search-quality feedback
- search-to-booking context is clearer and more normalized than the current lightweight hint model

## Related references

- [Implementation Progress](./implementation-progress.md)
- [Roadmap Sprint Document Register](./roadmap-sprint-document-register.md)
- [Prompt 5 API V1 Execution Package](./prompt-5-api-v1-execution-package.md)
- [Implementation Phase Roadmap](../architecture/implementation-phase-roadmap.md)
- [MVP Sprint Execution Plan](../architecture/mvp-sprint-execution-plan.md)
- [AI Router Matching Search Strategy](../architecture/ai-router-matching-search-strategy.md)
- [QA Testing Reliability AI Evaluation Strategy](../architecture/qa-testing-reliability-ai-evaluation-strategy.md)
