# BookedAI Master Roadmap — Synchronized (01)

Date: `2026-04-27`

Status: `active SSOT — canonical phase + sprint plan from Phase 0 → Phase 23 + post-go-live horizon, RE-ANCHORED 2026-04-27`

Authority: this document is canonical for phase numbering, sprint mapping, and dates as of `2026-04-27`. Source-of-truth chain: [`project.md`](../../../project.md) → [`prd.md`](../../../prd.md) → [`bookedai-master-roadmap-2026-04-26.md`](../../architecture/bookedai-master-roadmap-2026-04-26.md) → this doc → per-phase detail in [`phases/`](phases/).

## 0. Date Anchor Update — 2026-04-27 (RE-ANCHORED)

Đây là phiên bản re-anchor toàn bộ timeline theo user-provided anchors `2026-04-27`. Phiên bản trước (xuất bản sáng `2026-04-27`) suy luận Phase 0 nằm ở `2025-Q4` historical — sai. User clarification: Phase 0 thực sự bắt đầu `2026-04-11` (Saturday) cùng với commit khởi tạo repo `5d00edd` (`2026-04-13 Initial commit`) và phase-0 closeout `2895e09` (`2026-04-17 docs: close out phase 0 planning baseline`).

| Anchor | Date | Source |
|---|---|---|
| Phase 0 start | `2026-04-11` (Saturday) | User anchor `2026-04-27` |
| Phase 0 closeout reference | `2026-04-17` (Friday) | git `2895e09 docs: close out phase 0 planning baseline` |
| Update phase / iteration through | `2026-04-26` (Sunday, yesterday) | User anchor |
| Today | `2026-04-27` (Monday) | env date |
| Chess + Swim full version runnable (M-01) | `2026-04-29` (Wednesday) | User anchor — TARGET |
| **Go-live lock (M-02)** | **`2026-04-30` (Thursday)** | **User anchor — HARD MILESTONE** |
| Post-go-live cadence | weekly Mon-Sun starting `2026-05-04` | User anchor |
| Final phase end (Phase 23) | `2026-06-07` (Sunday) | redistributed |

Total project completion = `2026-04-11 → 2026-06-07` = **8.0 weeks (58 days)**.

Pre-go-live "intensive build" sprint = `2026-04-11 → 2026-04-30` = **19 days / 3 weeks** (Phase 0-9 historical baselines folded into Week 1-2 + Phase 17-19 active build into Week 3).

Post-go-live = **6 weeks**, weekly cadence: Phase 20, 20.5, 21, 22, 23 mapped 1 phase per week with explicit overlay markers.

Conflict register: see [02-RECONCILIATION-LOG.md §RC-100 Re-anchor 2026-04-27](02-RECONCILIATION-LOG.md). Change request: [05-CHANGE-REQUESTS.md §CR-001](05-CHANGE-REQUESTS.md). Strategic anchor: [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md). Visual: [06-BIG-PICTURE.md](06-BIG-PICTURE.md).

What changed (vs. previous publication earlier today):

- Phase 0-9 dates changed from `2025-Q4 / 2026-Q1 (historical)` to concrete `2026-04-11 → 2026-04-24` redistribution within the new anchor window.
- Phase 17 end date moved from `2026-05-03` to `2026-04-29` (folded into go-live sprint to hit the chess+swim demo).
- Phase 18 end date moved from `2026-05-10` to `2026-04-30` (must be go-live ready).
- Phase 19 end date moved from `2026-05-17` to `2026-04-30` for go-live scope (Telegram+WhatsApp parity gates) with carry-forward into post-go-live weekly slot if needed.
- Phase 20, 20.5, 21, 22, 23 redistributed onto Mon-Sun weekly slots `2026-05-04` through `2026-06-07`.
- Sprint 19 closeout window shortened from `2026-04-27 → 2026-05-03` to `2026-04-27 → 2026-04-30` (3 working days + go-live Thursday).
- Sprint 20-22 (and post-go-live weeks) shifted backward; Sprint 23/24 candidate windows now collapse into the new post-go-live phase weeks rather than being separate post-22 horizon.

## 1. Whole-Project Phase Snapshot

