# Phase 23 release-gate security fixtures added

- Timestamp: 2026-04-26T14:08:25.306425+00:00
- Source: docs/development/source-code-review-and-security-hardening-2026-04-26.md
- Category: security
- Status: completed

## Summary

Added Phase 23 release-gate security coverage: provider URLs in Messaging Automation are allowlisted to http/https, unsafe provider links are omitted or fall back to BookedAI handoff URLs, and the root release gate now runs dedicated security, chat-send, Telegram, and WhatsApp fixtures. Full release gate passed.

## Details

# Source Code Review And Security Hardening - 2026-04-26

## Scope

This pass reviewed the active BookedAI codebase through the current architecture, backend security, API hardening, frontend/UI, DevOps, AI-agent, chat UI, and testing skill lenses.

Reviewed surfaces:

- project baseline: `MEMORY.md`, latest `memory/2026-04-26.md`, `project.md`, `README.md`, `DESIGN.md`
- backend: FastAPI route layout, Messaging Automation Layer, communication/email rendering, Telegram customer bot path, lifecycle email tests
- frontend: active Vite/React surface, TypeScript config, Playwright lanes, public/tenant/portal/admin surface ownership
- deployment and governance: Docker/VPS deployment notes, release gate, phase/sprint docs, Notion/Discord closeout path

## Findings

- Fixed: booking confirmation HTML email rendered user/provider-controlled values directly into HTML. This affected shared confirmation rendering used by lifecycle email, admin confirmation resend, and booking communication paths. The text email remains plain text, while HTML now escapes dynamic values and rejects unsafe non-HTTP action links.
- Verified: Telegram/customer-agent routing stays on the shared `MessagingAutomationService`, with `/api/chat/send` for website chat and `/api/webhooks/bookedai-telegram` for Telegram provider delivery.
- Verified: the active production frontend remains `frontend/` with React 18 + Vite; React 19 and Next.js guidance should be treated as future-lane guidance until the root Next experiment becomes the deployed surface.
- Completed follow-up: Phase 23 hardening now adds capture-to-retention security checks to the root release gate, covering HTML rendering, provider URL allowlisting, and customer-channel identity regression fixtures.
- Recommendation: when the chat UI is next refactored, keep the current backend contract and evaluate assistant-ui/chat-ui only as a component/runtime extraction, not as a product rewrite.

## Implemented Fix

- Added HTML escaping for confirmation email customer name, service, schedule, booking reference, business, venue, support contact, and additional note fields.
- Added safe URL handling so `payment_link`, `manage_link`, and `public_app_url` only render as `http` or `https`; unsafe values fall back to `https://bookedai.au`.
- Added a safe `mailto:` helper for the support email link.
- Added regression coverage proving script tags, HTML tags, injected image markup, and `javascript:` links do not render as active HTML/actions.
- Added provider URL allowlisting in `MessagingAutomationService` so Telegram controls and chat-compatible service-search responses only carry `http` or `https` provider URLs; unsafe provider links fall back to the BookedAI web assistant or are omitted from API payloads.
- Added `backend/tests/test_release_gate_security.py` and wired it into `scripts/run_release_gate.sh` together with chat-send, Telegram webhook, and WhatsApp webhook fixtures.

## Verification

- `python3 -m py_compile backend/service_layer/communication_service.py backend/service_layer/messaging_automation_service.py backend/service_layer/tenant_app_service.py backend/api/route_handlers.py backend/api/v1_communication_handlers.py backend/api/v1_routes.py`
- `.venv/bin/python -m pytest backend/tests/test_lifecycle_ops_service.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py -q` (`34 passed`)
- `npm --prefix frontend exec tsc -- --noEmit`
- `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh` (`all checks passed`)
