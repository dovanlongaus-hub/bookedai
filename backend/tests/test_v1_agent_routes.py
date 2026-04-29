from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_router import router as v1_router


def _build_event(
    *,
    event_id: int,
    created_at: datetime,
    source: str = "public_chat",
    event_type: str = "message_in",
    ai_intent: str | None = None,
    ai_reply: str | None = None,
    workflow_status: str | None = None,
    metadata_json: dict | None = None,
):
    return SimpleNamespace(
        id=event_id,
        source=source,
        event_type=event_type,
        ai_intent=ai_intent,
        ai_reply=ai_reply,
        workflow_status=workflow_status,
        metadata_json=metadata_json or {},
        created_at=created_at,
    )


class _FakeExecuteResult:
    def __init__(self, events):
        self._events = events

    def scalars(self):
        return SimpleNamespace(all=lambda: list(self._events))


def _make_fake_session(events: list, capture_limit: dict[str, int]):
    @asynccontextmanager
    async def _fake_get_session(_session_factory):
        async def _execute(statement, *_args, **_kwargs):
            try:
                compiled = statement.compile()
                params = {key: value for key, value in compiled.params.items()}
                limit_value = params.get("param_1")
                if isinstance(limit_value, int):
                    capture_limit["limit"] = limit_value
            except Exception:  # noqa: BLE001
                pass
            limit_value = capture_limit.get("limit")
            if isinstance(limit_value, int):
                events_to_return = events[:limit_value]
            else:
                events_to_return = events
            return _FakeExecuteResult(events_to_return)

        async def _commit():
            return None

        yield SimpleNamespace(execute=_execute, commit=_commit)

    return _fake_get_session


def _create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
    )
    return app


async def _resolve_tenant_id_stub(_request, _actor_context):
    return "tenant-test"


async def _resolve_tenant_id_unauthenticated(_request, _actor_context):
    raise HTTPException(
        status_code=401,
        detail="Tenant session required.",
    )


