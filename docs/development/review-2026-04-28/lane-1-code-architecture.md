# Lane 1 - Code Quality & Architecture Debt Review

Ngày: 2026-04-28. Phạm vi: BookedAI repo `main` branch, focus vào `backend/` + `frontend/` cho Phase 17–23. Read-only review.

## 1. Tóm tắt

- **Refactor "split" backend mới hoàn thành 30%**: bounded-context routers (`v1_*_routes.py`) đã mount đúng, nhưng các handler module (`v1_*_handlers.py`) vẫn re-import 60+ helpers/Pydantic models/repositories từ `backend/api/v1_routes.py` (5706 dòng). Đồng thời `v1_routes.py` còn 50 `@router` decorations trên một `APIRouter` không bao giờ được mount → handler cũ và mới song song tồn tại, dễ bị "edit nhầm file mà prod không chạy".
- **3 mega-files vượt ngưỡng review-hiệu quả**: `backend/api/v1_routes.py` (5706 LOC), `backend/api/route_handlers.py` (4761 LOC chứa toàn bộ admin/webhook/booking-assistant), `backend/services.py` (3871 LOC) và `backend/service_layer/messaging_automation_service.py` (2969 LOC, 1 class duy nhất với 76 method). Tất cả là cross-domain debt mà refactor rules trong README cấm mở rộng.
- **Frontend Vite (shipping) vs Next.js (`app/`+`components/`+`lib/`+`server/`+`features/admin/`+`prisma/`) song song**: Next stack có 113 file TSX/TS, Prisma schema, API routes, RBAC, nhưng `docker-compose.prod.yml` chỉ build từ `frontend/`. Đây là dead code lane vẫn được commit vào main → confusion cho judge khi đọc repo, tăng review surface, và `node_modules`/`.next` vẫn nằm cạnh root `package.json`.

## 2. Top 10 hotspot

