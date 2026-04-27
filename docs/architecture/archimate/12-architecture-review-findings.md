# 12 — Architecture Review Findings & Action Items

Tài liệu này tổng hợp kết quả review qua 65+ tài liệu kiến trúc và 169+ tài liệu phát triển trong repo. Không có sơ đồ — đây là phần tóm tắt phát hiện và hành động.

> Phạm vi review: `docs/architecture/`, `docs/development/`, các file gốc `project.md`, `DESIGN.md`, plus codebase hint từ `frontend/`, `backend/`, `scripts/`.

## A. Điều đã được định nghĩa tốt

1. **Customer message hierarchy** — `project.md` định nghĩa 3 phiên bản phát biểu sản phẩm cho 3 audience (SME, investor, customer) — rõ ràng và sử dụng nhất quán.
2. **Standard booking flow** — `Ask → Match → Compare → Book → Confirm → Portal → Follow-up` được lock trong [DESIGN.md](../../../DESIGN.md) và áp dụng đa surface.
3. **Auth/RBAC strategy** — [auth-rbac-multi-tenant-security-strategy.md](../auth-rbac-multi-tenant-security-strategy.md) là một trong tài liệu chỉn chu nhất, có 13 section đầy đủ từ actor đến rollout.
4. **Integration boundaries** — [integration-hub-sync-architecture.md](../integration-hub-sync-architecture.md) phân loại rõ CRM/Payment/Communication/Business Ops/Search và quy tắc ownership.
5. **AI trust principles** — `AI là cơ chế, không phải source of truth` được lặp lại nhất quán; output validator + booking trust gate đã có seam.
6. **DESIGN tokens** — Apple Design System single-source-of-truth `minimal-bento-template.css` (theo MEMORY).
7. **Phase execution operating system** — `docs/development/phase-execution-operating-system-2026-04-26.md` định nghĩa rõ 5 cổng UAT/Deployment/Docs/Notion-Discord/Handoff cho mỗi phase.

## B. Điều còn thiếu hoặc chưa hoàn thành

### B1. Data foundation
- **Schema chính chưa normalized** — booking, payment, lifecycle vẫn nằm trong `conversation_events.metadata_json` ([data-architecture-migration-strategy.md](../data-architecture-migration-strategy.md) §"Current weak spots").
- **Không có bảng `tenants`** — vẫn ngầm single-tenant.
- **Không có outbox/idempotency tables** — webhook và async writes thiếu replay protection thống nhất.
- **Không có read models cho commission/attribution** — chỉ ở mức kế hoạch trong [analytics-metrics-revenue-bi-strategy.md](../analytics-metrics-revenue-bi-strategy.md).

### B2. Application separation
- **Frontend chưa tách build artifact** — public/admin/portal share một bundle ([module-hierarchy.md](../module-hierarchy.md) §"Refactor Status").
- **Backend còn 2 mega-modules** — `services.py`, `route_handlers.py` ôm nhiều bounded context.
- **AI router seam chưa hoàn thiện** — `domain/ai_router/service.py` mới ở giai đoạn đầu; routing/provider selector chưa modular.

### B3. Security & multi-tenant
- **Tenant auth chưa go-live đầy đủ** — Supabase Auth + Google primary chưa hoàn tất.
- **Permission registry chưa centralized** — checks rải rác.
- **RLS chưa được repo-confirmed**.
- **Admin session vẫn lưu localStorage** — nên là HttpOnly cookie.
- **MFA cho internal admin chưa có**.
- **Webhook idempotency không thống nhất** giữa các provider.

### B4. Observability & DevOps
- **Không có CI tự động**.
- **Beta share DB với prod**.
- **Không có metrics/logs/traces stack**.
- **Backup automation và restore drill chưa có**.
- **Single-host SPOF**.

### B5. Channel & messaging
- **MessagingAutomationService mới ở giai đoạn đầu Phase 19** — Telegram đã go-live, WhatsApp partial, SMS/email chưa.
- **Bot identity policy** đang trong giai đoạn renaming (`BookedAI Manager Bot`); cần đảm bảo không lẫn với OpenClaw.

