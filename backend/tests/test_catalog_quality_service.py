from __future__ import annotations

from pathlib import Path
import sys
from unittest import TestCase


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.catalog_quality_service import apply_catalog_quality_gate


class CatalogQualityServiceTestCase(TestCase):
    def test_apply_catalog_quality_gate_keeps_valid_service_active(self):
        payload = {
            "service_id": "signature-facial-sydney",
            "business_name": "Harbour Glow Spa",
            "name": "Signature Facial",
            "category": "Spa",
            "summary": "Hydrating facial and LED skincare treatment.",
            "amount_aud": 139,
            "duration_minutes": 60,
            "location": "Sydney NSW 2000",
            "tags_json": ["facial", "skin"],
            "is_active": 1,
        }

        normalized, warnings = apply_catalog_quality_gate(payload)

        self.assertEqual(warnings, [])
        self.assertEqual(normalized["is_active"], 1)
        self.assertIn("facial", normalized["tags_json"])
        self.assertEqual(normalized["category"], "Spa")

    def test_apply_catalog_quality_gate_disables_search_for_incomplete_import(self):
        payload = {
            "service_id": "thin-import",
            "business_name": "Unknown Merchant",
            "name": "Consultation",
            "category": None,
            "summary": None,
            "amount_aud": None,
            "duration_minutes": None,
            "location": None,
            "tags_json": [],
            "is_active": 1,
        }

        normalized, warnings = apply_catalog_quality_gate(payload)

        self.assertEqual(
            sorted(warnings),
            ["missing_category", "missing_location", "missing_price", "missing_topic_tags"],
        )
        self.assertEqual(normalized["is_active"], 0)

    def test_apply_catalog_quality_gate_normalizes_category_from_import_terms(self):
        payload = {
            "service_id": "team-dinner",
            "business_name": "Harbour Social",
            "name": "Private Team Dinner",
            "category": "private dining",
            "summary": "Group dining booking for team celebration dinners.",
            "amount_aud": 85,
            "duration_minutes": 90,
            "location": "Sydney NSW 2000",
            "tags_json": ["dinner", "restaurant"],
            "is_active": 1,
        }

        normalized, warnings = apply_catalog_quality_gate(payload)

        self.assertEqual(warnings, [])
        self.assertEqual(normalized["category"], "Food and Beverage")
        self.assertIn("restaurant", normalized["tags_json"])
        self.assertEqual(normalized["is_active"], 1)

    def test_apply_catalog_quality_gate_disables_search_for_category_topic_mismatch(self):
        payload = {
            "service_id": "bad-spa-record",
            "business_name": "Odd Import",
            "name": "Private Team Dinner",
            "category": "Spa",
            "summary": "Group dining booking for company dinner reservations.",
            "amount_aud": 95,
            "duration_minutes": 90,
            "location": "Sydney NSW 2000",
            "tags_json": ["restaurant", "dinner"],
            "is_active": 1,
        }

        normalized, warnings = apply_catalog_quality_gate(payload)

        self.assertIn("category_topic_mismatch", warnings)
        self.assertEqual(normalized["category"], "Spa")
        self.assertEqual(normalized["is_active"], 0)
