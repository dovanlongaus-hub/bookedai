"""Future Swim coach ops handlers (Phase 3.2B).

The futureswim.bookedai.au coaches use these endpoints from a small
ops surface to record per-lesson progress notes and per-period evaluations
for the children whose centres they teach at. Auth is a bare Bearer token
stored on ``futureswim_coach_users.login_token`` — Phase 3.3 will swap in
a magic-email-code login analogous to the parent portal (Phase 3.2A).

Endpoints (all under ``/api/v1/futureswim/coach``):

  - ``GET  /students``                       list students at the coach's
                                             assigned centres
  - ``POST /students/{id}/progress``         insert one row into
                                             ``futureswim_student_progress``
  - ``POST /students/{id}/evaluation``       insert one row into
                                             ``futureswim_teacher_evaluations``

A coach may write only for students whose ``centre_code`` is in their
``assigned_centre_codes`` JSONB list, with the special value ``"*"``
granting write access at every centre (used for area-managers).
"""

from __future__ import annotations

import json
from datetime import date as date_type
from typing import Any

from fastapi import Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.errors import AppError
from core.logging import get_logger
from db import get_session

from api.v1_routes import _error_response, _success_response


_logger = get_logger("bookedai.api.v1_futureswim_coach_handlers")


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    raw = authorization.strip()
    if raw.lower().startswith("bearer "):
        return raw[7:].strip() or None
    return raw or None


def _isoformat_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, date_type):
        return value.isoformat()
    return str(value)


