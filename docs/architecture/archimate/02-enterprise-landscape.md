# 02 — Enterprise Landscape (Toàn cảnh B/A/T)

Sơ đồ landscape hợp nhất ba layer chính (Business / Application / Technology) để cho phép một người mới đọc nắm được cấu trúc tổng thể trong dưới 5 phút.

Nguồn: [system-overview.md](../system-overview.md), [target-platform-architecture.md](../target-platform-architecture.md), [module-hierarchy.md](../module-hierarchy.md), [solution-architecture-master-execution-plan.md](../solution-architecture-master-execution-plan.md).

## Diagram — BookedAI Enterprise Landscape

```plantuml
@startuml
!include <archimate/Archimate>

title BookedAI Enterprise Landscape (B/A/T)

rectangle "Business Layer" {
  Business_Actor(customer, "End Customer")
  Business_Actor(tenantOwner, "Tenant / SME Operator")
  Business_Actor(internalOps, "Internal Admin")
  Business_Service(bookingSvc, "Booking & Revenue Service")
  Business_Service(careSvc, "Customer Care & Status")
  Business_Service(opsSvc, "Tenant Operations")
}

rectangle "Application Layer" {
  Application_Component(publicApp, "Public Web App (PublicApp.tsx)")
  Application_Component(productApp, "Product Booking App")
  Application_Component(adminApp, "Admin Workspace")
  Application_Component(portalApp, "Customer Portal")
  Application_Component(api, "FastAPI Backend (/api/v1/*)")
  Application_Component(aiRouter, "AI Router & Matching")
  Application_Component(msgLayer, "Messaging Automation Layer")
  Application_Component(integHub, "Integration Hub")
}

rectangle "Technology Layer" {
  Technology_Node(vps, "Single VPS Docker Host")
  Technology_SystemSoftware(nginx, "Nginx Reverse Proxy")
  Technology_SystemSoftware(supabase, "Self-hosted Supabase / Postgres")
  Technology_SystemSoftware(n8n, "n8n Automation Runtime")
  Technology_SystemSoftware(hermes, "Hermes Knowledge Service")
}

Rel_Serving(bookingSvc, customer)
Rel_Serving(careSvc, customer)
Rel_Serving(opsSvc, tenantOwner)
Rel_Assignment(internalOps, opsSvc)

Rel_Realization(publicApp, bookingSvc)
Rel_Realization(productApp, bookingSvc)
Rel_Realization(portalApp, careSvc)
Rel_Realization(adminApp, opsSvc)

Rel_Serving(api, publicApp)
Rel_Serving(api, productApp)
Rel_Serving(api, portalApp)
Rel_Serving(api, adminApp)
Rel_Serving(aiRouter, api)
Rel_Serving(msgLayer, api)
Rel_Serving(integHub, api)

Rel_Assignment(vps, nginx)
Rel_Assignment(vps, supabase)
Rel_Assignment(vps, n8n)
Rel_Assignment(vps, hermes)
Rel_Realization(nginx, publicApp)
Rel_Realization(supabase, api)
Rel_Realization(n8n, integHub)
@enduml
```

## Bình luận

### Cấu trúc tổng thể

BookedAI hiện chạy trên một mô hình **modular monolith trên một VPS Docker host** ([system-overview.md](../system-overview.md)) với:

- 1 frontend bundle React/Vite phục vụ nhiều subdomain (public, product, demo, portal, admin, beta).
- 1 FastAPI backend kết hợp request handling + AI router + integration hub.
- 1 Supabase tự host + 1 n8n + 1 Hermes — đều nằm trên cùng host và chia sẻ Docker network.

### Giải thích quan hệ chính

- **Business → Application**: mỗi business service được hiện thực hoá (`Rel_Realization`) bởi một hoặc nhiều application components. Booking & Revenue Service được cung cấp đồng thời bởi Public App, Product App và FastAPI backend.
- **Application → Application**: các UI app gọi `api` (`Rel_Serving`). AI router và Messaging Layer là service nội bộ của backend.
- **Application → Technology**: Nginx hiện thực hoá định tuyến cho front-end; Supabase hiện thực hoá `/api/v1/*` thông qua Postgres + Auth.

### Subdomain map (đối chiếu nhanh)

| Subdomain | Application Component |
|---|---|
| `bookedai.au` | Public Web App |
| `product.bookedai.au` | Product Booking App |
| `pitch.bookedai.au` | Pitch Deck App (xem 05) |
| `portal.bookedai.au` | Customer Portal |
| `admin.bookedai.au` | Admin Workspace |
| `tenant.bookedai.au` | Tenant Gateway (xem 05) |
| `api.bookedai.au` | FastAPI Backend |
| `n8n.bookedai.au` | n8n |
| `supabase.bookedai.au` | Supabase Kong gateway |

## Findings

- **F-02-01** — Một frontend bundle vẫn phục vụ tất cả surface ([module-hierarchy.md](../module-hierarchy.md) §"Refactor Status"). Khả năng cô lập (security, perf) còn hạn chế. Khuyến nghị tách build artifact theo subdomain.
- **F-02-02** — Backend vẫn ôm đa domain trong `services.py` và `route_handlers.py`; landscape diagram cần giữ ở mức cao, nhưng cần mô hình hoá rõ hơn ở [05-application-architecture.md](05-application-architecture.md).
- **F-02-03** — `beta.bookedai.au` được mô tả là rehearsal tier nhưng share DB với production ([devops-deployment-cicd-scaling-strategy.md](../devops-deployment-cicd-scaling-strategy.md)) — cần cô lập ở tầng dữ liệu.
