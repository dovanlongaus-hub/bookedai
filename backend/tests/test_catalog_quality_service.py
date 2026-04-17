from __future__ import annotations

from pathlib import Path
import sys
from unittest import TestCase


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.catalog_quality_service import apply_catalog_quality_gate, derive_catalog_location_tags


class CatalogQualityServiceTestCase(TestCase):
    def test_derive_catalog_location_tags_maps_suburbs_to_metro(self):
        self.assertEqual(
            derive_catalog_location_tags(location="Paddington, Sydney NSW 2021"),
            ["sydney"],
        )
        self.assertEqual(
            derive_catalog_location_tags(location="Southbank VIC 3006"),
            ["melbourne"],
        )
        self.assertEqual(
            derive_catalog_location_tags(location="South Bank, Brisbane QLD 4101"),
            ["brisbane"],
        )
        self.assertEqual(
            derive_catalog_location_tags(location="James Street, Fortitude Valley QLD 4006"),
            ["brisbane"],
        )
        self.assertEqual(
            derive_catalog_location_tags(location="Castle Hill, Sydney NSW 2154"),
            ["sydney"],
        )

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
        self.assertIn("sydney", normalized["tags_json"])
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
            ["missing_location", "missing_price"],
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
        self.assertIn("sydney", normalized["tags_json"])
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

    def test_apply_catalog_quality_gate_does_not_over_tag_unrelated_topics(self):
        payload = {
            "service_id": "led-skin-therapy-sydney",
            "business_name": "Lumina Skin Studio Sydney",
            "name": "LED Skin Therapy Facial",
            "category": "Spa",
            "summary": "Targeted facial treatment combining LED therapy and calming mask.",
            "amount_aud": 149,
            "duration_minutes": 50,
            "location": "Paddington, Sydney NSW 2021",
            "tags_json": ["facial", "spa", "led", "skin", "therapy", "beauty", "treatment"],
            "is_active": 1,
        }

        normalized, warnings = apply_catalog_quality_gate(payload)

        self.assertEqual(warnings, [])
        self.assertIn("facial", normalized["tags_json"])
        self.assertNotIn("physio", normalized["tags_json"])

    def test_apply_catalog_quality_gate_does_not_tag_coworking_as_restaurant(self):
        payload = {
            "service_id": "coworking-membership-tour",
            "business_name": "WOTSO Melbourne",
            "name": "Coworking Membership Tour",
            "category": "Membership and Community",
            "summary": "Tour flexible desks or private offices before choosing a coworking plan.",
            "amount_aud": 5,
            "duration_minutes": 30,
            "location": "Melbourne VIC 3000",
            "tags_json": ["coworking", "membership", "office", "tour", "workspace"],
            "is_active": 1,
        }

        normalized, warnings = apply_catalog_quality_gate(payload)

        self.assertEqual(warnings, [])
        self.assertIn("membership", normalized["tags_json"])
        self.assertNotIn("restaurant", normalized["tags_json"])

    def test_apply_catalog_quality_gate_normalizes_bridal_hair_into_salon_topics(self):
        payload = {
            "service_id": "bridal-hair-brisbane",
            "business_name": "James Street Studio",
            "name": "Bridal Hair Styling",
            "category": "wedding hair",
            "summary": "Wedding and bridal hair styling near Fortitude Valley.",
            "amount_aud": 160,
            "duration_minutes": 90,
            "location": "James Street, Fortitude Valley QLD 4006",
            "tags_json": ["bridal", "wedding", "styling"],
            "is_active": 1,
        }

        normalized, warnings = apply_catalog_quality_gate(payload)

        self.assertEqual(warnings, [])
        self.assertEqual(normalized["category"], "Salon")
        self.assertIn("hair", normalized["tags_json"])
        self.assertIn("brisbane", normalized["tags_json"])
        self.assertEqual(normalized["is_active"], 1)
