#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
import os
from pathlib import Path
from typing import Any
from urllib import error, request


REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ReplayCase:
    name: str
    query: str
    location: str | None = None
    service_category: str | None = None
    budget: dict[str, Any] | None = None
    time_window: dict[str, Any] | None = None


DEFAULT_REPLAY_CASES: tuple[ReplayCase, ...] = (
    ReplayCase(
        name="haircut-sydney",
        query="men's haircut in Sydney",
        location="Sydney",
        service_category="Salon",
        budget={"max_aud": 80},
        time_window={"label": "tomorrow evening"},
    ),
    ReplayCase(
        name="restaurant-sydney-party-6-tonight",
        query="restaurant table for 6 in Sydney tonight",
        location="Sydney",
        service_category="Food and Beverage",
        time_window={"label": "tonight"},
    ),
    ReplayCase(
        name="physio-parramatta-shoulder-pain",
        query="physio for shoulder pain near Parramatta tomorrow morning",
        location="Parramatta",
        service_category="Healthcare Service",
        time_window={"label": "tomorrow morning"},
    ),
    ReplayCase(
        name="dentist-sydney-checkup",
        query="dentist checkup in Sydney CBD this weekend",
        location="Sydney CBD",
        service_category="Healthcare Service",
        time_window={"label": "this weekend"},
    ),
    ReplayCase(
        name="childcare-sydney",
        query="childcare near Sydney for a 4 year old",
        location="Sydney",
        service_category="Kids Services",
    ),
    ReplayCase(
        name="support-worker-western-sydney",
        query="NDIS support worker at home in Western Sydney tomorrow",
        location="Western Sydney",
        service_category="NDIS Support",
        time_window={"label": "tomorrow"},
    ),
    ReplayCase(
        name="private-dining-melbourne",
        query="private dining in Melbourne for 8 this Friday night",
        location="Melbourne",
        service_category="Food and Beverage",
        time_window={"label": "friday night"},
    ),
    ReplayCase(
        name="gp-clinic-adelaide",
        query="gp clinic Adelaide",
        location="Adelaide",
        service_category="Healthcare Service",
    ),
)


def _normalized_api_base_url(configured_base_url: str | None) -> str:
    base_url = (configured_base_url or os.getenv("PUBLIC_API_URL") or "https://api.bookedai.au").strip()
    base_url = base_url.rstrip("/")
    if base_url.endswith("/api"):
        return base_url
    return f"{base_url}/api"


def _request_payload(case: ReplayCase) -> dict[str, Any]:
    preferences: dict[str, Any] = {}
    if case.service_category:
        preferences["service_category"] = case.service_category
    return {
        "query": case.query,
        "location": case.location,
        "preferences": preferences,
        "budget": case.budget,
        "time_window": case.time_window,
        "channel_context": {
            "channel": "public_web",
            "tenant_id": "default-production-tenant",
            "deployment_mode": "standalone_app",
        },
        "attribution": {
            "source": "search_replay_script",
            "medium": "codex",
            "campaign": "sprint_3_search_truth_replay",
        },
    }


def _post_json(url: str, payload: dict[str, Any], timeout_seconds: float) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; BookedAI Search Replay/1.0)",
            "Origin": "https://bookedai.au",
            "Referer": "https://bookedai.au/",
        },
        method="POST",
    )
    with request.urlopen(req, timeout=timeout_seconds) as response:
        return json.loads(response.read().decode("utf-8"))


def _build_case_summary(case: ReplayCase, response_body: dict[str, Any]) -> dict[str, Any]:
    data = response_body.get("data", {})
    candidates = data.get("candidates", []) or []
    semantic_assist = data.get("semantic_assist", {}) or {}
    search_diagnostics = data.get("search_diagnostics", {}) or {}
    recommendations = data.get("recommendations", []) or []
    final_candidate_ids = search_diagnostics.get("final_candidate_ids", []) or []
    dropped_candidates = search_diagnostics.get("dropped_candidates", []) or []
    top_candidate = candidates[0] if candidates else {}
    top_source_type = top_candidate.get("source_type") or top_candidate.get("sourceType")
    retrieval_candidate_count = search_diagnostics.get("retrieval_candidate_count")
    if candidates and top_source_type == "service_catalog":
        outcome = "tenant_hit"
    elif candidates and top_source_type == "public_web_search":
        outcome = "web_fallback"
    elif not final_candidate_ids and retrieval_candidate_count == 0:
        outcome = "missing_catalog"
    elif not final_candidate_ids and dropped_candidates:
        outcome = "blocked_by_gates"
    else:
        outcome = "no_result_unclear"
    return {
        "name": case.name,
        "query": case.query,
        "location": case.location,
        "service_category": case.service_category,
        "budget": case.budget,
        "time_window": case.time_window,
        "status": response_body.get("status"),
        "search_strategy": data.get("search_strategy"),
        "warnings": data.get("warnings", []) or [],
        "outcome": outcome,
        "top_source_type": top_source_type,
        "semantic_assist": {
            "applied": bool(semantic_assist.get("applied")),
            "provider": semantic_assist.get("provider"),
            "normalized_query": semantic_assist.get("normalized_query"),
            "inferred_location": semantic_assist.get("inferred_location"),
            "inferred_category": semantic_assist.get("inferred_category"),
        },
        "diagnostics_present": bool(search_diagnostics),
        "candidate_preview": [
            {
                "candidate_id": item.get("candidate_id"),
                "service_name": item.get("service_name"),
                "category": item.get("category"),
                "location": item.get("location"),
                "source_type": item.get("source_type") or item.get("sourceType"),
                "match_score": item.get("match_score"),
                "semantic_score": item.get("semantic_score"),
            }
            for item in candidates[:3]
        ],
        "recommendation_preview": recommendations[:1],
        "search_diagnostics": {
            "retrieval_candidate_count": search_diagnostics.get("retrieval_candidate_count"),
            "heuristic_candidate_ids": search_diagnostics.get("heuristic_candidate_ids", []) or [],
            "semantic_candidate_ids": search_diagnostics.get("semantic_candidate_ids", []) or [],
            "post_relevance_candidate_ids": search_diagnostics.get("post_relevance_candidate_ids", []) or [],
            "post_domain_candidate_ids": search_diagnostics.get("post_domain_candidate_ids", []) or [],
            "final_candidate_ids": search_diagnostics.get("final_candidate_ids", []) or [],
            "dropped_candidates": search_diagnostics.get("dropped_candidates", []) or [],
        },
    }


