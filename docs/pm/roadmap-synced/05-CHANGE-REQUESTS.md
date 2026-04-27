# Change Request Register (05)

Date: `2026-04-27` (re-anchored)

Status: `active register for the synced roadmap pack`

Authority: tài liệu này là single register cho mọi change request làm dịch chuyển scope, date, resource, quality, hoặc risk posture của roadmap. Khi conflict log ([02-RECONCILIATION-LOG.md](02-RECONCILIATION-LOG.md)) chỉ ghi nhận disagreement giữa source docs, change request log đây ghi nhận quyết định leadership thay đổi roadmap.

## 1. Workflow

```
Raise CR ──► PM intake ──► Impact analysis ──► Decision (Product/PM ± CEO)
   │              │              │                    │
   │              │              │                    ├─► Accept ──► Update affected phase detail + master roadmap
   │              │              │                    ├─► Reject ──► Note rationale; close
   │              │              │                    └─► Defer ──► Set review date
   │              │              │
   │              │              └─► Document affected phases, sprints, milestones, risks
   │              │
   │              └─► Assign CR-NNN id
   │
   └─► Anyone (Engineering, Product, Investor, Customer, GTM)
```

How to raise:

1. Open a PR or comment on `docs/pm/roadmap-synced/05-CHANGE-REQUESTS.md` with proposed entry.
2. PM intake within 1 working day.
3. Decision target ≤3 working days for Date/Resource/Risk type; ≤7 days for Scope/Quality.
4. Decision authority: Product/PM signs Date + Resource + Risk. CEO signs Scope (cuts/adds) + Quality (gate relaxation).
5. Once decided, mirror updates into [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) and affected `phases/phase-XX-detail.md`. Append entry to [zz-CHANGELOG.md](zz-CHANGELOG.md).

## 2. CR Types

| Type | Examples |
|---|---|
| `Scope` | Add/remove a deliverable; change a phase exit criterion |
| `Date` | Move start/end date; merge sprints |
| `Resource` | Add/remove headcount; reassign owner |
| `Quality` | Tighten/loosen acceptance gate; change definition-of-done |
| `Risk` | Accept residual risk; change mitigation approach |

## 3. Status legend

`Open` (raised, not decided) | `Accepted` | `Rejected` | `Deferred` (with review date) | `Implemented` (decision applied to roadmap) | `Withdrawn`

---

## 4. Change Requests

### CR-001 — Re-anchor Phase 0 to 2026-04-11 + go-live 2026-04-30 + weekly cadence post-go-live

| Field | Value |
|---|---|
| ID | `CR-001` |
| Date raised | `2026-04-27` |
| Requester | User (Product/PM + CEO) |
| Type | `Date` (master timeline reset) |
| Status | `Implemented` |

**Description**: Override prior synced pack inference (Phase 0 = `2025-Q4 historical`) with concrete user anchors: Phase 0 start `2026-04-11`, M-01 chess+swim demo `2026-04-29`, M-02 go-live lock `2026-04-30`, weekly Mon-Sun cadence post-go-live, total project end `2026-06-07`.

**Impact analysis**:

- All 17 phase detail files re-dated.
- `01-MASTER-ROADMAP-SYNCED.md` §0/§1/§3/§6/§7 rewritten.
- Sprint 19 compressed from 7-day to 4-day window (Mon-Thu) — high execution density.
- Phase 17 end pulled in from `2026-05-03` → `2026-04-29`.
- Phase 18 end pulled in from `2026-05-10` → `2026-04-30` with explicit carry of evidence drawer UI.
- Phase 19 end pulled in from `2026-05-17` → `2026-04-30` with explicit carry of P1-2 / P1-10 to Week 1 post-go-live.
- Sprint 23/24 candidate windows absorbed into committed weekly slots for Phase 22 and Phase 23.
- Strategic anchor docs added: `04-VISION-TARGET-MILESTONES.md`, `05-CHANGE-REQUESTS.md` (this file), `06-BIG-PICTURE.md`.

