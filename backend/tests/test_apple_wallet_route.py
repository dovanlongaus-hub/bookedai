"""Tests for GET /api/v1/orders/{order_reference}/wallet/apple."""

from __future__ import annotations

import io
import sys
import zipfile
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
    "order_reference": "BAI-CHESS-001",
    "status": "confirmed",
    "created_at": "2026-04-20T09:30:00+00:00",
    "customer": {
        "name": "Demo Parent",
        "email": "parent@example.com",
        "phone": None,
    },
    "sessions": [
        {
            "id": "slot-001",
            "starts_at": "2026-05-04T19:00:00+07:00",
            "duration_minutes": 60,
            "timezone": "Asia/Ho_Chi_Minh",
            "program_name": "Chess Private 1-on-1 Coaching",
            "tier": "2",
            "cohort_label": "Tue 19:00 cohort",
            "meeting_url": "https://meet.zoho.com/abc",
            "calendar_event_url": "https://calendar.zoho.com/event/abc",
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
        "bio_short": "Vietnamese Woman Grandmaster, peak Elo 2357.",
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
    if order_reference == "BAI-CHESS-001":
        return dict(_SAMPLE_ENVELOPE)
    return None


class AppleWalletRouteTestCase(TestCase):
    def test_returns_503_when_env_not_configured(self):
        # Strip env so the handler hits the unconfigured branch.
        with patch.dict(
            "os.environ",
            {
                "APPLE_WALLET_PASS_TYPE_ID": "",
                "APPLE_WALLET_TEAM_ID": "",
                "APPLE_WALLET_PASS_CERT_PATH": "",
                "APPLE_WALLET_PASS_KEY_PATH": "",
                "APPLE_WALLET_WWDR_CERT_PATH": "",
                "APPLE_WALLET_PASS_KEY_PASSPHRASE": "",
            },
            clear=False,
        ), patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._load_order_envelope", _fake_load_envelope
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/BAI-CHESS-001/wallet/apple")

        self.assertEqual(response.status_code, 503, response.text)
        body = response.json()
        self.assertEqual(body["error"], "apple_wallet_not_configured")
        self.assertIn("APPLE_WALLET_", body["message"])

    def test_returns_404_when_order_unknown(self):
        async def _no_envelope(_session, *, order_reference):
            return None

        with patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._load_order_envelope", _no_envelope
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/NOPE/wallet/apple")

        self.assertEqual(response.status_code, 404, response.text)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "order_not_found")

    def test_returns_pkpass_binary_when_configured(self):
        """Stub openssl signing + cert paths to verify the .pkpass shape."""
        import tempfile

        tmp = tempfile.mkdtemp()
        cert_path = Path(tmp) / "pass.pem"
        key_path = Path(tmp) / "pass.key"
        wwdr_path = Path(tmp) / "wwdr.pem"
        for path in (cert_path, key_path, wwdr_path):
            path.write_bytes(
                b"-----BEGIN CERTIFICATE-----\nFAKEFAKEFAKE\n-----END CERTIFICATE-----\n"
            )

        # Reuse the existing chess wallet asset directory shipped with the repo.
        assets_dir = BACKEND_ROOT / "assets" / "wallet" / "chess"
        self.assertTrue(
            (assets_dir / "icon.png").exists(),
            f"placeholder PNG assets must exist under {assets_dir}",
        )

        env = {
            "APPLE_WALLET_PASS_TYPE_ID": "pass.au.bookedai.chess.test",
            "APPLE_WALLET_TEAM_ID": "TEAM12345",
            "APPLE_WALLET_PASS_CERT_PATH": str(cert_path),
            "APPLE_WALLET_PASS_KEY_PATH": str(key_path),
            "APPLE_WALLET_WWDR_CERT_PATH": str(wwdr_path),
            "APPLE_WALLET_PASS_KEY_PASSPHRASE": "",
            "APPLE_WALLET_ASSETS_DIR": str(assets_dir),
        }

        # Mock the openssl shell-out so the test does not need a real cert.
        def _fake_subprocess_run(cmd, *args, **kwargs):
            # The real call writes the signature to the path after `-out`.
            try:
                out_idx = cmd.index("-out")
                Path(cmd[out_idx + 1]).write_bytes(b"FAKE-PKCS7-DER-SIGNATURE")
            except (ValueError, IndexError):
                pass

            class _Done:
                returncode = 0
                stderr = b""
                stdout = b""

            return _Done()

        with patch.dict("os.environ", env, clear=False), patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._load_order_envelope", _fake_load_envelope
        ), patch(
            "service_layer.wallet_apple_service.subprocess.run",
            _fake_subprocess_run,
        ), patch(
            "service_layer.wallet_apple_service.shutil.which",
            lambda name: "/usr/bin/openssl" if name == "openssl" else None,
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/BAI-CHESS-001/wallet/apple")

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.headers["content-type"], "application/vnd.apple.pkpass"
        )
        self.assertGreater(len(response.content), 0)

        archive = zipfile.ZipFile(io.BytesIO(response.content))
        names = set(archive.namelist())
        self.assertIn("pass.json", names)
        self.assertIn("manifest.json", names)
        self.assertIn("signature", names)
        for asset in ("icon.png", "icon@2x.png", "logo.png", "logo@2x.png"):
            self.assertIn(asset, names)

        import json as _json

        pass_payload = _json.loads(archive.read("pass.json").decode("utf-8"))
        self.assertEqual(pass_payload["serialNumber"], "BAI-CHESS-001")
        self.assertEqual(
            pass_payload["passTypeIdentifier"], "pass.au.bookedai.chess.test"
        )
        self.assertEqual(pass_payload["teamIdentifier"], "TEAM12345")
        # eventTicket structure carries the program + meeting URL + coach.
        primary = pass_payload["eventTicket"]["primaryFields"][0]["value"]
        self.assertEqual(primary, "Chess Private 1-on-1 Coaching")
        secondary_values = [
            f["value"] for f in pass_payload["eventTicket"]["secondaryFields"]
        ]
        self.assertIn("https://meet.zoho.com/abc", secondary_values)
        aux_values = [
            f["value"] for f in pass_payload["eventTicket"]["auxiliaryFields"]
        ]
        self.assertIn("WGM Mai Hưng", aux_values)
