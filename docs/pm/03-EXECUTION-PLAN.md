# BookedAI Execution Plan (03) — Phases 0-23 + Post-22 Horizon

> ## DATE RE-ANCHOR — 2026-04-27
>
> The dates in the body of this document reflect the original PM pack publication on `2026-04-26`. **The new authoritative date anchors are**:
>
> - **Phase 0 start**: `2026-04-11`
> - **M-01 Chess+Swim demo**: `2026-04-29`
> - **M-02 GO-LIVE LOCK**: `2026-04-30`
> - **Final phase end (Phase 23)**: `2026-06-07`
> - **Total project duration**: 8 weeks (58 days)
> - **Post-go-live cadence**: weekly (Mon→Sun)
>
> **For the canonical phase timeline, Gantt, and per-phase detail, read [`roadmap-synced/01-MASTER-ROADMAP-SYNCED.md`](./roadmap-synced/01-MASTER-ROADMAP-SYNCED.md)** as Single Source of Truth from this date forward.
>
> **For implementation/fix plan to hit go-live**, read [`roadmap-synced/08-IMPLEMENT-FIX-PLAN.md`](./roadmap-synced/08-IMPLEMENT-FIX-PLAN.md).
>
> **For Vision/Target/Milestones**, read [`roadmap-synced/04-VISION-TARGET-MILESTONES.md`](./roadmap-synced/04-VISION-TARGET-MILESTONES.md).
>
> The dates listed in the body sections below are RETAINED for historical traceability but are SUPERSEDED by the synced pack.

Date: `2026-04-26` (today). Status: `active execution baseline`.

Hợp nhất từ:
- [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md) (canonical)
- [`implementation-phase-roadmap.md`](../architecture/implementation-phase-roadmap.md)
- [`coding-implementation-phases.md`](../architecture/coding-implementation-phases.md)
- [`current-phase-sprint-execution-plan.md`](../architecture/current-phase-sprint-execution-plan.md)
- [`next-phase-implementation-plan-2026-04-25.md`](../development/next-phase-implementation-plan-2026-04-25.md)
- [`phase-execution-operating-system-2026-04-26.md`](../development/phase-execution-operating-system-2026-04-26.md)
- [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md)

## 1. Quy ước Phase Gate

Mỗi phase phải đóng đủ 10 cổng (theo [phase-execution-operating-system-2026-04-26.md](../development/phase-execution-operating-system-2026-04-26.md)):

1. Requirement baseline updated
2. Implementation complete (hoặc carried risk được ghi rõ)
3. Automated verification passed
4. UAT evidence captured
5. Live deploy completed (khi runtime thay đổi)
6. Live smoke passed sau deploy
7. `implementation-progress.md` updated
8. Roadmap/sprint document updated
9. Notion + Discord closeout published khi operator-visible
10. Next phase opened với owners/blockers/acceptance gates

## 2. Phase Index Snapshot

Quy ước: Phase `0`-`9` là baseline đã ship phần lớn; Phase `17`-`23` là active execution lane từ `2026-04-26`. Phase 10-16 không được tách riêng trong roadmap mới — `Sprint 11-16` map vào Phase `7`-`9`.