| Phase | Canonical name | Theme (1-line) | Status | Sprint range | Start | End | Detail doc |
|---|---|---|---|---|---|---|---|
| `0` | Narrative and architecture reset | Lock revenue-engine product/pricing/architecture baseline | Shipped | `Sprint 1` | `2026-04-11` | `2026-04-17` ([phase-0-exit-review.md](../../architecture/phase-0-exit-review.md); git `2895e09`) | [phase-00-detail.md](phases/phase-00-detail.md) |
| `1` | Public growth and premium landing rebuild | Premium public revenue-engine experience + brand system | Shipped (with carry P1-7/P1-8) | `Sprint 2`, `Sprint 3` | `2026-04-13` | `2026-04-18` (git `56f53d0 close out sprint 2 brand and rollout baseline`) | [phase-01-detail.md](phases/phase-01-detail.md) |
| `2` | Commercial data foundation | Tenant + catalog schema + migration `001-009` baseline | Shipped baseline (carry to Phase 21) | `Sprint 4` carry | `2026-04-14` | `2026-04-21` (open carry → Phase 21) | [phase-02-detail.md](phases/phase-02-detail.md) |
| `3` | Multi-channel capture and conversion engine | Matching + search + booking-path + booking-intent routes | In-Progress (strongest active lane) | `Sprint 4`, `Sprint 6` | `2026-04-16` | `2026-04-26` (channel parity carries to Phase 19) | [phase-03-detail.md](phases/phase-03-detail.md) |
| `4` | Revenue workspace and reporting | Tenant + admin reporting read surfaces | In-Progress (partial) | `Sprint 5`, `Sprint 9` | `2026-04-18` | `2026-04-26` (Tenant Revenue Proof carries to Phase 21) | [phase-04-detail.md](phases/phase-04-detail.md) |
| `5` | Recovery, payments, and commission operations | Payments + reconciliation + outbox + retry | In-Progress (partial foundation) | `Sprint 7`, `Sprint 9` | `2026-04-18` | `2026-04-26` (provider posture carries to Phase 19/21) | [phase-05-detail.md](phases/phase-05-detail.md) |
| `6` | Optimization, evaluation, and scale hardening | Release-gate scripts + replay gate + browser smoke | In-Progress (partially active) | `Sprint 6`, `Sprint 10` | `2026-04-16` | `2026-04-26` (CI gap carries to Phase 23) | [phase-06-detail.md](phases/phase-06-detail.md) |
| `7` | Tenant revenue workspace | Tenant shell + auth + catalog + billing | Shipped baseline (carry P1-1/P1-4/P1-5) | `Sprint 8`, `Sprint 9`, `Sprint 11`, `Sprint 12` | `2026-04-21` | `2026-04-26` (foundation done; service split carries to Phase 22) | [phase-07-detail.md](phases/phase-07-detail.md) |
| `8` | Internal admin optimization and support platform | Admin workspace + drift review + diagnostics | Shipped baseline (carry P1-7) | `Sprint 10`, `Sprint 13`, `Sprint 14` | `2026-04-21` | `2026-04-26` (admin responsive closed `2026-04-26`) | [phase-08-detail.md](phases/phase-08-detail.md) |
| `9` | QA, release discipline, and scale hardening | Release checklist + rehearsal + replay gate + tenant smoke | In-Progress (partially active) | `Sprint 15`, `Sprint 16` | `2026-04-23` | `2026-04-26` (CI/observability carries to Phase 23) | [phase-09-detail.md](phases/phase-09-detail.md) |
| `17` | Full-flow stabilization | Lock canonical journey + portal continuity + UI/UX + 390px mobile | In-Progress (active; closes by go-live) | `Sprint 17`, `Sprint 19` overlay | `2026-04-20` | `2026-04-29` (M-01 chess+swim demo) | [phase-17-detail.md](phases/phase-17-detail.md) |
| `18` | Revenue-ops ledger control | Action-run filters + tenant Ops + evidence drawers + policy metadata | In-Progress (partial; closes by go-live) | `Sprint 18`, `Sprint 19` overlay | `2026-04-20` | `2026-04-30` (M-02 go-live; evidence drawer UI may carry to Week of `2026-05-04`) | [phase-18-detail.md](phases/phase-18-detail.md) |
| `19` | Customer-care and status agent | Shared MessagingAutomationService + HMAC + idempotency + tenant validator | In-Progress (active build for go-live) | `Sprint 19` (compressed) | `2026-04-25` | `2026-04-30` (M-02 go-live; P1-2/P1-10 carry to Week of `2026-05-04`) | [phase-19-detail.md](phases/phase-19-detail.md) |
| `20` | Widget and plugin runtime | Embed-safe assistant shell + tenant identity + install diagnostics | Planned (Week 1 post-go-live) | weekly slot | `2026-05-04` | `2026-05-10` | [phase-20-detail.md](phases/phase-20-detail.md) |
| `20.5` | Wallet and Stripe return continuity | Apple/Google Wallet pass + booking-aware Stripe `success_url` | Planned (Week 2 post-go-live) | weekly slot | `2026-05-11` | `2026-05-17` | [phase-20-5-detail.md](phases/phase-20-5-detail.md) |
| `21` | Billing, receivables, and subscription truth | Subscription/invoice + Tenant Revenue Proof dashboard + commission visibility | Planned (Week 3 post-go-live) | weekly slot | `2026-05-18` | `2026-05-24` | [phase-21-detail.md](phases/phase-21-detail.md) |
| `22` | Multi-tenant template generalization | Vertical templates + SMS adapter + tenant_id validator + service split | Planned (Week 4 post-go-live) | weekly slot | `2026-05-25` | `2026-05-31` | [phase-22-detail.md](phases/phase-22-detail.md) |
| `23` | Release governance and scale hardening | CI + env checksum + OpenClaw rootless + observability + image registry | Planned (Week 5 post-go-live; carries threads from Phase 17-19) | weekly slot (overlay throughout) | `2026-04-26` (overlay) → primary `2026-06-01` | `2026-06-07` (final phase end = total project completion) | [phase-23-detail.md](phases/phase-23-detail.md) |

