"""Handler for the v1 agent activity drawer endpoint.

This endpoint exposes a typed projection of the ``conversation_events``
ledger (``backend/db.py:20-37``) so the frontend "Agent Activity Drawer"
component can stream the multi-agent operating layer as auditable steps
("show your work" pattern — see
``docs/development/review-2026-04-28/lane-7-ai-startup-trends.md`` §5).

Security contract:
  * Tenant resolution flows through ``_resolve_tenant_id`` so that P0-2 is
    respected — anonymous callers MUST not be able to drain another tenant's
    conversation ledger.
  * Conversation events are filtered by ``conversation_id`` (caller supplies
    via query string) and the response payload masks any PII keys that may
    have been recorded inside ``metadata_json``.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Query, Request
from sqlalchemy import select

from api.v1_routes import (
    ActorContextPayload,
    _resolve_tenant_id,
    _success_response,
)
from db import ConversationEvent, get_session


# Field names whose values must be masked before being returned to the
# client. Matched case-insensitively. Recursion happens at the helper level
# below so nested dicts and lists are scrubbed too.
#
# Naming policy ("name" key handling):
#   The masker is recursive WITHOUT parent-key context, so we deliberately do
#   NOT include the bare key ``name`` — that would clobber legitimate keys
#   like ``service_name`` (no, that's a substring not a key — but also keys
#   like ``plan.name``, ``actor.name`` for system actors, etc.). Instead we
#   only mask the explicit customer/contact-style name keys below. If a
#   nested dict like ``{"customer": {"name": "Guest"}}`` needs scrubbing,
#   the writer should record ``customer_name`` directly.
PII_FIELD_NAMES: frozenset[str] = frozenset(
    {
        # Phone / email
        "phone",
        "phone_number",
        "customer_phone",
        "contact_phone",
        "email",
        "customer_email",
        "contact_email",
        # Personal name (explicit forms only — see policy note above)
        "customer_name",
        "full_name",
        "first_name",
        "last_name",
        # Address / location identifiers
        "address",
        "street",
        "street_address",
        "postal_code",
        "postcode",
        # Date of birth
        "dob",
        "date_of_birth",
        "birth_date",
        # Payment instruments
        "card_number",
        "pan",
        "cvv",
        "expiry",
    }
)

# Coordinate keys are coarsened (not fully masked) so ops debugging keeps a
# rough geographic signal. Rounding to 0.01 ≈ 1.1 km at the equator, which
# strips precise location while still telling you the suburb-scale area.
PII_COORDINATE_KEYS: frozenset[str] = frozenset(
    {
        "lat",
        "latitude",
        "lng",
        "longitude",
    }
)
PII_COORDINATE_PRECISION = 2  # decimal places — 0.01 step

PII_MASK_TOKEN = "<masked>"

# Cap on the size of the assistant reply we project into each step. Keeps the
# JSON payload small enough to stream comfortably even for verbose threads.
AI_REPLY_PREVIEW_CHARS = 200

# Agent activity payloads should stay tight — even if the caller asks for
# more, hard-cap the projection at this value to protect the API surface.
DEFAULT_AGENT_ACTIVITY_LIMIT = 50
MAX_AGENT_ACTIVITY_LIMIT = 200


def _mask_pii(value: Any) -> Any:
    """Recursively scrub PII-flagged keys before returning ``metadata_json``.

    Returns a copy with every PII-tagged value swapped for ``<masked>``. Lists
    and nested dicts are walked so masking still applies to deeply embedded
    contact records (eg. ``{"customer": {"email": "..."}}``).
    """

    if isinstance(value, dict):
        masked: dict[str, Any] = {}
        for key, item in value.items():
            if not isinstance(key, str):
                masked[key] = _mask_pii(item)
                continue
            normalized_key = key.lower()
            if normalized_key in PII_FIELD_NAMES:
                masked[key] = PII_MASK_TOKEN
            elif normalized_key in PII_COORDINATE_KEYS:
                masked[key] = _coarsen_coordinate(item)
            else:
                masked[key] = _mask_pii(item)
        return masked

    if isinstance(value, list):
        return [_mask_pii(item) for item in value]

    return value


def _coarsen_coordinate(value: Any) -> Any:
    """Round latitude/longitude values to ~1km precision.

    Returning the raw value untouched for non-numeric inputs keeps the masker
    forgiving — callers should not rely on coercion here.
    """

    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        try:
            return round(float(value), PII_COORDINATE_PRECISION)
        except (TypeError, ValueError):
            return value
    return value


def _truncate_ai_reply(reply: str | None) -> str | None:
    if reply is None:
        return None
    text = str(reply)
    if len(text) <= AI_REPLY_PREVIEW_CHARS:
        return text
    return text[:AI_REPLY_PREVIEW_CHARS]


def _project_event_to_step(event: ConversationEvent) -> dict[str, Any]:
    raw_metadata: dict[str, Any] = (
        dict(event.metadata_json or {})
        if isinstance(event.metadata_json, dict)
        else {}
    )

    duration_value = raw_metadata.pop("duration_ms", None)
    duration_ms: int | None = None
    if isinstance(duration_value, (int, float)):
        try:
            duration_ms = int(duration_value)
        except (TypeError, ValueError):
            duration_ms = None

    # Wave 13-B — slash-command verbs are stored on
    # ``metadata_json.user_intent_hint`` (see
    # ``api/v1_search_handlers.py:_normalize_intent_hint``). They are NOT
    # PII (the verb space is a short closed enum like
    # ``find_service``/``book_service``), so we lift the value out of the
    # masker and surface it as a typed step field.
    user_intent_hint_raw = raw_metadata.pop("user_intent_hint", None)
    user_intent_hint: str | None = None
    if isinstance(user_intent_hint_raw, str):
        candidate = user_intent_hint_raw.strip()
        if candidate:
            user_intent_hint = candidate

    masked_evidence = _mask_pii(raw_metadata) if raw_metadata else {}

    created_at_iso = (
        event.created_at.isoformat()
        if event.created_at is not None
        else None
    )

    return {
        "id": int(event.id),
        "source": str(event.source or "public_chat"),
        "event_type": str(event.event_type or ""),
        "ai_intent": event.ai_intent,
        "ai_reply": _truncate_ai_reply(event.ai_reply),
        "workflow_status": event.workflow_status,
        "duration_ms": duration_ms,
        "user_intent_hint": user_intent_hint,
        "evidence": masked_evidence,
        "created_at": created_at_iso,
    }


async def get_agent_activity(
    request: Request,
    conversation_id: str = Query(..., min_length=1, max_length=255),
    limit: int = Query(DEFAULT_AGENT_ACTIVITY_LIMIT, ge=1, le=MAX_AGENT_ACTIVITY_LIMIT),
    tenant_id_param: str | None = Query(None, alias="tenant_id"),
    tenant_ref: str | None = Query(None, alias="tenant_ref"),
):
    """Return a typed projection of ``conversation_events`` for one thread.

    Query params:
      * ``conversation_id`` (required) — ledger key.
      * ``limit`` — number of steps to return (default 50, max 200).
      * ``tenant_id`` / ``tenant_ref`` — drives ``_resolve_tenant_id``.
    """

    actor_context = ActorContextPayload(
        channel="public_web",
        tenant_id=tenant_id_param,
        tenant_ref=tenant_ref,
        deployment_mode="standalone_app",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)

    normalized_conversation_id = conversation_id.strip()
    if not normalized_conversation_id:
        raise HTTPException(
            status_code=422,
            detail="conversation_id is required.",
        )

    async with get_session(request.app.state.session_factory) as session:
        statement = (
            select(ConversationEvent)
            .where(ConversationEvent.conversation_id == normalized_conversation_id)
            .order_by(ConversationEvent.created_at.asc(), ConversationEvent.id.asc())
            .limit(limit)
        )
        result = await session.execute(statement)
        events = list(result.scalars().all())

    steps = [_project_event_to_step(event) for event in events]

    return _success_response(
        {
            "conversation_id": normalized_conversation_id,
            "steps": steps,
            "limit": limit,
            "count": len(steps),
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )
