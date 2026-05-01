"""Tests for ``MessagingAutomationService._maybe_synthesize_voice_reply``.

Covers the feature-flag gate, channel/voice-detection guards, the
happy path (Piper synthesizes, audio metadata returned), and the
silent-failure path (Piper raises -> warning logged, None returned).
The route-handler integration test is intentionally NOT covered here:
the existing ``test_telegram_voice_handling.py`` is the place for that
once the wiring is exercised end-to-end with an actual webhook fixture.
"""

from __future__ import annotations

import importlib
import logging
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _reload_service_module(monkeypatch: pytest.MonkeyPatch, *, enable: bool):
    """Reload messaging_automation_service so ENABLE_BOT_VOICE_OUT picks up
    the patched env at module-import time. The flag is captured at module
    load, so a simple monkeypatch isn't enough."""

    monkeypatch.setenv("ENABLE_BOT_VOICE_OUT", "true" if enable else "false")
    if "service_layer.messaging_automation_service" in sys.modules:
        return importlib.reload(sys.modules["service_layer.messaging_automation_service"])
    return importlib.import_module("service_layer.messaging_automation_service")


@pytest.mark.asyncio
async def test_maybe_synthesize_returns_none_when_flag_off(monkeypatch: pytest.MonkeyPatch) -> None:
    module = _reload_service_module(monkeypatch, enable=False)
    service = module.MessagingAutomationService()

    result = await service._maybe_synthesize_voice_reply(
        reply_text="Hello there",
        channel="telegram",
        user_spoke=True,
    )

    assert result is None


@pytest.mark.asyncio
async def test_maybe_synthesize_returns_none_when_user_typed(monkeypatch: pytest.MonkeyPatch) -> None:
    module = _reload_service_module(monkeypatch, enable=True)
    service = module.MessagingAutomationService()

    result = await service._maybe_synthesize_voice_reply(
        reply_text="Hello there",
        channel="telegram",
        user_spoke=False,
    )

    assert result is None


@pytest.mark.asyncio
async def test_maybe_synthesize_returns_none_for_non_telegram(monkeypatch: pytest.MonkeyPatch) -> None:
    module = _reload_service_module(monkeypatch, enable=True)
    service = module.MessagingAutomationService()

    result = await service._maybe_synthesize_voice_reply(
        reply_text="Hello there",
        channel="whatsapp",
        user_spoke=True,
    )

    assert result is None


@pytest.mark.asyncio
async def test_maybe_synthesize_returns_audio_when_enabled_and_user_spoke(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    module = _reload_service_module(monkeypatch, enable=True)
    service = module.MessagingAutomationService()

    fake_synthesis = SimpleNamespace(
        audio_bytes=b"OggS-fake-audio",
        audio_format="audio/ogg",
        voice="en_US-ryan-medium",
        latency_ms=123,
    )

    fake_adapter = SimpleNamespace(synthesize=AsyncMock(return_value=fake_synthesis))

    with patch(
        "integrations.piper.piper_adapter.PiperAdapter.from_env",
        return_value=fake_adapter,
    ):
        result = await service._maybe_synthesize_voice_reply(
            reply_text="Booking confirmed.",
            channel="telegram",
            user_spoke=True,
        )

    assert result is not None
    assert result["audio_bytes"] == b"OggS-fake-audio"
    assert result["audio_format"] == "audio/ogg"
    assert result["voice"] == "en_US-ryan-medium"
    assert result["latency_ms"] == 123
    fake_adapter.synthesize.assert_awaited_once_with("Booking confirmed.")


@pytest.mark.asyncio
async def test_maybe_synthesize_falls_back_silently_on_piper_error(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    module = _reload_service_module(monkeypatch, enable=True)
    service = module.MessagingAutomationService()

    from integrations.piper.piper_adapter import PiperAdapterError

    fake_adapter = SimpleNamespace(
        synthesize=AsyncMock(side_effect=PiperAdapterError("http_error: boom")),
    )

    with caplog.at_level(logging.WARNING, logger="service_layer.messaging_automation_service"):
        with patch(
            "integrations.piper.piper_adapter.PiperAdapter.from_env",
            return_value=fake_adapter,
        ):
            result = await service._maybe_synthesize_voice_reply(
                reply_text="Booking confirmed.",
                channel="telegram",
                user_spoke=True,
            )

    assert result is None
    assert any("bot_voice_out_failed" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_maybe_synthesize_returns_none_for_overlong_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Text >800 chars should be skipped — voice replies that long are
    awkward, so let the text reply path handle them."""

    module = _reload_service_module(monkeypatch, enable=True)
    service = module.MessagingAutomationService()

    long_text = "a" * 801
    result = await service._maybe_synthesize_voice_reply(
        reply_text=long_text,
        channel="telegram",
        user_spoke=True,
    )

    assert result is None
