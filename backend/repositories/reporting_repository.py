from __future__ import annotations

from sqlalchemy import text

from repositories.base import BaseRepository


class ReportingRepository(BaseRepository):
    """Foundation seam for monthly stats and reporting snapshots."""

    async def summarize_tenant_overview(self, tenant_id: str) -> dict[str, int]:
        result = await self.session.execute(
            text(
                """
                select
                  coalesce((
                    select count(*)
                    from leads
                    where tenant_id = cast(:tenant_id as uuid)
                  ), 0) as total_leads,
                  coalesce((
                    select count(*)
                    from leads
                    where tenant_id = cast(:tenant_id as uuid)
                      and status in ('new', 'qualified', 'contacted')
                  ), 0) as active_leads,
                  coalesce((
                    select count(*)
                    from booking_intents
                    where tenant_id = cast(:tenant_id as uuid)
                  ), 0) as booking_requests,
                  coalesce((
                    select count(*)
                    from booking_intents
                    where tenant_id = cast(:tenant_id as uuid)
                      and status not in ('completed', 'cancelled')
                  ), 0) as open_booking_requests,
                  coalesce((
                    select count(*)
                    from payment_intents
                    where tenant_id = cast(:tenant_id as uuid)
                      and status not in ('paid', 'succeeded', 'completed', 'cancelled')
                  ), 0) as payment_attention_count,
                  coalesce((
                    select count(*)
                    from email_messages
                    where tenant_id = cast(:tenant_id as uuid)
                      and status not in ('sent', 'delivered')
                  ), 0) as lifecycle_attention_count
                """
            ),
            {"tenant_id": tenant_id},
        )
        row = result.mappings().one()
        return {
            "total_leads": int(row["total_leads"] or 0),
            "active_leads": int(row["active_leads"] or 0),
            "booking_requests": int(row["booking_requests"] or 0),
            "open_booking_requests": int(row["open_booking_requests"] or 0),
            "payment_attention_count": int(row["payment_attention_count"] or 0),
            "lifecycle_attention_count": int(row["lifecycle_attention_count"] or 0),
        }

    async def list_recent_booking_intents(
        self,
        tenant_id: str,
        *,
        limit: int = 5,
    ) -> list[dict[str, str | None]]:
        result = await self.session.execute(
            text(
                """
                select
                  booking_reference,
                  service_name,
                  requested_date,
                  requested_time,
                  timezone,
                  confidence_level,
                  status,
                  payment_dependency_state,
                  created_at::text as created_at
                from booking_intents
                where tenant_id = cast(:tenant_id as uuid)
                order by created_at desc
                limit :limit
                """
            ),
            {"tenant_id": tenant_id, "limit": max(limit, 1)},
        )
        return [
            {
                "booking_reference": row["booking_reference"],
                "service_name": row["service_name"],
                "requested_date": row["requested_date"],
                "requested_time": row["requested_time"],
                "timezone": row["timezone"],
                "confidence_level": row["confidence_level"],
                "status": row["status"],
                "payment_dependency_state": row["payment_dependency_state"],
                "created_at": row["created_at"],
            }
            for row in result.mappings().all()
        ]
