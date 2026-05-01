"""Download a Telegram voice (or audio) file to bytes for STT processing.

Telegram does not return file bytes inline on inbound updates — the webhook
payload only carries a ``file_id``. To obtain the bytes we make two HTTPS
calls:

1. ``GET https://api.telegram.org/bot<token>/getFile?file_id=<id>`` →
   returns ``result.file_path`` (a relative path inside Telegram's file CDN).
2. ``GET https://api.telegram.org/file/bot<token>/<file_path>`` → returns
   the raw bytes (typically ``audio/ogg`` for voice notes).

A 25 MB hard cap is enforced (Whisper-1 API rejects larger uploads).
"""

from __future__ import annotations

import logging

import httpx


logger = logging.getLogger(__name__)


# Whisper API hard limit. Telegram voice notes are normally a few hundred KB
# at most, but ``audio`` and ``document`` uploads can be much larger — guard
# the caller before we even start downloading.
MAX_VOICE_BYTES = 25 * 1024 * 1024  # 25 MB
DEFAULT_TIMEOUT_SECONDS = 30.0


class TelegramVoiceDownloadError(RuntimeError):
    """Raised when the Telegram CDN refuses or the payload is too large."""

    def __init__(self, message: str, *, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause


async def download_telegram_voice(
    token: str,
    file_id: str,
    *,
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    max_bytes: int = MAX_VOICE_BYTES,
) -> bytes:
    """Resolve ``file_id`` then GET the audio bytes.

    Raises :class:`TelegramVoiceDownloadError` on any HTTP failure or when
    the resolved file exceeds ``max_bytes``. Never logs ``token`` (treated
    as a secret).
    """

    if not token:
        raise TelegramVoiceDownloadError("Telegram bot token is not configured.")
    if not file_id:
        raise TelegramVoiceDownloadError("file_id is required to download a voice note.")

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        # Step 1 — getFile resolves the relative path.
        try:
            meta_response = await client.get(
                f"https://api.telegram.org/bot{token}/getFile",
                params={"file_id": file_id},
            )
            meta_response.raise_for_status()
        except httpx.HTTPError as exc:
            raise TelegramVoiceDownloadError(
                f"Telegram getFile failed: {type(exc).__name__}",
                cause=exc,
            ) from exc

        meta_payload = meta_response.json() if meta_response.content else {}
        if not isinstance(meta_payload, dict) or not meta_payload.get("ok"):
            raise TelegramVoiceDownloadError(
                "Telegram getFile returned a non-ok response."
            )
        result = meta_payload.get("result")
        if not isinstance(result, dict):
            raise TelegramVoiceDownloadError(
                "Telegram getFile result was missing or malformed."
            )
        file_path = str(result.get("file_path") or "").strip()
        if not file_path:
            raise TelegramVoiceDownloadError(
                "Telegram getFile did not return a file_path."
            )
        file_size = result.get("file_size")
        if isinstance(file_size, int) and file_size > max_bytes:
            raise TelegramVoiceDownloadError(
                f"Voice file is {file_size} bytes; exceeds {max_bytes} limit."
            )

        # Step 2 — actual download.
        try:
            file_response = await client.get(
                f"https://api.telegram.org/file/bot{token}/{file_path}"
            )
            file_response.raise_for_status()
        except httpx.HTTPError as exc:
            raise TelegramVoiceDownloadError(
                f"Telegram file download failed: {type(exc).__name__}",
                cause=exc,
            ) from exc

        audio_bytes = file_response.content or b""
        if len(audio_bytes) > max_bytes:
            raise TelegramVoiceDownloadError(
                f"Downloaded voice file is {len(audio_bytes)} bytes; exceeds {max_bytes} limit."
            )

        logger.info(
            "telegram_voice_download.completed",
            extra={
                "provider": "telegram_bot",
                "byte_count": len(audio_bytes),
                "had_size_hint": isinstance(file_size, int),
            },
        )
        return audio_bytes


__all__ = [
    "MAX_VOICE_BYTES",
    "TelegramVoiceDownloadError",
    "download_telegram_voice",
]
