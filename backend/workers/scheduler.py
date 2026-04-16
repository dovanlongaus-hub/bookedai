from __future__ import annotations

from workers.contracts import JobContext, JobResult


class JobScheduler:
    """Placeholder scheduler seam for monthly reports, reminders, and sync jobs."""

    def enqueue(self, context: JobContext) -> JobResult:
        return JobResult(status="queued", metadata={"job_name": context.job_name})