### B6. Documentation
- **65+ docs trong `docs/architecture/`** — có nhiều overlap (vd: `system-overview.md` vs `target-platform-architecture.md` vs `solution-architecture-master-execution-plan.md`).
- **6-layer model không nhất quán** — system-overview liệt kê Experience/App/Data/Intelligence/Automation/Platform; solution-architecture-master liệt kê Experience/App/Domain/Data/Integration/Platform.
- **Phase numbering khá phức tạp** — phase 17 → 23 + 20.5; cần roadmap tự-document.

## C. Mâu thuẫn / không nhất quán

| ID | Mâu thuẫn | Ưu tiên |
|---|---|---|
| C-01 | "6 layer" trong [system-overview.md](../system-overview.md) vs [solution-architecture-master-execution-plan.md](../solution-architecture-master-execution-plan.md) | Medium — gây confusion cho người mới |
| C-02 | `bookedai.au` được mô tả là "nginx redirect" trong system-overview, nhưng `project.md` `2026-04-25` nói root serve homepage trực tiếp | High — đã obsolete trong system-overview |
| C-03 | "Subdomain pitch.bookedai.au" có lúc là canonical demo, có lúc là deeper pitch deck | Medium |
| C-04 | `/api/booking-assistant/chat` vs `/api/chat/send` — alias vs canonical chưa được mô tả nhất quán giữa API contract và messaging design | Low (đã đề cập alias) |
| C-05 | Tenant role names — đôi chỗ `tenant_admin`, đôi chỗ `owner`, đôi chỗ `tenant.admin` | Low |
| C-06 | Public assistant `/api/booking-assistant/session` được mô tả là "critical" production-critical, nhưng nhiều bookings hiện đi qua path `v1-*` không qua endpoint này — hợp đồng thực tế chưa rõ | High |

## D. Top 5 Findings (rủi ro lớn nhất)

1. **R-01 — Operational truth nằm trong `conversation_events.metadata_json`**. Booking, payment, workflow inferred từ blob → không thể xây reporting/commission đáng tin cậy. Cần schema normalize trước Phase 18 close.
2. **R-02 — Single-host production**. Mất VPS = mất toàn bộ. Chưa có HA, failover, hoặc multi-region. Backup automation cũng chưa confirmed.
3. **R-03 — Multi-tenant cutover chưa khởi động đầy đủ**. Không có `tenants` table chính thức, không RLS, không tenant-scoped repository. Khi tenant production thật go-live, rủi ro cross-tenant leakage cao.
4. **R-04 — Webhook idempotency không thống nhất**. Stripe có signature, Telegram có secret token, WhatsApp Evolution có HMAC, nhưng các path khác (n8n, Tawk) chưa thống nhất dedupe → có thể gây duplicate booking/payment.
5. **R-05 — Tài liệu phân tán & chồng chéo**. 65+ doc trong architecture, 169+ trong development, nhiều mâu thuẫn nhỏ và phiên bản; người mới mất rất nhiều thời gian định hướng.

## E. Top 5 Recommendations

1. **Đóng schema normalization wave** — Tạo các bảng riêng cho `bookings`, `booking_intents`, `payments`, `audit_outbox`, `tenants`. Dual-write từ `conversation_events` trong 2 sprint, sau đó cutover read.
2. **Tách build artifact frontend** — Public/admin/portal phải có bundle riêng. Giảm bề mặt tấn công và cho phép tối ưu hoá hiệu năng.
3. **Centralize permission registry** — Hiện thực hoá `auth-rbac-multi-tenant-security-strategy.md` §4 thành một module `backend/security/permissions.py` được dùng bởi mọi handler.
4. **Triển khai observability** — Prometheus metrics endpoint, structured JSON logs, và sentry/error tracker. Không cần Grafana đầy đủ ngay, nhưng phải có log aggregation.
5. **Doc consolidation** — Tạo một "canonical layer map" duy nhất, xác lập trong [00-README.md](00-README.md). Tất cả tài liệu mới phải tham chiếu layer map này; tài liệu cũ giữ nguyên nhưng note "supersedes".

