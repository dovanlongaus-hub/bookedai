from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import text

from core.feature_flags import is_flag_enabled
from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.tenant_repository import TenantRepository
from repositories.conversation_repository import ConversationRepository
from service_layer.communication_service import render_bookedai_confirmation_email
from service_layer.admin_booking_shadow_service import build_admin_booking_shadow_summary
from service_layer.admin_presenters import (
    build_booking_record,
    build_timeline_event,
    filter_booking_records,
    merge_booking_records,
)


async def get_admin_bookings_view_state(session) -> bool:
    tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()
    return await is_flag_enabled(
        "new_admin_bookings_view",
        session=session,
        tenant_id=tenant_id,
    )


async def build_admin_portal_support_queue(
    session,
    *,
    limit: int = 6,
) -> list[dict[str, object | None]]:
    portal_result = await session.execute(
        text(
            """
            select
              a.id,
              a.event_type,
              a.payload,
              a.created_at::text as created_at,
              bi.booking_reference,
              bi.status as booking_status,
              o.id as outbox_event_id,
              o.status as outbox_status,
              o.available_at::text as outbox_available_at,
              r.event_type as resolution_event_type,
              r.actor_id as resolved_by,
              r.created_at::text as resolved_at,
              r.payload as resolution_payload
            from audit_logs a
            left join booking_intents bi
              on bi.id::text = a.entity_id
            left join lateral (
              select
                id,
                status,
                available_at
              from outbox_events
              where aggregate_id = a.entity_id
                and event_type = a.event_type
              order by created_at desc, id desc
              limit 1
            ) o on true
            left join lateral (
              select
                event_type,
                actor_id,
                created_at,
                payload
              from audit_logs
              where entity_type = 'portal_support_request'
                and entity_id = cast(a.id as text)
                and event_type in (
                  'portal.support.reviewed',
                  'portal.support.escalated'
                )
              order by created_at desc, id desc
              limit 1
            ) r on true
            where a.event_type in (
              'portal.reschedule_request.requested',
              'portal.cancel_request.requested'
            )
            order by a.created_at desc, a.id desc
            limit :limit
            """
        ),
        {"limit": max(limit, 1)},
    )
    items: list[dict[str, object | None]] = []
    for row in portal_result.mappings().all():
        payload = dict(row.get("payload") or {})
        resolution_payload = dict(row.get("resolution_payload") or {})
        request_type = str(payload.get("request_type") or row.get("event_type") or "").strip()
        resolution_event_type = str(row.get("resolution_event_type") or "").strip()
        items.append(
            {
                "queue_item_id": f"portal:{int(row.get('id') or 0)}",
                "id": int(row.get("id") or 0),
                "source_kind": "portal_request",
                "request_type": request_type.replace("_", " "),
                "booking_reference": row.get("booking_reference") or payload.get("booking_reference"),
                "booking_status": row.get("booking_status"),
                "service_name": payload.get("service_name"),
                "business_name": payload.get("business_name"),
                "customer_name": payload.get("customer_name"),
                "customer_email": payload.get("customer_email"),
                "support_email": payload.get("support_email"),
                "preferred_date": payload.get("preferred_date"),
                "preferred_time": payload.get("preferred_time"),
                "timezone": payload.get("timezone"),
                "customer_note": payload.get("customer_note"),
                "created_at": str(row.get("created_at") or ""),
                "outbox_event_id": row.get("outbox_event_id"),
                "outbox_status": row.get("outbox_status"),
                "outbox_available_at": row.get("outbox_available_at"),
                "resolution_status": (
                    resolution_event_type.replace("portal.support.", "").replace("_", " ")
                    if resolution_event_type
                    else None
                ),
                "resolution_note": resolution_payload.get("note"),
                "resolved_at": row.get("resolved_at"),
                "resolved_by": row.get("resolved_by"),
                "action_request_id": int(row.get("id") or 0),
            }
        )

    payment_result = await session.execute(
        text(
            """
            select
              pi.id::text as payment_intent_id,
              pi.status as payment_status,
              pi.amount_aud,
              pi.currency,
              pi.payment_url,
              pi.updated_at::text as updated_at,
              pi.metadata_json,
              bi.booking_reference,
              bi.status as booking_status,
              coalesce(c.full_name, pi.metadata_json->>'customer_name') as customer_name,
              coalesce(c.email, pi.metadata_json->>'customer_email') as customer_email,
              smp.name as service_name,
              smp.business_name,
              coalesce(smp.business_email, 'support@bookedai.au') as support_email
            from payment_intents pi
            join booking_intents bi
              on bi.id = pi.booking_intent_id
            left join contacts c
              on c.id = bi.contact_id
            left join service_merchant_profiles smp
              on smp.service_id = bi.service_id
            where pi.status in ('failed', 'requires_action', 'payment_follow_up_required')
            order by pi.updated_at desc nulls last, pi.created_at desc nulls last
            limit :limit
            """
        ),
        {"limit": max(limit, 1)},
    )
    for row in payment_result.mappings().all():
        metadata = dict(row.get("metadata_json") or {})
        payment_status = str(row.get("payment_status") or "").strip()
        detail_note = (
            metadata.get("failure_reason")
            or metadata.get("operator_note")
            or metadata.get("status_detail")
            or "Payment is not yet in a settled state and needs operator review."
        )
        items.append(
            {
                "queue_item_id": f"payment:{str(row.get('payment_intent_id') or '').strip()}",
                "id": 0,
                "source_kind": "payment_attention",
                "request_type": "payment attention",
                "booking_reference": row.get("booking_reference"),
                "booking_status": row.get("booking_status"),
                "service_name": row.get("service_name"),
                "business_name": row.get("business_name"),
                "customer_name": row.get("customer_name"),
                "customer_email": row.get("customer_email"),
                "support_email": row.get("support_email"),
                "preferred_date": None,
                "preferred_time": None,
                "timezone": None,
                "customer_note": str(detail_note),
                "created_at": str(row.get("updated_at") or ""),
                "outbox_event_id": None,
                "outbox_status": payment_status,
                "outbox_available_at": None,
                "resolution_status": None,
                "resolution_note": None,
                "resolved_at": None,
                "resolved_by": None,
                "action_request_id": None,
            }
        )
    items.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
    items = items[: max(limit, 1) * 2]
    return items


