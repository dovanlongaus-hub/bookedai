#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _build_payload(service: Any) -> dict[str, Any]:
    business_name = getattr(service, "venue_name", None) or getattr(service, "name", None)
    return {
        "service_id": service.id,
        "business_name": business_name,
        "business_email": getattr(service, "business_email", None),
        "name": service.name,
        "category": service.category,
        "summary": service.summary,
        "amount_aud": service.amount_aud,
        "duration_minutes": service.duration_minutes,
        "venue_name": service.venue_name,
        "location": service.location,
        "map_url": service.map_url,
        "booking_url": service.booking_url,
        "image_url": service.image_url,
        "source_url": None,
        "tags_json": list(service.tags),
        "featured": service.featured,
        "is_active": 1,
    }


def main() -> None:
    from service_layer.catalog_quality_service import apply_catalog_quality_gate
    from services import SERVICE_CATALOG

    findings: list[dict[str, Any]] = []
    warning_records = 0
    metro_tagged_records = 0
    warning_class_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}

    for service in SERVICE_CATALOG:
        payload = _build_payload(service)
        normalized, warnings = apply_catalog_quality_gate(payload)
        if warnings:
            warning_records += 1
            for warning in warnings:
                warning_class_counts[warning] = warning_class_counts.get(warning, 0) + 1
        metro_tags = [
            tag
            for tag in normalized.get("tags_json") or []
            if tag in {"sydney", "melbourne", "brisbane", "wollongong", "newcastle", "adelaide", "perth", "canberra"}
        ]
        if metro_tags:
            metro_tagged_records += 1
        category = normalized.get("category") or "uncategorized"
        category_counts[str(category)] = category_counts.get(str(category), 0) + 1

        findings.append(
            {
                "service_id": service.id,
                "category": normalized.get("category"),
                "location": service.location,
                "metro_tags": metro_tags,
                "quality_warnings": warnings,
                "normalized_tags": normalized.get("tags_json") or [],
            }
        )

    summary = {
        "total_seed_records": len(SERVICE_CATALOG),
        "records_with_quality_warnings": warning_records,
        "records_with_metro_tags": metro_tagged_records,
        "warning_class_counts": warning_class_counts,
        "category_counts": category_counts,
        "findings": findings,
    }
    print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