**Decision**: `Accept` — user is authoritative; git evidence corroborates Phase 0 start date.

**Decision date**: `2026-04-27`. **Owner**: Product/PM.

**Affected phases/deliverables**: Phase 0 → Phase 23 (entire timeline). All sprint windows. M-01 through M-08.

**Cross-refs**: [02-RECONCILIATION-LOG.md §RC-100](02-RECONCILIATION-LOG.md), [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md).

---

### CR-002 — Sprint 19 compressed to 4 working days (Mon-Thu) for go-live

| Field | Value |
|---|---|
| ID | `CR-002` |
| Date raised | `2026-04-27` |
| Requester | Implicit consequence of CR-001 |
| Type | `Date` + `Risk` |
| Status | `Accepted` (residual risk acknowledged) |

**Description**: Sprint 19 forced from cũ 7-day window (`2026-04-27 → 2026-05-03`) sang 4-day window (`2026-04-27 Mon → 2026-04-30 Thu`) để hit M-02 go-live. P0-6 GitHub Actions CI is the highest-risk item that may need fallback path (manual gate + scripts) instead of full CI.

**Impact analysis**:

- Removes 3 working days of buffer from Sprint 19 closeout.
- Forces fallback acceptance for any P0/P1 item that cannot close: explicit carry to Week of `2026-05-04`.
- Increases reliance on already-shipped artifacts (`MessagingAutomationService`, P0-3, P0-5, P0-7, P0-8 all closed `2026-04-26`).

**Decision**: `Accept`. Mitigation: explicit carry policy logged for each P0/P1 that cannot close in compressed window.

**Decision date**: `2026-04-27`. **Owner**: Product/PM + Engineering lead.

**Affected**: Sprint 19, Phase 17, Phase 18, Phase 19, P0-6.

**Risks created**: M-02 go-live miss probability; mitigated by daily standup + escalation protocol Mon-Thu.

---

### CR-003 — Tenant Revenue Proof dashboard scope (investor-first → tenant exposure)

| Field | Value |
|---|---|
| ID | `CR-003` |
| Date raised | `2026-04-25` (originated in next-phase plan) |
| Requester | Product/PM |
| Type | `Scope` |
| Status | `Deferred` (review when OQ-005 closes) |

**Description**: Dashboard originally framed "investor-only" in [next-phase-implementation-plan-2026-04-25.md §Phase 21](../../development/next-phase-implementation-plan-2026-04-25.md). Master roadmap `2026-04-26` widens to "limited tenant access". Metric set unresolved per [OQ-005](../09-OPEN-QUESTIONS.md).

**Impact analysis**:

- Phase 21 Sprint window (`2026-05-18 → 2026-05-24`) remains 7 days.
- Dashboard scope split: investor-first read-only renders Sprint 21; tenant-exposure access toggles deferred to Sprint 22 (`2026-05-25 → 2026-05-31`).
- Metric set decision must close before Phase 21 Mon `2026-05-18` (i.e., need decision by `2026-05-15`).

**Decision**: `Deferred` until OQ-005 closes (target `2026-05-15`).

**Owner**: Product/PM + CFO.

**Affected**: Phase 21, M-05.

**Cross-refs**: [02-RECONCILIATION-LOG.md §RC-050](02-RECONCILIATION-LOG.md).

---

### CR-004 — SMS adapter timing in Phase 22 (commit vs slip post-22)

| Field | Value |
|---|---|
| ID | `CR-004` |
| Date raised | `2026-04-26` |
| Requester | Architecture lead |
| Type | `Scope` + `Date` |
| Status | `Deferred` (review when OQ-010 closes) |

**Description**: Master roadmap commits SMS adapter to Sprint 22. [OQ-010](../09-OPEN-QUESTIONS.md) asks whether SMS should slip post-go-live until Telegram + WhatsApp parity is fully green.

**Impact analysis**:

- If `Slip`: Phase 22 (`2026-05-25 → 2026-05-31`) loses one deliverable but template generalization can fill the slot.
- If `Commit`: Phase 22 SMS adapter ships in same week as multi-tenant template, raising Sprint 22 density.