| File:line | Vấn đề | Severity | Audience | Hướng sửa |
|---|---|---|---|---|
| `backend/api/v1_routes.py:109,1992-5682` | Khai báo `router = APIRouter(prefix="/api/v1")` + 50 `@router` handler nhưng KHÔNG được mount ở `app.py` (chỉ `v1_router` được mount). Toàn bộ decorator là dead routing; thực tế các handler được expose qua `add_api_route()` ở `v1_*_routes.py`. Edit handler ở đây trông như đang sửa endpoint nhưng không chạy. | P0 | A,B | Xoá hết `@router.<method>(...)` decorators trong `v1_routes.py` (không xoá function body) hoặc rename file thành `v1_shared.py` để rõ là helper-only. Sprint 23 gate. |
| `backend/api/v1_routes.py` (5706 LOC) | Mega-file chứa 45 Pydantic payload class + helpers tenant/auth/billing/portal/catalog + 50 handler functions cross-domain (booking + tenant + integration + portal + catalog + communication). README refactor rules cấm tăng cross-domain logic ở đây. | P0 | A,B | Trích từng nhóm payload sang `backend/api/v1_payloads/{booking,tenant,integration,communication}.py` trước, sau đó move helper sang `service_layer` tương ứng. Một bounded context / tuần. |
| `backend/api/route_handlers.py` (4761 LOC, 105 handler) | "Mới đặt tên" `route_handlers.py` lại trở thành file cross-domain thứ 2: chứa admin login/dashboard/messaging/services/tenants/catalog/partners + webhook (Tawk/WhatsApp/Telegram/Evolution) + booking-assistant chat + email + customer-agent health. Mọi `*_routes.py` (admin, webhook, communication, public_catalog, upload) đều `from api import route_handlers as handlers`. | P0 | A,B | Tách thành `route_handlers/admin.py`, `route_handlers/webhooks.py`, `route_handlers/booking_assistant.py`, `route_handlers/email.py` rồi update các thin route file. Không yêu cầu rewrite logic. |
| `backend/services.py:1-3871` (16 top-level objects, gồm `BookingAssistantService`, `OpenAIService`, `AIEventSearchService`, `PricingService` cùng 100+ helpers) | Vi phạm trực tiếp refactor rule "không mở rộng cross-domain logic". Nhiều helper riêng (`_build_google_maps_url`, `store_event`, `resolve_service_image_url`, `_extract_preferred_locations_from_query`) được import lại từ `v1_routes.py`, `v1_booking_handlers.py`, `route_handlers.py`. | P1 | A,B | Move geocoding helper sang `service_layer/geo_utils.py` (đã tồn tại), `store_event` sang `service_layer/event_store.py` (đã tồn tại) rồi delete duplicate definitions. |
| `backend/service_layer/messaging_automation_service.py` (2969 LOC, 1 class `MessagingAutomationService` 76 methods) | God-class theo MVC anti-pattern. Bao trùm: identity resolution, conversation window, search shortlist, booking intake, payment care, cancel/reschedule, Telegram inline UI, WhatsApp routing, email confirmation. Không thể test phần riêng. | P1 | A,B | Split theo trục: `messaging/identity_resolver.py`, `messaging/shortlist_renderer.py`, `messaging/booking_intake.py`, `messaging/care_actions.py`. Class chính chỉ orchestrator. |
| `backend/service_layer/tenant_app_service.py` (2687 LOC, 45 top-level fn) | Gánh cả tenant overview + catalog + bookings + leads + integrations + billing + onboarding + team + portal + invoice receipt. Bị import bởi cả `v1_routes`, `v1_tenant_handlers`, `route_handlers`, `messaging_automation_service`. | P1 | A | Tách theo bounded-context: `tenant/overview_service.py`, `tenant/catalog_service.py`, `tenant/billing_service.py`, `portal/booking_service.py`. |
| `backend/api/v1_tenant_handlers.py:9-87` | Handler module mới nhưng import 60+ symbol bao gồm cả private helpers (`_apply_catalog_quality_to_service`, `_resolve_tenant_request_context`, `_load_valid_tenant_email_login_code`, ...) từ `v1_routes.py`. Coupling còn nguyên, chỉ là "đổi nhà" thư mục. | P1 | A | Move private helpers sang `service_layer/tenant_session_service.py`; handler module chỉ giữ FastAPI signature + delegate. |
| `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` (~318 KB, ~7000+ LOC) | Component 1-file chứa toàn bộ booking flow public/product. Khó review, test khó cô lập, dễ regression. Vẫn được landing section import. | P1 | A,C | Tách step components (`SearchStep`, `ResultsStep`, `ConfirmStep`, `PaymentReturnStep`) + state machine. Có thể làm cuốn chiếu. |
| `frontend/src/apps/tenant/TenantApp.tsx` (~255 KB) + `frontend/src/apps/public/HomepageSearchExperience.tsx` (~219 KB) | Hai surface workspace ngồi trong 1 file React. Đã có `frontend/src/features/tenant-*` nhưng `TenantApp.tsx` vẫn ôm form state + API orchestration. | P1 | A,C | Đẩy form state sang custom hooks trong `features/tenant-*`; component chỉ render. Phase 21 (billing) là điểm chen vào tốt. |
| `app/`, `components/`, `lib/`, `server/`, `features/admin/`, `prisma/`, `next.config.mjs` (toàn bộ Next.js stack) | 113 file TSX/TS + Prisma schema + API routes Next.js + admin RBAC `lib/rbac/policies.ts`. Không build trong `docker-compose.prod.yml` (chỉ `web: build ./frontend`). README mô tả là "experiment, not yet sole deployed". Tồn tại trên `main` gây nhầm lẫn cho contributor và judge. | P1 | B,C | Hoặc move sang branch `experiment/next-admin` và xoá khỏi main; hoặc thêm top-level `EXPERIMENT.md` + `.dockerignore` rõ ràng + đổi `package.json:name` thành `bookedai-next-experiment` để dấu hiệu rõ. |

## 3. Backend bounded-context drift

Refactor rules trong [`README.md:80-100`](/home/dovanlong/BookedAI/README.md) yêu cầu route module mỏng + service layer / integrations giữ orchestration. Vi phạm hiện tại:

