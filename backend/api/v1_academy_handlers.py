from __future__ import annotations

from typing import Any

from fastapi import Request
from pydantic import BaseModel, Field

from api.v1_routes import (
    ActorContextPayload,
    AppError,
    ValidationAppError,
    _error_response,
    _resolve_tenant_id,
    _success_response,
    get_session,
)
from service_layer.academy_service import (
    AGENT_ACTION_TERMINAL_STATUSES,
    build_academy_student_snapshot,
    create_academy_subscription_intent,
    get_academy_agent_action,
    get_academy_enrollment_snapshot,
    get_academy_report_preview,
    list_academy_agent_actions,
    queue_academy_agent_action,
    queue_academy_portal_request,
    queue_sme_revenue_operations_handoff,
    transition_academy_agent_action,
)
from workers.academy_actions import run_tracked_academy_action_dispatch


def _query_actor_context(
    *,
    channel: str | None = None,
    tenant_id: str | None = None,
    tenant_ref: str | None = None,
    actor_id: str | None = None,
    role: str | None = None,
    deployment_mode: str | None = None,
) -> ActorContextPayload | None:
    normalized_channel = str(channel or "").strip()
    if not normalized_channel:
        return None
    return ActorContextPayload(
        channel=normalized_channel,
        tenant_id=tenant_id,
        tenant_ref=tenant_ref,
        actor_id=actor_id,
        role=role,
        deployment_mode=deployment_mode,
    )


async def _resolve_tenant_id_if_needed(
    request: Request,
    actor_context: ActorContextPayload | None,
) -> str | None:
    if not actor_context:
        return None
    if not actor_context.tenant_id and not actor_context.tenant_ref:
        return None
    return await _resolve_tenant_id(request, actor_context)


class PortalRetentionRequestPayload(BaseModel):
    student_ref: str
    reason_code: str | None = None
    customer_note: str | None = None
    booking_reference: str | None = None
    requested_plan_code: str | None = None
    actor_context: ActorContextPayload | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class SubscriptionIntentPlanPayload(BaseModel):
    plan_code: str
    plan_label: str | None = None
    amount_aud: float | None = None
    billing_interval: str = "month"


class CreateSubscriptionIntentPayload(BaseModel):
    student_ref: str | None = None
    booking_reference: str | None = None
    booking_intent_id: str | None = None
    plan: SubscriptionIntentPlanPayload
    placement: dict[str, Any] = Field(default_factory=dict)
    actor_context: ActorContextPayload
    context: dict[str, Any] = Field(default_factory=dict)


class QueueAgentActionPayload(BaseModel):
    student_ref: str | None = None
    booking_reference: str | None = None
    reason: str | None = None
    priority: str = "normal"
    actor_context: ActorContextPayload
    context: dict[str, Any] = Field(default_factory=dict)


class TransitionAgentActionPayload(BaseModel):
    status: str
    note: str | None = None
    result: dict[str, Any] = Field(default_factory=dict)
    actor_context: ActorContextPayload


class DispatchAgentActionsPayload(BaseModel):
    limit: int = 25
    actor_context: ActorContextPayload | None = None


class QueueRevenueOpsHandoffPayload(BaseModel):
    booking_reference: str | None = None
    booking_intent_id: str | None = None
    lead_id: str | None = None
    contact_id: str | None = None
    customer: dict[str, Any] = Field(default_factory=dict)
    service: dict[str, Any] = Field(default_factory=dict)
    lifecycle: dict[str, Any] = Field(default_factory=dict)
    actor_context: ActorContextPayload
    context: dict[str, Any] = Field(default_factory=dict)