| Phase | Theme | Status | Sprint coverage | Start | End |
|---|---|---|---|---|---|
| `0` | Narrative & architecture reset | done baseline | Sprint 1 | (historical) | 2025-Q4 closed |
| `1` | Public growth & premium landing rebuild | implemented baseline | Sprint 2-3 | (historical) | closed |
| `2` | Commercial data foundation | partial foundation | Sprint 4 carry | (historical) | carry → Phase 21 |
| `3` | Multi-channel capture & conversion engine | strongest active lane | Sprint 4, 6 | (historical) | active |
| `4` | Revenue workspace & reporting | partial | Sprint 5, 9 | (historical) | active |
| `5` | Recovery, payments, commission ops | partial foundation | Sprint 7, 9 | (historical) | active |
| `6` | Optimization, evaluation, scale hardening | partially active | Sprint 6, 10 | (historical) | active |
| `7` | Tenant revenue workspace | foundation implemented | Sprint 8, 9, 11, 12 | (historical) | active |
| `8` | Internal admin optimization & support | foundation implemented | Sprint 10, 13, 14 | (historical) | active |
| `9` | QA, release discipline, scale hardening | partially active | Sprint 15, 16 | (historical) | active |
| `17` | Full-flow stabilization | active | Sprint 17, 19 overlay | 2026-04-13 | 2026-05-03 |
| `18` | Revenue-ops ledger control | partially active | Sprint 18, 19 overlay | 2026-04-20 | 2026-05-10 |
| `19` | Customer-care & status agent | started, parity gaps | Sprint 19, 20, 21 overlay | 2026-04-27 | 2026-05-17 |
| `20` | Widget & plugin runtime | planned | Sprint 20 | 2026-05-04 | 2026-05-10 |
| `20.5` | Wallet & Stripe return continuity | planned | Sprint 20.5 | 2026-05-04 | 2026-05-17 |
| `21` | Billing, receivables, subscription truth | scaffolds exist | Sprint 21 overlay | 2026-05-11 | 2026-05-24 |
| `22` | Multi-tenant template generalization | planned | Sprint 22 overlay | 2026-05-18 | 2026-05-24 |
| `23` | Release governance & scale hardening | hardening required | Sprint 19-22 overlays | 2026-04-27 | 2026-05-31 |
| `S23-cand` | Vertical Expansion (post-22) | indicative | Sprint 23 | 2026-05-25 | 2026-05-31 |
| `S24-cand` | Investor & Compliance Closeout | indicative | Sprint 24 | 2026-06-01 | 2026-06-07 |

## 3. Active Sprint Cadence (Sprint 19-22)

| Sprint | Dates | Theme | Phase target |
|---|---|---|---|
| `Sprint 19` | `2026-04-27 → 2026-05-03` | Stabilize and Sign — close all P0 from review | 17, 19, 23 |
| `Sprint 20` | `2026-05-04 → 2026-05-10` | First Real Revenue Loop — Future Swim trace + first A/B wave | 17, 19, 21, 23 |
| `Sprint 21` | `2026-05-11 → 2026-05-17` | Refactor & Coverage | 19, 22, 23 |
| `Sprint 22` | `2026-05-18 → 2026-05-24` | Multi-tenant & Multi-channel | 19, 20, 21, 22, 23 |
| `Sprint 23` (cand) | `2026-05-25 → 2026-05-31` | Vertical Expansion | post-22 |
| `Sprint 24` (cand) | `2026-06-01 → 2026-06-07` | Investor & Compliance Closeout | post-22 |

---

## 3A. Top 5 Recommendation Execution Mapping

Nguồn: [12-architecture-review-findings.md](../architecture/archimate/12-architecture-review-findings.md) §E.

| Recommendation | Execution owner | Phase / sprint | Acceptance gate |
|---|---|---|---|
| Close schema normalization wave for `bookings`, `payments`, `audit_outbox`, `tenants` with dual-write | Backend + Data | Phase `18` / Sprint `20` (`2026-05-04 -> 2026-05-10`) | New normalized tables exist; writes dual-write from legacy `conversation_events` path; read parity query proves no customer-visible drift |
| Split frontend build artifacts for public/admin/portal | Frontend + DevOps | Phase `23` / Sprint `21` (`2026-05-11 -> 2026-05-17`) | CI/release gate builds separate artifacts; each artifact has its own smoke lane and rollback target |
| Centralize permission registry in `backend/security/permissions.py` | Backend Security | Phase `19` + `22` / Sprint `21` | Tenant/admin permissions resolve from one registry; route-level checks stop duplicating ad hoc role strings; mismatch tests return `403` |
| Ship observability baseline: Prometheus + structured logs + error tracker | DevOps + Security | Phase `23` / Sprint `22-23` (`2026-05-18 -> 2026-05-31`) | `/metrics` or equivalent exporter live; logs are JSON with trace/request ids; error tracker receives backend/frontend exceptions |
| Consolidate docs around one canonical layer map | Architecture + Product/PM | Phase `23` / Sprint `20` (`2026-05-04 -> 2026-05-10`) | One layer map is declared canonical; `system-overview.md`, target/platform docs, and new PM/architecture docs reference it consistently |

---

## 4. Phase Detail (Active phases 17-23)

### Phase 17 — Full-Flow Stabilization

