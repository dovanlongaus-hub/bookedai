from __future__ import annotations

from pathlib import Path
import sys
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from workers.academy_actions import (
    dispatch_queued_academy_agent_actions,
    resolve_academy_action_execution,
    run_tracked_academy_action_dispatch,
)
from workers.contracts import JobResult


class _FakeAcademyRepository:
    rows: list[dict] = []

    def __init__(self, _context):
        pass

    async def list_agent_action_runs(self, **_kwargs):
        return list(self.rows)


class AcademyActionWorkerTestCase(IsolatedAsyncioTestCase):
    def test_resolve_subscription_confirmation_requires_contact(self):
        status, result = resolve_academy_action_execution(
            {
                "action_type": "subscription_start_confirmation",
                "input_json": {"guardian_email": ""},
            }
        )

        self.assertEqual(status, "manual_review")
        self.assertEqual(result["issue"], "missing_guardian_contact")

    def test_resolve_report_generation_completes_as_downstream_event(self):
        status, result = resolve_academy_action_execution(
            {
                "action_type": "report_generation_trigger",
                "input_json": {"student_ref": "student_brchess1"},
            }
        )

        self.assertEqual(status, "completed")
        self.assertEqual(result["delivery_posture"], "downstream_event_queued")

    async def test_dispatch_queued_actions_transitions_each_action(self):
        _FakeAcademyRepository.rows = [
            {
                "action_run_id": "action-1",
                "action_type": "payment_reminder",
                "input_json": {"guardian_email": "parent@example.com"},
            },
            {
                "action_run_id": "action-2",
                "action_type": "subscription_start_confirmation",
                "input_json": {},
            },
        ]
        transition = AsyncMock(return_value={"action_run": {"status": "ok"}})

        with patch("workers.academy_actions.AcademyRepository", _FakeAcademyRepository), patch(
            "workers.academy_actions.transition_academy_agent_action",
            transition,
        ):
            result = await dispatch_queued_academy_agent_actions(
                object(),
                tenant_id="tenant-chess-demo",
                limit=10,
            )

        self.assertEqual(result.total_actions, 2)
        self.assertEqual(result.processed_actions, 2)
        self.assertEqual(result.manual_review_actions, 1)
        statuses = [call.kwargs["status"] for call in transition.await_args_list]
        self.assertEqual(statuses, ["in_progress", "sent", "in_progress", "manual_review"])

    async def test_run_tracked_dispatch_uses_scheduler_wrapper(self):
        captured = {}

        async def _fake_run_tracked_job(_session, *, context, handler, detail=None):
            captured["job_name"] = context.job_name
            captured["detail"] = detail
            return type(
                "TrackedResult",
                (),
                {
                    "job_run_id": 33,
                    "result": await handler(context),
                },
            )()

        async def _fake_dispatch(*_args, **_kwargs):
            return type(
                "DispatchResult",
                (),
                {
                    "total_actions": 1,
                    "processed_actions": 1,
                    "manual_review_actions": 0,
                    "failed_actions": 0,
                },
            )()

        with patch("workers.academy_actions.run_tracked_job", _fake_run_tracked_job), patch(
            "workers.academy_actions.dispatch_queued_academy_agent_actions",
            _fake_dispatch,
        ):
            result = await run_tracked_academy_action_dispatch(
                object(),
                tenant_id="tenant-chess-demo",
                limit=5,
            )

        self.assertEqual(result.job_run_id, 33)
        self.assertIsInstance(result.result, JobResult)
        self.assertEqual(result.result.status, "completed")
        self.assertEqual(captured["job_name"], "dispatch_academy_agent_actions")