async def get_academy_student(
    student_ref: str,
    request: Request,
    channel: str | None = "portal_app",
    tenant_id: str | None = None,
    tenant_ref: str | None = None,
    actor_id: str | None = None,
    role: str | None = None,
    deployment_mode: str | None = None,
):
    actor_context = _query_actor_context(
        channel=channel,
        tenant_id=tenant_id,
        tenant_ref=tenant_ref,
        actor_id=actor_id,
        role=role,
        deployment_mode=deployment_mode,
    )
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            snapshot = await build_academy_student_snapshot(
                session,
                student_ref=student_ref,
                tenant_id=resolved_tenant_id,
            )

        if not snapshot:
            raise AppError(
                code="academy_student_not_found",
                message="The requested academy student could not be found for this tenant context.",
                status_code=404,
                details={"student_ref": student_ref},
            )

        return _success_response(
            snapshot,
            tenant_id=resolved_tenant_id or snapshot["student"].get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def get_academy_student_report_preview(
    student_ref: str,
    request: Request,
    channel: str | None = "portal_app",
    tenant_id: str | None = None,
    tenant_ref: str | None = None,
    actor_id: str | None = None,
    role: str | None = None,
    deployment_mode: str | None = None,
):
    actor_context = _query_actor_context(
        channel=channel,
        tenant_id=tenant_id,
        tenant_ref=tenant_ref,
        actor_id=actor_id,
        role=role,
        deployment_mode=deployment_mode,
    )
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            report_payload = await get_academy_report_preview(
                session,
                student_ref=student_ref,
                tenant_id=resolved_tenant_id,
            )

        if not report_payload:
            raise AppError(
                code="academy_report_preview_not_found",
                message="No academy report preview is available for this student yet.",
                status_code=404,
                details={"student_ref": student_ref},
            )

        return _success_response(
            report_payload,
            tenant_id=resolved_tenant_id or report_payload.get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def get_academy_student_enrollment(
    student_ref: str,
    request: Request,
    channel: str | None = "portal_app",
    tenant_id: str | None = None,
    tenant_ref: str | None = None,
    actor_id: str | None = None,
    role: str | None = None,
    deployment_mode: str | None = None,
):
    actor_context = _query_actor_context(
        channel=channel,
        tenant_id=tenant_id,
        tenant_ref=tenant_ref,
        actor_id=actor_id,
        role=role,
        deployment_mode=deployment_mode,
    )
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            snapshot = await get_academy_enrollment_snapshot(
                session,
                student_ref=student_ref,
                tenant_id=resolved_tenant_id,
            )

        if not snapshot:
            raise AppError(
                code="academy_enrollment_not_found",
                message="No academy enrollment snapshot is available for this student yet.",
                status_code=404,
                details={"student_ref": student_ref},
            )

        return _success_response(
            snapshot,
            tenant_id=resolved_tenant_id or snapshot.get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def _create_retention_request(
    request: Request,
    *,
    payload: PortalRetentionRequestPayload,
    request_type: str,
) -> Any:
    actor_context = payload.actor_context
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        if not str(payload.student_ref or "").strip():
            raise ValidationAppError(
                "A student reference is required for academy portal retention requests.",
                details={"student_ref": ["required"]},
            )
        if request_type == "pause" and not str(payload.reason_code or "").strip():
            raise ValidationAppError(
                "A pause reason is required before recording this request.",
                details={"reason_code": ["required"]},
            )
        if request_type == "downgrade" and not str(payload.requested_plan_code or "").strip():
            raise ValidationAppError(
                "A requested plan code is required before recording a downgrade request.",
                details={"requested_plan_code": ["required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            result = await queue_academy_portal_request(
                session,
                request_type=request_type,
                student_ref=payload.student_ref,
                reason_code=payload.reason_code,
                customer_note=payload.customer_note,
                requested_plan_code=payload.requested_plan_code,
                booking_reference=payload.booking_reference,
                actor_id=actor_context.actor_id if actor_context else None,
            )
            if not result:
                raise AppError(
                    code="academy_student_not_found",
                    message="The requested academy student could not be found for this portal request.",
                    status_code=404,
                    details={"student_ref": payload.student_ref},
                )
            await session.commit()

        return _success_response(
            result,
            tenant_id=resolved_tenant_id or result.get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def create_academy_pause_request(request: Request, payload: PortalRetentionRequestPayload):
    return await _create_retention_request(request, payload=payload, request_type="pause")


async def create_academy_downgrade_request(request: Request, payload: PortalRetentionRequestPayload):
    return await _create_retention_request(request, payload=payload, request_type="downgrade")


async def create_subscription_intent(request: Request, payload: CreateSubscriptionIntentPayload):
    actor_context = payload.actor_context
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        if not str(payload.student_ref or "").strip() and not str(payload.booking_reference or "").strip():
            raise ValidationAppError(
                "A student reference or booking reference is required before creating a subscription intent.",
                details={"student_ref": ["required_without_booking_reference"]},
            )
        if not str(payload.plan.plan_code or "").strip():
            raise ValidationAppError(
                "A subscription plan code is required before creating a subscription intent.",
                details={"plan.plan_code": ["required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            result = await create_academy_subscription_intent(
                session,
                tenant_id=resolved_tenant_id,
                student_ref=payload.student_ref,
                booking_reference=payload.booking_reference,
                booking_intent_id=payload.booking_intent_id,
                plan_code=payload.plan.plan_code,
                plan_label=payload.plan.plan_label,
                amount_aud=payload.plan.amount_aud,
                billing_interval=payload.plan.billing_interval,
                placement=payload.placement,
                actor_id=actor_context.actor_id,
                source=actor_context.channel,
            )
            if not result:
                raise AppError(
                    code="academy_subscription_context_not_found",
                    message="No academy student or booking context was found for this subscription handoff.",
                    status_code=404,
                    details={
                        "student_ref": payload.student_ref,
                        "booking_reference": payload.booking_reference,
                    },
                )
            await session.commit()

        return _success_response(
            result,
            tenant_id=resolved_tenant_id or result.get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def _queue_agent_action_endpoint(
    request: Request,
    *,
    payload: QueueAgentActionPayload,
    action_type: str,
):
    actor_context = payload.actor_context
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        if not str(payload.student_ref or "").strip() and not str(payload.booking_reference or "").strip():
            raise ValidationAppError(
                "A student reference or booking reference is required before queueing this revenue operation.",
                details={"student_ref": ["required_without_booking_reference"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            result = await queue_academy_agent_action(
                session,
                action_type=action_type,
                tenant_id=resolved_tenant_id,
                student_ref=payload.student_ref,
                booking_reference=payload.booking_reference,
                reason=payload.reason,
                priority=payload.priority,
                actor_id=actor_context.actor_id,
                source=actor_context.channel,
                context=payload.context,
            )
            if not result:
                raise AppError(
                    code="academy_action_context_not_found",
                    message="No academy student or booking context was found for this revenue operation.",
                    status_code=404,
                    details={
                        "student_ref": payload.student_ref,
                        "booking_reference": payload.booking_reference,
                    },
                )
            await session.commit()

        return _success_response(
            result,
            tenant_id=resolved_tenant_id or result.get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def queue_report_generation(request: Request, payload: QueueAgentActionPayload):
    return await _queue_agent_action_endpoint(
        request,
        payload=payload,
        action_type="report_generation_trigger",
    )


async def queue_retention_evaluation(request: Request, payload: QueueAgentActionPayload):
    return await _queue_agent_action_endpoint(
        request,
        payload=payload,
        action_type="retention_evaluation_trigger",
    )


async def queue_revenue_ops_handoff(request: Request, payload: QueueRevenueOpsHandoffPayload):
    actor_context = payload.actor_context
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        if not resolved_tenant_id:
            raise ValidationAppError(
                "Revenue operations handoff requires a tenant context.",
                details={"actor_context.tenant_id": ["required"]},
            )
        if not any(
            str(value or "").strip()
            for value in (payload.booking_reference, payload.booking_intent_id, payload.lead_id)
        ):
            raise ValidationAppError(
                "Revenue operations handoff requires a booking reference, booking intent, or lead id.",
                details={"booking_reference": ["required_without_booking_intent_or_lead"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            result = await queue_sme_revenue_operations_handoff(
                session,
                tenant_id=resolved_tenant_id,
                booking_reference=payload.booking_reference,
                booking_intent_id=payload.booking_intent_id,
                lead_id=payload.lead_id,
                contact_id=payload.contact_id,
                customer=payload.customer,
                service=payload.service,
                lifecycle=payload.lifecycle,
                actor_id=actor_context.actor_id,
                source=actor_context.channel,
                context=payload.context,
            )
            if not result:
                raise AppError(
                    code="revenue_ops_handoff_not_queued",
                    message="Revenue operations handoff could not be queued for this lifecycle context.",
                    status_code=422,
                    details={"booking_reference": payload.booking_reference},
                )
            await session.commit()

        return _success_response(
            result,
            tenant_id=resolved_tenant_id or result.get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def list_agent_actions(
    request: Request,
    channel: str | None = "tenant_app",
    tenant_id: str | None = None,
    tenant_ref: str | None = None,
    actor_id: str | None = None,
    role: str | None = None,
    deployment_mode: str | None = None,
    student_ref: str | None = None,
    booking_reference: str | None = None,
    status: str | None = None,
    action_type: str | None = None,
    limit: int = 25,
):
    actor_context = _query_actor_context(
        channel=channel,
        tenant_id=tenant_id,
        tenant_ref=tenant_ref,
        actor_id=actor_id,
        role=role,
        deployment_mode=deployment_mode,
    )
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            result = await list_academy_agent_actions(
                session,
                tenant_id=resolved_tenant_id,
                student_ref=student_ref,
                booking_reference=booking_reference,
                status=status,
                action_type=action_type,
                limit=limit,
            )

        return _success_response(
            result,
            tenant_id=resolved_tenant_id,
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def get_agent_action(
    action_run_id: str,
    request: Request,
    channel: str | None = "tenant_app",
    tenant_id: str | None = None,
    tenant_ref: str | None = None,
    actor_id: str | None = None,
    role: str | None = None,
    deployment_mode: str | None = None,
):
    actor_context = _query_actor_context(
        channel=channel,
        tenant_id=tenant_id,
        tenant_ref=tenant_ref,
        actor_id=actor_id,
        role=role,
        deployment_mode=deployment_mode,
    )
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            result = await get_academy_agent_action(
                session,
                action_run_id=action_run_id,
                tenant_id=resolved_tenant_id,
            )

        if not result:
            raise AppError(
                code="agent_action_not_found",
                message="The requested revenue operations action could not be found.",
                status_code=404,
                details={"action_run_id": action_run_id},
            )

        return _success_response(
            result,
            tenant_id=resolved_tenant_id or result.get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def transition_agent_action(
    action_run_id: str,
    request: Request,
    payload: TransitionAgentActionPayload,
):
    actor_context = payload.actor_context
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    try:
        normalized_status = str(payload.status or "").strip()
        if normalized_status not in AGENT_ACTION_TERMINAL_STATUSES:
            raise ValidationAppError(
                "Unsupported revenue operations action status.",
                details={
                    "status": [
                        f"must be one of {', '.join(sorted(AGENT_ACTION_TERMINAL_STATUSES))}"
                    ]
                },
            )

        async with get_session(request.app.state.session_factory) as session:
            result = await transition_academy_agent_action(
                session,
                action_run_id=action_run_id,
                tenant_id=resolved_tenant_id,
                status=normalized_status,
                result=payload.result,
                note=payload.note,
                actor_id=actor_context.actor_id,
                source=actor_context.channel,
            )
            if not result:
                raise AppError(
                    code="agent_action_not_found",
                    message="The requested revenue operations action could not be found.",
                    status_code=404,
                    details={"action_run_id": action_run_id},
                )
            await session.commit()

        return _success_response(
            result,
            tenant_id=resolved_tenant_id or result.get("tenant_id"),
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)


async def dispatch_agent_actions(request: Request, payload: DispatchAgentActionsPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="revenue_operations",
        deployment_mode="headless_api",
    )
    resolved_tenant_id = await _resolve_tenant_id_if_needed(request, actor_context)
    dispatch_limit = max(1, min(payload.limit, 50))
    try:
        async with get_session(request.app.state.session_factory) as session:
            tracked_result = await run_tracked_academy_action_dispatch(
                session,
                tenant_id=resolved_tenant_id,
                limit=dispatch_limit,
            )
            await session.commit()

        return _success_response(
            {
                "job_run_id": tracked_result.job_run_id,
                "dispatch_status": tracked_result.result.status,
                "detail": tracked_result.result.detail,
                "retryable": tracked_result.result.retryable,
                "metadata": tracked_result.result.metadata,
            },
            tenant_id=resolved_tenant_id,
            actor_context=actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=resolved_tenant_id, actor_context=actor_context)
