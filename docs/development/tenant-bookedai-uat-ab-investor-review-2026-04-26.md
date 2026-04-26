# Tenant BookedAI UAT, A/B, Investor, SME, And Content Review - 2026-04-26

## Scope

- Live target: `https://tenant.bookedai.au/`
- Tenant proof route: `https://tenant.bookedai.au/future-swim`
- Viewports: desktop `1440x1000`, mobile iPhone 13 profile
- Method: live Playwright browser UAT, visual screenshot review, console/page-error capture, request-failure capture, response status monitoring, horizontal-overflow scan, CTA/state interaction checks, SME/investor review, and content/copy review.
- Evidence folder: `frontend/output/playwright/tenant-review-static-2026-04-26/`
- JSON interaction evidence was generated during the run; the final retained visual evidence is the static screenshot set in the evidence folder.

## UAT Result Summary

| Area | Result | Notes |
|---|---|---|
| Gateway desktop load | Pass | `200`, no console errors, no page errors, no horizontal overflow |
| Gateway mobile load | Pass | `200`, native Google CTA visible, email fallback visible, no horizontal overflow |
| Future Swim desktop load | Pass | `200`, revenue proof and activation sections render correctly |
| Future Swim mobile load | Pass with polish note | `200`, no horizontal overflow, but page is long at roughly `7.7kpx` body height |
| API health | Pass | `https://api.bookedai.au/api/health` returned `{"status":"ok","service":"backend"}` |
| Gateway mode switching | Pass | Sign-in and create-account states both render with correct business framing |
| Future Swim workspace tabs | Pass | Bookings, Catalog, Ops, Integrations, Billing, and Team all switch active state and update hash |
| Console/page errors | Pass | No app console errors or page errors observed |
| Request failures | Informational | Google font/log and Cloudflare RUM aborts appeared during browser teardown; no BookedAI API failures observed |

## Findings

### P2 - Email CTA Accessible Name Is Duplicated

The visible mobile button is clean as `Send code`, but browser extraction sees the button text as `Send codeSend login code`. This suggests both desktop and mobile labels may be present in the accessible name or DOM text.

Recommended fix:

- Keep one visible text node per breakpoint, or hide alternate text with `aria-hidden="true"`.
- Set the button `aria-label` explicitly to `Send login code` or `Send code`.
- Add a small regression assertion for the email-code button accessible name.

### P2 - Future Swim Mobile Is Stable But Long

The Future Swim preview now feels credible and operational, but the mobile page is still long for an enterprise SaaS buyer preview. The quick nav helps, yet the first signed-out scan still asks the user to process hero, revenue, activation, menu, metrics, bookings, catalog, priorities, setup, studio, and AI import in one page.

Recommended fix:

- Collapse lower supporting panels behind `Preview details` or tab-scoped sections on mobile.
- Keep the first mobile scan focused on `Revenue proof`, `Activation`, `Bookings`, and `Billing readiness`.
- Move `Tenant brand and content` and `What AI pulls into BookedAI` behind a secondary details area unless the user taps Studio/Catalog.

### P3 - Internal Release Copy Still Leaks Into Buyer-Facing Surface

`Source 1.0.8-tenant-currency-truth` is truthful, but it reads as engineering metadata. It should stay available for operators while being visually subordinate to business trust language.

Recommended fix:

- Keep version/source as a tooltip, footer detail, or support diagnostics row.
- Lead with business trust: `Secure tenant access`, `API-backed workspace`, `Audit-ready operations`.

## Investor View

The tenant surface now tells a stronger venture story than the prior auth-first layout. It shows a clear move from marketplace/search into repeatable SME operating software: tenant login, revenue proof, activation, booking pipeline, billing readiness, team governance, integration posture, and ops automation.

Strong signals:

- Multi-tenant SaaS posture is visible without requiring a demo call.
- Future Swim is a concrete vertical proof, not only a generic dashboard mock.
- Revenue proof appears above the operational details, which is the right investor sequence.
- The product hints at a bigger control-plane moat: booking, payment, follow-up, customer care, billing, and automation evidence in one workspace.

Investor concern:

- The current proof is credible, but still reads like an internal operator preview rather than a paid-enterprise command center in a few sections.
- The strongest unicorn-level narrative is not just "tenants manage bookings"; it is "BookedAI becomes the revenue operating layer for service SMEs." The tenant surface should repeat that more sharply.

Suggested investor-grade headline direction:

> Turn every enquiry into tracked revenue operations.

Supporting line:

> BookedAI gives each SME a tenant workspace for bookings, payments, follow-up, customer care, and automation evidence, so revenue leakage becomes visible and recoverable.

## SME Buyer View

The page now answers the practical SME question: "What do I get after I sign in?" The answer is clearer: bookings, enquiries, revenue proof, customer care, automation, billing, and team access.

SME strengths:

- Google-first access and email-code fallback are understandable.
- Support contact and WhatsApp care add trust.
- Future Swim metrics are concrete enough for an owner to understand value quickly.
- Activation checklist is practical and does not overpromise instant automation.

SME friction:

- Some labels still feel platform-internal: `tenant_admin`, `Source`, and `Runtime mode`.
- Billing readiness says `not started`, but the page should more directly explain the owner action and business consequence.

Suggested SME copy:

- `not started` -> `Billing setup needed`
- `Create a billing account before enabling package-based tenant charging.` -> `Set up billing so BookedAI can track packages, invoices, and payment follow-up.`
- `tenant_admin` -> `Admin preview`

## Content Writer Notes

Use shorter, revenue-led sentences and reduce stacked nouns.

Recommended copy polish:

