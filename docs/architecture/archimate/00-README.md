# BookedAI ArchiMate Model — Index & Primer

Tài liệu này là tập hợp mô hình kiến trúc doanh nghiệp BookedAI được chuẩn hoá theo **ArchiMate 3.x** sử dụng PlantUML stdlib (`<archimate/Archimate>`).

Mục đích: cung cấp một bộ "blueprint" thống nhất, đọc được từ tầng chiến lược đến tầng triển khai, làm chuẩn so chiếu cho 65+ tài liệu kiến trúc đã có và 169+ tài liệu phát triển trong repo.

> Phạm vi: chỉ thêm file mới trong `docs/architecture/archimate/`. Không sửa hoặc xoá tài liệu hiện hữu.

## 1. Diagram Index

| # | File | Phạm vi ArchiMate | Mục tiêu |
|---|---|---|---|
| 01 | [Motivation & Strategy](01-motivation-strategy.md) | Motivation + Strategy | Stakeholders, drivers, goals, principles, capabilities, value streams |
| 02 | [Enterprise Landscape](02-enterprise-landscape.md) | Business + Application + Technology | Toàn cảnh phân tầng B/A/T trên một sơ đồ tổng |
| 03 | [Business Capability Map](03-business-capability-map.md) | Strategy + Business | Bản đồ năng lực kinh doanh và dịch vụ hiện thực hoá |
| 04 | [Business Processes & Actors](04-business-processes-actors.md) | Business | Customer journey, booking flow, onboarding, admin workflow |
| 05 | [Application Architecture](05-application-architecture.md) | Application | Frontend, backend services, AI router, integration hub |
| 06 | [Data Architecture](06-data-architecture.md) | Application (Data Objects) | Quyền sở hữu dữ liệu, dòng đọc/ghi |
| 07 | [Integration Architecture](07-integration-architecture.md) | Application + Technology | Zoho, Stripe, email, n8n, MCP servers, messaging providers |
| 08 | [Technology Infrastructure](08-technology-infrastructure.md) | Technology | Triển khai, nodes, devices, system software |
| 09 | [Security Architecture](09-security-architecture.md) | Motivation + Technology | RBAC, multi-tenant, auth flow, kiểm soát bảo mật |
| 10 | [DevOps Pipeline](10-devops-pipeline.md) | Implementation + Technology | CI/CD: commit → test → build → deploy → monitor |
| 11 | [Migration Planning](11-migration-planning.md) | Implementation + Strategy | Plateaus, work packages, lộ trình current → target |
| 12 | [Architecture Review Findings](12-architecture-review-findings.md) | Markdown analysis | Findings & action items (không có sơ đồ) |

## 2. ArchiMate Primer (cho team)

ArchiMate được tổ chức thành các **layers** (tầng) và **aspects** (khía cạnh). Mỗi layer phản ánh một góc nhìn chính:

- **Motivation layer** — `Stakeholder`, `Driver`, `Goal`, `Principle`, `Requirement`, `Constraint`. Trả lời câu hỏi *vì sao*.
- **Strategy layer** — `Capability`, `ValueStream`, `Resource`, `CourseOfAction`. Trả lời câu hỏi *làm gì để đạt mục tiêu*.
- **Business layer** — `Actor`, `Role`, `Process`, `Function`, `Service`, `Object`, `Event`. Trả lời câu hỏi *ai làm gì*.
- **Application layer** — `Component`, `Service`, `Interface`, `DataObject`, `Function`, `Process`. Trả lời *phần mềm nào hỗ trợ*.
- **Technology layer** — `Node`, `Device`, `SystemSoftware`, `Network`, `Path`, `Artifact`. Trả lời *chạy ở đâu, trên gì*.
- **Implementation layer** — `WorkPackage`, `Deliverable`, `Plateau`, `Gap`. Trả lời *làm khi nào*.

### Quan hệ chính (relationships)

| Macro | Ý nghĩa |
|---|---|
| `Rel_Composition` | "Là một phần của" (whole-part, owned) |
| `Rel_Aggregation` | "Tổng hợp" (whole-part, looser) |
| `Rel_Assignment` | Gán năng lực/role cho actor hoặc node |
| `Rel_Realization` | Tầng dưới hiện thực hoá tầng trên |
| `Rel_Serving` | Cung cấp dịch vụ cho |
| `Rel_Triggering` | Kích hoạt theo thời gian |
| `Rel_Flow` | Dòng dữ liệu/giá trị |
| `Rel_Access_r` / `Rel_Access_w` | Đọc / ghi dữ liệu |
| `Rel_Influence` | Ảnh hưởng (motivation) |
| `Rel_Specialization` | Kế thừa kiểu |

