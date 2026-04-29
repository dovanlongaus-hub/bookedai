"""Unit tests for the AI Mentor welcome-email helpers in v1_booking_handlers.

Covers:
  * ``_resolve_aimentor_welcome_locale`` — DB lookup with EN fallback
  * ``_render_aimentor_welcome_email`` — subject/text/html composition + locale
  * ``_send_aimentor_welcome_email`` — smtp_configured gate, exception swallow,
    happy-path delegation to ``email_service.send_email``
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
import sys
from unittest import TestCase
from unittest.mock import patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_booking_handlers import (  # noqa: E402
    AIMENTOR_TELEGRAM_URL,
    AIMENTOR_WHATSAPP_URL,
    _render_aimentor_welcome_email,
    _resolve_aimentor_welcome_locale,
    _send_aimentor_welcome_email,
)


PORTAL_URL = "https://portal.bookedai.au/?ref=v1-aim00001&token=tkn-abc"
BOOKING_REF = "v1-aim00001"
SERVICE_NAME = "AI Mentor 1-on-1"


# --- _render_aimentor_welcome_email ---------------------------------------


class RenderAIMentorWelcomeEmailTestCase(TestCase):
    def _render(self, locale: str = "en", customer_name: str | None = "Alex"):
        return _render_aimentor_welcome_email(
            locale=locale,
            customer_name=customer_name,
            booking_reference=BOOKING_REF,
            service_name=SERVICE_NAME,
            portal_url=PORTAL_URL,
        )

    def test_subject_contains_service_name(self):
        subject, _, _ = self._render()
        self.assertIn(SERVICE_NAME, subject)
        self.assertIn("AI Mentor", subject)

    def test_html_body_contains_zoho_meeting(self):
        _, _, html = self._render()
        self.assertIn("Zoho Meeting", html)

    def test_html_body_contains_calendar_mention(self):
        _, _, html = self._render()
        # Welcome strings explicitly call out Google Calendar + .ics.
        self.assertIn("Google Calendar", html)
        self.assertIn(".ics", html)

    def test_both_bodies_contain_portal_url(self):
        _, text, html = self._render()
        self.assertIn(PORTAL_URL, html)
        self.assertIn(PORTAL_URL, text)

    def test_both_bodies_contain_booking_reference(self):
        _, text, html = self._render()
        self.assertIn(BOOKING_REF, html)
        self.assertIn(BOOKING_REF, text)

    def test_text_body_contains_telegram_and_whatsapp_links(self):
        _, text, _ = self._render()
        self.assertIn(AIMENTOR_TELEGRAM_URL, text)
        self.assertIn(AIMENTOR_WHATSAPP_URL, text)

    def test_falls_back_when_customer_name_missing(self):
        _, text, html = self._render(customer_name=None)
        # Default greeting placeholder substitutes "there" when the caller
        # does not supply a name.
        self.assertIn("there", text)
        self.assertIn("there", html)

    def test_falls_back_when_customer_name_blank(self):
        _, text, _ = self._render(customer_name="   ")
        self.assertIn("there", text)

    def test_locale_en_uses_english_copy(self):
        subject, text, html = self._render(locale="en")
        self.assertIn("Welcome to AI Mentor", subject)
        # English-specific copy that won't appear in VI translation.
        self.assertIn("Thanks for booking", text)
        self.assertIn("The AI Mentor team", html)

    def test_locale_vi_uses_vietnamese_copy(self):
        subject, text, html = self._render(locale="vi")
        # Vietnamese-specific tokens.
        self.assertIn("Chào mừng", subject)
        self.assertIn("Chào", text)
        self.assertIn("Đội AI Mentor", html)

    def test_locale_fallback_for_garbage_resolves_to_english(self):
        subject, text, _ = self._render(locale="garbage-string")
        # Garbage falls back to English copy (welcome subject template uses
        # "Welcome to AI Mentor 1-1 Pro").
        self.assertIn("Welcome to AI Mentor", subject)
        self.assertNotIn("Chào", text)

    def test_locale_fallback_for_en_us_resolves_to_english(self):
        subject, _, _ = self._render(locale="en-US")
        self.assertIn("Welcome to AI Mentor", subject)

    def test_locale_fallback_for_vi_VN_resolves_to_vietnamese(self):
        subject, _, _ = self._render(locale="vi-VN")
        self.assertIn("Chào mừng", subject)

    def test_html_lang_attribute_matches_locale(self):
        _, _, html_en = self._render(locale="en")
        _, _, html_vi = self._render(locale="vi")
        self.assertIn('lang="en"', html_en)
        self.assertIn('lang="vi"', html_vi)

    def test_returns_three_strings(self):
        out = self._render()
        self.assertIsInstance(out, tuple)
        self.assertEqual(len(out), 3)
        for part in out:
            self.assertIsInstance(part, str)
            self.assertTrue(part.strip())

    def test_blank_service_name_falls_back_to_default(self):
        subject, text, html = _render_aimentor_welcome_email(
            locale="en",
            customer_name="Alex",
            booking_reference=BOOKING_REF,
            service_name="",
            portal_url=PORTAL_URL,
        )
        # Default service label is "AI Mentor 1-on-1".
        self.assertIn("AI Mentor 1-on-1", subject)
        self.assertIn("AI Mentor 1-on-1", text)
        self.assertIn("AI Mentor 1-on-1", html)


# --- _resolve_aimentor_welcome_locale -------------------------------------


class _ScriptedLocaleSession:
    def __init__(self, *, locale_value):
        self.locale_value = locale_value
        self.calls: list[dict[str, object]] = []

    async def execute(self, statement, params=None):
        params = params or {}
        self.calls.append(dict(params))

        class _Result:
            def __init__(self, value):
                self._value = value

            def scalar_one_or_none(self):
                return self._value

        return _Result(self.locale_value)

    async def commit(self):
        return None

    async def rollback(self):
        return None


class _RaisingLocaleSession:
    async def execute(self, statement, params=None):
        raise RuntimeError("boom — db dropped the connection")

    async def commit(self):
        return None

    async def rollback(self):
        return None


def _fake_get_session_factory(session_obj):
    @asynccontextmanager
    async def _inner(_factory):
        yield session_obj

    return _inner


class ResolveAIMentorWelcomeLocaleTestCase(TestCase):
    def _resolve(self, scripted, *, customer_email: str = "learner@example.com"):
        with patch(
            "api.v1_booking_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            return asyncio.run(
                _resolve_aimentor_welcome_locale(
                    session_factory=object(),
                    customer_email=customer_email,
                )
            )

    def test_returns_vi_when_db_row_is_vi(self):
        scripted = _ScriptedLocaleSession(locale_value="vi")
        self.assertEqual(self._resolve(scripted), "vi")
        # Email is normalised to lowercase before the lookup.
        self.assertEqual(scripted.calls[0]["email"], "learner@example.com")

    def test_returns_en_when_db_row_is_en(self):
        scripted = _ScriptedLocaleSession(locale_value="en")
        self.assertEqual(self._resolve(scripted), "en")

    def test_returns_en_when_db_row_is_missing(self):
        scripted = _ScriptedLocaleSession(locale_value=None)
        self.assertEqual(self._resolve(scripted), "en")

    def test_returns_en_when_db_raises(self):
        scripted = _RaisingLocaleSession()
        self.assertEqual(self._resolve(scripted), "en")

    def test_returns_en_for_blank_email_without_db_call(self):
        scripted = _ScriptedLocaleSession(locale_value="vi")
        result = asyncio.run(
            _resolve_aimentor_welcome_locale(
                session_factory=object(),
                customer_email="",
            )
        )
        self.assertEqual(result, "en")
        # No DB call should have been made for a blank email.
        self.assertEqual(scripted.calls, [])

    def test_lowercases_email_for_lookup(self):
        scripted = _ScriptedLocaleSession(locale_value="vi")
        with patch(
            "api.v1_booking_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            asyncio.run(
                _resolve_aimentor_welcome_locale(
                    session_factory=object(),
                    customer_email="LEARNER@EXAMPLE.COM",
                )
            )
        self.assertEqual(scripted.calls[0]["email"], "learner@example.com")


# --- _send_aimentor_welcome_email -----------------------------------------


class _RecordingEmailService:
    def __init__(self, *, smtp_ok: bool = True, raise_exc: Exception | None = None):
        self._smtp_ok = smtp_ok
        self._raise_exc = raise_exc
        self.send_calls: list[dict[str, object]] = []

    def smtp_configured(self) -> bool:
        return self._smtp_ok

    async def send_email(self, **kwargs):
        self.send_calls.append(dict(kwargs))
        if self._raise_exc is not None:
            raise self._raise_exc
        return None


class SendAIMentorWelcomeEmailTestCase(TestCase):
    def _invoke(self, *, email_service):
        scripted = _ScriptedLocaleSession(locale_value="en")
        with patch(
            "api.v1_booking_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            return asyncio.run(
                _send_aimentor_welcome_email(
                    email_service=email_service,
                    session_factory=object(),
                    customer_email="learner@example.com",
                    customer_name="Alex",
                    booking_reference=BOOKING_REF,
                    service_name=SERVICE_NAME,
                    portal_url=PORTAL_URL,
                )
            )

    def test_returns_false_when_email_service_is_none(self):
        result = asyncio.run(
            _send_aimentor_welcome_email(
                email_service=None,
                session_factory=object(),
                customer_email="learner@example.com",
                customer_name="Alex",
                booking_reference=BOOKING_REF,
                service_name=SERVICE_NAME,
                portal_url=PORTAL_URL,
            )
        )
        self.assertFalse(result)

    def test_returns_false_when_smtp_not_configured(self):
        email_service = _RecordingEmailService(smtp_ok=False)
        result = self._invoke(email_service=email_service)
        self.assertFalse(result)
        # No DB call, no send_email call when SMTP is gated off early.
        self.assertEqual(email_service.send_calls, [])

    def test_sends_email_and_returns_true_on_happy_path(self):
        email_service = _RecordingEmailService(smtp_ok=True)
        result = self._invoke(email_service=email_service)
        self.assertTrue(result)
        self.assertEqual(len(email_service.send_calls), 1)
        call = email_service.send_calls[0]
        # Recipients.
        self.assertEqual(call["to"], ["learner@example.com"])
        # Subject contains the service name (English template).
        self.assertIn(SERVICE_NAME, call["subject"])
        self.assertIn("Welcome to AI Mentor", call["subject"])
        # Bodies match what the renderer would produce.
        self.assertIn(BOOKING_REF, call["text"])
        self.assertIn(BOOKING_REF, call["html"])
        self.assertIn("Zoho Meeting", call["html"])
        self.assertIn(PORTAL_URL, call["html"])
        self.assertIn(PORTAL_URL, call["text"])

    def test_swallows_exceptions_from_send_email(self):
        email_service = _RecordingEmailService(
            smtp_ok=True,
            raise_exc=RuntimeError("smtp connection refused"),
        )
        result = self._invoke(email_service=email_service)
        self.assertFalse(result)
        self.assertEqual(len(email_service.send_calls), 1)

    def test_uses_locale_from_resolver(self):
        # When the DB resolver returns "vi", the rendered subject should
        # be in Vietnamese.
        email_service = _RecordingEmailService(smtp_ok=True)
        scripted = _ScriptedLocaleSession(locale_value="vi")
        with patch(
            "api.v1_booking_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            result = asyncio.run(
                _send_aimentor_welcome_email(
                    email_service=email_service,
                    session_factory=object(),
                    customer_email="learner@example.com",
                    customer_name="Alex",
                    booking_reference=BOOKING_REF,
                    service_name=SERVICE_NAME,
                    portal_url=PORTAL_URL,
                )
            )
        self.assertTrue(result)
        call = email_service.send_calls[0]
        self.assertIn("Chào mừng", call["subject"])
