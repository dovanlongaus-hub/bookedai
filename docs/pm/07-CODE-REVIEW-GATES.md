# BookedAI Code Review Gates (07)

Date: `2026-04-26`

Status: `active code review baseline`

Sources:
- [`release-gate-checklist.md`](../development/release-gate-checklist.md)
- [`source-code-review-and-security-hardening-2026-04-26.md`](../development/source-code-review-and-security-hardening-2026-04-26.md)
- [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md)
- [`backend-boundaries.md`](../development/backend-boundaries.md)
- [`api-architecture-contract-strategy.md`](../architecture/api-architecture-contract-strategy.md)

## 1. Gate Severity

| Severity | Meaning | Merge policy |
|---|---|---|
| `Blocker` | Production safety, tenant isolation, secret exposure, data loss, broken canonical journey | Must fix before merge/promote |
| `Major` | Regression risk, missing tests, broken architectural boundary, inaccessible flow | Fix before merge unless Product/PM explicitly accepts carried risk |
| `Minor` | Naming, doc clarity, small maintainability concern | May merge with owner follow-up |
| `Nit` | Style preference with no behavioral risk | Optional |

Review stance: findings first, ordered by severity, with file/line references where possible.

## 2. Universal Review Gates

| Gate ID | Gate | Required evidence | Blocks |
|---|---|---|---|
| `CRG-001` | Requirement traceability | PR/patch references `FR-*`, `NFR-*`, `US-*`, or documented source | Work with unclear scope |
| `CRG-002` | Canonical journey intact | `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up` still works where touched | Any surface touching search/booking/portal |
| `CRG-003` | Tests match risk | Unit/integration/E2E/UAT proportional to blast radius | Untested behavior change |
| `CRG-004` | Release gate impact known | `./scripts/run_release_gate.sh` or justified subset named | Runtime promote |
| `CRG-005` | Docs sync path known | Requirement-facing doc + implementation progress + sprint/roadmap closeout identified | Substantive product/runtime change |
| `CRG-006` | No secrets in repo/logs | Tokens, provider URLs with tokens, passwords, live credentials absent | Always |
| `CRG-007` | Customer copy safe | No internal jargon on customer surfaces (`queued`, `manual review`, `outbox`, `actor_context`) unless explicitly operator-facing | Customer UI |
| `CRG-008` | Rollback boundary clear | Smallest rollback path described | Live deploy |

## 3. Backend Review Gates

