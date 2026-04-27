# BookedAI Open Questions (09) — Leadership Decisions

Date: `2026-04-26`

Status: `active decision register`

Sources:
- [`project.md`](../../project.md)
- [`prd.md`](../../prd.md)
- [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md)
- [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md)
- [`pricing-packaging-monetization-strategy.md`](../architecture/pricing-packaging-monetization-strategy.md)
- [`release-gate-checklist.md`](../development/release-gate-checklist.md)
- [`devops-deployment-cicd-scaling-strategy.md`](../architecture/devops-deployment-cicd-scaling-strategy.md)

## Decision Priority

| Priority | Meaning |
|---|---|
| `P0` | Blocks Sprint 19/20 stabilization, release safety, or customer trust |
| `P1` | Blocks Phase 21/22 commercial proof or scale readiness |
| `P2` | Strategic decision needed before investor/customer packaging |

## OQ-001 — WhatsApp Active Provider Posture

- **Priority**: `P0`
- **Decision owner**: CTO + COO
- **Decision needed by**: `2026-04-30`
- **Question**: Should BookedAI treat Twilio as the default active WhatsApp provider until Meta Business verification is complete, with Evolution kept as compatibility/off-path?
- **Why it matters**: Channel parity cannot be claimed while WhatsApp outbound delivery is blocked or ambiguous.
- **Known facts**: Telegram customer bot is live; WhatsApp provider posture has involved Meta, Twilio, and Evolution, with blockers noted in review. Source: [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md), [`project.md`](../../project.md).
- **Options**:
  - `A`: Twilio default now, Meta later, Evolution inbound compatibility only.
  - `B`: Wait for Meta verification before claiming WhatsApp production support.
  - `C`: Keep Evolution QR bridge as interim production channel.
- **Recommendation**: `A`, because it gives one accountable provider path while preserving future Meta migration.
- **Confidence**: MEDIUM. Provider credentials and commercial terms need live verification.

## OQ-002 — P0 Feature Freeze Scope

- **Priority**: `P0`
- **Decision owner**: CEO + VP Engineering + Product/PM
- **Decision needed by**: `2026-04-27`
- **Question**: Should Sprint 19 freeze new product features until P0-1 through P0-8 are closed or explicitly waived?
- **Why it matters**: Portal continuity, webhook replay, tenant validation, CI, env baseline, and OpenClaw authority are release-safety concerns.
- **Known facts**: Seven-lane review names 8 P0 items that must close before `2026-05-03`. Source: [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md).
- **Options**:
  - `A`: Full P0 freeze.
  - `B`: Allow only work that directly closes P0/P1 or test coverage.
  - `C`: Continue feature work with explicit carried risk.
- **Recommendation**: `B`, because some P1 work such as accessibility and admin responsive layout reduces release risk.
- **Confidence**: HIGH.

## OQ-003 — Pricing Tier Names And Commission Baseline

- **Priority**: `P1`
- **Decision owner**: CFO + CRO + CEO
- **Decision needed by**: `2026-05-17`
- **Question**: What public tier names, setup-fee bands, SaaS subscription prices, and performance/commission rates should Phase 21 implement?
- **Why it matters**: Billing, invoices, tenant Revenue Proof, and investor deck cannot finalize without the commercial contract model.
- **Known facts**: Current docs name setup fee + ongoing commission/performance pricing, and public vocabulary `Freemium`, `Pro`, `Pro Max`, `Advance Customize`. Source: [`pricing-packaging-monetization-strategy.md`](../architecture/pricing-packaging-monetization-strategy.md), [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md).
- **Options**:
  - `A`: Keep `Freemium / Pro / Pro Max / Advance Customize`.
  - `B`: Reframe to SME segment names such as `Solo / Growing studio / Clinic / Enterprise`.
  - `C`: Keep tier names internal and launch with custom quotes only.
- **Recommendation**: `A` for continuity unless GTM research shows SME segment names convert better.
- **Confidence**: MEDIUM. No verified conversion or willingness-to-pay data in repo.

## OQ-004 — First Investor Reference Tenant