async def apply_admin_portal_support_action(
    session,
    *,
    request_id: int,
    action: str,
    actor_id: str,
    note: str | None = None,
) -> dict[str, object]:
    normalized_action = action.strip().lower()
    if normalized_action not in {"reviewed", "escalated"}:
        raise ValueError("Unsupported portal support action")

    request_result = await session.execute(
        text(
            """
            select
              id,
              tenant_id::text as tenant_id,
              event_type,
              entity_id,
              payload
            from audit_logs
            where id = :request_id
              and event_type in (
                'portal.reschedule_request.requested',
                'portal.cancel_request.requested'
              )
            limit 1
            """
        ),
        {"request_id": request_id},
    )
    request_row = request_result.mappings().first()
    if not request_row:
        raise LookupError("Portal support request was not found")

    audit_repository = AuditLogRepository(
        RepositoryContext(session=session, tenant_id=str(request_row.get("tenant_id") or "").strip() or None)
    )
    payload = dict(request_row.get("payload") or {})
    await audit_repository.append_entry(
        tenant_id=str(request_row.get("tenant_id") or "").strip() or None,
        event_type=f"portal.support.{normalized_action}",
        entity_type="portal_support_request",
        entity_id=str(request_id),
        actor_type="admin_operator",
        actor_id=actor_id,
        payload={
            "note": (note or "").strip() or None,
            "booking_reference": payload.get("booking_reference"),
            "request_type": payload.get("request_type"),
        },
    )
    return {
        "status": "ok",
        "request_id": request_id,
        "action": normalized_action,
        "message": (
            "Portal support request marked as reviewed."
            if normalized_action == "reviewed"
            else "Portal support request escalated for follow-up."
        ),
    }


