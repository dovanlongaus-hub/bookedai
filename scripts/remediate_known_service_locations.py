#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
import sys
from typing import Any
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


KNOWN_LOCATION_RULES: tuple[dict[str, str], ...] = (
    {
        "business_name": "NOVO PRINT",
        "source_domain": "novoprints.com.au",
        "location": "Castle Hill, Sydney NSW, Australia",
        "evidence": "Official NOVO PRINT website contact section lists Castle Hill, Sydney, NSW, Australia.",
    },
)


def _source_domain(url: str | None) -> str:
    if not url:
        return ""
    parsed = urlparse(url.strip())
    hostname = parsed.hostname or ""
    return hostname.removeprefix("www.").lower()


def _match_rule(service: Any) -> dict[str, str] | None:
    business_name = str(getattr(service, "business_name", "") or "").strip().lower()
    source_domain = _source_domain(getattr(service, "source_url", None))
    for rule in KNOWN_LOCATION_RULES:
        if business_name != rule["business_name"].strip().lower():
            continue
        if source_domain != rule["source_domain"]:
            continue
        return rule
    return None


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

        remediated_count = 0
        search_ready_count = 0
        sample_findings: list[dict[str, Any]] = []

        for service in services:
            if getattr(service, "location", None):
                continue

            rule = _match_rule(service)
            if not rule:
                continue

            payload = {
                "service_id": service.service_id,
                "business_name": service.business_name,
                "business_email": service.business_email,
                "name": service.name,
                "category": service.category,
                "summary": service.summary,
                "amount_aud": service.amount_aud,
                "duration_minutes": service.duration_minutes,
                "venue_name": service.venue_name,
                "location": rule["location"],
                "map_url": service.map_url,
                "booking_url": service.booking_url,
                "image_url": service.image_url,
                "source_url": service.source_url,
                "tags_json": list(service.tags_json or []),
                "featured": service.featured,
                "is_active": 1,
            }
            normalized, warnings = apply_catalog_quality_gate(payload)
            remediated_count += 1
            if normalized.get("is_active") == 1 and not warnings:
                search_ready_count += 1

            finding = {
                "service_id": service.service_id,
                "from_location": service.location,
                "to_location": rule["location"],
                "quality_warnings": warnings,
                "resulting_is_active": int(normalized.get("is_active") or 0),
                "evidence": rule["evidence"],
            }
            if len(sample_findings) < limit:
                sample_findings.append(finding)

            if apply:
                service.location = rule["location"]
                service.tags_json = list(normalized.get("tags_json") or [])
                service.is_active = int(normalized.get("is_active") or 0)

        if apply:
            await session.commit()

        print(
            json.dumps(
                {
                    "mode": "apply" if apply else "dry_run",
                    "records_remediated": remediated_count,
                    "records_search_ready_after_remediation": search_ready_count,
                    "sample_findings": sample_findings,
                },
                indent=2,
                default=str,
            )
        )
    finally:
        await session.close()
        await engine.dispose()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply trusted location remediations for known service catalog sources."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write remediated location, tags, and active state back to the database.",
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