- **Priority**: `P1`
- **Decision owner**: CEO + CPO + CRO
- **Decision needed by**: `2026-05-10`
- **Question**: Should Future Swim be the first revenue-loop reference, while Co Mai Hung Chess remains the first connected-agent vertical proof?
- **Why it matters**: The deck and homepage need one clean evidence story rather than mixing activation proof with revenue proof.
- **Known facts**: Roadmap identifies Future Swim as first real revenue loop; PRD and customer-agent UAT use chess as connected-agent proof. Source: [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md), [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md).
- **Options**:
  - `A`: Future Swim = revenue proof, Chess = AI agent vertical proof.
  - `B`: Chess becomes both revenue and AI proof.
  - `C`: Wait for third tenant.
- **Recommendation**: `A`.
- **Confidence**: HIGH for positioning; MEDIUM for revenue evidence until Future Swim loop is captured.

## OQ-005 — Tenant Revenue Proof Dashboard Metric Set

- **Priority**: `P1`
- **Decision owner**: CFO + Product/PM + Data
- **Decision needed by**: `2026-05-17`
- **Question**: Which metrics must appear in the first Tenant Revenue Proof dashboard: booked revenue, at-risk revenue, outstanding payment, portal reopen, follow-up state, commission estimate, or all of the above?
- **Why it matters**: Dashboard scope controls Phase 21 build effort and investor proof quality.
- **Known facts**: Current North Star is `qualified enquiries that become traceable booking references with follow-up posture`. Source: [`project.md`](../../project.md), [`analytics-metrics-revenue-bi-strategy.md`](../architecture/analytics-metrics-revenue-bi-strategy.md).
- **Recommendation**: Start with booking references, payment/receivable posture, follow-up posture, portal reopen, and owner action required; add commission estimate only after pricing baseline is approved.
- **Confidence**: MEDIUM. Financial source data is not fully locked.

## OQ-006 — Beta Database Isolation

- **Priority**: `P1`
- **Decision owner**: DevOps + CTO
- **Decision needed by**: `2026-05-24`
- **Question**: Should production beta use a dedicated beta database or snapshot-restored copy before destructive rehearsal is allowed?
- **Why it matters**: Shared production DB prevents safe rehearsal of migrations and rollback.
- **Known facts**: Seven-lane review flags production beta DB sharing as operational risk. Source: [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md).
- **Recommendation**: Dedicated beta database with repeatable snapshot restore.
- **Confidence**: HIGH.

## OQ-007 — OpenClaw Operator Authority Boundary

- **Priority**: `P0`
- **Decision owner**: CTO + DevOps Security
- **Decision needed by**: `2026-05-03`
- **Question**: What host-level commands should the operator Telegram/OpenClaw path be allowed to run after rootless/scoped mount hardening?
- **Why it matters**: The operator bot has deployment/host-shell implications and must remain separate from customer-facing `BookedAI Manager Bot`.
- **Known facts**: Repo memory and project docs separate customer bot from operator tooling; review flags root + Docker socket risk. Source: [`project.md`](../../project.md), [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md).
- **Recommendation**: Allow only documented deploy/health/doc-sync commands by default; host-shell requires explicit allowlist and audit log.
- **Confidence**: HIGH.

## OQ-008 — Compliance And Due-Diligence Checklist Owner

- **Priority**: `P1`
- **Decision owner**: COO + Security + CEO
- **Decision needed by**: `2026-05-10`
- **Question**: Who owns the consolidated compliance checklist covering Privacy Act, WhatsApp/Telegram terms, PCI scope, tenant isolation, support access, and data retention?
- **Why it matters**: First paid customer and investor due diligence need one source instead of scattered architecture notes.
- **Known facts**: Full-stack review calls this out as a corporate/business gap. Source: [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md).
- **Recommendation**: COO accountable, Security responsible, CFO consulted for PCI/payment scope.
- **Confidence**: MEDIUM. Legal/compliance counsel input is not documented.

## OQ-009 — Hiring / Capacity Before Phase 22