### Post-Go-Live Communication Layer (overlay rows per [CR-010](05-CHANGE-REQUESTS.md))

| Anchor | Phase / Workstream | Theme | Window | Status |
|---|---|---|---|---|
| `M-09` | Comms-WA-Outbound | WhatsApp outbound production verify (Twilio default `delivered` callback OR Meta verification) | `2026-05-04 → 2026-05-10` | Planned (overlay with Phase 20) |
| `M-10` | Comms-iMessage-Research | iMessage / Apple Business Chat feasibility memo (cost, certification path, partner provider) — **research only** | `2026-05-11 → 2026-05-17` | Planned (overlay with Phase 20.5) |
| `M-11` | Comms-SMS-Adapter | SMS adapter integration (cross-ref Phase 22 / M-06) | `2026-05-25 → 2026-05-31` | Planned (covered by Phase 22) |

**Channel scope decision ([CR-010](05-CHANGE-REQUESTS.md), `2026-04-27`)**: Telegram is the only P0 channel for go-live `2026-04-30`. Inbound WhatsApp stays online (already shipped). Outbound WhatsApp + iMessage + SMS shift post-go-live per the Comms-* milestones above. See [04-VISION-TARGET-MILESTONES.md §M-09/M-10/M-11](04-VISION-TARGET-MILESTONES.md), [phase-19-detail.md](phases/phase-19-detail.md), [phase-22-detail.md](phases/phase-22-detail.md).

Notes:

- `Phase 10-16` không tồn tại trong roadmap mới. `Sprint 11-16` map vào `Phase 7`, `Phase 8`, `Phase 9`. Xem [02-RECONCILIATION-LOG.md §RC-002](02-RECONCILIATION-LOG.md) và [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md).
- `Phase 20.5` được giữ nguyên overlay numbering nhưng trong re-anchor mới được mapped sang slot tuần 2 post-go-live (`2026-05-11 → 2026-05-17`) thay vì overlay Sprint 20-21. Xem [02-RECONCILIATION-LOG.md §RC-100](02-RECONCILIATION-LOG.md).
- Phase 0-9 trong re-anchor: tất cả historical baselines được tái phân bổ vào Week 1 (`2026-04-11 → 2026-04-19`) và Week 2 (`2026-04-20 → 2026-04-26`) của intensive build sprint. Phase 0 đã có closeout cứng `2026-04-17`; Phase 1-9 ship kế tiếp dưới dạng baseline-with-carry, và những carry items được cuộn vào Phase 17-23 active build.
- Sprint 23/24 candidate windows trong phiên bản trước được absorb vào weekly cadence post-go-live (Phase 22 = tuần `2026-05-25`, Phase 23 = tuần `2026-06-01`). Không còn separate post-22 horizon.

## 2. Status legend

| Symbol | Meaning |
|---|---|
| Shipped | Code in production; closeout signed; remaining items moved to carry-forward |
| Shipped baseline | Foundation shipped; deeper polish / specific items still active in later phases |
| In-Progress | Active work in current/upcoming sprint window |
| Planned | Scope locked; not yet started |
| Deferred | Out of Sprint 22 horizon; tracked under post-22 candidate themes |

