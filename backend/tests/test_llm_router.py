"""Tests for the LLM router used by AIMentor.

The real ``openai`` SDK is not required to run these — every test patches the
module-level ``_build_async_openai_client`` factory so the router never makes
a network call. We use ``asyncio.run`` to drive the coroutine, matching the
project-wide pattern (no ``pytest-asyncio`` configured at the time of writing).
"""

from __future__ import annotations

import asyncio
import logging
import sys
import types
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

# Ensure ``backend/`` is importable when running pytest from the repo root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# Stub ``openai`` SDK for the duration of these tests if it is not installed.
# The router only references ``openai`` lazily (inside helpers), and we patch
# those helpers — but the transient-error tuple is resolved at import time, so
# we install a stub with the four error classes so the tuple is non-empty.
# ---------------------------------------------------------------------------

if "openai" not in sys.modules:
    stub = types.ModuleType("openai")

    class _StubBase(Exception):
        pass

    class RateLimitError(_StubBase):
        pass

    class InternalServerError(_StubBase):
        pass

    class APIConnectionError(_StubBase):
        pass

    class APITimeoutError(_StubBase):
        pass

    class AsyncOpenAI:  # noqa: D401 — placeholder, never instantiated in tests
        def __init__(self, *args, **kwargs) -> None:
            raise RuntimeError(
                "stub AsyncOpenAI should never be constructed — patch "
                "_build_async_openai_client in your test."
            )

    stub.RateLimitError = RateLimitError
    stub.InternalServerError = InternalServerError
    stub.APIConnectionError = APIConnectionError
    stub.APITimeoutError = APITimeoutError
    stub.AsyncOpenAI = AsyncOpenAI
    sys.modules["openai"] = stub


import openai  # noqa: E402  — resolves to either real SDK or stub above

from integrations.ai_models import llm_router as llm_router_module  # noqa: E402
from integrations.ai_models.llm_router import (  # noqa: E402
    LLMMessage,
    LLMRouter,
    LLMRouterConfig,
    LLMRouterError,
)

