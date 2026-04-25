from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from repositories.academy_repository import AcademyRepository
from repositories.base import RepositoryContext
from service_layer.academy_service import transition_academy_agent_action
from workers.contracts import JobContext, JobResult
from workers.scheduler import ScheduledJobRunResult, run_tracked_job


@dataclass(frozen=True)
class AcademyActionDispatchResult:
    total_actions: int
    processed_actions: int
    manual_review_actions: int
    failed_actions: int


def _has_contact_target(input_payload: dict[str, Any]) -> bool:
    customer_payload = input_payload.get("customer")
    customer_payload = customer_payload if isinstance(customer_payload, dict) else {}
    return bool(
        str(input_payload.get("guardian_email") or "").strip()
        or str(input_payload.get("guardian_phone") or "").strip()
        or str(customer_payload.get("email") or "").strip()
        or str(customer_payload.get("phone") or "").strip()
    )


def resolve_academy_action_execution(action_run: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    action_type = str(action_run.get("action_type") or "").strip()
    input_payload = action_run.get("input_json")
    input_payload = input_payload if isinstance(input_payload, dict) else {}

    if action_type in {
        "booking_confirmation_email",
        "subscription_start_confirmation",
        "lead_follow_up",
        "payment_reminder",
        "overdue_follow_up",
    }:
        if not _has_contact_target(input_payload):
            missing_issue = (
                "missing_guardian_contact"
                if action_type in {"booking_confirmation_email", "subscription_start_confirmation"}
                else "missing_customer_contact"
            )
            return (
                "manual_review",
                {
                    "execution_mode": "worker_policy",
                    "issue": missing_issue,
                    "next_step": "Operator must confirm the customer contact before sending lifecycle communication.",
                },
            )
        return (
            "sent",
            {
                "execution_mode": "worker_policy",
                "delivery_posture": "queued_for_provider_dispatch",
                "outbox_event_type": f"revenue_operations.{action_type}.requested",
            },
        )

    if action_type in {
        "crm_sync",
        "report_generation_trigger",
        "retention_evaluation_trigger",
        "customer_care_status_monitor",
        "webhook_callback",
    }:
        return (
            "completed",
            {
                "execution_mode": "worker_policy",
                "delivery_posture": "downstream_event_queued",
                "outbox_event_type": f"revenue_operations.{action_type}.requested",
            },
        )

    return (
        "manual_review",
        {
            "execution_mode": "worker_policy",
            "issue": "unsupported_action_type",
            "next_step": "Operator must review this action type before automation can run it.",
        },
    )


async def dispatch_queued_academy_agent_actions(
    session,
    *,
    tenant_id: str | None = None,
    limit: int = 25,
    actor_id: str = "academy_action_worker",
    source: str = "academy_action_worker",
) -> AcademyActionDispatchResult:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    queued_actions = await repository.list_agent_action_runs(
        tenant_id=tenant_id,
        status="queued",
        limit=max(1, min(limit, 50)),
    )

    processed_actions = 0
    manual_review_actions = 0
    failed_actions = 0

    for action_run in queued_actions:
        action_run_id = str(action_run.get("action_run_id") or "").strip()
        if not action_run_id:
            failed_actions += 1
            continue

        try:
            await transition_academy_agent_action(
                session,
                action_run_id=action_run_id,
                tenant_id=tenant_id,
                status="in_progress",
                result={"worker": source},
                note="Revenue operations worker picked up this queued action.",
                actor_id=actor_id,
                source=source,
            )
            final_status, result_payload = resolve_academy_action_execution(action_run)
            await transition_academy_agent_action(
                session,
                action_run_id=action_run_id,
                tenant_id=tenant_id,
                status=final_status,
                result=result_payload,
                note="Revenue operations worker completed policy evaluation for this action.",
                actor_id=actor_id,
                source=source,
            )
            processed_actions += 1
            if final_status == "manual_review":
                manual_review_actions += 1
        except Exception:
            failed_actions += 1
            try:
                await transition_academy_agent_action(
                    session,
                    action_run_id=action_run_id,
                    tenant_id=tenant_id,
                    status="failed",
                    result={"worker": source},
                    note="Revenue operations worker failed while processing this action.",
                    actor_id=actor_id,
                    source=source,
                )
            except Exception:
                pass

    return AcademyActionDispatchResult(
        total_actions=len(queued_actions),
        processed_actions=processed_actions,
        manual_review_actions=manual_review_actions,
        failed_actions=failed_actions,
    )


async def run_tracked_academy_action_dispatch(
    session,
    *,
    tenant_id: str | None = None,
    limit: int = 25,
    request_id: str | None = None,
) -> ScheduledJobRunResult:
    async def _handler(_context: JobContext) -> JobResult:
        dispatch_result = await dispatch_queued_academy_agent_actions(
            session,
            tenant_id=tenant_id,
            limit=limit,
        )
        detail = (
            f"Processed {dispatch_result.processed_actions} of {dispatch_result.total_actions} queued academy action(s); "
            f"{dispatch_result.manual_review_actions} manual review, {dispatch_result.failed_actions} failed."
        )
        return JobResult(
            status="completed" if dispatch_result.failed_actions == 0 else "completed_with_failures",
            detail=detail,
            retryable=dispatch_result.failed_actions > 0,
            metadata={
                "total_actions": dispatch_result.total_actions,
                "processed_actions": dispatch_result.processed_actions,
                "manual_review_actions": dispatch_result.manual_review_actions,
                "failed_actions": dispatch_result.failed_actions,
            },
        )

    return await run_tracked_job(
        session,
        context=JobContext(
            job_id=f"academy-actions-{uuid4().hex[:12]}",
            job_name="dispatch_academy_agent_actions",
            tenant_id=tenant_id,
            request_id=request_id,
        ),
        handler=_handler,
        detail="Grandmaster Chess revenue operations action dispatch run",
    )
