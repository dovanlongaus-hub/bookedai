#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import run_matching_search_replay as replay


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CASES_JSON = REPO_ROOT / "docs" / "development" / "english-search-replay-pack.json"
DEFAULT_REPORT_DIR = REPO_ROOT / "artifacts" / "search-replay-gate"
TENANT_EXPECTED = "tenant_hit"
WEB_EXPECTED = "web_fallback"
HOSPITALITY_CASES = {
    "restaurant-sydney-party-6-tonight",
    "private-dining-melbourne",
}


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run production-shaped search replay cohorts and emit a promote_ready/hold decision."
    )
    parser.add_argument(
        "--cases-json",
        default=str(DEFAULT_CASES_JSON),
        help="Replay case JSON file. Defaults to docs/development/english-search-replay-pack.json",
    )
    parser.add_argument(
        "--base-url",
        help="API base URL. Defaults to PUBLIC_API_URL with /api appended when needed.",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=60.0,
        help="HTTP timeout per replay request.",
    )
    parser.add_argument(
        "--output",
        choices=("pretty", "json"),
        default="pretty",
        help="Console output format.",
    )
    parser.add_argument(
        "--report-dir",
        default=str(DEFAULT_REPORT_DIR),
        help="Directory for markdown and json report artifacts.",
    )
    parser.add_argument(
        "--skip-report",
        action="store_true",
        help="Do not write report artifacts.",
    )
    return parser.parse_args()