# Make sure the transient error tuple is populated even if it was resolved to
# () earlier (e.g. when this test module is imported under a freshly cleared
# environment). We rebind it on the module so the router uses our stub
# classes during ``except`` matching.
llm_router_module._OPENAI_TRANSIENT_ERRORS = (
    openai.RateLimitError,
    openai.InternalServerError,
    openai.APIConnectionError,
    openai.APITimeoutError,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _config(*, openai_key: str | None = "sk-test", taphoa_key: str | None = "tp-test") -> LLMRouterConfig:
    return LLMRouterConfig(
        openai_api_key=openai_key,
        openai_model="gpt-5.4",
        openai_base_url="https://api.openai.com/v1",
        taphoaapi_api_key=taphoa_key,
        taphoaapi_model="claude-sonnet-4-6",
        taphoaapi_base_url="https://api.taphoammo.net/v1",
        request_timeout_seconds=5.0,
    )


def _completion(text: str, *, finish_reason: str = "stop") -> dict:
    """Build a dict-shaped chat completion (the extractor accepts dicts)."""

    return {
        "choices": [
            {
                "message": {"role": "assistant", "content": text},
                "finish_reason": finish_reason,
            }
        ],
        "usage": {"prompt_tokens": 12, "completion_tokens": 7, "total_tokens": 19},
    }


def _make_client(completion_payload):
    """Construct a fake AsyncOpenAI client whose chat.completions.create
    returns ``completion_payload`` (or raises if it's an ``Exception``)."""

    client = types.SimpleNamespace()
    client.chat = types.SimpleNamespace()

    if isinstance(completion_payload, BaseException):
        client.chat.completions = types.SimpleNamespace(
            create=AsyncMock(side_effect=completion_payload)
        )
    else:
        client.chat.completions = types.SimpleNamespace(
            create=AsyncMock(return_value=completion_payload)
        )

    return client


def _patch_clients(openai_payload, taphoa_payload):
    """Patch ``_build_async_openai_client`` so the first call returns an
    OpenAI-shaped client and the second returns a taphoaapi-shaped client."""

    openai_client = _make_client(openai_payload)
    taphoa_client = _make_client(taphoa_payload)

    def _factory(*, api_key, base_url, timeout):  # noqa: ARG001
        if "taphoa" in base_url:
            return taphoa_client
        return openai_client

    return patch.object(
        llm_router_module,
        "_build_async_openai_client",
        side_effect=_factory,
    ), openai_client, taphoa_client


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_complete_uses_openai_when_primary_succeeds() -> None:
    router = LLMRouter(_config())
    patch_ctx, openai_client, taphoa_client = _patch_clients(
        _completion("Hello from OpenAI"),
        _completion("should not be reached"),
    )

    with patch_ctx:
        response = asyncio.run(
            router.complete(
                [
                    LLMMessage(role="system", content="You are a helpful tutor."),
                    LLMMessage(role="user", content="Hi"),
                ],
                purpose="unit-test",
            )
        )

    assert response.text == "Hello from OpenAI"
    assert response.provider == "openai"
    assert response.model == "gpt-5.4"
    assert response.finish_reason == "stop"
    assert response.usage == {"prompt_tokens": 12, "completion_tokens": 7, "total_tokens": 19}
    assert response.fallback_used is False
    openai_client.chat.completions.create.assert_awaited_once()
    taphoa_client.chat.completions.create.assert_not_awaited()


def test_falls_back_to_taphoaapi_on_openai_rate_limit() -> None:
    router = LLMRouter(_config())
    patch_ctx, openai_client, taphoa_client = _patch_clients(
        openai.RateLimitError("429 from OpenAI"),
        _completion("Hello from Claude via taphoaapi"),
    )

    with patch_ctx:
        response = asyncio.run(
            router.complete(
                [LLMMessage(role="user", content="ping")],
                purpose="unit-test",
            )
        )

    assert response.text == "Hello from Claude via taphoaapi"
    assert response.provider == "taphoaapi"
    assert response.model == "claude-sonnet-4-6"
    assert response.fallback_used is True
    openai_client.chat.completions.create.assert_awaited_once()
    taphoa_client.chat.completions.create.assert_awaited_once()


def test_falls_back_to_taphoaapi_on_empty_openai_completion() -> None:
    router = LLMRouter(_config())
    patch_ctx, openai_client, taphoa_client = _patch_clients(
        _completion(""),  # empty content
        _completion("Recovered via fallback"),
    )

    with patch_ctx:
        response = asyncio.run(
            router.complete(
                [LLMMessage(role="user", content="hello")],
                purpose="unit-test",
            )
        )

    assert response.text == "Recovered via fallback"
    assert response.provider == "taphoaapi"
    assert response.fallback_used is True
    openai_client.chat.completions.create.assert_awaited_once()
    taphoa_client.chat.completions.create.assert_awaited_once()


def test_raises_when_both_providers_unavailable() -> None:
    router = LLMRouter(_config(openai_key=None, taphoa_key=None))

    with pytest.raises(LLMRouterError) as excinfo:
        asyncio.run(
            router.complete(
                [LLMMessage(role="user", content="hi")],
                purpose="unit-test",
            )
        )

    assert excinfo.value.last_provider is None
    assert "No LLM provider is configured" in str(excinfo.value)


def test_logs_no_message_content(caplog: pytest.LogCaptureFixture) -> None:
    sensitive = "user-secret-payload-do-not-leak-12345"
    router = LLMRouter(_config())
    patch_ctx, _openai_client, _taphoa_client = _patch_clients(
        _completion("Bland response"),
        _completion("never reached"),
    )

    caplog.set_level(logging.DEBUG, logger="integrations.ai_models.llm_router")
    with patch_ctx:
        asyncio.run(
            router.complete(
                [
                    LLMMessage(role="system", content=sensitive),
                    LLMMessage(role="user", content=sensitive),
                ],
                purpose="unit-test",
            )
        )

    for record in caplog.records:
        # The log line itself must not embed message content.
        assert sensitive not in record.getMessage()
        # Nor any of the structured ``extra`` payload values.
        for value in record.__dict__.values():
            assert sensitive not in repr(value)