- **Theme**: Lock UI/UX, search, booking, confirmation, QR/portal stability + mobile no-overflow at 390px.
- **Target plateau**: Canonical journey `Chat/Ask → Search/Match → Preview/Compare → Select → Book → Confirm/Payment posture → Portal/Thank You → Calendar/CRM/email/messaging → Customer care` xanh trên public + product + portal + tenant + admin + pitch.
- **Start**: `2026-04-13` (Sprint 17 mở). **End**: `2026-05-03` (Sprint 19 đóng).
- **Entry criteria**:
  - Sprint 16 release-hardening closeout đã ký.
  - Public + tenant + admin baseline shells live.
  - Cross-industry test pack `016` applied (10 scenarios verified).
- **Exit criteria**:
  - All P0 từ full-stack review (P0-1..P0-8) closed.
  - Portal `v1-*` UAT green; admin booking responsive ≤720px shipped.
  - Pitch deck Playwright coverage live.
  - QW-1..QW-8 quick-wins verified through release gate.
  - Future Swim Miranda URL hotfix migration `020` applied (P1-9).
- **Deliverables** (owner):
  - Portal v1-* snapshot 500 fix (Backend) — closed
  - Admin responsive ≤720px (Frontend) — partial 2026-04-26
  - PitchDeckApp.tsx Playwright coverage (QA) — Sprint 21 close
  - Phone `aria-describedby` (Frontend) — closed 2026-04-26
  - QW-1..QW-8 inline copy upgrade (Content/Frontend) — closed 2026-04-26
  - Wallet/Stripe return URL canonicalization (Backend) — Phase 20.5
- **Dependencies**: Phase 0-9 baselines.
- **Risks + mitigations**:
  - R: Pitch coverage trượt → M: dùng frontend code-split risk to shift vào Sprint 21.
  - R: Future Swim URL hotfix chưa apply → M: migration 020 included trong Sprint 19/20 release.
- **Sign-off RACI**: R=Frontend lead + Backend lead, A=Product/PM, C=QA + DevOps + Design, I=GTM + Customer Success.

### Phase 18 — Revenue-Ops Ledger Control

- **Theme**: Mọi post-booking action inspectable, replay-safe, policy-gated, visible cho tenant + admin.
- **Start**: `2026-04-20`. **End**: `2026-05-10`.
- **Entry criteria**:
  - Phase 17 stabilization >= 80% closed.
  - `agent_action_runs` table và Reliability ledger backend live.
- **Exit criteria**:
  - Ledger filters by tenant/booking/student/lifecycle event/status/dependency state live.
  - Tenant Ops panel hiển thị queued/sent/failed/manual_review/completed.
  - Operator evidence drawers cho outbox/audit/job-run/CRM/payment/webhook traces.
  - Policy metadata cho auto-run vs approve-first actions.
  - Schema normalization wave lands for `bookings`, `payments`, `audit_outbox`, and `tenants`, with dual-write from legacy event paths and read-parity evidence.
- **Deliverables**:
  - Tenant Ops UI panel (Frontend)
  - Admin Reliability filter expansion (Frontend + Backend)
  - Action ledger DTO + repository (Backend)
  - Idempotency evidence link (Backend) — depends on P0-4 webhook idempotency table.
  - Dual-write migration plan + read-parity report for normalized revenue tables (Backend + Data)
- **Dependencies**: Phase 17 P0-4 idempotency live.
- **Risks**: R: Tenant_id validator chưa ship → M: defer cross-tenant queries tới Phase 22.
- **Sign-off**: R=Backend lead, A=Product/PM, C=Frontend + Security, I=GTM.

### Phase 19 — Customer-Care & Status Agent (Messaging Automation Layer)

- **Theme**: Một chính sách booking-care chia sẻ across web chat / Telegram / WhatsApp / SMS-email-later, với `BookedAI Manager Bot` brand; HMAC verification + idempotency + tenant_id validator.
- **Start**: `2026-04-27`. **End**: `2026-05-17` (Sprint 21 overlay close).
- **Entry criteria**:
  - Phase 17 stabilization signed-off.
  - Telegram + WhatsApp + Web chat baseline live.
  - `MessagingAutomationService` shared layer landed (2026-04-26).
