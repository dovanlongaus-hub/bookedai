from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_router import router as v1_router


ACTOR_CONTEXT = {
    "channel": "portal_app",
    "tenant_id": "tenant-chess-demo",
    "deployment_mode": "standalone_app",
}


def create_test_app() -> FastAPI:
    async def _default_close():
        return None

    async def _async_noop(*_args, **_kwargs):
        return None

    def _default_session_factory():
        return SimpleNamespace(close=_default_close, commit=_async_noop)

    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = _default_session_factory
    app.state.assessment_sessions = {}
    return app


class ApiV1AcademyRoutes(TestCase):
    def _fake_get_session(self, session):
        @asynccontextmanager
        async def _manager(_factory):
            yield session

        return _manager

    def test_get_academy_student_returns_snapshot(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace()

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.build_academy_student_snapshot",
            AsyncMock(
                return_value={
                    "student": {
                        "student_ref": "student_brchess1",
                        "student_name": "Mia",
                        "current_level": "beginner",
                        "profile": {"program_code": "grandmaster_chess_academy"},
                    },
                    "latest_assessment": {"result": {"level": "beginner"}},
                    "latest_enrollment": {"plan_code": "starter_1x_week"},
                    "latest_report_preview": {"headline": "Mia is making strong progress."},
                    "recent_requests": [],
                }
            ),
        ):
            response = client.get(
                "/api/v1/academy/students/student_brchess1",
                params={
                    "channel": "portal_app",
                    "tenant_id": "tenant-chess-demo",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["student"]["student_ref"], "student_brchess1")
        self.assertEqual(payload["data"]["latest_enrollment"]["plan_code"], "starter_1x_week")

    def test_get_academy_student_report_preview_returns_not_found(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace()

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.get_academy_report_preview",
            AsyncMock(return_value={}),
        ):
            response = client.get(
                "/api/v1/academy/students/missing-student/report-preview",
                params={
                    "channel": "portal_app",
                    "tenant_id": "tenant-chess-demo",
                },
            )

        self.assertEqual(response.status_code, 404)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "academy_report_preview_not_found")

    def test_create_academy_pause_request_returns_success_envelope(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace(commit=AsyncMock())

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.queue_academy_portal_request",
            AsyncMock(
                return_value={
                    "request_status": "queued",
                    "request_type": "pause",
                    "student_ref": "student_brchess1",
                    "booking_reference": "BR-CHESS-1",
                    "reason_code": "busy",
                    "portal_request_id": 12,
                    "outbox_event_id": 40,
                    "message": "Your pause request has been recorded for review.",
                }
            ),
        ):
            response = client.post(
                "/api/v1/portal/requests/pause",
                json={
                    "student_ref": "student_brchess1",
                    "reason_code": "busy",
                    "customer_note": "School exams this month.",
                    "actor_context": ACTOR_CONTEXT,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["request_type"], "pause")
        self.assertEqual(payload["data"]["student_ref"], "student_brchess1")

    def test_create_academy_downgrade_request_requires_plan_code(self):
        client = TestClient(create_test_app())

        response = client.post(
            "/api/v1/portal/requests/downgrade",
            json={
                "student_ref": "student_brchess1",
                "reason_code": "budget",
                "actor_context": ACTOR_CONTEXT,
            },
        )

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "validation_error")

    def test_create_subscription_intent_returns_revenue_ops_handoff(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace(commit=AsyncMock())

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.create_academy_subscription_intent",
            AsyncMock(
                return_value={
                    "tenant_id": "tenant-chess-demo",
                    "student_ref": "student_brchess1",
                    "booking_reference": "BR-CHESS-1",
                    "subscription_intent": {
                        "subscription_intent_id": "subintent-1",
                        "plan_code": "starter_1x_week",
                        "plan_label": "1 class per week",
                        "billing_interval": "month",
                        "amount_aud": 120,
                        "status": "pending_checkout",
                        "checkout_url": None,
                    },
                    "queued_actions": [
                        {
                            "action_run_id": "action-1",
                            "agent_type": "revenue_operations",
                            "action_type": "payment_reminder",
                            "status": "queued",
                            "priority": "normal",
                            "reason": "Remind if checkout remains pending.",
                        }
                    ],
                    "outbox_event_id": 44,
                    "message": "Subscription handoff is queued for revenue operations.",
                }
            ),
        ):
            response = client.post(
                "/api/v1/subscriptions/intents",
                json={
                    "student_ref": "student_brchess1",
                    "booking_reference": "BR-CHESS-1",
                    "plan": {
                        "plan_code": "starter_1x_week",
                        "plan_label": "1 class per week",
                        "amount_aud": 120,
                    },
                    "placement": {
                        "class_label": "Kids",
                        "level": "beginner",
                    },
                    "actor_context": ACTOR_CONTEXT,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["subscription_intent"]["plan_code"], "starter_1x_week")
        self.assertEqual(payload["data"]["queued_actions"][0]["agent_type"], "revenue_operations")

    def test_create_subscription_intent_requires_student_or_booking_context(self):
        client = TestClient(create_test_app())

        response = client.post(
            "/api/v1/subscriptions/intents",
            json={
                "plan": {
                    "plan_code": "starter_1x_week",
                },
                "actor_context": ACTOR_CONTEXT,
            },
        )

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "validation_error")

    def test_queue_report_generation_returns_action_run(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace(commit=AsyncMock())

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.queue_academy_agent_action",
            AsyncMock(
                return_value={
                    "tenant_id": "tenant-chess-demo",
                    "student_ref": "student_brchess1",
                    "booking_reference": "BR-CHESS-1",
                    "action_run": {
                        "action_run_id": "action-report-1",
                        "agent_type": "revenue_operations",
                        "action_type": "report_generation_trigger",
                        "status": "queued",
                        "priority": "normal",
                        "reason": "Generate report.",
                    },
                    "outbox_event_id": 45,
                    "message": "Revenue operations action queued.",
                }
            ),
        ):
            response = client.post(
                "/api/v1/reports/generate",
                json={
                    "student_ref": "student_brchess1",
                    "booking_reference": "BR-CHESS-1",
                    "actor_context": ACTOR_CONTEXT,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["action_run"]["action_type"], "report_generation_trigger")

    def test_queue_retention_evaluation_returns_action_run(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace(commit=AsyncMock())

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.queue_academy_agent_action",
            AsyncMock(
                return_value={
                    "tenant_id": "tenant-chess-demo",
                    "student_ref": "student_brchess1",
                    "booking_reference": "BR-CHESS-1",
                    "action_run": {
                        "action_run_id": "action-retention-1",
                        "agent_type": "revenue_operations",
                        "action_type": "retention_evaluation_trigger",
                        "status": "queued",
                        "priority": "high",
                        "reason": "Evaluate retention.",
                    },
                    "outbox_event_id": 46,
                    "message": "Revenue operations action queued.",
                }
            ),
        ):
            response = client.post(
                "/api/v1/retention/evaluate",
                json={
                    "student_ref": "student_brchess1",
                    "booking_reference": "BR-CHESS-1",
                    "priority": "high",
                    "actor_context": ACTOR_CONTEXT,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["action_run"]["action_type"], "retention_evaluation_trigger")

    def test_queue_revenue_ops_handoff_returns_queued_agent_actions(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace(commit=AsyncMock())

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.queue_sme_revenue_operations_handoff",
            AsyncMock(
                return_value={
                    "tenant_id": "tenant-chess-demo",
                    "booking_reference": "v1-booking-123",
                    "booking_intent_id": "booking-intent-123",
                    "lead_id": None,
                    "queued_actions": [
                        {
                            "action_run_id": "action-follow-up-1",
                            "agent_type": "revenue_operations",
                            "action_type": "lead_follow_up",
                            "status": "queued",
                            "priority": "high",
                            "reason": "Follow up with the customer while booking intent is fresh.",
                        },
                        {
                            "action_run_id": "action-crm-1",
                            "agent_type": "revenue_operations",
                            "action_type": "crm_sync",
                            "status": "queued",
                            "priority": "normal",
                            "reason": "Sync booking lifecycle into CRM.",
                        },
                    ],
                    "outbox_event_id": 52,
                    "message": "Revenue operations agent handoff queued.",
                }
            ),
        ):
            response = client.post(
                "/api/v1/revenue-ops/handoffs",
                json={
                    "booking_reference": "v1-booking-123",
                    "booking_intent_id": "booking-intent-123",
                    "customer": {"name": "BookedAI User", "email": "hello@example.com"},
                    "service": {"service_name": "Kids chess class"},
                    "actor_context": ACTOR_CONTEXT,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["message"], "Revenue operations agent handoff queued.")
        self.assertEqual(
            [item["action_type"] for item in payload["data"]["queued_actions"]],
            ["lead_follow_up", "crm_sync"],
        )

    def test_list_agent_actions_returns_filtered_ledger(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace()

        list_actions = AsyncMock(
            return_value={
                "tenant_id": "tenant-chess-demo",
                "filters": {
                    "student_ref": "student_brchess1",
                    "booking_reference": "v1-demo",
                    "entity_type": "booking_lifecycle",
                    "entity_id": "booking-1",
                    "agent_type": "revenue_operations",
                    "status": "queued",
                    "action_type": "payment_reminder",
                    "dependency_state": "awaiting_payment",
                    "lifecycle_event": "booking_lifecycle_handoff",
                    "limit": 10,
                },
                "summary": {
                    "total": 1,
                    "queued": 1,
                    "needs_attention": 1,
                },
                "action_runs": [
                    {
                        "action_run_id": "action-1",
                        "agent_type": "revenue_operations",
                        "action_type": "payment_reminder",
                        "status": "queued",
                        "student_ref": "student_brchess1",
                    }
                ],
            }
        )

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.list_academy_agent_actions",
            list_actions,
        ):
            response = client.get(
                "/api/v1/agent-actions",
                params={
                    "channel": "tenant_app",
                    "tenant_id": "tenant-chess-demo",
                    "student_ref": "student_brchess1",
                    "booking_reference": "v1-demo",
                    "entity_type": "booking_lifecycle",
                    "entity_id": "booking-1",
                    "agent_type": "revenue_operations",
                    "status": "queued",
                    "action_type": "payment_reminder",
                    "dependency_state": "awaiting_payment",
                    "lifecycle_event": "booking_lifecycle_handoff",
                    "limit": 10,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["summary"]["queued"], 1)
        self.assertEqual(payload["data"]["action_runs"][0]["action_type"], "payment_reminder")
        list_actions.assert_awaited_once()
        self.assertEqual(list_actions.await_args.kwargs["booking_reference"], "v1-demo")
        self.assertEqual(list_actions.await_args.kwargs["entity_id"], "booking-1")
        self.assertEqual(list_actions.await_args.kwargs["dependency_state"], "awaiting_payment")
        self.assertEqual(list_actions.await_args.kwargs["lifecycle_event"], "booking_lifecycle_handoff")

    def test_get_agent_action_returns_detail(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace()

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.get_academy_agent_action",
            AsyncMock(
                return_value={
                    "action_run_id": "action-1",
                    "tenant_id": "tenant-chess-demo",
                    "agent_type": "revenue_operations",
                    "action_type": "crm_sync",
                    "status": "queued",
                    "student_ref": "student_brchess1",
                    "input": {"student_ref": "student_brchess1"},
                    "result": {},
                }
            ),
        ):
            response = client.get(
                "/api/v1/agent-actions/action-1",
                params={
                    "channel": "tenant_app",
                    "tenant_id": "tenant-chess-demo",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["action_run_id"], "action-1")

    def test_transition_agent_action_updates_status(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace(commit=AsyncMock())

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.transition_academy_agent_action",
            AsyncMock(
                return_value={
                    "tenant_id": "tenant-chess-demo",
                    "action_run": {
                        "action_run_id": "action-1",
                        "agent_type": "revenue_operations",
                        "action_type": "payment_reminder",
                        "status": "manual_review",
                        "result": {"provider": "manual"},
                    },
                    "outbox_event_id": 51,
                    "message": "Revenue operations action status updated.",
                }
            ),
        ):
            response = client.post(
                "/api/v1/agent-actions/action-1/transition",
                json={
                    "status": "manual_review",
                    "note": "Parent requested a phone follow-up.",
                    "result": {"provider": "manual"},
                    "actor_context": ACTOR_CONTEXT,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["action_run"]["status"], "manual_review")

    def test_transition_agent_action_rejects_unknown_status(self):
        client = TestClient(create_test_app())

        response = client.post(
            "/api/v1/agent-actions/action-1/transition",
            json={
                "status": "teleported",
                "actor_context": ACTOR_CONTEXT,
            },
        )

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "validation_error")

    def test_dispatch_agent_actions_returns_tracked_job_result(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace(commit=AsyncMock())

        async def _run_tracked_academy_action_dispatch(*_args, **_kwargs):
            return SimpleNamespace(
                job_run_id=73,
                result=SimpleNamespace(
                    status="completed",
                    detail="Processed 2 of 2 queued academy action(s); 1 manual review, 0 failed.",
                    retryable=False,
                    metadata={
                        "total_actions": 2,
                        "processed_actions": 2,
                        "manual_review_actions": 1,
                        "failed_actions": 0,
                    },
                ),
            )

        with patch(
            "api.v1_academy_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_academy_handlers.run_tracked_academy_action_dispatch",
            _run_tracked_academy_action_dispatch,
        ):
            response = client.post(
                "/api/v1/agent-actions/dispatch",
                json={
                    "limit": 5,
                    "actor_context": ACTOR_CONTEXT,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["job_run_id"], 73)
        self.assertEqual(payload["data"]["metadata"]["manual_review_actions"], 1)
