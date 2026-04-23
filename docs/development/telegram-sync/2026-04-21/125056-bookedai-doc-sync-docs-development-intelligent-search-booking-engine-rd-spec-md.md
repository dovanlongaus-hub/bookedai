# BookedAI doc sync - docs/development/intelligent-search-booking-engine-rd-spec.md

- Timestamp: 2026-04-21T12:50:56.771190+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/intelligent-search-booking-engine-rd-spec.md` from the BookedAI repository into the Notion workspace. Preview: # Intelligent Search Booking Engine R&D Spec ## Status - owner: Codex R&D lane - date: `2026-04-18`

## Details

Source path: docs/development/intelligent-search-booking-engine-rd-spec.md
Synchronized at: 2026-04-21T12:50:56.580626+00:00

Repository document content:

# Intelligent Search Booking Engine R&D Spec

## Status

- owner: Codex R&D lane
- date: `2026-04-18`
- product area: BookedAI public search, matching, booking handoff
- priority: critical

## Objective

BookedAI search must behave like a real booking engine, not a generic recommendation widget.

The engine must:

1. understand exactly what the user wants to book
2. search tenant-owned SME data first when it truly matches
3. search the public internet only when tenant data is insufficient
4. enforce strict matching on:
   - service intent
   - location
   - timing
   - budget
   - party size
   - additional user conditions
5. show only the best 3 results that survive those rules
6. hand the chosen result into the booking flow cleanly

## Product truth policy

### Rule 1 — Tenant truth is primary

If the system already has tenant or SME partner data that matches the request and satisfies the search conditions, that result must be preferred over public web results.

### Rule 2 — Public internet is fallback, not default

If tenant truth is absent or too weak, BookedAI may use OpenAI `Responses API + web_search` to find public web candidates.

These results must still pass strict relevance gates before they are shown.

### Rule 3 — No weak broad matches

BookedAI must not show a result just because it shares the same city, category family, or broad parent domain.

If search confidence is weak, the engine should show no result instead of a misleading result.

### Rule 4 — Top 3 only

The customer-facing result surface should show only the top 3 strongest results by default.

## Search contract

Every search request should be normalized into this internal contract:

- `query_text`
- `core_service_intent`
- `location_hint`
- `near_me_requested`
- `requested_date`
- `requested_time`
- `schedule_hint`
- `party_size`
- `budget_max`
- `service_category_preference`
- `extra_constraints`
- `channel_context`

## Matching model

### Stage A — Query understanding

Extract:

- exact service terms
- city, suburb, metro, precinct
- time phrases such as `today`, `tomorrow`, `tonight`, `this weekend`
- explicit numeric constraints such as budget and party size
- booking readiness signals such as `book`, `reserve`, `need`, `looking for`

### Stage B — Tenant retrieval

Tenant search must only retrieve candidates that are plausible on:

- service topic
- category alignment
- location alignment
- published catalog quality

### Stage C — Tenant ranking and gates

Tenant candidates must be ranked by:

1. service-intent match
2. location closeness
3. booking readiness
4. budget fit
5. direct booking path quality
6. trust and catalog completeness

Hard gates:

- reject `topic_mismatch`
- reject `core_intent_mismatch`
- reject `location_mismatch` when location is required
- reject weak top matches before UI display

### Stage D — Public web fallback

Public web search should only run after tenant ranking returns no display-safe result.

Public web search must prefer:

- official provider websites
- real booking pages
- provider-owned service pages

Public web search must reject:

- broad directories
- listicles
- city-only weak matches
- adjacent-domain pages
- non-booking results that do not support the requested service

### Stage E — Public web result gates

Each public web candidate should be evaluated on:

- `service_relevance`
- `location_relevance`
- `time_relevance`
- `constraint_relevance`
- `official_source`
- `overall_match_score`

Suggested acceptance thresholds:

- `service_relevance >= 0.72`
- if location is present: `location_relevance >= 0.58`
- if time is present: `time_relevance >= 0.45`
- if budget or party size or other constraints are present: `constraint_relevance >= 0.45`
- `overall_match_score >= 0.68`
- source must be official or include a direct booking path

## Result policy

### What may be displayed

Only candidates that satisfy all required conditions may be shown.

### What may not be displayed

- off-topic services
- wrong city or wrong suburb when location is explicit
- web results that merely resemble the category
- tenant rows that are incomplete or not search-ready
- results that fail the search gates but would otherwise fill empty space

### Result count

- maximum 3 results shown in the primary customer shortlist
- order by strongest combined relevance

## Booking handoff policy

When the user selects a result:

- the search screen remains the primary context until the customer makes an explicit booking decision
- tapping a shortlist card should open a detail preview first, not jump directly into the booking form
- the detail preview should explain:
  - why the result matches
  - tenant or provider identity
  - location and booking-readiness state
- closing the preview should return the user to the search shortlist without changing booking state
- tenant-backed result:
  - preview first, then continue with the existing booking-trust and booking-path flow only after the customer presses `Book`
- public web result:
  - keep BookedAI advisory
  - open partner booking path or source page
  - do not pretend availability was verified by BookedAI

When the user presses `Book` from the preview:

- the selected result should be committed into the booking state
- the UI should move into the booking form only at that moment
- the primary booking input area should receive focus immediately

When the booking is submitted successfully:

- the UI should transition out of the search or preview state
- the customer should land on a dedicated booked or confirmed state
- the confirmation surface should clearly show a thank-you outcome instead of leaving the customer inside the editable booking form

## Frontend requirements

Frontend must:

- show a live search loading state immediately
- hide stale shortlist rows while a new query is in progress
- keep the shortlist compact at 3 results
- show location, timing, booking path, and why it matches
- make public web sourced results visually distinguishable from tenant-owned results
- keep result browsing and booking commitment as separate UI steps
- show a service preview popup with tenant or provider context before moving into booking
- return to the shortlist when the preview is dismissed
- move to the booking form only after explicit user confirmation
- focus the booking form input region as soon as the customer commits to booking
- move to a dedicated confirmed or thank-you state after successful booking creation

## Backend requirements

Backend must:

- maintain `tenant-first, public-web-second`
- preserve strict display gates
- pass normalized booking context into web fallback
- log diagnostics for why candidates were shown or dropped
- keep result shaping deterministic

## API requirements

`POST /api/v1/matching/search` should remain the main search endpoint.

The response should always preserve:

- `candidates`
- `recommendations`
- `confidence`
- `warnings`
- `booking_context`
- `semantic_assist`
- `search_diagnostics`

## Current implementation progress

Already in place as of `2026-04-18`:

- tenant-first ranking and strict display gating
- OpenAI Responses API `web_search` fallback
- public web fallback now receives:
  - `location_hint`
  - `booking_context`
  - `budget`
  - `preferences`
- public web results are now filtered by:
  - service relevance
  - location relevance
  - time relevance
  - constraint relevance
  - official-source or booking-path quality
- public web fallback returns only the top 3 surviving results
- hospitality-aware web fallback now includes a rescue pass for `restaurant`, `table booking`, and `private dining` style queries
- loading state on the public search surface now says `BookedAI is finding the best option for your request.`
- targeted public E2E coverage now verifies:
  - tenant shortlist survives trust-resolution gaps without reviving unrelated legacy rows
  - tenant miss can render sourced public web options
  - stale shortlist rows stay hidden while a new live search is resolving

### Production validation snapshot

Production validation on `2026-04-18` confirmed the implemented engine is now operating in the intended `tenant-first, public-web-second` shape:

- stack health passed at `2026-04-18T16:35:01Z`
- direct live validation on `https://api.bookedai.au/api/v1/matching/search` returned public-web fallback results for:
  - `restaurant table for 6 in Sydney tonight`
  - `dentist checkup in Sydney CBD this weekend`
  - `childcare near Sydney for a 4 year old`
  - `private dining in Melbourne for 8 this Friday night`
