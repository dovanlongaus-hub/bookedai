from __future__ import annotations

from pathlib import Path
import sys
from unittest import TestCase

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.booking_assistant_runtime import rank_services
from services import GENERIC_MATCH_TOKENS, SERVICE_CATALOG


class BookingAssistantRuntimeTestCase(TestCase):
    def test_rank_services_suppresses_wrong_domain_when_core_intent_missing(self):
        ranked = rank_services(
            'cleaner in sydney this weekend',
            services=SERVICE_CATALOG,
            max_service_matches=6,
            generic_match_tokens=GENERIC_MATCH_TOKENS,
        )

        self.assertEqual(ranked, [])

    def test_rank_services_keeps_swim_matches_for_swim_intent(self):
        ranked = rank_services(
            'kids swimming lessons in caringbah this weekend',
            services=SERVICE_CATALOG,
            max_service_matches=6,
            generic_match_tokens=GENERIC_MATCH_TOKENS,
        )

        self.assertTrue(ranked)
        self.assertIn('swim', ranked[0].service.name.lower())
