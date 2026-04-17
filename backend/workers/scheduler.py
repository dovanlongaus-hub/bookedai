from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from repositories.base import RepositoryContext
from repositories.job_run_repository import JobRunRepository
from workers.contracts import JobContext, JobResult


class JobScheduler:
    """Placeholder scheduler seam for monthly reports, reminders, and sync jobs."""

    def enqueue(self, context: JobContext) -> JobResult:
        return JobResult(status="queued", metadata={"job_name": context.job_name})


@dataclass(frozen=True)
class ScheduledJobRunResult:
    job_run_id: int | None
    result: JobResult


async def run_tracked_job(
    session,
    *,
    context: JobContext,
    handler: Callable[[JobContext], Awaitable[JobResult]],
    detail: str | None = None,
) -> ScheduledJobRunResult:
    repository = JobRunRepository(RepositoryContext(session=session, tenant_id=context.tenant_id))
    job_run_id = await repository.create_job_run(
        tenant_id=context.tenant_id,
        job_name=context.job_name,
        status="pending",
        detail=detail,
    )
    if job_run_id is not None:
        await repository.mark_running(job_run_id, detail=detail)

    try:
        result = await handler(context)
    except Exception as exc:
        if job_run_id is not None:
            await repository.mark_finished(job_run_id, status="failed", detail=str(exc))
        raise

    if job_run_id is not None:
        final_status = "completed" if result.status in {"ok", "completed", "sent"} else result.status
        await repository.mark_finished(job_run_id, status=final_status, detail=result.detail)
    return ScheduledJobRunResult(job_run_id=job_run_id, result=result)