## F. Action Items (theo ưu tiên)

| ID | Action | Owner (suggest) | Sprint target |
|---|---|---|---|
| A-01 | Bảng `tenants` + tenant_id migration cho 3 bảng hiện hữu | Backend lead | Sprint 18 |
| A-02 | Audit outbox + idempotency keys schema | Backend lead | Sprint 18 |
| A-03 | Tách `services.py` theo capability (matching, booking, pricing, ai_router) | Backend lead | Sprint 18-19 |
| A-04 | Frontend: tách build pipeline cho admin và public bundle | Frontend lead | Sprint 19 |
| A-05 | Permission registry trung tâm + decorator/depends | Backend lead | Sprint 19 |
| A-06 | Observability (Prometheus + structured logs) | DevOps | Sprint 20 |
| A-07 | CI workflow (lint, typecheck, test, build) | DevOps | Sprint 20 |
| A-08 | Postgres backup + restore drill | DevOps | Sprint 20 |
| A-09 | Beta DB isolation | DevOps | Sprint 21 |
| A-10 | RLS policies cho tenant-owned tables | Backend + DBA | Sprint 21 |
| A-11 | MFA cho internal admin | Backend + Security | Sprint 22 |
| A-12 | Doc consolidation: deprecate hoặc merge tài liệu trùng lặp | Architecture | Continuous |
| A-13 | Webhook idempotency contract + testing | Backend lead | Sprint 19 |
| A-14 | Read models cho commission/attribution | Backend + Analytics | Sprint 21-22 |
| A-15 | Object storage cho uploads (Supabase Storage hoặc S3-compatible) | Backend + DevOps | Sprint 22 |

## G. Những điều chưa đủ thông tin để mô hình hoá

- **Hermes knowledge service** — Chỉ có thông tin "Hermes" là một container; chưa rõ schema dữ liệu, API surface, hay role chính xác trong booking flow.
- **MCP servers cụ thể** — Có nhiều `n8n-mcp`, `claude-api`, OpenClaw được nhắc tới, nhưng integration boundary cụ thể chưa được tài liệu hoá đầy đủ.
- **Pricing & commission engine** — Tồn tại trong `target-platform-architecture.md` §"Attribution and commission domain", nhưng implementation hiện tại chưa rõ ràng.
- **Partner ecosystem** — Bảng `partner_profiles` chỉ là showcase; chưa rõ partner có vai trò vận hành booking hay không.
- **Detailed Stripe flow** — Stripe được nhắc nhiều nhưng chi tiết webhook handling, refund, dispute chưa được tài liệu hoá.
- **Compliance / privacy** — Không tìm thấy tài liệu rõ về data retention, GDPR/AU privacy posture, hoặc data subject access request flow.

## H. Cross-references quan trọng

- [project.md](../../../project.md) — Master baseline.
- [DESIGN.md](../../../DESIGN.md) — UX / UI rules.
- [system-overview.md](../system-overview.md) — System layer summary.
- [target-platform-architecture.md](../target-platform-architecture.md) — Target direction.
- [solution-architecture-master-execution-plan.md](../solution-architecture-master-execution-plan.md) — Workstream coordination.
- [auth-rbac-multi-tenant-security-strategy.md](../auth-rbac-multi-tenant-security-strategy.md) — Security details.
- [data-architecture-migration-strategy.md](../data-architecture-migration-strategy.md) — Data model strategy.
- [api-architecture-contract-strategy.md](../api-architecture-contract-strategy.md) — API contracts.
- [integration-hub-sync-architecture.md](../integration-hub-sync-architecture.md) — Integration patterns.
- [zoho-crm-tenant-integration-blueprint.md](../zoho-crm-tenant-integration-blueprint.md) — Zoho integration.
- [admin-enterprise-workspace-requirements.md](../admin-enterprise-workspace-requirements.md) — Admin workspace.
- [bookedai-master-roadmap-2026-04-26.md](../bookedai-master-roadmap-2026-04-26.md) — Active roadmap.
- [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md) — Phase gates.
