# BookedAI UAT Checklist (06) — Persona x Journey

Date: `2026-04-26`

Status: `active UAT baseline`

Sources:
- [`admin-live-uat-2026-04-26.md`](../development/admin-live-uat-2026-04-26.md)
- [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md)
- [`portal-bookedai-uat-ab-investor-review-2026-04-26.md`](../development/portal-bookedai-uat-ab-investor-review-2026-04-26.md)
- [`homepage-full-uat-ab-testing-2026-04-25.md`](../development/homepage-full-uat-ab-testing-2026-04-25.md)
- [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md)
- [`bookedai-cross-industry-full-flow-test-pack.md`](../development/bookedai-cross-industry-full-flow-test-pack.md)

## 1. UAT Rule

UAT pass requires evidence, not just implementation completion. Evidence can be:

- Playwright trace/screenshot/report path
- API probe output captured in a development note
- live browser observation with exact URL and timestamp
- operator sign-off in Notion/Discord closeout

All dates below are anchored from `2026-04-26`.

## 2. Persona Coverage

| Persona | Primary workflow | Required surfaces | Current confidence |
|---|---|---|---|
| `Customer` | Search, compare, book, confirm, reopen portal, ask for help | public/product, portal, Telegram, WhatsApp later | MEDIUM |
| `Tenant Admin` | Review demand, catalog, booking, billing, team, Ops | tenant workspace | MEDIUM-LOW |
| `Internal Operator` | Monitor bookings, tenants, messaging, reliability, config | admin workspace | HIGH |
| `Founder/Investor` | See proof of revenue engine and roadmap credibility | homepage, pitch, briefing, dashboards | MEDIUM |
| `Customer Success` | Handle support, changes, cancellation, follow-up posture | portal, admin, messaging | MEDIUM |

## 3. Customer UAT

| UAT ID | Scenario | Steps | Expected result | Status | Source |
|---|---|---|---|---|---|
| `UAT-CUS-001` | Homepage search to ranked results | Open `bookedai.au`, submit service query, inspect result list | Ranked BookedAI results appear; no wrong-domain tenant leak; no console errors | Needs recurring gate | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `UAT-CUS-002` | Chess class live-safe search | Submit `Find a chess class in Sydney this weekend` through web chat | `Kids Chess Class - Sydney Pilot` ranks first | Passed `2026-04-26`; keep in gate | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |
| `UAT-CUS-003` | Booking intent capture | Choose `Book 1`, provide name + email/phone + preferred time | Booking intent/reference created only after required contact/time data exists | Passed for guarded behavior; repeat after messaging changes | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |
| `UAT-CUS-004` | Confirmation support posture | Complete booking path and review confirmation email/copy | Customer-facing support defaults use `info@bookedai.au` and `+61455301335` | Passed after support default alignment | [`customer-booking-support-contact-defaults-2026-04-26.md`](../development/customer-booking-support-contact-defaults-2026-04-26.md) |
| `UAT-CUS-005` | Portal reopen by fresh `v1-*` reference | Create fresh reference, open portal detail page | Detail returns `200`; status/action controls visible | Must run each release | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `UAT-CUS-006` | Portal status-first actions | Open `portal_variant=status_first`, inspect action order | `Status / Pay / Reschedule / Ask for help / Change plan / Cancel` visible | Passed live `2026-04-26`; keep A/B telemetry | [`portal-bookedai-uat-ab-investor-review-2026-04-26.md`](../development/portal-bookedai-uat-ab-investor-review-2026-04-26.md) |
| `UAT-CUS-007` | Telegram message webhook | Send service-search update to `/api/webhooks/bookedai-telegram` | `200`, `messages_processed=1`, safe reply controls | Passed `2026-04-26`; rerun after bot changes | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |
| `UAT-CUS-008` | Telegram callback acknowledgement | Tap inline `Book 1` or `Find more` callback | Callback is acknowledged before normal reply path | Passed after fix | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |
| `UAT-CUS-009` | WhatsApp parity | Repeat identity-gate, queued cancel, queued reschedule, Internet expansion | WhatsApp behavior matches Telegram policy and sender identity | Gap; target `2026-05-17` | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |

## 4. Tenant Admin UAT

