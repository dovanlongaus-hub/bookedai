# Homepage Full UAT And A/B Testing Review

- Timestamp: 2026-04-25T16:07:07.044499+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Homepage full UAT passed on desktop/tablet/mobile with clean production smoke and regression; recommended next A/B is a product-first Start with a request variant measured against search-start, booking-start, and investor-click events.

## Details

# Homepage Full UAT And A/B Testing Review

## Summary

The deployed `bookedai.au` homepage passed a fresh full UAT on desktop, tablet, and mobile after the Claude-style chat composer/result work. No production UI breakage was found. The A/B recommendation is to keep the current investor/customer balanced homepage as Control A and next test a product-first Variant B focused on `Start with a request`.

## UAT Evidence

Evidence folder:

`frontend/output/playwright/homepage-full-uat-ab-2026-04-25/`

Captured artifacts:

- `desktop-initial.png`
- `desktop-after-search.png`
- `tablet-initial.png`
- `tablet-after-search.png`
- `mobile-initial.png`
- `mobile-after-search.png`
- `uat-summary.json`

Production checks:

- homepage returned `200`
- hero headline visible
- investor/customer proof visible
- chat frame visible
- `Ask BookedAI` input visible
- attachment control visible
- send control visible
- non-mutating search showed status and suggestions/top-research or honest search state
- no horizontal overflow before or after search
- no console errors
- no page errors
- no failed browser requests

Scores:

- desktop: `19/19`
- tablet: `19/19`
- mobile: `19/19`

## Regression

Passed:

- `npm --prefix frontend run test:playwright:smoke`
- `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py`

## A/B Testing Recommendation

Control A:

`Investor/customer balanced acquisition homepage`

Recommended Variant B:

`Product-first booking action`

Hypothesis:

Moving the first user action closer to the live chat/search request and using a direct CTA such as `Start with a request` should increase customer search-start rate without materially reducing investor pitch/architecture intent.

Primary metrics:

- `homepage_search_started`
- `homepage_booking_started`
- `homepage_pitch_clicked`
- `homepage_architecture_clicked`

Supporting events:

- `homepage_variant_assigned`
- `homepage_primary_cta_clicked`
- `homepage_attachment_added`
- `homepage_top_research_visible`
- `homepage_result_details_opened`
- `homepage_result_selected`

Suggested success gate:

- search-start rate improves by at least `15%`
- booking-start rate does not decrease
- investor pitch/architecture clicks do not decrease by more than `5%`
- mobile no-overflow and browser-error gates remain green

## Fix Decision

No immediate code fix was required from this UAT run. The current live homepage is clean enough to keep as Control A. The next code change should be instrumentation plus a controlled Variant B, not another blind redesign.
