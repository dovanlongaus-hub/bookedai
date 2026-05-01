"""Tests for the Piper TTS adapter.

Patches ``httpx.AsyncClient.post`` so no real HTTP calls happen. Mirrors
the lightweight unit-test style used elsewhere in ``backend/tests``.
"""

from __future__ import annotations

import asyncio
import sys
import types
from pathlib import Path
from unittest.mock import AsyncMock, patch


# Ensure ``backend/`` is importable when pytest runs from the repo root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import httpx  # noqa: E402

from integrations.piper.piper_adapter import (  # noqa: E402
    PiperAdapter,
    PiperAdapterError,
    PiperSynthesis,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _adapter() -> PiperAdapter:
    return PiperAdapter(
        base_url="http://piper-tts:5000",
        voice="en_US-ryan-medium",
        request_timeout_seconds=5.0,
    )


def _fake_response(
    *,
    status_code: int = 200,
    content: bytes = b"",
    content_type: str = "audio/wav",
) -> httpx.Response:
    """Build a real ``httpx.Response`` so ``raise_for_status()`` behaves
    naturally. Using the public httpx Response constructor keeps the
    test honest — we don't fake the API surface."""

    return httpx.Response(
        status_code=status_code,
        headers={"content-type": content_type},
        content=content,
        request=httpx.Request("POST", "http://piper-tts:5000/api/tts"),
    )


def _patch_post(*, return_value=None, side_effect=None):
    """Patch ``httpx.AsyncClient.post`` for a single test."""

    return patch.object(
        httpx.AsyncClient,
        "post",
        new=AsyncMock(return_value=return_value, side_effect=side_effect),
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_synthesize_returns_audio_bytes() -> None:
    """Happy-path: 200 + audio bytes → PiperSynthesis with same payload."""

    response = _fake_response(
        status_code=200,
        content=b"RIFF\x00\x00\x00\x00WAVEfmt fake-audio",
        content_type="audio/wav",
    )

    with _patch_post(return_value=response):
        synthesis = asyncio.run(_adapter().synthesize("hello world"))

    assert isinstance(synthesis, PiperSynthesis)
    assert synthesis.audio_bytes == b"RIFF\x00\x00\x00\x00WAVEfmt fake-audio"
    assert synthesis.audio_format == "audio/wav"
    assert synthesis.voice == "en_US-ryan-medium"
    assert synthesis.latency_ms >= 0


def test_synthesize_raises_on_http_error() -> None:
    """500 response → ``PiperAdapterError``."""

    response = _fake_response(status_code=500, content=b"boom")

    with _patch_post(return_value=response):
        try:
            asyncio.run(_adapter().synthesize("hello"))
        except PiperAdapterError as exc:
            assert "http_error" in str(exc)
        else:
            raise AssertionError("Expected PiperAdapterError on 500 response")


def test_synthesize_raises_on_empty_response() -> None:
    """200 but empty body → ``PiperAdapterError('empty_response')``."""

    response = _fake_response(status_code=200, content=b"")

    with _patch_post(return_value=response):
        try:
            asyncio.run(_adapter().synthesize("hello"))
        except PiperAdapterError as exc:
            assert "empty_response" in str(exc)
        else:
            raise AssertionError("Expected PiperAdapterError on empty body")


def test_synthesize_raises_on_empty_text() -> None:
    """Empty / whitespace-only input fails fast without an HTTP call."""

    post_mock = AsyncMock()
    with patch.object(httpx.AsyncClient, "post", new=post_mock):
        for blank in ("", "   ", "\n\t"):
            try:
                asyncio.run(_adapter().synthesize(blank))
            except PiperAdapterError as exc:
                assert "empty_text" in str(exc)
            else:
                raise AssertionError(
                    f"Expected PiperAdapterError for blank input {blank!r}"
                )

    post_mock.assert_not_awaited()


def test_from_env_reads_env_vars(monkeypatch) -> None:
    """``from_env`` reads PIPER_TTS_URL / PIPER_VOICE / timeout from env."""

    monkeypatch.setenv("PIPER_TTS_URL", "http://custom-piper:6000/")
    monkeypatch.setenv("PIPER_VOICE", "en_US-amy-medium")
    monkeypatch.setenv("PIPER_REQUEST_TIMEOUT_SECONDS", "42")

    adapter = PiperAdapter.from_env()

    assert adapter.base_url == "http://custom-piper:6000"  # trailing / stripped
    assert adapter.voice == "en_US-amy-medium"
    assert adapter.request_timeout_seconds == 42.0
