from __future__ import annotations

from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from fastapi import Header, HTTPException, Request

from api.route_handlers import require_admin_access
from core.logging import get_logger
from db import get_session
from repositories.base import RepositoryContext
from repositories.customer_handoff_session_repository import (
    CustomerHandoffSessionRepository,
)
from schemas import (
    CreateCustomerHandoffSessionRequest,
    CreateCustomerHandoffSessionResponse,
    HandoffSessionSourceMetric,
    HandoffSessionSummaryResponse,
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


# Conversion-rate window for ops dashboards. 24h is the natural reporting cadence
# for a 1h-TTL handoff session (most surfaces drive the bulk of their handoffs in
# the same business day they were minted), and the index on `created_at` keeps
# this query cheap even as the table grows.
DEFAULT_SUMMARY_WINDOW_HOURS = 24
MAX_SUMMARY_WINDOW_HOURS = 24 * 30  # 30 days — beyond this go to BI directly.


async def admin_handoff_session_summary(
    request: Request,
    since_hours: int = DEFAULT_SUMMARY_WINDOW_HOURS,
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
    authorization: str | None = Header(default=None),
) -> HandoffSessionSummaryResponse:
    require_admin_access(
        request, x_admin_token=x_admin_token, authorization=authorization
    )
    bounded_hours = max(1, min(int(since_hours or DEFAULT_SUMMARY_WINDOW_HOURS), MAX_SUMMARY_WINDOW_HOURS))
    since = datetime.now(UTC) - timedelta(hours=bounded_hours)
    async with get_session(request.app.state.session_factory) as session:
        repository = CustomerHandoffSessionRepository(RepositoryContext(session=session))
        summary = await repository.summarize_since(since=since)

    minted = int(summary.get("minted") or 0)
    consumed = int(summary.get("consumed") or 0)
    conversion_rate = round(consumed / minted, 4) if minted else 0.0
    by_source = {
        source: HandoffSessionSourceMetric(
            minted=int(metrics.get("minted") or 0),
            consumed=int(metrics.get("consumed") or 0),
        )
        for source, metrics in (summary.get("by_source") or {}).items()
    }
    return HandoffSessionSummaryResponse(
        status="ok",
        since=since.isoformat(),
        minted=minted,
        consumed=consumed,
        expired_unconsumed=int(summary.get("expired_unconsumed") or 0),
        conversion_rate=conversion_rate,
        by_source=by_source,
    )
