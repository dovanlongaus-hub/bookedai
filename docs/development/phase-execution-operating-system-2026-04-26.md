# BookedAI Phase Execution Operating System

Date: `2026-04-26`

Status: `active PM execution control`

## Purpose

This document turns the master roadmap into a professional phase-by-phase execution system. It defines how the PM coordinates the best-fit agent lanes for frontend, backend, security/validation, QA/UAT, DevOps/live deployment, product/content, and data/revenue proof.

It must be read with:

- `project.md`
- `docs/architecture/bookedai-master-roadmap-2026-04-26.md`
- `docs/development/next-phase-implementation-plan-2026-04-25.md`
- `docs/development/full-stack-review-2026-04-26.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/implementation-progress.md`

## PM Operating Rule

BookedAI phases are now managed as gated delivery waves, not loose task lists.

No phase is considered complete until all of these gates are closed:

1. requirement baseline updated
2. implementation complete or explicitly marked as a carried risk
3. automated verification passed
4. UAT evidence captured
5. live deploy completed when runtime behavior changed
6. live smoke passed after deploy
7. implementation progress updated
8. matching roadmap/sprint document updated
9. Notion and Discord closeout published when operator-visible
10. next phase opened with owners, blockers, and acceptance gates

If a phase is documentation-only, the deploy-live gate is marked `not applicable`, but Notion/Discord closeout still applies when the update changes operator direction.

## Agent Lanes

The PM assigns work by lane, not by personality.

| Lane | Responsibility | Primary proof |
|---|---|---|
| `Product/PM` | requirement clarity, phase scope, acceptance criteria, investor/SME positioning | source docs updated before implementation |
| `Frontend` | public, product, pitch, portal, tenant, admin UI/UX | responsive Playwright, no overflow, accessible actions |
| `Backend` | FastAPI contracts, services, repositories, webhooks, lifecycle side effects | unit/API tests, py_compile, contract fixtures |
| `Security/Validation` | identity boundaries, webhook verification, tenant scoping, unsafe URL/content guards | negative tests, release-gate security fixtures |
| `QA/UAT` | scenario matrix, browser UAT, regression packs, evidence capture | screenshots/logs, UAT notes, pass/fail matrix |
| `DevOps/Live` | release gate, deploy-live, healthcheck, rollback readiness, environment parity | release gate, stack health, live smoke |
| `Data/Revenue` | billing, receivables, commission, tenant revenue proof, metrics | revenue evidence, dashboards, reconciliation |
| `Content/GTM` | SME wording, investor narrative, launch assets, lifecycle email | approved copy, experiment hypotheses, campaign plan |

## Phase Gate Template

Every phase closeout must use this structure:

```markdown
## Phase N Closeout

- Scope delivered:
- Owner lanes:
- Code/doc changes:
- Automated verification:
- UAT evidence:
- Deploy-live result:
- Live smoke:
- Risks carried:
- Documents updated:
- Notion/Discord:
- Next phase opened:
```

## Phase Status From Roadmap

| Phase | Current status | PM action |
|---|---|---|
| `0` | `done baseline` | preserve history; no reopen unless source docs conflict |
| `1` | `implemented baseline` | preserve; close remaining public accessibility/Pitch coverage through active overlays |
| `2` | `partial foundation complete` | carry commercial model/data truth into Phase `21` |
| `3` | `strongest active implementation lane` | channel parity closes through Phase `19` |
| `4` | `partial` | revenue proof dashboard closes through Phase `21` |
| `5` | `partial foundation` | provider posture and channel-aware templates close through Phase `19/21` |
| `6` | `partially active` | CI/observability close through Phase `23` |
| `7` | `real foundation implemented` | tenant authenticated UAT and service split close through Phase `20/22` |
| `8` | `real foundation implemented` | admin responsive and operational support polish close through active UAT |
| `9` | `partially active` | release governance closes through Phase `23` |
| `17` | `active stabilization` | close UI/UX, booking-to-portal, accessibility, pitch coverage, Future Swim URL |
| `18` | `partially active` | keep ledger visible; add idempotency evidence after webhook event table ships |
| `19` | `started, parity gaps remain` | close WhatsApp posture, HMAC, idempotency, tenant-id validator, WhatsApp parity |
| `20` | `planned` | open only after Phase `19` P0 security/channel preconditions are live |
| `20.5` | `planned` | pair wallet/Stripe return with confirmation payment-state badge |
| `21` | `planned, scaffolds exist` | ship billing/receivables truth and Tenant Revenue Proof dashboard |
| `22` | `planned` | extract templates, split tenant services, add tenant query validator, SMS adapter |
| `23` | `partially active, hardening required` | make release gate, CI, env parity, observability, rollback evidence mandatory |

## Active Execution Board

The PM now treats `Sprint 19` as the immediate execution board.

