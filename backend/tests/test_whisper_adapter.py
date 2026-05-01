"""Tests for the Whisper STT adapter.

The real ``openai`` SDK is not required to run these — every test patches
the module-level ``_build_async_openai_client`` factory so the adapter
never makes a network call. Mirrors the pattern used in
``test_llm_router.py``.
"""

from __future__ import annotations

import asyncio
import logging
import sys
import types
from pathlib import Path
from unittest.mock import AsyncMock, patch


# Ensure ``backend/`` is importable when pytest runs from the repo root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# Stub ``openai`` SDK if not installed. Whisper adapter only references the
# SDK lazily inside ``_build_async_openai_client`` (which we patch), but we
# need ``openai.APIError`` to be importable for the failure-path test.
# ---------------------------------------------------------------------------

if "openai" not in sys.modules:
    stub = types.ModuleType("openai")

    class _StubBase(Exception):
        pass

    class APIError(_StubBase):
        pass

    class APITimeoutError(_StubBase):
        pass

    class AsyncOpenAI:  # noqa: D401
        def __init__(self, *args, **kwargs) -> None:
            raise RuntimeError(
                "stub AsyncOpenAI should never be constructed — patch "
                "_build_async_openai_client in your test."
            )

    stub.APIError = APIError
    stub.APITimeoutError = APITimeoutError
    stub.AsyncOpenAI = AsyncOpenAI
    sys.modules["openai"] = stub


import openai  # noqa: E402

from integrations.ai_models import whisper_adapter as whisper_module  # noqa: E402
from integrations.ai_models.whisper_adapter import (  # noqa: E402
    WhisperAdapter,
    WhisperAdapterError,
    WhisperTranscription,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _adapter() -> WhisperAdapter:
    return WhisperAdapter(
        api_key="sk-test",
        base_url=None,
        model="whisper-1",
        request_timeout_seconds=5.0,
    )


def _make_client(*, return_value=None, side_effect=None):
    """Build a fake AsyncOpenAI client whose
    ``audio.transcriptions.create`` returns / raises the given value."""

    create_mock = AsyncMock(
        return_value=return_value,
        side_effect=side_effect,
    )
    transcriptions_ns = types.SimpleNamespace(create=create_mock)
    audio_ns = types.SimpleNamespace(transcriptions=transcriptions_ns)
    client = types.SimpleNamespace(audio=audio_ns)
    return client, create_mock


def _patch_factory(client):
    return patch.object(
        whisper_module,
        "_build_async_openai_client",
        return_value=client,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_transcribe_success() -> None:
    """Happy-path: returns text + metadata, calls SDK once."""

    fake_result = types.SimpleNamespace(
        text="hello world",
        language="en",
        duration=2.3,
    )
    client, create_mock = _make_client(return_value=fake_result)

    with _patch_factory(client):
        transcription = asyncio.run(
            _adapter().transcribe(b"fake-audio-bytes", language_hint="en")
        )

    assert isinstance(transcription, WhisperTranscription)
    assert transcription.text == "hello world"
    assert transcription.detected_language == "en"
    assert transcription.duration_seconds == 2.3
    assert transcription.latency_ms >= 0
    create_mock.assert_awaited_once()
    call_kwargs = create_mock.await_args.kwargs
    assert call_kwargs["model"] == "whisper-1"
    assert call_kwargs["language"] == "en"
    assert call_kwargs["response_format"] == "verbose_json"
    # ``file`` is the (filename, BytesIO, mime) tuple per the SDK shape.
    file_tuple = call_kwargs["file"]
    assert file_tuple[0] == "voice.ogg"
    assert file_tuple[2] == "audio/ogg"


def test_transcribe_raises_on_api_error() -> None:
    """SDK error → translated to ``WhisperAdapterError`` (carries cause)."""

    raised = openai.APIError("simulated whisper failure")
    client, create_mock = _make_client(side_effect=raised)

    with _patch_factory(client):
        try:
            asyncio.run(_adapter().transcribe(b"fake-audio-bytes"))
        except WhisperAdapterError as exc:
            assert exc.cause is raised
            assert "APIError" in str(exc) or "request failed" in str(exc).lower()
        else:
            raise AssertionError("Expected WhisperAdapterError to be raised")
    create_mock.assert_awaited_once()


def test_transcribe_logs_no_text_content(caplog) -> None:
    """Privacy guardrail: transcript text MUST NOT appear in any log
    record's message, args, or extras."""

    secret_text = "very-private-customer-utterance-12345"
    fake_result = types.SimpleNamespace(
        text=secret_text,
        language="vi",
        duration=4.1,
    )
    client, _ = _make_client(return_value=fake_result)

    with caplog.at_level(logging.DEBUG, logger=whisper_module.logger.name):
        with _patch_factory(client):
            transcription = asyncio.run(_adapter().transcribe(b"audio"))

    assert transcription.text == secret_text  # sanity — adapter still returns it
    for record in caplog.records:
        rendered_message = record.getMessage()
        assert secret_text not in rendered_message, (
            f"transcript leaked into log message: {rendered_message!r}"
        )
        for value in record.__dict__.values():
            if isinstance(value, str):
                assert secret_text not in value
            elif isinstance(value, dict):
                for nested in value.values():
                    if isinstance(nested, str):
                        assert secret_text not in nested


def test_transcribe_raises_when_api_key_missing() -> None:
    """Defensive: empty / missing API key fails loudly before any SDK call."""

    keyless = WhisperAdapter(api_key=None, model="whisper-1")
    try:
        asyncio.run(keyless.transcribe(b"audio"))
    except WhisperAdapterError as exc:
        assert "OPENAI_API_KEY" in str(exc)
    else:
        raise AssertionError("Expected WhisperAdapterError for missing key")


def test_transcribe_raises_on_empty_transcript() -> None:
    """Whisper sometimes returns an empty string for unintelligible audio.
    Caller wants an error so it can fall back to the localized "couldn't
    hear that" copy rather than echo an empty bubble."""

    fake_result = types.SimpleNamespace(text="", language=None, duration=0.5)
    client, _ = _make_client(return_value=fake_result)

    with _patch_factory(client):
        try:
            asyncio.run(_adapter().transcribe(b"audio"))
        except WhisperAdapterError as exc:
            assert "empty transcript" in str(exc)
        else:
            raise AssertionError("Expected WhisperAdapterError for empty result")
