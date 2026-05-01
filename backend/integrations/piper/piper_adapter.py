"""Piper TTS adapter — wraps a self-hosted Piper HTTP service.

Used by the bot voice-out path. Returns audio bytes (OGG/WAV depending
on Piper version) which the caller uploads to Telegram via sendVoice.

Required environment variables (set in docker-compose / deployment):
    PIPER_TTS_URL                 default ``http://piper-tts:5000``
    PIPER_VOICE                   default ``en_US-ryan-medium``
    PIPER_REQUEST_TIMEOUT_SECONDS default ``15``
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)


@dataclass
class PiperSynthesis:
    audio_bytes: bytes
    audio_format: str         # 'audio/ogg' | 'audio/wav'
    voice: str
    latency_ms: int


class PiperAdapterError(RuntimeError):
    pass


class PiperAdapter:
    """Lightweight HTTP wrapper around a self-hosted Piper TTS server."""

    def __init__(
        self,
        *,
        base_url: str = "http://piper-tts:5000",
        voice: str = "en_US-ryan-medium",
        request_timeout_seconds: float = 15.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.voice = voice
        self.request_timeout_seconds = request_timeout_seconds

    @classmethod
    def from_env(cls) -> "PiperAdapter":
        import os
        return cls(
            base_url=os.getenv("PIPER_TTS_URL", "http://piper-tts:5000"),
            voice=os.getenv("PIPER_VOICE", "en_US-ryan-medium"),
            request_timeout_seconds=float(os.getenv("PIPER_REQUEST_TIMEOUT_SECONDS", "15")),
        )

    async def synthesize(self, text: str, *, voice: str | None = None) -> PiperSynthesis:
        """Submit text → Piper → audio bytes. Raises PiperAdapterError on failure."""
        if not text or not text.strip():
            raise PiperAdapterError("empty_text")
        target_voice = voice or self.voice
        started = time.time()
        try:
            async with httpx.AsyncClient(timeout=self.request_timeout_seconds) as client:
                response = await client.post(
                    f"{self.base_url}/api/tts",
                    json={"text": text.strip(), "voice": target_voice},
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning(
                "piper_synthesize_http_failed",
                extra={"voice": target_voice, "error": str(exc)},
            )
            raise PiperAdapterError(f"http_error: {exc}") from exc

        audio_bytes = response.content
        if not audio_bytes:
            raise PiperAdapterError("empty_response")
        content_type = response.headers.get("content-type", "audio/wav")
        latency_ms = int((time.time() - started) * 1000)
        logger.info(
            "piper_synthesize_ok",
            extra={
                "voice": target_voice,
                "latency_ms": latency_ms,
                "audio_bytes": len(audio_bytes),
                "content_type": content_type,
            },
        )
        return PiperSynthesis(
            audio_bytes=audio_bytes,
            audio_format=content_type,
            voice=target_voice,
            latency_ms=latency_ms,
        )