- a point-in-time replay snapshot across the current 7-case English pack produced:
- a point-in-time replay snapshot across the original 7-case English fallback pack produced:
  - `web_fallback = 4`
  - `missing_catalog = 2`
  - `blocked_by_gates = 1`
  - `tenant_hit = 0`
- the replay pack now also includes 5 production-validated tenant-positive cases, and a targeted tenant-positive run on `2026-04-18` confirmed `tenant_hit = 5/5` with `expectation_mismatches = 0`

Current production gaps exposed by that same replay snapshot:

- `restaurant table for 6 in Sydney tonight` can still vary between successful hospitality web fallback and a safe gate-blocked no-result snapshot, which means hospitality retrieval stability is improved but not yet fully deterministic
- `physio for shoulder pain near Parramatta tomorrow morning` and `NDIS support worker at home in Western Sydney tomorrow` still show moments where the public-web fallback does not surface a display-safe result, so the next tuning loop must keep focusing on reliability and coverage rather than relaxing relevance gates

## Verification strategy

### Backend

- unit test tenant exact match vs wrong-domain tenant noise
- unit test tenant miss -> public web fallback
- unit test web fallback receives timing and constraint context
- unit test route keeps only top 3 public web results

### Frontend

- E2E tenant shortlist survives legacy noise
- E2E public web fallback renders correctly
- E2E loading state hides stale results
- E2E tapping a result opens preview without entering booking immediately
- E2E closing preview returns the user to the shortlist
- E2E `Book` from preview enters booking flow and focuses the first booking input
- E2E successful booking transitions to confirmed or thank-you state

