"""Future Swim parent portal handlers (Phase 3.1 — preview mode).

The futureswim.bookedai.au sub-project surfaces a parent dashboard at
``/portal`` that lists each child's current level, recent lesson progress,
and the latest teacher evaluation + recommended next step. Phase 3.1 ships
a demo-mode preview endpoint keyed by a one-shot ``login_token`` stored on
``futureswim_parent_users``. Phase 3.2 will layer Google sign-in / magic
email codes on top using the existing tenant_email_login_codes machinery.

This module deliberately mirrors the shape of v1_chess_student_handlers.py
(stdlib only, raw SQL via get_session) so the codebase stays consistent
and grep-friendly across sub-projects.
"""

from __future__ import annotations

from datetime import date as date_type
from typing import Any

from fastapi import Request
from sqlalchemy import text

from core.errors import AppError
from core.logging import get_logger
from db import get_session

from api.v1_routes import _error_response, _success_response


_logger = get_logger("bookedai.api.v1_futureswim_portal_handlers")


def _isoformat_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, date_type):
        return value.isoformat()
    return str(value)


async def futureswim_portal_preview(request: Request):
    """Return the portal payload for the parent identified by ``key``.

    Query params:
      key (required) — the ``futureswim_parent_users.login_token`` value.

    Phase 3.1 deliberately accepts the bare token in the URL because the
    welcome email is the only place the link is surfaced; the token is
    rotated whenever the parent record is reseeded. Phase 3.2 will deprecate
    this in favour of a proper session cookie.
    """
    key = (request.query_params.get("key") or "").strip()
    if not key:
        return _error_response(
            AppError(
                code="missing_key",
                message="Provide ?key=<login_token> from your Future Swim welcome email.",
                status_code=400,
                details={},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        parent_row = (
            await session.execute(
                text(
                    """
                    select id, email, full_name, phone, centre_code, preferred_locale,
                           login_token_expires_at
                      from futureswim_parent_users
                     where login_token = :key
                       and (login_token_expires_at is null
                            or login_token_expires_at > now())
                     limit 1
                    """
                ),
                {"key": key},
            )
        ).mappings().first()

        if parent_row is None:
            return _error_response(
                AppError(
                    code="invalid_or_expired_key",
                    message="That portal link has expired or is not recognised. Reply to your Future Swim welcome email to get a fresh link.",
                    status_code=404,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )

        parent_id = str(parent_row["id"])

        students = (
            await session.execute(
                text(
                    """
                    select id, full_name, date_of_birth, centre_code,
                           current_level_code, enrolled_since, notes_for_coach
                      from futureswim_student_profiles
                     where parent_id = :parent_id
                       and is_active = 1
                     order by enrolled_since asc nulls last, full_name asc
                    """
                ),
                {"parent_id": parent_id},
            )
        ).mappings().all()

        students_payload: list[dict[str, Any]] = []
        for student in students:
            student_id = str(student["id"])

            progress_rows = (
                await session.execute(
                    text(
                        """
                        select session_date, centre_code, level_code,
                               attendance, focus_skill, notes_md, coach_initials
                          from futureswim_student_progress
                         where student_id = :student_id
                         order by session_date desc
                         limit 12
                        """
                    ),
                    {"student_id": student_id},
                )
            ).mappings().all()

            evaluation_row = (
                await session.execute(
                    text(
                        """
                        select evaluated_at, level_code, level_outcome,
                               strengths_md, areas_to_work_on_md,
                               next_step_level_code, next_step_summary, coach_initials
                          from futureswim_teacher_evaluations
                         where student_id = :student_id
                         order by evaluated_at desc
                         limit 1
                        """
                    ),
                    {"student_id": student_id},
                )
            ).mappings().first()

            students_payload.append(
                {
                    "id": student_id,
                    "full_name": student["full_name"],
                    "date_of_birth": _isoformat_date(student["date_of_birth"]),
                    "centre_code": student["centre_code"],
                    "current_level_code": student["current_level_code"],
                    "enrolled_since": _isoformat_date(student["enrolled_since"]),
                    "notes_for_coach": student["notes_for_coach"],
                    "recent_progress": [
                        {
                            "session_date": _isoformat_date(row["session_date"]),
                            "centre_code": row["centre_code"],
                            "level_code": row["level_code"],
                            "attendance": row["attendance"],
                            "focus_skill": row["focus_skill"],
                            "notes_md": row["notes_md"],
                            "coach_initials": row["coach_initials"],
                        }
                        for row in progress_rows
                    ],
                    "latest_evaluation": (
                        {
                            "evaluated_at": _isoformat_date(evaluation_row["evaluated_at"]),
                            "level_code": evaluation_row["level_code"],
                            "level_outcome": evaluation_row["level_outcome"],
                            "strengths_md": evaluation_row["strengths_md"],
                            "areas_to_work_on_md": evaluation_row["areas_to_work_on_md"],
                            "next_step_level_code": evaluation_row["next_step_level_code"],
                            "next_step_summary": evaluation_row["next_step_summary"],
                            "coach_initials": evaluation_row["coach_initials"],
                        }
                        if evaluation_row is not None
                        else None
                    ),
                }
            )

    payload = {
        "parent": {
            "email": parent_row["email"],
            "full_name": parent_row["full_name"],
            "phone": parent_row["phone"],
            "centre_code": parent_row["centre_code"],
            "preferred_locale": parent_row["preferred_locale"],
        },
        "students": students_payload,
    }

    return _success_response(payload, tenant_id=None, actor_context=None)