**Decision**: `Deferred` until OQ-010 closes (target `2026-05-22`). Default = commit if no decision.

**Owner**: Backend lead + Product/PM.

**Affected**: Phase 22, M-06.

**Cross-refs**: [02-RECONCILIATION-LOG.md §RC-051](02-RECONCILIATION-LOG.md).

---

### CR-005 — WhatsApp provider posture: Twilio default + Evolution QR-bridge (delivery carry)

| Field | Value |
|---|---|
| ID | `CR-005` |
| Date raised | `2026-04-26` |
| Requester | Backend lead |
| Type | `Risk` + `Scope` |
| Status | `Accepted` (decision-recorded; provider delivery carried) |

**Description**: Per [whatsapp-twilio-default-2026-04-26.md](../../development/whatsapp-twilio-default-2026-04-26.md), Twilio chosen as default WhatsApp provider; Evolution API QR-bridge supervised by OpenClaw is near-term customer channel because Meta `Account not registered` and Twilio `401 Authenticate`. Provider delivery still blocked.

**Impact analysis**:

- Phase 19 (`2026-04-25 → 2026-04-30`) ships decision + code paths but not live outbound delivery on WhatsApp.
- Phase 20 carry (`2026-05-04 → 2026-05-10`) takes provider unblock work (P1-2 inline action controls + brand alignment depend on it).
- M-02 go-live can proceed on Telegram + Evolution QR-bridge if WhatsApp delivery still blocked.

**Decision**: `Accept` (decision-closed; delivery-carried). Mitigation: Telegram is primary outbound for go-live demo.

**Owner**: Backend + Product/PM. **Decision date**: `2026-04-26`.

**Affected**: Phase 5, Phase 19, P0-2, P1-2, M-02.

**Cross-refs**: [02-RECONCILIATION-LOG.md §RC-021](02-RECONCILIATION-LOG.md), [09-OPEN-QUESTIONS.md OQ-001](../09-OPEN-QUESTIONS.md).

---

### CR-006 — P0-6 GitHub Actions CI workflow scope (token elevation pending)

| Field | Value |
|---|---|
| ID | `CR-006` |
| Date raised | `2026-04-26` |
| Requester | DevOps lead |
| Type | `Date` + `Resource` |
| Status | `Deferred` (review by `2026-05-04`) |

**Description**: GitHub token used for repository operations does not have `workflow` scope, so `.github/workflows/ci.yml` cannot be added/promoted via tooling. Per [phase-execution-operating-system-2026-04-26.md §P0-6](../../development/phase-execution-operating-system-2026-04-26.md), P0-6 is `Carried`.

**Impact analysis**:

- Sprint 19 cannot ship full GitHub Actions CI before M-02 go-live.
- Fallback path: keep manual `scripts/run_release_gate.sh` as pre-promote gate; CI workflow ships in Sprint 20 (`2026-05-04 → 2026-05-10`) once token elevated.
- Phase 23 final close (Sprint 23, `2026-06-01 → 2026-06-07`) becomes hard deadline for CI fully active.

**Decision**: `Deferred` until token elevated (target `2026-05-04`). Mitigation: manual release-gate script remains authoritative for go-live `2026-04-30`.

**Owner**: DevOps + Repo owner. **Review date**: `2026-05-04`.

**Affected**: Phase 6, Phase 9, Phase 23, P0-6, M-02, M-07.

**Cross-refs**: [phase-execution-operating-system-2026-04-26.md §P0-6](../../development/phase-execution-operating-system-2026-04-26.md).

---

### CR-007 — Apple Wallet certificate ownership (cert provisioning blocker)

| Field | Value |
|---|---|
| ID | `CR-007` |
| Date raised | `2026-04-25` |
| Requester | Backend lead |
| Type | `Resource` + `Risk` |
| Status | `Open` |

**Description**: Phase 20.5 commits both Apple Wallet `.pkpass` and Google Wallet pass. Apple cert management requires owned developer account + signing setup. Risk: Apple Wallet slips, Google Wallet ships first.

