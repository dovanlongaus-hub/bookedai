from __future__ import annotations

from pathlib import Path
import sys
from unittest import TestCase


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from evals.search_eval_pack import SEARCH_EVAL_CASES, evaluate_search_cases


class SearchEvalPackTestCase(TestCase):
    def test_fixed_query_eval_pack_passes(self):
        results = evaluate_search_cases()

        self.assertEqual(len(results), len(SEARCH_EVAL_CASES))
        self.assertTrue(all(item["passed"] for item in results), results)

    def test_fixed_query_eval_pack_includes_empty_result_guard_cases(self):
        results = {item["name"]: item for item in evaluate_search_cases()}

        self.assertEqual(results["facial-melbourne-no-false-positive"]["actual_ids"], [])
        self.assertEqual(results["signage-sydney-no-incomplete-records"]["actual_ids"], [])