- **Exit criteria**:
  - One normalized message envelope across all 4 channels.
  - Identity resolution by email/phone/booking-ref/signed portal session.
  - Intent capture: booking, payment help, reschedule, cancel, follow-up, support, retention.
  - Queued, request-safe mutations only.
  - Chess academy parent status flow proof complete.
  - P0-2 WhatsApp provider posture decided (Twilio default — closed 2026-04-26).
  - P0-3 Telegram secret-token + Evolution HMAC live (closed 2026-04-26).
  - P0-4 webhook idempotency live deployed.
  - P0-5 actor_context.tenant_id validator live.
  - `backend/security/permissions.py` created as the canonical permission registry for tenant/customer/admin action checks touched by Phase 19.
  - P1-2 WhatsApp inline action controls + brand alignment.
  - P1-3 WhatsApp webhook test parity with Telegram suite.
  - P1-10 channel-aware email templates.
- **Deliverables**: Shared messaging service refactor; HMAC + idempotency + validator; channel-specific test parity; chess parent status proof flow.
- **Dependencies**: Phase 17, Phase 18 ledger live.
- **Risks**:
  - R: WhatsApp Business verification chưa hoàn → M: Twilio default + Evolution QR-bridge, document live posture.
  - R: Cross-channel idempotency edge case → M: chaos test trong Sprint 22.
- **Sign-off**: R=Backend + AI lead, A=Product/PM, C=Security + QA + Design, I=GTM + Customer Success.

### Phase 20 — Widget & Plugin Runtime

- **Theme**: Customer-facing BookedAI agent installable trên SME-owned sites, preserving tenant + origin + booking + revenue truth.
- **Start**: `2026-05-04`. **End**: `2026-05-10`.
- **Entry criteria**: P0-3, P0-4, P0-5, P1-2 đã live (Phase 19 preconditions).
- **Exit criteria**:
  - Widget identity for tenant/host origin/page source/campaign/install mode shipped.
  - Embed-safe assistant shell live for receptionist/sales/customer-service entry.
  - Tenant install instructions + admin validation diagnostics published.
  - Webhook events cover lead/booking/payment/subscription/invoice/CRM/communication/retention.
- **Deliverables**: Widget JS bundle; identity policy backend; admin diagnostics screen; tenant install docs.
- **Dependencies**: Phase 19 shared messaging policy.
- **Risks**: R: Cross-origin auth issues → M: shadow mode + feature flag + sandbox tenant pilot.
- **Sign-off**: R=Frontend + Backend, A=Product/PM, C=Security + Design + DevOps, I=GTM.

### Phase 20.5 — Wallet & Stripe Return Continuity

- **Theme**: Customer keeps booking-aware state after payment + wallet pass for offline reuse.
- **Start**: `2026-05-04`. **End**: `2026-05-17`.
- **Entry criteria**: Phase 17 confirmation Thank You stable; Stripe checkout flow live.
- **Exit criteria**:
  - Apple Wallet `.pkpass` + Google Wallet pass for confirmed booking.
  - Stripe checkout `success_url` resolves to booking-aware return URL.
  - Portal auto-login self-test for `?booking_reference=...`.
  - BC-2 confirmation hero payment-state badge ship-paired.
- **Deliverables**: Wallet pass generator; Stripe success_url canonicalization; payment-state badge component.
- **Dependencies**: Phase 17 portal auto-login; Phase 21 payment posture.
- **Risks**: R: Apple Wallet certificate management → M: documented runbook + DevOps owner.
- **Sign-off**: R=Backend + Frontend, A=Product/PM, C=DevOps + Security, I=GTM.

### Phase 21 — Billing, Receivables, Subscription Truth

- **Theme**: Real subscription checkout + invoice linkage + tenant billing summaries + admin reconciliation + Tenant Revenue Proof dashboard.
- **Start**: `2026-05-11`. **End**: `2026-05-24`.
- **Entry criteria**: Phase 19 ledger live; Stripe baseline production-ready.
- **Exit criteria**:
  - Tenant billing summaries (paid/outstanding/overdue/manual_review) render real evidence.
  - Admin reconciliation views live for 1+ tenant.
  - `Tenant Revenue Proof` dashboard renders one tenant's real evidence.
  - Pricing & commission visibility inside tenant workspace.
  - Channel-aware email templates with `info@bookedai.au` (P1-10).
- **Deliverables**: Billing service split; subscription rescue flow; invoice generator; reconciliation views; Revenue Proof dashboard; pricing visibility component.
- **Dependencies**: Phase 19, Phase 18.
- **Risks**:
  - R: Commission % chưa chốt → M: open question OQ-005, default rate parameterized.
  - R: Reconciliation data drift → M: dual-write reconciliation queries from EP-03.
- **Sign-off**: R=Backend + Data, A=Product/PM, C=Finance + DevOps + Frontend, I=Investor + GTM.