## 3. Render Hướng Dẫn

Tất cả sơ đồ trong tập này dùng PlantUML stdlib `archimate`. Các cách render:

### CLI (PlantUML jar)
```bash
plantuml -tsvg docs/architecture/archimate/02-enterprise-landscape.md
```

### VS Code
Cài extension `PlantUML` (jebbs). Mở khối ` ```plantuml ` và nhấn `Alt+D` để xem preview.

### Online
Dán nội dung khối `plantuml` (giữa `@startuml` và `@enduml`) vào `https://www.plantuml.com/plantuml/uml/`.

### Yêu cầu
- Java 8+ và Graphviz (cho rendering layout phức tạp).
- PlantUML phiên bản hỗ trợ `<archimate/Archimate>` stdlib (>= 1.2020.x).

## 4. Convention Tóm Tắt

- Mỗi diagram giới hạn 15–25 phần tử để giữ tính đọc được.
- Element label dùng tiếng Anh (chuẩn ngành); narrative xung quanh dùng tiếng Việt.
- Khi nội dung phức tạp được tách thành sub-views thay vì nhồi nhét trong một sơ đồ.
- Liên kết chéo về tài liệu hiện hữu dùng đường dẫn tương đối (vd: `../architecture/system-overview.md`).

## 5. Tóm Tắt Khoảng Trống (Gap Summary)

Tóm tắt nhanh từ bước review (chi tiết xem [12-architecture-review-findings.md](12-architecture-review-findings.md)):

1. **Mất khớp source-of-truth** — `system-overview.md` mô tả 6 layer (Experience/App/Data/Intelligence/Automation/Platform), trong khi `solution-architecture-master-execution-plan.md` dùng 6 layer khác (Experience/App/Domain/Data/Integration/Platform). Cần nhất quán.
2. **Tenant model chưa hoàn thiện** — schema hiện vẫn lưu nhiều operational truth trong `conversation_events.metadata_json`; tenant_id chưa hiện diện ở mọi bảng tenant-owned.
3. **AI và booking core trộn lẫn** — `backend/services.py` và `route_handlers.py` còn ôm nhiều domain (matching, pricing, booking, AI). Phải tách theo bounded contexts.
4. **Quá nhiều surface mới đặt cùng lúc** — public/product/pitch/portal/admin/tenant/widget — rủi ro fragmentation cao nếu không có một capability map chung.
5. **Channel & messaging layer non-uniform** — Telegram, WhatsApp, email, SMS, web chat đang trong giai đoạn hợp nhất qua `MessagingAutomationService` (Phase 19).

## 6. Cách Đọc Bộ Tài Liệu Này

- Bắt đầu ở [01-motivation-strategy.md](01-motivation-strategy.md) để hiểu *vì sao*.
- Tiếp đến [02-enterprise-landscape.md](02-enterprise-landscape.md) để có cái nhìn tổng.
- Đào sâu theo nhu cầu: business → application → data → integration → technology.
- Khi muốn lên kế hoạch dịch chuyển: [11-migration-planning.md](11-migration-planning.md).
- Khi cần action items: [12-architecture-review-findings.md](12-architecture-review-findings.md).

## 7. Tài liệu nguồn chính

- [project.md](../../../project.md)
- [DESIGN.md](../../../DESIGN.md)
- [system-overview.md](../system-overview.md)
- [solution-architecture-master-execution-plan.md](../solution-architecture-master-execution-plan.md)
- [target-platform-architecture.md](../target-platform-architecture.md)
- [module-hierarchy.md](../module-hierarchy.md)
- [saas-domain-foundation.md](../saas-domain-foundation.md)
- [auth-rbac-multi-tenant-security-strategy.md](../auth-rbac-multi-tenant-security-strategy.md)
- [api-architecture-contract-strategy.md](../api-architecture-contract-strategy.md)
- [data-architecture-migration-strategy.md](../data-architecture-migration-strategy.md)
- [integration-hub-sync-architecture.md](../integration-hub-sync-architecture.md)
- [devops-deployment-cicd-scaling-strategy.md](../devops-deployment-cicd-scaling-strategy.md)
- [ai-router-matching-search-strategy.md](../ai-router-matching-search-strategy.md)
- [admin-enterprise-workspace-requirements.md](../admin-enterprise-workspace-requirements.md)
- [zoho-crm-tenant-integration-blueprint.md](../zoho-crm-tenant-integration-blueprint.md)
