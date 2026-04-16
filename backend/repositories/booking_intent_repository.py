from __future__ import annotations

import json

from sqlalchemy import text

from repositories.base import BaseRepository


class BookingIntentRepository(BaseRepository):
    """Repository seam for dual-written booking intent records."""

    async def upsert_booking_intent(
        self,
        *,
        tenant_id: str | None = None,
        contact_id: str | None = None,
        booking_reference: str,
        conversation_id: str | None = None,
        source: str | None = None,
        service_name: str | None = None,
        service_id: str | None = None,
        requested_date: str | None = None,
        requested_time: str | None = None,
        timezone: str | None = None,
        booking_path: str = "request_callback",
        confidence_level: str = "unverified",
        status: str = "draft",
        payment_dependency_state: str | None = None,
        metadata_json: str = "{}",
    ) -> str | None:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_reference = booking_reference.strip()
        if not effective_tenant_id or not normalized_reference:
            return None

        result = await self.session.execute(
            text(
                """
                insert into booking_intents (
                  tenant_id,
                  contact_id,
                  conversation_id,
                  booking_reference,
                  source,
                  service_name,
                  service_id,
                  requested_date,
                  requested_time,
                  timezone,
                  booking_path,
                  confidence_level,
                  status,
                  payment_dependency_state,
                  metadata_json
                )
                values (
                  :tenant_id,
                  cast(:contact_id as uuid),
                  :conversation_id,
                  :booking_reference,
                  :source,
                  :service_name,
                  :service_id,
                  :requested_date,
                  :requested_time,
                  :timezone,
                  :booking_path,
                  :confidence_level,
                  :status,
                  :payment_dependency_state,
                  cast(:metadata_json as jsonb)
                )
                on conflict (booking_reference)
                do update set
                  contact_id = excluded.contact_id,
                  conversation_id = excluded.conversation_id,
                  source = excluded.source,
                  service_name = excluded.service_name,
                  service_id = excluded.service_id,
                  requested_date = excluded.requested_date,
                  requested_time = excluded.requested_time,
                  timezone = excluded.timezone,
                  booking_path = excluded.booking_path,
                  confidence_level = excluded.confidence_level,
                  status = excluded.status,
                  payment_dependency_state = excluded.payment_dependency_state,
                  metadata_json = excluded.metadata_json,
                  updated_at = now()
                returning id::text
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "contact_id": (contact_id or "").strip() or None,
                "conversation_id": conversation_id,
                "booking_reference": normalized_reference,
                "source": source,
                "service_name": service_name,
                "service_id": service_id,
                "requested_date": requested_date,
                "requested_time": requested_time,
                "timezone": timezone,
                "booking_path": booking_path,
                "confidence_level": confidence_level,
                "status": status,
                "payment_dependency_state": payment_dependency_state,
                "metadata_json": metadata_json,
            },
        )
        return result.scalar_one_or_none()

    async def list_shadow_booking_rows(
        self,
        *,
        tenant_id: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, object | None]]:
        effective_tenant_id = tenant_id or self.tenant_id
        if not effective_tenant_id:
            return []

        result = await self.session.execute(
            text(
                """
                select
                  bi.id::text as booking_intent_id,
                  bi.booking_reference,
                  bi.service_name,
                  bi.service_id,
                  bi.requested_date,
                  bi.requested_time,
                  bi.timezone,
                  bi.status as booking_status,
                  bi.created_at,
                  bi.metadata_json
                from booking_intents bi
                where bi.tenant_id = :tenant_id
                order by bi.created_at desc
                limit :limit
                """
            ),
            {"tenant_id": effective_tenant_id, "limit": max(limit, 1)},
        )
        return [dict(row._mapping) for row in result]

    async def sync_callback_status(
        self,
        *,
        tenant_id: str | None = None,
        booking_reference: str,
        status: str | None = None,
        payment_dependency_state: str | None = None,
        metadata_updates: dict[str, object | None] | None = None,
    ) -> dict[str, object | None]:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_reference = booking_reference.strip()
        if not effective_tenant_id or not normalized_reference:
            return {}

        lookup = await self.session.execute(
            text(
                """
                select
                  id::text as booking_intent_id,
                  contact_id::text as contact_id,
                  metadata_json
                from booking_intents
                where tenant_id = :tenant_id
                  and booking_reference = :booking_reference
                limit 1
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "booking_reference": normalized_reference,
            },
        )
        row = lookup.mappings().first()
        if not row:
            return {}

        existing_metadata = dict(row.get("metadata_json") or {})
        if metadata_updates:
            existing_metadata.update(
                {
                    key: value
                    for key, value in metadata_updates.items()
                    if value is not None and str(value).strip() != ""
                }
            )

        await self.session.execute(
            text(
                """
                update booking_intents
                set
                  status = coalesce(:status, status),
                  payment_dependency_state = coalesce(
                    :payment_dependency_state,
                    payment_dependency_state
                  ),
                  metadata_json = cast(:metadata_json as jsonb),
                  updated_at = now()
                where id = cast(:booking_intent_id as uuid)
                """
            ),
            {
                "booking_intent_id": row["booking_intent_id"],
                "status": (status or "").strip() or None,
                "payment_dependency_state": (payment_dependency_state or "").strip() or None,
                "metadata_json": json.dumps(existing_metadata),
            },
        )
        return {
            "booking_intent_id": row["booking_intent_id"],
            "contact_id": row.get("contact_id"),
        }