### Phase 22 — Multi-Tenant Template Generalization

- **Theme**: Vertical templates extracted from chess + Future Swim; channel playbooks; reusable verified-tenant search-result contract; tenant_id validator + SMS adapter.
- **Start**: `2026-05-18`. **End**: `2026-05-24`.
- **Entry criteria**: Phase 19, Phase 21 in progress; chess + Future Swim revenue loops proven.
- **Exit criteria**:
  - One new vertical reuses shared template path.
  - SMS booking-care reachable from one tenant via `/api/webhooks/sms`.
  - Tenant Revenue Proof dashboard renders one tenant's real evidence.
  - `BaseRepository` tenant_id validator with chaos test live.
  - `tenant_app_service.py` shrunk to thin shim (P1-4).
  - Raw SQL moved out of `route_handlers.py` (P1-5).
  - Rate-limiting expanded to `/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, all webhooks.
  - A/B wave 2 (BC-2, CH-1, CH-3, CW-4, CW-5, DS-1, DS-2) running.
- **Deliverables**: Template policy/config records; SMS adapter; tenant_id validator; service split; reconciliation tooling; rate limit expansion.
- **Dependencies**: Phase 19 messaging service; Phase 21 billing truth.
- **Risks**: R: Service split breaks live runtime → M: feature flag + dual-route fallback.
- **Sign-off**: R=Backend + Data, A=Product/PM, C=Security + QA + DevOps + Frontend, I=GTM.

### Phase 23 — Release Governance & Scale Hardening

- **Theme**: One release-gate suite; CI; `.env.production.example` + checksum guard; OpenClaw rootless; image registry; observability stack; comprehensive release-gate suite.
- **Start**: `2026-04-27` (overlay từ Sprint 19). **End**: `2026-05-31`.
- **Entry criteria**: Phase 6, 9 release-hardening baseline; Sprint 19 P0 closure.
- **Exit criteria**:
  - GitHub Actions CI pipeline (P0-6) live and blocking.
  - Expanded `.env.production.example` with checksum guard (P0-7) closed 2026-04-26.
  - OpenClaw rootless + host mount scope reduced (P0-8).
  - Public, admin, and portal frontend artifacts build as separate release targets with separate smoke lanes.
  - Beta DB separation + image registry with `git-sha` tags (P1-6).
  - Prometheus metrics, structured JSON logs, and an error tracker are live; Grafana/AlertManager can follow after the baseline exporter/log/error loop is green.
  - One canonical layer map is declared and referenced by new architecture/PM docs; older conflicting layer models are left in place but marked superseded-by-reference.
  - Webhook signature, idempotency, tenant_id validator gates recorded in release-gate checklist.
- **Deliverables**: CI workflow; checksum guard; OpenClaw posture review; split frontend artifact pipeline; observability baseline; canonical layer map closeout; release-gate checklist update.
- **Dependencies**: Phase 19, Phase 22.
- **Risks**: R: GitHub token chưa có `workflow` scope → M: request elevated token; defer to Sprint 20.
- **Sign-off**: R=DevOps + Security, A=Product/PM, C=Backend + QA, I=Leadership.

---

## 5. Historical Phases (0-9) — Carry-Forward Notes

Theo [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md):

- **Phase 0 (Sprint 1)**: PRD + roadmap + architecture aligned around AI Revenue Engine. No carry-forward review defects.
- **Phase 1 (Sprint 2-3)**: Public search-first shell, multilingual locale, branding source. Carry: P1-7 phone `aria-describedby` (closed 2026-04-26), P1-8 PitchDeckApp Playwright (Sprint 21).
- **Phase 2 (Sprint 4)**: Tenant + catalog schema + migration `009`. Carry: migration discipline supports P0-7 + P1-9.
- **Phase 3 (Sprint 4, 6)**: Matching + search + booking-path + booking-intent routes. Carry: R2 channel parity → Phase 19.
- **Phase 4 (Sprint 5, 9)**: Tenant + admin reporting read surfaces. Carry: Tenant Revenue Proof dashboard → Phase 21.
- **Phase 5 (Sprint 7, 9)**: Payments + reconciliation + outbox + retry. Carry: P0-2 WhatsApp posture + P1-10 templates → Phase 19/21.
- **Phase 6 (Sprint 6, 10)**: Release-gate scripts + replay gate + browser smoke. Carry: R4 CI → Phase 23 P0-6.
- **Phase 7 (Sprint 8, 9, 11, 12)**: Tenant workspace shell + auth + catalog + billing. Carry: P0-1 portal v1-* (closed) + P1-1 tenant authenticated UAT (Sprint 20) + P1-4/P1-5 service split (Phase 22).
- **Phase 8 (Sprint 10, 13, 14)**: Admin workspace + drift review + diagnostics. Carry: P1-7 admin booking responsive (closed partial 2026-04-26).
- **Phase 9 (Sprint 15, 16)**: Release checklist + rehearsal + search replay gate + tenant smoke. Carry: R4 CI/observability → Phase 23.

## 6. Cross-Cutting Risk Register (full-stack review)

| Risk | Origin phase | Resolution phase | Items |
|---|---|---|---|
| `R1` portal continuity | 7-8, 9 | 17 | P0-1 |
| `R2` channel parity asymmetry | 3, 7 | 19 | P0-2, P0-3, P0-4, P1-2, P1-3 |
| `R3` service-layer monolith + tenant scoping | 7 | 22 | P0-5, P1-4, P1-5 |
| `R4` operational hygiene + CI/CD gap | 6, 9 | 23 | P0-6, P0-7, P0-8, P1-6 |

## 7. Gantt-Style Sprint × Phase Plan (Weeks 2026-04-13 → 2026-06-07)

W1 = 2026-04-13, W2 = 2026-04-20, W3 = 2026-04-27 (Sprint 19), W4 = 2026-05-04 (Sprint 20), W5 = 2026-05-11 (Sprint 21), W6 = 2026-05-18 (Sprint 22), W7 = 2026-05-25 (Sprint 23 cand), W8 = 2026-06-01 (Sprint 24 cand).

| Phase | W1 | W2 | W3 (S19) | W4 (S20) | W5 (S21) | W6 (S22) | W7 (S23c) | W8 (S24c) |
|---|---|---|---|---|---|---|---|---|
| 17 stabilization | █ | █ | █ close | – | – | – | – | – |
| 18 ledger | – | █ | █ | █ close | – | – | – | – |
| 19 messaging | – | – | █ start | █ | █ close | – | – | – |
| 20 widget | – | – | – | █ | – | – | – | – |
| 20.5 wallet/stripe | – | – | – | █ | █ close | – | – | – |
| 21 billing | – | – | – | – | █ | █ close | – | – |
| 22 multi-tenant | – | – | – | – | – | █ close | – | – |
| 23 governance | – | – | █ overlay | █ overlay | █ overlay | █ overlay | █ close | – |
| S23 vertical exp | – | – | – | – | – | – | █ | – |
| S24 investor close | – | – | – | – | – | – | – | █ |

## 8. Sprint 19-22 Forward Plan (canonical)

Trùng với [`bookedai-master-roadmap-2026-04-26.md` §Sprint 19-22 forward plan](../architecture/bookedai-master-roadmap-2026-04-26.md).

### Sprint 19 — Stabilize and Sign (`2026-04-27 → 2026-05-03`)

- Target phases: 17, 19, 23.
- Close all 8 P0: P0-1..P0-8.
- Ship P1-7 accessibility + admin responsive.
- **Exit gate**: portal v1-* UAT green; CI blocks lint/type/test failures; OpenClaw rootless.

### Sprint 20 — First Real Revenue Loop (`2026-05-04 → 2026-05-10`)

- Target phases: 17, 19, 21, 23.
- Close P1-1, P1-2, P1-5, P1-9.
- One Future Swim revenue loop documented end-to-end.
- Bring up Prometheus + Grafana + AlertManager.
- Activate A/B wave 1: AC-1, RT-1, RT-3, CH-1 + copy waves CW-1/CW-2/CW-3 measurement.
- Publish v1 of `Commercial and Compliance Checklist`.
- **Exit gate**: ≥500 impressions per variant on at least 4 experiments; observability dashboards live.

### Sprint 21 — Refactor & Coverage (`2026-05-11 → 2026-05-17`)

- Target phases: 19, 22, 23.
- Close P1-3, P1-4, P1-6, P1-8, P1-10.
- Ship `location_posture` field unlocking BC-1.
- Replace bare `except Exception` with `IntegrationAppError`/`ValidationAppError` + structured logging.
- **Exit gate**: `tenant_app_service` shrunk to thin shim; tagged image rollback ≤5 min on staging.

### Sprint 22 — Multi-Tenant & Multi-Channel (`2026-05-18 → 2026-05-24`)

- Target phases: 19, 20, 21, 22, 23.
- Ship `BaseRepository` tenant_id validator + chaos test.
- Ship SMS adapter at `/api/webhooks/sms`.
- Ship `Tenant Revenue Proof` dashboard.
- Ship pricing & commission visibility inside tenant workspace.
- A/B wave 2: BC-2, CH-1, CH-3 + CW-4, CW-5, DS-1, DS-2.
- Extend rate-limiting to `/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, webhooks.
- **Exit gate**: one new vertical reuses shared template path; SMS booking-care reachable; revenue proof dashboard renders real evidence.

