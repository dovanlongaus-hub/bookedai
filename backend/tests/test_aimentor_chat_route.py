"""Route-level tests for ``POST /api/v1/aimentor/chat/turn``.

The handler is backed by the LLMRouter; we patch ``LLMRouter.from_env`` to
return a stub whose ``.complete`` is an :class:`AsyncMock`. We also stub the
catalog cache and reset module-level rate-limit / cache state between tests
so every case starts clean.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api import v1_aimentor_chat_handlers as chat_handlers  # noqa: E402
from api.v1_router import router as v1_router  # noqa: E402
from integrations.ai_models.llm_router import LLMResponse  # noqa: E402


URL = "/api/v1/aimentor/chat/turn"


_DEFAULT_PROGRAMS = [
    {
        "service_id": "ai-mentor-doer-foundation",
        "name": "AI Doer Foundation",
        "category": "AI Programming Mentorship",
        "amount_aud": 199.0,
        "display_price": "AUD $199",
        "duration_minutes": 60,
        "sort_order": 1,
        "featured": 1,
    },
    {
        "service_id": "ai-mentor-doer-builder",
        "name": "AI Doer Builder",
        "category": "AI Programming Mentorship",
        "amount_aud": 399.0,
        "display_price": "AUD $399",
        "duration_minutes": 90,
        "sort_order": 2,
        "featured": 0,
    },
]


def _make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace()
    return app


def _make_llm_response(
    text_blob: str,
    *,
    provider: str = "openai",
    model: str = "gpt-5.4",
    fallback_used: bool = False,
) -> LLMResponse:
    return LLMResponse(
        text=text_blob,
        provider=provider,
        model=model,
        finish_reason="stop",
        usage={"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150},
        fallback_used=fallback_used,
    )


@asynccontextmanager
async def _stub_catalog(_factory):
    """Drop-in for ``_get_cached_catalog`` — the real impl is async, not a
    context manager, but we patch the function directly so this isn't used.
    Kept for symmetry with the programs-route tests."""
    yield _DEFAULT_PROGRAMS


def _reset_module_state() -> None:
    """Wipe the in-process rate-limit deque + catalog cache between tests so
    the 60/min budget and 5-min TTL don't leak across cases."""
    chat_handlers._session_hits.clear()
    chat_handlers._catalog_cache["fetched_at"] = 0.0
    chat_handlers._catalog_cache["programs"] = []


def _post(
    app: FastAPI,
    *,
    body: dict,
    llm_text: str | None = None,
    llm_response: LLMResponse | None = None,
    llm_raises: Exception | None = None,
    catalog: list[dict] | None = None,
):
    """Patch ``LLMRouter.from_env`` + the catalog loader, then POST."""
    if llm_response is None and llm_text is not None:
        llm_response = _make_llm_response(llm_text)

    fake_router = MagicMock()
    if llm_raises is not None:
        fake_router.complete = AsyncMock(side_effect=llm_raises)
    else:
        fake_router.complete = AsyncMock(return_value=llm_response)

    catalog_rows = catalog if catalog is not None else _DEFAULT_PROGRAMS

    async def _stub_catalog_fn(_factory):
        return catalog_rows

    with patch(
        "api.v1_aimentor_chat_handlers.LLMRouter"
    ) as router_cls, patch(
        "api.v1_aimentor_chat_handlers._get_cached_catalog",
        side_effect=_stub_catalog_fn,
    ):
        # Importing ``LLMRouter`` happens lazily inside the handler, so we
        # have to patch the symbol on the *handler* module.
        import api.v1_aimentor_chat_handlers as h

        original_import = h.__dict__.get("LLMRouter")
        h.__dict__["LLMRouter"] = router_cls
        router_cls.from_env.return_value = fake_router
        try:
            client = TestClient(app)
            return client.post(URL, json=body)
        finally:
            if original_import is None:
                h.__dict__.pop("LLMRouter", None)
            else:
                h.__dict__["LLMRouter"] = original_import


# Note: the handler does ``from integrations.ai_models.llm_router import
# LLMRouter, LLMMessage`` *inside* the function body, so we need to patch the
# import target rather than a module attribute. We do that via a context
# manager that monkeypatches the ``integrations.ai_models.llm_router`` module
# itself.