def _run_cases(
    *,
    api_base_url: str,
    endpoint: str,
    cases: list[replay.ReplayCase],
    timeout_seconds: float,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for case in cases:
        payload = replay._request_payload(case)
        try:
            response_body = replay._post_json(endpoint, payload, timeout_seconds=timeout_seconds)
            results.append(replay._build_case_summary(case, response_body))
        except Exception as exc:  # pragma: no cover - operational script
            results.append(
                {
                    "name": case.name,
                    "query": case.query,
                    "location": case.location,
                    "service_category": case.service_category,
                    "expected_outcome": case.expected_outcome,
                    "error": str(exc),
                }
            )
    return results


def _cohort_stats(results: list[dict[str, Any]], expected_outcome: str) -> dict[str, Any]:
    matching = [item for item in results if item.get("expected_outcome") == expected_outcome]
    unexpected_tenant_results = sum(
        1
        for item in matching
        if item.get("top_source_type") == "service_catalog" and item.get("expected_outcome") != TENANT_EXPECTED
    )
    sourced_fallback = sum(1 for item in matching if item.get("outcome") == WEB_EXPECTED)
    expectation_mismatches = sum(1 for item in matching if item.get("expectation_matched") is False)
    errors = sum(1 for item in matching if item.get("error"))
    return {
        "case_count": len(matching),
        "sourced_fallback_count": sourced_fallback,
        "expectation_mismatches": expectation_mismatches,
        "unexpected_tenant_results": unexpected_tenant_results,
        "errors": errors,
    }


def _build_decision(results: list[dict[str, Any]]) -> tuple[str, list[str], dict[str, Any]]:
    tenant_cases = [item for item in results if item.get("expected_outcome") == TENANT_EXPECTED]
    web_cases = [item for item in results if item.get("expected_outcome") == WEB_EXPECTED]

    tenant_stats = _cohort_stats(results, TENANT_EXPECTED)
    web_stats = _cohort_stats(results, WEB_EXPECTED)

    tenant_hits = sum(1 for item in tenant_cases if item.get("outcome") == TENANT_EXPECTED)
    hospitality_failures = [
        item.get("name")
        for item in web_cases
        if item.get("name") in HOSPITALITY_CASES and item.get("outcome") != WEB_EXPECTED
    ]

    reasons: list[str] = []
    if tenant_hits != len(tenant_cases):
        reasons.append(
            f"tenant-positive cohort returned {tenant_hits}/{len(tenant_cases)} tenant_hit outcomes"
        )
    if tenant_stats["expectation_mismatches"] != 0:
        reasons.append(
            f"tenant-positive cohort has {tenant_stats['expectation_mismatches']} expectation mismatches"
        )
    if web_stats["sourced_fallback_count"] < 4:
        reasons.append(
            f"public-web fallback cohort returned {web_stats['sourced_fallback_count']}/{len(web_cases)} sourced fallback outcomes"
        )
    if web_stats["unexpected_tenant_results"] != 0:
        reasons.append(
            f"public-web fallback cohort surfaced {web_stats['unexpected_tenant_results']} unexpected tenant results"
        )
    if len(hospitality_failures) == len(HOSPITALITY_CASES):
        reasons.append("both hospitality replay cases failed in the same pass")
    if tenant_stats["errors"] or web_stats["errors"]:
        reasons.append(
            f"replay execution errors detected: tenant={tenant_stats['errors']} public_web={web_stats['errors']}"
        )

    decision = "promote_ready" if not reasons else "hold"
    summary = {
        "tenant_positive": {
            **tenant_stats,
            "tenant_hit_count": tenant_hits,
            "required_tenant_hit_count": len(tenant_cases),
        },
        "public_web_fallback": {
            **web_stats,
            "required_min_sourced_fallback_count": 4,
            "hospitality_failures": hospitality_failures,
        },
    }
    return decision, reasons, summary


def _write_report(
    *,
    report_dir: Path,
    payload: dict[str, Any],
) -> tuple[Path, Path]:
    report_dir.mkdir(parents=True, exist_ok=True)
    timestamp = payload["timestamp"]
    json_path = report_dir / f"search-replay-gate-{timestamp}.json"
    md_path = report_dir / f"search-replay-gate-{timestamp}.md"
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    tenant = payload["cohorts"]["tenant_positive"]
    web = payload["cohorts"]["public_web_fallback"]
    reasons = payload["decision"]["reasons"]
    md_lines = [
        "# Search Replay Gate Report",
        "",
        f"Date: `{timestamp}`",
        "",
        "## Decision",
        "",
        f"- decision: `{payload['decision']['status']}`",
    ]
    if reasons:
        md_lines.append(f"- reasons: {'; '.join(reasons)}")
    else:
        md_lines.append("- reasons: none")
    md_lines.extend(
        [
            "",
            "## Cohort summary",
            "",
            f"- tenant-positive: `{tenant['tenant_hit_count']}/{tenant['required_tenant_hit_count']}` tenant hits",
            f"- tenant-positive expectation mismatches: `{tenant['expectation_mismatches']}`",
            f"- public-web sourced fallback: `{web['sourced_fallback_count']}/{web['case_count']}`",
            f"- public-web unexpected tenant results: `{web['unexpected_tenant_results']}`",
            f"- hospitality failures in this pass: `{', '.join(web['hospitality_failures']) or 'none'}`",
            "",
            "## Threshold baseline",
            "",
            "- tenant-positive cohort must remain `5/5 tenant_hit`",
            "- tenant-positive cohort must remain `0 expectation_mismatches`",
            "- public-web fallback cohort must remain at or above `4/7` sourced fallback outcomes",
            "- both cohorts must keep `0` unexpected tenant results in the current baseline",
            "",
            "## Artifact references",
            "",
            f"- json: `{json_path}`",
        ]
    )
    md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")
    return json_path, md_path


def main() -> None:
    args = _parse_args()
    api_base_url = replay._normalized_api_base_url(args.base_url)
    endpoint = f"{api_base_url}/v1/matching/search"
    cases = replay._load_cases(args.cases_json)
    results = _run_cases(
        api_base_url=api_base_url,
        endpoint=endpoint,
        cases=cases,
        timeout_seconds=args.timeout_seconds,
    )
    decision, reasons, cohorts = _build_decision(results)
    payload = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
        "api_base_url": api_base_url,
        "endpoint": endpoint,
        "cases_json": str(args.cases_json),
        "case_count": len(cases),
        "cases": [asdict(case) for case in cases],
        "cohorts": cohorts,
        "decision": {
            "status": decision,
            "reasons": reasons,
        },
        "results": results,
    }

    report_paths: dict[str, str] = {}
    if not args.skip_report:
        json_path, md_path = _write_report(report_dir=Path(args.report_dir), payload=payload)
        report_paths = {"json": str(json_path), "markdown": str(md_path)}
        payload["report_paths"] = report_paths

    if args.output == "json":
        print(json.dumps(payload, indent=2))
    else:
        print(f"search replay gate: {endpoint}")
        print(f"decision: {decision}")
        if reasons:
            for reason in reasons:
                print(f"- {reason}")
        else:
            print("- all replay thresholds satisfied")
        print(f"tenant-positive: {cohorts['tenant_positive']['tenant_hit_count']}/{cohorts['tenant_positive']['required_tenant_hit_count']}")
        print(f"public-web fallback: {cohorts['public_web_fallback']['sourced_fallback_count']}/{cohorts['public_web_fallback']['case_count']}")
        if report_paths:
            print(f"report: {report_paths['markdown']}")

    if decision != "promote_ready":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
