#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
import sys
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _build_payload(service: Any) -> dict[str, Any]:
    return {
        "service_id": service.service_id,
        "business_name": service.business_name,
        "business_email": service.business_email,
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
        "source_url": service.source_url,
        "tags_json": list(service.tags_json or []),
        "featured": service.featured,
        "is_active": service.is_active,
    }


def _diff_record(service: Any, normalized: dict[str, Any], warnings: list[str]) -> dict[str, Any] | None:
    changes: dict[str, Any] = {}
    for field in ("category", "tags_json", "is_active"):
        current_value = getattr(service, field)
        next_value = normalized.get(field)
        if current_value != next_value:
            changes[field] = {
                "from": current_value,
                "to": next_value,
            }

    if not changes and not warnings:
        return None

    return {
        "service_id": service.service_id,
        "business_name": service.business_name,
        "name": service.name,
        "changes": changes,
        "quality_warnings": warnings,
    }


async def run(*, apply: bool, limit: int) -> None:
    from sqlalchemy import select

    from config import get_settings
    from db import ServiceMerchantProfile, create_engine, create_session_factory
    from service_layer.catalog_quality_service import apply_catalog_quality_gate

    settings = get_settings()
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    session = session_factory()

    try:
        services = (
            await session.execute(
                select(ServiceMerchantProfile).order_by(ServiceMerchantProfile.id)
            )
        ).scalars().all()

        changed_count = 0
        downgraded_count = 0
        warning_count = 0
        category_normalized_count = 0
        sampled_findings: list[dict[str, Any]] = []

        for service in services:
            payload = _build_payload(service)
            normalized, warnings = apply_catalog_quality_gate(payload)
            finding = _diff_record(service, normalized, warnings)
            if not finding:
                continue

            changed_count += 1
            if warnings:
                warning_count += 1
            if service.is_active and normalized.get("is_active") == 0:
                downgraded_count += 1
            if service.category != normalized.get("category"):
                category_normalized_count += 1

            if len(sampled_findings) < limit:
                sampled_findings.append(finding)

            if apply:
                service.category = normalized.get("category")
                service.tags_json = list(normalized.get("tags_json") or [])
                service.is_active = int(normalized.get("is_active") or 0)

        if apply:
            await session.commit()

        summary = {
            "mode": "apply" if apply else "dry_run",
            "total_records": len(services),
            "records_needing_changes": changed_count,
            "records_with_quality_warnings": warning_count,
            "records_downgraded_to_inactive": downgraded_count,
            "records_with_category_normalization": category_normalized_count,
            "sample_findings": sampled_findings,
        }
        print(json.dumps(summary, indent=2, default=str))
    finally:
        await session.close()
        await engine.dispose()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit and optionally backfill service_merchant_profiles against catalog quality rules."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write normalized category, tags, and is_active state back to the database.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Maximum number of sample findings to print. Defaults to 20.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run(apply=args.apply, limit=max(args.limit, 1)))


if __name__ == "__main__":
    main()