async def _get_revenue_funnel_summary(session) -> dict[str, int | float]:
    """Quick revenue funnel for the admin overview — queries conversation_events directly."""
    try:
        result = await session.execute(
            text(
                """
                select
                  count(*) as total_sessions,
                  count(*) filter (where workflow_status = 'triggered') as confirmed_sessions
                from conversation_events
                where source = 'booking_assistant'
                  and event_type = 'booking_session_created'
                  and created_at >= now() - interval '30 days'
                """
            )
        )
        row = result.mappings().one()
        total = int(row["total_sessions"] or 0)
        confirmed = int(row["confirmed_sessions"] or 0)
        missed = max(total - confirmed, 0)
        avg_value = 120.0
        return {
            "total_sessions": total,
            "confirmed_sessions": confirmed,
            "missed_sessions": missed,
            "missed_revenue_aud": missed * avg_value,
            "capture_rate_pct": round(confirmed / total * 100, 1) if total > 0 else 0.0,
        }
    except Exception:
        return {
            "total_sessions": 0,
            "confirmed_sessions": 0,
            "missed_sessions": 0,
            "missed_revenue_aud": 0.0,
            "capture_rate_pct": 0.0,
        }


async def build_admin_overview_payload(session) -> tuple[dict[str, object], bool]:
    conversation_repository = ConversationRepository(RepositoryContext(session=session))
    bookings_view_enabled = await get_admin_bookings_view_state(session)
    booking_events = await conversation_repository.list_booking_feed_events()
    recent_events = await conversation_repository.list_recent_events(limit=8)
    portal_support_queue = await build_admin_portal_support_queue(session, limit=6)
    total_callbacks = await conversation_repository.count_events_by_type("booking_callback")
    revenue_funnel = await _get_revenue_funnel_summary(session)

    all_bookings = merge_booking_records(booking_events)
    total_bookings = len(all_bookings)
    pending_email = sum(
        1 for item in all_bookings if item.get("email_status") == "pending_manual_followup"
    )
    ready_for_checkout = sum(
        1 for item in all_bookings if item.get("payment_status") == "stripe_checkout_ready"
    )
    portal_queue_count = len(portal_support_queue)

    capture_rate = revenue_funnel["capture_rate_pct"]
    missed_aud = revenue_funnel["missed_revenue_aud"]

    return (
        {
            "status": "ok",
            "metrics": [
                {"label": "Bookings captured", "value": str(total_bookings or 0), "tone": "info"},
                {
                    "label": "AI capture rate (30d)",
                    "value": f"{capture_rate}%",
                    "tone": "success" if capture_rate >= 60 else "warning",
                },
                {
                    "label": "Missed revenue (30d)",
                    "value": f"${missed_aud:,.0f}",
                    "tone": "warning" if missed_aud > 0 else "neutral",
                },
                {
                    "label": "Stripe-ready checkouts",
                    "value": str(ready_for_checkout or 0),
                    "tone": "success",
                },
                {
                    "label": "Pending email follow-up",
                    "value": str(pending_email or 0),
                    "tone": "warning",
                },
                {
                    "label": "Portal support queue",
                    "value": str(portal_queue_count or 0),
                    "tone": "warning" if portal_queue_count else "neutral",
                },
                {
                    "label": "n8n callbacks logged",
                    "value": str(total_callbacks or 0),
                    "tone": "neutral",
                },
            ],
            "recent_bookings": all_bookings[:8],
            "recent_events": [build_timeline_event(item) for item in recent_events],
            "portal_support_queue": portal_support_queue,
            "revenue_funnel": revenue_funnel,
        },
        bookings_view_enabled,
    )


