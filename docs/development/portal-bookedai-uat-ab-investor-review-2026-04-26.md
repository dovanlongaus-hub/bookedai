# Portal BookedAI UAT, A/B, Content, And Investor Review - 2026-04-26

## Scope

Live surface: `https://portal.bookedai.au`

Review mode: professional UAT, A/B testing plan, UI/UX/content review, SME buyer lens, and investor/enterprise startup lens.

OpenClaw skill note: the local OpenClaw skill folders for UI/UX, copywriter, and investor review exist under `skills/`, but the current user account cannot read them because of filesystem permissions. The review therefore applied those lenses manually, with browser and API evidence from the live surface.

Evidence:

- live UAT reference created during this run: `v1-2fd9f35965`
- screenshot evidence: `frontend/output/playwright/live-portal-uat-2026-04-26/portal-valid-ref-failure-desktop.png`
- screenshot evidence: `frontend/output/playwright/live-portal-uat-2026-04-26/portal-valid-ref-failure-mobile.png`

## Executive Verdict

The portal has the right strategic shape for BookedAI: a durable customer workspace for booking truth, payment posture, support, and request-safe change actions. That is an enterprise-grade direction and fits the "AI revenue engine" platform story.

The current live portal is not UAT-passable for the core customer promise because a newly created booking reference can be issued successfully by production, then fail to hydrate in the portal with a `500` backend error. In the browser this appears as CORS plus `Failed to fetch`, which damages customer trust and weakens the investor story around lifecycle continuity.

## UAT Results

| ID | Scenario | Result | Severity | Notes |
|---|---:|---:|---|---|
| UAT-01 | API health check | Pass | Low | `GET https://api.bookedai.au/api/health` returned `200` |
| UAT-02 | Portal shell loads | Pass | Low | `https://portal.bookedai.au` rendered customer portal shell |
| UAT-03 | Create fresh public booking intent | Pass | Low | `POST /api/v1/bookings/intents` returned `v1-2fd9f35965` |
| UAT-04 | Reopen fresh booking in portal API | Fail | Critical | `GET /api/v1/portal/bookings/v1-2fd9f35965` returned `500` |
| UAT-05 | Ask portal care agent for fresh booking | Fail | High | `POST /care-turn` returned `500` |
| UAT-06 | Browser valid-reference path | Fail | High | UI showed `Booking not available`, `We could not load...`, `Failed to fetch`; console showed CORS because the `500` lacked CORS headers |
| UAT-07 | Invalid reference path | Pass with copy issue | Medium | Structured `404 portal_booking_not_found`; UI copy still feels technical |
| UAT-08 | Previously documented live refs | Fail | High | `v1-ce0d20a95d`, `v1-1ed89a5995`, and `v1-cb79f8e371` returned `500` |
| UAT-09 | Mobile overflow on failure state | Pass | Low | `390px` viewport measured `scrollWidth = 390`, overflow `0` |
| UAT-10 | Local backend route tests | Pass | Low | `.venv/bin/python -m pytest backend/tests/test_api_v1_portal_routes.py backend/tests/test_api_v1_booking_routes.py -q` passed `15/15` |
| UAT-11 | Local portal Playwright spec | Pass | Low | `cd frontend && npx playwright test tests/portal-enterprise-workspace.spec.ts --reporter=line` passed `2/2` |

## Priority Findings

### Critical - Booking Reference Continuity Is Broken In Production

A new booking intent can be created successfully, but the portal cannot hydrate it. This breaks the central portal promise: "keep this reference and come back later."

Recommended fix:

- harden the portal snapshot builder for request-callback and low-confidence booking intents
- add production-like regression coverage where a booking intent has no resolved catalog candidate
- return a structured v1 error envelope for unexpected portal failures
- ensure CORS headers are attached to error responses, not only successful responses

### High - Customer Error Copy Sounds Like The Booking Disappeared

Current failure copy:

- `Booking not available`
- `We could not load v1-2fd9f35965`
- `Failed to fetch`

Recommended copy:

- title: `Your booking reference is saved`
- body: `We could not refresh the latest details yet. Try again in a moment, or contact BookedAI support with this reference so we can continue the same request.`
- actions: `Try again`, `Contact support`, `Start a new search`

### Medium - Portal Positioning Is Enterprise-Accurate But Customer-Heavy

Current H1 is platform-like:

`Manage booking status, payment, support, and change requests from one secure workspace.`

Recommended H1:

`Review your booking and request changes in one place.`

Recommended support copy:

`Enter the reference from your confirmation email or QR code. We will show the latest booking status, payment step, provider details, and safe options to reschedule, change, cancel, or ask for help.`

### Medium - Internal Vocabulary Leaks Into The Customer Surface

Current helper:

`Only dedicated booking_reference links are read by this portal, so tracker ids or release refs cannot open the wrong record.`

Recommended helper:

`Use the booking reference from your confirmation email or QR code. Marketing links and internal release IDs cannot open customer booking records.`

## A/B Testing Plan

### Experiment A - Portal Hero Promise

Control:

`Manage booking status, payment, support, and change requests from one secure workspace.`

Variant:

`Review your booking and request changes in one place.`

Primary metrics:

- booking lookup submit rate
- successful portal hydration rate
- support contact click-through after lookup
- error-state retry rate

Hypothesis:

The customer-first variant will improve lookup completion and reduce support confusion because it describes the job-to-be-done directly.

### Experiment B - Error Recovery Copy

Control:

`Booking not available / Failed to fetch`

Variant:

`Your booking reference is saved / We could not refresh the latest details yet`

Primary metrics:

- retry click rate
- support contact rate with reference included
- abandonment rate within 30 seconds

Hypothesis:

The recovery variant preserves trust and will convert failure states into supportable requests instead of customer churn.

### Experiment C - Action Information Architecture

Control action model:

Overview, edit, reschedule, pause, downgrade, cancel.

Variant action model:

Status, Pay, Reschedule, Ask for help, Change plan, Cancel.

Primary metrics:

- first action click
- reschedule request completion
- support escalation quality
- destructive action starts

Hypothesis:

Customer-intent ordering will reduce cognitive load and make the portal feel more like a support workspace than an admin tool.

## Investor And SME Assessment

Investor signal:

- Strong: the product thesis is clear. Portal continuity is the right missing piece between acquisition, booking, payment, and support.
- Risk: production currently breaks at the most trust-sensitive handoff. For an enterprise/unicorn-level platform story, post-booking continuity must be boringly reliable.
- Moat opportunity: if BookedAI can show a resilient booking truth layer with care agent, audit trail, payment posture, and tenant-safe requests, the portal becomes a defensible operating-system surface rather than a receipt page.

SME buyer signal:

- Strong: SMEs care about fewer missed bookings, fewer support pings, and clearer customer self-service. The portal direction maps well to that.
- Risk: SMEs will not tolerate customers saying "my booking link is broken." This should be treated as release-blocking.
- Best next proof: demonstrate one full customer loop live: search, book, reference, portal reopen, ask care agent, submit reschedule, admin sees request.

## Recommended Release Gate

Before declaring the portal investor-demo-ready:

- `GET /api/v1/portal/bookings/{fresh_v1_reference}` returns `200`
- `POST /api/v1/portal/bookings/{fresh_v1_reference}/care-turn` returns `200`
- browser has no CORS, console, page, or request failures for a valid reference
- invalid references return structured `404` and customer-safe recovery copy
- mobile `390px` remains no-overflow
- the error state never exposes `Failed to fetch` as the only explanation
