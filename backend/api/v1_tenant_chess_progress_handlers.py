"""Tenant-side handlers for chess student-progress management.

GM Mai Hung's tenant workspace (slug ``co-mai-hung-chess-class``) needs two
endpoints to run the chess class:

* ``GET  /api/v1/tenants/me/students``  -- list every contact who has booked
  at least one chess intent under this tenant, with the latest progress note.
* ``PATCH /api/v1/tenants/me/students/{contact_id}/progress`` -- append a new
  ``chess_student_progress`` row after a session.

Auth re-uses the existing tenant session middleware via
``_resolve_tenant_request_context`` so the same ``Authorization: Bearer``
token issued by the tenant Google login covers these endpoints. We restrict
the writes to active members of the calling tenant (the ``tenant_session``
+ membership pair).
"""

from __future__ import annotations

from datetime import date

from fastapi import Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.errors import AppError, ValidationAppError
from core.logging import get_logger
from db import get_session

from api.v1_routes import (
    ActorContextPayload,
    _error_response,
    _resolve_tenant_request_context,
    _success_response,
)


_logger = get_logger("bookedai.api.v1_tenant_chess_progress_handlers")


def _tenant_session_required_error(*, tenant_id: str | None, tenant_ref: str | None) -> AppError:
    return AppError(
        code="tenant_auth_required",
        message="Sign in with an active tenant account before viewing chess students.",
        status_code=401,
        details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
    )


class TenantChessProgressUpdatePayload(BaseModel):
    session_date: date = Field(..., description="Lesson session date (ISO).")
    level: str | None = Field(default=None)
    attendance: int | None = Field(default=None, ge=0, le=10)
    notes: str | None = Field(default=None)
    next_focus: str | None = Field(default=None)


