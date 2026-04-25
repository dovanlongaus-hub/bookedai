from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from api.v1_routes import (
    ActorContextPayload,
    AppError,
    BookingIntentRepository,
    RepositoryContext,
    ValidationAppError,
    _error_response,
    _resolve_tenant_id,
    _success_response,
    get_session,
    uuid4,
)
from service_layer.chess_revenue_engine_service import (
    ASSESSMENT_TEMPLATE_VERSION,
    LEVEL_BANDS,
    PROGRAM_CODE,
    SUBSCRIPTION_PLANS,
    build_assessment_summary,
    build_class_availability,
    build_parent_report_preview,
    list_assessment_questions,
    next_question,
    placement_recommendation,
    score_answers,
    validate_answers,
)
from service_layer.academy_service import (
    get_academy_report_preview,
    persist_booking_academy_snapshot,
)


class AssessmentParticipantPayload(BaseModel):
    student_name: str | None = None
    student_age: int | None = None
    guardian_name: str | None = None


class AssessmentAnswerPayload(BaseModel):
    question_id: str
    answer_id: str


class CreateAssessmentSessionRequestPayload(BaseModel):
    actor_context: ActorContextPayload
    program_code: str = PROGRAM_CODE
    participant: AssessmentParticipantPayload = Field(default_factory=AssessmentParticipantPayload)
    context: dict[str, Any] = Field(default_factory=dict)


class SubmitAssessmentAnswersRequestPayload(BaseModel):
    actor_context: ActorContextPayload
    answers: list[AssessmentAnswerPayload]


class PlacementRecommendRequestPayload(BaseModel):
    actor_context: ActorContextPayload
    session_id: str | None = None
    participant: AssessmentParticipantPayload = Field(default_factory=AssessmentParticipantPayload)
    answers: list[AssessmentAnswerPayload] = Field(default_factory=list)


class AssessmentReportSnapshotPayload(BaseModel):
    score_total: int | None = None
    level: str | None = None
    summary: str | None = None
    recommended_class_type: str | None = None


class PlacementPlanPayload(BaseModel):
    title: str | None = None
    price_label: str | None = None


class PlacementSlotPayload(BaseModel):
    label: str | None = None
    day: str | None = None
    time: str | None = None


class PlacementSnapshotPayload(BaseModel):
    class_label: str | None = None
    level: str | None = None
    retention_note: str | None = None
    suggested_plan: PlacementPlanPayload = Field(default_factory=PlacementPlanPayload)
    available_slots: list[PlacementSlotPayload] = Field(default_factory=list)


class CreateParentReportPreviewRequestPayload(BaseModel):
    actor_context: ActorContextPayload
    booking_reference: str
    participant: AssessmentParticipantPayload = Field(default_factory=AssessmentParticipantPayload)
    assessment: AssessmentReportSnapshotPayload = Field(default_factory=AssessmentReportSnapshotPayload)
    placement: PlacementSnapshotPayload = Field(default_factory=PlacementSnapshotPayload)
    service_name: str | None = None


