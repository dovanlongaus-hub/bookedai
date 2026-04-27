# Vision, Target Outcomes, and Milestones (04)

Date: `2026-04-27` (re-anchored)

Status: `active strategic anchor for the synced roadmap pack`

Authority: tài liệu này là strategic anchor cho [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md). Mỗi milestone (M-01..M-NN) phải có owner, success criteria, dependency, và proof artifact. Khi một milestone trượt hoặc đổi scope, log một change request ở [05-CHANGE-REQUESTS.md](05-CHANGE-REQUESTS.md).

---

## 1. Vision (3-5 sentences)

BookedAI là `AI Revenue Engine for Service Businesses` — một omnichannel agent layer giúp SME dịch vụ biến enquiry rời rạc trên web, chat, gọi điện, email, WhatsApp, Telegram, SMS thành booking + payment posture + customer-care + tenant revenue evidence trong một auditable operating system. Khác với chatbot/booking widget, BookedAI vận hành ba lớp agent (search/conversation, revenue operations, customer care/status) trên cùng một identity-safe action ledger và biến chess academy + Future Swim thành proof verticals trước khi generalize sang clinics, beauty, trades, tutoring, kids activity, professional services. Moat dài hạn nằm ở: (a) reusable verified-tenant template với policy gates, (b) multi-channel customer-care continuity từ booking-reference truth (không phải generic chat memory), và (c) tenant revenue proof dashboard biến claim thành evidence cho investor và SME owner. Mục tiêu 12-tháng là trở thành commercial revenue engine của top 6 service verticals tại Australia với setup-fee + SaaS subscription + commission model. Source: [project.md §Content And Wording](../../../project.md), [prd.md §2-3](../../../prd.md), [executive-briefing/01-product-strategy.md](../../executive-briefing/01-product-strategy.md).

## 2. North-Star Metric

`Qualified enquiries that become traceable booking references with follow-up posture` (per [project.md §Startup canvas](../../../project.md)).

Supporting metrics (operationalized):

- search-to-booking-start rate
- booking-start-to-reference-created rate
- reference-to-portal-reopen rate
- customer-care identity resolution rate
- tenant notification configured/sent/manual-review rate
- payment or receivable posture visibility rate

## 3. Target Outcomes — 90 / 180 / 365 days

Anchored from go-live `2026-04-30`.

### T+90 days — by `2026-07-29`

- **Business**: ≥2 paying tenants live on revenue engine (`Co Mai Hung Chess Class` / Grandmaster Chess + Future Swim Miranda); ≥1 third-vertical pilot signed (clinic OR beauty OR trades). Setup fee + commission baseline locked per OQ-003.
  - Proof: signed tenant agreements, invoices issued, commission posture visible in tenant workspace.
- **Product**: chess + swim full revenue loop runnable end-to-end on production; widget runtime live on ≥1 SME-owned site; wallet pass + Stripe return continuity live; Tenant Revenue Proof dashboard renders ≥1 tenant's real evidence.
  - Proof: live demo recording; Playwright smoke green on widget tenant; investor walkthrough.
- **Tech**: GitHub Actions CI gates promotion; Prometheus + structured logs + error tracker live; image registry with `git-sha` tags; canonical layer map declared; webhook signature/idempotency/tenant_id validators in release-gate checklist.
  - Proof: green CI run; Grafana dashboards; rollback drill ≤5 min on staging.

### T+180 days — by `2026-10-27`

- **Business**: ≥6 paying tenants across ≥3 verticals; recurring monthly revenue ≥A$15k; first investor data room published with Tenant Revenue Proof + audit ledger evidence.
  - Proof: tenant cohort dashboard; finance ledger; data room URL.
- **Product**: multi-tenant template proven via 3rd vertical onboarding ≤2 weeks; SMS booking-care reachable; channel-aware email templates live for booking lifecycle; A/B framework running ≥2 active waves.
  - Proof: vertical onboarding case-study; SMS/Telegram/WhatsApp/email parity matrix; A/B telemetry exports.
- **Tech**: `BaseRepository.tenant_id` validator + chaos test guards every new repository; `tenant_app_service.py` split shipped; `route_handlers.py` raw SQL eliminated; observability SLA defined; beta DB isolated from production.
  - Proof: code review trail; chaos test report; on-call runbook signed.

### T+365 days — by `2027-04-25`

- **Business**: ≥20 paying tenants across ≥5 of the top 6 verticals; ARR ≥A$300k; first non-Australia tenant pilot signed; commission revenue ≥30% of total revenue.
  - Proof: ARR dashboard; geographic distribution map; commission attribution audit.
- **Product**: BookedAI Manager Bot is the canonical brand for customer-care across all channels; portal continuity covers booking + payment + lifecycle + retention; investor-facing Tenant Revenue Proof dashboard refreshed daily with ≥10 tenants.
  - Proof: customer brand recall surveys; portal NPS ≥40; dashboard demo to ≥5 investor meetings.
- **Tech**: zero-trust tenant isolation; quarterly disaster-recovery drill green; SOC2-ready audit log; documentation drift gate prevents merge if synced pack is stale.
  - Proof: pen-test report; DR drill record; doc-sync gate failure history.