- **Priority**: `P2`
- **Decision owner**: CEO + VP Engineering
- **Decision needed by**: `2026-05-17`
- **Question**: Should BookedAI add part-time QA/DevOps/backend capacity before Phase 22 multi-tenant template generalization?
- **Why it matters**: Current P0/P1 backlog, release gate, messaging, tenant proof, and DevOps hardening concentrate risk in a small founder-led team.
- **Known facts**: Executive briefing and review indicate bus-factor risk, but no capacity model is documented. Source: [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md).
- **Recommendation**: Add fractional QA/UAT plus DevOps support before Phase 22; consider backend contractor only for bounded tenant-service split.
- **Confidence**: LOW-MEDIUM. Actual budget and team capacity are not documented.

## OQ-010 — SMS / Apple Messages Timing

- **Priority**: `P2`
- **Decision owner**: CPO + CTO
- **Decision needed by**: `2026-05-24`
- **Question**: Should SMS and Apple Messages remain post-Phase 22, or should SMS adapter enter Sprint 22 as planned?
- **Why it matters**: Omnichannel claim should not outpace actual adapter/test coverage.
- **Known facts**: `DESIGN.md` references SMS/Apple Messages as future channels; roadmap includes SMS adapter in Phase 22. Source: [`DESIGN.md`](../../DESIGN.md), [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md).
- **Recommendation**: Ship SMS only if Telegram/WhatsApp parity and webhook idempotency are already green; keep Apple Messages post-22.
- **Confidence**: MEDIUM.

## OQ-011 — Canonical Architecture Layer Map

- **Priority**: `P1`
- **Decision owner**: Architecture + Product/PM + CTO
- **Decision needed by**: `2026-05-10`
- **Question**: Which layer map is canonical for all future architecture, PM, executive, and onboarding documents?
- **Why it matters**: Existing docs use conflicting six-layer maps, which makes onboarding and review slower and increases the chance that teams optimize different boundaries.
- **Known facts**: ArchiMate review found conflicting layer models between `system-overview.md` and `solution-architecture-master-execution-plan.md`. Source: [`12-architecture-review-findings.md`](../architecture/archimate/12-architecture-review-findings.md).
- **Options**:
  - `A`: Adopt `Experience / Application / Domain / Data / Integration / Platform`.
  - `B`: Adopt `Experience / Application / Data / Intelligence / Automation / Platform`.
  - `C`: Adopt ArchiMate layered vocabulary as the canonical external map and keep implementation maps as internal views.
- **Recommendation**: `A` for engineering execution, with ArchiMate docs as the governance view.
- **Confidence**: MEDIUM. Needs CTO/architecture sign-off.

## OQ-012 — Observability Error Tracker Choice

- **Priority**: `P1`
- **Decision owner**: DevOps + Security + CTO
- **Decision needed by**: `2026-05-17`
- **Question**: Which error tracker should BookedAI standardize on for the first observability baseline?
- **Why it matters**: Prometheus metrics and structured logs cover symptoms, but exception grouping and alert ownership need a single tool.
- **Known facts**: Current docs call out no metrics/logs/traces stack and no Prometheus/Grafana/AlertManager stack. Source: [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md), [`12-architecture-review-findings.md`](../architecture/archimate/12-architecture-review-findings.md).
- **Options**:
  - `A`: Sentry for backend/frontend exception grouping.
  - `B`: Self-hosted OpenTelemetry collector + later error backend.
  - `C`: Start with structured logs only and defer error tracker.
- **Recommendation**: `A`, unless cost or data-residency review blocks it.
- **Confidence**: MEDIUM.

## 2. Decision Log Template

```text
Decision ID:
Date decided:
Decision:
Owner:
Impact on FR/NFR/Phase:
Docs updated:
Carried risk:
```

## 3. Current Blocking Summary

| Blocks | Questions |
|---|---|
| Sprint 19 promote confidence | `OQ-001`, `OQ-002`, `OQ-007` |
| Phase 21 billing/revenue proof | `OQ-003`, `OQ-005` |
| Investor/customer due diligence | `OQ-004`, `OQ-008` |
| Architecture/observability governance | `OQ-011`, `OQ-012` |
| Phase 22 scale | `OQ-006`, `OQ-009`, `OQ-010` |

## Changelog

- `2026-04-26` added canonical layer-map and observability error-tracker decisions to support the Top 5 architecture recommendations.
- `2026-04-26` initial leadership decision register created with owners, dates, options, recommendations, confidence levels, and source links.