## 9. Post-Sprint-22 Horizon (indicative)

### Sprint 23 candidate — Vertical Expansion (`2026-05-25 → 2026-05-31`)

- Second tenant on Future Swim or chess template, end to end.
- Apple Messages + email channel adapters reusing shared messaging policy.
- A/B wave 3: AC-2, AC-3, CH-2, CH-4, CH-5.
- Admin operator coverage of revenue-ops ledger across 2 tenants concurrently.

### Sprint 24 candidate — Investor & Compliance Closeout (`2026-06-01 → 2026-06-07`)

- Second tenant published with revenue evidence in dashboard.
- Commercial & Compliance Checklist v2 with all remediation completed.
- Pitch deck refreshed against live `Tenant Revenue Proof` dashboard.
- Pricing changes (if any) shipped end-to-end through tenant workspace + public surfaces.
- Runbook for paid customer onboarding + self-serve account creation.

## 10. A/B Experiment Cadence

Full matrix in [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md). Activation cadence:

- **Wave 1** (Sprint 20): AC-1, RT-1, RT-3, CH-1, plus CW-1, CW-2, CW-3 measurement
- **Wave 2** (Sprint 22): BC-2, CH-1, CH-3, CW-4, CW-5, DS-1, DS-2
- **Wave 3** (Sprint 23 candidate): AC-2, AC-3, CH-2, CH-4, CH-5
- **Continuing**: TN-1 tenant_variant=control|revenue_ops until ≥500 impressions/variant for 2 consecutive weeks; RT-2 portal_variant=status_first|control
- **CW-6 pricing reframe** runs in Sprint 21 once RF-9 ships.

