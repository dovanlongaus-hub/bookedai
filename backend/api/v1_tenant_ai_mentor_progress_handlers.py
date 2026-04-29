"""Tenant-side handlers for AI Mentor student-progress management.

The AI Mentor tenant workspace (slug ``ai-mentor-doer``) needs two endpoints
to run the academy:

* ``GET  /api/v1/tenants/me/aimentor-students``  -- list every contact who
  has booked at least one mentoring intent under this tenant, with the
  latest progress note.
* ``PATCH /api/v1/tenants/me/aimentor-students/{contact_id}/progress`` --
  append a new ``ai_mentor_student_progress`` row after a session.

Auth re-uses the existing tenant session middleware via
``_resolve_tenant_request_context`` so the same ``Authorization: Bearer``
token issued by the tenant Google login covers these endpoints.

Mirrors ``v1_tenant_chess_progress_handlers`` with AI Mentor-specific
fields (``program_track``, ``skill_level``, ``artifact_url``).
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


_logger = get_logger("bookedai.api.v1_tenant_ai_mentor_progress_handlers")


def _tenant_session_required_error(*, tenant_id: str | None, tenant_ref: str | None) -> AppError:
    return AppError(
        code="tenant_auth_required",
        message="Sign in with an active tenant account before viewing AI Mentor students.",
        status_code=401,
        details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
    )


class TenantAIMentorProgressUpdatePayload(BaseModel):
    session_date: date = Field(..., description="Mentoring session date (ISO).")
    program_track: str | None = Field(default=None)
    skill_level: str | None = Field(default=None)
    attendance: int | None = Field(default=None, ge=0, le=10)
    notes: str | None = Field(default=None)
    next_focus: str | None = Field(default=None)
    artifact_url: str | None = Field(default=None)


async def _list_tenant_aimentor_students(
    session,
    *,
    tenant_id: str,
) -> list[dict[str, object]]:
    """Return every contact who has booked an AI Mentor intent under this tenant."""
    result = await session.execute(
        text(
            """
            with tenant_aimentor_contacts as (
              select distinct
                c.id::text as contact_id,
                c.full_name,
                c.email,
                bi.service_name as last_service_name,
                bi.created_at as last_booking_at
              from contacts c
              join booking_intents bi on bi.contact_id = c.id
              where bi.tenant_id = cast(:tenant_id as uuid)
            ),
            latest_progress as (
              select distinct on (amp.contact_id)
                amp.contact_id::text as contact_id,
                amp.session_date,
                amp.program_track,
                amp.skill_level,
                amp.attendance,
                amp.notes,
                amp.next_focus,
                amp.artifact_url
              from ai_mentor_student_progress amp
              where amp.tenant_id = cast(:tenant_id as uuid)
              order by amp.contact_id, amp.session_date desc, amp.created_at desc
            )
            select
              tc.contact_id,
              tc.full_name,
              tc.email,
              tc.last_service_name as current_program,
              lp.session_date,
              lp.program_track,
              lp.skill_level,
              lp.attendance,
              lp.notes,
              lp.next_focus,
              lp.artifact_url
            from tenant_aimentor_contacts tc
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
                "program_track": record.get("program_track"),
                "skill_level": record.get("skill_level"),
                "attendance": record.get("attendance"),
                "notes": record.get("notes"),
                "next_focus": record.get("next_focus"),
                "artifact_url": record.get("artifact_url"),
            }
        students.append(
            {
                "contact_id": record.get("contact_id"),
                "full_name": record.get("full_name"),
                "email": record.get("email"),
                "current_program": record.get("current_program"),
                "latest_progress": latest_progress,
            }
        )
    return students


