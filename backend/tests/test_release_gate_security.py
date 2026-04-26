from __future__ import annotations

from pathlib import Path
import sys
from unittest import IsolatedAsyncioTestCase, TestCase


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.communication_service import render_bookedai_confirmation_email
from service_layer.messaging_automation_service import MessagingAutomationService


class ReleaseGateSecurityTestCase(TestCase):
    def test_confirmation_email_html_escapes_dynamic_values_and_blocks_unsafe_cta_urls(self):
        rendered = render_bookedai_confirmation_email(
            variables={
                "customer_name": "<script>alert(1)</script>",
                "service_name": "Chess & Swim <b>Trial</b>",
                "slot_label": "16 Apr <now>",
                "booking_reference": "BK-<123>",
                "business_name": "BookedAI <Ops>",
                "venue_name": "Remote & online",
                "support_email": "info@bookedai.au",
                "payment_link": "javascript:alert(1)",
                "additional_note": "Bring <img src=x onerror=alert(1)>",
            },
            public_app_url="https://bookedai.au",
        )

        self.assertNotIn("<script>", rendered.html)
        self.assertNotIn("<b>Trial</b>", rendered.html)
        self.assertNotIn("<img src=x", rendered.html)
        self.assertNotIn("javascript:alert(1)", rendered.html)
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", rendered.html)
        self.assertIn("Chess &amp; Swim &lt;b&gt;Trial&lt;/b&gt;", rendered.html)
        self.assertIn('href="https://bookedai.au"', rendered.html)

    def test_provider_urls_are_allowlisted_before_telegram_controls_or_chat_response(self):
        safe_source_option = {
            "index": 1,
            "candidate_id": "external-1",
            "service_id": "",
            "service_name": "External swim option",
            "booking_url": "javascript:alert(1)",
            "source_url": "https://example.com/swim",
        }
        unsafe_option = {
            "index": 2,
            "candidate_id": "external-2",
            "service_id": "",
            "service_name": "Unsafe option",
            "booking_url": "data:text/html,<script>alert(1)</script>",
            "source_url": "ftp://example.com/swim",
        }

        self.assertEqual(
            MessagingAutomationService._service_option_url("kids swim Sydney", safe_source_option),
            "https://example.com/swim",
        )
        fallback_url = MessagingAutomationService._service_option_url(
            "kids swim Sydney",
            unsafe_option,
        )
        self.assertTrue(fallback_url.startswith("https://bookedai.au/?assistant=open"))
        self.assertNotIn("data:text/html", fallback_url)

        chat_response = MessagingAutomationService._build_bookedai_chat_response(
            query="kids swim Sydney",
            options=[safe_source_option, unsafe_option],
        )
        matched_services = chat_response["matched_services"]
        self.assertEqual(matched_services[0]["booking_url"], "")
        self.assertEqual(matched_services[0]["source_url"], "https://example.com/swim")
        self.assertEqual(matched_services[1]["booking_url"], "")
        self.assertEqual(matched_services[1]["source_url"], "")

    def test_private_channel_identity_policy_never_uses_channel_id_as_booking_identity(self):
        identity = MessagingAutomationService._customer_identity_metadata(
            channel="telegram",
            customer_email=None,
            customer_phone=None,
        )

        self.assertEqual(identity["identity_type"], "missing")
        self.assertTrue(identity["private_channel"])
        self.assertEqual(
            identity["booking_data_policy"],
            "load_by_booking_reference_or_safe_single_phone_email_match_only",
        )


class ReleaseGatePublicWebSearchSecurityTestCase(IsolatedAsyncioTestCase):
    async def test_public_web_options_drop_unsafe_source_urls_and_sanitize_booking_urls(self):
        class _FakePublicSearchService:
            async def search_public_service_candidates(self, **_kwargs):
                return [
                    {
                        "candidate_id": "unsafe-source",
                        "provider_name": "Unsafe Source",
                        "service_name": "Bad source",
                        "source_url": "javascript:alert(1)",
                        "booking_url": "https://example.com/book",
                    },
                    {
                        "candidate_id": "safe-source",
                        "provider_name": "Safe Source",
                        "service_name": "Good source",
                        "source_url": "https://example.com/service",
                        "booking_url": "javascript:alert(1)",
                    },
                ]

        service = MessagingAutomationService(public_search_service=_FakePublicSearchService())
        options = await service._search_public_web_options(query="kids swim Sydney")

        self.assertEqual(len(options), 1)
        self.assertEqual(options[0]["candidate_id"], "safe-source")
        self.assertEqual(options[0]["source_url"], "https://example.com/service")
        self.assertEqual(options[0]["booking_url"], "")