def _build_rollup(results: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {
        "tenant_hit": 0,
        "web_fallback": 0,
        "missing_catalog": 0,
        "blocked_by_gates": 0,
        "no_result_unclear": 0,
        "error": 0,
    }
    for item in results:
        if item.get("error"):
            counts["error"] += 1
            continue
        outcome = str(item.get("outcome") or "no_result_unclear")
        if outcome not in counts:
            counts["no_result_unclear"] += 1
            continue
        counts[outcome] += 1
    return counts


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Replay trust-sensitive /api/v1/matching/search queries and print search diagnostics."
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
        choices=("json", "pretty"),
        default="pretty",
        help="Output format.",
    )
    parser.add_argument(
        "--cases-json",
        help="Path to a JSON file containing an array of replay cases with name/query/location/service_category.",
    )
    return parser.parse_args()


def _load_cases(cases_json: str | None) -> list[ReplayCase]:
    if not cases_json:
        return list(DEFAULT_REPLAY_CASES)

    payload = json.loads(Path(cases_json).read_text(encoding="utf-8"))
    cases: list[ReplayCase] = []
    for item in payload:
        cases.append(
            ReplayCase(
                name=str(item["name"]),
                query=str(item["query"]),
                location=str(item.get("location") or "").strip() or None,
                service_category=str(item.get("service_category") or "").strip() or None,
                budget=item.get("budget") if isinstance(item.get("budget"), dict) else None,
                time_window=item.get("time_window") if isinstance(item.get("time_window"), dict) else None,
            )
        )
    return cases


def main() -> None:
    args = _parse_args()
    api_base_url = _normalized_api_base_url(args.base_url)
    endpoint = f"{api_base_url}/v1/matching/search"
    cases = _load_cases(args.cases_json)

    results: list[dict[str, Any]] = []
    for case in cases:
        payload = _request_payload(case)
        try:
            response_body = _post_json(endpoint, payload, timeout_seconds=args.timeout_seconds)
            results.append(_build_case_summary(case, response_body))
        except error.HTTPError as exc:
            raw_body = exc.read().decode("utf-8", errors="replace")
            results.append(
                {
                    "name": case.name,
                    "query": case.query,
                    "error": f"http_{exc.code}",
                    "response_body": raw_body,
                }
            )
        except Exception as exc:  # pragma: no cover - operational script
            results.append(
                {
                    "name": case.name,
                    "query": case.query,
                    "error": str(exc),
                }
            )

    summary = {
        "api_base_url": api_base_url,
        "endpoint": endpoint,
        "case_count": len(cases),
        "cases": [asdict(case) for case in cases],
        "results": results,
        "rollup": _build_rollup(results),
    }
    if args.output == "json":
        print(json.dumps(summary, indent=2))
        return

    print(f"matching search replay: {endpoint}")
    print(f"rollup: {summary['rollup']}")
    for item in results:
        print()
        print(f"[{item.get('name', 'unknown')}] {item.get('query', '')}")
        if item.get("error"):
            print(f"  error: {item['error']}")
            if item.get("response_body"):
                print(f"  response_body: {item['response_body'][:400]}")
            continue
        print(f"  strategy: {item.get('search_strategy')}")
        print(f"  outcome: {item.get('outcome')} source={item.get('top_source_type')}")
        print(f"  warnings: {item.get('warnings')}")
        print(f"  semantic: {item.get('semantic_assist')}")
        print(f"  candidates: {item.get('candidate_preview')}")
        print(f"  diagnostics: {item.get('search_diagnostics')}")


if __name__ == "__main__":
    main()