def _post_v2(
    app: FastAPI,
    *,
    body: dict,
    llm_text: str | None = None,
    llm_response: LLMResponse | None = None,
    llm_raises: Exception | None = None,
    catalog: list[dict] | None = None,
):
    """Same as ``_post`` but patches the ``llm_router`` module directly so
    the lazy ``from integrations.ai_models.llm_router import LLMRouter``
    inside the handler resolves to our mock."""
    if llm_response is None and llm_text is not None:
        llm_response = _make_llm_response(llm_text)

    fake_router = MagicMock()
    if llm_raises is not None:
        fake_router.complete = AsyncMock(side_effect=llm_raises)
    else:
        fake_router.complete = AsyncMock(return_value=llm_response)

    catalog_rows = catalog if catalog is not None else _DEFAULT_PROGRAMS

    async def _stub_catalog_fn(_factory):
        return catalog_rows

    with patch(
        "integrations.ai_models.llm_router.LLMRouter.from_env",
        return_value=fake_router,
    ), patch(
        "api.v1_aimentor_chat_handlers._get_cached_catalog",
        side_effect=_stub_catalog_fn,
    ):
        client = TestClient(app)
        return client.post(URL, json=body)


class AIMentorChatTurnRouteTestCase(TestCase):
    def setUp(self):
        _reset_module_state()

    def tearDown(self):
        _reset_module_state()

    def test_chat_turn_returns_assistant_reply(self):
        app = _make_app()
        llm_text = (
            '{"reply_text": "We have a Foundation program perfect for '
            'beginners.", "intent": "suggest_programs", '
            '"suggested_program_ids": ["ai-mentor-doer-foundation"], '
            '"suggested_actions": [{"label": "View program", '
            '"action_kind": "url", "target": "https://aimentor.bookedai.au"}]}'
        )
        response = _post_v2(
            app,
            body={
                "session_id": "sess-1",
                "locale": "en",
                "history": [],
                "user_message": "I want to learn AI from scratch",
            },
            llm_text=llm_text,
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["session_id"], "sess-1")
        self.assertIn("Foundation", body["reply_text"])
        self.assertEqual(body["intent"], "suggest_programs")
        self.assertEqual(
            body["suggested_program_ids"], ["ai-mentor-doer-foundation"]
        )
        self.assertEqual(len(body["suggested_actions"]), 1)
        self.assertEqual(body["suggested_actions"][0]["action_kind"], "url")
        self.assertEqual(body["provider"], "openai")
        self.assertFalse(body["fallback_used"])
        self.assertEqual(body["model"], "gpt-5.4")
        self.assertIsInstance(body["latency_ms"], int)

    def test_chat_turn_falls_back_when_llm_returns_non_json(self):
        app = _make_app()
        plain = "Hi there! Happy to help — what would you like to learn?"
        response = _post_v2(
            app,
            body={
                "session_id": "sess-2",
                "user_message": "hello",
            },
            llm_text=plain,
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        # Plain text becomes the reply, intent defaults to 'answer', no
        # programs / actions are surfaced.
        self.assertEqual(body["reply_text"], plain)
        self.assertEqual(body["intent"], "answer")
        self.assertEqual(body["suggested_program_ids"], [])
        self.assertEqual(body["suggested_actions"], [])

    def test_chat_turn_filters_hallucinated_program_ids(self):
        app = _make_app()
        # The LLM returns an ID NOT in our catalog plus a real one — the
        # handler must drop the hallucinated one and keep the valid one.
        llm_text = (
            '{"reply_text": "Try one of these.", '
            '"intent": "suggest_programs", '
            '"suggested_program_ids": ["fake-program-xyz", '
            '"ai-mentor-doer-foundation", "another-fake"], '
            '"suggested_actions": []}'
        )
        response = _post_v2(
            app,
            body={
                "session_id": "sess-3",
                "user_message": "what do you offer",
            },
            llm_text=llm_text,
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(
            body["suggested_program_ids"], ["ai-mentor-doer-foundation"]
        )

    def test_chat_turn_propagates_fallback_used(self):
        app = _make_app()
        llm_text = (
            '{"reply_text": "Sure thing.", "intent": "answer", '
            '"suggested_program_ids": [], "suggested_actions": []}'
        )
        llm_response = _make_llm_response(
            llm_text,
            provider="taphoaapi",
            model="claude-sonnet-4-6",
            fallback_used=True,
        )
        response = _post_v2(
            app,
            body={
                "session_id": "sess-4",
                "user_message": "tell me more",
            },
            llm_response=llm_response,
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["fallback_used"])
        self.assertEqual(body["provider"], "taphoaapi")
        self.assertEqual(body["model"], "claude-sonnet-4-6")

    def test_chat_turn_rejects_oversized_user_message(self):
        app = _make_app()
        client = TestClient(app)
        response = client.post(
            URL,
            json={
                "session_id": "sess-5",
                "user_message": "x" * 3000,  # > 2000-char limit
            },
        )
        self.assertEqual(response.status_code, 422, response.text)

    def test_chat_turn_strips_markdown_fences(self):
        app = _make_app()
        llm_text = (
            "```json\n"
            '{"reply_text": "Yep.", "intent": "answer", '
            '"suggested_program_ids": [], "suggested_actions": []}\n'
            "```"
        )
        response = _post_v2(
            app,
            body={
                "session_id": "sess-6",
                "user_message": "ok",
            },
            llm_text=llm_text,
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["reply_text"], "Yep.")
        self.assertEqual(body["intent"], "answer")

    def test_chat_turn_returns_502_when_llm_raises(self):
        app = _make_app()
        response = _post_v2(
            app,
            body={
                "session_id": "sess-7",
                "user_message": "hello",
            },
            llm_raises=RuntimeError("provider down"),
        )
        self.assertEqual(response.status_code, 502, response.text)
        body = response.json()
        self.assertEqual(body["detail"]["error"], "llm_failed")

    def test_chat_turn_rate_limited_after_budget(self):
        app = _make_app()
        llm_text = (
            '{"reply_text": "Yes.", "intent": "answer", '
            '"suggested_program_ids": [], "suggested_actions": []}'
        )
        # First 60 calls should succeed, the 61st should 429.
        for i in range(60):
            r = _post_v2(
                app,
                body={
                    "session_id": "sess-burst",
                    "user_message": f"msg {i}",
                },
                llm_text=llm_text,
            )
            self.assertEqual(r.status_code, 200, f"call {i} failed: {r.text}")

        r = _post_v2(
            app,
            body={
                "session_id": "sess-burst",
                "user_message": "one too many",
            },
            llm_text=llm_text,
        )
        self.assertEqual(r.status_code, 429, r.text)
        self.assertIn("Retry-After", r.headers)
        body = r.json()
        self.assertEqual(body["detail"]["error"], "rate_limited")
        self.assertGreaterEqual(body["detail"]["retry_after_seconds"], 1)


class AIMentorChatTurnUnitTestCase(IsolatedAsyncioTestCase):
    """Unit-level coverage for the JSON parser + prompt builder."""

    def setUp(self):
        _reset_module_state()

    def tearDown(self):
        _reset_module_state()

    def test_parse_llm_json_strict(self):
        out = chat_handlers._parse_llm_json('{"a": 1}')
        self.assertEqual(out, {"a": 1})

    def test_parse_llm_json_strips_fences(self):
        out = chat_handlers._parse_llm_json('```json\n{"a": 1}\n```')
        self.assertEqual(out, {"a": 1})

    def test_parse_llm_json_returns_none_on_garbage(self):
        self.assertIsNone(chat_handlers._parse_llm_json("not json at all"))
        self.assertIsNone(chat_handlers._parse_llm_json(""))

    def test_build_system_prompt_lists_programs(self):
        prompt = chat_handlers._build_system_prompt(_DEFAULT_PROGRAMS, "en")
        self.assertIn("ai-mentor-doer-foundation", prompt)
        self.assertIn("AI Doer Foundation", prompt)
        self.assertIn("Reply in English.", prompt)

    def test_build_system_prompt_locale_vi(self):
        prompt = chat_handlers._build_system_prompt(_DEFAULT_PROGRAMS, "vi")
        self.assertIn("Reply in Vietnamese.", prompt)

    def test_build_system_prompt_handles_empty_catalog(self):
        prompt = chat_handlers._build_system_prompt([], "en")
        self.assertIn("(no programs available right now)", prompt)