class AgentActivityRoutesTestCase(TestCase):
    def test_happy_path_returns_three_steps_in_chronological_order(self):
        base = datetime(2026, 4, 28, 9, 0, 0, tzinfo=UTC)
        events = [
            _build_event(
                event_id=1,
                created_at=base,
                event_type="message_in",
                ai_intent="kids_chess_search",
                ai_reply="Looking up Sydney chess classes for you.",
                workflow_status="in_flight",
                metadata_json={"duration_ms": 220, "stage": "understanding"},
            ),
            _build_event(
                event_id=2,
                created_at=base + timedelta(seconds=2),
                event_type="catalog_lookup",
                ai_intent="kids_chess_search",
                ai_reply="Found 3 ranked chess options.",
                workflow_status="done",
                metadata_json={"duration_ms": 480, "ranked_ids": ["svc_chess_1"]},
            ),
            _build_event(
                event_id=3,
                created_at=base + timedelta(seconds=5),
                event_type="rank",
                ai_intent="kids_chess_search",
                ai_reply=None,
                workflow_status="done",
                metadata_json={"duration_ms": 96, "score": 0.92},
            ),
        ]
        capture: dict[str, int] = {}

        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ), patch(
            "api.v1_agent_handlers.get_session",
            _make_fake_session(events, capture),
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={
                    "conversation_id": "conv-test",
                    "limit": 10,
                    "tenant_id": "tenant-test",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["conversation_id"], "conv-test")
        self.assertEqual(payload["data"]["count"], 3)
        steps = payload["data"]["steps"]
        self.assertEqual([step["id"] for step in steps], [1, 2, 3])
        self.assertEqual(steps[0]["event_type"], "message_in")
        self.assertEqual(steps[0]["duration_ms"], 220)
        self.assertEqual(steps[0]["evidence"], {"stage": "understanding"})
        self.assertEqual(steps[0]["workflow_status"], "in_flight")
        self.assertEqual(steps[1]["evidence"], {"ranked_ids": ["svc_chess_1"]})
        self.assertEqual(payload["meta"]["version"], "v1")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_missing_actor_context_returns_unauthorized(self):
        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_unauthenticated,
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={"conversation_id": "conv-test"},
            )

        self.assertEqual(response.status_code, 401)

    def test_pii_keys_in_metadata_are_masked_in_evidence(self):
        base = datetime(2026, 4, 28, 9, 0, 0, tzinfo=UTC)
        events = [
            _build_event(
                event_id=10,
                created_at=base,
                event_type="message_in",
                metadata_json={
                    "phone": "+61 400 000 000",
                    "email": "guest@example.com",
                    "customer_name": "Jane Doe",
                    "address": "12 Pitt Street, Sydney",
                    "latitude": -33.86880123,
                    "longitude": 151.20929876,
                    "card_number": "4242 4242 4242 4242",
                    "customer": {
                        "phone_number": "+61 400 111 222",
                        "name": "Guest",
                        "full_name": "Guest Smith",
                        "dob": "1990-01-15",
                    },
                    "other": "keep",
                },
            ),
        ]
        capture: dict[str, int] = {}

        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ), patch(
            "api.v1_agent_handlers.get_session",
            _make_fake_session(events, capture),
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={
                    "conversation_id": "conv-test",
                    "tenant_id": "tenant-test",
                },
            )

        self.assertEqual(response.status_code, 200)
        evidence = response.json()["data"]["steps"][0]["evidence"]
        self.assertEqual(evidence["phone"], "<masked>")
        self.assertEqual(evidence["email"], "<masked>")
        self.assertEqual(evidence["customer"]["phone_number"], "<masked>")
        # Bare ``name`` is intentionally NOT masked — only explicit forms
        # like ``customer_name``/``full_name`` are scrubbed (see policy note
        # in api/v1_agent_handlers.py PII_FIELD_NAMES).
        self.assertEqual(evidence["customer"]["name"], "Guest")
        self.assertEqual(evidence["customer"]["full_name"], "<masked>")
        self.assertEqual(evidence["customer"]["dob"], "<masked>")
        self.assertEqual(evidence["other"], "keep")
        # Newly-covered identity, address, payment, coordinate fields:
        self.assertEqual(evidence["customer_name"], "<masked>")
        self.assertEqual(evidence["address"], "<masked>")
        self.assertEqual(evidence["card_number"], "<masked>")
        # Coordinates are coarsened to ~1km (0.01°) precision rather than
        # fully masked so ops debugging retains suburb-scale geography.
        self.assertEqual(evidence["latitude"], -33.87)
        self.assertEqual(evidence["longitude"], 151.21)

    def test_limit_is_passed_through_to_query(self):
        base = datetime(2026, 4, 28, 9, 0, 0, tzinfo=UTC)
        events = [
            _build_event(
                event_id=index,
                created_at=base + timedelta(seconds=index),
                event_type="rank",
                metadata_json={"duration_ms": 50},
            )
            for index in range(1, 6)
        ]
        capture: dict[str, int] = {}

        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ), patch(
            "api.v1_agent_handlers.get_session",
            _make_fake_session(events, capture),
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={
                    "conversation_id": "conv-test",
                    "limit": 2,
                    "tenant_id": "tenant-test",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["data"]["count"], 2)
        self.assertEqual(payload["data"]["limit"], 2)
        self.assertEqual(len(payload["data"]["steps"]), 2)

    def test_missing_conversation_id_returns_validation_error(self):
        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={"tenant_id": "tenant-test"},
            )

        self.assertEqual(response.status_code, 422)

    def test_empty_conversation_returns_empty_steps(self):
        capture: dict[str, int] = {}

        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ), patch(
            "api.v1_agent_handlers.get_session",
            _make_fake_session([], capture),
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={
                    "conversation_id": "conv-empty",
                    "tenant_id": "tenant-test",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["data"]["steps"], [])
        self.assertEqual(payload["data"]["count"], 0)

    def test_user_intent_hint_in_metadata_is_surfaced_unmasked(self):
        """Wave 13-B — slash-command verb stored on
        ``metadata_json.user_intent_hint`` must be lifted out into a typed
        step field (not masked, since it's a closed-enum verb, not PII)."""

        base = datetime(2026, 4, 28, 9, 0, 0, tzinfo=UTC)
        events = [
            _build_event(
                event_id=42,
                created_at=base,
                event_type="slash_command_intent",
                metadata_json={
                    "user_intent_hint": "book_service",
                    "channel": "public_web",
                    "duration_ms": 12,
                },
            ),
        ]
        capture: dict[str, int] = {}

        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ), patch(
            "api.v1_agent_handlers.get_session",
            _make_fake_session(events, capture),
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={
                    "conversation_id": "conv-intent",
                    "tenant_id": "tenant-test",
                },
            )

        self.assertEqual(response.status_code, 200)
        step = response.json()["data"]["steps"][0]
        self.assertEqual(step["user_intent_hint"], "book_service")
        # The hint is lifted OUT of evidence so the masker never touches it
        # and the drawer can render a typed chip.
        self.assertNotIn("user_intent_hint", step["evidence"])
        # Surrounding metadata still flows through.
        self.assertEqual(step["evidence"]["channel"], "public_web")
        self.assertEqual(step["duration_ms"], 12)

    def test_step_without_user_intent_hint_returns_null(self):
        base = datetime(2026, 4, 28, 9, 0, 0, tzinfo=UTC)
        events = [
            _build_event(
                event_id=43,
                created_at=base,
                event_type="message_in",
                metadata_json={"duration_ms": 80},
            ),
        ]
        capture: dict[str, int] = {}

        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ), patch(
            "api.v1_agent_handlers.get_session",
            _make_fake_session(events, capture),
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={
                    "conversation_id": "conv-no-intent",
                    "tenant_id": "tenant-test",
                },
            )

        self.assertEqual(response.status_code, 200)
        step = response.json()["data"]["steps"][0]
        self.assertIsNone(step["user_intent_hint"])

    def test_invalid_user_intent_hint_drops_to_null(self):
        """A non-string or empty stored hint must not crash the projector
        and must surface as ``None``."""

        base = datetime(2026, 4, 28, 9, 0, 0, tzinfo=UTC)
        events = [
            _build_event(
                event_id=44,
                created_at=base,
                event_type="slash_command_intent",
                metadata_json={"user_intent_hint": 123},
            ),
            _build_event(
                event_id=45,
                created_at=base + timedelta(seconds=1),
                event_type="slash_command_intent",
                metadata_json={"user_intent_hint": "   "},
            ),
        ]
        capture: dict[str, int] = {}

        with patch(
            "api.v1_agent_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ), patch(
            "api.v1_agent_handlers.get_session",
            _make_fake_session(events, capture),
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/agent/activity",
                params={
                    "conversation_id": "conv-bad",
                    "tenant_id": "tenant-test",
                },
            )

        self.assertEqual(response.status_code, 200)
        steps = response.json()["data"]["steps"]
        self.assertIsNone(steps[0]["user_intent_hint"])
        self.assertIsNone(steps[1]["user_intent_hint"])
