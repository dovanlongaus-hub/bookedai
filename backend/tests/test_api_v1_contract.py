from __future__ import annotations

from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import ANY, AsyncMock

import api.v1_routes as v1_routes


TENANT_ID = "tenant-123"
ACTOR_CONTEXT = {
    "channel": "public_web",
    "tenant_id": TENANT_ID,
    "deployment_mode": "embedded_widget",
}


class FakeResult:
    def __init__(
        self,
        *,
        scalars_all: list[object] | None = None,
        scalar_one_or_none: object | None = None,
        mappings_first: object | None = None,
    ) -> None:
        self._scalars_all = scalars_all or []
        self._scalar_one_or_none = scalar_one_or_none
        self._mappings_first = mappings_first

    def scalars(self) -> "FakeResult":
        return self

    def all(self) -> list[object]:
        return self._scalars_all

    def scalar_one_or_none(self) -> object | None:
        return self._scalar_one_or_none

    def mappings(self) -> "FakeResult":
        return self

    def first(self) -> object | None:
        return self._mappings_first


class FakeSession:
    def __init__(self, execute_handler) -> None:
        self._execute_handler = execute_handler
        self.executed: list[tuple[object, object | None]] = []
        self.commit_calls = 0

    async def execute(self, statement, params=None):
        self.executed.append((statement, params))
        result = self._execute_handler(statement, params)
        return result if result is not None else FakeResult()

    async def commit(self) -> None:
        self.commit_calls += 1

    async def close(self) -> None:
        return None


def make_fake_get_session(session: FakeSession):
    @asynccontextmanager
    async def _fake_get_session(_: object):
        yield session

    return _fake_get_session


def assert_success_envelope(response, *, tenant_id: str = TENANT_ID, actor_type: str = "public_web"):
    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["meta"]["version"] == "v1"
    assert body["meta"]["tenant_id"] == tenant_id
    assert body["meta"]["actor"]["actor_type"] == actor_type
    assert body["meta"]["request_id"]
    return body


def assert_error_envelope(response, *, status_code: int, code: str):
    body = response.json()
    assert response.status_code == status_code
    assert body["status"] == "error"
    assert body["error"]["code"] == code
    assert body["meta"]["version"] == "v1"
    return body


def test_start_chat_session_returns_success_envelope(client):
    response = client.post(
        "/api/v1/conversations/sessions",
        json={
            "channel": "public_web",
            "anonymous_session_id": "anon-001",
            "context": {"page": "/book"},
            "actor_context": ACTOR_CONTEXT,
        },
    )

    body = assert_success_envelope(response)
    assert body["data"]["conversation_id"] == "anon-001"
    assert body["data"]["channel_session_id"].startswith("public_web_")
    assert "assistant_guidance" in body["data"]["capabilities"]
    assert "payment_collection" in body["data"]["capabilities"]


def test_resolve_booking_path_returns_instant_book_contract(client):
    response = client.post(
        "/api/v1/bookings/path/resolve",
        json={
            "availability_state": "available",
            "booking_confidence": "high",
            "channel": "public_web",
            "actor_context": ACTOR_CONTEXT,
        },
    )

    body = assert_success_envelope(response)
    assert body["data"]["path_type"] == "instant_book"
    assert body["data"]["payment_allowed_before_confirmation"] is True
    assert body["data"]["next_step"] == "Continue to confirm slot and create a payment intent."


def test_search_candidates_returns_catalog_matches(client, monkeypatch):
    service = SimpleNamespace(
        service_id="svc_123",
        business_name="Lavender Studio",
        name="Signature Facial",
        summary="Premium facial treatments",
        category="spa",
        location="Sydney",
        venue_name="Lavender Rooms",
        amount_aud=120,
        tags_json=["facial", "skin"],
        featured=1,
        booking_url="https://book.example.com/facial",
    )
    session = FakeSession(lambda *_: FakeResult(scalars_all=[service]))
    monkeypatch.setattr(v1_routes, "get_session", make_fake_get_session(session))

    response = client.post(
        "/api/v1/matching/search",
        json={
            "query": "facial",
            "channel_context": {
                "channel": "public_web",
                "tenant_id": TENANT_ID,
                "deployment_mode": "standalone_app",
            },
            "location": "Sydney",
            "budget": {
                "max_aud": 150,
            },
        },
    )

    body = assert_success_envelope(response, actor_type="public_web")
    assert body["data"]["candidates"][0]["candidate_id"] == "svc_123"
    assert body["data"]["recommendations"][0]["path_type"] == "book_on_partner_site"
    assert body["data"]["candidates"][0]["match_score"] >= 0.45
    assert body["data"]["candidates"][0]["trust_signal"] in {"partner_verified", "partner_routed"}
    assert body["data"]["confidence"]["gating_state"] in {"medium", "high"}
    assert "evidence" in body["data"]["confidence"]
    assert body["data"]["search_strategy"] == "catalog_term_retrieval_with_prompt9_rerank_with_relevance_gate"
    assert body["data"]["semantic_assist"]["applied"] is False


def test_check_availability_returns_booking_trust_contract(client, monkeypatch):
    service = SimpleNamespace(booking_url="https://book.example.com")
    session = FakeSession(lambda *_: FakeResult(scalar_one_or_none=service))
    monkeypatch.setattr(v1_routes, "get_session", make_fake_get_session(session))

    response = client.post(
        "/api/v1/booking-trust/checks",
        json={
            "candidate_id": "svc_123",
            "channel": "public_web",
            "actor_context": ACTOR_CONTEXT,
        },
    )

    body = assert_success_envelope(response)
    assert body["data"]["availability_state"] == "partner_booking_only"
    assert body["data"]["verified"] is True
    assert body["data"]["recommended_booking_path"] == "book_on_partner_site"
    assert body["data"]["payment_allowed_now"] is False