| Priority | Item | Phase | Owner lanes | Required closeout |
|---|---|---|---|---|
| `P0-1` | portal `v1-*` snapshot UAT remains green for fresh references | `17` | Backend, QA/UAT, DevOps/Live | API test, live portal smoke, progress closeout |
| `P0-2` | WhatsApp provider posture decision | `19` | Product/PM, Backend, DevOps/Live | decision recorded in `docs/development/whatsapp-provider-posture-decision-2026-04-26.md`; provider delivery still blocked until Twilio/Meta repair |
| `P0-3` | Telegram/Evolution webhook signature verification | `19` | Backend, Security/Validation, QA/UAT | Telegram token tests, Evolution HMAC tests, release gate, live deploy |
| `P0-4` | inbound webhook idempotency table and routing | `19`, `23` | Backend, Data/Revenue, QA/UAT | migration, duplicate-event tests, ledger evidence plan |
| `P0-5` | public assistant `actor_context.tenant_id` validator | `19`, `22` | Backend, Security/Validation | rejection tests and route coverage |
| `P0-6` | GitHub Actions CI | `23` | DevOps/Live, QA/UAT | workflow file, local parity, branch protection note |
| `P0-7` | expanded `.env.production.example` and checksum guard | `23` | DevOps/Live, Security/Validation | env diff/checksum test |
| `P0-8` | reduce OpenClaw root/Docker-socket scope | `23` | DevOps/Live, Security/Validation | README boundary, live/operator smoke |
| `P1-7` | phone `aria-describedby` and admin booking responsive cards | `17`, `8` | Frontend, QA/UAT | Playwright desktop/mobile coverage |

## Execution Log

### `2026-04-26` Phase 17 P0-1 Gate Check

- Scope: portal and booking continuity verification for the first active Sprint 19 board item.
- Owner lanes: Backend, QA/UAT, DevOps/Live.
- Automated verification: `.venv/bin/python -m pytest backend/tests/test_api_v1_portal_routes.py backend/tests/test_api_v1_booking_routes.py -q` passed with `17 passed`.
- Live health: `bash scripts/healthcheck_stack.sh` passed at `2026-04-26T14:37:15Z`.
- Deploy-live: not applicable for this check because no runtime code changed in this pass.
- Status: P0-1 remains green in local focused tests and live stack health; next full closeout still needs a fresh live booking-to-portal smoke when the next runtime change is promoted.
- Notion/Discord: published via `python3 scripts/telegram_workspace_ops.py sync-doc`; archive entry is `docs/development/telegram-sync/2026-04-26/143759-bookedai-sprint-19-p0-1-phase-gate-verification.md`.

### `2026-04-26` Phase 19 P0-2 Provider Posture Decision

- Scope: WhatsApp provider posture for customer-care delivery.
- Owner lanes: Product/PM, Backend, DevOps/Live.
- Decision: inbound WhatsApp booking-care policy remains active; outbound WhatsApp delivery is not production-ready.
- Current posture: Twilio is configured as the default provider, Evolution outbound fallback is disabled, Meta is blocked until account/number registration completes, and Twilio remains queued/manual-review until credentials or sender posture are repaired.
- Deploy-live: not applicable for this documentation decision; runtime provider repair still needs deploy/recreate plus live controlled send.
- Status: P0-2 decision recorded; provider delivery remains a carried blocker before WhatsApp can be treated as a fully live outbound channel.

### `2026-04-26` Phase 17 P1-7 Frontend UI/UX Stabilization

- Scope: documented P1-7 frontend debt covering phone-field accessibility and admin bookings mobile containment.
- Owner lanes: Frontend, QA/UAT.
- Implementation: product assistant and homepage booking phone helpers now use `aria-describedby`; admin booking rows convert from the desktop min-width grid into labeled card rows below `720px`; product fallback copy now reflects the live booking/follow-up posture.
- Automated verification: `npm --prefix frontend exec tsc -- --noEmit` passed; `cd frontend && npx playwright test tests/admin-bookings-filters.spec.ts --workers=1 --reporter=line` passed with `2 passed`.
- UAT evidence: the admin focused Playwright pass asserts no horizontal overflow at `640px`, hidden mobile table header, labeled booking card fields, and row containment inside the viewport.
- Carry-forward: full `product-app-regression.spec.ts` rerun was attempted after updating stale selectors, but the suite was terminated with exit `143` while another workspace Playwright smoke/build lane was active; rerun before deploy-live.
- Deploy-live: not run in this pass.
- Status: P1-7 implementation complete locally with admin UAT coverage; product regression rerun and live smoke remain required before promotion.

### `2026-04-26` Phase 19 P0-3 Webhook Signature Gate

- Scope: customer Telegram and Evolution inbound webhook verification.
- Owner lanes: Backend, Security/Validation, QA/UAT, DevOps/Live.
- Implementation: Telegram keeps the official Telegram Bot API secret-token check through `X-Telegram-Bot-Api-Secret-Token`; Evolution now supports `WHATSAPP_EVOLUTION_WEBHOOK_SECRET` and requires an HMAC-SHA256 signature in `X-BookedAI-Signature` or `X-Hub-Signature-256` when the secret is configured.
- Automated verification: `.venv/bin/python -m py_compile backend/api/route_handlers.py backend/config.py`; `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q` passed with `23 passed`.
- UAT: missing/wrong Evolution HMAC requests return `403`, a correct HMAC request is processed and stored as `whatsapp_inbound`, and Telegram still rejects missing secret-token when configured.
- Deploy-live: required because runtime code changed; promote after release/security slice passes.
- Status: code and local UAT gate closed; live rollout evidence will be appended after deploy and stack smoke.

