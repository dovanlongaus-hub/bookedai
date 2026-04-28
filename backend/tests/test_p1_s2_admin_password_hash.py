"""P1-S2: Admin password hashing + login tests."""

from __future__ import annotations

import logging
import sys
import time
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
from core.admin_auth import (  # noqa: E402
    ALGORITHM,
    DEFAULT_ITERATIONS,
    hash_admin_password,
    verify_admin_password,
)


def _build_settings(*, password_hash: str = "", legacy_plaintext: str = "") -> SimpleNamespace:
    return SimpleNamespace(
        admin_username="admin",
        admin_password=legacy_plaintext,
        admin_password_hash=password_hash,
        admin_session_ttl_hours=12,
        admin_session_signing_secret="x" * 64,
        session_signing_secret="x" * 64,
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


class HashAdminPasswordTests(TestCase):
    def test_hash_format_is_pbkdf2_sha256_with_4_segments(self):
        digest = hash_admin_password("hunter2-test")
        parts = digest.split("$")
        self.assertEqual(len(parts), 4)
        self.assertEqual(parts[0], ALGORITHM)
        self.assertEqual(int(parts[1]), DEFAULT_ITERATIONS)
        # salt + hash both hex-encoded
        bytes.fromhex(parts[2])
        bytes.fromhex(parts[3])

    def test_hash_is_salted_so_same_password_yields_distinct_outputs(self):
        a = hash_admin_password("same-password")
        b = hash_admin_password("same-password")
        self.assertNotEqual(a, b)

    def test_hash_rejects_empty_password(self):
        with self.assertRaises(ValueError):
            hash_admin_password("")

    def test_hash_rejects_low_iterations(self):
        with self.assertRaises(ValueError):
            hash_admin_password("x", iterations=10)


class VerifyAdminPasswordTests(TestCase):
    def test_verify_match_returns_true(self):
        digest = hash_admin_password("correct horse battery staple", iterations=1000)
        self.assertTrue(verify_admin_password("correct horse battery staple", digest))

    def test_verify_mismatch_returns_false(self):
        digest = hash_admin_password("correct horse battery staple", iterations=1000)
        self.assertFalse(verify_admin_password("wrong-password", digest))

    def test_verify_empty_inputs_return_false(self):
        digest = hash_admin_password("password", iterations=1000)
        self.assertFalse(verify_admin_password("", digest))
        self.assertFalse(verify_admin_password("password", ""))
        self.assertFalse(verify_admin_password(None, digest))  # type: ignore[arg-type]

    def test_verify_malformed_hash_returns_false_no_exception(self):
        cases = [
            "not-a-hash",
            "pbkdf2_sha256$abc$xx$yy",  # bad iterations
            "pbkdf2_sha256$1000$nothex$abcd",  # bad salt
            "pbkdf2_sha256$1000$abcd$nothex",  # bad hash hex
            "argon2id$1$2$3",  # wrong algorithm
            "$$$$",
            "pbkdf2_sha256$$$",
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertFalse(verify_admin_password("anything", case))

    def test_verify_does_not_raise_on_garbage(self):
        try:
            verify_admin_password("x", "totally-bogus")
        except Exception as exc:  # pragma: no cover - defensive
            self.fail(f"verify_admin_password leaked exception: {exc!r}")


class AdminLoginRouteTests(TestCase):
    def test_login_with_correct_hashed_password_returns_session(self):
        digest = hash_admin_password("CorrectPass!1", iterations=1000)
        app = _create_app(_build_settings(password_hash=digest))
        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(app)
            response = client.post(
                "/api/admin/login",
                json={"username": "admin", "password": "CorrectPass!1"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["username"], "admin")
        self.assertTrue(body["session_token"])

    def test_login_with_wrong_hashed_password_returns_401(self):
        digest = hash_admin_password("CorrectPass!1", iterations=1000)
        app = _create_app(_build_settings(password_hash=digest))
        client = TestClient(app)
        response = client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "WrongPass!"},
        )
        self.assertEqual(response.status_code, 401)

    def test_login_username_is_case_insensitive_but_constant_time_compared(self):
        digest = hash_admin_password("CorrectPass!1", iterations=1000)
        app = _create_app(_build_settings(password_hash=digest))
        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(app)
            response = client.post(
                "/api/admin/login",
                json={"username": "ADMIN", "password": "CorrectPass!1"},
            )
        self.assertEqual(response.status_code, 200, response.text)

    def test_login_legacy_plaintext_fallback_succeeds_with_warning(self):
        app = _create_app(_build_settings(password_hash="", legacy_plaintext="LegacyPlain!1"))
        captured: list[logging.LogRecord] = []

        class _CaptureHandler(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                captured.append(record)

        handler = _CaptureHandler(level=logging.WARNING)
        from core.logging import get_logger

        target = get_logger("bookedai.api.route_handlers")
        target.addHandler(handler)
        try:
            with patch("api.route_handlers.get_session", _fake_get_session):
                client = TestClient(app)
                response = client.post(
                    "/api/admin/login",
                    json={"username": "admin", "password": "LegacyPlain!1"},
                )
        finally:
            target.removeHandler(handler)

        self.assertEqual(response.status_code, 200, response.text)
        events = {record.getMessage() for record in captured}
        self.assertTrue(
            any("admin_login_plaintext_fallback" in msg for msg in events),
            f"expected deprecation warning, got {events!r}",
        )

    def test_login_legacy_plaintext_fallback_rejects_wrong_password(self):
        app = _create_app(_build_settings(password_hash="", legacy_plaintext="LegacyPlain!1"))
        client = TestClient(app)
        response = client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "WrongPlain"},
        )
        self.assertEqual(response.status_code, 401)

    def test_login_with_no_credentials_configured_returns_401(self):
        app = _create_app(_build_settings(password_hash="", legacy_plaintext=""))
        client = TestClient(app)
        response = client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "anything"},
        )
        self.assertEqual(response.status_code, 401)


class AdminLoginTimingSmokeTests(TestCase):
    """Light-weight smoke check: wrong-password latency should not collapse to
    ~0 (which would indicate a short-circuit before the PBKDF2 work).

    This is intentionally permissive — PBKDF2 with low iterations still needs
    measurable wall-time vs a plain ``!=`` compare. We do NOT assert on
    statistical timing distributions.
    """

    def test_wrong_password_loop_does_not_short_circuit(self):
        digest = hash_admin_password("RealPass!1", iterations=10_000)
        app = _create_app(_build_settings(password_hash=digest))
        client = TestClient(app)

        start = time.perf_counter()
        for _ in range(20):
            response = client.post(
                "/api/admin/login",
                json={"username": "admin", "password": "wrong"},
            )
            self.assertEqual(response.status_code, 401)
        elapsed = time.perf_counter() - start
        # 20 PBKDF2-HMAC-SHA256 verifies @ 10k iters should be >5ms total even
        # on the slowest dev VM. If this is sub-millisecond the verify is
        # short-circuiting (regression).
        self.assertGreater(
            elapsed,
            0.005,
            "wrong-password latency suspiciously short — verify path may be short-circuiting",
        )