## 3. Sprint Map (RE-ANCHORED — Sprint 1 → Sprint 22 mapped onto 2026-04-11 → 2026-06-07)

Re-anchor note: trong cadence cũ, mỗi sprint = 1 tuần (cũ Q1 historical) hoặc 2 tuần (Sprint 17/18). Re-anchor compresses Sprint 1-16 vào Week 1 và Week 2 của intensive build (`2026-04-11 → 2026-04-26`), giữ nguyên dấu vết đã ship qua git log nhưng đặt vào timeline mới. Sprint 17-19 hợp nhất vào tuần go-live (`2026-04-25 → 2026-04-30`). Sprint 20-22 trở thành các tuần weekly cadence post-go-live.

| Sprint | Window (ISO) | Theme | Phase target(s) | Status |
|---|---|---|---|---|
| `1` | `2026-04-11 → 2026-04-17` | Reset and alignment (initial commit + phase-0 closeout) | `0` | Shipped ([phase-0-exit-review.md](../../architecture/phase-0-exit-review.md); git `5d00edd` … `2895e09`) |
| `2` | `2026-04-13 → 2026-04-18` | Brand system and landing architecture | `1` | Shipped (git `f17c503 record current landing and export progress`, `56f53d0 close out sprint 2`) |
| `3` | `2026-04-14 → 2026-04-18` | Premium public implementation | `1` | Shipped (carry P1-7/P1-8 to Sprint 19) |
| `4` | `2026-04-14 → 2026-04-21` | Commercial contracts + contract-runner scaffold | `3`, `2` | Shipped baseline (carry to Phase 19/21) |
| `5` | `2026-04-18 → 2026-04-21` | Reporting and widget APIs | `4` | Shipped (partial; Tenant Revenue Proof carries to Phase 21) |
| `6` | `2026-04-16 → 2026-04-21` | Attribution, conversion, search-quality runner | `3`, `6` | Shipped (git `f1c5843 advance search quality`, `eefff75 stabilize search reliability smoke`) |
| `7` | `2026-04-18 → 2026-04-21` | Recovery workflows | `5` | Shipped (partial foundation) |
| `8` | `2026-04-21 → 2026-04-23` | Tenant onboarding and searchable supply | `7` | Shipped (git `9867da8 sync admin platform, tenant surfaces, and deploy ops`) |
| `9` | `2026-04-21 → 2026-04-23` | Tenant revenue workspace foundation | `4`, `7` | Shipped (foundation) |
| `10` | `2026-04-21 → 2026-04-23` | Admin commercial operations | `8`, `6` | Shipped (git `7dc8a2b checkpoint admin auth hardening and enterprise ia`) |
| `11` | `2026-04-23 → 2026-04-23` | Tenant IA and API preparation | `7` | Shipped (folded into major-upgrade branch) |
| `12` | `2026-04-23 → 2026-04-24` | Tenant workspace publish-safe completion | `7` | Shipped (git `638bcff promote admin handoff guards and messaging workspace`) |
| `13` | `2026-04-23 → 2026-04-25` | Admin IA and commercial drill-ins | `8` | Shipped (git `43f74ef Upgrade admin enterprise workspace shell`) |
| `14` | `2026-04-23 → 2026-04-25` | Tenant billing, support readiness, route/auth hardening | `7`, `8` | Shipped (git `c00fa63 Harden admin login same-origin flow`) |
| `15` | `2026-04-25 → 2026-04-26` | Telemetry, regression coverage, tenant value, search carry-forward | `9` | Shipped (git `1b88142 Document admin deploy QA closeout`) |
| `16` | `2026-04-25 → 2026-04-26` | Release gates, rollout discipline, route/auth ownership closeout | `9` | Shipped (git `4dc9436 Record review backlog and release gates`, `0994982 Add production env checksum guard`) |
| `17` | `2026-04-20 → 2026-04-29` | Full-flow stabilization (UI/UX, booking flow, messaging policy) | `17` | In-Progress → must close `2026-04-29` for M-01 chess+swim demo |
| `18` | `2026-04-20 → 2026-04-30` | Revenue-ops ledger control (Sprint 18 baseline already shipped; evidence drawer UI carry) | `18` | In-Progress (partial) |
| `19` | `2026-04-25 → 2026-04-30` | Stabilize and Sign — close P0-2..P0-8 + P1-1..P1-3 + ship Manager Bot for go-live | `17`, `18`, `19`, `23` overlay | In-Progress (compressed sprint, GO-LIVE THIS WEEK) |
| `20` | `2026-05-04 → 2026-05-10` | Widget runtime + post-go-live stabilization | `19` carry, `20`, `23` overlay | Planned (Week 1 post-go-live) |
| `20.5` | `2026-05-11 → 2026-05-17` | Wallet and Stripe return continuity | `20.5`, `23` overlay | Planned (Week 2 post-go-live) |
| `21` | `2026-05-18 → 2026-05-24` | Billing, receivables, subscription truth (incl. Tenant Revenue Proof) | `21`, `23` overlay | Planned (Week 3 post-go-live) |
| `22` | `2026-05-25 → 2026-05-31` | Multi-tenant template generalization + SMS adapter | `22`, `23` overlay | Planned (Week 4 post-go-live) |
| `23` | `2026-06-01 → 2026-06-07` | Release governance + observability + canonical layer map (final phase) | `23` primary | Planned (Week 5 post-go-live; total project end) |