- **`backend/api/v1_routes.py`** - 5706 LOC, 50 `@router` decoration không mount, chứa cross-domain logic của booking + tenant + portal + integration + catalog. Vẫn là single source dùng chung helper. Mọi handler module mới import lại từ đây ([`v1_booking_handlers.py:12-43`](/home/dovanlong/BookedAI/backend/api/v1_booking_handlers.py), [`v1_tenant_handlers.py:9-87`](/home/dovanlong/BookedAI/backend/api/v1_tenant_handlers.py), `v1_search_handlers.py`, `v1_integration_handlers.py`, `v1_communication_handlers.py`, `v1_academy_handlers.py`, `v1_assessment_handlers.py`).
- **`backend/services.py`** - chứa `BookingAssistantService`, `OpenAIService`, `PricingService`, `AIEventSearchService` cùng helper tiện ích. README cấm mở rộng nhưng vẫn được import từ `service_layer/admin_presenters.py:8`, `service_layer/demo_workflow_service.py:17`, `api/v1_routes.py:105`, `api/route_handlers.py:157`, `api/v1_booking_handlers.py:427` (lazy import).
- **`backend/api/route_handlers.py`** - 4761 LOC, lifecycle FastAPI + admin handlers + webhook handlers (Tawk/WhatsApp/Telegram/Evolution) + booking-assistant chat + email. `app.py:7` import lifespan từ đây. Đây là "v2 mega-file" thay thế `v1_routes.py` mà README chưa cấm rõ.
- **`backend/service_layer/messaging_automation_service.py:25-30`** import `tenant_app_service.queue_portal_booking_request` + `build_portal_customer_care_turn`; `tenant_app_service` đáng lẽ là portal/tenant context, không phải dịch vụ messaging. Đảo ngược dependency: messaging → portal là OK, nhưng cùng chiều, `tenant_app_service` cũng cross-domain thừa (billing/team/catalog gói chung).

## 4. Frontend duplication risk

- **Active runtime**: `docker-compose.prod.yml:256-273` chỉ build `web`/`beta-web` từ `./frontend` (Vite). [`frontend/src/app/AppRouter.tsx:56-322`](/home/dovanlong/BookedAI/frontend/src/app/AppRouter.tsx) phân route theo `window.location.hostname` + `pathname` cho 13 surface (Admin/Tenant/Portal/Public/Product/Demo/Roadmap/Pitch/Architecture/RegisterInterest/FutureSwim/AIMentorPro/ChessGrandmaster). Đây là single shipped frontend.
- **Dead-shipping but live-in-repo**: `app/` (Next.js 16) + `components/` + `lib/` + `server/` + `features/admin/` + `prisma/` (~113 file). Có Prisma client (`@prisma/client@^7.7.0`), Next API routes (`app/api/admin/bookings/[bookingId]/reschedule/route.ts`), full RBAC (`lib/rbac/policies.ts`), seed (`prisma/seed.ts`). Build target tồn tại (`next.config.mjs`, root `package.json` scripts `dev/build/start`) nhưng KHÔNG có service trong `docker-compose.prod.yml`.
- **Confusion vector A**: 2 file `package.json` ở root (Next + Prisma) và `frontend/package.json` (Vite + React 18). Newcomer chạy `npm install` ở root sẽ kéo Next 16 + React 19 + Prisma + Postgres adapter — không cần thiết cho dev FE chính.
- **Confusion vector B**: `app/admin/` và `frontend/src/apps/admin/AdminApp.tsx` cùng tồn tại → dễ sửa nhầm file Next admin (không deploy) thay vì Vite admin (đang chạy). Tương tự `app/admin/customers` vs `frontend/src/features/admin/`.
- **Dead code risk**: `components/admin/leads/lead-form.test.tsx` và các Next file không được Playwright/test runner pick up (Playwright chạy `frontend/tests/`).
- **Khuyến nghị (≤ 1 ngày)**: thêm `EXPERIMENT.md` ở root, đổi `package.json:name` thành `bookedai-next-experiment`, và chèn `tsconfig.json` root vào exclude khỏi default IDE workspace, để rõ rằng Next chỉ là experiment.

## 5. Test coverage map

Backend (`backend/tests/`, ~40 file):

