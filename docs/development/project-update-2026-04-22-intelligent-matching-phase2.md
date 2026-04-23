# Project Update - 2026-04-22 - Intelligent Matching Engine Phase 2

## Summary

BookedAI now has a richer Phase 2 intelligent matching read model instead of leaving shortlist reasoning mostly route-local.

The matching lane now exposes one fuller contract across backend and frontend for:

- query understanding
- booking context
- recommendation reasoning
- booking-fit posture
- stage-by-stage search diagnostics

## What changed

### Backend matching contracts

`backend/core/contracts/matching.py` now defines the fuller matching envelope for:

- rich candidate metadata
- shortlist recommendations
- booking-fit summaries
- query context and booking context
- semantic-assist metadata
- search diagnostics with stage counts

This moves the matching lane closer to a real Phase 2 contract instead of a thin wrapper around candidate IDs and confidence only.

### Matching domain service

`backend/domain/matching/service.py` now owns the richer read-model shaping for intelligent matching.

The service now:

- derives normalized `booking_fit` summaries for candidates and recommendations
- summarizes budget, party-size, schedule, location, and booking-readiness posture
- emits `stage_counts` so search diagnostics are easier to inspect from replay tooling and future operator views
- centralizes response shaping instead of expanding more route-local dict construction

### Search route adoption

`backend/api/v1_search_handlers.py` now uses the matching domain service to return the final search payload for `/api/v1/matching/search`.

This keeps current retrieval, semantic assist, gating, and public-web fallback behavior intact while moving the output into a more intentional engine-level contract.

### Frontend contract sync

The frontend v1 contract layer now normalizes the richer matching payload as well.

Updated files:

- `frontend/src/shared/contracts/matching.ts`
- `frontend/src/shared/contracts/api.ts`
- `frontend/src/shared/api/v1.ts`

The frontend can now read:

- `bookingFit` on candidates
- `bookingFit` on recommendations
- `stageCounts` inside search diagnostics

without reintroducing backend/frontend payload drift.

## Why this matters

This pass turns the matching engine into a stronger Phase 2 foundation for later work such as:

- smarter shortlist explanation in the public assistant
- clearer booking handoff guidance
- replay and tuning visibility by search stage
- admin diagnostics for why candidates survived or were dropped
- future lifecycle or booking-intent handoff that depends on consistent matching context

## Verification

Passed:

- `.venv-backend/bin/python -m unittest backend.tests.test_matching_domain_service backend.tests.test_prompt9_matching_service backend.tests.test_api_v1_contract`
- `python3 -m py_compile backend/core/contracts/matching.py backend/domain/matching/service.py backend/api/v1_search_handlers.py backend/tests/test_matching_domain_service.py`

Open verification note:

- full `backend.tests.test_api_v1_search_routes` is still not clean in the current repo state; the failures are in the broader split-route test lane and include existing drift outside this new matching read-model slice
- full frontend `tsc` still did not finish within the local 30-second timeout, which matches the previously recorded environment behavior for this workspace

## Next recommended slice

The next high-value step is to let the public assistant and admin diagnostics actually render the new `booking_fit` and `stage_counts` signals, so the richer engine contract becomes visible operator and customer value rather than staying backend-only.
