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


TENANT_ID = "tenant-chess-demo"
ACTOR_CONTEXT = {
    "channel": "public_web",
    "tenant_id": TENANT_ID,
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


class ApiV1AssessmentRoutes(TestCase):
    def _fake_get_session(self, session):
        @asynccontextmanager
        async def _manager(_factory):
            yield session

        return _manager

    def test_create_assessment_session_returns_template_contract(self):
        client = TestClient(create_test_app())

        response = client.post(
            "/api/v1/assessments/sessions",
            json={
                "actor_context": ACTOR_CONTEXT,
                "participant": {
                    "student_name": "Mia",
                    "student_age": 11,
                    "guardian_name": "Linh",
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["meta"]["tenant_id"], TENANT_ID)
        self.assertEqual(payload["meta"]["actor"]["actor_type"], "public_web")
        self.assertEqual(payload["data"]["template_version"], "grandmaster-chess-v1")
        self.assertEqual(payload["data"]["progress"]["total"], 4)
        self.assertEqual(payload["data"]["next_question"]["question_id"], "experience")
        self.assertEqual(len(payload["data"]["questions"]), 4)
        self.assertEqual(payload["data"]["subscription_plans"][0]["monthly_price_aud"], 120)

    def test_submit_assessment_answers_returns_completed_assessment_with_placement(self):
        client = TestClient(create_test_app())
        session_response = client.post(
            "/api/v1/assessments/sessions",
            json={
                "actor_context": ACTOR_CONTEXT,
                "participant": {
                    "student_name": "Noah",
                    "student_age": 12,
                },
            },
        )
        session_id = session_response.json()["data"]["session_id"]

        response = client.post(
            f"/api/v1/assessments/sessions/{session_id}/answers",
            json={
                "actor_context": ACTOR_CONTEXT,
                "answers": [
                    {"question_id": "experience", "answer_id": "beginner"},
                    {"question_id": "basic_knowledge", "answer_id": "knows_rules"},
                    {"question_id": "puzzle_skill", "answer_id": "mate_in_1"},
                    {"question_id": "competitive_readiness", "answer_id": "needs_guidance"},
                ],
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status"], "completed")
        self.assertEqual(payload["data"]["assessment"]["score"], 2)
        self.assertEqual(payload["data"]["assessment"]["level"], "beginner")
        self.assertIsNone(payload["data"]["next_question"])
        placement = payload["data"]["assessment"]["placement"]
        self.assertEqual(placement["primary_class"]["class_code"], "kids_mon_1600")
        self.assertEqual(
            placement["subscription_suggestion"]["plan_code"],
            "starter_1x_week",
        )

    def test_recommend_placement_uses_session_answers_and_returns_growth_plan_for_advanced(self):
        client = TestClient(create_test_app())
        session_response = client.post(
            "/api/v1/assessments/sessions",
            json={
                "actor_context": ACTOR_CONTEXT,
                "participant": {
                    "student_name": "Aria",
                    "student_age": 17,
                },
            },
        )
        session_id = session_response.json()["data"]["session_id"]
        client.post(
            f"/api/v1/assessments/sessions/{session_id}/answers",
            json={
                "actor_context": ACTOR_CONTEXT,
                "answers": [
                    {"question_id": "experience", "answer_id": "months_1_6"},
                    {"question_id": "basic_knowledge", "answer_id": "solid_fundamentals"},
                    {"question_id": "puzzle_skill", "answer_id": "mate_in_2"},
                    {"question_id": "competitive_readiness", "answer_id": "competitive_play"},
                ],
            },
        )

        response = client.post(
            "/api/v1/placements/recommend",
            json={
                "actor_context": ACTOR_CONTEXT,
                "session_id": session_id,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["assessment"]["score"], 8)
        self.assertEqual(payload["data"]["assessment"]["level"], "advanced")
        recommendation = payload["data"]["recommendation"]
        self.assertEqual(recommendation["primary_class"]["class_code"], "advanced_wed_1900")
        self.assertEqual(recommendation["subscription_suggestion"]["plan_code"], "growth_2x_week")
        self.assertTrue(
            any(slot["class_code"] == "practice_fri_1600" for slot in recommendation["alternate_slots"])
        )

    def test_class_availability_returns_recommended_slots_for_level(self):
        client = TestClient(create_test_app())

        response = client.get(
            "/api/v1/classes/availability",
            params={
                "channel": "public_web",
                "tenant_id": TENANT_ID,
                "deployment_mode": "standalone_app",
                "level": "tournament",
                "student_age": 16,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["meta"]["tenant_id"], TENANT_ID)
        self.assertEqual(payload["data"]["program_code"], "grandmaster_chess_academy")
        recommended_codes = {
            slot["class_code"]
            for slot in payload["data"]["slots"]
            if slot["recommended"]
        }
        self.assertIn("tournament_fri_1900", recommended_codes)
        self.assertIn("advanced_wed_1900", recommended_codes)

    def test_submit_assessment_answers_returns_error_envelope_for_missing_session(self):
        client = TestClient(create_test_app())

        response = client.post(
            "/api/v1/assessments/sessions/assess_missing/answers",
            json={
                "actor_context": ACTOR_CONTEXT,
                "answers": [
                    {"question_id": "experience", "answer_id": "beginner"},
                ],
            },
        )

        self.assertEqual(response.status_code, 404)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "assessment_session_not_found")
        self.assertEqual(payload["meta"]["tenant_id"], TENANT_ID)

    def test_create_parent_report_preview_returns_success_envelope(self):
        client = TestClient(create_test_app())
        fake_session = SimpleNamespace(commit=AsyncMock())

        with patch(
            "api.v1_assessment_handlers.get_session",
            self._fake_get_session(fake_session),
        ), patch(
            "api.v1_assessment_handlers.persist_booking_academy_snapshot",
            AsyncMock(return_value={"student_ref": "student_brchess1"}),
        ), patch(
            "api.v1_assessment_handlers.BookingIntentRepository.sync_callback_status",
            AsyncMock(return_value={"booking_intent_id": "booking-1"}),
        ):
            response = client.post(
                "/api/v1/reports/preview",
                json={
                    "actor_context": ACTOR_CONTEXT,
                    "booking_reference": "BR-CHESS-1",
                    "participant": {
                        "student_name": "Mia",
                        "student_age": 11,
                        "guardian_name": "Linh",
                    },
                    "assessment": {
                        "score_total": 2,
                        "level": "beginner",
                        "summary": "Mia is ready for guided beginner coaching.",
                        "recommended_class_type": "Kids",
                    },
                    "placement": {
                        "class_label": "Kids",
                        "level": "beginner",
                        "suggested_plan": {
                            "title": "1 class per week",
                            "price_label": "$120/month",
                        },
                        "available_slots": [
                            {
                                "label": "Monday 4:00 PM",
                            }
                        ],
                    },
                    "service_name": "Grandmaster Chess Academy",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["booking_reference"], "BR-CHESS-1")
        self.assertEqual(payload["data"]["student_ref"], "student_brchess1")
        self.assertIn("Mia", payload["data"]["report_preview"]["headline"])

    def test_get_parent_report_preview_returns_saved_preview(self):
        client = TestClient(create_test_app())

        class _FakeResult:
            def mappings(self):
                return self

            def first(self):
                return {
                    "tenant_id": TENANT_ID,
                    "customer_name": "Linh",
                    "service_name": "Grandmaster Chess Academy",
                    "metadata_json": {
                        "academy_student_profile": {
                            "student_name": "Mia",
                            "student_age": 11,
                            "guardian_name": "Linh",
                        },
                        "academy_report_preview": {
                            "student_name": "Mia",
                            "guardian_name": "Linh",
                            "headline": "Mia is ready for the Kids pathway.",
                            "summary": "Preview saved.",
                            "strengths": ["Confidence"],
                            "focus_areas": ["Tactics"],
                            "homework": ["Mate in 1"],
                            "next_class_suggestion": {
                                "class_label": "Kids",
                                "slot_label": "Monday 4:00 PM",
                                "plan_label": "1 class per week",
                            },
                            "parent_cta": "Keep momentum.",
                            "retention_reasoning": "Parents pay for progress.",
                        },
                    },
                }

        class _FakeSession:
            async def execute(self, *_args, **_kwargs):
                return _FakeResult()

        with patch(
            "api.v1_assessment_handlers.get_session",
            self._fake_get_session(_FakeSession()),
        ):
            response = client.get(
                "/api/v1/reports/preview/BR-CHESS-1",
                params={
                    "channel": "public_web",
                    "tenant_id": TENANT_ID,
                    "deployment_mode": "standalone_app",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["booking_reference"], "BR-CHESS-1")
        self.assertEqual(payload["data"]["report_preview"]["student_name"], "Mia")
