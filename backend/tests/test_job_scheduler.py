from __future__ import annotations

from pathlib import Path
import sys
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from workers.contracts import JobContext, JobResult
from workers.scheduler import run_tracked_job


class _FakeJobRunRepository:
    instances: list["_FakeJobRunRepository"] = []

    def __init__(self, _context):
        self.created: dict | None = None
        self.running: dict | None = None
        self.finished: dict | None = None
        self.__class__.instances.append(self)

    async def create_job_run(self, **kwargs):
        self.created = kwargs
        return 21

    async def mark_running(self, job_run_id: int, *, detail: str | None = None):
        self.running = {"job_run_id": job_run_id, "detail": detail}

    async def mark_finished(self, job_run_id: int, *, status: str, detail: str | None = None):
        self.finished = {"job_run_id": job_run_id, "status": status, "detail": detail}


class JobSchedulerTestCase(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        _FakeJobRunRepository.instances.clear()

    async def test_run_tracked_job_records_completed_run(self):
        async def _handler(_context):
            return JobResult(status="completed", detail="dispatch complete")

        with patch("workers.scheduler.JobRunRepository", _FakeJobRunRepository):
            result = await run_tracked_job(
                object(),
                context=JobContext(job_id="job-1", job_name="dispatch_outbox", tenant_id="tenant-test"),
                handler=_handler,
                detail="phase2 dispatch",
            )

        repository = _FakeJobRunRepository.instances[-1]
        self.assertEqual(result.job_run_id, 21)
        self.assertEqual(result.result.status, "completed")
        self.assertEqual(repository.created["job_name"], "dispatch_outbox")
        self.assertEqual(repository.running["job_run_id"], 21)
        self.assertEqual(repository.finished["status"], "completed")

    async def test_run_tracked_job_records_failed_run(self):
        async def _handler(_context):
            raise RuntimeError("job exploded")

        with patch("workers.scheduler.JobRunRepository", _FakeJobRunRepository):
            with self.assertRaisesRegex(RuntimeError, "job exploded"):
                await run_tracked_job(
                    object(),
                    context=JobContext(job_id="job-2", job_name="dispatch_outbox", tenant_id="tenant-test"),
                    handler=_handler,
                )

        repository = _FakeJobRunRepository.instances[-1]
        self.assertEqual(repository.finished["status"], "failed")
        self.assertIn("job exploded", repository.finished["detail"])
