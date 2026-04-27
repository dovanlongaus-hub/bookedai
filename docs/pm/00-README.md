# BookedAI PM Pack — Index (00)

Date: `2026-04-26`

Status: `active consolidated PM baseline`

Owner lane: `Product/PM` (xem [phase-execution-operating-system-2026-04-26.md](../development/phase-execution-operating-system-2026-04-26.md))

## Mục tiêu

Tài liệu này là chỉ mục cho `docs/pm/` — bộ artifact PM/PO cấp doanh nghiệp do Senior PM/PO biên soạn để **hợp nhất** (không thay thế) các yêu cầu, phase, sprint, test pack đang nằm rải rác trong `docs/architecture/` và `docs/development/`.

Pack này phục vụ ba audience:

- **Leadership / nhà đầu tư**: đọc `00-README.md`, `01-MASTER-PRD.md`, `03-EXECUTION-PLAN.md`, `09-OPEN-QUESTIONS.md`.
- **Engineering leads (FE/BE/AI/DevOps/QA)**: đọc `02-USER-STORIES.md`, `03-EXECUTION-PLAN.md`, `04-RACI-MATRIX.md`, `05-TEST-PLAN.md`, `07-CODE-REVIEW-GATES.md`.
- **Customer Success / GTM / vận hành tenant**: đọc `01-MASTER-PRD.md` (mục Persona + Success Metrics), `06-UAT-CHECKLIST.md`, `08-MERGE-MAP.md`.

## Nguyên tắc hợp nhất

1. **Không xoá / sửa** tài liệu hiện hữu trong `docs/architecture/` hoặc `docs/development/`. Mọi artifact mới chỉ nằm trong `docs/pm/`.
2. **Trace lại nguồn**: mỗi requirement/phase/test trong PM pack đều liên kết tới tài liệu gốc bằng markdown link.
3. **ID duy nhất**: `FR-001…`, `NFR-001…`, `US-001…`, `TC-001…`, `UAT-001…`, `CRG-001…`, `OQ-001…`.
4. **Ngày cụ thể**: anchor `today = 2026-04-26`. Khi tài liệu cũ nói "Sprint 3", PM pack quy đổi sang ISO range theo bảng Sprint 1-22 trong [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md).
5. **Khi mâu thuẫn**: thứ tự authority là `project.md` → `prd.md` → `bookedai-master-roadmap-2026-04-26.md` → tài liệu chuyên đề mới nhất → tài liệu cũ. Mọi mâu thuẫn ghi nhận trong `08-MERGE-MAP.md` và `09-OPEN-QUESTIONS.md`.

## Danh sách artifact