## 11. Phase Sign-off RACI Snapshot

Detailed RACI in [`04-RACI-MATRIX.md`](04-RACI-MATRIX.md). Phase-level sign-off summary:

| Phase | R | A | C | I |
|---|---|---|---|---|
| 17 | Frontend, Backend leads | Product/PM | QA, DevOps, Design | GTM, CS |
| 18 | Backend lead | Product/PM | Frontend, Security | GTM |
| 19 | Backend, AI leads | Product/PM | Security, QA, Design | GTM, CS |
| 20 | Frontend, Backend | Product/PM | Security, Design, DevOps | GTM |
| 20.5 | Backend, Frontend | Product/PM | DevOps, Security | GTM |
| 21 | Backend, Data | Product/PM | Finance, DevOps, Frontend | Investor, GTM |
| 22 | Backend, Data | Product/PM | Security, QA, DevOps, Frontend | GTM |
| 23 | DevOps, Security | Product/PM | Backend, QA | Leadership |

## 12. Closeout Responsibilities

Khi 1 phase đóng:

1. Update Phase row trong table mục §2 (Status).
2. Update Sprint row trong §3.
3. Add 1-line changelog entry ở cuối file này.
4. Mirror entry vào [`implementation-progress.md`](../development/implementation-progress.md).
5. Update test cases status trong [`05-TEST-PLAN.md`](05-TEST-PLAN.md).
6. Update UAT items trong [`06-UAT-CHECKLIST.md`](06-UAT-CHECKLIST.md).
7. Close related questions trong [`09-OPEN-QUESTIONS.md`](09-OPEN-QUESTIONS.md).
8. Notion + Discord closeout published khi operator-visible.

## Changelog

- `2026-04-26` initial publication consolidating phase 0-23 + post-22 horizon with concrete dates anchored at 2026-04-26 today; integrated full-stack review P0/P1 risk anchoring; defined Gantt-style 8-week plan and Sprint 19-22 forward plan.
