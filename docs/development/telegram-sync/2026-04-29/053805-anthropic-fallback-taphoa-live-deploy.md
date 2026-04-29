# Anthropic fallback TapHoa live deploy

- Timestamp: 2026-04-29T05:38:05.157783+00:00
- Source: docs/development/telegram-sync/2026-04-29/053805-anthropic-fallback-taphoa-live-deploy.md
- Category: engineering
- Status: done

## Summary

Configured TapHoa Anthropic-compatible fallback on /v1/messages with claude-sonnet-4-6, added SSE parsing, deployed live, and verified API/product production smoke plus live backend provider smoke.

## Details

# Anthropic Fallback TapHoa Live Deploy

## Summary

Configured and deployed the Anthropic-compatible fallback through `https://taphoaapi.info.vn/v1` using `claude-sonnet-4-6`, verified the provider from the live backend container, and completed production product/API smoke checks.

## Details

- Tested the operator-provided fallback endpoint and found `https://taphoaapi.info.vn/messages` returns `404`, while `https://taphoaapi.info.vn/v1/messages` is the correct Anthropic-compatible endpoint.
- The originally configured `claude-opus-4-5` model was unavailable on the provider. Provider errors listed supported models including `claude-sonnet-4-6`, so runtime fallback was switched to `claude-sonnet-4-6`.
- Added backend support for Anthropic-compatible `text/event-stream` responses because the provider returns SSE frames rather than a plain Anthropic JSON response body.
- Verified the provider path with a real fallback smoke: `POST https://taphoaapi.info.vn/v1/messages` returned HTTP `200` and model output `{"ok":true}`.
- Deployed live with `bash scripts/deploy_live_host.sh`.
- Confirmed the live backend container sees `fallback_provider=anthropic`, `fallback_base_url=https://taphoaapi.info.vn/v1`, `fallback_model=claude-sonnet-4-6`, and both fallback/Anthropic keys configured without printing secrets.

## Verification

- `python3 -m py_compile backend/services.py backend/config.py`
- `./.venv/bin/python -m pytest backend/tests/test_config.py backend/tests/test_booking_assistant_service.py -q` (`22 passed`)
- `npm --prefix frontend run build`
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh legacy tests/product-app-regression.spec.ts --workers=1 --reporter=line` (`8 passed`, `1 skipped`)
- `git diff --check`
- Live deploy completed successfully.
- `https://api.bookedai.au/api/health` returned `{"status":"ok","service":"backend"}`.
- `https://product.bookedai.au/` returned HTTP `200`.
- Production browser smoke across `390`, `412`, and `1440` widths found assistant input visible, horizontal overflow `0`, console errors `0`, and failed requests `0`.

## Follow-Up

- Keep `ANTHROPIC_BASE_URL` and `AI_FALLBACK_BASE_URL` on `https://taphoaapi.info.vn/v1` for this provider.
- Keep `claude-sonnet-4-6` unless the provider exposes a stronger available Claude model with a healthy channel.
