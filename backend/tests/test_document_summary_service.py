from __future__ import annotations

from pathlib import Path
import sys
from unittest import TestCase


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.document_summary_service import DocumentSummaryService


class DocumentSummaryServiceTestCase(TestCase):
    def setUp(self) -> None:
        self.service = DocumentSummaryService()

    def test_build_sprint_summary_uses_requested_sprint_doc(self):
        summary = self.service.build_sprint_summary("14")

        self.assertIn("Sprint 14 summary:", summary)
        self.assertIn("docs/development/sprint-14-owner-execution-checklist.md", summary)

    def test_build_phase_summary_supports_specific_phase_section(self):
        summary = self.service.build_phase_summary("8")

        self.assertIn("Phase 8 summary:", summary)
        self.assertIn("issue-first admin IA", summary)

    def test_build_phase_summary_maps_group_alias(self):
        summary = self.service.build_phase_summary("3")

        self.assertIn("Phase 3-6 summary:", summary)
        self.assertIn("trace demand from source into bookings and payment state", summary)

    def test_build_completion_summary_rejects_unknown_kind(self):
        summary = self.service.build_completion_summary("milestone", "14")

        self.assertIn("Unsupported completion kind", summary)