def _isoformat_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _normalise_assigned_centres(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except (TypeError, ValueError):
            return []
        if not isinstance(parsed, list):
            return []
        items = parsed
    else:
        return []
    return [str(item) for item in items if item is not None]


def _coach_can_write_centre(coach_row: dict[str, Any], centre_code: str | None) -> bool:
    centres = _normalise_assigned_centres(coach_row.get("assigned_centre_codes"))
    if "*" in centres:
        return True
    if not centre_code:
        return False
    return centre_code in centres


def _coach_payload(coach_row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(coach_row["id"]),
        "email": coach_row["email"],
        "full_name": coach_row.get("full_name"),
        "coach_initials": coach_row.get("coach_initials"),
        "assigned_centre_codes": _normalise_assigned_centres(
            coach_row.get("assigned_centre_codes")
        ),
    }


async def _require_coach(
    request: Request, authorization: str | None
) -> dict[str, Any] | Any:
    """Resolve the coach for ``Authorization: Bearer <token>``.

    Returns the coach row mapping on success, or a JSONResponse error on
    failure that the caller MUST return verbatim.
    """

    token = _extract_bearer_token(authorization)
    if not token:
        return _error_response(
            AppError(
                code="coach_auth_required",
                message="Sign in with your Future Swim coach token to use this endpoint.",
                status_code=401,
                details={},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        coach_row = (
            await session.execute(
                text(
                    """
                    select id, email, full_name, coach_initials, phone,
                           assigned_centre_codes, is_active,
                           login_token_expires_at
                      from futureswim_coach_users
                     where login_token = :token
                       and is_active = 1
                       and (login_token_expires_at is null
                            or login_token_expires_at > now())
                     limit 1
                    """
                ),
                {"token": token},
            )
        ).mappings().first()

        if coach_row is None:
            return _error_response(
                AppError(
                    code="invalid_or_expired_coach_token",
                    message="Your Future Swim coach token is invalid or has expired. Ask the centre manager to reissue it.",
                    status_code=401,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )

        await session.execute(
            text(
                "update futureswim_coach_users set last_login_at = now(), updated_at = now() where id = :id"
            ),
            {"id": str(coach_row["id"])},
        )
        await session.commit()

    return dict(coach_row)


async def _load_student(session, student_id: str) -> dict[str, Any] | None:
    return (
        await session.execute(
            text(
                """
                select sp.id, sp.parent_id, sp.full_name, sp.centre_code,
                       sp.current_level_code, sp.is_active,
                       pu.email as parent_email
                  from futureswim_student_profiles sp
             left join futureswim_parent_users pu
                    on pu.id = sp.parent_id
                 where sp.id = :id
                 limit 1
                """
            ),
            {"id": student_id},
        )
    ).mappings().first()


async def _last_session_date(session, student_id: str) -> Any:
    row = (
        await session.execute(
            text(
                """
                select max(session_date) as last_session_date
                  from futureswim_student_progress
                 where student_id = :student_id
                """
            ),
            {"student_id": student_id},
        )
    ).mappings().first()
    return row["last_session_date"] if row else None


# ---------------------------------------------------------------------------
# Pydantic payloads
# ---------------------------------------------------------------------------


class CoachProgressEntryPayload(BaseModel):
    session_date: date_type
    level_code: str | None = None
    centre_code: str | None = None
    attendance: int | None = Field(default=None, ge=0, le=2)
    focus_skill: str | None = None
    notes_md: str | None = None


class CoachEvaluationPayload(BaseModel):
    evaluated_at: date_type
    level_code: str | None = None
    level_outcome: str | None = None
    strengths_md: str | None = None
    areas_to_work_on_md: str | None = None
    next_step_level_code: str | None = None
    next_step_summary: str | None = None


# ---------------------------------------------------------------------------
# endpoint: list students at coach's centres
# ---------------------------------------------------------------------------


async def futureswim_coach_students_list(
    request: Request,
    authorization: str | None = Header(default=None),
):
    coach_or_error = await _require_coach(request, authorization)
    if not isinstance(coach_or_error, dict):
        return coach_or_error
    coach_row = coach_or_error

    centres = _normalise_assigned_centres(coach_row.get("assigned_centre_codes"))
    wildcard = "*" in centres

    async with get_session(request.app.state.session_factory) as session:
        if wildcard:
            student_rows = (
                await session.execute(
                    text(
                        """
                        select sp.id, sp.parent_id, sp.full_name,
                               sp.date_of_birth, sp.centre_code,
                               sp.current_level_code, sp.enrolled_since,
                               sp.notes_for_coach,
                               pu.email as parent_email,
                               pu.full_name as parent_full_name
                          from futureswim_student_profiles sp
                     left join futureswim_parent_users pu
                            on pu.id = sp.parent_id
                         where sp.is_active = 1
                         order by sp.centre_code asc nulls last,
                                  sp.full_name asc
                        """
                    )
                )
            ).mappings().all()
        else:
            if not centres:
                return _success_response(
                    {"coach": _coach_payload(coach_row), "students": []},
                    tenant_id=None,
                    actor_context=None,
                )
            student_rows = (
                await session.execute(
                    text(
                        """
                        select sp.id, sp.parent_id, sp.full_name,
                               sp.date_of_birth, sp.centre_code,
                               sp.current_level_code, sp.enrolled_since,
                               sp.notes_for_coach,
                               pu.email as parent_email,
                               pu.full_name as parent_full_name
                          from futureswim_student_profiles sp
                     left join futureswim_parent_users pu
                            on pu.id = sp.parent_id
                         where sp.is_active = 1
                           and sp.centre_code = any(:centres)
                         order by sp.centre_code asc nulls last,
                                  sp.full_name asc
                        """
                    ),
                    {"centres": centres},
                )
            ).mappings().all()

        students_payload: list[dict[str, Any]] = []
        for student in student_rows:
            student_id = str(student["id"])
            last_session_date = await _last_session_date(session, student_id)
            students_payload.append(
                {
                    "id": student_id,
                    "parent_id": str(student["parent_id"]) if student["parent_id"] else None,
                    "parent_email": student.get("parent_email"),
                    "parent_full_name": student.get("parent_full_name"),
                    "full_name": student["full_name"],
                    "date_of_birth": _isoformat_date(student["date_of_birth"]),
                    "centre_code": student["centre_code"],
                    "current_level_code": student["current_level_code"],
                    "enrolled_since": _isoformat_date(student["enrolled_since"]),
                    "notes_for_coach": student["notes_for_coach"],
                    "last_session_date": _isoformat_date(last_session_date),
                }
            )

    return _success_response(
        {
            "coach": _coach_payload(coach_row),
            "students": students_payload,
        },
        tenant_id=None,
        actor_context=None,
    )


# ---------------------------------------------------------------------------
# endpoint: write a per-lesson progress entry
# ---------------------------------------------------------------------------


async def futureswim_coach_write_progress(
    request: Request,
    student_id: str,
    payload: CoachProgressEntryPayload,
    authorization: str | None = Header(default=None),
):
    coach_or_error = await _require_coach(request, authorization)
    if not isinstance(coach_or_error, dict):
        return coach_or_error
    coach_row = coach_or_error

    async with get_session(request.app.state.session_factory) as session:
        student = await _load_student(session, student_id)
        if student is None or student.get("is_active") != 1:
            return _error_response(
                AppError(
                    code="student_not_found",
                    message="That student is not on the Future Swim active roster.",
                    status_code=404,
                    details={"student_id": student_id},
                ),
                tenant_id=None,
                actor_context=None,
            )

        effective_centre = (payload.centre_code or student.get("centre_code") or "").strip() or None
        if not _coach_can_write_centre(coach_row, effective_centre):
            return _error_response(
                AppError(
                    code="centre_not_assigned",
                    message="Your coach account is not assigned to this student's centre.",
                    status_code=403,
                    details={
                        "student_centre_code": effective_centre,
                        "assigned_centre_codes": _normalise_assigned_centres(
                            coach_row.get("assigned_centre_codes")
                        ),
                    },
                ),
                tenant_id=None,
                actor_context=None,
            )

        effective_level = (
            payload.level_code or student.get("current_level_code") or None
        )

        inserted = (
            await session.execute(
                text(
                    """
                    insert into futureswim_student_progress (
                      student_id, session_date, centre_code, level_code,
                      attendance, focus_skill, notes_md, coach_initials
                    )
                    values (
                      :student_id, :session_date, :centre_code, :level_code,
                      :attendance, :focus_skill, :notes_md, :coach_initials
                    )
                    returning id, student_id, session_date, centre_code,
                              level_code, attendance, focus_skill, notes_md,
                              coach_initials, created_at
                    """
                ),
                {
                    "student_id": str(student["id"]),
                    "session_date": payload.session_date,
                    "centre_code": effective_centre,
                    "level_code": effective_level,
                    "attendance": payload.attendance,
                    "focus_skill": payload.focus_skill,
                    "notes_md": payload.notes_md,
                    "coach_initials": coach_row.get("coach_initials"),
                },
            )
        ).mappings().first()
        await session.commit()

    return _success_response(
        {
            "progress_entry": {
                "id": str(inserted["id"]),
                "student_id": str(inserted["student_id"]),
                "session_date": _isoformat_date(inserted["session_date"]),
                "centre_code": inserted["centre_code"],
                "level_code": inserted["level_code"],
                "attendance": inserted["attendance"],
                "focus_skill": inserted["focus_skill"],
                "notes_md": inserted["notes_md"],
                "coach_initials": inserted["coach_initials"],
                "created_at": _isoformat_datetime(inserted["created_at"]),
            }
        },
        tenant_id=None,
        actor_context=None,
    )


# ---------------------------------------------------------------------------
# endpoint: write a per-period evaluation
# ---------------------------------------------------------------------------


async def futureswim_coach_write_evaluation(
    request: Request,
    student_id: str,
    payload: CoachEvaluationPayload,
    authorization: str | None = Header(default=None),
):
    coach_or_error = await _require_coach(request, authorization)
    if not isinstance(coach_or_error, dict):
        return coach_or_error
    coach_row = coach_or_error

    async with get_session(request.app.state.session_factory) as session:
        student = await _load_student(session, student_id)
        if student is None or student.get("is_active") != 1:
            return _error_response(
                AppError(
                    code="student_not_found",
                    message="That student is not on the Future Swim active roster.",
                    status_code=404,
                    details={"student_id": student_id},
                ),
                tenant_id=None,
                actor_context=None,
            )

        student_centre = (student.get("centre_code") or "").strip() or None
        if not _coach_can_write_centre(coach_row, student_centre):
            return _error_response(
                AppError(
                    code="centre_not_assigned",
                    message="Your coach account is not assigned to this student's centre.",
                    status_code=403,
                    details={
                        "student_centre_code": student_centre,
                        "assigned_centre_codes": _normalise_assigned_centres(
                            coach_row.get("assigned_centre_codes")
                        ),
                    },
                ),
                tenant_id=None,
                actor_context=None,
            )

        effective_level = (
            payload.level_code or student.get("current_level_code") or None
        )

        inserted = (
            await session.execute(
                text(
                    """
                    insert into futureswim_teacher_evaluations (
                      student_id, evaluated_at, level_code, level_outcome,
                      strengths_md, areas_to_work_on_md,
                      next_step_level_code, next_step_summary, coach_initials
                    )
                    values (
                      :student_id, :evaluated_at, :level_code, :level_outcome,
                      :strengths_md, :areas_to_work_on_md,
                      :next_step_level_code, :next_step_summary, :coach_initials
                    )
                    returning id, student_id, evaluated_at, level_code,
                              level_outcome, strengths_md, areas_to_work_on_md,
                              next_step_level_code, next_step_summary,
                              coach_initials, created_at
                    """
                ),
                {
                    "student_id": str(student["id"]),
                    "evaluated_at": payload.evaluated_at,
                    "level_code": effective_level,
                    "level_outcome": payload.level_outcome,
                    "strengths_md": payload.strengths_md,
                    "areas_to_work_on_md": payload.areas_to_work_on_md,
                    "next_step_level_code": payload.next_step_level_code,
                    "next_step_summary": payload.next_step_summary,
                    "coach_initials": coach_row.get("coach_initials"),
                },
            )
        ).mappings().first()
        await session.commit()

    return _success_response(
        {
            "evaluation": {
                "id": str(inserted["id"]),
                "student_id": str(inserted["student_id"]),
                "evaluated_at": _isoformat_date(inserted["evaluated_at"]),
                "level_code": inserted["level_code"],
                "level_outcome": inserted["level_outcome"],
                "strengths_md": inserted["strengths_md"],
                "areas_to_work_on_md": inserted["areas_to_work_on_md"],
                "next_step_level_code": inserted["next_step_level_code"],
                "next_step_summary": inserted["next_step_summary"],
                "coach_initials": inserted["coach_initials"],
                "created_at": _isoformat_datetime(inserted["created_at"]),
            }
        },
        tenant_id=None,
        actor_context=None,
    )