| Gate ID | Gate | Blocker examples | Source |
|---|---|---|---|
| `CRG-BE-001` | API -> service -> repository boundary preserved | New raw SQL in route handlers for tenant-scoped reads | [`backend-boundaries.md`](../development/backend-boundaries.md), [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `CRG-BE-002` | Tenant isolation enforced | Missing `tenant_id` filter, client-supplied tenant id trusted, cross-tenant mutation path | [`auth-rbac-multi-tenant-security-strategy.md`](../architecture/auth-rbac-multi-tenant-security-strategy.md) |
| `CRG-BE-003` | Webhook auth and replay safe | Missing Telegram secret check, missing Evolution HMAC, duplicate inbound side effects | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `CRG-BE-004` | Private-channel identity safe | Telegram chat id treated as booking identity | [`project.md`](../../project.md), [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `CRG-BE-005` | Lifecycle mutations are policy-gated | Instant cancel/reschedule/payment mutation without queued review or clear permission | [`prd.md`](../../prd.md) |
| `CRG-BE-006` | Error envelopes remain structured | Raw stack trace, missing CORS on error path, unhelpful customer failure | [`api-architecture-contract-strategy.md`](../architecture/api-architecture-contract-strategy.md) |
| `CRG-BE-007` | Dynamic HTML safely rendered | Unescaped customer/provider fields, unsafe CTA URL, unsafe provider URL | [`source-code-review-and-security-hardening-2026-04-26.md`](../development/source-code-review-and-security-hardening-2026-04-26.md) |
| `CRG-BE-008` | Service split follows bounded contexts | `tenant_app_service.py` grows further without tests or split plan | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |

## 4. Frontend Review Gates

| Gate ID | Gate | Blocker examples | Source |
|---|---|---|---|
| `CRG-FE-001` | Mobile no-overflow | Customer/admin/tenant surface scrolls horizontally at `390px` or `720px` breakpoint | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `CRG-FE-002` | Accessibility basics | Missing `aria-describedby` on required guidance, buttons below 44px, unlabeled table region | [`release-gate-checklist.md`](../development/release-gate-checklist.md#uiux-and-copy-gates-2026-04-26-review-addendum) |
| `CRG-FE-003` | State clarity | Confirmation hero fails to distinguish Stripe, QR transfer, manual review, pending | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `CRG-FE-004` | Surface consistency | Public/product/portal/tenant/admin diverge from approved brand and customer-outcome copy | [`project.md`](../../project.md), [`DESIGN.md`](../../DESIGN.md) |
| `CRG-FE-005` | A/B telemetry complete | Variant assignment without exposure event, local persistence, or metric definition | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `CRG-FE-006` | Pitch proof covered | Investor-facing pitch changes without Playwright desktop/mobile coverage | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |

## 5. Messaging / AI Review Gates

| Gate ID | Gate | Blocker examples | Source |
|---|---|---|---|
| `CRG-AI-001` | Search truth preserved | Tenant-positive result falls behind public fallback; wrong-domain tenant leak | [`release-gate-checklist.md`](../development/release-gate-checklist.md#search-replay-gate) |
| `CRG-AI-002` | Channel parity | Telegram supports controls but WhatsApp lacks equivalent path without documented gap | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `CRG-AI-003` | Internet expansion labelled | Public web results bypass BookedAI response flow or lack `public_web_search` labelling | [`project.md`](../../project.md) |
| `CRG-AI-004` | Reply controls safe | Inline buttons carry unsafe provider URL or wrong booking reference | [`source-code-review-and-security-hardening-2026-04-26.md`](../development/source-code-review-and-security-hardening-2026-04-26.md) |
| `CRG-AI-005` | Session continuity bounded | Channel-session stores compact shortlist/query/control state without leaking unrelated user data | [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) |

## 6. DevOps / Security Review Gates

| Gate ID | Gate | Blocker examples | Source |
|---|---|---|---|
| `CRG-OPS-001` | CI/release gate | `.github/workflows` missing required root gate or branch protection note | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `CRG-OPS-002` | Env baseline | `.env.production.example` drift not reflected in checksum guard | [`release-gate-checklist.md`](../development/release-gate-checklist.md) |
| `CRG-OPS-003` | Runtime privilege | OpenClaw/root/host Docker socket authority expanded without boundary review | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `CRG-OPS-004` | Beta isolation | Beta points at production database for destructive rehearsal | [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) |
| `CRG-OPS-005` | Observability | New critical runtime lacks health, trace, or operator-visible failure posture | [`devops-deployment-cicd-scaling-strategy.md`](../architecture/devops-deployment-cicd-scaling-strategy.md) |

## 7. Phase-Specific Gates

| Phase | Extra gates before close |
|---|---|
| `17` | Portal fresh reference green; mobile overflow zero; phone/email accessibility; pitch coverage plan |
| `18` | Agent action ledger states visible in tenant/admin; replay/idempotency evidence linked |
| `19` | Webhook auth/replay; shared `MessagingAutomationService`; Telegram/WhatsApp parity gap explicitly closed or carried |
| `20` | Widget tenant/origin/source identity protected; embed diagnostics and tenant install docs reviewed |
| `20.5` | Payment/wallet return preserves booking context; manual-review state clear |
| `21` | Billing summaries reconcile with real evidence; pricing/commission assumptions approved |
| `22` | Tenant template reuse verified; tenant validator chaos test; monolith split tests |
| `23` | CI, env checksum, OpenClaw authority boundary, image/rollback/health posture reviewed |

## 8. Review Output Template

```text
Findings:
- [Severity] [file:line] Issue, impact, recommended fix.

Open questions:
- ...

Test / evidence gaps:
- ...

Summary:
- What changed and why.
```

## Changelog

- `2026-04-26` initial code review gate catalog created for backend, frontend, AI/messaging, DevOps/security, and phase closeout reviews.
