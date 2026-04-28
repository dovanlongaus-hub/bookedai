"""P1-S1: WhatsApp Meta x-hub-signature-256 verification tests."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.route_handlers import api  # noqa: E402


def _build_settings(
    *,
    app_secret: str = "",
    strict: bool = False,
    environment: str = "test",
) -> SimpleNamespace:
    return SimpleNamespace(
        whatsapp_verify_token="verify-whatsapp-token",
        whatsapp_evolution_webhook_secret="",
        whatsapp_meta_app_secret=app_secret,
        whatsapp_meta_signature_strict=strict,
        environment=environment,
    )


def _create_app(settings: SimpleNamespace) -> FastAPI:
    app = FastAPI()
    app.include_router(api)
    app.state.settings = settings
    app.state.session_factory = object()
    return app


@asynccontextmanager
async def _fake_get_session(_factory):
    yield SimpleNamespace()


def _meta_payload() -> dict:
    return {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {
                                "display_phone_number": "+14155238886",
                                "phone_number_id": "987654321",
                            },
                            "contacts": [
                                {"wa_id": "61455301335", "profile": {"name": "Long"}}
                            ],
                            "messages": [
                                {
                                    "id": "wamid.HBgL",
                                    "from": "61455301335",
                                    "type": "text",
                                    "text": {"body": "P1-S1 sig test"},
                                }
                            ],
                        }
                    }
                ]
            }
        ]
    }


def _sign(body: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


async def _store_event(_session, **_kwargs):
    return None


async def _register(*_args, **_kwargs):
    return False, None, "tenant-test"


async def _complete(*_args, **_kwargs):
    return None


class WhatsAppMetaSignatureTests(TestCase):
    def test_valid_signature_passes_through(self):
        secret = "meta-app-secret-test"
        app = _create_app(_build_settings(app_secret=secret))
        body = json.dumps(_meta_payload(), separators=(",", ":")).encode("utf-8")

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event", _store_event
        ), patch(
            "api.route_handlers._register_whatsapp_webhook_event", _register
        ), patch(
            "api.route_handlers._complete_whatsapp_webhook_event", _complete
        ):
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/whatsapp",
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Hub-Signature-256": _sign(body, secret),
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        # idempotency stub returns False so no messages are processed, but
        # the route must still 200 with messages_processed=0 — what matters
        # for this test is that signature verification passed (no 401).
        self.assertIn("messages_processed", response.json())

    def test_invalid_signature_returns_401(self):
        secret = "meta-app-secret-test"
        app = _create_app(_build_settings(app_secret=secret))
        body = json.dumps(_meta_payload(), separators=(",", ":")).encode("utf-8")
        client = TestClient(app)
        response = client.post(
            "/api/webhooks/whatsapp",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": "sha256=" + ("0" * 64),
            },
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("signature", response.json().get("detail", "").lower())

    def test_missing_signature_with_secret_set_returns_401(self):
        secret = "meta-app-secret-test"
        app = _create_app(_build_settings(app_secret=secret))
        body = json.dumps(_meta_payload(), separators=(",", ":")).encode("utf-8")
        client = TestClient(app)
        response = client.post(
            "/api/webhooks/whatsapp",
            content=body,
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 401)

    def test_no_secret_configured_warns_and_passes(self):
        """Backward-compat: empty WHATSAPP_META_APP_SECRET + strict=false ->
        log a warning and accept the request so existing staging deployments
        do not fail closed on first deploy."""
        app = _create_app(_build_settings(app_secret="", strict=False))
        body = json.dumps(_meta_payload(), separators=(",", ":")).encode("utf-8")

        captured: list[logging.LogRecord] = []

        class _CaptureHandler(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                captured.append(record)

        from core.logging import get_logger

        handler = _CaptureHandler(level=logging.WARNING)
        target = get_logger("bookedai.api.route_handlers")
        target.addHandler(handler)
        try:
            with patch("api.route_handlers.get_session", _fake_get_session), patch(
                "api.route_handlers.store_event", _store_event
            ), patch(
                "api.route_handlers._register_whatsapp_webhook_event", _register
            ), patch(
                "api.route_handlers._complete_whatsapp_webhook_event", _complete
            ):
                client = TestClient(app)
                response = client.post(
                    "/api/webhooks/whatsapp",
                    content=body,
                    headers={"Content-Type": "application/json"},
                )
        finally:
            target.removeHandler(handler)

        self.assertEqual(response.status_code, 200, response.text)
        messages = {record.getMessage() for record in captured}
        self.assertTrue(
            any("whatsapp_meta_signature_unconfigured" in msg for msg in messages),
            f"expected unconfigured warning, got {messages!r}",
        )

    def test_no_secret_configured_strict_mode_returns_401(self):
        app = _create_app(_build_settings(app_secret="", strict=True))
        body = json.dumps(_meta_payload(), separators=(",", ":")).encode("utf-8")
        client = TestClient(app)
        response = client.post(
            "/api/webhooks/whatsapp",
            content=body,
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 401)

    def test_empty_body_handled_gracefully(self):
        """Empty body + signature absent + strict false -> warn and 200 with
        ignored status. Empty body must never crash the handler."""
        app = _create_app(_build_settings(app_secret="", strict=False))
        client = TestClient(app)
        response = client.post(
            "/api/webhooks/whatsapp",
            content=b"",
            headers={"Content-Type": "application/json"},
        )
        # Either 200 with ignored payload (preferred) or 400 — must not 500.
        self.assertIn(response.status_code, (200, 400))
        if response.status_code == 200:
            self.assertEqual(response.json().get("messages_processed"), 0)

    def test_twilio_form_post_unaffected_by_meta_signature_check(self):
        """Twilio sends form-encoded payloads — they should NOT be subject to
        Meta signature verification (Twilio uses its own X-Twilio-Signature)."""
        app = _create_app(_build_settings(app_secret="meta-secret"))

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event", _store_event
        ), patch(
            "api.route_handlers._register_whatsapp_webhook_event", _register
        ), patch(
            "api.route_handlers._complete_whatsapp_webhook_event", _complete
        ):
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/whatsapp",
                data={
                    "Body": "Twilio inbound",
                    "From": "whatsapp:+61455301335",
                    "To": "whatsapp:+14155238886",
                    "ProfileName": "Long",
                    "MessageSid": "SM-twilio-form",
                    "WaId": "61455301335",
                },
            )
        self.assertEqual(response.status_code, 200, response.text)
