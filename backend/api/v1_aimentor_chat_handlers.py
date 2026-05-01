"""POST /api/v1/aimentor/chat/turn — LLM-powered chat turn for AI Mentor.

Used by the web chat (and later, by a bot conversation engine) to handle
free-form / open-ended turns. Returns a structured response so the frontend
can render text + optional intents (suggested_programs, ask_for_email,
escalate_to_human).

Backed by :class:`integrations.ai_models.llm_router.LLMRouter` (OpenAI 5.4
primary, Claude Sonnet via taphoaapi fallback). The handler:

1. Rate-limits per ``session_id`` (60 req/min, in-process — fine for now,
   replaceable with Redis later).
2. Loads + caches the published AI Mentor catalog (5-min TTL) so the LLM
   can suggest real program ids without us hitting Postgres on every turn.
3. Builds a JSON-contract system prompt that grounds replies in the catalog
   and constrains the response shape.
4. Calls the LLM, parses the JSON (forgiving — strips markdown fences),
   filters hallucinated program ids, and returns a structured response.
"""

from __future__ import annotations

import json
import logging
import re
import time
from collections import defaultdict, deque
from typing import Literal

from fastapi import HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from db import get_session

logger = logging.getLogger(__name__)


AIMENTOR_TENANT_SLUG = "ai-mentor-doer"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class ChatTurnHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=2000)


class ChatTurnAction(BaseModel):
    label: str
    action_kind: Literal["url", "cmd"]
    target: str


class ChatTurnRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=128)
    locale: Literal["en", "vi"] = "en"
    history: list[ChatTurnHistoryItem] = Field(default_factory=list, max_length=20)
    user_message: str = Field(min_length=1, max_length=2000)
    context: dict | None = None


class ChatTurnResponse(BaseModel):
    session_id: str
    reply_text: str
    intent: Literal[
        "answer", "suggest_programs", "ask_contact", "escalate_human", "unknown"
    ] = "answer"
    suggested_program_ids: list[str] = Field(default_factory=list)
    suggested_actions: list[ChatTurnAction] = Field(default_factory=list)
    provider: str
    fallback_used: bool
    model: str
    latency_ms: int


_VALID_INTENTS = {
    "answer",
    "suggest_programs",
    "ask_contact",
    "escalate_human",
    "unknown",
}


# ---------------------------------------------------------------------------
# Catalog cache (5-min TTL, process-local)
# ---------------------------------------------------------------------------


_CATALOG_CACHE_TTL_SECONDS = 300
_catalog_cache: dict = {"fetched_at": 0.0, "programs": []}


async def _get_cached_catalog(session_factory) -> list[dict]:
    """Return up-to-6 published AI Mentor programs, with a 5-min process-local
    cache. On DB error we serve stale (possibly empty) rather than 500."""
    now = time.time()
    if (
        now - _catalog_cache["fetched_at"] < _CATALOG_CACHE_TTL_SECONDS
        and _catalog_cache["programs"]
    ):
        return _catalog_cache["programs"]

    try:
        async with get_session(session_factory) as session:
            result = await session.execute(
                text(
                    """
                    select
                      smp.service_id,
                      smp.name,
                      smp.category,
                      smp.amount_aud,
                      smp.display_price,
                      smp.duration_minutes,
                      coalesce((smp.metadata->>'sort_order')::int, 9999) as sort_order,
                      coalesce(smp.featured, 0) as featured
                    from service_merchant_profiles smp
                    join tenants t on t.tenant_id = smp.tenant_id::text
                    where t.slug = :tenant_slug
                      and smp.publish_state = 'published'
                      and coalesce(smp.is_active, 1) = 1
                    order by featured desc, sort_order asc, smp.name asc
                    limit 6
                    """
                ),
                {"tenant_slug": AIMENTOR_TENANT_SLUG},
            )
            rows = [dict(r._mapping) for r in result]
            _catalog_cache["programs"] = rows
            _catalog_cache["fetched_at"] = now
            return rows
    except Exception as exc:  # noqa: BLE001 — degrade gracefully, do not 500
        logger.warning(
            "aimentor_catalog_cache_fetch_failed",
            extra={"error": str(exc), "error_type": type(exc).__name__},
        )
        return _catalog_cache["programs"]  # serve stale (possibly empty)


