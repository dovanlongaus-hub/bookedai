# 03 - TECHNOLOGY ARCHITECTURE

```
═══════════════════════════════════════════════════════════
EXECUTIVE BRIEFING: Technology Architecture & Stack
Date: 2026-04-26 | Prepared for: CTO
═══════════════════════════════════════════════════════════
```

## BOTTOM LINE
Stack đã ở production: FastAPI + React/Vite + self-hosted Supabase Postgres + n8n + Docker Compose, 11 routed subdomains với Nginx, beta tier riêng. Architecture đủ lớn cho hiện tại nhưng có 4 risk cluster: portal continuity (R1), channel parity (R2), service-layer monolith (R3), và operational hygiene/CI gap (R4). Forward investment: split monolith service files, đẩy CI gate lên GitHub Actions, observability stack (Prometheus/Grafana/AlertManager), và `BaseRepository` tenant_id validator. Build vs buy: tự build agent layer + booking core; Stripe/Zoho/Twilio/Meta là buy.

## KEY FINDINGS
- **Six layers**: Experience (frontend/), Application (backend/), Data (Supabase), Intelligence (services.py), Automation (n8n/), Platform (deploy/). Source: [system-overview.md](../architecture/system-overview.md).
- **API surfaces**: legacy + additive `/api/v1/*` bounded-context routers (`v1_router.py`, `v1_tenant_handlers.py`, `v1_routes.py` đang decompose). Source: [master-execution-index.md](../architecture/master-execution-index.md).
- **Shared `MessagingAutomationService`** mới đã centralize WhatsApp + Telegram + web chat policy, customer-facing agent name `BookedAI Manager Bot`. Source: [implementation-progress.md](../development/implementation-progress.md).
- **Integrations**: OpenAI (LLM), Stripe (payments), Zoho Mail/Calendar, Twilio (SMS/WhatsApp fallback), Meta WhatsApp Cloud (primary, blocked), Evolution API (off-path), Cloudflare, Tawk. Source: [system-overview.md](../architecture/system-overview.md).
- **Release-gate suite**: `scripts/run_release_gate.sh` chạy frontend smoke, tenant smoke, backend unittest (49 tests), search eval (14/14). Checksum guard cho `.env.production.example` đã wire (P0-7 closed `2026-04-26`). Source: [implementation-progress.md](../development/implementation-progress.md).
- **Constraints**: frontend public/admin vẫn share build artifact; beta DB chưa fully isolated; `route_handlers.py` vẫn là handler concentration; `services.py` là AI/booking monolith. Source: [system-overview.md](../architecture/system-overview.md).

## IMPLICATIONS
What this means for BookedAI:
- **R3 monolith debt** (`tenant_app_service.py` ~6K LOC, `BookingAssistantDialog.tsx` ~6K LOC) làm Sprint 22 chậm — phải split trong Sprint 21.
- **R4 ops hygiene gap**: chưa có GitHub Actions CI, image registry với git-sha tags, hay observability stack — release governance phụ thuộc người vận hành.
- **WhatsApp delivery posture** (`P0-2`): Twilio = default (creds đang `401`), Meta blocked (`Account not registered`), Evolution off-path. Decision đã ghi nhận; chưa unblock.
- **Multi-tenant safety**: `BaseRepository` tenant_id validator (P1-4) chưa ship — risk leak cross-tenant data nếu một query bị thiếu filter.
- **Beta tier shared DB** với production: rehearsal-safe nhưng chưa data-isolation (P1-6).

## RECOMMENDED ACTIONS
1. **Ship P0-6 GitHub Actions CI pipeline** (block lint/type/test failures) — Engineering Lead — Sprint 19 (`2026-05-03`)
2. **Decompose `tenant_app_service.py` → `tenant_overview_service` + `tenant_billing_service` + `tenant_catalog_service`** (P1-4) — Backend Lead — Sprint 21 (`2026-05-17`)
3. **Stand up Prometheus + Grafana + AlertManager** với Discord/PagerDuty routing — DevOps — Sprint 20 (`2026-05-10`)
4. **Implement `BaseRepository` tenant_id validator + chaos test** — Backend Lead — Sprint 22 (`2026-05-24`)
5. **Resolve WhatsApp delivery** (Meta verification or Twilio creds repair) — CTO + COO — `2026-04-30`
6. **Beta DB separation + image registry với git-sha tags** (P1-6) — DevOps — Sprint 21

## RISKS & CONSIDERATIONS
- **Single-host Docker Compose** chưa horizontally scale; cần cloud-native plan (k8s/managed) khi tenant > ~100.
- **AI provider lock-in**: heavy reliance OpenAI; cần abstraction layer + fallback strategy.
- **Webhook reliability**: idempotency table + HMAC verification (P0-3, P0-4) phần ship local, deploy live còn pending.
- **Frontend bundle size**: `BookingAssistantDialog.tsx` (6K LOC) chưa code-split (RF-5) — first-paint chậm.
- **619 raw hex usages** trong className — design token migration (RF-1) đang outstanding.
- **22 + 153 distinct shadows, 16 + 518 arbitrary radii** — cần consolidate (RF-2, RF-3) cho UI consistency.

```
═══════════════════════════════════════════════════════════
Sources: system-overview.md, target-platform-architecture.md,
solution-architecture-master-execution-plan.md,
full-stack-review-2026-04-26.md, implementation-progress.md,
devops-deployment-cicd-scaling-strategy.md
Confidence: HIGH (code-truth aligned, recent review with explicit defect IDs)
═══════════════════════════════════════════════════════════
```
