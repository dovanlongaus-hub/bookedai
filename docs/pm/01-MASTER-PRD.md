# BookedAI Master PRD (01) — Consolidated

Date: `2026-04-26`

Status: `active consolidated PRD`

Inherits authority from `project.md` → `prd.md` → [bookedai-master-prd.md](../architecture/bookedai-master-prd.md). Mọi conflict được hoà giải trong [08-MERGE-MAP.md](08-MERGE-MAP.md).

## 1. Problem Statement

Service SMEs (clinics, beauty/wellness, trades, tutoring, kids activities, professional services) đang **mất doanh thu thật** vì nhu cầu khách bị rò rỉ qua nhiều kênh rời rạc:

- Search traffic không chuyển thành booking
- Web visitors rời đi không enquire
- Inbound calls không được trả lời
- Chat/form trả lời chậm; email tồn đọng
- Follow-up không xảy ra; bookings không hoàn tất payment
- Hệ thống rời rạc che giấu doanh thu thắng/mất

Demand đã có sẵn — vấn đề là **không có một hệ thống duy nhất** kết nối các thời điểm capture → response → qualify → booking → payment → follow-up → recovery để hiển thị doanh thu thật cho operator.

Source: [`prd.md` §5](../../prd.md), [`bookedai-master-prd.md`](../architecture/bookedai-master-prd.md).

## 2. Vision

> "BookedAI là **AI Revenue Engine** cho service businesses — một omnichannel agent layer captures intent, creates booking references, tracks payment/follow-up posture, và record mọi revenue action trong một auditable operating system."

Tầm nhìn 3 lớp proof:

- **SME appeal**: ít enquiry bị bỏ lỡ, reply nhanh hơn, handoff booking rõ, ít admin, revenue rõ ràng.
- **AI innovation**: tenant-aware search, channel identity policy, shared booking-care agent, auditable action ledger, reusable vertical templates.
- **Financial clarity**: setup fee + SaaS subscription + performance-aligned commission/revenue share, có evidence qua booking refs, payment posture, portal reopen, tenant Ops, release gates.

Source: [`bookedai-master-roadmap-2026-04-26.md` §Market and Investor Narrative](../architecture/bookedai-master-roadmap-2026-04-26.md), [`prd.md` §3](../../prd.md).

## 3. Target Users & Personas

### Customer personas (segment ưu tiên)

| Code | Persona | Mô tả | Goal chính |
|---|---|---|---|
| `P-SME-OWNER` | SME owner / GM | Local service business owner, appointment-driven | Tăng doanh thu từ demand đã có, giảm leakage |
| `P-FRONT-DESK` | Front desk / Ops manager | Người trực tiếp xử lý enquiry, lịch, follow-up | Trả lời nhanh, booking dễ, ít context-switch |
| `P-BAI-OPERATOR` | BookedAI internal operator | Support/SRE/release engineer | Tenant health, billing, audit, release safety |
| `P-END-CUSTOMER` | End customer (B2C) | Người tìm dịch vụ, book, return cho care | Discovery nhanh, trust, low-friction booking, status truthful |
| `P-PARENT-ACADEMY` | Parent (chess/swim) | Phụ huynh học viên long-tenure | Assessment, placement, billing, progress, support 24/7 |
| `P-INVESTOR-JUDGE` | Investor / startup judge | Audience cho pitch/demo | Hiểu wedge, AI moat, financial logic, proof live |

### Verticals ưu tiên (demand vertical)

clinics, beauty/wellness, trades/local services, tutoring/education, kids activity, professional local services. **Chess Academy** và **Future Swim** là 2 proof verticals đầu tiên.

### Operating personas (do platform tạo ra)

- `Search and Conversation Agent` — discovery, intake, clarification, shortlist, booking handoff
- `Revenue Operations Agent` — follow-up, payment reminder, CRM sync, billing, retention
- `Customer Care and Status Agent` — returning-customer status, reschedule/cancel/payment-help

Source: [`prd.md` §4](../../prd.md), [`bookedai-master-prd.md`](../architecture/bookedai-master-prd.md), [`tenant-app-strategy.md`](../architecture/tenant-app-strategy.md).

## 4. Jobs-to-be-Done (JTBD)