## Phase plan

### Phase 1 — Matching precision hardening

- improve core intent extraction
- improve location and metro matching
- protect against category-only drift

### Phase 2 — Web fallback precision

- strengthen OpenAI web-search prompt
- enforce strict public web result contract
- add post-filter thresholds

### Phase 3 — Result presentation

- make result source explicit
- keep top 3 default shortlist
- tighten booking-ready explanation and next action
- separate `preview` from `booking commit`
- show tenant or provider detail in the preview layer
- move to booking only after explicit `Book` confirmation
- end the flow on a visible confirmed or thank-you state

### Phase 4 — Replay and telemetry

- build English replay pack from real queries
- track tenant-hit vs web-fallback rate
- track wrong-result suppression rate
- track booking-flow conversion by result source

## English replay pack

An initial English replay pack now exists at:

- [docs/development/english-search-replay-pack.json](/home/dovanlong/BookedAI/docs/development/english-search-replay-pack.json)

Current verticals covered:

- haircut
- restaurant
- physio
- dentist
- childcare
- support worker
- private dining

Run it with:

```bash
python scripts/run_matching_search_replay.py --cases-json docs/development/english-search-replay-pack.json --output pretty
```

Expected use:

- validate whether top results stay tightly grounded to service intent
- review replay rollups by outcome: `tenant_hit`, `web_fallback`, `missing_catalog`, `blocked_by_gates`
- separate ranking problems from catalog-supply gaps before changing the engine

Local fixed eval coverage in the repo now also includes:

- `restaurant-table-melbourne`
- `private-dining-southbank`
- `support-worker-western-sydney-english`
- verify location and timing constraints are preserved
- inspect whether the engine correctly chooses tenant data or public web fallback
- spot verticals where `missing_catalog` is the real problem instead of ranking logic

## Official references reviewed

Reviewed on `2026-04-18`:

- OpenAI Responses API:
  - https://platform.openai.com/docs/api-reference/responses/create?api-mode=responses
- OpenAI tools guide:
  - https://platform.openai.com/docs/guides/tools/file-search
- OpenAI migration and structured-output guidance:
  - https://platform.openai.com/docs/guides/responses-vs-chat-completions

Inference from those sources:

- OpenAI supports a hosted `web_search` tool in the Responses API
- Structured Outputs with `json_schema` are appropriate for a strict result contract
- BookedAI can use OpenAI as the official public web search layer without introducing a second search engine immediately
