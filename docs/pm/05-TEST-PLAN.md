# BookedAI Test Plan (05) — Unit / Integration / E2E / UAT

Date: `2026-04-26`

Status: `active test baseline`

Hợp nhất từ:
- [`qa-testing-reliability-ai-evaluation-strategy.md`](../architecture/qa-testing-reliability-ai-evaluation-strategy.md)
- [`bookedai-cross-industry-full-flow-test-pack.md`](../development/bookedai-cross-industry-full-flow-test-pack.md)
- [`release-gate-checklist.md`](../development/release-gate-checklist.md)
- [`search-truth-remediation-spec.md`](../development/search-truth-remediation-spec.md)
- [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md)
- [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md)

## 1. Test Strategy

Mục tiêu của test plan là bảo vệ canonical journey `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up` trên public web, product assistant, portal, tenant workspace, admin workspace, Telegram customer bot, WhatsApp path, và future widget runtime.

Nguyên tắc:

1. **Release gate trước promote**: mọi thay đổi runtime phải chạy `./scripts/run_release_gate.sh` hoặc documented subset có lý do rõ ràng. Source: [`release-gate-checklist.md`](../development/release-gate-checklist.md).
2. **Tenant-positive không được regress**: search replay tenant-positive cohort phải giữ `5/5 tenant_hit`; public fallback không được leak wrong-domain tenant result. Source: [`release-gate-checklist.md`](../development/release-gate-checklist.md#search-replay-gate).
3. **Private-channel identity safety**: Telegram/WhatsApp chỉ được load booking detail bằng booking reference hoặc safe phone/email match, không dùng chat id làm identity. Source: [`project.md`](../../project.md), [`release-gate-checklist.md`](../development/release-gate-checklist.md).
4. **Gap nào chưa có automation thì flag UAT/manual**: không claim coverage nếu repo chưa có test hoặc live evidence.

## 2. Test Levels

| Level | Purpose | Required examples | Owner |
|---|---|---|---|
| Unit | Validate bounded service/repository logic | booking reference generation, messaging policy, tenant validator, email HTML escaping | Backend / Frontend |
| Integration | Validate API + persistence + external-provider seams | `/api/chat/send`, `/api/webhooks/bookedai-telegram`, WhatsApp webhook, portal v1 snapshot | Backend / QA |
| E2E | Validate user-visible journeys in browser | homepage search, booking confirmation, portal reopen, admin smoke, tenant smoke | QA / Frontend |
| UAT | Validate persona workflows with evidence | customer booking agent, tenant admin, internal admin, Future Swim revenue loop | Product / QA / CS |
| Security | Validate tenant isolation, webhook auth, safe rendering | HMAC/secret token, provider URL allowlist, private-channel identity | Security / Backend |
| Performance | Validate runtime thresholds | cached matching p95, no hung request on mobile 3G | DevOps / Backend |
| Accessibility | Validate customer/operator surfaces | phone/email `aria-describedby`, 44px touch targets, table region labels | Frontend / QA |

## 3. Release Gate Commands

| ID | Command / gate | Required when | Source |
|---|---|---|---|
| `TC-GATE-001` | `./scripts/run_release_gate.sh` | Any backend/frontend/runtime promote | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `TC-GATE-002` | `RUN_SEARCH_REPLAY_GATE=true ./scripts/run_release_gate.sh` | Search ranking, catalog, fallback, public assistant changes | [`release-gate-checklist.md`](../development/release-gate-checklist.md#search-replay-gate) |
| `TC-GATE-003` | `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck` | Timestamped promote-or-hold artifact needed | [`release-gate-checklist.md`](../development/release-gate-checklist.md#rehearsal) |
| `TC-GATE-004` | `bash scripts/healthcheck_stack.sh` | After live deploy | [`project.md`](../../project.md), [`MEMORY.md`](../../MEMORY.md) |
| `TC-GATE-005` | `python3 scripts/customer_agent_uat.py` | Customer-agent channel changes when credentials exist | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |

## 4. Requirement-To-Test Matrix

| Test ID | Requirement refs | Type | Scenario | Acceptance | Source |
|---|---|---|---|---|---|
| `TC-001` | `FR-001`, `FR-010`, `NFR-080` | E2E | Public homepage search submits a service request and shows ranked BookedAI results | User can start search, inspect result, and proceed toward booking without console/page errors | [`01-MASTER-PRD.md`](01-MASTER-PRD.md), [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `TC-002` | `FR-010`, `FR-011` | Integration | `/api/chat/send` returns BookedAI-compatible response for customer search | Response includes matched services, suggested service id when available, and safe fallback state | [`project.md`](../../project.md) |
| `TC-003` | `FR-012`, `NFR-020` | E2E | Booking path creates `v1-*` booking reference and confirmation handoff | Reference is visible, portal URL is generated, and confirmation copy uses BookedAI support defaults | [`customer-booking-support-contact-defaults-2026-04-26.md`](../development/customer-booking-support-contact-defaults-2026-04-26.md) |
| `TC-004` | `FR-013`, `NFR-020` | Integration / E2E | Portal opens a fresh `v1-*` reference | Portal detail returns `200`; error paths use structured envelope + CORS | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `TC-005` | `FR-030`, `NFR-010` | Security | Public assistant rejects mismatched `actor_context.tenant_id` | Request returns `403` and no cross-tenant data appears | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `TC-006` | `FR-040`, `NFR-052` | Integration | Telegram webhook verifies secret token when configured | Missing/invalid token rejected; valid token processed once | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `TC-007` | `FR-041`, `NFR-052` | Integration | Evolution webhook verifies HMAC when configured | Missing/invalid signature rejected; valid signature accepted | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `TC-008` | `FR-042`, `NFR-022` | Integration / Security | Inbound webhook replay does not duplicate side effects | Same provider event id is processed once only | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `TC-009` | `FR-043`, `NFR-052` | Integration / UAT | Telegram `Book 1` path asks for customer contact/time before booking intent | Bot never creates intent without name plus email/phone and preferred time | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |
| `TC-010` | `FR-044`, `NFR-052` | Integration | WhatsApp mirrors Telegram identity-gate and queued cancel/reschedule policy | Identity-gate, queued cancel, queued reschedule, and Internet expansion covered at parity | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `TC-011` | `FR-050`, `NFR-022` | Unit / Integration | Agent lifecycle actions write auditable action records | Queued/sent/failed/manual_review/completed states are visible to operator surfaces | [`phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md`](../development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md) |
| `TC-012` | `FR-060`, `NFR-021` | Integration | Stripe/payment return URL remains booking-aware | Return lands customer on relevant booking/portal state; unsupported payment posture is clearly labelled | [`03-EXECUTION-PLAN.md`](03-EXECUTION-PLAN.md) |
| `TC-013` | `FR-070`, `NFR-030` | E2E / UAT | Tenant admin can inspect catalog, billing, team, and operations panels | Authenticated write-path UAT covers catalog edit, billing activation, and team controls | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `TC-014` | `FR-080`, `NFR-016` | E2E | Internal admin protected surfaces authenticate and render core workspaces | Overview, bookings, messaging, services, partners, tenants, config, tenant detail respond healthy | [`admin-live-uat-2026-04-26.md`](../development/admin-live-uat-2026-04-26.md) |
| `TC-015` | `FR-090`, `NFR-061` | DevOps | GitHub Actions runs root release gate on PR/main | CI blocks failed lint/typecheck/backend/frontend/image checks | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `TC-016` | `FR-100`, `NFR-013` | Security | Confirmation email rendering escapes dynamic fields and rejects unsafe CTA URLs | Script/HTML/image markup and `javascript:` URLs do not render as executable content | [`source-code-review-and-security-hardening-2026-04-26.md`](../development/source-code-review-and-security-hardening-2026-04-26.md) |
| `TC-017` | `FR-110`, `NFR-080` | Accessibility | Customer booking form labels and helper text are announced correctly | Email/phone fields use `aria-describedby`; touch targets >= 44px | [`release-gate-checklist.md`](../development/release-gate-checklist.md#uiux-and-copy-gates-2026-04-26-review-addendum) |
| `TC-018` | `FR-120`, `NFR-020` | E2E / Search replay | Tenant-positive search cohort remains perfect | `tenant_hit = 5/5`, `expectation_mismatches = 0`, no public fallback ahead of tenant | [`release-gate-checklist.md`](../development/release-gate-checklist.md#search-replay-gate) |
| `TC-019` | `FR-121`, `NFR-080` | E2E | Pitch deck renders desktop, mobile `390px`, and investor view | No blank render, no horizontal overflow, no missing proof sections | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `TC-020` | `FR-131`, `NFR-020` | UAT | Chess search ranks chess result above swim/generic class | `Kids Chess Class - Sydney Pilot` appears first for live-safe chess query | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |

## 5. Phase Test Gates

| Phase | Required test gates | Hold condition |
|---|---|---|
| `17` | `TC-001`, `TC-003`, `TC-004`, `TC-013`, `TC-017`, `TC-019` | Fresh portal reference fails; mobile overflow; missing pitch coverage |
| `18` | `TC-011`, ledger idempotency tests, tenant Ops evidence drawer UAT | Agent action visible in logs but not tenant/admin UI |
| `19` | `TC-006`, `TC-007`, `TC-008`, `TC-009`, `TC-010`, `TC-020` | Webhook replay duplicates side effects; WhatsApp parity missing |
| `20` | Widget identity, origin policy, embed smoke, tenant install diagnostics | Widget cannot preserve tenant/origin/source truth |
| `20.5` | `TC-012`, portal auto-login return, wallet-pass generation smoke | Payment return loses booking context |
| `21` | Billing summary, invoice, reconciliation, Tenant Revenue Proof UAT | No real tenant evidence for paid/outstanding/manual-review state |
| `22` | Tenant template reuse, SMS adapter, `BaseRepository` tenant validator chaos test | New vertical requires bespoke path or tenant validator misses drift |
| `23` | `TC-GATE-001` to `TC-GATE-004`, CI, env checksum, OpenClaw authority checks | Local-only release gate or privileged operator runtime remains unbounded |

## 6. Known Test Gaps

| Gap ID | Gap | Impact | Owner | Target |
|---|---|---|---|---|
| `TG-001` | Authenticated tenant write-path UAT is not complete for catalog edit, billing activation, and team controls | Tenant workspace cannot be claimed enterprise-ready | QA / Frontend | `2026-05-03` |
| `TG-002` | WhatsApp webhook tests do not yet mirror Telegram suite | Channel parity claim remains weak | Backend / QA | `2026-05-17` |
| `TG-003` | Pitch deck app lacks dedicated Playwright coverage | Investor surface can drift silently | QA / Frontend | `2026-05-17` |
| `TG-004` | Financial baseline tests for ARR/MRR/CAC/LTV do not exist because financial data model is not locked | CFO dashboard cannot be verified | CFO / Data | `2026-05-31` |
| `TG-005` | Performance thresholds are documented but not backed by continuous benchmark artifacts | p95 claims remain unverified | DevOps / Backend | `2026-05-31` |

## 7. Evidence And Sign-Off

Every completed test cycle should record:

- command(s) run
- environment (`local`, `beta`, `live`)
- commit or branch
- pass/fail
- artifact path if screenshots/reports were produced
- linked requirement IDs
- owner sign-off

Do not mark a UAT item passed from intent alone. It needs browser/API evidence or a clearly documented manual sign-off.

## Changelog

- `2026-04-26` initial PM test plan created with requirement-to-test matrix, phase gates, release gate commands, and explicit coverage gaps.
