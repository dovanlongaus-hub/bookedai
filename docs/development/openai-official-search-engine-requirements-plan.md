# OpenAI Official Search Engine Requirements and Rollout Plan

## Status

- owner: Codex implementation lane
- date: `2026-04-18`
- scope: public search, booking assistant, tenant-first matching, public web fallback

## Decision

BookedAI will use `OpenAI Responses API` with the built-in `web_search` tool as the official public internet search engine for the customer-facing search fallback path.

This decision applies only after the tenant catalog search fails to produce a strong relevant match.

It does not replace tenant data as the first source of truth.

## Why this decision

- tenant data must remain the primary source of truth for service search and booking trust
- OpenAI `web_search` gives the app one hosted, current-information search path without adding a second external search engine integration immediately
- the Responses API lets BookedAI keep one orchestration model for ranking, fallback, and explanation
- this keeps the fallback path simple enough to ship now, while leaving room to add a dedicated search provider later if cost, coverage, or ranking-control needs grow

Official references reviewed on `2026-04-18`:

- OpenAI tools guide: `https://platform.openai.com/docs/guides/tools/file-search`
- OpenAI Responses API reference: `https://platform.openai.com/docs/api-reference/responses/input-items?lang=python`
- OpenAI product announcement for built-in tools and web search: `https://openai.com/index/new-tools-for-building-agents/`

Inference from those docs:

- OpenAI can act as the official web-search layer for this use case
- a separate search engine API is not required for the first production rollout
- if BookedAI later needs stronger search-result control, lower search cost, or search-market diversity, a dedicated search provider can still be added behind the same fallback seam

## Search rules

### Rule 1 — Tenant-first

If the user query is relevant to stored tenant data and passes location and relevance gates, BookedAI must show tenant-backed results first.

Required behavior:

- tenant catalog retrieval runs first
- ranking and gating must prefer exact service intent over broad category or city-only similarity
- weak tenant matches must not be shown just to avoid an empty state

### Rule 2 — Public web fallback only when tenant truth is insufficient

If the query does not have a strong relevant tenant result, BookedAI may fall back to sourced public web results.

Required behavior:

- public web fallback runs only after tenant search returns no strong match
- public web results must be sourced through OpenAI `Responses API + web_search`
- public web results must prefer official provider websites and real booking pages
- wrong-domain, weak, or generic web matches must be suppressed
- public web results must be clearly treated as sourced fallback, not tenant-trusted catalog truth

### Rule 3 — Search-in-progress feedback

While BookedAI is still searching, the UI must show a clear in-progress state.

Required behavior:

- show the BookedAI search progress shell immediately
- use wording that says BookedAI is finding the best option for the user
- hide stale shortlist rows while the new search is resolving
- keep the final message grounded to the active query

## Detailed requirements

### Backend requirements

- `POST /api/v1/matching/search` remains the primary matching route
- route must keep tenant retrieval first
- route must apply strict relevance, semantic-domain, and display-quality gates before showing tenant results
- route must only trigger public web fallback when tenant results are empty or too weak to display
- route must expose enough diagnostics to explain whether a candidate came from:
  - tenant catalog
  - public web fallback
  - no-result after gating

### Source policy

- tenant results are the only results eligible for booking-trust resolution inside the current matching flow
- public web fallback results may be shown for discovery, comparison, and source click-through
- public web fallback results must not be treated as verified availability

### Ranking policy

- exact intent beats broad category
- exact service type beats parent domain
- exact or metro-compatible location beats generic city presence
- weak top matches must be hidden instead of shown
- public web fallback must not be activated when a strong tenant match already exists

### UI policy

- loading state should say `BookedAI is finding the best option for your request.`
- no-result state should continue preferring accuracy over wrong-domain suggestions
- public web fallback results must render cleanly without reviving unrelated legacy shortlist items

## Prompt contract

### Semantic rerank prompt requirements

The semantic prompt must enforce:

- current user query is the active search authority
- city or suburb match alone is not enough
- broad parent category match alone is not enough
- adjacent domains must be rejected
- multilingual or conversational phrasing must be normalized without broadening the requested service type

### Public web search prompt requirements