async def _insert_aimentor_progress(
    session,
    *,
    tenant_id: str,
    contact_id: str,
    payload: TenantAIMentorProgressUpdatePayload,
    created_by_email: str | None,
) -> dict[str, object] | None:
    result = await session.execute(
        text(
            """
            insert into ai_mentor_student_progress (
              tenant_id,
              contact_id,
              session_date,
              program_track,
              skill_level,
              attendance,
              notes,
              next_focus,
              artifact_url,
              created_by_tenant_user_id
            )
            values (
              cast(:tenant_id as uuid),
              cast(:contact_id as uuid),
              :session_date,
              :program_track,
              :skill_level,
              :attendance,
              :notes,
              :next_focus,
              :artifact_url,
              null
            )
            returning
              id::text as id,
              tenant_id::text as tenant_id,
              contact_id::text as contact_id,
              session_date,
              program_track,
              skill_level,
              attendance,
              notes,
              next_focus,
              artifact_url,
              created_at
            """
        ),
        {
            "tenant_id": tenant_id,
            "contact_id": contact_id,
            "session_date": payload.session_date,
            "program_track": (payload.program_track or "").strip() or None,
            "skill_level": (payload.skill_level or "").strip() or None,
            "attendance": payload.attendance,
            "notes": (payload.notes or "").strip() or None,
            "next_focus": (payload.next_focus or "").strip() or None,
            "artifact_url": (payload.artifact_url or "").strip() or None,
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
        "program_track": record.get("program_track"),
        "skill_level": record.get("skill_level"),
        "attendance": record.get("attendance"),
        "notes": record.get("notes"),
        "next_focus": record.get("next_focus"),
        "artifact_url": record.get("artifact_url"),
        "created_by_email": created_by_email,
    }


async def tenant_aimentor_students_list(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """List every AI Mentor student under the calling tenant."""
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
        students = await _list_tenant_aimentor_students(session, tenant_id=tenant_id)

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


async def tenant_aimentor_student_progress_update(
    contact_id: str,
    request: Request,
    payload: TenantAIMentorProgressUpdatePayload,
    authorization: str | None = Header(default=None),
):
    """Append a new ``ai_mentor_student_progress`` row for ``contact_id``."""
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
                "Contact id is required to record AI Mentor progress.",
                details={"contact_id": ["required"]},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
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
                        code="aimentor_student_contact_not_found",
                        message="The contact could not be found under this tenant.",
                        status_code=404,
                        details={"contact_id": normalized_contact_id},
                    ),
                    tenant_id=tenant_id,
                    actor_context=None,
                )

            created = await _insert_aimentor_progress(
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
                    code="aimentor_student_progress_persistence_failed",
                    message="AI Mentor progress could not be saved.",
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


class TenantAIMentorReservationActionPayload(BaseModel):
    action: str = Field(
        ...,
        description="One of 'complete', 'cancel', 'note'.",
    )
    mentor_notes: str | None = Field(default=None, max_length=4000)


async def _list_tenant_aimentor_reservations(
    session,
    *,
    tenant_id: str,
) -> list[dict[str, object]]:
    """Return every reserved AI Mentor slot under this tenant.

    A "reservation" is a ``service_time_slots`` row with ``reserved_at`` set
    (i.e. the new slot-reserve endpoint hit it). Sorted with upcoming
    first then completed/cancelled at the bottom so the mentor sees what
    needs attention.
    """
    result = await session.execute(
        text(
            """
            select
              sts.id::text as slot_id,
              sts.service_id,
              smp.name as service_name,
              sts.slot_start_at,
              sts.slot_end_at,
              sts.timezone,
              sts.label,
              sts.capacity,
              sts.booked_count,
              sts.reserved_by_email,
              sts.reserved_by_name,
              sts.reserved_by_phone,
              sts.reserved_by_locale,
              sts.booking_reference,
              sts.reserved_at,
              sts.completed_at,
              sts.cancelled_at,
              sts.mentor_notes,
              sts.zoho_meeting_url,
              sts.zoho_calendar_event_id,
              case
                when sts.cancelled_at is not null then 'cancelled'
                when sts.completed_at is not null then 'completed'
                when sts.slot_start_at < now() then 'past_due'
                else 'upcoming'
              end as status
            from service_time_slots sts
            left join service_merchant_profiles smp
              on smp.service_id = sts.service_id
              and smp.tenant_id = sts.tenant_id
            where sts.tenant_id = cast(:tenant_id as uuid)
              and sts.reserved_at is not null
            order by
              case
                when sts.cancelled_at is not null then 3
                when sts.completed_at is not null then 2
                when sts.slot_start_at < now() then 1
                else 0
              end,
              sts.slot_start_at asc
            limit 200
            """
        ),
        {"tenant_id": tenant_id},
    )
    rows: list[dict[str, object]] = []
    for row in result.mappings().all():
        record = dict(row)
        rows.append(
            {
                "slot_id": record.get("slot_id"),
                "service_id": record.get("service_id"),
                "service_name": record.get("service_name") or record.get("service_id"),
                "slot_start_at": (
                    record["slot_start_at"].isoformat()
                    if hasattr(record.get("slot_start_at"), "isoformat")
                    else record.get("slot_start_at")
                ),
                "slot_end_at": (
                    record["slot_end_at"].isoformat()
                    if hasattr(record.get("slot_end_at"), "isoformat")
                    else record.get("slot_end_at")
                ),
                "timezone": record.get("timezone"),
                "label": record.get("label"),
                "capacity": int(record.get("capacity") or 0),
                "booked_count": int(record.get("booked_count") or 0),
                "learner": {
                    "email": record.get("reserved_by_email"),
                    "name": record.get("reserved_by_name"),
                    "phone": record.get("reserved_by_phone"),
                    "locale": record.get("reserved_by_locale"),
                },
                "booking_reference": record.get("booking_reference"),
                "reserved_at": (
                    record["reserved_at"].isoformat()
                    if hasattr(record.get("reserved_at"), "isoformat")
                    else record.get("reserved_at")
                ),
                "completed_at": (
                    record["completed_at"].isoformat()
                    if hasattr(record.get("completed_at"), "isoformat")
                    else record.get("completed_at")
                ),
                "cancelled_at": (
                    record["cancelled_at"].isoformat()
                    if hasattr(record.get("cancelled_at"), "isoformat")
                    else record.get("cancelled_at")
                ),
                "mentor_notes": record.get("mentor_notes"),
                "status": record.get("status"),
                "zoho": {
                    "meeting_url": record.get("zoho_meeting_url"),
                    "calendar_event_id": record.get("zoho_calendar_event_id"),
                },
            }
        )
    return rows


async def tenant_aimentor_reservations_list(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """List every AI Mentor slot reservation under the calling tenant.

    Wired to the Reservations panel in the platform admin shell — mentor
    sees upcoming + past + cancelled at a glance, with the Zoho Meeting
    URL clickable for one-click join.
    """
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
        reservations = await _list_tenant_aimentor_reservations(
            session, tenant_id=tenant_id
        )

    return _success_response(
        {"reservations": reservations},
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


async def tenant_aimentor_reservation_action(
    slot_id: str,
    request: Request,
    payload: TenantAIMentorReservationActionPayload,
    authorization: str | None = Header(default=None),
):
    """Mentor-action on a reservation: complete, cancel, or update notes.

    ``complete`` sets ``completed_at = now()``. ``cancel`` sets
    ``cancelled_at = now()`` and decrements ``booked_count`` so the seat
    becomes available again (idempotent — won't go negative). ``note``
    just updates ``mentor_notes`` without touching lifecycle timestamps.
    """
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

    normalized_action = (payload.action or "").strip().lower()
    if normalized_action not in {"complete", "cancel", "note"}:
        return _error_response(
            ValidationAppError(
                "action must be one of 'complete', 'cancel', 'note'.",
                details={"action": ["invalid"]},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    normalized_slot_id = (slot_id or "").strip()
    if not normalized_slot_id:
        return _error_response(
            ValidationAppError(
                "slot_id is required.",
                details={"slot_id": ["required"]},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            # Tenant-scoped UPDATE so a tenant can't mutate another
            # partner's slots even if they guess the slot uuid.
            if normalized_action == "complete":
                update_sql = """
                    update service_time_slots
                    set completed_at = coalesce(completed_at, now()),
                        mentor_notes = coalesce(:notes, mentor_notes),
                        updated_at = now()
                    where id = cast(:slot_id as uuid)
                      and tenant_id = cast(:tenant_id as uuid)
                    returning id::text as id, completed_at, cancelled_at,
                              mentor_notes, booked_count
                """
            elif normalized_action == "cancel":
                update_sql = """
                    update service_time_slots
                    set cancelled_at = coalesce(cancelled_at, now()),
                        mentor_notes = coalesce(:notes, mentor_notes),
                        booked_count = greatest(0, booked_count - 1),
                        updated_at = now()
                    where id = cast(:slot_id as uuid)
                      and tenant_id = cast(:tenant_id as uuid)
                    returning id::text as id, completed_at, cancelled_at,
                              mentor_notes, booked_count
                """
            else:  # note
                update_sql = """
                    update service_time_slots
                    set mentor_notes = :notes,
                        updated_at = now()
                    where id = cast(:slot_id as uuid)
                      and tenant_id = cast(:tenant_id as uuid)
                    returning id::text as id, completed_at, cancelled_at,
                              mentor_notes, booked_count
                """

            result = await session.execute(
                text(update_sql),
                {
                    "slot_id": normalized_slot_id,
                    "tenant_id": tenant_id,
                    "notes": (payload.mentor_notes or "").strip() or None,
                },
            )
            row = result.mappings().first()
            await session.commit()

        if not row:
            return _error_response(
                AppError(
                    code="aimentor_reservation_not_found",
                    message="The reservation could not be found under this tenant.",
                    status_code=404,
                    details={"slot_id": normalized_slot_id},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        record = dict(row)

        # Best-effort: send appropriate email to the learner with the
        # tenant inbox CC'd. Triggered for ``cancel`` (tells learner +
        # offers re-book CTA) and ``complete`` (thanks learner + feedback
        # link). ``note`` doesn't trigger a learner email — it's a
        # mentor-internal annotation.
        if normalized_action in {"cancel", "complete"} and hasattr(
            request.app.state, "email_service"
        ):
            try:
                async with get_session(request.app.state.session_factory) as session:
                    detail_result = await session.execute(
                        text(
                            """
                            select
                              sts.reserved_by_email,
                              sts.reserved_by_name,
                              sts.reserved_by_locale,
                              sts.booking_reference,
                              sts.slot_start_at,
                              sts.slot_end_at,
                              sts.timezone,
                              smp.name as service_name
                            from service_time_slots sts
                            left join service_merchant_profiles smp
                              on smp.service_id = sts.service_id
                              and smp.tenant_id = sts.tenant_id
                            where sts.id = cast(:slot_id as uuid)
                              and sts.tenant_id = cast(:tenant_id as uuid)
                            limit 1
                            """
                        ),
                        {
                            "slot_id": normalized_slot_id,
                            "tenant_id": tenant_id,
                        },
                    )
                    detail = detail_result.mappings().first()

                if detail and detail.get("reserved_by_email"):
                    from api.v1_booking_handlers import (
                        _send_aimentor_cancellation_email,
                        _send_aimentor_completion_email,
                    )

                    learner_email = str(detail.get("reserved_by_email") or "").strip()
                    learner_name = (
                        str(detail.get("reserved_by_name") or "").strip() or None
                    )
                    booking_reference = (
                        str(detail.get("booking_reference") or "").strip()
                        or "(reference unknown)"
                    )
                    service_name = (
                        str(detail.get("service_name") or "").strip()
                        or "AI Mentor 1-on-1"
                    )
                    locale = (
                        str(detail.get("reserved_by_locale") or "en").strip().lower()
                        or "en"
                    )
                    if normalized_action == "cancel":
                        await _send_aimentor_cancellation_email(
                            email_service=request.app.state.email_service,
                            customer_email=learner_email,
                            customer_name=learner_name,
                            booking_reference=booking_reference,
                            service_name=service_name,
                            slot_start_at=detail.get("slot_start_at"),
                            slot_end_at=detail.get("slot_end_at"),
                            slot_timezone=str(
                                detail.get("timezone") or "Australia/Sydney"
                            ),
                            locale=locale,
                        )
                    else:  # complete
                        await _send_aimentor_completion_email(
                            email_service=request.app.state.email_service,
                            customer_email=learner_email,
                            customer_name=learner_name,
                            booking_reference=booking_reference,
                            service_name=service_name,
                            locale=locale,
                        )
            except Exception:  # noqa: BLE001
                # Email is best-effort — the action result is the source
                # of truth, the email is a follow-up.
                pass

        return _success_response(
            {
                "slot_id": record.get("id"),
                "completed_at": (
                    record["completed_at"].isoformat()
                    if hasattr(record.get("completed_at"), "isoformat")
                    else record.get("completed_at")
                ),
                "cancelled_at": (
                    record["cancelled_at"].isoformat()
                    if hasattr(record.get("cancelled_at"), "isoformat")
                    else record.get("cancelled_at")
                ),
                "mentor_notes": record.get("mentor_notes"),
                "booked_count": int(record.get("booked_count") or 0),
                "action": normalized_action,
            },
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


class TenantAIMentorZohoCredentialsPayload(BaseModel):
    """Tenant-admin form payload for storing AI Mentor Zoho credentials.

    All fields optional so the operator can save partial config (e.g. just
    the user_id + calendar_uid before re-running the OAuth consent flow).
    Empty strings are treated as "leave existing value untouched"; nulls
    mean "clear".
    """

    client_id: str | None = Field(default=None, max_length=200)
    client_secret: str | None = Field(default=None, max_length=400)
    refresh_token: str | None = Field(default=None, max_length=400)
    meeting_user_id: str | None = Field(default=None, max_length=200)
    calendar_uid: str | None = Field(default=None, max_length=200)
    accounts_base_url: str | None = Field(default=None, max_length=200)
    meeting_api_base_url: str | None = Field(default=None, max_length=200)
    calendar_api_base_url: str | None = Field(default=None, max_length=200)


_ZOHO_CREDENTIAL_FIELDS = (
    "client_id",
    "client_secret",
    "refresh_token",
    "meeting_user_id",
    "calendar_uid",
    "accounts_base_url",
    "meeting_api_base_url",
    "calendar_api_base_url",
)


def _mask_credential(value: str | None) -> str | None:
    """Render a Zoho secret as e.g. ``"1000.NK…XQV"`` for display.

    The admin UI never re-displays the full secret after save — operators
    can paste a new value to overwrite. This avoids re-leaking the value
    on every page load.
    """
    if not value:
        return None
    s = str(value).strip()
    if len(s) <= 8:
        return "•" * len(s)
    return f"{s[:5]}…{s[-3:]}"


async def tenant_aimentor_zoho_credentials_get(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Return masked Zoho credentials for the admin form (never raw)."""
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
        row = await session.execute(
            text(
                """
                select settings_json -> 'integrations' -> 'zoho_aimentor' as cfg
                from tenant_settings
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )
        cfg = row.scalar_one_or_none() or {}

    if not isinstance(cfg, dict):
        cfg = {}

    masked = {
        key: _mask_credential(cfg.get(key)) if key in {"client_secret", "refresh_token"} else cfg.get(key)
        for key in _ZOHO_CREDENTIAL_FIELDS
    }
    return _success_response(
        {
            "credentials": masked,
            "configured": bool(cfg.get("refresh_token") and cfg.get("client_id")),
            "saved_at": cfg.get("saved_at"),
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


async def tenant_aimentor_zoho_credentials_save(
    request: Request,
    payload: TenantAIMentorZohoCredentialsPayload,
    authorization: str | None = Header(default=None),
):
    """Persist Zoho credentials into tenant_settings.settings_json.

    Empty-string fields are skipped (existing value preserved). The merge
    happens server-side via JSONB ``||`` so unrelated keys aren't disturbed.
    """
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

    # Build the partial update dict — non-empty strings only. Empty strings
    # / None mean "don't touch this field".
    updates: dict[str, str] = {}
    for key in _ZOHO_CREDENTIAL_FIELDS:
        value = getattr(payload, key, None)
        if value is None:
            continue
        normalised = value.strip()
        if normalised:
            updates[key] = normalised

    if not updates:
        return _error_response(
            ValidationAppError(
                "At least one credential field is required.",
                details={"credentials": ["empty"]},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    # Mark when we last saved so the admin UI can show a "last updated" badge.
    from datetime import UTC, datetime as _dt

    updates["saved_at"] = _dt.now(UTC).isoformat()
    updates["saved_by_email"] = str(tenant_session.get("email") or "") or "unknown"

    try:
        import json as _json

        async with get_session(request.app.state.session_factory) as session:
            # Merge into settings_json -> integrations -> zoho_aimentor
            await session.execute(
                text(
                    """
                    update tenant_settings
                    set settings_json = jsonb_set(
                          coalesce(settings_json, '{}'::jsonb),
                          '{integrations,zoho_aimentor}',
                          coalesce(settings_json -> 'integrations' -> 'zoho_aimentor', '{}'::jsonb)
                            || cast(:patch as jsonb),
                          true
                        ),
                        updated_at = now()
                    where tenant_id = cast(:tenant_id as uuid)
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "patch": _json.dumps(updates),
                },
            )
            await session.commit()
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)

    # Mask before echoing back so we never leak the full value.
    echoed = {
        key: (
            _mask_credential(updates.get(key))
            if key in {"client_secret", "refresh_token"}
            else updates.get(key)
        )
        for key in _ZOHO_CREDENTIAL_FIELDS
    }
    return _success_response(
        {
            "credentials": echoed,
            "saved_at": updates["saved_at"],
            "saved_by_email": updates["saved_by_email"],
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


__all__ = [
    "TenantAIMentorProgressUpdatePayload",
    "TenantAIMentorReservationActionPayload",
    "TenantAIMentorZohoCredentialsPayload",
    "tenant_aimentor_students_list",
    "tenant_aimentor_student_progress_update",
    "tenant_aimentor_reservations_list",
    "tenant_aimentor_reservation_action",
    "tenant_aimentor_zoho_credentials_get",
    "tenant_aimentor_zoho_credentials_save",
]
