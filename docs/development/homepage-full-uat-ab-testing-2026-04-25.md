# Homepage Full UAT And A/B Testing Review - 2026-04-25

## Scope

Surface: `https://bookedai.au`

Review focus:

- public homepage first impression for investors and customers
- Claude-style homepage chat composer and scrollable results area
- non-mutating search/status flow
- responsive behavior on desktop, tablet, and mobile
- A/B testing readiness and next experiment recommendation

## UAT Result

Status: `Passed`

Evidence folder:

`frontend/output/playwright/homepage-full-uat-ab-2026-04-25/`

Screenshots captured:

- `desktop-initial.png`
- `desktop-after-search.png`
- `tablet-initial.png`
- `tablet-after-search.png`
- `mobile-initial.png`
- `mobile-after-search.png`

Machine-readable summary:

- `frontend/output/playwright/homepage-full-uat-ab-2026-04-25/uat-summary.json`

## Checked Behavior

- homepage returned `200` on desktop, tablet, and mobile
- title matched `BookedAI | The AI Revenue Engine for Service Businesses`
- hero headline `Turn demand into booked revenue` was visible
- product CTA was visible
- investor/customer proof sections were present
- live product chat frame was visible
- `Ask BookedAI` input was visible
- attachment button was visible
- send button was visible
- non-mutating search showed visible search/status state
- suggestions, top research, or honest search-state content remained visible after search
- no horizontal overflow before or after search
- no browser console errors
- no page errors
- no failed browser requests

Heuristic score:

- desktop: `19/19`
- tablet: `19/19`
- mobile: `19/19`

## Regression Coverage

Passed:

- `npm --prefix frontend run test:playwright:smoke`
- `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py`

The smoke pack covered:

- legacy desktop/mobile public homepage responsive smoke
- live-read homepage booking flow through v1 booking intent in mocked regression
- near-me/location fallback behavior
- admin smoke paths

## A/B Testing Review

Current control variant:

`A - Investor/customer balanced acquisition page`

Strengths:

- strong investor framing in the headline and proof sections
- live product surface is present on-page instead of hidden behind a landing CTA
- chat composer now matches the requested Claude-style interaction model
- top results and suggestions stay inside the conversation
- no technical UX regressions detected in production UAT

Main risk:

- the first viewport still asks visitors to process both the company thesis and the product flow. This is right for investors, but customer-first traffic may convert faster if the first action is simply `ask BookedAI now`.

Recommended next experiment:

`B - Product-first booking action`

Hypothesis:

If the homepage first viewport moves the live chat/search entry closer to the hero decision point and changes the primary CTA copy from broad product navigation to a direct search action, more customer visitors will start a search without reducing investor click-through to pitch/architecture.

Suggested B copy:

- Hero support copy: `Describe what you need. BookedAI turns it into ranked options, booking intent, and follow-up.`
- Primary CTA: `Start with a request`
- Secondary CTA: `Investor story`
- Chat prompt placeholder: `What do you want to book, where, and when?`

Metrics to track:

- `homepage_variant_assigned`
- `homepage_primary_cta_clicked`
- `homepage_search_started`
- `homepage_attachment_added`
- `homepage_top_research_visible`
- `homepage_result_details_opened`
- `homepage_result_selected`
- `homepage_booking_started`
- `homepage_pitch_clicked`
- `homepage_architecture_clicked`

Success criteria:

- search-start rate improves by at least `15%`
- booking-start rate does not decrease
- investor pitch/architecture clicks do not decrease by more than `5%`
- mobile no-overflow and no-console-error gates remain green

## Recommendation

Do not replace the current homepage immediately. Keep it as Variant A because UAT is clean and it balances investor plus customer credibility well.

Next best move:

1. Add lightweight A/B assignment and event tracking for homepage CTAs and chat funnel events.
2. Ship Variant B behind a query/local-storage controlled experiment.
3. Run for enough traffic to compare `search_started`, `booking_started`, and `pitch_clicked`.
4. Promote Variant B only if it increases customer search-start without hurting investor intent.
