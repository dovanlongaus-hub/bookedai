"""Whisper STT adapter — wraps OpenAI Whisper-1 for transcribing user voice.

Used by the Telegram webhook handler when an inbound message has a voice
attachment. Returns the transcript or raises ``WhisperAdapterError`` on
failure (caller falls back to a friendly "I couldn't hear that" reply).

Design notes
------------
* The OpenAI SDK is imported lazily inside :meth:`WhisperAdapter.transcribe`
  so this module imports cleanly in lint / CI environments that do not have
  the ``openai`` package installed.
* No transcript content is ever written to a log record — only metadata
  (provider, model, latency, detected language, duration). Voice notes are
  treated as private user content.
* The 25 MB cap for the audio payload is enforced upstream in the Telegram
  download helper (Whisper API hard limit). This adapter does not re-check
  size — it trusts the caller.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public dataclasses
# ---------------------------------------------------------------------------


@dataclass
class WhisperTranscription:
    """Normalized transcription result from the Whisper endpoint."""

    text: str
    detected_language: str | None
    duration_seconds: float | None
    latency_ms: int


class WhisperAdapterError(RuntimeError):
    """Raised when the Whisper request fails (network, API, or empty result).

    Carries the original cause so callers can log context without inspecting
    the chain themselves.
    """

    def __init__(self, message: str, *, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause


# ---------------------------------------------------------------------------
# Adapter
# ---------------------------------------------------------------------------


class WhisperAdapter:
    """Lightweight wrapper around OpenAI's whisper-1 endpoint.

    Single responsibility: take audio bytes, return text + metadata. Caller
    handles the retrieval (Telegram getFile + download) and downstream
    routing (replacing message.text and re-running the text pipeline).
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str = "whisper-1",
        request_timeout_seconds: float = 30.0,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.request_timeout_seconds = request_timeout_seconds

    @classmethod
    def from_env(cls) -> "WhisperAdapter":
        import os

        return cls(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL"),  # optional override
            model=os.getenv("WHISPER_MODEL", "whisper-1"),
            request_timeout_seconds=float(
                os.getenv("WHISPER_REQUEST_TIMEOUT_SECONDS", "30")
            ),
        )

    async def transcribe(
        self,
        audio_bytes: bytes,
        *,
        filename: str = "voice.ogg",
        language_hint: str | None = None,  # 'en' | 'vi' | None
    ) -> WhisperTranscription:
        """Send ``audio_bytes`` to Whisper and return the transcription.

        Raises :class:`WhisperAdapterError` on any failure — network, SDK,
        timeout, missing key, or empty response. The caller is responsible
        for replying with a localized "couldn't hear that" string.
        """

        if not self.api_key:
            raise WhisperAdapterError(
                "Whisper requires OPENAI_API_KEY to be configured."
            )
        if not audio_bytes:
            raise WhisperAdapterError("Whisper received empty audio payload.")

        client = _build_async_openai_client(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=self.request_timeout_seconds,
        )

        from io import BytesIO  # local import keeps top of module lean

        file_tuple = (filename, BytesIO(audio_bytes), "audio/ogg")

        kwargs: dict[str, object] = {
            "model": self.model,
            "file": file_tuple,
            "response_format": "verbose_json",
        }
        if language_hint:
            kwargs["language"] = language_hint

        started = time.perf_counter()
        try:
            result = await client.audio.transcriptions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 — translate every SDK / net error
            latency_ms = int((time.perf_counter() - started) * 1000)
            logger.warning(
                "whisper_adapter.request_failed",
                extra={
                    "provider": "openai_whisper",
                    "model": self.model,
                    "latency_ms": latency_ms,
                    "error_type": type(exc).__name__,
                },
            )
            raise WhisperAdapterError(
                f"Whisper request failed: {type(exc).__name__}",
                cause=exc,
            ) from exc

        latency_ms = int((time.perf_counter() - started) * 1000)

        text = (getattr(result, "text", None) or "").strip()
        detected_language = getattr(result, "language", None)
        duration_seconds = getattr(result, "duration", None)
        if isinstance(duration_seconds, (int, float)):
            duration_seconds = float(duration_seconds)
        else:
            duration_seconds = None

        # Privacy: log metadata only — never the transcript itself.
        logger.info(
            "whisper_adapter.completion",
            extra={
                "provider": "openai_whisper",
                "model": self.model,
                "latency_ms": latency_ms,
                "duration_seconds": duration_seconds,
                "detected_language": detected_language,
                "text_length": len(text),
                "language_hint": language_hint,
            },
        )

        if not text:
            raise WhisperAdapterError("Whisper returned an empty transcript.")

        return WhisperTranscription(
            text=text,
            detected_language=detected_language if isinstance(detected_language, str) else None,
            duration_seconds=duration_seconds,
            latency_ms=latency_ms,
        )


# ---------------------------------------------------------------------------
# Internal helpers — kept module-level so tests can patch them precisely.
# ---------------------------------------------------------------------------


def _build_async_openai_client(
    *, api_key: str, base_url: str | None, timeout: float
):
    """Construct an ``openai.AsyncOpenAI`` client.

    Imported lazily so the module imports without the ``openai`` SDK
    installed. Tests patch this function to return an ``AsyncMock``.
    """

    from openai import AsyncOpenAI  # noqa: WPS433 — intentional lazy import

    if base_url:
        return AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout)
    return AsyncOpenAI(api_key=api_key, timeout=timeout)


__all__ = [
    "WhisperAdapter",
    "WhisperAdapterError",
    "WhisperTranscription",
]
