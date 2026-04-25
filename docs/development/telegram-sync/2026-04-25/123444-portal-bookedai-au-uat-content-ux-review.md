# Portal bookedai.au UAT content UX review

- Timestamp: 2026-04-25T12:34:44.202493+00:00
- Source: docs/development/portal-bookedai-uat-content-ux-review-2026-04-25.md
- Category: qa
- Status: review

## Summary

Live UAT for portal.bookedai.au found a critical portal hydration gap: public booking-intent reference v1-6879356dc2 was created successfully, but portal snapshot and care-turn returned 500, causing the browser to show Booking not available / Failed to fetch. Invalid references still return structured 404 with CORS, and tested mobile/desktop error states had no horizontal overflow. Detailed rewrite and layout recommendations were documented.

## Details

# Portal BookedAI UAT, Content, And UX Review - 2026-04-25

## Scope

Live surface: `https://portal.bookedai.au`

Review mode: professional UAT plus startup/investor/content review. Applied the workspace `qa-testing-vi` skill for UAT structure. The named OpenClaw, Unicorn startup, enterprise investor, and human content writer skills were not available as callable skills in this runtime, so those lenses were applied manually.

Primary UAT reference created during test:

- booking intent id: `a1f7f1e2-fffb-41e5-94de-734c34737c30`
- booking reference: `v1-6879356dc2`
- source: public `POST https://api.bookedai.au/api/v1/bookings/intents`
- campaign marker: `portal_uat_2026_04_25`

Evidence folder:

- `frontend/output/playwright/live-portal-uat-2026-04-25/`

## Executive Summary

`portal.bookedai.au` has a strong enterprise workspace direction: clear lookup, confident visual system, no mobile horizontal overflow in the tested failure states, and a sensible concept of booking/payment/support truth. The current live release is not UAT-passable for the end-to-end customer revisit path because valid `v1-*` booking references created by the public booking-intent contract can fail when the portal tries to hydrate them.

The biggest product risk is trust breakage after confirmation: the customer receives a durable booking reference, opens the portal, and sees `Booking not available / Failed to fetch`. For an investor or enterprise buyer, this reads as a lifecycle-contract gap between acquisition, booking, and post-booking support.

## UAT Results

| ID | Scenario | Result | Severity | Evidence |
|---|---|---:|---|---|
| UAT-01 | API health check for `api.bookedai.au` | Pass | Low | `GET /api/health` returned `200 {"status":"ok"}` |
| UAT-02 | Portal shell loads at `portal.bookedai.au` | Pass | Low | HTML returned `200`; browser rendered portal shell |
| UAT-03 | Create public booking intent, then reopen in portal | Fail | Critical | `POST /bookings/intents` returned `v1-6879356dc2`; `GET /portal/bookings/v1-6879356dc2` returned `500` |
| UAT-04 | Customer-care status agent for valid booking reference | Fail | High | `POST /portal/bookings/v1-6879356dc2/care-turn` returned `500` |
| UAT-05 | Browser handling of valid reference API failure | Fail | High | UI showed `We could not load v1-6879356dc2` and `Failed to fetch`; console showed CORS symptom because `500` response had no CORS header |
| UAT-06 | Invalid booking reference handling | Pass with copy issue | Medium | `BR-DOES-NOT-EXIST-UAT` returned structured `404 portal_booking_not_found` with CORS headers |
| UAT-07 | Mobile overflow in error state | Pass | Low | `390x844` viewport had `scrollWidth = 390`, overflow `0` |
| UAT-08 | Previously documented live reference `v1-1ed89a5995` | Fail | High | `GET /portal/bookings/v1-1ed89a5995` returned `500` |

## Priority Findings

### Critical - Valid Booking References Can Break Portal Hydration

The live public booking-intent path created `v1-6879356dc2` successfully, including CRM sync records, but the portal snapshot endpoint returned `500 Internal Server Error`. A known previous live reference, `v1-1ed89a5995`, also returned `500`.

Expected: every public booking reference shown in confirmation email, QR, WhatsApp, or thank-you screen should either load a portal snapshot or return a clear customer-safe state such as `Booking captured, provider confirmation pending`.

Recommended fix:

- harden `build_portal_booking_snapshot` for low-confidence/request-callback bookings with missing service/payment rows
- add regression coverage for `v1-*` booking intents created without a resolved catalog service
- return a structured v1 error envelope with CORS headers for unexpected portal snapshot failures

### High - Customer Error Message Is Too Technical And Trust-Damaging

Current customer-visible copy:

- `Booking not available`
- `We could not load v1-6879356dc2`
- `Failed to fetch`