**Impact analysis**:

- Phase 20.5 (`2026-05-11 → 2026-05-17`) may close with Google Wallet only.
- Customer experience loss for iOS users until Apple cert provisioned.
- M-04 (`2026-05-17`) success criteria includes "Wallet pass downloads on iOS Safari" — at risk.

**Decision**: `Open` — needs DevOps owner + cert provisioning timeline.

**Affected**: Phase 20.5, M-04.

**Cross-refs**: [02-RECONCILIATION-LOG.md §RC-052](02-RECONCILIATION-LOG.md).

---

### CR-008 — Hiring / capacity decision before Phase 22

| Field | Value |
|---|---|
| ID | `CR-008` |
| Date raised | `2026-04-26` |
| Requester | Product/PM (resource concentration risk per [executive-briefing/00-MASTER-BRIEFING.md](../../executive-briefing/00-MASTER-BRIEFING.md)) |
| Type | `Resource` |
| Status | `Open` |

**Description**: Many P0/P1 items concentrate on a founder-led team. Per [OQ-009](../09-OPEN-QUESTIONS.md), hiring plan needed before Phase 22 (`2026-05-25`).

**Impact analysis**:

- If no hire: Phase 22 multi-tenant template + SMS + service split + raw SQL extract = high single-week density.
- If hire: ramp-up time may consume Phase 22 itself.

**Decision**: `Open` — leadership decision needed by `2026-05-15`.

**Owner**: CEO + Product/PM. **Affected**: Phase 22, M-06, M-07.

**Cross-refs**: [09-OPEN-QUESTIONS.md OQ-009](../09-OPEN-QUESTIONS.md).

---

### CR-009 — Add AI Mentor 1-1 to go-live scope (third tenant proof case)

| Field | Value |
|---|---|
| ID | `CR-009` |
| Date raised | `2026-04-27` |
| Requester | User (Product/PM directive) |
| Type | `Scope` |
| Status | `Accepted` |

**Description**: Add `AI Mentor 1-1` (slug `ai-mentor-doer`, tagline `Convert AI to your DOER`) as the third go-live tenant alongside `Co Mai Hung Chess` and `Future Swim`. Tenant seeded `2026-04-21` via [`backend/migrations/sql/013_ai_mentor_tenant_seed.sql`](../../../backend/migrations/sql/013_ai_mentor_tenant_seed.sql); runtime `https://ai.longcare.au/`; embed via `https://product.bookedai.au/partner/ai-mentor-pro/embed?embed=1&tenant_ref=ai-mentor-doer`; plugin loader `/partner-plugins/ai-mentor-pro-widget.js`; catalog of 10 packages (5 private 1-1 + 5 group mentoring), USD currency, fixed/custom/on-request pricing; login `tenant3 / 123` (`tenant3@bookedai.local`). Plugin interface doc: [`docs/development/ai-mentor-pro-plugin-interface.md`](../../development/ai-mentor-pro-plugin-interface.md).

**Impact analysis**:

- M-01 demo extends from 2 tenants (chess + swim) to 3 tenants (chess + swim + AI Mentor 1-1).
- D-1 rehearsal in [08-IMPLEMENT-FIX-PLAN.md](08-IMPLEMENT-FIX-PLAN.md) requires an additional 30-min slot at `11:30` for AI Mentor end-to-end via embed + tenant runtime.
- Embed channel (`product.bookedai.au/partner/ai-mentor-pro/embed`) must be production-verified before `2026-04-30 09:00` (loader cached, CORS valid, `embed=1` query honored).
- Demo video extends from ≤5 min to ≤7 min (covers all 3 tenant flows).
- Playwright artefact bundle must include all 3 tenant suites.
- Custom asset pack at [`frontend/public/tenant-assets/ai-mentor/`](../../../frontend/public/tenant-assets/ai-mentor/) must render on widget surface.

**Decision**: `Accept`. Owner: `TBD — assign before D-2` (Frontend + Backend lead candidates).

**Decision date**: `2026-04-27`.