## 4. Milestones (Master List)

Format: `M-NN | Name | Date | Owner | Success criteria | Dependencies | Proof artifact`.

| ID | Name | Date | Owner | Success criteria | Dependencies | Proof artifact |
|---|---|---|---|---|---|---|
| `M-01` | **Chess + Swim + AI Mentor 1-1** full demo runnable | `2026-04-29` (Wed) | Product/PM + Frontend + Backend lead | Three independent end-to-end smoke flows — chess academy parent (Telegram), Future Swim (Telegram primary), and AI Mentor 1-1 (embed widget on `ai.longcare.au` + plugin embed) — all reach `Confirmed` booking status from initial enquiry on production. Per tenant: Stripe handoff visible (manual fallback acceptable per [CR-011](05-CHANGE-REQUESTS.md)); confirmation copy shown; portal continuation where applicable; ≥1 follow-up touchpoint queued (email or care agent). No P0 from full-stack-review reopened. Per [CR-009](05-CHANGE-REQUESTS.md). | Phase 17 stabilization, Phase 18 ledger baseline, Phase 19 MessagingAutomationService, Future Swim Miranda URL hotfix migration `020` (closed live `2026-04-26`), AI Mentor 1-1 tenant seed migration `013` (live `2026-04-21`), embed channel production-verified | Live demo recording (≤7 min, all 3 tenants) + Playwright smoke artefact bundle (3 suites) + ledger screenshot |
| `M-02` | **GO-LIVE LOCK** | `2026-04-30` (Thu) | Product/PM + DevOps + CEO | All 8 P0 items closed (or accepted-with-mitigation per CR); release-gate green; image promoted to production; smoke green on production; no rollback within 4h post-promote. **Channel scope per [CR-010](05-CHANGE-REQUESTS.md)**: Manager Bot Telegram inbound + outbound LIVE (P0); WhatsApp inbound smoke acceptable but not a gate (P1); embed widget for AI Mentor 1-1 production smoke green (P0 per [CR-009](05-CHANGE-REQUESTS.md)). | M-01, P0-2 (decision), P0-3, P0-4, P0-5, P0-7, P0-8 closed; P0-1 closed live; P0-6 fallback path agreed; embed channel verified | Production deploy log + smoke screenshots (3 tenants) + Notion/Discord closeout post + leadership signature |
| `M-03` | Widget runtime on first SME-owned site + Phase 19 carry closed | `2026-05-10` (Sun) | Frontend + Backend + GTM | One tenant-branded widget renders + completes booking + reopens portal on a non-bookedai.au domain; P1-1, P1-2 carry, P1-5, P1-10 closed; observability baseline (Prometheus + JSON logs) live | M-02; widget arch doc finalized; P1-2 carried | Widget install URL + admin diagnostics screen + Grafana dashboard URL |
| `M-04` | Wallet + Stripe continuity live | `2026-05-17` (Sun) | Backend + Frontend + DevOps | Stripe-backed test booking returns to booking-aware URL; Apple `.pkpass` + Google Wallet pass downloadable from confirmation hero; portal auto-login self-test green | M-03; Apple Wallet certificate provisioned; BC-2 payment-state badge | Wallet pass screenshots + Stripe test mode video + portal self-test JSON |
| `M-05` | Tenant Revenue Proof + billing truth live | `2026-05-24` (Sun) | Backend + Data + Frontend + Finance | Tenant Revenue Proof dashboard renders one tenant's real evidence (Future Swim or chess); pricing + commission visibility in tenant workspace; channel-aware email templates live; admin reconciliation views live | M-04; OQ-003 closed (commission %); OQ-005 closed (metric set); OQ-004 first investor reference tenant signed | Dashboard screenshot + investor walkthrough recording + commission audit |
| `M-06` | Multi-tenant template + SMS adapter live | `2026-05-31` (Sun) | Backend + Data + Frontend | One new vertical reuses shared template; SMS adapter at `/api/webhooks/sms` reachable; `BaseRepository.tenant_id` validator + chaos test live; `tenant_app_service.py` split shipped | M-05; OQ-009 hiring/capacity; OQ-010 SMS timing | New vertical onboarding case-study + SMS round-trip test + chaos test report |
| `M-07` | Release governance hardened (CI + observability + image registry) | `2026-06-07` (Sun) | DevOps + Security + Architecture | GitHub Actions CI blocks merge on lint/type/test; Grafana + AlertManager + error tracker fully wired; image registry with `git-sha` tags supports tag-swap rollback ≤5 min; canonical layer map declared and referenced; documentation-sync gate active | M-06; OQ-006 beta DB isolation; OQ-011 layer map; OQ-012 error tracker | CI workflow log + Grafana dashboards + image registry screenshot + layer map doc URL + sync-gate failure history |
| `M-08` | TOTAL PROJECT COMPLETION (Phase 0 → Phase 23 closed) | `2026-06-07` (Sun) | Product/PM + CEO | All Phase 0-23 detail files Status = `Shipped`; reconciliation log frozen; all P0/P1 from full-stack review closed (or explicitly carried with CR); strategic anchors (Vision/Target/Milestones) reviewed and refreshed for next horizon | M-01..M-07 | [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) all phases marked Shipped + closeout ceremony Notion/Discord post |
| `M-09` | **WhatsApp outbound production verification** (post-go-live comms layer) | `2026-05-10` (Sun, end of W4) | CTO + COO | Twilio (default per [CR-005](05-CHANGE-REQUESTS.md)) returns verified `delivered` callback for at least one production tenant; OR Meta verification clears. Overlay with Phase 20. Per [CR-010](05-CHANGE-REQUESTS.md). | M-02; CR-005 provider posture; tenant credential availability | Sent → delivered roundtrip log from provider + production smoke recording |
| `M-10` | **iMessage / Apple Business Chat research complete** (post-go-live comms layer) | `2026-05-17` (Sun, end of W5) | CTO + COO | Feasibility memo published covering: cost model, Apple certification path, partner provider selection (e.g., Sendbird, LivePerson, Quiq), integration shape with `MessagingAutomationService`. **Research only — NOT integration**. Overlay with Phase 20.5. Per [CR-010](05-CHANGE-REQUESTS.md). | M-09 | Feasibility memo doc URL + leadership review notes |
| `M-11` | **SMS adapter integrated** (post-go-live comms layer) | `2026-05-31` (Sun, end of W7) | Backend lead | SMS adapter at `/api/webhooks/sms` reachable from one tenant; routes through `MessagingAutomationService`. Cross-link: this is the same deliverable already covered by M-06 / Phase 22; M-11 is the comms-layer naming for the same line item per [CR-010](05-CHANGE-REQUESTS.md). | M-06 / Phase 22 | SMS round-trip test artefact (cross-ref M-06 proof) |

