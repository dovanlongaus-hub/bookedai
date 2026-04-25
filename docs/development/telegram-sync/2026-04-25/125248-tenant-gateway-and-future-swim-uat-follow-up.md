# Tenant Gateway And Future Swim UAT Follow-Up

- Timestamp: 2026-04-25T12:52:48.049509+00:00
- Source: docs/development/tenant-bookedai-uat-content-ux-review-2026-04-25.md
- Category: Tenant UX
- Status: deployed

## Summary

Implemented the tenant.bookedai.au UAT content/UX follow-up: outcome-led gateway copy, visible Google CTA fallback, mobile Send code CTA, Future Swim revenue proof promoted before activation, compressed mobile workspace menu, live deploy, and final desktop/mobile Playwright smoke passed.

## Details

# Tenant BookedAI UAT, Content, And UX Review - 2026-04-25

## Scope

- Live target: `https://tenant.bookedai.au/`
- Tenant proof route: `https://tenant.bookedai.au/future-swim`
- Viewports: desktop `1440x1000`, mobile `390x844`
- Method: live Playwright browser UAT, API response monitoring, console/page-error capture, request-failure capture, horizontal-overflow scan, screenshot review, and content/UX review through QA, startup-conversion, enterprise-buyer, investor, and human-copy lenses.
- Evidence folder: `frontend/output/playwright/live-tenant-uat-2026-04-25/`

## Test Result Summary

| Area | Result | Evidence |
|---|---|---|
| Gateway load | Pass | `/` returned `200` on desktop and mobile |
| Future Swim workspace load | Pass | `/future-swim` returned `200` on desktop and mobile |
| Tenant API calls | Pass | onboarding, integrations, billing, team, bookings, catalog, plugin-interface, overview, and revenue-metrics returned `200` |
| Console/page errors | Pass | no console errors and no page errors observed |
| Horizontal overflow | Pass | no desktop or mobile overflow detected |
| Workspace navigation | Pass | Overview, Experience Studio, Catalog, Plugin, Bookings, Enquiries, Ops, Integrations, Billing, and Team all switched/rendered |
| Google sign-in visual on mobile | Needs fix | sign-in Google iframe exists but renders as a blank white button in the mobile screenshot; create-account Google button renders correctly |
| Email CTA text on mobile | Needs polish | `Send login code` visually reads as `Sendlogin code` because the button text is too compressed |

## UAT Findings

### P1 - Mobile Google Sign-In Button Is Visually Blank

On `tenant.bookedai.au/` mobile sign-in mode, the Google iframe is present with title `Sign in with Google Button`, but the visible button area is blank. This can reduce trust and block the preferred auth route even though the fallback email-code path is available.

Recommended fix:

- Give the Google iframe container a stable mobile width and height.
- Add an explicit first-party fallback button label beside or under the iframe: `Continue with Google`.
- If Google iframe text fails to paint, keep a visible native button that triggers the same Google prompt.

### P2 - Gateway First Screen Is Functionally Clear But Too Auth-First

The page now works, but the first impression is mostly "sign in mechanics." For a new tenant or enterprise buyer, it should first explain why this workspace matters: bookings, revenue proof, customer-care, and automation governance.

Recommended fix:

- Add one business-outcome sentence above the auth card.
- Move release/version copy below the auth surface or into a small footer.
- Keep Google/email/create account as actions, but frame them under a stronger value proposition.

### P2 - Future Swim Workspace Is Credible But Overloaded

The Future Swim workspace passes UAT and feels real. The issue is density: too many equally weighted cards compete after the activation tower, especially on desktop. The revenue proof loop is the strongest investor/buyer asset and should lead the workspace after the hero.

Recommended fix:

- Reorder first signed-out preview surface: Hero -> Revenue proof loop -> Activation checklist -> Workspace menu -> supporting operations cards.
- On desktop, make the workspace menu sticky or compact; do not let it compete visually with revenue and priority panels.
- On mobile, add a compact "Jump to" control before the long card stack.

### P3 - Some Copy Is Accurate But Robotic

Examples:

- `Preview access • standalone_app`
- `Source 1.0.8-tenant-currency-truth`
- `A structured enterprise surface for tenant operations...`
- `BookedAI helped capture 101 parent enquiries...`

The wording is technically useful, but it reads more like an internal build label than a human operator experience.

Recommended fix:

- Keep build/release details available, but reduce their first-viewport prominence.
- Convert internal labels into operator-facing language.
- Use fewer nouns per sentence and make next actions more direct.