### `2026-04-26` Phase 19 P0-4 Inbound Webhook Idempotency Routing

- Scope: inbound webhook idempotency table/routing for customer Telegram, Twilio/Meta WhatsApp, and Evolution WhatsApp.
- Owner lanes: Backend, Data/Revenue, QA/UAT.
- Current state found: the base `webhook_events` and `idempotency_keys` tables already existed, and `/api/webhooks/whatsapp` already used them for duplicate suppression; `/api/webhooks/bookedai-telegram` and `/api/webhooks/evolution` were still processing without that shared route-level gate.
- Implementation: Telegram and Evolution now reserve an inbound idempotency key before customer-care side effects, record the inbound `webhook_events` row, mark processed after storage/reply handling, and return `messages_processed: 0` for duplicate provider events.
- Migration: `backend/migrations/sql/022_inbound_webhook_idempotency_evidence_indexes.sql` adds additive evidence indexes for webhook status and idempotency scope queries.
- Automated verification: `.venv/bin/python -m py_compile backend/api/route_handlers.py backend/repositories/idempotency_repository.py backend/repositories/webhook_repository.py`; `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py -q` passed with `21 passed`.
- Status: local P0-4 code and duplicate-event coverage closed; deploy-live and operator evidence drawer surfacing remain carried follow-ups.

### `2026-04-26` Phase 23 P0-6/P0-7 CI And Env Guard Patch

- Scope: DevOps/Live planning and patch surface for GitHub Actions CI parity plus `.env.production.example` checksum guard.
- Owner lanes: DevOps/Live, QA/UAT, Security/Validation.
- Implementation: added `.github/workflows/release-gate.yml` to install backend/frontend dependencies and run `bash scripts/run_release_gate.sh` on pull requests, `main` pushes, and manual dispatch; added `scripts/verify_env_production_example_checksum.sh` plus `checksums/env-production-example.sha256`; wired the checksum verification into the release gate before frontend/backend checks.
- Local parity: the workflow deliberately calls the existing release gate instead of duplicating command lists; CI creates `.venv-backend` because the local gate already requires that path.
- Policy/secrets: no repository secrets, deployment credentials, or branch protection settings were invented in code. Branch protection remains an operator/GitHub settings follow-up.
- Status: P0-6/P0-7 patch is ready for local verification and GitHub execution; branch protection note remains carried until repository settings can be applied.

### `2026-04-26` Phase 19 P0-5 Public Assistant Tenant Validation

- Scope: public assistant `actor_context.tenant_id` validation for authenticated tenant sessions.
- Owner lanes: Backend, Security/Validation.
- Implementation: `_resolve_tenant_id` now checks a valid tenant Bearer session before trusting a supplied `actor_context.tenant_id`; mismatches return `403`. `/api/chat/send` remains unchanged because it does not accept `actor_context`.
- Automated verification: `.venv/bin/python -m py_compile backend/api/v1_routes.py backend/api/v1_booking_handlers.py backend/api/route_handlers.py`; `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py backend/tests/test_chat_send_routes.py -q` passed with `8 passed`; `.venv/bin/python -m pytest backend/tests/test_api_v1_search_routes.py -q` passed with `21 passed`.
- Status: local P0-5 rejection and matching-session coverage closed; deploy-live and live smoke remain pending if this patch is promoted.

## UAT Standard

Every phase needs UAT written as customer/operator evidence, not only test logs.

Minimum UAT for runtime phases:

- desktop and `390px` mobile browser pass
- no horizontal overflow
- no app-owned console/page/request failures
- primary CTA/action visible and accessible
- one realistic customer/operator scenario completed
- evidence path recorded under `output/` or `frontend/output/`
- short UAT note saved under `docs/development/`

## Deploy-Live Standard

Runtime changes promote through:

1. local focused tests
2. frontend typecheck/build when frontend changed
3. backend py_compile and focused pytest when backend changed
4. release gate or justified scoped gate
5. `python3 scripts/telegram_workspace_ops.py deploy-live`
6. `bash scripts/healthcheck_stack.sh`
7. live smoke for the changed surface
8. Notion/Discord closeout

## Current PM Decision

The project does not restart from Phase `0`. Phase `0-16` remain historical delivered baselines. The active execution window is:

- finish `Sprint 19` P0/P1 gates
- close Phase `17`, Phase `19`, and Phase `23` blockers enough to open Phase `20`
- only then move to widget/plugin runtime, wallet/Stripe return, billing truth, multi-tenant templates, and final release governance scale-up