| UAT ID | Scenario | Steps | Expected result | Status | Source |
|---|---|---|---|---|---|
| `UAT-TEN-001` | Tenant gateway preview | Open Future Swim and Co Mai Hung tenant preview on desktop/mobile | Preview shell renders without horizontal overflow | Passed partial live `2026-04-26` | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `UAT-TEN-002` | Tenant authenticated login | Login as tenant admin through email-code or configured credential | Tenant-specific workspace renders; no cross-tenant data | Partial; follow-up required | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `UAT-TEN-003` | Catalog edit path | Edit a service/catalog record and verify persistence | Update persists and audit trail exists | Gap; target `2026-05-03` | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `UAT-TEN-004` | Billing activation | Configure or inspect billing activation state | Billing posture is real, not placeholder copy | Gap; target Phase 21 | [`03-EXECUTION-PLAN.md`](03-EXECUTION-PLAN.md) |
| `UAT-TEN-005` | Team controls | Invite/remove/update tenant team member | Action respects tenant role and audit policy | Gap; target `2026-05-03` | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `UAT-TEN-006` | Tenant Ops action ledger | Open queued/sent/failed/manual_review/completed events | Operator can trace action to booking/customer/channel | Planned Phase 18 | [`phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md`](../development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md) |
| `UAT-TEN-007` | Future Swim revenue proof loop | Trace lead -> booking -> payment posture -> follow-up -> tenant evidence | One real evidence pack suitable for SME/investor reference | Gap; target `2026-05-10` | [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md) |

## 5. Internal Admin UAT

| UAT ID | Scenario | Steps | Expected result | Status | Source |
|---|---|---|---|---|---|
| `UAT-ADM-001` | Admin authenticated shell | Login to `admin.bookedai.au/admin` and load overview | Health and authenticated APIs respond | Passed `2026-04-26` | [`admin-live-uat-2026-04-26.md`](../development/admin-live-uat-2026-04-26.md) |
| `UAT-ADM-002` | Admin workspace navigation | Open overview, bookings, messaging, services, partners, tenants, config, tenant detail | All core workspaces render healthy responses | Passed `2026-04-26` | [`admin-live-uat-2026-04-26.md`](../development/admin-live-uat-2026-04-26.md) |
| `UAT-ADM-003` | Admin booking responsive layout | Test booking table/card below `720px` and at `390px` | No forced horizontal scroll; table has accessible region label | Partial closed; keep release gate | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `UAT-ADM-004` | Reliability language | Inspect Reliability surfaces | Customer/operator copy avoids implementation jargon on customer surfaces | Passed after copy polish; keep grep gate | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `UAT-ADM-005` | Customer-agent health | Open protected customer-agent health endpoint with valid admin token | Health returns `200` and recent channel state | Passed live `2026-04-26`; rerun after messaging changes | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |

## 6. Investor / Founder UAT

| UAT ID | Scenario | Steps | Expected result | Status | Source |
|---|---|---|---|---|---|
| `UAT-INV-001` | Homepage proof narrative | Review hero, proof chips, search shortcut previews | Customer-outcome copy leads; proof verticals are concrete | Passed with later shortcut update; keep smoke | [`homepage-shortcut-fast-preview-2026-04-26.md`](../development/homepage-shortcut-fast-preview-2026-04-26.md) |
| `UAT-INV-002` | Pitch deck render | Open pitch surface at desktop, mobile `390px`, and `1440px` | No blank sections; no overflow; proof narrative visible | Gap; target `2026-05-17` | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `UAT-INV-003` | Tenant Revenue Proof | Inspect one tenant dashboard for won/at-risk/requires-action revenue | Real evidence, not mock-only metrics | Gap; target `2026-05-24` | [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md) |
| `UAT-INV-004` | Commercial/compliance checklist | Review privacy, channel provider, PCI scope, tenant isolation posture | Checklist exists with owners and gaps | Gap; target `2026-05-10` | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |

## 7. UAT Sign-Off Template

Use this compact template per UAT run:

```text
UAT ID:
Date:
Environment:
Build / commit:
Tester:
Persona:
Evidence path / URL:
Result: PASS | FAIL | PARTIAL | BLOCKED
Notes:
Follow-up owner:
```

## 8. Open UAT Gaps

| Gap | Blocker | Owner | Target |
|---|---|---|---|
| Authenticated tenant write-path coverage | Email-code/login + write scenarios not fully evidenced | QA / Frontend | `2026-05-03` |
| WhatsApp parity UAT | Provider posture and inline controls not fully live | Backend / Chat / QA | `2026-05-17` |
| Pitch deck Playwright UAT | No dedicated coverage today | QA / Frontend | `2026-05-17` |
| Tenant Revenue Proof UAT | Dashboard and evidence model planned for Phase 21 | Product / Data / CFO | `2026-05-24` |
| Compliance checklist UAT | No consolidated audit doc yet | COO / Security | `2026-05-10` |

## Changelog

- `2026-04-26` initial UAT checklist created across customer, tenant, admin, investor/founder, and support workflows.