- **Có cover tốt**: `test_api_v1_tenant_routes.py` (106 KB), `test_api_v1_search_routes.py` (63 KB), `test_telegram_webhook_routes.py` (115 KB), `test_lifecycle_ops_service.py` (52 KB), `test_admin_messaging_routes.py`, `test_whatsapp_webhook_routes.py`, `test_api_v1_integration_routes.py`, `test_api_v1_portal_routes.py`, `test_api_v1_academy_routes.py`, `test_prompt9_matching_service.py`, `test_booking_assistant_service.py`, `test_admin_dashboard_service.py`, `test_release_gate_security.py`, `test_phase2_repositories.py`.
- **Gap quan sát**:
  - Không có file test trực tiếp cho `messaging_automation_service.py` (chỉ test gián tiếp qua `test_telegram_webhook_routes.py` + `test_whatsapp_webhook_routes.py`); lớp giả 76 method không có unit-level coverage.
  - Không có file test cho `tenant_app_service.py` (2687 LOC) — chỉ test gián tiếp qua route tests; rủi ro Phase 21 billing logic regression.
  - Không có test cho workers (`backend/workers/`), chỉ có `test_outbox_worker.py`. Job scheduler test 2.8 KB là smoke.
  - Không có test cho `chess_revenue_engine_service.py` (442 LOC, Phase 22 template).
  - Không có test cho `discord_service.py`, `n8n_service.py`, `upload_service.py`.
- **`backend/tests/test_api_v1_routes.py` chỉ 116 byte** — placeholder rỗng, có thể xoá.

Frontend (`frontend/tests/`, 13 spec):

- **Cover**: admin-bookings-filters, admin-prompt5-preview, admin-session-regression, admin-workspace-upgrade, demo-bookedai-full-flow, pitch-deck-rendering, portal-enterprise-workspace, pricing-demo-flows, product-app-regression, public-booking-assistant-live-read, public-booking-assistant-location-guardrails, public-homepage-responsive, tenant-gateway.
- **Gap**:
  - Tenant workspace (`TenantApp.tsx` 255 KB) chỉ có gateway test, không có spec cho catalog publish, billing checkout, team invite, plugin interface, integration provider toggle.
  - Portal customer-care turn / cancel-request / reschedule-request chỉ một spec (`portal-enterprise-workspace`); không có spec cancel-flow happy path Stripe.
  - Không có spec cho Telegram inline-picker UX trong frontend (server-side only).
  - Architecture/Roadmap/RegisterInterest/FutureSwim/AIMentorPro/ChessGrandmaster runtime — không spec, mặc dù code đã ship.
  - Không có Playwright cho widget/plugin runtime (Phase 20).
- **Smoke pipeline** (`package.json:test:release-gate`): chỉ chạy `legacy + live-read + admin-smoke + tenant-smoke`. Phần lớn các spec lớn (admin-prompt5-preview 56 KB, admin-session-regression 25 KB) nằm ngoài release gate trừ khi explicitly invoked.

## 6. Quick wins (≤ 1 ngày code)

1. **Xoá 50 dead `@router` decoration trong `backend/api/v1_routes.py`** (dòng 1992–5682) — chỉ giữ function body. Đảm bảo 0 endpoint mất (đã có `v1_*_routes.py` mount qua `add_api_route`). Lợi ích: contributor không sửa nhầm route. Risk: thấp, có sẵn `backend/tests/test_api_v1_*_routes.py` đảm bảo regression.

2. **Xoá `backend/tests/test_api_v1_routes.py` (116 byte placeholder)** và `frontend/tmp-product-qa-check.js` (1.8 KB scratch) — không reference từ runtime. Reduce noise.

3. **Tách `backend/api/route_handlers.py` thành package `backend/api/route_handlers/`** với 4 file: `admin.py`, `webhooks.py`, `booking_assistant.py`, `email_and_health.py`. Giữ lifespan + middleware bootstrap trong `__init__.py`. Update 5 import (`api/admin_routes.py:3`, `api/webhook_routes.py`, `api/communication_routes.py:3`, `api/public_catalog_routes.py`, `app.py:7`). Mechanical, có test cover.

4. **Move 3 helper khỏi `backend/services.py` về service_layer**: `_build_google_maps_url` → `service_layer/geo_utils.py` (đã có path), `store_event` → `service_layer/event_store.py` (đã tồn tại, có thể alias), `resolve_service_image_url` → `service_layer/catalog_assets.py` (đã tồn tại). Update 5 import site (`v1_routes.py:105`, `route_handlers.py:157,3978`, `service_layer/admin_presenters.py:8`, `service_layer/demo_workflow_service.py:17`, lazy `v1_booking_handlers.py:427`). Removing duplicate.

5. **Đổi tên `package.json:name` ở repo root từ `bookedai-next-starter` thành `bookedai-next-experiment`** + thêm comment trong `next.config.mjs` + tạo `EXPERIMENT.md` (không phải README mới, chỉ marker file) đề cập rõ Next stack chưa ship. Giảm confusion cho judge/investor đọc repo top-down.

