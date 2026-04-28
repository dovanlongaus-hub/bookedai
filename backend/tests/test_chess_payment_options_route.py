"""Unit tests for POST /api/v1/chess/payments/options."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_router import router as v1_router  # noqa: E402


def _make_app(*, stripe_secret_key: str = "") -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        session_signing_secret="test-session-signing-secret",
        tenant_session_signing_secret="test-tenant-session-signing-secret",
        stripe_secret_key=stripe_secret_key,
        stripe_currency="aud",
        public_app_url="https://demo.bookedai.au",
        chess_payment_success_url="https://chess.bookedai.au/account?payment=success",
        chess_payment_cancel_url="https://chess.bookedai.au/?payment=cancelled",
    )
    return app


class _FakeStripeClient:
    def __init__(self, response_payload: dict[str, object]):
        self._response_payload = response_payload
        self.requests: list[dict[str, object]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, *, headers, content):
        self.requests.append({"url": url, "headers": headers, "content": content})
        return SimpleNamespace(
            status_code=200,
            json=lambda: self._response_payload,
            raise_for_status=lambda: None,
        )


class ChessPaymentOptionsRouteTestCase(TestCase):
    def test_returns_three_payment_options_when_stripe_unconfigured(self):
        app = _make_app(stripe_secret_key="")
        client = TestClient(app)
        response = client.post(
            "/api/v1/chess/payments/options",
            json={
                "lead_id": "abcdef0123456789aaaa1234bbbbcccc",
                "booking_intent_id": "intent-001",
                "program_key": "beginner",
                "amount_vnd": 1300000,
                "amount_aud": 88,
                "parent_name": "Parent Name",
                "parent_email": "parent@example.com",
                "locale": "en",
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        options = payload["data"]["payment_options"]
        self.assertEqual(len(options), 3)

        # Stripe option falls back gracefully when key missing.
        stripe_option = options[0]
        self.assertEqual(stripe_option["type"], "stripe_aud")
        self.assertFalse(stripe_option.get("configured"))
        self.assertNotIn("stripe_checkout_url", stripe_option)

        # VND QR option carries the Vietcombank BIN.
        vnd_option = options[1]
        self.assertEqual(vnd_option["type"], "vnd_bank_qr")
        self.assertEqual(vnd_option["account_number"], "0071000985789")
        self.assertEqual(vnd_option["bank_name"], "Vietcombank")
        self.assertIn("970436", vnd_option["qr_image_url"])
        self.assertIn("0071000985789", vnd_option["qr_image_url"])
        self.assertIn("amount=1300000", vnd_option["qr_image_url"])
        self.assertTrue(vnd_option["transfer_reference"].startswith("CHESS-"))

        # AUD bank-transfer option carries the Westpac BSB.
        aud_option = options[2]
        self.assertEqual(aud_option["type"], "aud_bank_transfer")
        self.assertEqual(aud_option["bsb"], "732250")
        self.assertEqual(aud_option["account_number"], "785932")
        self.assertEqual(aud_option["bank_name"], "Westpac")
        self.assertEqual(aud_option["transfer_reference"], vnd_option["transfer_reference"])

    def test_transfer_reference_uses_uppercase_last_eight_chars(self):
        app = _make_app(stripe_secret_key="")
        client = TestClient(app)
        response = client.post(
            "/api/v1/chess/payments/options",
            json={
                "lead_id": "lead-AbCdEf-1234567890",
                "program_key": "private",
                "amount_vnd": 2000000,
                "amount_aud": 120,
                "parent_name": "Mai",
                "parent_email": "mai@example.com",
                "locale": "vi",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        ref = response.json()["data"]["transfer_reference"]
        # Last 8 alphanumerics of "leadAbCdEf1234567890" -> "34567890" upper.
        self.assertEqual(ref, "CHESS-34567890")

    def test_includes_stripe_url_when_secret_configured(self):
        app = _make_app(stripe_secret_key="sk_test_chess")
        fake_client = _FakeStripeClient(
            {
                "id": "cs_test_chess_001",
                "url": "https://checkout.stripe.com/c/pay/cs_test_chess_001",
            }
        )

        with patch(
            "api.v1_chess_payment_handlers.httpx.AsyncClient",
            return_value=fake_client,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/chess/payments/options",
                json={
                    "lead_id": "lead-xyz12345",
                    "booking_intent_id": "intent-aaa",
                    "program_key": "tournament",
                    "amount_vnd": 1500000,
                    "amount_aud": 99,
                    "parent_name": "GM Father",
                    "parent_email": "gm@example.com",
                    "locale": "en",
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        options = response.json()["data"]["payment_options"]
        stripe_option = options[0]
        self.assertTrue(stripe_option["configured"])
        self.assertEqual(
            stripe_option["stripe_checkout_url"],
            "https://checkout.stripe.com/c/pay/cs_test_chess_001",
        )
        self.assertEqual(stripe_option["stripe_session_id"], "cs_test_chess_001")
        # And the Stripe HTTP call carried the chess_student_payment metadata.
        body = fake_client.requests[0]["content"].decode()
        self.assertIn("metadata%5Bbookedai_kind%5D=chess_student_payment", body)
        self.assertIn("mode=payment", body)
        self.assertIn("metadata%5Bbooking_intent_id%5D=intent-aaa", body)

    def test_stripe_failure_soft_fails_other_options(self):
        app = _make_app(stripe_secret_key="sk_test_chess")

        class _BoomClient:
            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, *_args, **_kwargs):
                raise RuntimeError("stripe down")

        with patch(
            "api.v1_chess_payment_handlers.httpx.AsyncClient",
            return_value=_BoomClient(),
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/chess/payments/options",
                json={
                    "lead_id": "lead-xyz12345",
                    "program_key": "home",
                    "amount_vnd": 800000,
                    "amount_aud": 55,
                    "parent_name": "Parent",
                    "parent_email": "parent@example.com",
                    "locale": "en",
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        options = response.json()["data"]["payment_options"]
        self.assertFalse(options[0]["configured"])
        self.assertEqual(options[0].get("error"), "stripe_unavailable")
        self.assertEqual(options[1]["type"], "vnd_bank_qr")
        self.assertEqual(options[2]["type"], "aud_bank_transfer")
