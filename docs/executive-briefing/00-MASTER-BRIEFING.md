# 00 - MASTER BRIEFING

```
═══════════════════════════════════════════════════════════
EXECUTIVE BRIEFING: BookedAI Program — Whole-Project Overview
Date: 2026-04-26 | Prepared for: Board / CEO
═══════════════════════════════════════════════════════════
```

## BOTTOM LINE
BookedAI là một AI Revenue Engine cho service SMEs đã chạy sản xuất với public, tenant, admin và portal surfaces, không còn ở giai đoạn greenfield. Trọng tâm 28 ngày tới (`Sprint 19-22`, `2026-04-27 → 2026-05-24`) là đóng 8 hạng mục P0 từ seven-lane review, chạy một full revenue loop (Future Swim) end-to-end, và ship multi-tenant template + tenant revenue dashboard. Decision board cần ký: chốt WhatsApp provider posture, chấp nhận hold trên feature mới cho tới khi P0 đóng, và xác nhận model thương mại setup-fee + commission làm baseline cho deck nhà đầu tư.

## KEY FINDINGS
- **23 phases shipped or planned**: `Phase 0-9` đã có baseline triển khai trên repo (public, tenant, admin, portal, `/api/v1/*`, release-gate scripts); `Phase 17-23` là active execution. Source: [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md).
- **Live runtime đã chạy**: 11 routed subdomains (public, pitch, demo, product, portal, tenant, admin, api, supabase, n8n, beta), Docker Compose, self-hosted Supabase Postgres, FastAPI backend, React+Vite frontend, n8n automation. Source: [system-overview.md](../architecture/system-overview.md).
- **Seven-lane review tìm 8 P0 + 10 P1 defects**: bốn structural risks (`R1` portal continuity, `R2` channel parity, `R3` service-monolith, `R4` ops hygiene/CI). Source: [full-stack-review-2026-04-26.md](../development/full-stack-review-2026-04-26.md).
- **Ba AI agent classes** đã được locked: Search/Conversation, Revenue Operations, Customer Care/Status — chess academy là first proof case, Future Swim là first commercial loop. Source: [prd.md](../../prd.md).
- **Pricing model**: setup fee + performance-based commission + (theo update 2026-04-26) SaaS subscription tiers (`Freemium`, `Pro`, `Pro Max`, `Advance Customize`). Source: [pricing-packaging-monetization-strategy.md](../architecture/pricing-packaging-monetization-strategy.md).

## IMPLICATIONS
What this means for BookedAI:
- **Đóng P0 trước, mở feature mới sau**: tiếp tục ship feature trong khi 8 P0 còn mở sẽ đè thêm rủi ro lên nền portal/channel/CI vốn đã có gap.
- **Story nhà đầu tư đã có substrate**: roadmap, audit ledger, tenant Ops, A/B telemetry framework sẵn sàng — cần một tenant revenue proof dashboard live (Sprint 22) để biến claim thành evidence.
- **Multi-tenant template là moat thật**: chess + Future Swim đã chạy; nếu Sprint 22 generalize thành công thì vertical thứ ba có thể onboarded mà không phải build lại.
- **Channel risk vẫn cao**: WhatsApp outbound đang block (Meta `Account not registered`, Twilio `401 Authenticate`); Telegram mới live là backup chính.

## RECOMMENDED ACTIONS
1. **Close the schema normalization wave with dual-write** (`bookings`, `payments`, `audit_outbox`, `tenants`) — Backend + Data — `2026-05-10`
2. **Split frontend build artifacts for public/admin/portal** so each surface can be tested, shipped, and rolled back independently — Frontend + DevOps — `2026-05-17`
3. **Centralize backend permission registry** in `backend/security/permissions.py` and route all tenant/admin checks through it — Backend Security — `2026-05-17`
4. **Ship observability baseline**: Prometheus metrics, structured JSON logs, and an error tracker — DevOps + Security — `2026-05-31`
5. **Consolidate documentation around one canonical layer map** and mark conflicting older layer models as superseded-by-reference — Architecture + Product/PM — `2026-05-10`

## RISKS & CONSIDERATIONS
- **WhatsApp delivery blocker** (Meta verification + Twilio creds) blocks `Phase 19` channel parity.
- **Service-layer monolith** (`tenant_app_service.py`, `route_handlers.py`) là technical debt làm Sprint 22 chậm nếu không split kịp.
- **Không có CI/CD gate trên GitHub Actions yet**: P0-6, đang chạy ở local script; release governance phụ thuộc operator discipline.
- **Documentation drift risk**: 234 docs với multiple north-star versions — đã có source-of-truth rule nhưng phải duy trì closeout.
- **Resource concentration**: nhiều P0/P1 tập trung vào 1 founder-led team; cần plan hiring trước Phase 22.

```
═══════════════════════════════════════════════════════════
Sources: prd.md, project.md, DESIGN.md, bookedai-master-roadmap-2026-04-26.md,
master-execution-index.md, full-stack-review-2026-04-26.md,
implementation-progress.md, system-overview.md
Confidence: HIGH (multiple verified sources, recent dated artifacts, code-truth aligned)
═══════════════════════════════════════════════════════════
```
