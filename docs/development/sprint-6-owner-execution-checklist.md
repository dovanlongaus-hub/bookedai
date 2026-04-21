# BookedAI Sprint 6 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Connect attribution, enquiry stitching, and conversion metrics across channels.

Sprint 6 must also mature the search-quality lane so customer-visible search stays grounded to the user's actual request rather than broad stored system content.

## Current execution snapshot

Progress recorded on `2026-04-18`:

- tenant-first matching with strict display gating is implemented in the live matching path
- OpenAI `Responses API + web_search` is implemented as the official public-web fallback after tenant miss
- public search E2E coverage now verifies tenant truth, sourced fallback, and in-progress loading-state behavior
- production replay and direct live queries now confirm visible public-web fallback results in multiple English verticals
- the active remaining gaps are no longer generic “search is wrong” issues; they are:
  - missing tenant-positive replay coverage in the public pack
  - hospitality stability across repeated live runs
  - public-web coverage gaps for some `support worker` and `physio` queries

Progress recorded on `2026-04-19`:

- the next execution slice is now explicitly `Phase S6-A - canonical query understanding contract`
- backend and frontend are being converged on one shared query-understanding payload instead of parallel ad hoc intent parsing
- search-quality work should now treat `query_understanding` as the contract that later ranking, fallback, and result-detail shaping layers build on top of

## Owner checklist

## Product lead

- approve attribution vocabulary
- approve conversion metric definitions
- approve search-truth acceptance criteria for wrong-domain, wrong-location, and stale-context suppression

## Solution architect

- confirm source normalization model
- confirm enquiry-to-booking chain assumptions
- confirm the semantic stack is verifier-after-retrieval, not generator-before-retrieval

## PM or product ops

- coordinate dependencies between growth, backend, and reporting work
- track unresolved attribution gaps
- track the search-truth remediation plan as a release-quality lane, not as an ad-hoc bug list

## Frontend lead

- confirm CTA source model remains consistent with backend needs
- review event and source propagation assumptions
- confirm assistant UI handles safe empty-result, need-location, and fallback-labeled states without reviving stale shortlist rows

## Backend lead

- implement source normalization
- implement conversion aggregate logic
- define partial-attribution fallback behavior
- implement telemetry and eval hooks for wrong-domain, wrong-location, stale-context, and event-vs-service regressions
- implement the chosen semantic-stack contract so retrieval truth is enforced before model summary output
- finish rolling `query_understanding` through the matching route, typed client layer, and any downstream ranking consumers before widening more vertical-specific tuning

## QA or release owner

- define validation for source persistence and conversion calculations
- define replay and smoke coverage for customer-visible search truth in sensitive verticals
