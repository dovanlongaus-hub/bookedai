from __future__ import annotations

from datetime import timedelta

from sqlalchemy import text

from repositories.base import BaseRepository


class BookingFeedbackRepository(BaseRepository):
    """Per-booking feedback ledger fed by the customer feedback endpoint."""

    async def find_recent_feedback(
        self,
        *,
        booking_reference: str,
        rating: int,
        within_minutes: int = 5,
    ) -> dict[str, object | None] | None:
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return None

        cutoff_minutes = max(int(within_minutes or 0), 0)

        result = await self.session.execute(
            text(
                """
                select
                  id::text as feedback_id,
                  rating,
                  submitted_at
                from booking_feedback
                where booking_reference = :booking_reference
                  and rating = :rating
                  and submitted_at >= now() - (:cutoff_minutes::int * interval '1 minute')
                order by submitted_at desc
                limit 1
                """
            ),
            {
                "booking_reference": normalized_reference,
                "rating": int(rating),
                "cutoff_minutes": cutoff_minutes,
            },
        )
        row = result.mappings().first()
        if not row:
            return None
        return dict(row)

    async def insert_feedback(
        self,
        *,
        booking_reference: str,
        tenant_id: str,
        rating: int,
        comment: str | None,
        would_recommend: bool | None,
        channel: str | None,
    ) -> str | None:
        normalized_reference = (booking_reference or "").strip()
        normalized_tenant_id = (tenant_id or "").strip()
        if not normalized_reference or not normalized_tenant_id:
            return None

        result = await self.session.execute(
            text(
                """
                insert into booking_feedback (
                  booking_reference,
                  tenant_id,
                  rating,
                  comment,
                  would_recommend,
                  channel
                )
                values (
                  :booking_reference,
                  cast(:tenant_id as uuid),
                  :rating,
                  :comment,
                  :would_recommend,
                  :channel
                )
                returning id::text
                """
            ),
            {
                "booking_reference": normalized_reference,
                "tenant_id": normalized_tenant_id,
                "rating": int(rating),
                "comment": (comment or "").strip() or None,
                "would_recommend": would_recommend,
                "channel": (channel or "").strip() or None,
            },
        )
        return result.scalar_one_or_none()

    async def list_feedback_for_tenant(
        self,
        *,
        tenant_id: str,
        limit: int = 50,
    ) -> list[dict[str, object | None]]:
        normalized_tenant_id = (tenant_id or "").strip()
        if not normalized_tenant_id:
            return []

        result = await self.session.execute(
            text(
                """
                select
                  id::text as feedback_id,
                  booking_reference,
                  rating,
                  comment,
                  would_recommend,
                  channel,
                  submitted_at
                from booking_feedback
                where tenant_id = cast(:tenant_id as uuid)
                order by submitted_at desc
                limit :limit
                """
            ),
            {"tenant_id": normalized_tenant_id, "limit": max(int(limit or 1), 1)},
        )
        return [dict(row._mapping) for row in result]


__all__ = ["BookingFeedbackRepository"]
