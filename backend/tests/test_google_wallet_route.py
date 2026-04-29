"""Tests for GET /api/v1/orders/{order_reference}/wallet/google."""

from __future__ import annotations

import base64
import json
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase, skipUnless
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_router import router as v1_router  # noqa: E402


def _make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="t",
        admin_password="p",
        admin_session_ttl_hours=8,
        google_oauth_client_id="g",
        session_signing_secret="s",
        tenant_session_signing_secret="ts",
    )
    return app


class _NoopSession:
    async def execute(self, *_a, **_kw):
        class _Empty:
            def scalar_one_or_none(self):
                return None

        return _Empty()

    async def commit(self):
        return None


@asynccontextmanager
async def _fake_get_session(_factory):
    yield _NoopSession()


_SAMPLE_ENVELOPE = {
    "order_reference": "BAI-CHESS-002",
    "status": "confirmed",
    "created_at": "2026-04-20T09:30:00+00:00",
    "customer": {"name": "Demo Parent", "email": "parent@example.com", "phone": None},
    "sessions": [
        {
            "id": "slot-002",
            "starts_at": "2026-05-04T19:00:00+07:00",
            "duration_minutes": 60,
            "timezone": "Asia/Ho_Chi_Minh",
            "program_name": "Chess Private 1-on-1 Coaching",
            "tier": "2",
            "cohort_label": "Tue 19:00 cohort",
            "meeting_url": "https://meet.zoho.com/xyz",
            "calendar_event_url": "https://calendar.zoho.com/event/xyz",
            "session_status": "upcoming",
        }
    ],
    "payment": {
        "method": "stripe",
        "currency": "AUD",
        "amount": 65,
        "status": "paid",
        "paid_at": None,
        "receipt_url": None,
    },
    "coach": {
        "display_name": "WGM Mai Hưng",
        "title_short": "WGM",
        "bio_short": "Vietnamese Woman Grandmaster.",
    },
    "promo": {"applied": False, "code": None, "discount_pct": None, "label": None},
    "support": {
        "email": "chess@bookedai.au",
        "phone": None,
        "telegram": None,
        "whatsapp": None,
    },
}


async def _fake_load_envelope(_session, *, order_reference):
    if order_reference == "BAI-CHESS-002":
        return dict(_SAMPLE_ENVELOPE)
    return None


try:  # pragma: no cover - import guard
    from cryptography.hazmat.primitives import serialization as _serialization
    from cryptography.hazmat.primitives.asymmetric import rsa as _rsa

    _CRYPTOGRAPHY_AVAILABLE = True
except ImportError:  # pragma: no cover
    _serialization = None  # type: ignore
    _rsa = None  # type: ignore
    _CRYPTOGRAPHY_AVAILABLE = False


def _generate_service_account_json() -> str:
    """Generate a fresh service account JSON with a valid RSA key for tests."""
    key = _rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem_private = key.private_bytes(
        encoding=_serialization.Encoding.PEM,
        format=_serialization.PrivateFormat.PKCS8,
        encryption_algorithm=_serialization.NoEncryption(),
    ).decode("ascii")
    return json.dumps(
        {
            "type": "service_account",
            "client_email": "wallet-test@bookedai.iam.gserviceaccount.com",
            "private_key": pem_private,
        }
    )


class GoogleWalletRouteTestCase(TestCase):
    def test_returns_503_when_env_not_configured(self):
        with patch.dict(
            "os.environ",
            {
                "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON": "",
                "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_PATH": "",
                "GOOGLE_WALLET_ISSUER_ID": "",
                "GOOGLE_WALLET_EVENT_CLASS_ID": "",
            },
            clear=False,
        ), patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._load_order_envelope", _fake_load_envelope
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/BAI-CHESS-002/wallet/google")

        self.assertEqual(response.status_code, 503, response.text)
        body = response.json()
        self.assertEqual(body["error"], "google_wallet_not_configured")

    def test_returns_404_when_order_unknown(self):
        async def _no_envelope(_session, *, order_reference):
            return None

        with patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._load_order_envelope", _no_envelope
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/NOPE/wallet/google")

        self.assertEqual(response.status_code, 404, response.text)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "order_not_found")

    @skipUnless(
        _CRYPTOGRAPHY_AVAILABLE,
        "cryptography package not installed in this environment",
    )
    def test_returns_save_url_when_configured(self):
        sa_json = _generate_service_account_json()
        env = {
            "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON": sa_json,
            "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_PATH": "",
            "GOOGLE_WALLET_ISSUER_ID": "3388000000099999999",
            "GOOGLE_WALLET_EVENT_CLASS_ID": "3388000000099999999.bookedai_chess_session",
        }

        with patch.dict("os.environ", env, clear=False), patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._load_order_envelope", _fake_load_envelope
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/BAI-CHESS-002/wallet/google")

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        save_url = body["data"]["save_url"]
        self.assertTrue(
            save_url.startswith("https://pay.google.com/gp/v/save/"),
            save_url,
        )
        # Decode the JWT payload (3 segments: header.payload.signature) and
        # confirm the order/session details landed in the eventTicketObject.
        jwt = save_url.rsplit("/", 1)[-1]
        segments = jwt.split(".")
        self.assertEqual(len(segments), 3)
        payload_seg = segments[1]
        padding = "=" * (-len(payload_seg) % 4)
        decoded = json.loads(
            base64.urlsafe_b64decode((payload_seg + padding).encode("ascii")).decode(
                "utf-8"
            )
        )
        self.assertEqual(decoded["aud"], "google")
        self.assertEqual(decoded["typ"], "savetowallet")
        objects = decoded["payload"]["eventTicketObjects"]
        self.assertEqual(len(objects), 1)
        obj = objects[0]
        self.assertEqual(obj["classId"], env["GOOGLE_WALLET_EVENT_CLASS_ID"])
        self.assertTrue(obj["id"].endswith("BAI-CHESS-002"))
        self.assertEqual(obj["state"], "ACTIVE")
        self.assertEqual(obj["barcode"]["type"], "QR_CODE")
        self.assertEqual(obj["ticketNumber"], "BAI-CHESS-002")
        # Coach + meeting URL travel along inside the textModulesData rows.
        text_bodies = [m.get("body") for m in obj["textModulesData"]]
        self.assertIn("WGM Mai Hưng", text_bodies)
        self.assertIn("https://meet.zoho.com/xyz", text_bodies)