**Affected phases/deliverables**: M-01, M-02, Gate A + Gate D + Gate E in [08-IMPLEMENT-FIX-PLAN.md](08-IMPLEMENT-FIX-PLAN.md), [phase-17-detail.md](phases/phase-17-detail.md), [phase-19-detail.md](phases/phase-19-detail.md), [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md).

**Cross-refs**: [implementation-progress.md](../../development/implementation-progress.md) (tenant seed entry `2026-04-21`), [ai-mentor-pro-plugin-interface.md](../../development/ai-mentor-pro-plugin-interface.md).

---

### CR-010 — Channel scope = Telegram-only pre go-live (post-go-live comms-layer research)

| Field | Value |
|---|---|
| ID | `CR-010` |
| Date raised | `2026-04-27` |
| Requester | User (Product/PM directive) |
| Type | `Scope` |
| Status | `Accepted` |

**Description**: Re-prioritize the channel surface for go-live `2026-04-30`. **Telegram is the ONLY P0 channel** at go-live (inbound + outbound on Manager Bot). WhatsApp inbound stays online (already shipped per `P1-3` parity tests). WhatsApp outbound, iMessage / Apple Business Chat, and SMS shift to **post-go-live research + integration** in subsequent weeks. Resolves [OQ-001](../09-OPEN-QUESTIONS.md) by deferring the WhatsApp posture decision past go-live; supersedes CR-005's "Telegram primary; WhatsApp Evolution as bonus" framing for the M-02 promote.

**Impact analysis**:

- WhatsApp outbound, iMessage, SMS removed from go-live blockers.
- New milestones added in [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md): `M-09` WhatsApp outbound production verification (`2026-05-04 → 2026-05-10`); `M-10` iMessage / Apple Business Chat research (`2026-05-11 → 2026-05-17`); `M-11` SMS adapter (cross-ref Phase 22, `2026-05-25 → 2026-05-31`).
- Gate B in [08-IMPLEMENT-FIX-PLAN.md](08-IMPLEMENT-FIX-PLAN.md) renamed `Channel Readiness — Telegram-Primary`. WhatsApp items demoted to `P1-CARRY`.
- Gate D rehearsal `11:00 Future Swim` switches WhatsApp Evolution to **Telegram primary** (WhatsApp bonus only if outbound verifies in time).
- Gate E `09:30` smoke: Manager Bot Telegram inbound is P0; WhatsApp inbound smoke is P1 (acceptable if it passes; not a gate). Embed widget production smoke for AI Mentor 1-1 is P0 (per CR-009).
- Risk reduction: fewer channels to verify pre-promote = higher M-02 confidence.

**Decision**: `Accept`. Owner: Product/PM + Backend lead.

**Decision date**: `2026-04-27`.

**Affected phases/deliverables**: M-02, M-09 (NEW), M-10 (NEW), M-11 (NEW), [phase-19-detail.md](phases/phase-19-detail.md), [phase-22-detail.md](phases/phase-22-detail.md), Gate B + Gate D + Gate E in [08-IMPLEMENT-FIX-PLAN.md](08-IMPLEMENT-FIX-PLAN.md), `OQ-001` (deferred).