This is technically true but commercially weak. It makes the customer think the booking disappeared.

Recommended replacement:

- eyebrow: `We could not refresh this booking yet`
- title: `Your reference is saved, but the portal could not load the latest details`
- body: `Try again in a moment, or contact BookedAI support with reference v1-6879356dc2. We will use this reference to continue the same booking request.`
- actions: `Try again`, `Contact support`, `Start a new search`

### High - API Failure Looks Like CORS In Browser

The direct API returned `500`. In browser, the same failure surfaced as CORS because the failed response did not include `Access-Control-Allow-Origin`.

Recommended fix:

- ensure error middleware adds CORS headers to all error responses
- keep frontend error parsing from collapsing all network errors into `Failed to fetch`
- show `request_id` when available, hidden behind a `Support details` disclosure

### Medium - Portal Hero Is Enterprise-Accurate But Customer-Heavy

Current H1:

`Manage booking status, payment, support, and change requests from one secure workspace.`

It sounds enterprise-grade, but a customer just wants reassurance. Suggested rewrite:

`Review your booking and request changes in one place.`

Supporting copy:

`Enter the reference from your confirmation email or QR code. We will show the latest booking status, payment step, provider details, and safe options to reschedule, pause, downgrade, cancel, or ask for help.`

### Medium - Lookup Copy Uses Internal Language

Current:

`Only dedicated \`booking_reference\` links are read by this portal, so tracker ids or release refs cannot open the wrong record.`

Suggested:

`Use the booking reference from your confirmation email or QR code. Marketing links and internal release IDs cannot open customer booking records.`

### Medium - Action Model Needs A Customer-First Order

The action set is correct, but the information architecture should lead with what the customer is likely trying to solve:

1. `Status`
2. `Pay`
3. `Reschedule`
4. `Ask for help`
5. `Change plan`
6. `Cancel`

`Pause` and `Downgrade` are useful for academy/subscription contexts, but they should sit under `Change plan` unless the loaded booking is clearly an academy/subscription booking.

## Recommended UI Layout

### Desktop

Use a three-band customer workspace:

1. Top band: compact brand + booking reference lookup + status badge.
2. Main left: booking snapshot, schedule, payment, provider, customer details, timeline.
3. Right rail: next best action, customer-care agent, support contact, secondary actions.

Do not duplicate navigation in both the top command strip and right rail. Pick one primary navigation model and use the right rail for actions.

### Mobile

Use this order:

1. Booking reference and status
2. Next action card
3. Payment/schedule summary
4. Customer-care question input
5. Provider details
6. Timeline
7. Change/cancel actions

Keep destructive actions below support and reschedule.

## Content Rewrite Pack

| Area | Current Direction | Recommended Copy |
|---|---|---|
| H1 | Manage booking status, payment, support... | Review your booking and request changes in one place. |
| Subcopy | Use the reference from your confirmation email... | Enter the reference from your confirmation email or QR code. We will show the latest status, payment step, provider details, and safe change options. |
| Booking truth | Reference-led | Booking found / Awaiting details / Needs support |
| Payment posture | Visible here | Payment status |
| Support route | Provider-aware | Support contact |
| Lookup label | Booking reference | Booking reference |
| Lookup helper | Only dedicated `booking_reference` links... | Use the booking reference from your confirmation email or QR code. |
| Error title | We could not load `{ref}` | Your reference is saved, but details could not load |
| Error body | Failed to fetch | Try again in a moment or contact support with this reference. |
| Agent title | Customer-care status agent | Ask about this booking |
| Agent placeholder | Ask about payment, reschedule... | Ask about payment, timing, class status, or support... |
| Portal actions empty | Once a booking reference is loaded... | Load a booking reference to see the actions available for that booking. |

## Release Gate Before Re-UAT

- `GET /api/v1/portal/bookings/{booking_reference}` returns `200` for a newly created public booking intent.
- The same endpoint returns structured `404` for an invalid reference and structured `5xx` envelope with CORS headers for unexpected failures.
- `POST /api/v1/portal/bookings/{booking_reference}/care-turn` returns customer-safe guidance for request-callback bookings.
- Browser console has no CORS, page, or request failures on a valid reference.
- Desktop and mobile screenshots show no horizontal overflow.
- Error state never says only `Failed to fetch`.

## Suggested Next Sprint Slice

1. Fix portal snapshot hydration for public `v1-*` booking-intent records.
2. Replace technical failure copy with customer-safe recovery copy.
3. Simplify portal IA around `Status -> Pay -> Reschedule -> Ask for help -> Change plan -> Cancel`.
4. Re-run live UAT with one newly created booking, one known old booking, one invalid booking, and one mobile pass.