# ---------------------------------------------------------------------------
# Rate limit (in-memory, 60 req/min per session_id)
# ---------------------------------------------------------------------------


_RATE_LIMIT_MAX = 60
_RATE_LIMIT_WINDOW_SECONDS = 60
_session_hits: dict[str, deque] = defaultdict(deque)


def _check_rate_limit(session_id: str) -> int | None:
    """Return ``None`` if within the budget, else an int seconds-to-retry."""
    now = time.time()
    hits = _session_hits[session_id]
    while hits and hits[0] < now - _RATE_LIMIT_WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= _RATE_LIMIT_MAX:
        retry_after = int(hits[0] + _RATE_LIMIT_WINDOW_SECONDS - now) + 1
        return max(retry_after, 1)
    hits.append(now)
    return None


# ---------------------------------------------------------------------------
# System prompt builder
# ---------------------------------------------------------------------------


def _build_system_prompt(programs: list[dict], locale: str) -> str:
    """Compose the LLM system prompt: persona + catalog + intent menu + JSON
    contract. Kept compact (~800-1500 chars) so the prompt cache earns its
    keep on the first system-message prefix."""
    prefix = (
        "You are AI Mentor, the warm, plain-spoken concierge for BookedAI's "
        "AI Mentor Doer programs at https://aimentor.bookedai.au. Help "
        "curious adults pick the right hands-on AI program, answer questions "
        "about format / price / outcomes, and gently guide ready visitors "
        "toward booking. Tone: warm, mentor-like, concise. Always <=2 "
        "sentences in reply_text. Never repeat the user back. Never invent "
        "program names or prices not in the catalog below."
    )

    catalog_lines: list[str] = []
    for p in programs[:6]:
        sid = p.get("service_id")
        if not sid:
            continue
        price = p.get("display_price") or "Custom"
        dur_min = p.get("duration_minutes")
        dur = f"{dur_min} min" if dur_min else "flex"
        name = p.get("name") or sid
        catalog_lines.append(f"  - {sid}: {name} - {dur}, {price}")
    catalog_block = (
        "\n".join(catalog_lines)
        if catalog_lines
        else "  (no programs available right now)"
    )

    intents_block = (
        "Intents (set the `intent` field):\n"
        "  - 'answer' for general Q&A about AI / mentorship / format.\n"
        "  - 'suggest_programs' when the user expresses interest in booking. "
        "Set suggested_program_ids to 1-3 IDs from the catalog above. "
        "Never invent IDs.\n"
        "  - 'ask_contact' when ready to collect name / email / phone for "
        "booking.\n"
        "  - 'escalate_human' when the user asks for a human or has a "
        "complaint.\n"
        "  - 'unknown' if you genuinely cannot help."
    )

    json_contract = (
        "RESPOND AS A SINGLE JSON OBJECT with these keys: "
        "{\"reply_text\": string (<=2 sentences), \"intent\": one of above, "
        "\"suggested_program_ids\": array of strings (only IDs from catalog), "
        "\"suggested_actions\": array (each item: {\"label\": string, "
        "\"action_kind\": \"url\"|\"cmd\", \"target\": string})}. "
        "OUTPUT ONLY THE JSON, NO PROSE BEFORE OR AFTER, NO MARKDOWN FENCES."
    )

    locale_hint = (
        "Reply in Vietnamese." if locale == "vi" else "Reply in English."
    )

    return (
        f"{prefix}\n\nCatalog (top 6 programs):\n{catalog_block}\n\n"
        f"{intents_block}\n\n{locale_hint}\n\n{json_contract}"
    )


# ---------------------------------------------------------------------------
# JSON parser (forgiving)
# ---------------------------------------------------------------------------