Source: re-anchored from user input `2026-04-27`; original Sprint Map evidence in [bookedai-master-roadmap-2026-04-26.md §Sprint Map](../../architecture/bookedai-master-roadmap-2026-04-26.md), [docs/pm/03-EXECUTION-PLAN.md §3](../03-EXECUTION-PLAN.md), git log `2026-04-13 → 2026-04-27`.

Caveat: Sprint 1-16 timeline compression là một book-keeping artifact của re-anchor — code đã ship được giữ y nguyên trên main branch và evidence ở git log; chỉ cách trình bày lịch trình thay đổi để khớp với anchor mới của user. Per project doc: "Phase 0-16 remain historical baselines" ([project.md L18](../../../project.md)).

## 4. Cross-Cutting Risk Register

Inherited from [bookedai-master-roadmap-2026-04-26.md §Cross-cutting findings](../../architecture/bookedai-master-roadmap-2026-04-26.md) and [docs/pm/03-EXECUTION-PLAN.md §6](../03-EXECUTION-PLAN.md).

| Risk | Origin phase | Resolution phase | P0/P1 items |
|---|---|---|---|
| `R1` portal continuity gap | `7-8`, `9` | `17` | `P0-1` |
| `R2` channel parity asymmetry | `3`, `7` | `19` | `P0-2`, `P0-3`, `P0-4`, `P1-2`, `P1-3` |
| `R3` service-layer monolith + tenant scoping | `7` | `22` | `P0-5`, `P1-4`, `P1-5` |
| `R4` operational hygiene + CI/CD gap | `6`, `9` | `23` | `P0-6`, `P0-7`, `P0-8`, `P1-6` |

## 5. P0/P1 Backlog Anchors (from full-stack review 2026-04-26)

| ID | Description | Phase | Sprint close | Status |
|---|---|---|---|---|
| `P0-1` | Portal `v1-*` snapshot 500 fix | `17` | `Sprint 19` | Closed live ([phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md)) |
| `P0-2` | WhatsApp provider posture decision | `19` | `Sprint 19` | Decision recorded; provider delivery still blocked |
| `P0-3` | Telegram secret-token + Evolution HMAC | `19` | `Sprint 19` | Closed live `2026-04-26` |
| `P0-4` | Inbound webhook idempotency | `19`, `23` | `Sprint 19` | Code/indexes live; Telegram UAT chat-id + evidence drawer carried |
| `P0-5` | `actor_context.tenant_id` validator | `19`, `22` | `Sprint 19` | Closed live `2026-04-26` |
| `P0-6` | GitHub Actions CI pipeline | `23` | `Sprint 19-20` | Carried (workflow scope blocked) |
| `P0-7` | `.env.production.example` checksum guard | `23` | `Sprint 19` | Closed `2026-04-26` |
| `P0-8` | OpenClaw rootless + Docker-socket reduction | `23` | `Sprint 19` | Closed live `2026-04-26` |
| `P1-1` | Tenant authenticated UAT (catalog/billing/team) | `7` | `Sprint 20` | Open |
| `P1-2` | WhatsApp inline action controls + brand alignment | `19` | `Sprint 20` | Open |
| `P1-3` | WhatsApp webhook test parity with Telegram | `19`, `23` | `Sprint 21` | Closed locally `2026-04-26` |
| `P1-4` | Split `tenant_app_service.py` | `22` | `Sprint 21` | Open |
| `P1-5` | Move raw SQL out of `route_handlers.py` | `22` | `Sprint 20` | Open |
| `P1-6` | Beta DB separation + image registry | `23` | `Sprint 21` | Open |
| `P1-7` | Phone `aria-describedby` + admin booking responsive ≤720px | `17`, `8` | `Sprint 19` | Closed `2026-04-26` |
| `P1-8` | PitchDeckApp Playwright coverage | `17` | `Sprint 21` | Closed locally `2026-04-26`; live promote pending |
| `P1-9` | Future Swim Miranda URL hotfix migration `020` | `17` | `Sprint 19` | Closed live `2026-04-26` |
| `P1-10` | Channel-aware email templates | `19`, `21` | `Sprint 21` | Open |