async def build_admin_bookings_payload(
    session,
    *,
    limit: int,
    offset: int,
    query: str | None = None,
    industry: str | None = None,
    payment_status: str | None = None,
    email_status: str | None = None,
    workflow_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> tuple[dict[str, object], bool]:
    conversation_repository = ConversationRepository(RepositoryContext(session=session))
    bookings_view_enabled = await get_admin_bookings_view_state(session)
    events = await conversation_repository.list_booking_feed_events()

    records = filter_booking_records(
        merge_booking_records(events),
        query=query,
        industry=industry,
        payment_status=payment_status,
        email_status=email_status,
        workflow_status=workflow_status,
        date_from=date_from,
        date_to=date_to,
    )
    total = len(records)
    items = records[offset : offset + limit]

    return (
        {
            "status": "ok",
            "total": total or 0,
            "items": items,
        },
        bookings_view_enabled,
    )


async def build_admin_bookings_shadow_summary(
    session,
    *,
    legacy_records: list[dict[str, object | None]],
    limit: int = 100,
) -> dict[str, int | str]:
    tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()
    shadow_enabled = await is_flag_enabled(
        "admin_booking_read_shadow_compare",
        session=session,
        tenant_id=tenant_id,
    )
    if not shadow_enabled:
        return {
            "status": "disabled",
            "matched_count": 0,
            "mismatch_count": 0,
            "missing_count": 0,
        }

    return await build_admin_booking_shadow_summary(
        session,
        tenant_id=tenant_id,
        legacy_records=legacy_records,
        limit=limit,
    )


async def build_admin_booking_detail_payload(
    session,
    *,
    booking_reference: str,
) -> dict[str, object]:
    conversation_repository = ConversationRepository(RepositoryContext(session=session))
    events = await conversation_repository.list_events_by_conversation_id(booking_reference)
    if not events:
        raise LookupError("Booking was not found")

    primary = next((item for item in events if item.event_type == "booking_session_created"), events[0])
    return {
        "status": "ok",
        "booking": build_booking_record(primary),
        "events": [build_timeline_event(item) for item in events],
    }


async def send_admin_booking_confirmation_email(
    session,
    *,
    booking_reference: str,
    note: str | None,
    email_service,
    booking_business_email: str,
) -> dict[str, str]:
    conversation_repository = ConversationRepository(RepositoryContext(session=session))
    events = await conversation_repository.list_events_by_conversation_id(booking_reference)
    if not events:
        raise LookupError("Booking was not found")

    booking = merge_booking_records(events)[0]
    recipient = str(booking.get("customer_email") or "").strip()
    if not recipient:
        raise ValueError("Booking does not include a customer email")

    business_recipient = (
        str(booking.get("business_email") or "").strip().lower() or booking_business_email
    )
    cc_recipients = [
        email
        for email in [business_recipient, booking_business_email]
        if email and email.lower() != recipient.lower()
    ]
    rendered_email = render_bookedai_confirmation_email(
        variables={
            "customer_name": str(booking.get("customer_name") or "there"),
            "service_name": str(booking.get("service_name") or "Bookedai.au booking"),
            "slot_label": " ".join(
                part
                for part in [
                    str(booking.get("requested_date") or "").strip(),
                    str(booking.get("requested_time") or "").strip(),
                ]
                if part
            )
            or "To be confirmed",
            "timezone": str(booking.get("timezone") or "Australia/Sydney"),
            "booking_reference": booking_reference,
            "business_name": business_recipient,
            "venue_name": str(booking.get("service_name") or business_recipient),
            "support_email": business_recipient,
            "payment_link": str(booking.get("payment_url") or ""),
            "manage_link": str(booking.get("payment_url") or ""),
            "additional_note": note.strip() if note else "",
        },
        public_app_url="https://bookedai.au",
    )

    try:
        await email_service.send_email(
            to=[recipient],
            cc=cc_recipients,
            subject=rendered_email.subject,
            text=rendered_email.text,
            html=rendered_email.html,
        )
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SMTP send failed: {exc}") from exc

    return {"status": "sent", "message": "Confirmation email accepted by SMTP server"}