def _parse_llm_json(text_blob: str) -> dict | None:
    """Try strict JSON first, then strip markdown fences, then return None."""
    s = (text_blob or "").strip()
    if not s:
        return None
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
        s = s.strip()
    try:
        parsed = json.loads(s)
    except (json.JSONDecodeError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------


async def aimentor_chat_turn(
    request: Request, payload: ChatTurnRequest
) -> ChatTurnResponse:
    """Handle one open-ended chat turn for the AI Mentor concierge."""
    # ---- Rate-limit ----
    retry_after = _check_rate_limit(payload.session_id)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limited",
                "retry_after_seconds": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )

    # ---- Catalog ----
    session_factory = request.app.state.session_factory
    programs = await _get_cached_catalog(session_factory)
    valid_program_ids = {
        str(p.get("service_id")) for p in programs if p.get("service_id")
    }

    # ---- Build messages ----
    # Lazy import — keeps unit tests that patch ``LLMRouter.from_env`` clean
    # and avoids paying the import cost at module load.
    from integrations.ai_models.llm_router import LLMMessage, LLMRouter

    system_prompt = _build_system_prompt(programs, payload.locale)
    messages: list[LLMMessage] = [LLMMessage(role="system", content=system_prompt)]
    for h in payload.history[-20:]:
        messages.append(LLMMessage(role=h.role, content=h.text))
    messages.append(LLMMessage(role="user", content=payload.user_message))

    # ---- Call LLM ----
    started = time.time()
    try:
        router = LLMRouter.from_env()
        response = await router.complete(
            messages,
            temperature=0.4,
            max_tokens=400,
            prompt_cache_keys=["aimentor_system_v1"],
            purpose="aimentor_chat_turn",
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface as 502 for the FE
        logger.warning(
            "aimentor_chat_turn_llm_failed",
            extra={
                "error": str(exc),
                "error_type": type(exc).__name__,
                "session_id": payload.session_id,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "llm_failed",
                "message": "AI mentor temporarily unavailable. Please try again.",
            },
        ) from exc
    latency_ms = int((time.time() - started) * 1000)

    # ---- Parse ----
    parsed = _parse_llm_json(response.text)
    if parsed is None:
        # Non-JSON fallback: surface the raw text as a plain reply rather
        # than 500'ing — better UX than blowing up on a stray markdown fence.
        return ChatTurnResponse(
            session_id=payload.session_id,
            reply_text=(response.text or "").strip()[:500] or "How can I help?",
            intent="answer",
            suggested_program_ids=[],
            suggested_actions=[],
            provider=response.provider,
            fallback_used=response.fallback_used,
            model=response.model,
            latency_ms=latency_ms,
        )

    # ---- Validate program IDs (filter hallucinated) ----
    raw_ids = parsed.get("suggested_program_ids", [])
    if not isinstance(raw_ids, list):
        raw_ids = []
    filtered_ids = [
        str(pid) for pid in raw_ids if str(pid) in valid_program_ids
    ][:3]

    # ---- Validate intent ----
    raw_intent = str(parsed.get("intent", "answer"))
    if raw_intent not in _VALID_INTENTS:
        raw_intent = "answer"

    # ---- Validate actions ----
    raw_actions = parsed.get("suggested_actions", [])
    actions: list[ChatTurnAction] = []
    if isinstance(raw_actions, list):
        for a in raw_actions[:5]:
            if not isinstance(a, dict):
                continue
            kind = a.get("action_kind", "url")
            if kind not in {"url", "cmd"}:
                continue
            try:
                actions.append(
                    ChatTurnAction(
                        label=str(a.get("label", ""))[:80] or "Open",
                        action_kind=kind,
                        target=str(a.get("target", ""))[:500],
                    )
                )
            except Exception:  # noqa: BLE001 — skip malformed action
                continue

    reply_text = (
        str(parsed.get("reply_text", "")).strip() or "How can I help?"
    )

    logger.info(
        "aimentor_chat_turn",
        extra={
            "session_id": payload.session_id,
            "provider": response.provider,
            "model": response.model,
            "fallback_used": response.fallback_used,
            "latency_ms": latency_ms,
            "intent": raw_intent,
            "history_len": len(payload.history),
            "filtered_program_ids": len(filtered_ids),
        },
    )

    return ChatTurnResponse(
        session_id=payload.session_id,
        reply_text=reply_text[:500],
        intent=raw_intent,
        suggested_program_ids=filtered_ids,
        suggested_actions=actions,
        provider=response.provider,
        fallback_used=response.fallback_used,
        model=response.model,
        latency_ms=latency_ms,
    )


__all__ = [
    "AIMENTOR_TENANT_SLUG",
    "ChatTurnAction",
    "ChatTurnHistoryItem",
    "ChatTurnRequest",
    "ChatTurnResponse",
    "aimentor_chat_turn",
]