async def _list_tenant_chess_students(
    session,
    *,
    tenant_id: str,
) -> list[dict[str, object]]:
    """Return every contact who has booked a chess intent under this tenant.

    Each student includes their most recent booking + the resolved
    ``meeting_url`` so the tenant operator can quickly copy + share the join
    link. Resolution mirrors :func:`_list_student_bookings`:

    1. ``booking_intents.metadata_json -> 'zoho_meeting' ->> 'meeting_url'``
    2. ``tenant_settings.settings_json ->> 'default_meeting_url'``
    """
    tenant_settings_row = await session.execute(
        text(
            """
            select settings_json
            from tenant_settings
            where tenant_id = cast(:tenant_id as uuid)
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    settings_record = tenant_settings_row.mappings().first()
    tenant_settings = (
        dict(settings_record.get("settings_json") or {})
        if settings_record and isinstance(settings_record.get("settings_json"), dict)
        else {}
    )
    default_meeting_url = str(
        tenant_settings.get("default_meeting_url") or ""
    ).strip()

    result = await session.execute(
        text(
            """
            with tenant_chess_contacts as (
              select distinct
                c.id::text as contact_id,
                c.full_name,
                c.email,
                bi.service_name as last_service_name,
                bi.created_at as last_booking_at,
                bi.metadata_json as last_metadata_json,
                bi.booking_reference as last_booking_reference,
                bi.requested_date as last_requested_date,
                bi.requested_time as last_requested_time
              from contacts c
              join booking_intents bi on bi.contact_id = c.id
              where bi.tenant_id = cast(:tenant_id as uuid)
            ),
            latest_progress as (
              select distinct on (csp.contact_id)
                csp.contact_id::text as contact_id,
                csp.session_date,
                csp.level,
                csp.attendance,
                csp.notes,
                csp.next_focus
              from chess_student_progress csp
              where csp.tenant_id = cast(:tenant_id as uuid)
              order by csp.contact_id, csp.session_date desc, csp.created_at desc
            )
            select
              tc.contact_id,
              tc.full_name,
              tc.email,
              tc.last_service_name as current_program,
              tc.last_booking_reference,
              tc.last_metadata_json,
              tc.last_requested_date,
              tc.last_requested_time,
              lp.session_date,
              lp.level,
              lp.attendance,
              lp.notes,
              lp.next_focus
            from tenant_chess_contacts tc
            left join latest_progress lp on lp.contact_id = tc.contact_id
            order by tc.last_booking_at desc nulls last
            """
        ),
        {"tenant_id": tenant_id},
    )
    students: list[dict[str, object]] = []
    for row in result.mappings().all():
        record = dict(row)
        latest_progress = None
        if record.get("session_date") is not None:
            latest_progress = {
                "session_date": (
                    record["session_date"].isoformat()
                    if hasattr(record["session_date"], "isoformat")
                    else record["session_date"]
                ),
                "level": record.get("level"),
                "attendance": record.get("attendance"),
                "notes": record.get("notes"),
                "next_focus": record.get("next_focus"),
            }
        last_metadata = record.get("last_metadata_json") or {}
        zoho_meeting = (
            last_metadata.get("zoho_meeting")
            if isinstance(last_metadata, dict)
            else None
        )
        meeting_url = ""
        calendar_event_url: str | None = None
        if isinstance(zoho_meeting, dict):
            meeting_url = str(zoho_meeting.get("meeting_url") or "").strip()
            calendar_event_url = (
                str(zoho_meeting.get("calendar_event_url") or "").strip() or None
            )
        if not meeting_url and default_meeting_url:
            meeting_url = default_meeting_url

        last_requested_date = record.get("last_requested_date")
        latest_booking = {
            "booking_reference": record.get("last_booking_reference"),
            "requested_date": (
                last_requested_date.isoformat()
                if hasattr(last_requested_date, "isoformat")
                else last_requested_date
            ),
            "requested_time": record.get("last_requested_time"),
            "meeting_url": meeting_url or None,
            "calendar_event_url": calendar_event_url,
        }

        students.append(
            {
                "contact_id": record.get("contact_id"),
                "full_name": record.get("full_name"),
                "email": record.get("email"),
                "current_program": record.get("current_program"),
                "latest_progress": latest_progress,
                "latest_booking": latest_booking,
                "meeting_url": meeting_url or None,
            }
        )
    return students


async def _insert_chess_progress(
    session,
    *,
    tenant_id: str,
    contact_id: str,
    payload: TenantChessProgressUpdatePayload,
    created_by_email: str | None,
) -> dict[str, object] | None:
    result = await session.execute(
        text(
            """
            insert into chess_student_progress (
              tenant_id,
              contact_id,
              session_date,
              level,
              attendance,
              notes,
              next_focus,
              created_by_tenant_user_id
            )
            values (
              cast(:tenant_id as uuid),
              cast(:contact_id as uuid),
              :session_date,
              :level,
              :attendance,
              :notes,
              :next_focus,
              null
            )
            returning
              id::text as id,
              tenant_id::text as tenant_id,
              contact_id::text as contact_id,
              session_date,
              level,
              attendance,
              notes,
              next_focus,
              created_at
            """
        ),
        {
            "tenant_id": tenant_id,
            "contact_id": contact_id,
            "session_date": payload.session_date,
            "level": (payload.level or "").strip() or None,
            "attendance": payload.attendance,
            "notes": (payload.notes or "").strip() or None,
            "next_focus": (payload.next_focus or "").strip() or None,
        },
    )
    row = result.mappings().first()
    if not row:
        return None
    record = dict(row)
    return {
        "id": record.get("id"),
        "tenant_id": record.get("tenant_id"),
        "contact_id": record.get("contact_id"),
        "session_date": (
            record["session_date"].isoformat()
            if hasattr(record.get("session_date"), "isoformat")
            else record.get("session_date")
        ),
        "level": record.get("level"),
        "attendance": record.get("attendance"),
        "notes": record.get("notes"),
        "next_focus": record.get("next_focus"),
        "created_by_email": created_by_email,
    }


async def tenant_chess_students_list(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """List every chess student under the calling tenant."""
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            _tenant_session_required_error(tenant_id=tenant_id, tenant_ref=tenant_ref),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_not_found",
                message="The requested tenant could not be resolved.",
                status_code=404,
                details={"tenant_ref": tenant_ref},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        students = await _list_tenant_chess_students(session, tenant_id=tenant_id)

    return _success_response(
        {"students": students},
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


async def tenant_chess_student_progress_update(
    contact_id: str,
    request: Request,
    payload: TenantChessProgressUpdatePayload,
    authorization: str | None = Header(default=None),
):
    """Append a new ``chess_student_progress`` row for ``contact_id``."""
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            _tenant_session_required_error(tenant_id=tenant_id, tenant_ref=tenant_ref),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_not_found",
                message="The requested tenant could not be resolved.",
                status_code=404,
                details={"tenant_ref": tenant_ref},
            ),
            tenant_id=None,
            actor_context=None,
        )

    normalized_contact_id = (contact_id or "").strip()
    if not normalized_contact_id:
        return _error_response(
            ValidationAppError(
                "Contact id is required to record chess progress.",
                details={"contact_id": ["required"]},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            # Ensure the contact actually belongs to this tenant before
            # appending progress — defence in depth on top of the membership
            # check the session middleware already enforces.
            ownership = await session.execute(
                text(
                    """
                    select c.id::text as contact_id
                    from contacts c
                    where c.id = cast(:contact_id as uuid)
                      and c.tenant_id = cast(:tenant_id as uuid)
                    limit 1
                    """
                ),
                {
                    "contact_id": normalized_contact_id,
                    "tenant_id": tenant_id,
                },
            )
            owned = ownership.scalar_one_or_none()
            if not owned:
                return _error_response(
                    AppError(
                        code="chess_student_contact_not_found",
                        message="The contact could not be found under this tenant.",
                        status_code=404,
                        details={"contact_id": normalized_contact_id},
                    ),
                    tenant_id=tenant_id,
                    actor_context=None,
                )

            created = await _insert_chess_progress(
                session,
                tenant_id=tenant_id,
                contact_id=normalized_contact_id,
                payload=payload,
                created_by_email=str(tenant_session.get("email") or "") or None,
            )
            await session.commit()

        if not created:
            return _error_response(
                AppError(
                    code="chess_student_progress_persistence_failed",
                    message="Chess progress could not be saved.",
                    status_code=500,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        return _success_response(
            {"progress": created},
            tenant_id=tenant_id,
            actor_context=ActorContextPayload(
                channel="tenant_app",
                tenant_id=tenant_id,
                role="tenant_admin",
                deployment_mode="standalone_app",
            ),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


__all__ = [
    "TenantChessProgressUpdatePayload",
    "tenant_chess_students_list",
    "tenant_chess_student_progress_update",
]