def test_create_lead_returns_captured_envelope(client, monkeypatch):
    session = FakeSession(lambda *_: FakeResult())
    monkeypatch.setattr(v1_routes, "get_session", make_fake_get_session(session))

    contact_mock = AsyncMock(return_value="contact_123")
    lead_mock = AsyncMock(return_value="lead_456")
    monkeypatch.setattr(v1_routes.ContactRepository, "upsert_contact", contact_mock)
    monkeypatch.setattr(v1_routes.LeadRepository, "upsert_lead", lead_mock)

    response = client.post(
        "/api/v1/leads",
        json={
            "lead_type": "consultation",
            "contact": {
                "full_name": "Maya Tran",
                "email": "  MAYA@EXAMPLE.COM  ",
                "phone": "555-0100",
            },
            "business_context": {"business_name": "BookedAI"},
            "attribution": {"source": "website"},
            "actor_context": ACTOR_CONTEXT,
        },
    )

    body = assert_success_envelope(response)
    assert body["data"]["lead_id"] == "lead_456"
    assert body["data"]["contact_id"] == "contact_123"
    assert body["data"]["status"] == "captured"
    contact_mock.assert_awaited_once_with(
        tenant_id=TENANT_ID,
        full_name="Maya Tran",
        email="maya@example.com",
        phone="555-0100",
        primary_channel="email",
    )
    lead_mock.assert_awaited_once_with(
        tenant_id=TENANT_ID,
        contact_id="contact_123",
        source="website",
        status="captured",
    )


def test_create_booking_intent_returns_trust_envelope(client, monkeypatch):
    session = FakeSession(lambda *_: FakeResult())
    monkeypatch.setattr(v1_routes, "get_session", make_fake_get_session(session))

    contact_mock = AsyncMock(return_value="contact_789")
    lead_mock = AsyncMock(return_value="lead_789")
    booking_mock = AsyncMock(return_value="booking_789")
    monkeypatch.setattr(v1_routes.ContactRepository, "upsert_contact", contact_mock)
    monkeypatch.setattr(v1_routes.LeadRepository, "upsert_lead", lead_mock)
    monkeypatch.setattr(v1_routes.BookingIntentRepository, "upsert_booking_intent", booking_mock)

    response = client.post(
        "/api/v1/bookings/intents",
        json={
            "contact": {
                "full_name": "Maya Tran",
                "phone": "555-0100",
            },
            "channel": "public_web",
            "actor_context": ACTOR_CONTEXT,
            "notes": "Please call after 5pm",
        },
    )

    body = assert_success_envelope(response)
    assert body["data"]["booking_intent_id"] == "booking_789"
    assert body["data"]["booking_reference"].startswith("v1-")
    assert body["data"]["trust"]["availability_state"] == "availability_unknown"
    assert body["data"]["trust"]["recommended_booking_path"] == "request_callback"
    booking_mock.assert_awaited_once()
    assert booking_mock.await_args.kwargs["booking_path"] == "request_callback"
    assert booking_mock.await_args.kwargs["confidence_level"] == "low"
    assert booking_mock.await_args.kwargs["source"] == "public_web"


def test_create_payment_intent_returns_pending_envelope(client, monkeypatch):
    session_calls = {"count": 0}

    def execute_handler(*_args):
        session_calls["count"] += 1
        if session_calls["count"] == 1:
            return FakeResult(mappings_first={"booking_intent_id": "booking_123"})
        return FakeResult()

    session = FakeSession(execute_handler)
    monkeypatch.setattr(v1_routes, "get_session", make_fake_get_session(session))

    payment_mock = AsyncMock(return_value="payment_123")
    monkeypatch.setattr(v1_routes.PaymentIntentRepository, "upsert_payment_intent", payment_mock)

    response = client.post(
        "/api/v1/payments/intents",
        json={
            "booking_intent_id": "booking_123",
            "selected_payment_option": "card",
            "actor_context": ACTOR_CONTEXT,
        },
    )

    body = assert_success_envelope(response)
    assert body["data"]["payment_intent_id"] == "payment_123"
    assert body["data"]["payment_status"] == "pending"
    assert body["data"]["checkout_url"] is None
    assert body["data"]["warnings"][0].startswith("Payment intent contract is ready")
    payment_mock.assert_awaited_once_with(
        tenant_id=TENANT_ID,
        booking_intent_id="booking_123",
        payment_option="card",
        status="pending",
        amount_aud=None,
        currency="aud",
        external_session_id=None,
        payment_url=None,
        metadata_json='{"created_by": "public_web"}',
    )


def test_send_lifecycle_email_rejects_empty_recipients(client):
    response = client.post(
        "/api/v1/email/messages/send",
        json={
            "template_key": "booking_follow_up",
            "to": [],
            "variables": {"name": "Maya"},
            "actor_context": ACTOR_CONTEXT,
        },
    )

    body = assert_error_envelope(response, status_code=422, code="validation_error")
    assert body["error"]["message"] == "Lifecycle email requires at least one recipient."
    assert body["error"]["details"]["to"] == ["at least one recipient is required"]