| # | File | Nội dung | Hợp nhất từ |
|---|---|---|---|
| 00 | [00-README.md](00-README.md) | Index, audience, merge rule | toàn pack |
| 01 | [01-MASTER-PRD.md](01-MASTER-PRD.md) | Consolidated PRD: Problem, Vision, Personas, JTBD, FR-*, NFR-*, KPIs, Non-Goals, Dependencies, Constraints, Open Questions | [prd.md](../../prd.md), [project.md](../../project.md), [bookedai-master-prd.md](../architecture/bookedai-master-prd.md), [landing-page-system-requirements.md](../architecture/landing-page-system-requirements.md), [admin-enterprise-workspace-requirements.md](../architecture/admin-enterprise-workspace-requirements.md), [tenant-app-strategy.md](../architecture/tenant-app-strategy.md), [pricing-packaging-monetization-strategy.md](../architecture/pricing-packaging-monetization-strategy.md), [public-growth-app-strategy.md](../architecture/public-growth-app-strategy.md), [internal-admin-app-strategy.md](../architecture/internal-admin-app-strategy.md) |
| 02 | [02-USER-STORIES.md](02-USER-STORIES.md) | Epic → Story → Task; Acceptance Criteria (Gherkin); P0/P1/P2; effort | [jira-epic-story-task-structure.md](../architecture/jira-epic-story-task-structure.md), [notion-jira-import-ready.md](../architecture/notion-jira-import-ready.md), [phase-3-6-epic-story-task-breakdown.md](../architecture/phase-3-6-epic-story-task-breakdown.md), [phase-7-8-epic-story-task-breakdown.md](../architecture/phase-7-8-epic-story-task-breakdown.md), [phase-9-epic-story-task-breakdown.md](../architecture/phase-9-epic-story-task-breakdown.md), sprint owner checklists |
| 03 | [03-EXECUTION-PLAN.md](03-EXECUTION-PLAN.md) | Phase 0-23 (+post-22 horizon) với entry/exit, deliverables, RACI sign-off, rủi ro, Gantt | [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md), [implementation-phase-roadmap.md](../architecture/implementation-phase-roadmap.md), [coding-implementation-phases.md](../architecture/coding-implementation-phases.md), [current-phase-sprint-execution-plan.md](../architecture/current-phase-sprint-execution-plan.md), [next-phase-implementation-plan-2026-04-25.md](../development/next-phase-implementation-plan-2026-04-25.md), [phase-execution-operating-system-2026-04-26.md](../development/phase-execution-operating-system-2026-04-26.md) |
| 04 | [04-RACI-MATRIX.md](04-RACI-MATRIX.md) | Workstream × Phase RACI | [phase-execution-operating-system-2026-04-26.md](../development/phase-execution-operating-system-2026-04-26.md) (agent lanes), [team-task-breakdown.md](../architecture/team-task-breakdown.md) |
| 05 | [05-TEST-PLAN.md](05-TEST-PLAN.md) | Test catalog ánh xạ FR-*/NFR-*; Unit/Integration/E2E/UAT/Perf/Sec/A11y; theo phase | [qa-testing-reliability-ai-evaluation-strategy.md](../architecture/qa-testing-reliability-ai-evaluation-strategy.md), [bookedai-cross-industry-full-flow-test-pack.md](../development/bookedai-cross-industry-full-flow-test-pack.md), [release-gate-checklist.md](../development/release-gate-checklist.md), [search-truth-remediation-spec.md](../development/search-truth-remediation-spec.md) |
| 06 | [06-UAT-CHECKLIST.md](06-UAT-CHECKLIST.md) | UAT scenario theo persona × journey, ô pass/fail và sign-off | [admin-live-uat-2026-04-26.md](../development/admin-live-uat-2026-04-26.md), [tenant-live-uat-2026-04-26.md](../development/tenant-live-uat-2026-04-26.md), [customer-booking-agent-uat-2026-04-26.md](../development/customer-booking-agent-uat-2026-04-26.md), [bookedai-cross-industry-full-flow-test-pack.md](../development/bookedai-cross-industry-full-flow-test-pack.md), [portal-bookedai-uat-ab-investor-review-2026-04-26.md](../development/portal-bookedai-uat-ab-investor-review-2026-04-26.md), [tenant-bookedai-uat-content-ux-review-2026-04-25.md](../development/tenant-bookedai-uat-content-ux-review-2026-04-25.md) |
| 07 | [07-CODE-REVIEW-GATES.md](07-CODE-REVIEW-GATES.md) | Code review checklist mỗi phase: Code Quality, Architecture, Testing, Requirements, Production Readiness; severity gating | [release-gate-checklist.md](../development/release-gate-checklist.md), [source-code-review-and-security-hardening-2026-04-26.md](../development/source-code-review-and-security-hardening-2026-04-26.md), [full-stack-review-2026-04-26.md](../development/full-stack-review-2026-04-26.md) |
| 08 | [08-MERGE-MAP.md](08-MERGE-MAP.md) | Crosswalk: tài liệu cũ → mục PM pack; mâu thuẫn được hoà giải | toàn bộ `docs/architecture/` và `docs/development/` |
| 09 | [09-OPEN-QUESTIONS.md](09-OPEN-QUESTIONS.md) | Câu hỏi/quyết định cần leadership; ai quyết, đang chặn gì, gợi ý phương án | full-stack-review, prd, project, sprint dependency map |

## Quy trình cập nhật

1. Khi phase đóng (closeout):
   - cập nhật trạng thái trong `03-EXECUTION-PLAN.md`,
   - đánh dấu test cases passed trong `05-TEST-PLAN.md`,
   - đánh dấu UAT items signed-off trong `06-UAT-CHECKLIST.md`,
   - đóng câu hỏi liên quan trong `09-OPEN-QUESTIONS.md`,
   - viết changelog ở cuối file thay đổi.
2. Khi yêu cầu mới phát sinh:
   - thêm `FR-NNN` hoặc `NFR-NNN` vào `01-MASTER-PRD.md`,
   - thêm story tương ứng vào `02-USER-STORIES.md`,
   - thêm test case vào `05-TEST-PLAN.md`,
   - cập nhật `04-RACI-MATRIX.md` nếu owner mới được giao.
3. Khi tài liệu gốc trong `docs/architecture/` hoặc `docs/development/` được cập nhật, ghi chú trong `08-MERGE-MAP.md` và đảm bảo PM pack vẫn đồng bộ.

## Trạng thái nguồn tham chiếu chính

- `prd.md` (root) — `2026-04-25` — active consolidated baseline
- `project.md` — `2026-04-26` — active master index
- `bookedai-master-roadmap-2026-04-26.md` — single end-to-end roadmap, source-of-truth khi conflict
- `phase-execution-operating-system-2026-04-26.md` — PM execution control, agent lanes, gate template
- `full-stack-review-2026-04-26.md` — 7-lane review canonical input (P0/P1)
- `next-phase-implementation-plan-2026-04-25.md` — Phase 17-23 detailed plan
- `release-gate-checklist.md` — promote/hold/rollback discipline
- `implementation-progress.md` — dated change log

## Changelog

- `2026-04-26` initial publication of `docs/pm/` pack consolidating PRD, execution plan, RACI, test plan, UAT, code review gates, merge map, and open questions.
