#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

KNOWN_FLAGS = {
    "billing_webhook_shadow_mode",
    "new_booking_domain_dual_write",
    "crm_sync_v1_enabled",
    "email_template_engine_v1",
    "tenant_mode_enabled",
    "new_admin_bookings_view",
    "admin_booking_read_shadow_compare",
    "semantic_matching_model_assist_v1",
}


def build_sql(flag_key: str, *, enabled: bool, tenant_id: str | None = None) -> str:
    enabled_literal = "true" if enabled else "false"
    tenant_selector = (
        f"'{tenant_id}'::uuid"
        if tenant_id
        else "(select id from tenants where slug = 'default-production-tenant' limit 1)"
    )
    return (
        "insert into feature_flags (tenant_id, flag_key, enabled)\n"
        f"values ({tenant_selector}, '{flag_key}', {enabled_literal})\n"
        "on conflict (tenant_id, flag_key)\n"
        f"do update set enabled = excluded.enabled, updated_at = now();"
    )


async def run(flag_key: str, *, enabled: bool, tenant_id: str | None, dry_run: bool) -> None:
    if flag_key not in KNOWN_FLAGS:
        known = ", ".join(sorted(KNOWN_FLAGS))
        raise SystemExit(f"Unknown flag `{flag_key}`. Known flags: {known}")

    if dry_run:
        print(build_sql(flag_key, enabled=enabled, tenant_id=tenant_id))
        return

    from config import get_settings
    from db import create_engine, create_session_factory
    from repositories.base import RepositoryContext
    from repositories.feature_flag_repository import FeatureFlagRepository
    from repositories.tenant_repository import TenantRepository

    settings = get_settings()

    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    session = session_factory()
    try:
        effective_tenant_id = tenant_id
        if not effective_tenant_id:
            effective_tenant_id = await TenantRepository(
                RepositoryContext(session=session)
            ).get_default_tenant_id()

        if not effective_tenant_id:
            raise SystemExit("Could not resolve tenant_id. Pass --tenant-id explicitly.")

        repository = FeatureFlagRepository(
            RepositoryContext(session=session, tenant_id=effective_tenant_id)
        )
        await repository.upsert_flag(flag_key, enabled=enabled, tenant_id=effective_tenant_id)
        await session.commit()
        current_value = await repository.get_flag(flag_key, tenant_id=effective_tenant_id)
        print(
            {
                "tenant_id": effective_tenant_id,
                "flag_key": flag_key,
                "enabled": current_value,
            }
        )
    finally:
        await session.close()
        await engine.dispose()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Set a tenant-aware feature flag in the BookedAI database."
    )
    parser.add_argument("flag_key", help="Feature flag key to update.")
    parser.add_argument(
        "--enabled",
        choices=("true", "false"),
        default="true",
        help="Target flag value. Defaults to true.",
    )
    parser.add_argument(
        "--tenant-id",
        default=None,
        help="Tenant UUID. If omitted, use default-production-tenant.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the SQL statement instead of writing to the database.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(
        run(
            args.flag_key,
            enabled=args.enabled == "true",
            tenant_id=args.tenant_id,
            dry_run=args.dry_run,
        )
    )


if __name__ == "__main__":
    main()
