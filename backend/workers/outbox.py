from __future__ import annotations

from typing import Any
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from uuid import uuid4

from pydantic import BaseModel, Field

from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.outbox_repository import OutboxRepository
from workers.contracts import JobContext, JobResult
from workers.scheduler import ScheduledJobRunResult, run_tracked_job


class OutboxEvent(BaseModel):
    event_type: str
    aggregate_type: str | None = None
    aggregate_id: str | None = None
    tenant_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = None


@dataclass(frozen=True)
class OutboxDispatchResult:
    total_events: int
    processed_events: int
    failed_events: int


async def dispatch_pending_outbox_events(
    session,
    *,
    dispatcher: Callable[[OutboxEvent], Awaitable[None]],
    tenant_id: str | None = None,
    limit: int = 50,
) -> OutboxDispatchResult:
    repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    pending_rows = await repository.list_pending_events(tenant_id=tenant_id, limit=limit)

    processed_events = 0
    failed_events = 0
    for row in pending_rows:
        event = OutboxEvent(
            event_type=str(row.get("event_type") or ""),
            aggregate_type=str(row.get("aggregate_type") or "").strip() or None,
            aggregate_id=str(row.get("aggregate_id") or "").strip() or None,
            tenant_id=str(row.get("tenant_id") or "").strip() or None,
            payload=dict(row.get("payload") or {}),
            idempotency_key=str(row.get("idempotency_key") or "").strip() or None,
        )
        event_id = int(row.get("id") or 0)
        try:
            await dispatcher(event)
            await repository.update_event_status(event_id, status="processed")
            processed_events += 1
        except Exception as exc:
            await repository.update_event_status(
                event_id,
                status="failed",
                error_detail=str(exc),
                increment_attempt_count=True,
            )
            failed_events += 1

    return OutboxDispatchResult(
        total_events=len(pending_rows),
        processed_events=processed_events,
        failed_events=failed_events,
    )


async def dispatch_phase2_outbox_event(
    session,
    event: OutboxEvent,
) -> None:
    audit_repository = AuditLogRepository(
        RepositoryContext(session=session, tenant_id=event.tenant_id)
    )
    await audit_repository.append_entry(
        tenant_id=event.tenant_id,
        event_type="outbox.event.dispatched",
        entity_type=event.aggregate_type or "outbox_event",
        entity_id=event.aggregate_id,
        actor_type="worker",
        actor_id="phase2_outbox_dispatcher",
        payload={
            "outbox_event_type": event.event_type,
            "aggregate_type": event.aggregate_type,
            "aggregate_id": event.aggregate_id,
            "idempotency_key": event.idempotency_key,
            "payload": event.payload,
        },
    )


async def run_tracked_outbox_dispatch(
    session,
    *,
    dispatcher: Callable[[OutboxEvent], Awaitable[None]],
    tenant_id: str | None = None,
    limit: int = 50,
    request_id: str | None = None,
) -> ScheduledJobRunResult:
    async def _handler(_context: JobContext) -> JobResult:
        dispatch_result = await dispatch_pending_outbox_events(
            session,
            dispatcher=dispatcher,
            tenant_id=tenant_id,
            limit=limit,
        )
        detail = (
            f"Processed {dispatch_result.processed_events} of {dispatch_result.total_events} pending outbox event(s); "
            f"{dispatch_result.failed_events} failed."
        )
        return JobResult(
            status="completed" if dispatch_result.failed_events == 0 else "completed_with_failures",
            detail=detail,
            retryable=dispatch_result.failed_events > 0,
            metadata={
                "total_events": dispatch_result.total_events,
                "processed_events": dispatch_result.processed_events,
                "failed_events": dispatch_result.failed_events,
            },
        )

    return await run_tracked_job(
        session,
        context=JobContext(
            job_id=f"outbox-{uuid4().hex[:12]}",
            job_name="dispatch_outbox_events",
            tenant_id=tenant_id,
            request_id=request_id,
        ),
        handler=_handler,
        detail="Phase 2 outbox dispatch run",
    )
