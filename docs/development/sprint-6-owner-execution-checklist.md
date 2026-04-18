# BookedAI Sprint 6 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Connect attribution, enquiry stitching, and conversion metrics across channels.

Sprint 6 must also mature the search-quality lane so customer-visible search stays grounded to the user's actual request rather than broad stored system content.

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

## QA or release owner

- define validation for source persistence and conversion calculations
- define replay and smoke coverage for customer-visible search truth in sensitive verticals