- Gateway H1 can stay: `Run bookings, enquiries, and follow-up from one tenant workspace`.
- Add a sharper sub-line for commercial intent: `See what was captured, what needs follow-up, and which revenue actions are ready to run.`
- Future Swim hero can become: `Future Swim can see parent demand, booked lessons, payment follow-up, and catalog readiness in one workspace.`
- Revenue proof block can add a CTA hint: `Review follow-ups` instead of only `1 tenant attention signals`.

## A/B Testing Plan

### Experiment 1 - Gateway Commercial Promise

- Hypothesis: A sharper revenue-operations headline will increase sign-in/create-account intent from new SME visitors.
- A: Current headline, `Run bookings, enquiries, and follow-up from one tenant workspace`.
- B: `Turn every enquiry into tracked revenue operations`.
- Primary metric: create-account clicks per unique visitor.
- Secondary metric: Google sign-in clicks.
- Guardrails: bounce rate, API/auth error rate, mobile scroll depth, support clicks caused by confusion.
- Minimum run: at least one full business cycle and enough traffic for stable conversion comparison.

### Experiment 2 - Future Swim Mobile Compression

- Hypothesis: Collapsing secondary panels on mobile will improve CTA focus without reducing trust.
- A: Current long preview page.
- B: Mobile-first version showing hero, revenue proof, activation, bookings, billing readiness, then expandable details.
- Primary metric: `Open tenant sign-in` click-through on mobile.
- Guardrails: quick-nav usage, scroll depth to catalog/studio details, return visits, support contact taps.
- Decision rule: choose B only if sign-in intent rises and lower-section engagement does not materially drop.

### Experiment 3 - Revenue Proof CTA Language

- Hypothesis: Action-oriented follow-up wording will increase operator engagement.
- A: `1 tenant attention signals`.
- B: `Review 1 revenue follow-up`.
- Primary metric: follow-up or Ops section open rate.
- Guardrails: Billing/Bookings section opens, confusion events, support contact taps.

### Experiment 4 - Trust Metadata Placement

- Hypothesis: Moving release/source labels out of the first scan will make the page feel more enterprise-ready without lowering operator trust.
- A: Current visible release/source cards.
- B: Trust badges in first scan, source/release in footer or diagnostic tooltip.
- Primary metric: create-account/sign-in clicks.
- Guardrails: support contact clicks, admin/operator feedback, enterprise stakeholder comprehension in sales review.

## Enterprise Unicorn-Level Readiness Score

- Product proof: `8/10`
- Enterprise UX clarity: `7/10`
- SME buyer clarity: `8/10`
- Investor narrative: `7.5/10`
- Content polish: `7/10`
- Technical live stability for unauthenticated UAT: `9/10`

Overall: the surface is now strong enough to support investor and SME demos, especially as a vertical proof. The next jump is narrative compression: make the tenant workspace feel less like a complete internal preview and more like a paid revenue command center that happens to expose deep operational truth underneath.

## Recommended Next Actions

1. Fix the duplicated email-code accessible name.
2. Compress Future Swim mobile lower sections behind expandable details.
3. Replace internal runtime/source labels with buyer-facing trust language, keeping diagnostics available.
4. Run A/B Experiment 1 and Experiment 2 first, because they map directly to acquisition and activation.
5. Keep this tenant surface in the Phase 23 release gate as a required public SaaS proof route.

## Implementation Follow-Up

Delivered on `2026-04-26`:

- fixed the email-code submit button accessible name so assistive technology sees one stable `Send login code` label instead of the combined responsive text `Send codeSend login code`
- updated the tenant hero metadata cards from internal labels to buyer-facing trust language: `Access posture`, `Admin preview`, `Secure tenant access`, and `API-backed workspace`
- kept release diagnostics available through the trust card tooltip instead of exposing `Source 1.0.8-tenant-currency-truth` in the first visual scan
- changed the revenue proof follow-up microcopy from generic tenant attention language to `revenue follow-up ready`
- compressed the Future Swim mobile overview by moving the lower brand/studio and AI-import explanation into a `Preview brand and AI import details` disclosure, while preserving the fuller cards on tablet/desktop
- updated the tenant gateway Playwright regression to match the current outcome-led copy and assert that the duplicate responsive email label does not return

Verification before live deploy:

- `npm --prefix frontend exec tsc -- --noEmit` passed
- `npm --prefix frontend run build` passed
- `PLAYWRIGHT_EXTERNAL_SERVER=1 npx playwright test tests/tenant-gateway.spec.ts --workers=1` passed against a local Vite preview of the production build

Live deploy and verification:

- initial `python3 scripts/telegram_workspace_ops.py deploy-live` reached Docker frontend build but failed with `exit code 143` while `web` and `beta-web` were building in parallel
- production was then deployed successfully through host-level execution with `COMPOSE_PARALLEL_LIMIT=1`, building `web` and `beta-web` sequentially before `docker compose up -d --no-build` and proxy restart
- `bash scripts/healthcheck_stack.sh` passed after deploy
- `https://api.bookedai.au/api/health`, `https://tenant.bookedai.au/`, and `https://tenant.bookedai.au/future-swim` returned `200`
- live Playwright smoke passed on desktop and mobile: `Send login code` accessible name exists once, the old duplicated button name is absent, no horizontal overflow, `Access posture` and `Trust posture` are visible, raw `tenant_admin` and `Source 1.0.8` are absent from the page body, and the mobile Future Swim detail disclosure is visible
- post-polish Future Swim mobile body height measured roughly `7232px`, down from the prior roughly `7994px` local retained screenshot check, with no product console/page/request failures after filtering expected third-party teardown aborts
