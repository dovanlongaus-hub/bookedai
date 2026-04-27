# 03 — Business Capability Map

Capability map mô tả "BookedAI có thể làm những gì" độc lập với cách triển khai. Mỗi capability được hiện thực hoá bởi một hoặc nhiều business service hiện hữu trong code và tài liệu.

Nguồn: [solution-architecture-master-execution-plan.md](../solution-architecture-master-execution-plan.md) §3.1, [target-platform-architecture.md](../target-platform-architecture.md) §"Core target domains", [analytics-metrics-revenue-bi-strategy.md](../analytics-metrics-revenue-bi-strategy.md).

## Diagram — Capability Map & Realizing Services

```plantuml
@startuml
!include <archimate/Archimate>

title BookedAI Business Capability Map

rectangle "Strategy Layer (Capabilities)" {
  Strategy_Capability(demand, "Demand Capture")
  Strategy_Capability(qualify, "Lead Qualification")
  Strategy_Capability(matching, "AI Matching & Search")
  Strategy_Capability(book, "Booking Conversion")
  Strategy_Capability(pay, "Payment & Revenue")
  Strategy_Capability(missed, "Missed Revenue Detection")
  Strategy_Capability(recover, "Recovery Workflow")
  Strategy_Capability(attrib, "Attribution & Commission")
  Strategy_Capability(report, "Reporting & Analytics")
  Strategy_Capability(tenantOps, "Tenant Operations")
  Strategy_Capability(adminOps, "Internal Admin Ops")
}

rectangle "Business Layer (Realizing Services)" {
  Business_Service(intakeSvc, "Multi-channel Intake Service")
  Business_Service(matchSvc, "Service Matching Service")
  Business_Service(bookSvc, "Booking Reference Service")
  Business_Service(payOrch, "Payment Orchestration Service")
  Business_Service(careSvc, "Customer Care Service")
  Business_Service(crmSync, "CRM Sync Service")
  Business_Service(reportSvc, "Revenue Reporting Service")
  Business_Service(tenantWs, "Tenant Workspace Service")
  Business_Service(adminCtrl, "Admin Control Plane")
}

Rel_Realization(intakeSvc, demand)
Rel_Realization(intakeSvc, qualify)
Rel_Realization(matchSvc, matching)
Rel_Realization(bookSvc, book)
Rel_Realization(payOrch, pay)
Rel_Realization(careSvc, recover)
Rel_Realization(careSvc, missed)
Rel_Realization(crmSync, attrib)
Rel_Realization(reportSvc, report)
Rel_Realization(reportSvc, attrib)
Rel_Realization(tenantWs, tenantOps)
Rel_Realization(adminCtrl, adminOps)

Rel_Aggregation(book, qualify)
Rel_Aggregation(pay, book)
Rel_Aggregation(report, pay)
Rel_Aggregation(report, missed)
@enduml
```

## Bình luận

### 11 capabilities cốt lõi

Đối chiếu với 7 capabilities trong [solution-architecture-master-execution-plan.md](../solution-architecture-master-execution-plan.md) §3.1, mô hình ArchiMate này mở rộng thêm:

- **Lead Qualification** (tách khỏi Demand Capture cho rõ).
- **AI Matching & Search** (rõ ràng là một capability, không trộn với Booking).
- **Tenant Operations** + **Internal Admin Ops** (phân biệt khán giả).

| Capability | Tài liệu nguồn |
|---|---|
| Demand Capture | [target-platform-architecture.md](../target-platform-architecture.md) §"Demand capture domain" |
| Lead Qualification | id. §"Lead qualification domain" |
| AI Matching & Search | [ai-router-matching-search-strategy.md](../ai-router-matching-search-strategy.md) |
| Booking Conversion | [target-platform-architecture.md](../target-platform-architecture.md) §"Booking conversion domain" |
| Payment & Revenue | id. §"Revenue event domain" |
| Missed Revenue Detection | id. §"Missed revenue domain" |
| Recovery Workflow | id. §"Recovery workflow domain" |
| Attribution & Commission | id. §"Attribution and commission domain" |
| Reporting & Analytics | [analytics-metrics-revenue-bi-strategy.md](../analytics-metrics-revenue-bi-strategy.md) |
| Tenant Operations | [admin-enterprise-workspace-requirements.md](../admin-enterprise-workspace-requirements.md), [tenant-app-strategy.md](../tenant-app-strategy.md) |
| Internal Admin Ops | id. + [internal-admin-app-strategy.md](../internal-admin-app-strategy.md) |

### Service-Capability ownership

Mỗi service có một owning capability chính (`Rel_Realization`). Một số service hiện thực hoá nhiều capability (ví dụ `Customer Care Service` cover cả Recovery và Missed Revenue) — đây là dấu hiệu cần phân tách thêm trong tương lai.

## Findings

- **F-03-01** — `Customer Care Service` đang ôm cả "missed revenue detection" và "recovery workflow"; cần tách hai khi audit ledger (Phase 18) ổn định.
- **F-03-02** — `Tenant Workspace Service` chưa có production implementation đầy đủ; tenant gateway tại `tenant.bookedai.au` mới ở giai đoạn auth + preview ([project.md](../../../project.md) "tenant login CTA fix").
- **F-03-03** — `Attribution & Commission` capability vẫn thiếu read model cụ thể trong code (xem [data-architecture-migration-strategy.md](../data-architecture-migration-strategy.md) §"Current weak spots").
