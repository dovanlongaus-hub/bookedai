from __future__ import annotations

from urllib.parse import urlencode

from fastapi import HTTPException, Request

from core.logging import get_logger
from db import get_session
from repositories.base import RepositoryContext
from repositories.customer_handoff_session_repository import (
    CustomerHandoffSessionRepository,
)
from schemas import (
    CreateCustomerHandoffSessionRequest,
    CreateCustomerHandoffSessionResponse,
)


_logger = get_logger("bookedai.api.v1_handoff_handlers")

# Telegram /start payloads accept up to 64 url-safe chars after the literal
# "start=", but the bot username is shared across the BookedAI org so we hard
# code it here rather than reach into messaging_automation_service to avoid a
# cycle.
BOOKEDAI_MANAGER_BOT_USERNAME = "BookedAI_Manager_Bot"
HANDOFF_DEEPLINK_PREFIX = "hsess_"


def _build_handoff_deeplink(session_id: str) -> str:
    qs = urlencode({"start": f"{HANDOFF_DEEPLINK_PREFIX}{session_id}"})
    return f"https://t.me/{BOOKEDAI_MANAGER_BOT_USERNAME}?{qs}"


def _build_payload(request_payload: CreateCustomerHandoffSessionRequest) -> dict[str, object]:
    payload: dict[str, object] = {}
    if request_payload.booking_reference:
        payload["booking_reference"] = request_payload.booking_reference.strip()
    if request_payload.service_query:
        payload["service_query"] = request_payload.service_query.strip()
    if request_payload.service_slug:
        payload["service_slug"] = request_payload.service_slug.strip()
    if request_payload.location_hint:
        payload["location_hint"] = request_payload.location_hint.strip()
    if request_payload.locale:
        payload["locale"] = request_payload.locale.strip().lower()
    if request_payload.notes:
        payload["notes"] = request_payload.notes.strip()
    if request_payload.selected_service_ids:
        payload["selected_service_ids"] = [
            str(item).strip()
            for item in request_payload.selected_service_ids
            if str(item or "").strip()
        ][:10]
    return payload


async def create_customer_handoff_session(
    request: Request,
    payload: CreateCustomerHandoffSessionRequest,
) -> CreateCustomerHandoffSessionResponse:
    body = _build_payload(payload)
    if not body:
        raise HTTPException(
            status_code=400,
            detail="At least one context field (booking_reference / service_query / "
            "service_slug / location_hint / notes) is required.",
        )

    async with get_session(request.app.state.session_factory) as session:
        repository = CustomerHandoffSessionRepository(RepositoryContext(session=session))
        row = await repository.create(source=payload.source or "product_homepage", payload=body)
        await session.commit()

    return CreateCustomerHandoffSessionResponse(
        status="ok",
        session_id=row.id,
        deeplink=_build_handoff_deeplink(row.id),
        expires_at=row.expires_at.isoformat(),
    )