The public web fallback prompt must enforce:

- search only after tenant miss
- prefer official provider and booking pages
- prefer strong service-intent matches over directories
- return empty results when web matches are weak
- stay grounded to Australia-first service discovery

### Recommended fallback prompt shape

Use a prompt contract with these hard rules:

- first decide whether the tenant catalog already contains a strong relevant match
- only search the public web if tenant truth is insufficient
- prefer official provider pages, direct booking pages, and provider-owned service pages
- reject directory-style or city-only matches when the requested service intent is weak
- return a compact structured payload:
  - `provider_name`
  - `service_name`
  - `summary`
  - `location`
  - `source_url`
  - `booking_url`
  - `match_score`
  - `why_this_matches`

Prompt skeleton:

```text
You are BookedAI public search fallback.
Only run after tenant catalog search has failed to produce a strong relevant match.
Search the public web for service providers that closely match the user's English query.
Prefer official provider websites and direct booking pages.
Do not return weak, broad-category, or city-only matches.
If no strong match exists, return an empty result set.
```

## Phases

### Phase 1 — Tenant-first hardening

- strengthen query normalization
- enforce core-intent matching
- suppress weak top matches before UI display
- add diagnostics for gated results

### Phase 2 — Official OpenAI web fallback

- add OpenAI `web_search` fallback inside the matching route
- only trigger after tenant miss
- map sourced public web results into the shortlist contract
- keep booking recommendations empty for public web results unless later trust rules are added

### Phase 3 — E2E rollout and UX polish

- add E2E coverage for tenant-first success
- add E2E coverage for tenant miss to public web fallback
- add E2E coverage for loading state and stale-shortlist clearing
- refine loading copy and empty-state messaging

### Phase 4 — Production telemetry and thresholding

- measure tenant hit rate
- measure public web fallback rate
- measure wrong-result suppression rate
- add replay packs for high-value English search journeys

## Test plan

### Backend tests

- tenant match shown when relevant and location-valid
- weak tenant match hidden by display-quality gate
- wrong-domain semantic candidate dropped
- no strong tenant match triggers public web fallback
- diagnostics show the correct gate stage and reason

### Frontend E2E tests

- tenant-backed live-read shortlist suppresses unrelated legacy results
- public web fallback result renders when tenant data has no strong match
- loading state shows BookedAI search progress
- stale shortlist is hidden during a new query

## Current implementation snapshot

Implemented in this repo as of `2026-04-18`:

- tenant-first ranking and display-quality gating
- OpenAI-based public web fallback in `backend/services.py` and `backend/api/v1_routes.py`
- homepage and assistant loading states now use the same BookedAI search-progress copy
- backend tests added for fallback and weak-match suppression
- frontend E2E coverage added for:
  - tenant-ranked shortlist surviving trust-resolution gaps
  - tenant miss to sourced public web fallback
  - in-progress search shell and stale-shortlist clearing

Verified on `2026-04-18` with targeted Playwright runs:

- `shadow search still blocks unrelated legacy matches when live-read cannot finish trust resolution`
- `live-read shows sourced public web options when tenant catalog has no strong match`
- `live-read shows an in-progress search state and hides stale shortlist rows while a new query resolves`

Replay support added on `2026-04-18`:

- `scripts/run_matching_search_replay.py` now accepts `budget` and `time_window`
- English replay dataset added at [docs/development/english-search-replay-pack.json](/home/dovanlong/BookedAI/docs/development/english-search-replay-pack.json)
- current replay pack covers: haircut, restaurant, physio, dentist, childcare, support worker, and private dining

## Risks

- public web results may still need stronger official-site filtering in future
- public web fallback should not be mistaken for verified booking trust
- OpenAI web-search cost and latency should be monitored before scaling
- if sourced public web results become a large share of total traffic, a dedicated search-provider abstraction may still be worth adding later

## Next actions

1. Run targeted Playwright coverage for the new public web fallback scenario.
2. Add a public web result badge in the shortlist UI so the source type is explicit.
3. Add replay datasets for core English service searches: haircut, physio, dentist, restaurant, childcare, support worker.
4. Add rollout flags for public web fallback so it can be enabled per environment.
