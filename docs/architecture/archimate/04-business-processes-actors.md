# 04 — Business Processes & Actors

Tầng Business mô tả *ai làm gì* khi BookedAI vận hành: customer journey, booking flow chính, onboarding tenant, và admin workflow.

Nguồn: [system-overview.md](../system-overview.md) §"Primary Runtime Flows", [DESIGN.md](../../../DESIGN.md) §"Standard booking flow", [admin-enterprise-workspace-requirements.md](../admin-enterprise-workspace-requirements.md), [zoho-crm-tenant-integration-blueprint.md](../zoho-crm-tenant-integration-blueprint.md).

## Diagram 1 — Standard Booking Flow (Customer Journey)

```plantuml
@startuml
!include <archimate/Archimate>

title BookedAI Standard Booking Journey

Business_Actor(customer, "End Customer")
Business_Actor(provider, "Service Provider / Tenant")
Business_Role(agent, "BookedAI Manager Bot")

Business_Process(ask, "Ask (Search Intent)")
Business_Process(match, "Match (AI Ranking)")
Business_Process(compare, "Compare Results")
Business_Process(bookProc, "Book (Capture Intent)")
Business_Process(confirm, "Confirm + QR Portal")
Business_Process(portalReopen, "Portal Reopen / Care")
Business_Process(followup, "Follow-up & Retention")

Business_Object(intent, "Booking Intent")
Business_Object(reference, "Booking Reference (v1-*)")
Business_Object(payment, "Payment Posture")

Rel_Triggering(ask, match)
Rel_Triggering(match, compare)
Rel_Triggering(compare, bookProc)
Rel_Triggering(bookProc, confirm)
Rel_Triggering(confirm, portalReopen)
Rel_Triggering(portalReopen, followup)

Rel_Assignment(customer, ask)
Rel_Assignment(customer, compare)
Rel_Assignment(customer, bookProc)
Rel_Assignment(agent, match)
Rel_Assignment(agent, confirm)
Rel_Assignment(provider, followup)

Rel_Access_w(bookProc, intent)
Rel_Access_w(confirm, reference)
Rel_Access_w(confirm, payment)
Rel_Access_r(portalReopen, reference)
@enduml
```

## Diagram 2 — Tenant Onboarding & CRM Loop

```plantuml
@startuml
!include <archimate/Archimate>

title Tenant Onboarding + Zoho CRM Loop

Business_Actor(tenant, "Tenant Operator")
Business_Actor(internalOps, "Internal Admin")
Business_Role(crmRole, "Zoho CRM (System of Record)")

Business_Process(signup, "Tenant Sign-up & Workspace")
Business_Process(catalogPub, "Catalog Publish")
Business_Process(intake, "Lead / Booking Intake")
Business_Process(qualify, "Qualification")
Business_Process(syncCrm, "CRM Sync (Lead/Contact/Deal/Task)")
Business_Process(opsReview, "Ops Review & Reconciliation")

Business_Object(lead, "Local Lead")
Business_Object(contact, "Local Contact")
Business_Object(deal, "Booking Intent / Deal")

Rel_Assignment(tenant, signup)
Rel_Assignment(tenant, catalogPub)
Rel_Assignment(internalOps, opsReview)

Rel_Triggering(signup, catalogPub)
Rel_Triggering(catalogPub, intake)
Rel_Triggering(intake, qualify)
Rel_Triggering(qualify, syncCrm)
Rel_Triggering(syncCrm, opsReview)

Rel_Access_w(intake, lead)
Rel_Access_w(qualify, contact)
Rel_Access_w(qualify, deal)
Rel_Flow(syncCrm, crmRole, "Lead/Contact/Deal/Task upsert")
Rel_Flow(crmRole, opsReview, "stage, owner, task feedback")
@enduml
```

## Bình luận

### Booking flow là quy trình lõi

Quy trình `Ask → Match → Compare → Book → Confirm → Portal → Follow-up` là *bất biến* được [DESIGN.md](../../../DESIGN.md) ràng buộc cho mọi surface (public, product, Telegram, WhatsApp, web chat). Mọi UI thay đổi phải bảo toàn đầy đủ 7 bước này.

### Actor & Role

| Actor / Role | Trách nhiệm | Ghi chú |
|---|---|---|
| End Customer | Khởi tạo intent, xác nhận booking | Có thể đến từ web/Telegram/WhatsApp/email |
| BookedAI Manager Bot | Match, confirm, care | Là role AI, không phải actor con người |
| Service Provider / Tenant | Cung cấp dịch vụ, follow-up | Đại diện qua tenant workspace |
| Tenant Operator | Cấu hình tenant, publish catalog | Khác với Internal Admin |
| Internal Admin | Reconciliation, support, release | RBAC `super_admin`/`ops`/`support`/`billing_ops`/`integration_support` |

### Tenant onboarding loop

Trong sơ đồ 2, BookedAI giữ vai *system of action* (intake, qualify), Zoho giữ vai *system of record* (commercial pipeline). Đây là biên giới được nhấn mạnh trong [zoho-crm-tenant-integration-blueprint.md](../zoho-crm-tenant-integration-blueprint.md) §2 và [target-platform-architecture.md](../target-platform-architecture.md) §"CRM intelligence loop".

### Sự kiện then chốt

- **Booking Intent created** — Khi customer xác nhận `Book` trên một result, hệ thống tạo `booking_intents` và `Booking Reference` theo format `v1-*`.
- **Payment Posture mirrored** — Stripe / QR / manual đều được hệ thống ghi nhận thành `Payment Posture` (chứ không phải payment-confirmed) cho đến khi callback từ provider xác nhận.
- **Portal Reopen** — Khi customer mở `portal.bookedai.au/<reference>`, hệ thống chạy `build_portal_booking_snapshot`.

## Findings

- **F-04-01** — Workflow tenant onboarding chưa tự động hoá đầy đủ (catalog publish vẫn cần admin import). Phase 22 (multi-tenant template) sẽ chuẩn hoá.
- **F-04-02** — Bước `Confirm + QR Portal` có rủi ro hiển thị state sai khi backend trả về `qr_code_url` rỗng — frontend hiện fallback generate QR từ portal URL ([DESIGN.md](../../../DESIGN.md) "Verified Tenant Search Requirement").
- **F-04-03** — Mapping `Lead → Contact → Deal → Task` trong Zoho cần gating qualification rõ ràng để tránh tạo Deal cho enquiry chưa đủ commercial value ([zoho-crm-tenant-integration-blueprint.md](../zoho-crm-tenant-integration-blueprint.md) §3 "Qualification").