## 5. Milestone dependency graph (text form)

```
M-01 ──► M-02 ──► M-03 ──► M-04 ──► M-05 ──► M-06 ──► M-07 ──► M-08
                    │                                         │
                    ├─► M-09 (WA outbound, W4) ──► M-10 (iMessage research, W5)
                    │           overlay P20                       overlay P20.5
                    │
                    └─► M-11 (SMS adapter, W7) — cross-ref M-06 / Phase 22

                                                  │           │
                                                  └─► Vision T+90d
                                                              │
                                                              └─► Vision T+180d
                                                                          │
                                                                          └─► Vision T+365d
```

`M-01` is the only milestone with parallel slack — `M-02` depends fully on it. M-03..M-08 remain sequential one-per-week. M-09/M-10/M-11 are post-go-live communication-layer milestones that overlay the same weekly cadence (W4/W5/W7) per [CR-010](05-CHANGE-REQUESTS.md).

## 6. Status as of 2026-04-27 (today)

| Milestone | Status | Risk | Confidence |
|---|---|---|---|
| `M-01` chess+swim+AI Mentor demo | At-risk | M (3 working days; FX-1, FX-3, FX-4 still open; AI Mentor embed channel needs production-verify per [CR-009](05-CHANGE-REQUESTS.md)) | Medium-High (most pieces shipped; AI Mentor tenant seeded `2026-04-21`; need integration + embed smoke) |
| `M-02` go-live | At-risk | M (depends M-01 + P0-6 fallback; channel scope narrowed to Telegram-primary per [CR-010](05-CHANGE-REQUESTS.md)) | Medium-High (scope reduction increases confidence) |
| `M-03` widget + carry | Not started | L | High (scope locked, slot open) |
| `M-04` wallet/Stripe | Not started | L | High |
| `M-05` Revenue Proof | Not started | M (OQ-003 + OQ-005 unresolved) | Medium |
| `M-06` multi-tenant + SMS | Not started | M (OQ-010 SMS, OQ-009 capacity) | Medium |
| `M-07` release governance | In overlay (P0-7/P0-8 closed) | M (P0-6 GitHub workflow scope) | Medium-High |
| `M-08` total project | Not started | L | High once M-07 closes |
| `M-09` WhatsApp outbound verify | Not started (post-go-live) | M (provider posture per CR-005; tenant credentials) | Medium |
| `M-10` iMessage research | Not started (post-go-live) | L (research only, not integration) | Medium-High |
| `M-11` SMS adapter | Not started (cross-ref M-06) | M (per CR-004 + CR-010) | Medium |

## 7. Quarterly horizon (post-M-08)

`M-08` closes Sprint 23 of the current re-anchor. Subsequent quarters (T+90 → T+180 → T+365) reuse the same milestone format but are NOT scoped here — they are tracked in [executive-briefing](../../executive-briefing/) and will be folded back into a successor synced pack.

## Changelog

- `2026-04-27` (scope update) — M-01 extended from chess+swim to chess+swim+AI Mentor 1-1 (3 tenants) per [CR-009](05-CHANGE-REQUESTS.md). M-02 channel scope narrowed to Telegram-primary per [CR-010](05-CHANGE-REQUESTS.md). Added M-09 (WhatsApp outbound verify), M-10 (iMessage research), M-11 (SMS adapter cross-ref). Updated dependency graph + status table.
- `2026-04-27` initial publication (re-anchor).
