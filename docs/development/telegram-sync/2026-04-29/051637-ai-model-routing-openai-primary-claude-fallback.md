# AI model routing OpenAI primary Claude fallback

- Timestamp: 2026-04-29T05:16:37.498954+00:00
- Source: docs/development/telegram-sync/2026-04-29/051637-ai-model-routing-openai-primary-claude-fallback.md
- Category: engineering
- Status: done

## Summary

BookedAI backend AI routing now defaults to OpenAI, supports Claude fallback through Anthropic auth when configured, and preserves OpenAI-backed internet/public-web service search via Responses web_search.

## Details

# AI Model Routing OpenAI Primary Claude Fallback

## Summary

BookedAI backend AI routing now defaults to OpenAI, can fall back to Claude through Anthropic auth when configured, and keeps internet/public-web service search on OpenAI because that path depends on the Responses `web_search` tool.

## Details

- Corrected `OPENAI_MODEL` backend default from the stale Claude model name to `gpt-5-mini`.
- Updated provider resolution so OpenAI primary calls use `OPENAI_API_KEY` and are not hijacked by stale `AI_API_KEY` values.
- Added Anthropic runtime settings: `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, and `ANTHROPIC_MODEL`.
- Added Claude fallback support for structured AI calls via the Anthropic Messages API.
- Kept public-web/internet service search OpenAI-backed with the Responses `web_search` tool and `public_web_search` result labeling.
- Updated local `.env` provider posture to OpenAI primary and Anthropic fallback, blanking old generic AI provider keys.
- Updated `.env.example`, Docker compose env forwarding, admin config exposure, the OpenClaw customer-agent manifest, `README.md`, `project.md`, implementation progress, sprint plan, and roadmap.

## Verification

- `python3 -m py_compile backend/config.py backend/services.py backend/api/route_handlers.py`
- `./.venv/bin/python -m pytest backend/tests/test_config.py backend/tests/test_booking_assistant_service.py -q` (`21 passed`)
- `git diff --check`
- Runtime config snapshot shows OpenAI primary, `gpt-5-mini`, Anthropic fallback model `claude-opus-4-5`, and no Anthropic key currently configured locally.

## Follow-Up

- Add a real `ANTHROPIC_API_KEY` to runtime secrets before live Claude fallback UAT.
- Run a live fallback smoke by temporarily forcing the OpenAI primary to fail in a controlled non-customer path, then confirm Claude produces the structured reply.