| JTBD-ID | Job | When | So that |
|---|---|---|---|
| `JTBD-01` | Capture every service enquiry across channels | Bất kể chat/call/email/web/messaging | Không bỏ lỡ paying customer |
| `JTBD-02` | Reply while intent is hot | Khi customer còn online | Tỷ lệ chuyển đổi cao hơn |
| `JTBD-03` | Qualify and route safely | Khi context khách chưa đủ | Booking quality cao, không booking sai |
| `JTBD-04` | Resolve to a booking path with truthful trust state | Khi customer chọn 1 service | Tránh promising sai availability/payment |
| `JTBD-05` | Collect or queue payment | Khi booking đã xác nhận | Doanh thu được track, có audit |
| `JTBD-06` | Follow up on payment, reminders, CRM, retention | Sau booking | Ít leakage, retention tốt |
| `JTBD-07` | Show owners revenue won/missed/recoverable | Hàng tuần/tháng | Operator action ưu tiên đúng |
| `JTBD-08` | Returning customer self-serves status, reschedule, cancel | Sau booking | Giảm support load, tăng trust |
| `JTBD-09` | Tenant onboards catalog and goes live | Khi tenant ký hợp đồng | Time-to-value ngắn |
| `JTBD-10` | Operator audits tenant, billing, integrations | Hàng ngày | Reliability, multi-tenant safety |

## 5. Functional Requirements (FR)

ID format `FR-NNN`. Mỗi FR ánh xạ tới Source và Phase ownership (xem `03-EXECUTION-PLAN.md`).

### FR.A — Public Acquisition & Search

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-001` | Public homepage là search-first, conversion-first responsive web app, không phải brochure dài | [`prd.md` §6](../../prd.md), [`landing-page-system-requirements.md`](../architecture/landing-page-system-requirements.md) | 1, 17 |
| `FR-002` | User nhập natural-language service request từ public surface, hệ thống trả về shortlist với decision-ready metadata | [`prd.md` §6](../../prd.md) | 3, 17 |
| `FR-003` | Search hiển thị early useful matches + staged progress copy khi live ranking chậm | [`prd.md` §6](../../prd.md) | 17 |
| `FR-004` | Result cards: thumbnail/preview top-left, Google Maps action cho physical-place, provider/source, detail popup, explicit `Book` action | [`prd.md` §6](../../prd.md) | 17 |
| `FR-005` | Selecting a result KHÔNG tự đẩy customer vào form; chỉ mở booking sau explicit `Book` | [`prd.md` §6](../../prd.md) | 17 |
| `FR-006` | Reviewed BookedAI tenant match (Chess, Future Swim) hiển thị chips: BookedAI tenant badge, Stripe, QR payment, QR confirmation, calendar, email, WhatsApp Agent, portal edit | [`prd.md` §6](../../prd.md) | 17, 22 |
| `FR-007` | Locale switcher: English, Tiếng Việt | [`bookedai-master-prd.md`](../architecture/bookedai-master-prd.md) | 1 |
| `FR-008` | Mobile no-overflow at 390px cho mọi public surface | [`prd.md` §6](../../prd.md), full-stack review FX-3 | 17 |
| `FR-009` | Clarification chips inline trong BookedAI chat, không tách panel riêng | [`prd.md` §6](../../prd.md) | 17 |

### FR.B — Search Truth & Matching

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-010` | Tenant truth là primary; public web fallback chỉ khi tenant truth không đủ | [`prd.md` §7](../../prd.md), [`search-truth-remediation-spec.md`](../development/search-truth-remediation-spec.md) | 3, 6 |
| `FR-011` | Hard filters chạy trước semantic expansion; suppress wrong-domain/wrong-location/stale-context | [`prd.md` §7](../../prd.md) | 3 |
| `FR-012` | Search query phân tích service intent, location, timing, audience, preference cues | [`prd.md` §7](../../prd.md) | 3 |
| `FR-013` | Public-web fallback labeled rõ là `public_web_search`, không trộn với tenant catalog | [`prd.md` §7](../../prd.md) | 3 |
| `FR-014` | Search replay gate threshold: tenant-positive cohort 100% hit, public-web cohort ≥4/7, 0 wrong-domain leak | [`qa-testing-reliability-ai-evaluation-strategy.md` §4](../architecture/qa-testing-reliability-ai-evaluation-strategy.md) | 6, 9 |

