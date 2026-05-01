"""Public handler for ``GET /api/v1/aimentor/programs``.

Returns the published AI Mentor catalog the chat picker and the
``aimentor.bookedai.au`` programs grid both render. Read-only, no auth —
visitors browse before booking. Tenant is resolved by the
``ai-mentor-doer`` slug; if the tenant has not been seeded yet the
endpoint returns ``programs: []`` rather than 500'ing.

Mirrors the response shape of ``chess_catalog_search`` in
``v1_chess_slot_handlers`` so frontend consumers stay consistent
between the two subdomains.
"""

from __future__ import annotations

from typing import Any

from fastapi import Request
from sqlalchemy import text

from api.v1_routes import _success_response
from db import get_session
from repositories.base import RepositoryContext
from repositories.tenant_repository import TenantRepository


AIMENTOR_TENANT_SLUG = "ai-mentor-doer"


async def _resolve_aimentor_tenant_id(session) -> str | None:
    repo = TenantRepository(RepositoryContext(session=session))
    return await repo.resolve_tenant_id(AIMENTOR_TENANT_SLUG)


def _coerce_tags(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(t) for t in raw if t is not None]
    if isinstance(raw, str) and raw:
        return [raw]
    return []


def _row_to_program(row: dict[str, Any]) -> dict[str, Any]:
    metadata = row.get("metadata") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    duration_minutes = row.get("duration_minutes")
    if duration_minutes is None:
        meta_duration = metadata.get("duration_minutes")
        try:
            duration_minutes = int(meta_duration) if meta_duration is not None else None
        except (TypeError, ValueError):
            duration_minutes = None
    amount_aud_raw = row.get("amount_aud")
    try:
        amount_aud = float(amount_aud_raw) if amount_aud_raw is not None else None
    except (TypeError, ValueError):
        amount_aud = None
    return {
        "service_id": row.get("service_id"),
        "slug": row.get("service_id"),
        "name": row.get("name"),
        "category": row.get("category"),
        "summary": row.get("summary"),
        "duration_minutes": duration_minutes,
        "amount_aud": amount_aud,
        "display_price": row.get("display_price"),
        "image_url": row.get("image_url"),
        "tags": _coerce_tags(row.get("tags_json")),
        "featured": bool(row.get("featured") or 0),
        "booking_url": row.get("booking_url"),
    }


async def list_aimentor_programs(request: Request):
    """List published AI Mentor programs ordered featured-first then curated."""
    async with get_session(request.app.state.session_factory) as session:
        tenant_id = await _resolve_aimentor_tenant_id(session)
        if not tenant_id:
            return _success_response(
                {"programs": [], "currency": "AUD"},
                tenant_id=None,
                actor_context=None,
            )
        result = await session.execute(
            text(
                """
                select
                  service_id, name, category, summary,
                  amount_aud, display_price, duration_minutes,
                  image_url, booking_url, tags_json, metadata,
                  coalesce(featured, 0) as featured
                from service_merchant_profiles
                where tenant_id = cast(:tenant_id as text)
                  and publish_state = 'published'
                  and coalesce(is_active, 1) = 1
                order by
                  coalesce(featured, 0) desc,
                  coalesce((metadata->>'sort_order')::int, 9999) asc,
                  name asc
                """
            ),
            {"tenant_id": tenant_id},
        )
        rows = [dict(r._mapping) for r in result]

    return _success_response(
        {
            "programs": [_row_to_program(row) for row in rows],
            "currency": "AUD",
        },
        tenant_id=None,
        actor_context=None,
    )


__all__ = [
    "AIMENTOR_TENANT_SLUG",
    "list_aimentor_programs",
]
