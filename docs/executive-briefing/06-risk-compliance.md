# 06 - RISK & COMPLIANCE

```
═══════════════════════════════════════════════════════════
EXECUTIVE BRIEFING: Top Program Risks & Mitigation Status
Date: 2026-04-26 | Prepared for: COO / Board Risk Committee
═══════════════════════════════════════════════════════════
```

## BOTTOM LINE
4 structural risk clusters (`R1-R4`) đã identify trong seven-lane review `2026-04-26` với origin phase + resolution phase được anchor rõ ràng. 8 P0 đang đóng trong Sprint 19, 10 P1 distribute qua Sprint 19-22. Top open exposures: WhatsApp delivery (channel block), no GitHub Actions CI (release governance gap), service-layer monolith (multi-tenant safety risk), beta DB chưa fully isolated (pre-prod data risk). Compliance: Commercial & Compliance Checklist v1 sẽ ship trong Sprint 20.

## KEY FINDINGS
- **R1 - Portal continuity gap** (`P0-1`): origin Phase 7-8, resolution Phase 17 (`Sprint 19`). Portal `v1-*` snapshot 500 fix.
- **R2 - Channel parity asymmetry** (`P0-2, P0-3, P0-4, P1-2, P1-3`): origin Phase 3 + 7 (WhatsApp added trước shared `MessagingAutomationService`); resolution Phase 19. Telegram secret-token `closed live 2026-04-26`; WhatsApp posture decision recorded; outbound delivery vẫn block.
- **R3 - Service-layer monolith + tenant-scoping enforcement** (`P0-5, P1-4, P1-5`): origin Phase 7 (tenant workspace expansion vượt bounded-context split); resolution Phase 22 (`Sprint 22`). `BaseRepository` validator + chaos test required.
- **R4 - Operational hygiene + CI/CD gap** (`P0-6, P0-7, P0-8, P1-6`): origin Phase 6 + 9; resolution Phase 23. P0-7 checksum guard `closed 2026-04-26`; P0-8 OpenClaw rootless pending; P0-6 CI publication blocked bởi token scope.
- **AI agent safety**: high-risk actions (cancel, reschedule, payment) phải support approval, manual-review, hoặc policy gating. Không claim "instant cancellation, reschedule, payment, CRM, provider changes" trừ khi backend confirmed. Source: [prd.md](../../prd.md) §8 + §17.
- **Multi-tenant safety**: tenant isolation by default, audited admin support access, no silent cross-tenant mutation paths. Source: [prd.md](../../prd.md) §17.
- **WhatsApp customer-care policy**: `BookedAI WhatsApp Booking Care Agent` resolves identity by booking reference + safe phone/email match (không Telegram chat id alone), queues audited cancel/reschedule. Source: [project.md](../../project.md), [DESIGN.md](../../DESIGN.md).
- **Provider posture**: Twilio default, Meta blocked (`Account not registered`), Evolution off-path, Twilio creds `401 Authenticate`. Source: [implementation-progress.md](../development/implementation-progress.md).
- **HTML rendering / XSS hardening**: confirmation email rendering đã HTML-escape customer/provider-controlled values; mailto encoded; payment links phải `http`/`https`. Source: same doc.

## IMPLICATIONS
What this means for BookedAI:
- **Customer trust risk**: nếu agent claim payment collected khi backend chưa confirm, single incident có thể trigger refund + reputation loss.
- **Multi-tenant data leak risk**: chưa có `BaseRepository` validator → mỗi query thiếu `tenant_id` filter là tail-risk leak. Sprint 22 priority.
- **Release governance immature**: rely vào local script — nếu operator skip step, regression có thể vào prod. CI gate (P0-6) là critical.
- **Channel delivery liability**: WhatsApp outbound chưa verified production-ready; nếu tenant marketing mention WhatsApp follow-up, mismatch claim vs deliver.
- **Data privacy**: chưa documented GDPR/Australian Privacy Act posture trong docs reviewed.

## RECOMMENDED ACTIONS
1. **Close all 8 P0 trong Sprint 19** (no exceptions) — Engineering Lead — `2026-05-03`
2. **Resolve WhatsApp delivery blocker** (Meta Business verification or Twilio creds repair) — CTO + COO — `2026-04-30`
3. **Ship Commercial & Compliance Checklist v1** (T&C, refund, commission terms, data handling) — Legal + COO — Sprint 20 (`2026-05-10`)
4. **Implement `BaseRepository` tenant_id validator + chaos test** trong Sprint 22 — Backend Lead — `2026-05-24`
5. **Document Australian Privacy Act + tenant data residency posture** — Legal + CTO — `2026-05-31`
6. **Stand up observability stack** (Prometheus/Grafana/AlertManager + Discord/PagerDuty) cho real-time risk visibility — DevOps — Sprint 20

## RISKS & CONSIDERATIONS
- **OpenClaw root + Docker-socket scope** (P0-8) chưa reduce — operator agent có host-level access risk.
- **Beta DB shared với production** — rehearsal có thể accidentally mutate prod data nếu test data drift.
- **Webhook idempotency table** (P0-4) ship local, deploy live + evidence surfacing follow-up — duplicate webhook events có thể cause double-bookings.
- **AI hallucination risk** trong customer-care: status answers phải ground vào portal booking truth; không pretend retention won/payment cleared.
- **Single founder availability**: bus factor 1 cho cả product + engineering decisions trong sensitive risk topics.
- **No external audit yet**: pen test, SOC 2, ISO 27001 đều [not started] — sẽ block enterprise deals.

```
═══════════════════════════════════════════════════════════
Sources: full-stack-review-2026-04-26.md, prd.md, project.md,
DESIGN.md, qa-testing-reliability-ai-evaluation-strategy.md,
auth-rbac-multi-tenant-security-strategy.md,
source-code-review-and-security-hardening-2026-04-26.md,
implementation-progress.md
Confidence: HIGH (risk register có origin/resolution phase mapping; mitigations tracked với P0/P1 IDs)
═══════════════════════════════════════════════════════════
```