### FR.C — Booking, Payment, Portal

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-020` | Booking resolution preserve trust state từ source thật (tenant/partner/web) | [`prd.md` §9](../../prd.md) | 3 |
| `FR-021` | Hỗ trợ direct booking, partner checkout, invoice-after-confirmation, pending/manual-review | [`prd.md` §9](../../prd.md) | 3, 5 |
| `FR-022` | Payment hỗ trợ `stripe_card`, `partner_checkout`, deferred invoice; UI phản ánh trạng thái | [`prd.md` §9](../../prd.md) | 5, 21 |
| `FR-023` | Booking confirmation expose durable booking reference + scan-ready QR mở `portal.bookedai.au` | [`prd.md` §6](../../prd.md) | 17 |
| `FR-024` | Tenant-confirmed booking giữ portal QR ngay cả khi backend không trả QR image (frontend fallback) | [`prd.md` §6](../../prd.md) | 17 |
| `FR-025` | Thank You state visible ≥16s với email/calendar/portal/continue-chat actions | [`prd.md` §6](../../prd.md) | 17 |
| `FR-026` | Portal lookup theo verified email/phone/magic-link/booking reference | [`prd.md` §9](../../prd.md) | 17, 19 |
| `FR-027` | Portal hỗ trợ review, reschedule, pause, downgrade, cancel theo policy tenant; auditable | [`prd.md` §9](../../prd.md) | 17, 19, 22 |
| `FR-028` | Portal auto-login cho `v1-*` reference URLs (4 nguồn param) | [`portal-auto-login-recovery-2026-04-26.md`](../development/portal-auto-login-recovery-2026-04-26.md) | 17 |
| `FR-029` | Portal hiển thị progress-report và next-class cho recurring program (academy) | [`prd.md` §9](../../prd.md), [`demo-grandmaster-chess-revenue-engine-blueprint.md`](../architecture/demo-grandmaster-chess-revenue-engine-blueprint.md) | 22 |
| `FR-030` | Apple Wallet `.pkpass` + Google Wallet pass cho confirmed booking | [`bookedai-master-roadmap-2026-04-26.md` Phase 20.5](../architecture/bookedai-master-roadmap-2026-04-26.md) | 20.5 |
| `FR-031` | Stripe checkout `success_url` resolve về booking-aware return URL | Phase 20.5 | 20.5 |

### FR.D — Tenant Workspace

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-040` | `tenant.bookedai.au` là single tenant gateway: sign-in, onboarding, billing, team, workspace | [`prd.md` §10](../../prd.md), [`tenant-app-strategy.md`](../architecture/tenant-app-strategy.md) | 7 |
| `FR-041` | Google sign-in vs create-account intent rõ ràng; backend chống tạo workspace ngẫu nhiên khi sign-in | [`prd.md` §1](../../prd.md) | 7 |
| `FR-042` | Email-first verification-code flow + Google continuation trên cùng gateway | [`tenant-app-strategy.md`](../architecture/tenant-app-strategy.md) | 7 |
| `FR-043` | Workspace domain: overview, catalog/publishing, bookings, leads, billing, team, integrations, plugin/widget, branding, revenue-ops, retention, communications timeline, receivables | [`prd.md` §10](../../prd.md), [`admin-enterprise-workspace-requirements.md`](../architecture/admin-enterprise-workspace-requirements.md) | 7 |
| `FR-044` | Roles: `tenant_admin`, `finance_manager`, `operator`; restricted hiển thị read-only thay vì silent fail | [`prd.md` §10](../../prd.md) | 7 |
| `FR-045` | Tenant revenue-ops surfaces: leads cần action, bookings awaiting payment, subscriptions sắp renew, overdue invoices, churn-risk, communication history, AI action suggestions có policy approve/reject/auto-run | [`prd.md` §10](../../prd.md) | 18, 21 |
| `FR-046` | Tenant Ops panel hiển thị queued/sent/failed/manual-review/completed action runs với evidence drawer | [`phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md`](../development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md) | 18 |
| `FR-047` | Pricing & commission visibility trong tenant workspace (current plan, commission rate, billing history) | full-stack review, Phase 21 | 21 |