## Rewording Recommendations

### Gateway Hero

Current:

> Sign in to your BookedAI workspace

Recommended:

> Run your bookings, enquiries, and follow-up from one tenant workspace

Supporting copy:

> Sign in with Google, create a new workspace, or use a one-time email code. BookedAI routes you to the right tenant and keeps booking, revenue, and automation work in one place.

### Gateway Value Chips

- `Google first` -> `Fast verified access`
- `Email code` -> `Password-free fallback`
- `Auto routing` -> `Opens the right workspace`

### Gateway Auth Card

Current:

> Sign in with email

Recommended:

> Access your tenant workspace

Supporting copy:

> Use Google when your account is linked to a tenant. Use email code if you need a secure fallback.

Button:

> Send login code

Mobile-safe button label:

> Send code

### Future Swim Hero

Current:

> A structured enterprise surface for tenant operations: profile content, catalog, bookings, integrations, billing, team control, and plugin readiness all sit behind one role-aware workspace.

Recommended:

> Future Swim can review bookings, parent enquiries, lesson revenue, catalog readiness, and follow-up automation from one operator workspace.

### Activation Tower

Current:

> Verify tenant identity first

Recommended:

> Sign in to start activation

Supporting copy:

> Preview data is visible now. Sign in to edit catalog details, connect billing, and complete tenant-owned setup.

### Revenue Proof Loop

Current:

> Monthly swim value board

Recommended:

> Monthly booking and revenue proof

Supporting copy:

> In the last 30 days, BookedAI tracked 101 parent enquiries, 85 booked lessons, and $749 in lesson revenue. One follow-up item still needs attention.

### Priority Alert

Current:

> Payment follow-up needs attention

Recommended:

> Review 2 payment follow-ups

Supporting copy:

> Two booking payment states need a tenant check before the revenue loop is fully clean.

## Proposed Page Structure

### Gateway Page

1. Outcome-led hero: tenant workspace value, not only auth.
2. Compact proof row: bookings, revenue, customer-care, automation.
3. Auth card: Google primary, email code fallback, create account secondary.
4. Trust/footer row: release, security, support contact.

### Future Swim Preview Workspace

1. Tenant hero with status chips and sign-in CTA.
2. Revenue proof loop as the primary business proof.
3. Activation checklist with next action.
4. Workspace menu or jump navigation.
5. Booking pipeline and search readiness.
6. Priorities, onboarding, experience studio, and AI import guidance.

## Recommended Next Steps

1. Fix mobile Google sign-in visual fallback and shorten mobile email CTA to `Send code`.
2. Reframe gateway copy around business outcome and move release labels lower.
3. Reorder `/future-swim` so revenue proof leads before the activation/menu stack.
4. Add a mobile jump menu for long tenant preview pages.
5. Run the same live UAT again after copy/layout changes and keep the screenshots as release evidence.

## Implementation Follow-Up

Delivered on `2026-04-25`:

- reframed the tenant gateway hero from auth mechanics to business outcome copy: bookings, enquiries, revenue, and automation in one tenant workspace
- replaced the gateway value chips with operator-facing language: fast verified access, password-free fallback, and right workspace routing
- added a first-party Google action button above the Google iframe so mobile users always see a visible Google CTA even when the third-party iframe paints late or blank
- shortened the mobile email-code submit CTA to `Send code`
- softened the auth card heading to `Access your tenant workspace`
- rewrote the Future Swim hero copy into a clearer operator promise around bookings, parent enquiries, lesson revenue, catalog readiness, and follow-up automation
- moved the Future Swim revenue proof into a prominent summary section directly after the tenant hero and before activation
- changed the activation headline to `Sign in to start activation` with clearer preview-vs-write-access copy
- compressed the mobile workspace menu into a two-column jump-style menu and removed the repeated detailed revenue proof block from the lower overview stack

Verification:

- `npm --prefix frontend run build` passed
- live deploy completed through `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "bash scripts/deploy_live_host.sh"`
- `https://api.bookedai.au/api/health`, `https://tenant.bookedai.au/`, and `https://tenant.bookedai.au/future-swim` returned `200`
- live Playwright final smoke passed for desktop and mobile: no console errors, no page errors, no request failures, no horizontal overflow, and all Future Swim tenant APIs returned `200`
- final evidence folder: `frontend/output/playwright/live-tenant-ux-final-2026-04-25/`
