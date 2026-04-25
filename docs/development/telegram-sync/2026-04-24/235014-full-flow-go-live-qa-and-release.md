# Full flow go-live QA and release

- Timestamp: 2026-04-24T23:50:14.509163+00:00
- Source: docs/development/telegram-sync/2026-04-24/235014-full-flow-go-live-qa-and-release.md
- Category: release
- Status: completed

## Summary

Completed full go-live QA, fixed demo CORS and chess DNS/proxy posture, deployed live, and verified API health plus browser smoke across demo, pitch/register, product, admin, and chess.

## Details

# Full Flow Go-Live QA And Release

## Summary

Completed a full go-live QA pass for the active BookedAI public/admin proof surfaces and deployed the current worktree live.

## Fixes Caught During QA

- Updated the payment-intent contract test to match the runtime metadata that now records `requested_booking_intent_id`.
- Added active public proof hosts to backend CORS defaults and live runtime env so `demo.bookedai.au` can call `/api/v1/conversations/sessions`.
- Corrected `chess.bookedai.au` DNS to the current origin and proxied Cloudflare path after finding it still resolved to an older direct origin.
- Added `chess.bookedai.au` back into the runtime DNS record override list to keep future DNS syncs aligned.

## Verification

- `python3 -m py_compile backend/config.py`
- `python3 -m py_compile backend/api/v1_booking_handlers.py backend/api/v1_academy_handlers.py backend/api/v1_assessment_handlers.py backend/service_layer/academy_service.py backend/workers/academy_actions.py backend/service_layer/booking_assistant_runtime.py`
- `cd backend && ../.venv/bin/python -m pytest -q tests/test_api_v1_booking_routes.py tests/test_api_v1_contract.py tests/test_api_v1_portal_routes.py tests/test_api_v1_assessment_routes.py tests/test_api_v1_academy_routes.py tests/test_academy_action_worker.py tests/test_pricing_consultation_resilience.py tests/test_booking_assistant_runtime.py`
- `cd backend && ../.venv/bin/python -m pytest -q tests/test_api_v1_contract.py tests/test_api_v1_booking_routes.py`
- `npm --prefix frontend run build`
- `PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/demo-bookedai-full-flow.spec.ts --project=live-read`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
- Production `/api/health` returned `200`
- Production demo CORS preflight for `/api/v1/conversations/sessions` returned `200` with `Access-Control-Allow-Origin: https://demo.bookedai.au`
- Production revenue-ops API probe for `GET /api/v1/agent-actions` returned `200`
- Browser smoke across `demo.bookedai.au`, `pitch.bookedai.au/register-interest`, `product.bookedai.au`, `admin.bookedai.au`, and `chess.bookedai.au` returned `200`, no horizontal overflow, and no non-ignorable console/network errors

## Live URLs Checked

- `https://demo.bookedai.au/`
- `https://pitch.bookedai.au/register-interest`
- `https://product.bookedai.au/`
- `https://admin.bookedai.au/`
- `https://chess.bookedai.au/`
- `https://api.bookedai.au/api/health`