Source: [full-stack-review-2026-04-26.md](../../development/full-stack-review-2026-04-26.md) (referenced from master roadmap), [implementation-progress.md](../../development/implementation-progress.md).

## 6. Gantt-Style Plan (RE-ANCHORED — 8 weeks, 2026-04-11 → 2026-06-07)

Week anchors (Saturday-start to honor user anchor `2026-04-11 = Saturday`; weekly post-go-live cadence is Mon-Sun):

- W1: `2026-04-11 → 2026-04-19` (intensive build, Phase 0 + 1 + 2 + 3 + 6 baselines; partial Phase 4/5)
- W2: `2026-04-20 → 2026-04-26` (intensive build, Phase 4-9 baselines + Phase 17 + Phase 18 open; Sprint 13-16 historical compression)
- W3: `2026-04-27 → 2026-04-30` (GO-LIVE WEEK; today = Mon; M-01 chess+swim Wed; M-02 go-live Thu); only 4 days
- W4: `2026-05-04 → 2026-05-10` (post-go-live Week 1 — Phase 20 widget runtime + Phase 19 carry)
- W5: `2026-05-11 → 2026-05-17` (post-go-live Week 2 — Phase 20.5 wallet/Stripe)
- W6: `2026-05-18 → 2026-05-24` (post-go-live Week 3 — Phase 21 billing truth)
- W7: `2026-05-25 → 2026-05-31` (post-go-live Week 4 — Phase 22 multi-tenant template)
- W8: `2026-06-01 → 2026-06-07` (post-go-live Week 5 — Phase 23 release governance, FINAL PHASE END)

```
Phase \ Week         | W1   | W2   | W3   | W4   | W5   | W6   | W7   | W8
                     | 4/11 | 4/20 | 4/27 | 5/04 | 5/11 | 5/18 | 5/25 | 6/01
                     | (9d) | (7d) | (4d) | (7d) | (7d) | (7d) | (7d) | (7d)
---------------------|------|------|------|------|------|------|------|------
P0  Reset            | ##X  | ---- | ---- | ---- | ---- | ---- | ---- | ----
P1  Public landing   | ##X  | ==   | ==X  | ----  | ---- | ---- | ---- | ----
P2  Data foundation  | ##   | ##X  | ==   | ==   | ==   | ==X  | ----  | ----
P3  Multi-channel    | ##   | ##X  | ==X  | ==   | ----  | ---- | ---- | ----
P4  Reporting        | ----  | ##X  | ==   | ==   | ==   | ==X  | ----  | ----
P5  Payments/recover | ##   | ##X  | ==   | ==   | ==   | ==X  | ----  | ----
P6  Optimization     | ##   | ##X  | ==   | ==   | ==   | ==   | ==   | ==X
P7  Tenant workspace | ----  | ##X  | ==   | ==   | ==   | ----  | ==   | ==X
P8  Admin platform   | ----  | ##X  | ==X  | ----  | ---- | ---- | ---- | ----
P9  QA/release base  | ----  | ##X  | ==   | ==   | ==   | ==   | ==   | ==X
P17 Full-flow stab.  | ----  | ##   | ##X  | ----  | ---- | ---- | ---- | ----
P18 Rev-ops ledger   | ----  | ##   | ##X  | ==   | ==X  | ----  | ---- | ----
P19 Customer-care    | ----  | ----  | ##X  | ##   | ##X  | ----  | ---- | ----
P20 Widget runtime   | ----  | ----  | ----  | ##X  | ----  | ----  | ---- | ----
P20.5 Wallet/Stripe  | ----  | ----  | ----  | ----  | ##X  | ----  | ---- | ----
P21 Billing truth    | ----  | ----  | ----  | ----  | ----  | ##X  | ----  | ----
P22 Multi-tenant gen | ----  | ----  | ----  | ----  | ----  | ----  | ##X  | ----
P23 Release gov      | ----  | overlay (P0-7/P0-8) | ## | ## | ## | ## | ## | ##X
---------------------|------|------|------|------|------|------|------|------
MILESTONE            |       | UAT  | M-01 | post | post | post | post | END
                     |       | gate | M-02 | live | live | live | live | total
                     |       |      | live |      |      |      |      | done
```

