#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from evals.search_eval_pack import evaluate_search_cases


def main() -> None:
    results = evaluate_search_cases()
    passed = [item for item in results if item["passed"]]
    failed = [item for item in results if not item["passed"]]
    summary = {
        "total_cases": len(results),
        "passed_cases": len(passed),
        "failed_cases": len(failed),
        "results": results,
    }
    print(json.dumps(summary, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
