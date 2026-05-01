"""Telegram sendVoice helper — uploads OGG audio bytes as a voice message.

Telegram requires OGG/Opus codec for true voice messages (the round
waveform UI). WAV files are sent as audio attachments instead.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


async def send_telegram_voice(
    *,
    token: str,
    chat_id: str | int,
    audio_bytes: bytes,
    audio_format: str = "audio/ogg",  # 'audio/ogg' or 'audio/wav'
    caption: Optional[str] = None,
    duration_seconds: Optional[int] = None,
    request_timeout_seconds: float = 30.0,
) -> dict:
    """POST audio bytes to https://api.telegram.org/bot{token}/sendVoice.

    Returns the parsed Telegram API response. Raises httpx.HTTPError on failure.
    """
    if not audio_bytes:
        raise ValueError("audio_bytes is empty")
    if not chat_id:
        raise ValueError("chat_id is empty")
    if not token:
        raise ValueError("token is empty")

    # Telegram sendVoice expects OGG/OPUS for the voice-message UI; WAV would
    # land as a plain audio attachment. Choose the right multipart filename.
    is_ogg = audio_format.lower() in ("audio/ogg", "audio/ogg; codecs=opus")
    filename = "reply.ogg" if is_ogg else "reply.wav"

    files = {"voice": (filename, audio_bytes, audio_format if is_ogg else "audio/wav")}
    data: dict = {"chat_id": str(chat_id)}
    if caption:
        data["caption"] = caption[:1024]  # Telegram caption limit
    if duration_seconds is not None:
        data["duration"] = str(int(duration_seconds))

    url = f"https://api.telegram.org/bot{token}/sendVoice"
    async with httpx.AsyncClient(timeout=request_timeout_seconds) as client:
        response = await client.post(url, data=data, files=files)
        response.raise_for_status()
        return response.json()