async def _load_booking_report_preview(
    session,
    *,
    booking_reference: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select
              bi.tenant_id::text as tenant_id,
              bi.metadata_json,
              c.full_name as customer_name,
              bi.service_name
            from booking_intents bi
            left join contacts c
              on c.id = bi.contact_id
            where bi.booking_reference = :booking_reference
            limit 1
            """
        ),
        {"booking_reference": booking_reference},
    )
    row = result.mappings().first()
    if not row:
        return None

    metadata = row.get("metadata_json") if isinstance(row.get("metadata_json"), dict) else {}
    return {
        "tenant_id": row.get("tenant_id"),
        "customer_name": row.get("customer_name"),
        "service_name": row.get("service_name"),
        "academy_report_preview": metadata.get("academy_report_preview"),
        "academy_student_profile": metadata.get("academy_student_profile"),
    }


def _assessment_sessions(request: Request) -> dict[str, dict[str, Any]]:
    store = getattr(request.app.state, "assessment_sessions", None)
    if store is None:
        store = {}
        request.app.state.assessment_sessions = store
    return store


def _get_session_or_error(
    request: Request,
    *,
    session_id: str,
    tenant_id: str | None,
) -> dict[str, Any]:
    session = _assessment_sessions(request).get(session_id)
    if session is None:
        raise AppError(
            code="assessment_session_not_found",
            message="The assessment session could not be found. Start a new assessment session first.",
            status_code=404,
            details={"session_id": session_id},
        )
    session_tenant_id = str(session.get("tenant_id") or "").strip() or None
    if tenant_id and session_tenant_id and tenant_id != session_tenant_id:
        raise AppError(
            code="assessment_session_tenant_mismatch",
            message="The requested assessment session does not belong to this tenant context.",
            status_code=403,
            details={"session_id": session_id},
        )
    return session


async def create_assessment_session(request: Request, payload: CreateAssessmentSessionRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        if payload.program_code != PROGRAM_CODE:
            raise ValidationAppError(
                "Only the Grandmaster Chess Academy template is available for this v1 assessment slice.",
                details={"program_code": [PROGRAM_CODE]},
            )

        session_id = f"assess_{uuid4().hex[:12]}"
        session_state = {
            "session_id": session_id,
            "tenant_id": tenant_id,
            "program_code": payload.program_code,
            "participant": payload.participant.model_dump(mode="json"),
            "actor_context": payload.actor_context.model_dump(mode="json"),
            "context": payload.context,
            "answers": {},
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        }
        _assessment_sessions(request)[session_id] = session_state
        questions = list_assessment_questions()

        return _success_response(
            {
                "session_id": session_id,
                "program_code": payload.program_code,
                "template_version": ASSESSMENT_TEMPLATE_VERSION,
                "participant": session_state["participant"],
                "status": "in_progress",
                "progress": {
                    "answered": 0,
                    "total": len(questions),
                    "remaining": len(questions),
                },
                "questions": questions,
                "next_question": questions[0] if questions else None,
                "level_bands": list(LEVEL_BANDS),
                "subscription_plans": list(SUBSCRIPTION_PLANS),
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def submit_assessment_answers(
    request: Request,
    session_id: str,
    payload: SubmitAssessmentAnswersRequestPayload,
):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        session = _get_session_or_error(request, session_id=session_id, tenant_id=tenant_id)
        answer_map = validate_answers([item.model_dump(mode="json") for item in payload.answers])
        session_answers = dict(session.get("answers") or {})
        session_answers.update(answer_map)
        session["answers"] = session_answers
        session["updated_at"] = datetime.now(UTC).isoformat()

        participant = session.get("participant") or {}
        student_age = participant.get("student_age")
        summary = build_assessment_summary(answer_map=session_answers, student_age=student_age)
        next_prompt = next_question(session_answers)

        return _success_response(
            {
                "session_id": session_id,
                "status": "completed" if summary["completed"] else "in_progress",
                "progress": {
                    "answered": len(summary["answered_question_ids"]),
                    "total": len(list_assessment_questions()),
                    "remaining": len(summary["missing_question_ids"]),
                },
                "answers": [
                    {"question_id": key, "answer_id": value}
                    for key, value in sorted(session_answers.items())
                ],
                "next_question": None if summary["completed"] else next_prompt,
                "assessment": summary,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except ValueError as error:
        return _error_response(
            ValidationAppError(
                "Assessment answers did not match the supported Grandmaster Chess Academy template.",
                details={"answers": [str(error)]},
            ),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def recommend_placement(request: Request, payload: PlacementRecommendRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        student_age = payload.participant.student_age
        if payload.session_id:
            session = _get_session_or_error(request, session_id=payload.session_id, tenant_id=tenant_id)
            answer_map = dict(session.get("answers") or {})
            participant = session.get("participant") or {}
            if student_age is None:
                student_age = participant.get("student_age")
        else:
            answer_map = {}

        if payload.answers:
            answer_map.update(validate_answers([item.model_dump(mode="json") for item in payload.answers]))

        evaluation = score_answers(answer_map)
        if not evaluation.completed:
            raise ValidationAppError(
                "Placement recommendation requires a complete assessment.",
                details={"missing_question_ids": evaluation.missing_question_ids},
            )

        recommendation = placement_recommendation(
            evaluation=evaluation,
            student_age=student_age,
        )
        return _success_response(
            {
                "session_id": payload.session_id,
                "assessment": {
                    "score": evaluation.score,
                    "level": evaluation.level,
                    "level_label": evaluation.level_label,
                    "score_breakdown": evaluation.score_breakdown,
                },
                "recommendation": recommendation,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except ValueError as error:
        return _error_response(
            ValidationAppError(
                "Placement recommendation contains unsupported assessment answers.",
                details={"answers": [str(error)]},
            ),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def class_availability(
    request: Request,
    channel: str,
    tenant_id: str | None = None,
    tenant_ref: str | None = None,
    actor_id: str | None = None,
    role: str | None = None,
    deployment_mode: str | None = None,
    level: str | None = None,
    student_age: int | None = None,
):
    actor_context = ActorContextPayload(
        channel=channel,
        tenant_id=tenant_id,
        tenant_ref=tenant_ref,
        actor_id=actor_id,
        role=role,
        deployment_mode=deployment_mode,
    )
    resolved_tenant_id = await _resolve_tenant_id(request, actor_context)
    slots = build_class_availability(level=level, student_age=student_age)
    return _success_response(
        {
            "program_code": PROGRAM_CODE,
            "template_version": ASSESSMENT_TEMPLATE_VERSION,
            "level": level,
            "slots": slots,
            "subscription_plans": list(SUBSCRIPTION_PLANS),
        },
        tenant_id=resolved_tenant_id,
        actor_context=actor_context,
    )


async def create_parent_report_preview(
    request: Request,
    payload: CreateParentReportPreviewRequestPayload,
):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    normalized_reference = str(payload.booking_reference or "").strip()
    try:
        if not normalized_reference:
            raise ValidationAppError(
                "A booking reference is required to attach a parent report preview.",
                details={"booking_reference": ["required"]},
            )

        slot = payload.placement.available_slots[0] if payload.placement.available_slots else None
        slot_label = (
            str(slot.label or "").strip()
            or " ".join(
                part
                for part in [str(slot.day or "").strip(), str(slot.time or "").strip()]
                if part
            ).strip()
            if slot
            else None
        )
        preview = build_parent_report_preview(
            student_name=payload.participant.student_name,
            guardian_name=payload.participant.guardian_name,
            assessment_level=payload.assessment.level or payload.placement.level,
            assessment_summary=payload.assessment.summary,
            class_label=payload.placement.class_label or payload.assessment.recommended_class_type,
            plan_label=payload.placement.suggested_plan.title,
            slot_label=slot_label,
            service_name=payload.service_name,
        )

        async with get_session(request.app.state.session_factory) as session:
            repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            academy_snapshot = await persist_booking_academy_snapshot(
                session,
                tenant_id=tenant_id or "",
                booking_reference=normalized_reference,
                template_version=ASSESSMENT_TEMPLATE_VERSION,
                program_code=PROGRAM_CODE,
                participant=payload.participant.model_dump(mode="json"),
                assessment=payload.assessment.model_dump(mode="json"),
                placement=payload.placement.model_dump(mode="json"),
                service_name=payload.service_name,
                report_preview=preview,
            )
            booking_sync = await repository.sync_callback_status(
                tenant_id=tenant_id,
                booking_reference=normalized_reference,
                metadata_updates={
                    "academy_student_profile": payload.participant.model_dump(mode="json"),
                    "academy_report_preview": preview,
                    "academy_student_ref": academy_snapshot.get("student_ref"),
                },
            )
            await session.commit()

        return _success_response(
            {
                "booking_reference": normalized_reference,
                "report_preview": preview,
                "student_ref": academy_snapshot.get("student_ref"),
                "booking_intent_id": booking_sync.get("booking_intent_id"),
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def get_parent_report_preview(
    booking_reference: str,
    request: Request,
    channel: str,
    tenant_id: str | None = None,
    tenant_ref: str | None = None,
    actor_id: str | None = None,
    role: str | None = None,
    deployment_mode: str | None = None,
):
    actor_context = ActorContextPayload(
        channel=channel,
        tenant_id=tenant_id,
        tenant_ref=tenant_ref,
        actor_id=actor_id,
        role=role,
        deployment_mode=deployment_mode,
    )
    resolved_tenant_id = await _resolve_tenant_id(request, actor_context)
    normalized_reference = str(booking_reference or "").strip()
    try:
        if not normalized_reference:
            raise ValidationAppError(
                "A booking reference is required to load the parent report preview.",
                details={"booking_reference": ["required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            academy_report = await get_academy_report_preview(
                session,
                booking_reference=normalized_reference,
                tenant_id=resolved_tenant_id,
            )
            row = await _load_booking_report_preview(
                session,
                booking_reference=normalized_reference,
            )

        if not row and not academy_report:
            raise AppError(
                code="academy_report_preview_not_found",
                message="No academy booking was found for this booking reference.",
                status_code=404,
                details={"booking_reference": normalized_reference},
            )

        academy_preview = academy_report.get("report_preview") if academy_report else None
        preview = (
            academy_preview
            if isinstance(academy_preview, dict) and academy_preview
            else row.get("academy_report_preview") if row else None
        )
        if not isinstance(preview, dict):
            raise AppError(
                code="academy_report_preview_not_ready",
                message="The parent report preview has not been generated for this booking yet.",
                status_code=404,
                details={"booking_reference": normalized_reference},
            )

        return _success_response(
            {
                "booking_reference": normalized_reference,
                "report_preview": preview,
                "student_ref": academy_report.get("student_ref") if academy_report else None,
                "student_profile": academy_report.get("student")
                if academy_report
                else row.get("academy_student_profile")
                if row and isinstance(row.get("academy_student_profile"), dict)
                else None,
                "service_name": row.get("service_name") if row else None,
                "customer_name": row.get("customer_name") if row else None,
            },
            tenant_id=resolved_tenant_id or academy_report.get("tenant_id") if academy_report else resolved_tenant_id,
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)
