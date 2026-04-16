from __future__ import annotations

import json

from sqlalchemy import text

from repositories.base import BaseRepository


class PaymentIntentRepository(BaseRepository):
    """Repository seam for dual-written payment intent records."""

    async def upsert_payment_intent(
        self,
        *,
        tenant_id: str | None = None,
        booking_intent_id: str,
        payment_option: str,
        status: str = "pending",
        amount_aud: float | None = None,
        currency: str = "aud",
        external_session_id: str | None = None,
        payment_url: str | None = None,
        metadata_json: str = "{}",
    ) -> str | None:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_booking_intent_id = booking_intent_id.strip()
        normalized_payment_option = payment_option.strip()
        if not effective_tenant_id or not normalized_booking_intent_id or not normalized_payment_option:
            return None

        existing = await self.session.execute(
            text(
                """
                select id::text
                from payment_intents
                where tenant_id = :tenant_id
                  and booking_intent_id = cast(:booking_intent_id as uuid)
                  and payment_option = :payment_option
                order by created_at desc
                limit 1
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "booking_intent_id": normalized_booking_intent_id,
                "payment_option": normalized_payment_option,
            },
        )
        existing_id = existing.scalar_one_or_none()

        if existing_id:
            await self.session.execute(
                text(
                    """
                    update payment_intents
                    set
                      status = :status,
                      amount_aud = :amount_aud,
                      currency = :currency,
                      external_session_id = :external_session_id,
                      payment_url = :payment_url,
                      metadata_json = cast(:metadata_json as jsonb),
                      updated_at = now()
                    where id = cast(:payment_intent_id as uuid)
                    """
                ),
                {
                    "payment_intent_id": existing_id,
                    "status": status,
                    "amount_aud": amount_aud,
                    "currency": currency,
                    "external_session_id": external_session_id,
                    "payment_url": payment_url,
                    "metadata_json": metadata_json,
                },
            )
            return existing_id

        result = await self.session.execute(
            text(
                """
                insert into payment_intents (
                  tenant_id,
                  booking_intent_id,
                  payment_option,
                  status,
                  amount_aud,
                  currency,
                  external_session_id,
                  payment_url,
                  metadata_json
                )
                values (
                  :tenant_id,
                  cast(:booking_intent_id as uuid),
                  :payment_option,
                  :status,
                  :amount_aud,
                  :currency,
                  :external_session_id,
                  :payment_url,
                  cast(:metadata_json as jsonb)
                )
                returning id::text
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "booking_intent_id": normalized_booking_intent_id,
                "payment_option": normalized_payment_option,
                "status": status,
                "amount_aud": amount_aud,
                "currency": currency,
                "external_session_id": external_session_id,
                "payment_url": payment_url,
                "metadata_json": metadata_json,
            },
        )
        return result.scalar_one_or_none()

    async def list_latest_shadow_payment_rows(
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
                  pi.booking_intent_id::text as booking_intent_id,
                  pi.status as payment_status,
                  pi.amount_aud,
                  pi.payment_url,
                  pi.created_at
                from (
                  select
                    payment_intents.*,
                    row_number() over (
                      partition by payment_intents.booking_intent_id
                      order by payment_intents.created_at desc
                    ) as row_rank
                  from payment_intents
                  where payment_intents.tenant_id = :tenant_id
                ) pi
                where pi.row_rank = 1
                order by pi.created_at desc
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
        amount_aud: float | None = None,
        currency: str | None = None,
        payment_url: str | None = None,
        external_session_id: str | None = None,
        metadata_updates: dict[str, object | None] | None = None,
    ) -> str | None:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_reference = booking_reference.strip()
        if not effective_tenant_id or not normalized_reference:
            return None

        lookup = await self.session.execute(
            text(
                """
                select
                  pi.id::text as payment_intent_id,
                  pi.metadata_json
                from payment_intents pi
                join booking_intents bi
                  on bi.id = pi.booking_intent_id
                where bi.tenant_id = :tenant_id
                  and bi.booking_reference = :booking_reference
                order by pi.created_at desc
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
            return None

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
                update payment_intents
                set
                  status = coalesce(:status, status),
                  amount_aud = coalesce(:amount_aud, amount_aud),
                  currency = coalesce(:currency, currency),
                  payment_url = coalesce(:payment_url, payment_url),
                  external_session_id = coalesce(:external_session_id, external_session_id),
                  metadata_json = cast(:metadata_json as jsonb),
                  updated_at = now()
                where id = cast(:payment_intent_id as uuid)
                """
            ),
            {
                "payment_intent_id": row["payment_intent_id"],
                "status": (status or "").strip() or None,
                "amount_aud": amount_aud,
                "currency": (currency or "").strip().lower() or None,
                "payment_url": (payment_url or "").strip() or None,
                "external_session_id": (external_session_id or "").strip() or None,
                "metadata_json": json.dumps(existing_metadata),
            },
        )
        return str(row["payment_intent_id"])