**Cross-refs**: [CR-005](#cr-005--whatsapp-provider-posture-twilio-default--evolution-qr-bridge-delivery-carry) (superseded for go-live framing), [09-OPEN-QUESTIONS.md OQ-001](../09-OPEN-QUESTIONS.md).

---

### CR-011 — Stripe subscription real-checkout deferred to Phase 21

| Field | Value |
|---|---|
| ID | `CR-011` |
| Date raised | `2026-04-27` |
| Requester | User (Product/PM directive) |
| Type | `Scope` |
| Status | `Accepted` |

**Description**: For go-live `2026-04-30`, the manual fallback path is acceptable for Stripe handoff. Real Stripe subscription checkout + invoice / receivable linkage stays in Slice 2/3 backlog under Phase 21 (`2026-05-18 → 2026-05-24`). Stripe `success_url` swap (booking-aware return URL) and Apple/Google Wallet pass generation remain Phase 20.5 work (`2026-05-11 → 2026-05-17`).

**Impact analysis**:

- Stripe handoff is already working in chess + Future Swim flows (capability chips visible); Stripe-ready checkout KPI live in admin dashboard; manual fallback degradation working when Stripe call fails (`pricing-consultation` flow degrades to manual follow-up). See [07-PAST-WORK-LOG.md](07-PAST-WORK-LOG.md) for verified state.
- Real subscription checkout, Stripe `success_url` booking-aware swap, and Apple/Google Wallet pass NOT in scope for M-02.
- M-04 (`2026-05-17`) carries Stripe `success_url` swap + Wallet pass; M-05 (`2026-05-24`) carries real subscription checkout + invoice linkage.

**Decision**: `Accept`. Owner: Backend lead.

**Decision date**: `2026-04-27`.

**Affected phases/deliverables**: Phase 5 (status note), Phase 20.5 (success_url swap, Wallet pass), Phase 21 (real subscription checkout), M-02, M-04, M-05.

**Cross-refs**: [07-PAST-WORK-LOG.md](07-PAST-WORK-LOG.md), [phase-20-5-detail.md](phases/phase-20-5-detail.md), [phase-21-detail.md](phases/phase-21-detail.md).

---

### CR-012 — Zoho CRM live activation deferred (awaiting tenant credentials)

| Field | Value |
|---|---|
| ID | `CR-012` |
| Date raised | `2026-04-27` |
| Requester | User (Product/PM directive) |
| Type | `Resource` |
| Status | `Accepted` |

**Description**: Zoho CRM adapter is production-ready: refresh-token flow + region-aware (AU) at [`backend/integrations/zoho_crm/adapter.py`](../../../backend/integrations/zoho_crm/adapter.py); connection-test endpoint `/api/v1/integrations/providers/zoho-crm/connection-test`; operator helper [`scripts/zoho_crm_connect.py`](../../../scripts/zoho_crm_connect.py) (consent URL, exchange code, smoke test); migrations [`011_future_swim_zoho_crm_connection_blueprint.sql`](../../../backend/migrations/sql/011_future_swim_zoho_crm_connection_blueprint.sql) and [`014_future_swim_crm_linked_flow_sample.sql`](../../../backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql). Live activation requires tenant `ZOHO_CRM_*` credentials, which are not yet provisioned. No live tenant has activated Zoho CRM.

**Impact analysis**:

- Not a go-live blocker; adapter ships in production code paths but stays inert until a tenant provides credentials.
- Per-tenant Zoho CRM activation tracked as **enablement work** post-go-live; no specific phase reassignment required.
- Mirrors the framing in [phase-18-detail.md](phases/phase-18-detail.md) (rev-ops ledger evidence drawer covers CRM event class).

**Decision**: `Accept`. Owner: Product/PM + Backend lead.

**Decision date**: `2026-04-27`.

**Affected phases/deliverables**: Phase 18 (status note), M-02 (no blocker), enablement backlog.

**Cross-refs**: [implementation-progress.md](../../development/implementation-progress.md), [07-PAST-WORK-LOG.md](07-PAST-WORK-LOG.md).

---

## 5. Summary

- Total CRs logged: 12
- `Implemented`: 1 (CR-001)
- `Accepted`: 6 (CR-002, CR-005, CR-009, CR-010, CR-011, CR-012)
- `Deferred`: 3 (CR-003, CR-004, CR-006)
- `Open`: 2 (CR-007, CR-008)

## Changelog

- `2026-04-27` (scope update) — Added CR-009 (AI Mentor 1-1 to go-live), CR-010 (Telegram-only pre go-live; comms-layer research deferred post-go-live), CR-011 (Stripe subscription deferred to Phase 21), CR-012 (Zoho CRM live activation deferred awaiting tenant credentials). Updated summary counts.
- `2026-04-27` initial publication. CR-001 logs the re-anchor; CR-002..CR-008 log existing scope/date/resource/risk decisions discovered while re-anchoring.
