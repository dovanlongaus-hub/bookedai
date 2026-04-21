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

    async def get_revenue_capture_metrics(self, *, days: int = 30) -> dict:
        """Return booking funnel and revenue capture stats for the revenue dashboard widget."""
        result = await self.session.execute(
            text(
                """
                with booking_sessions as (
                  select
                    count(*) as total_sessions,
                    count(*) filter (where workflow_status = 'triggered') as confirmed_sessions
                  from conversation_events
                  where source = 'booking_assistant'
                    and event_type = 'booking_session_created'
                    and created_at >= now() - (:days || ' days')::interval
                ),
                revenue_data as (
                  select
                    coalesce(sum(amount_aud), 0) as total_revenue_aud,
                    coalesce(avg(amount_aud), 0) as avg_booking_value_aud,
                    count(*) as paid_bookings
                  from payment_intents
                  where status in ('paid', 'succeeded', 'completed')
                    and created_at >= now() - (:days || ' days')::interval
                ),
                chat_sessions as (
                  select count(distinct conversation_id) as chat_started
                  from conversation_events
                  where source = 'booking_assistant'
                    and event_type = 'booking_session_created'
                    and created_at >= now() - (:days || ' days')::interval
                )
                select
                  bs.total_sessions,
                  bs.confirmed_sessions,
                  rd.total_revenue_aud,
                  rd.avg_booking_value_aud,
                  rd.paid_bookings,
                  cs.chat_started
                from booking_sessions bs, revenue_data rd, chat_sessions cs
                """
            ),
            {"days": max(days, 1)},
        )
        row = result.mappings().one()
        total_sessions = int(row["total_sessions"] or 0)
        confirmed_sessions = int(row["confirmed_sessions"] or 0)
        total_revenue_aud = float(row["total_revenue_aud"] or 0)
        avg_booking_value_aud = float(row["avg_booking_value_aud"] or 0)
        paid_bookings = int(row["paid_bookings"] or 0)

        missed_sessions = max(total_sessions - confirmed_sessions, 0)
        effective_avg = avg_booking_value_aud if avg_booking_value_aud > 0 else 120.0
        missed_revenue_aud = missed_sessions * effective_avg
        capture_rate_pct = (
            round(confirmed_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0.0
        )

        return {
            "period_days": days,
            "sessions_started": total_sessions,
            "bookings_confirmed": confirmed_sessions,
            "capture_rate_pct": capture_rate_pct,
            "total_revenue_aud": total_revenue_aud,
            "avg_booking_value_aud": effective_avg,
            "paid_bookings": paid_bookings,
            "missed_sessions": missed_sessions,
            "missed_revenue_aud": missed_revenue_aud,
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