### FR.E — Admin Workspace

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-050` | `admin.bookedai.au` là internal operator/oversight/support control plane | [`prd.md` §12](../../prd.md), [`internal-admin-app-strategy.md`](../architecture/internal-admin-app-strategy.md) | 8 |
| `FR-051` | Admin shell sidebar workspace menu, grouped operator lanes; không card selector chiếm chỗ | [`admin-enterprise-workspace-requirements.md`](../architecture/admin-enterprise-workspace-requirements.md) | 8 |
| `FR-052` | `admin.bookedai.au` proxy `/api/*` tới backend trước SPA fallback | [`prd.md` §12](../../prd.md) | 8 |
| `FR-053` | Tenant directory + tenant workspace deeper drill-in | [`prd.md` §12](../../prd.md) | 8 |
| `FR-054` | Tenant branding + HTML content editing | [`prd.md` §12](../../prd.md) | 8 |
| `FR-055` | Tenant role/permission management; tenant catalog/service CRUD; billing investigation | [`prd.md` §12](../../prd.md) | 8 |
| `FR-056` | Cross-tenant support access AUDITED; read-only support mode block mutation | [`prd.md` §12](../../prd.md) | 8 |
| `FR-057` | Action queue review cho AI-triggered automations + webhook investigation | [`prd.md` §12](../../prd.md) | 18 |
| `FR-058` | Admin booking responsive card layout cho 390px-720px gap | full-stack review FX-3, P1-7 | 17 |
| `FR-059` | `Tenant Revenue Proof` dashboard cho investor + limited tenant access | [`bookedai-master-roadmap-2026-04-26.md` Phase 21](../architecture/bookedai-master-roadmap-2026-04-26.md) | 21 |

### FR.F — AI Agent System

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-060` | Search & Conversation Agent: intake, clarification, shortlist, booking handoff, pre-booking trust explanation | [`prd.md` §8](../../prd.md) | 3, 19 |
| `FR-061` | Revenue Operations Agent: lead/booking action queue, follow-up orchestration (email/SMS/WhatsApp/CRM), webhook trigger, receivable monitoring, retention | [`prd.md` §8](../../prd.md) | 18, 19, 21 |
| `FR-062` | Customer Care & Status Agent: identity by phone/email/booking ref/session, status answers từ booking truth, reschedule/cancel/payment-help, không fabricate | [`prd.md` §8](../../prd.md) | 19 |
| `FR-063` | Agent-to-agent handoff: structured `intent + identity + selected option + confidence + next step` | [`prd.md` §8](../../prd.md) | 19 |
| `FR-064` | Mọi agent action grounded trong tenant-scoped data + auditable event records | [`prd.md` §8](../../prd.md) | 18, 22 |
| `FR-065` | Action ledger states: `queued`, `in_progress`, `sent`, `completed`, `failed`, `manual_review`, `skipped` | [`prd.md` §8](../../prd.md) | 18 |
| `FR-066` | High-risk actions cần approval/manual-review/policy gating | [`prd.md` §8](../../prd.md) | 18 |
| `FR-067` | Cross-channel actions idempotent + replay-safe | [`prd.md` §8](../../prd.md) | 19, 23 |
| `FR-068` | Customer-facing brand: `BookedAI Manager Bot` (Telegram `@BookedAI_Manager_Bot`) cho web chat + Telegram + WhatsApp | [`project.md` 2026-04-26 messaging update](../../project.md) | 19 |

### FR.G — Messaging Automation Layer

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-070` | Shared `MessagingAutomationService` xử lý web chat + Telegram + WhatsApp + (sau này SMS/email) | [`messaging-automation-telegram-first-2026-04-26.md`](../development/messaging-automation-telegram-first-2026-04-26.md) | 19 |
| `FR-071` | Web chat path: `Website Chat UI -> /api/chat/send -> AI Engine -> response`; `/api/booking-assistant/chat` alias | [`project.md`](../../project.md) | 19 |
| `FR-072` | Telegram path: `Bot -> /api/webhooks/bookedai-telegram -> AI Engine -> sendMessage`; verify `X-Telegram-Bot-Api-Secret-Token` | [`project.md`](../../project.md) | 19 |
| `FR-073` | WhatsApp inbound: Twilio mặc định, Evolution outbound disabled, Meta blocked tới khi verified | [`whatsapp-twilio-default-2026-04-26.md`](../development/whatsapp-twilio-default-2026-04-26.md) | 19 |
| `FR-074` | Evolution webhook HMAC-SHA256 verification qua `WHATSAPP_EVOLUTION_WEBHOOK_SECRET` | [`project.md`](../../project.md) | 19 |
| `FR-075` | Telegram private channel: chỉ load booking data qua booking reference hoặc safe phone/email match, KHÔNG qua chat id alone | [`project.md`](../../project.md) | 19 |
| `FR-076` | 60-day conversation window, last 6 turns context, ask cho booking ref khi identity ambiguous | [`project.md`](../../project.md) | 19 |
| `FR-077` | Webhook idempotency table + route gate cho WhatsApp, Evolution, customer Telegram | full-stack review P0-4 | 19 |
| `FR-078` | `actor_context.tenant_id` validator trên public assistant routes | full-stack review P0-5 | 19 |
| `FR-079` | Channel-aware email templates: `info@bookedai.au` + chat-channel mention | full-stack review P1-10 | 21 |
| `FR-080` | SMS adapter tại `/api/webhooks/sms` reusing identity/mutation policy | [`bookedai-master-roadmap-2026-04-26.md` Phase 22](../architecture/bookedai-master-roadmap-2026-04-26.md) | 22 |

### FR.H — Widget & Plugin Runtime

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-090` | Widget identity explicit: tenant, host origin, page source, campaign, install mode | [`widget-plugin-multi-tenant-booking-architecture-2026-04-23.md`](../development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md) | 20 |
| `FR-091` | Embed-safe assistant shell cho receptionist / sales / customer-service entry | Phase 20 | 20 |
| `FR-092` | Embedded installs converge cùng booking + portal lifecycle | [`prd.md` §11](../../prd.md) | 20 |
| `FR-093` | Tenant install instructions + admin validation diagnostics | Phase 20 | 20 |
| `FR-094` | Webhook/API triggers: lead created, booking created/updated, payment intent/paid/overdue, subscription renewal upcoming/failed, invoice issued/overdue, CRM sync requested/failed, communication delivered/failed, retention-risk detected | [`prd.md` §11](../../prd.md) | 20 |

### FR.I — CRM, Communications, Lifecycle

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-100` | Local-first lead/booking là operational ledger; CRM sync là enrichment | [`prd.md` §13](../../prd.md), [`crm-email-revenue-lifecycle-strategy.md`](../architecture/crm-email-revenue-lifecycle-strategy.md) | 5 |
| `FR-101` | Email/SMS/WhatsApp qua provider-safe abstractions; states `pending/retrying/manual_review/failed/synced` | [`prd.md` §13](../../prd.md) | 5 |
| `FR-102` | Lifecycle automation: acquisition, booking, payment, reminder, confirmation, thank-you, retention | [`prd.md` §13](../../prd.md) | 5, 21 |
| `FR-103` | Zoho CRM integration: lead/contact/deal/task sync với retry + manual-review posture | [`bookedai-zoho-crm-integration-map.md`](../architecture/bookedai-zoho-crm-integration-map.md) | 5 |
| `FR-104` | Webhook auto-renew + lifecycle controls cho Zoho | [`project-update-2026-04-22-zoho-crm-webhook-auto-renew.md`](../development/project-update-2026-04-22-zoho-crm-webhook-auto-renew.md) | 5 |
| `FR-105` | Tenant booking notification mặc định Telegram; CC `business_email` khi tenant-owned service | [`tenant-booking-email-cc-telegram-notification-2026-04-26.md`](../development/tenant-booking-email-cc-telegram-notification-2026-04-26.md) | 19 |

### FR.J — Analytics & Reporting

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-110` | Expose revenue won/pending/missed/recoverable views | [`prd.md` §14](../../prd.md), [`analytics-metrics-revenue-bi-strategy.md`](../architecture/analytics-metrics-revenue-bi-strategy.md) | 4, 21 |
| `FR-111` | Source attribution preserved acquisition → booking → payment | [`prd.md` §14](../../prd.md) | 5 |
| `FR-112` | Search-agent conversion + fallback quality reporting | [`prd.md` §14](../../prd.md) | 6 |
| `FR-113` | Revenue-ops agent action counts + success rates | Phase 18 | 18 |
| `FR-114` | Tenant billing summaries + commission summaries + summary email delivery posture | [`prd.md` §15](../../prd.md) | 21 |

### FR.K — Pricing & Billing

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-120` | Commercial model: setup fee + SaaS subscription + performance-aligned commission | [`pricing-packaging-monetization-strategy.md`](../architecture/pricing-packaging-monetization-strategy.md) | 0, 21 |
| `FR-121` | Public package vocab: `Freemium`, `Pro`, `Pro Max`, `Advance Customize` (custom lane) | [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md) | 1 |
| `FR-122` | Tenant fee + commission calculation từ agreed billing rules | [`prd.md` §15](../../prd.md) | 21 |
| `FR-123` | Tenant invoice generation + reminder cadence | [`prd.md` §15](../../prd.md) | 21 |
| `FR-124` | Automated summary email dispatch tới tenants | [`prd.md` §15](../../prd.md) | 21 |
| `FR-125` | Policy-based auto-reminder + escalation cho unpaid tenant fees | [`prd.md` §15](../../prd.md) | 21 |

### FR.L — Demo & Vertical Templates

| ID | Requirement | Source | Phase |
|---|---|---|---|
| `FR-130` | `demo.bookedai.au` là first-minute proof của full revenue engine, không chỉ booking chat | [`prd.md` §16](../../prd.md) | 0, 17 |
| `FR-131` | Chess Academy = first connected-agent vertical: intent→assessment→placement→booking→payment→class→coach input→AI report→parent follow-up→billing→retention | [`demo-grandmaster-chess-revenue-engine-blueprint.md`](../architecture/demo-grandmaster-chess-revenue-engine-blueprint.md) | 19, 22 |
| `FR-132` | Future Swim = second proof vertical with Miranda URL hotfix migration `020` | full-stack review P1-9 | 17, 20 |
| `FR-133` | Vertical template contracts cho intake/placement/booking/payment/report/retention policy | Phase 22 | 22 |
| `FR-134` | Channel playbooks per template; reusable verified-tenant search-result contract | Phase 22 | 22 |
| `FR-135` | Academy student/report/enrollment/retention state in tenant-scoped snapshot read models | [`prd.md` §16](../../prd.md) | 22 |

## 6. Non-Functional Requirements (NFR)

| ID | Category | Requirement | Source | Phase |
|---|---|---|---|---|
| `NFR-001` | Performance | Public homepage TTI ≤ 3s (P75) trên 4G mobile; search early matches xuất hiện ≤ 2s | implicit từ search progressive UX | 17 |
| `NFR-002` | Performance | API p95 latency ≤ 500ms cho `/api/v1/matching/*` cached path; ≤ 2s khi cold | [`api-architecture-contract-strategy.md`](../architecture/api-architecture-contract-strategy.md) | 3, 6 |
| `NFR-003` | Performance | AbortController + 30s timeout trên tất cả 47 fetch calls trong `frontend/src/shared/api/client.ts` | full-stack review FX-2 | 19 |
| `NFR-010` | Security | Tenant isolation by default; `BaseRepository` validator fail bất kỳ tenant-scoped query thiếu `tenant_id` filter | [`auth-rbac-multi-tenant-security-strategy.md`](../architecture/auth-rbac-multi-tenant-security-strategy.md), full-stack review | 22 |
| `NFR-011` | Security | Webhook HMAC verification: Telegram secret-token, Evolution HMAC-SHA256 | full-stack review P0-3 | 19 |
| `NFR-012` | Security | Idempotency table + replay protection cho mọi inbound webhook | full-stack review P0-4 | 19 |
| `NFR-013` | Security | Provider URL allowlisting `http`/`https` only; HTML escape mọi customer-controlled content trong email | [`source-code-review-and-security-hardening-2026-04-26.md`](../development/source-code-review-and-security-hardening-2026-04-26.md) | 23 |
| `NFR-014` | Security | OpenClaw rootless posture; host mount scope reduction | full-stack review P0-8 | 23 |
| `NFR-015` | Security | Provider/webhook security controls; no silent cross-tenant mutation paths | [`prd.md` §17](../../prd.md) | 17, 22 |
| `NFR-016` | Security | Cross-tenant support access audited; read-only mode blocks mutation | [`prd.md` §12](../../prd.md) | 8 |
| `NFR-020` | Reliability | Health-checkable production runtime; `scripts/healthcheck_stack.sh` xanh trước promote | [`release-gate-checklist.md`](../development/release-gate-checklist.md) | 6, 9, 23 |
| `NFR-021` | Reliability | Retry-aware integration posture; outbox + dead-letter | [`integration-hub-sync-architecture.md`](../architecture/integration-hub-sync-architecture.md) | 5 |
| `NFR-022` | Reliability | Replay/audit coverage cho agent-triggered lifecycle actions | [`prd.md` §17](../../prd.md) | 18 |
| `NFR-023` | Reliability | Tagged image rollback ≤ 5 phút trên staging | full-stack review P1-6 | 21, 23 |
| `NFR-024` | Reliability | Beta DB separation + image registry với `git-sha` tags | full-stack review P1-6 | 23 |
| `NFR-030` | Scalability | Worker runtime split plan; first async jobs off request path | [`devops-deployment-cicd-scaling-strategy.md`](../architecture/devops-deployment-cicd-scaling-strategy.md) | 6 |
| `NFR-031` | Scalability | Rate-limiting on `/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, webhooks | full-stack review | 22 |
| `NFR-040` | Accessibility | WCAG 2.1 AA cho public surfaces; touch target ≥ 44px (WCAG 2.5.5); `aria-describedby` cho phone/email helper text | full-stack review QW-2/QW-3, P1-7 | 17 |
| `NFR-041` | Accessibility | Focus restoration on dialog close (`data-autofocus-return`) | full-stack review FX-5 | 17 |
| `NFR-042` | Accessibility | Destructive action confirmation modal (cancel, logout, downgrade) | full-stack review FX-4 | 17 |
| `NFR-050` | Compliance | Tenant data isolation; PII handling theo Australian Privacy Principles | implicit | 23 |
| `NFR-051` | Compliance | Audit trail cho mọi cross-tenant admin support access | [`prd.md` §12](../../prd.md) | 8 |
| `NFR-052` | Compliance | Customer-care channel: WhatsApp business verification posture; cancel/reschedule confirm qua email + CRM mirror | [`prd.md` §1](../../prd.md) | 19 |
| `NFR-060` | Observability | Prometheus + Grafana + AlertManager với Discord/PagerDuty routing | full-stack review | 20, 23 |
| `NFR-061` | Observability | Stronger trace ids cross-service | [`bookedai-master-roadmap-2026-04-26.md` Phase 23](../architecture/bookedai-master-roadmap-2026-04-26.md) | 23 |
| `NFR-070` | DX / CI | GitHub Actions CI block lint/type/test failures | full-stack review P0-6 | 19, 23 |
| `NFR-071` | DX / CI | Expanded `.env.production.example` với checksum guard | full-stack review P0-7 | 19 |
| `NFR-072` | DX / CI | ESLint rule block raw hex in `className`; migrate 619 raw hex usages tới design tokens | full-stack review RF-1 | 22 |
| `NFR-073` | DX / CI | Code-split `BookingAssistantDialog.tsx` (6K LOC) thành 4 lazy chunks; `TenantApp.tsx` (4.9K LOC) theo workspace nav | full-stack review RF-5/RF-6 | 22 |
| `NFR-080` | UX consistency | Cross-surface consistency public/portal/tenant/admin; mobile-safe customer flows | [`prd.md` §17](../../prd.md) | 17 |
| `NFR-081` | UX consistency | Single brand asset source `frontend/public/branding/`; no parallel logo systems | [`prd.md` §1](../../prd.md) | 1 |
| `NFR-082` | UX consistency | Single design-token model: shadow consolidation 22+153→4 slots; radius 16+518→5 tokens; button styles 12→4 | full-stack review RF-2/RF-3/RF-4 | 22 |

## 7. Success Metrics (KPIs)

### Commercial

- `KPI-C1` Lead-to-booking conversion (target tracked Phase 6+; experiment hypothesis: `≥12% homepage searchers select a result/detail in same session`)
- `KPI-C2` Booking-to-payment conversion (Phase 21 truth)
- `KPI-C3` Attributable revenue generated per tenant per month
- `KPI-C4` Missed/recoverable revenue identified

### Product

- `KPI-P1` Search relevance: tenant-positive cohort 100%, public-web cohort ≥4/7, 0 wrong-domain leak
- `KPI-P2` Tenant-hit rate before public-web fallback
- `KPI-P3` Booking completion rate (Ask→Match→Compare→Book→Confirm→Portal)
- `KPI-P4` Portal continuation success: ≥25% bookings reopen portal trong 7 ngày
- `KPI-P5` Lead-to-action latency
- `KPI-P6` Automated reminder success rate
- `KPI-P7` Retention save rate
- `KPI-P8` Customer-support deflection rate với truthful status handling

### Operational

- `KPI-O1` CRM sync success rate
- `KPI-O2` Communication delivery success rate per channel
- `KPI-O3` Tenant onboarding & publish readiness time
- `KPI-O4` Tenant billing collection rate
- `KPI-O5` Webhook trigger success rate
- `KPI-O6` AI action escalation rate vs auto-resolution rate
- `KPI-O7` Release gate pass rate; rollback frequency

Source: [`prd.md` §18](../../prd.md), [`project.md` Experiment baseline](../../project.md).

## 8. Non-Goals

- KHÔNG xây 1 chatbot generic
- KHÔNG xây 1 booking widget độc lập tách rời booking lifecycle
- KHÔNG xây 1 CRM sync utility đơn lẻ
- KHÔNG xây 1 generic AI brochure site
- KHÔNG cam kết instant cancel/reschedule/payment/CRM mutation khi backend chưa hoàn tất action (dùng `queued`, `manual review`, `request received`)
- KHÔNG dùng marketplace-style discovery rộng trước khi appointment-based vertical đã ổn định
- KHÔNG mở native mobile app trước khi responsive web app stabilize (Phase 17 lock)
- KHÔNG ship paid acquisition scale trước khi owned email + customer identity + audited side effects sẵn sàng

Source: [`prd.md` §2](../../prd.md), [`project.md` strategic trade-offs](../../project.md).

## 9. Dependencies

### Internal

- Supabase / Postgres (data layer)
- FastAPI backend trong `backend/`
- React + TypeScript + Vite frontend trong `frontend/`
- Prisma + Next.js subtree trong `app/` (parallel exploration, không phải production runtime)
- OpenClaw operator gateway + Telegram operator bot
- Docker Compose / Nginx / Cloudflare deployment

### External providers

- Stripe (payments)
- Zoho CRM + Zoho Calendar + Zoho Mail
- Twilio (WhatsApp default), Meta Cloud (blocked), Evolution (compatibility), Telegram Bot API
- n8n (workflow orchestration)
- Email provider (lifecycle)
- Tawk (legacy webhook intake)
- Apple Wallet, Google Wallet (Phase 20.5)
- OpenAI (LLM provider via `OPENAI_API_KEY`)

### Documentation chain

`prd.md` ↔ `project.md` ↔ `bookedai-master-roadmap-2026-04-26.md` ↔ `current-phase-sprint-execution-plan.md` ↔ `next-phase-implementation-plan-2026-04-25.md` ↔ `release-gate-checklist.md` ↔ `implementation-progress.md`.

## 10. Constraints

- **Production live**: hệ thống đã có khách thật và booking thật → mọi thay đổi additive, migration-safe, không phá runtime hiện tại.
- **Frozen technology stack**: React+TS+Vite, FastAPI, Postgres, Docker Compose. Không thay stack cho đến khi explicitly approved.
- **Single repo**: `BookedAI/` đơn-repo; bounded contexts qua module convention.
- **Australian context**: timezone Australia/Sydney; brand voice English-first, Tiếng Việt secondary.
- **Customer support identity**: `info@bookedai.au` + `+61455301335` (BookedAI WhatsApp identity) là default contact — không override bằng provider catalog.
- **WhatsApp business verification chưa xong** → dùng QR-session bridge qua Evolution API như interim, supervised by OpenClaw, đến khi Twilio/Meta verified.
- **No skipping hooks** trong git commits; release gate phải xanh trước promote.

## 11. Assumptions

- Sprint 19 (`2026-04-27 → 2026-05-03`) sẽ đóng tất cả 8 P0 từ full-stack review trước khi Sprint 20 mở.
- Future Swim sẽ là first revenue loop end-to-end vào Sprint 20.
- Chess Academy đã có connected-agent UAT pass `2026-04-26`.
- Tenant `bookedai.au` Telegram bot đã live tại `@BookedAI_Manager_Bot`.
- Backend `MessagingAutomationService` shared layer đã ship tại `2026-04-26`.
- Apple Design System tokens trong `minimal-bento-template.css` là single source of truth.

## 12. Open Questions

Xem chi tiết trong [`09-OPEN-QUESTIONS.md`](09-OPEN-QUESTIONS.md). Tóm tắt 5 câu hỏi blocking nhất:

- `OQ-001` WhatsApp provider final decision: stick Twilio default hay Meta direct sau verification?
- `OQ-002` Pricing tier persona reframe (`Solo`/`Growing studio`/`Clinic`/`Enterprise`) ship Phase 21 hay sớm hơn?
- `OQ-003` Native mobile app timeline — Phase 24+ hay defer indefinite?
- `OQ-004` Tenant Revenue Proof dashboard scope: investor-only hay limited tenant access mặc định?
- `OQ-005` Commercial commission % (% of booking revenue) — chốt trước Phase 21 launch.

## 13. Acceptance & Sign-off

PRD này được considered active baseline khi:

- [ ] Product/PM (head): approved
- [ ] Engineering (FE/BE leads): approved
- [ ] AI/Search: approved
- [ ] DevOps/Reliability: approved
- [ ] QA/UAT: approved
- [ ] Design: approved
- [ ] GTM/Customer Success: approved

Sign-off được track qua phase closeout template trong [`phase-execution-operating-system-2026-04-26.md`](../development/phase-execution-operating-system-2026-04-26.md).

## Changelog

- `2026-04-26` initial publication consolidating `prd.md`, `project.md`, `bookedai-master-prd.md`, plus 8 specialized requirement docs into 135 FRs and 30+ NFRs with explicit phase ownership.
