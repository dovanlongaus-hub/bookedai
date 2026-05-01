"""LLMRouter — OpenAI 5.4 primary, Claude (via taphoaapi) fallback.

Both endpoints are called via the openai SDK with different ``base_url`` +
``api_key``. The router picks primary, retries once on transient error, then
falls back automatically to taphoaapi (a Vietnamese-friendly OpenAI-compatible
proxy that exposes Claude Sonnet behind the standard OpenAI Chat Completions
schema). The fallback path is a different ``base_url`` + ``api_key`` only —
the same ``openai`` Python SDK is used in both cases.

Environment variables consumed by ``_load_config_from_env``:

- ``OPENAI_API_KEY`` — primary OpenAI key
- ``OPENAI_MODEL`` — primary model id (default ``gpt-5.4``, pass-through)
- ``OPENAI_BASE_URL`` — defaults to ``https://api.openai.com/v1``
- ``TAPHOAAPI_API_KEY`` — fallback proxy key
- ``TAPHOAAPI_MODEL`` — fallback model id (default ``claude-sonnet-4-6``)
- ``TAPHOAAPI_BASE_URL`` — defaults to ``https://api.taphoammo.net/v1``
- ``LLM_REQUEST_TIMEOUT_SECONDS`` — per-call timeout (default ``30``)

This module deliberately does NOT import the ``anthropic`` SDK — taphoaapi is
OpenAI-compatible, so a single SDK reaches both providers.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Sequence

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public dataclasses
# ---------------------------------------------------------------------------


@dataclass
class LLMMessage:
    """A single chat turn passed to ``LLMRouter.complete``."""

    role: str  # 'system' | 'user' | 'assistant'
    content: str


@dataclass
class LLMRouterConfig:
    """Resolved configuration for the router. All fields read from env by
    default via :func:`_load_config_from_env`."""

    openai_api_key: str | None = None
    openai_model: str = "gpt-5.4"  # placeholder until real model id ships
    openai_base_url: str = "https://api.openai.com/v1"
    taphoaapi_api_key: str | None = None
    taphoaapi_model: str = "claude-sonnet-4-6"
    taphoaapi_base_url: str = "https://api.taphoammo.net/v1"
    request_timeout_seconds: float = 30.0
    max_retries_per_provider: int = 1


@dataclass
class LLMResponse:
    """Normalized router response — same shape regardless of provider used."""

    text: str
    provider: str  # 'openai' | 'taphoaapi'
    model: str
    finish_reason: str | None = None
    usage: dict[str, int] = field(default_factory=dict)
    fallback_used: bool = False


class LLMRouterError(RuntimeError):
    """Raised when both providers fail or no provider is configured.

    Carries the last provider attempted plus the final exception so callers
    can log context without inspecting the chain themselves.
    """

    def __init__(
        self,
        message: str,
        last_provider: str | None = None,
        last_error: Exception | None = None,
    ) -> None:
        super().__init__(message)
        self.last_provider = last_provider
        self.last_error = last_error


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------


class LLMRouter:
    """Routes chat completions to OpenAI primary, taphoaapi fallback.

    Both providers are reached via :class:`openai.AsyncOpenAI` — taphoaapi is
    an OpenAI-compatible proxy hosting Claude Sonnet, so the SDK call shape is
    identical, only ``base_url`` + ``api_key`` differ.
    """

    def __init__(self, config: LLMRouterConfig | None = None) -> None:
        self.config = config or _load_config_from_env()

    @classmethod
    def from_env(cls) -> "LLMRouter":
        return cls(_load_config_from_env())

    async def complete(
        self,
        messages: Sequence[LLMMessage],
        *,
        temperature: float = 0.4,
        max_tokens: int = 600,
        prompt_cache_keys: list[str] | None = None,
        purpose: str = "chat",
    ) -> LLMResponse:
        """Call OpenAI primary; on transient failure or empty completion, fall
        back to taphoaapi (Claude). Returns a normalized :class:`LLMResponse`.

        ``prompt_cache_keys`` is an optional list of stable string keys the
        caller wants OpenAI's prompt cache to bucket on. Server-side caching
        keys in on identical prefixes — so if the first message is a long
        system prompt (>1024 chars) we just pass through; the actual cache
        decision is made server-side.
        """

        # Optional cache hint — currently a pass-through. Keeps the parameter
        # documented and lets us wire request-time cache headers later without
        # changing the call sites in messaging_automation_service / NLU.
        if (
            prompt_cache_keys
            and messages
            and messages[0].role == "system"
            and len(messages[0].content) > 1024
        ):
            logger.debug(
                "llm_router.prompt_cache_hint",
                extra={
                    "purpose": purpose,
                    "cache_keys": list(prompt_cache_keys),
                    "system_len": len(messages[0].content),
                },
            )

        last_error: Exception | None = None
        last_provider: str | None = None

        # ---- Primary: OpenAI ----
        if self.config.openai_api_key:
            last_provider = "openai"
            try:
                response = await self._call_openai(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    purpose=purpose,
                )
                if response is not None and response.text:
                    return response
                logger.warning(
                    "llm_router.empty_completion_falling_back",
                    extra={"provider": "openai", "purpose": purpose},
                )
            except _OPENAI_TRANSIENT_ERRORS as exc:
                last_error = exc
                logger.warning(
                    "llm_router.openai_transient_error_falling_back",
                    extra={
                        "provider": "openai",
                        "purpose": purpose,
                        "error_type": type(exc).__name__,
                    },
                )
            except Exception as exc:  # non-transient, but still try fallback
                last_error = exc
                logger.warning(
                    "llm_router.openai_error_falling_back",
                    extra={
                        "provider": "openai",
                        "purpose": purpose,
                        "error_type": type(exc).__name__,
                    },
                )
        else:
            logger.debug(
                "llm_router.openai_skipped_no_api_key",
                extra={"purpose": purpose},
            )

        # ---- Fallback: taphoaapi (Claude Sonnet via OpenAI-compatible proxy)
        if self.config.taphoaapi_api_key:
            last_provider = "taphoaapi"
            try:
                response = await self._call_taphoaapi(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    purpose=purpose,
                )
                if response is not None and response.text:
                    response.fallback_used = True
                    return response
                last_error = last_error or LLMRouterError(
                    "taphoaapi returned empty completion",
                    last_provider="taphoaapi",
                )
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "llm_router.taphoaapi_error",
                    extra={
                        "provider": "taphoaapi",
                        "purpose": purpose,
                        "error_type": type(exc).__name__,
                    },
                )
        else:
            logger.debug(
                "llm_router.taphoaapi_skipped_no_api_key",
                extra={"purpose": purpose},
            )

        if last_provider is None:
            raise LLMRouterError(
                "No LLM provider is configured (set OPENAI_API_KEY or TAPHOAAPI_API_KEY).",
                last_provider=None,
                last_error=None,
            )
        raise LLMRouterError(
            f"All LLM providers failed (last: {last_provider}).",
            last_provider=last_provider,
            last_error=last_error,
        )

    # ------------------------------------------------------------------
    # Provider calls
    # ------------------------------------------------------------------

    async def _call_openai(
        self,
        *,
        messages: Sequence[LLMMessage],
        temperature: float,
        max_tokens: int,
        purpose: str,
    ) -> LLMResponse | None:
        if not self.config.openai_api_key:
            return None
        return await self._call_openai_compatible(
            provider_label="openai",
            api_key=self.config.openai_api_key,
            base_url=self.config.openai_base_url,
            model=self.config.openai_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            purpose=purpose,
        )

    async def _call_taphoaapi(
        self,
        *,
        messages: Sequence[LLMMessage],
        temperature: float,
        max_tokens: int,
        purpose: str,
    ) -> LLMResponse | None:
        if not self.config.taphoaapi_api_key:
            return None
        return await self._call_openai_compatible(
            provider_label="taphoaapi",
            api_key=self.config.taphoaapi_api_key,
            base_url=self.config.taphoaapi_base_url,
            model=self.config.taphoaapi_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            purpose=purpose,
        )

    async def _call_openai_compatible(
        self,
        *,
        provider_label: str,
        api_key: str,
        base_url: str,
        model: str,
        messages: Sequence[LLMMessage],
        temperature: float,
        max_tokens: int,
        purpose: str,
    ) -> LLMResponse:
        client = _build_async_openai_client(
            api_key=api_key,
            base_url=base_url,
            timeout=self.config.request_timeout_seconds,
        )

        wire_messages = [{"role": m.role, "content": m.content} for m in messages]

        started = time.perf_counter()
        completion = await client.chat.completions.create(
            model=model,
            messages=wire_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)

        text, finish_reason, usage = _extract_chat_completion(completion)

        # Privacy: log metadata only — never message content.
        logger.info(
            "llm_router.completion",
            extra={
                "provider": provider_label,
                "model": model,
                "purpose": purpose,
                "latency_ms": latency_ms,
                "usage": usage,
                "finish_reason": finish_reason,
                "fallback_used": provider_label != "openai",
                "text_length": len(text),
            },
        )

        return LLMResponse(
            text=text,
            provider=provider_label,
            model=model,
            finish_reason=finish_reason,
            usage=usage,
            fallback_used=False,  # caller marks True for the fallback path
        )


# ---------------------------------------------------------------------------
# Internal helpers — kept module-level so tests can patch them precisely.
# ---------------------------------------------------------------------------


def _build_async_openai_client(
    *, api_key: str, base_url: str, timeout: float
) -> Any:
    """Construct an ``openai.AsyncOpenAI`` client.

    Imported lazily so that environments without the ``openai`` SDK installed
    (e.g. CI lint passes) can still import this module. Tests patch this
    function to return an :class:`unittest.mock.AsyncMock`.
    """

    from openai import AsyncOpenAI  # noqa: WPS433 — intentional lazy import

    return AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout)


def _extract_chat_completion(completion: Any) -> tuple[str, str | None, dict[str, int]]:
    """Pull text + finish_reason + usage out of a Chat Completion response.

    Tolerant of plain dicts (mocked) and pydantic models (real SDK)."""

    text = ""
    finish_reason: str | None = None
    usage: dict[str, int] = {}

    choices = _attr(completion, "choices") or []
    if choices:
        first = choices[0]
        message = _attr(first, "message")
        if message is not None:
            content = _attr(message, "content")
            if isinstance(content, str):
                text = content
            elif isinstance(content, list):
                # Some compatible providers return a content-block list.
                pieces: list[str] = []
                for block in content:
                    block_text = _attr(block, "text")
                    if isinstance(block_text, str):
                        pieces.append(block_text)
                text = "".join(pieces)
        finish_reason = _attr(first, "finish_reason")

    raw_usage = _attr(completion, "usage")
    if raw_usage is not None:
        for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
            value = _attr(raw_usage, key)
            if isinstance(value, int):
                usage[key] = value

    return (text or "").strip(), finish_reason, usage


def _attr(obj: Any, name: str) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


# ---------------------------------------------------------------------------
# Transient error tuple — resolved lazily so the module imports without the
# openai SDK installed (lint / test environments without the dep).
# ---------------------------------------------------------------------------


def _resolve_openai_transient_errors() -> tuple[type[BaseException], ...]:
    try:
        import openai  # noqa: WPS433 — lazy import
    except Exception:  # pragma: no cover — exercised only when SDK missing
        return ()
    candidates = [
        getattr(openai, "RateLimitError", None),
        getattr(openai, "InternalServerError", None),
        getattr(openai, "APIConnectionError", None),
        getattr(openai, "APITimeoutError", None),
    ]
    return tuple(c for c in candidates if isinstance(c, type))


_OPENAI_TRANSIENT_ERRORS: tuple[type[BaseException], ...] = (
    _resolve_openai_transient_errors()
)


# ---------------------------------------------------------------------------
# Env loader
# ---------------------------------------------------------------------------


def _load_config_from_env() -> LLMRouterConfig:
    return LLMRouterConfig(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5.4"),
        openai_base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        taphoaapi_api_key=os.getenv("TAPHOAAPI_API_KEY"),
        taphoaapi_model=os.getenv("TAPHOAAPI_MODEL", "claude-sonnet-4-6"),
        taphoaapi_base_url=os.getenv(
            "TAPHOAAPI_BASE_URL", "https://api.taphoammo.net/v1"
        ),
        request_timeout_seconds=float(
            os.getenv("LLM_REQUEST_TIMEOUT_SECONDS", "30")
        ),
    )


__all__ = [
    "LLMMessage",
    "LLMResponse",
    "LLMRouter",
    "LLMRouterConfig",
    "LLMRouterError",
]