Legend:
- `##X` = active execution + closeout target this week
- `##`  = active execution window (no closeout this week)
- `==`  = baseline maintenance / carry-forward maintenance
- `----` = inactive
- `M-01` = Chess + Swim full version runnable (target `2026-04-29`)
- `M-02` = Go-live lock (`2026-04-30`)
- `END` = total project completion (`2026-06-07`, end of Phase 23)

See [06-BIG-PICTURE.md](06-BIG-PICTURE.md) for swim-lane visual + Mermaid Gantt.

## 7. Sprint 19+ Forward Plan (RE-ANCHORED — canonical, 2026-04-27)

Re-anchor đã rút gọn Sprint 19 còn 4 ngày để hit go-live `2026-04-30`. Các Sprint 20-22 trở thành tuần lịch chuẩn Mon-Sun. Sprint 23 (post-22 candidate cũ) trở thành tuần Phase 23 (final phase) `2026-06-01 → 2026-06-07`.

### Sprint 19 — `2026-04-27 (Mon) → 2026-04-30 (Thu, GO-LIVE)` — Stabilize, Sign, and Ship Live

- Target phases: `17`, `18`, `19`, `23` overlay
- Days: Mon (today) → Thu (go-live lock)
- Critical path:
  - Mon-Tue: close FX-1 payment-state badge, FX-3 admin booking ≤720px, FX-4 confirmation modal, evidence drawer UI baseline (Phase 18), Manager Bot inline action controls (Phase 19 P1-2)
  - Wed `2026-04-29` (M-01): chess + Future Swim full revenue loop runnable end-to-end (search → match → book → pay → portal → care reply)
  - Thu `2026-04-30` (M-02): GO-LIVE LOCK — release-gate green, image promoted, smoke green on production
- Exit gate: chess + swim demos run live; portal `v1-*` UAT green; webhook signature/idempotency/tenant_id validators live; Manager Bot answers Telegram + WhatsApp (per OQ-001 posture); release notes + closeout signed by Product/PM + Engineering lead.

### Sprint 20 — `2026-05-04 → 2026-05-10` — Widget Runtime + Post-Live Stabilization

- Target phases: `19` carry, `20`, `23` overlay
- Close `P1-1` (tenant authenticated UAT), `P1-2` carry (if not done), `P1-5` (raw SQL out of `route_handlers.py`), `P1-10` carry (channel-aware email templates)
- Ship widget JS bundle + identity policy + admin validation diagnostics + tenant install docs
- Bring up Prometheus + structured JSON logs (Phase 23 overlay)
- Activate A/B wave 1: `AC-1`, `RT-1`, `RT-3`, `CH-1` + copy waves `CW-1`/`CW-2`/`CW-3`
- Exit gate: one tenant widget renders + completes booking + reopens portal; observability dashboards live; ≥500 impressions per variant on ≥4 experiments

### Sprint 20.5 — `2026-05-11 → 2026-05-17` — Wallet and Stripe Continuity

- Target phases: `20.5`, `23` overlay
- Apple Wallet `.pkpass` + Google Wallet pass for confirmed bookings
- Stripe checkout `success_url` resolves to booking-aware return URL
- Portal auto-login self-test smoke
- BC-2 payment-state badge ship-paired with wallet pass
- Exit gate: Stripe-backed test booking returns to booking-aware URL; wallet pass downloads on iOS Safari + Android Chrome

### Sprint 21 — `2026-05-18 → 2026-05-24` — Billing Truth + Tenant Revenue Proof

- Target phases: `21`, `23` overlay
- Real subscription checkout + invoice linkage; payment reminder + receivable recovery; tenant billing summaries; admin reconciliation views
- Ship `Tenant Revenue Proof` dashboard rendering one tenant's real evidence (Future Swim or chess)
- Pricing + commission visibility in tenant workspace
- Channel-aware email templates (P1-10) live
- Replace bare `except Exception` with `IntegrationAppError` / `ValidationAppError`
- Exit gate: payment + subscription state never overstates paid; Tenant Revenue Proof live