## 7. Appendix - chi tiết bổ sung

### 7.1 Routing topology hiện tại (verified)

`backend/app.py:36-41` mount:
- `public_catalog_router` (16 routes, thin)
- `upload_router` (2 routes, thin)
- `webhook_router` (7 routes, thin)
- `admin_router` (30 routes, thin — nhưng tất cả delegate `route_handlers.py`)
- `communication_router` (3 routes thin + Discord)
- `v1_router` → `academy(13) + assessment(6) + search(3) + booking(5) + communication(4) + integration(26) + tenant(40)` = 97 routes thin → all delegate `v1_*_handlers.py` → all import `v1_routes.py`.

Total ~155 endpoint thin routes; tất cả handler thực sự sống trong 2 mega-file (`v1_routes.py` + `route_handlers.py`).

### 7.2 Cross-import graph snapshot

```
v1_routes.py (5706 LOC, 50 dead-router, ~120 fn)
  ← v1_booking_handlers.py
  ← v1_tenant_handlers.py
  ← v1_search_handlers.py
  ← v1_integration_handlers.py
  ← v1_communication_handlers.py
  ← v1_academy_handlers.py
  ← v1_assessment_handlers.py

services.py (3871 LOC)
  ← v1_routes.py:105
  ← route_handlers.py:157
  ← v1_booking_handlers.py:427 (lazy)
  ← service_layer/admin_presenters.py:8
  ← service_layer/demo_workflow_service.py:17

tenant_app_service.py (2687 LOC)
  ← v1_routes.py:90
  ← v1_tenant_handlers.py:89
  ← route_handlers.py:151
  ← messaging_automation_service.py:25
```

### 7.3 Mega-file detail (LOC)

| File | LOC | Top-level objects | Notes |
|---|---|---|---|
| `backend/service_layer/messaging_automation_service.py` | 2969 | 3 (1 god-class, 76 methods) | P1 split; chia identity / shortlist / care |
| `backend/service_layer/tenant_app_service.py` | 2687 | 45 | P1; cross billing+catalog+team+portal+overview |
| `backend/service_layer/lifecycle_ops_service.py` | 1403 | 26 | OK borderline; nhưng test 52 KB cho thấy phức tạp |
| `backend/service_layer/prompt9_matching_service.py` | 1398 | tracked, có test riêng | OK |
| `backend/service_layer/academy_service.py` | 1233 | 1 surface, có test | OK |
| `backend/service_layer/communication_service.py` | 836 | có test gián tiếp | OK |

### 7.4 Frontend largest files

| File | KB |
|---|---|
| `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` | 319 |
| `frontend/src/apps/tenant/TenantApp.tsx` | 255 |
| `frontend/src/apps/public/HomepageSearchExperience.tsx` | 219 |
| `frontend/src/components/landing/data.ts` | 118 |
| `frontend/src/components/landing/sections/BookingAssistantSection.tsx` | 97 |
| `frontend/src/apps/portal/PortalApp.tsx` | 89 |
| `frontend/src/features/admin/prompt5-preview-section.tsx` | 73 |
| `frontend/src/shared/api/v1.ts` | 65 |

### 7.5 Phase 17–23 alignment

- **Phase 17 (full-flow stabilization)** chịu rủi ro nhất từ `BookingAssistantDialog.tsx` 319 KB và `messaging_automation_service.py` 2969 LOC — bất kỳ regression bug fix nào cũng phải scroll qua hàng nghìn dòng.
- **Phase 18 (revenue-ops ledger)** phụ thuộc `lifecycle_ops_service.py` (1403 LOC, test cover OK) — không cần refactor cấp bách.
- **Phase 19 (customer-care agent)** = chính `messaging_automation_service.py` → split theo gợi ý #5 trong bảng hotspot là prerequisite.
- **Phase 20 (widget runtime)** chưa có test FE; cần khung Playwright spec mới.
- **Phase 21 (billing/receivables)** = `tenant_app_service.build_tenant_billing_*` chìm trong 2687 LOC; split là prerequisite.
- **Phase 22 (multi-tenant template)** = `chess_revenue_engine_service.py` 442 LOC chưa có unit test.
- **Phase 23 (release governance)** quick win #1 (xoá dead `@router`) nên đưa vào release gate.