### Sprint 22 — `2026-05-25 → 2026-05-31` — Multi-Tenant Template + SMS

- Target phases: `22`, `23` overlay
- Ship `BaseRepository.tenant_id` validator + chaos test
- Ship SMS adapter at `/api/webhooks/sms`
- Split `tenant_app_service.py` into `tenant_overview_service`, `tenant_billing_service`, `tenant_catalog_service` (P1-4)
- Vertical template contracts (intake/placement/booking/payment/report/retention)
- Channel playbooks per template
- Reusable verified-tenant search-result contract
- A/B wave 2: `BC-2`, `CH-1`, `CH-3` + `CW-4`, `CW-5`, `DS-1`, `DS-2`
- Extend rate-limiting to `/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, webhooks
- Exit gate: one new vertical reuses shared template; SMS booking-care reachable; chaos test catches missing `tenant_id` filter

### Sprint 23 — `2026-06-01 → 2026-06-07` — Release Governance Final (FINAL PHASE)

- Target phases: `23` primary
- Close `P0-6` GitHub Actions CI (workflow scope unblocked or fallback path)
- Beta DB separation + image registry with `git-sha` tags (`P1-6`)
- Grafana + AlertManager + error tracker fully wired (per OQ-012)
- Comprehensive release-gate suite + documentation-sync gate vs `full-stack-review-2026-04-26.md`
- Canonical layer map declared (per OQ-011)
- Exit gate: CI gates promotion; observability baseline live; image registry usable for tag-swap rollback ≤5 min; canonical layer map referenced by new architecture/PM docs.
- TOTAL PROJECT COMPLETION: end of Sunday `2026-06-07`

## 8. Open Questions Affecting Roadmap

Cross-reference [docs/pm/09-OPEN-QUESTIONS.md](../09-OPEN-QUESTIONS.md):

- `OQ-001` WhatsApp active provider posture — blocks Phase 19 outbound channel claim
- `OQ-002` P0 feature freeze scope — blocks Sprint 19 promote confidence
- `OQ-003` Pricing tier names + commission baseline — blocks Phase 21 billing
- `OQ-004` First investor reference tenant — informs Phase 21 + Sprint 24 deliverable
- `OQ-005` Tenant Revenue Proof metric set — blocks Phase 21 dashboard scope
- `OQ-006` Beta DB isolation — blocks Phase 23 P1-6
- `OQ-007` OpenClaw operator authority boundary — Phase 23 P0-8 (closed) but ongoing policy
- `OQ-011` Canonical architecture layer map — blocks Phase 23 doc-sync gate
- `OQ-012` Observability error tracker choice — blocks Phase 23 observability bring-up

## Changelog

- `2026-04-27` (scope update) — Added Post-Go-Live Communication Layer overlay rows (`M-09` WhatsApp outbound verify, `M-10` iMessage research, `M-11` SMS adapter cross-ref) per [CR-010](05-CHANGE-REQUESTS.md). Added channel scope decision callout: Telegram only P0 for go-live; WhatsApp inbound stays online; outbound + iMessage + SMS post-go-live. See also [CR-009](05-CHANGE-REQUESTS.md) (AI Mentor 1-1 added to go-live).
- `2026-04-27` (re-anchor) — RE-ANCHORED toàn bộ phase dates theo user-provided anchors: Phase 0 start = `2026-04-11`, M-01 chess+swim demo = `2026-04-29`, M-02 go-live = `2026-04-30`, weekly Mon-Sun cadence post-go-live qua đến `2026-06-07` (Phase 23 end = total project completion). See [02-RECONCILIATION-LOG.md §RC-100](02-RECONCILIATION-LOG.md), [05-CHANGE-REQUESTS.md §CR-001](05-CHANGE-REQUESTS.md), [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md), [06-BIG-PICTURE.md](06-BIG-PICTURE.md).
- `2026-04-27` (initial publication, superseded by re-anchor above) — Phase list, status, dates, sprint map, Gantt, P0/P1 anchors, and Sprint 19-22 forward plan synchronized from `bookedai-master-roadmap-2026-04-26.md`, `phase-execution-operating-system-2026-04-26.md`, `next-phase-implementation-plan-2026-04-25.md`, `current-phase-sprint-execution-plan.md`, `implementation-progress.md`, and per-phase detail packages.
