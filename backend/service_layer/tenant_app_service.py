from __future__ import annotations

from repositories.base import RepositoryContext
from repositories.feature_flag_repository import FeatureFlagRepository
from repositories.reporting_repository import ReportingRepository
from repositories.tenant_repository import TenantRepository
from service_layer.prompt11_integration_service import (
    build_crm_retry_backlog,
    build_integration_attention_items,
    build_integration_provider_statuses,
    build_reconciliation_details,
)


async def _load_tenant_context(session, *, tenant_ref: str | None = None) -> tuple[dict, str] | tuple[None, None]:
    tenant_repository = TenantRepository(RepositoryContext(session=session))
    tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref)
    if not tenant_profile:
        return None, None

    tenant_id = tenant_profile["id"] or ""
    return tenant_profile, tenant_id


async def build_tenant_overview(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    reporting_repository = ReportingRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    feature_flag_repository = FeatureFlagRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )

    summary = await reporting_repository.summarize_tenant_overview(tenant_id)
    recent_bookings = await reporting_repository.list_recent_booking_intents(tenant_id, limit=5)
    integration_items = await build_integration_provider_statuses(session, tenant_id=tenant_id)
    attention_items = await build_integration_attention_items(session, tenant_id=tenant_id)
    tenant_mode_enabled = await feature_flag_repository.get_flag(
        "tenant_mode_enabled",
        tenant_id=tenant_id,
    )

    priorities: list[dict[str, str]] = []
    if summary["payment_attention_count"] > 0:
        priorities.append(
            {
                "title": "Payment follow-up needs attention",
                "body": f"{summary['payment_attention_count']} booking payment states still need review or follow-up.",
                "tone": "attention",
            }
        )
    if summary["lifecycle_attention_count"] > 0:
        priorities.append(
            {
                "title": "Lifecycle communication is still queued",
                "body": f"{summary['lifecycle_attention_count']} lifecycle messages are not yet in a final delivered state.",
                "tone": "monitor",
            }
        )
    if not priorities:
        priorities.append(
            {
                "title": "Operational baseline is stable",
                "body": "No immediate payment or lifecycle attention signals are elevated in the current tenant shell snapshot.",
                "tone": "healthy",
            }
        )

    return {
        "tenant": tenant_profile,
        "shell": {
            "current_role": "tenant_admin",
            "read_only": True,
            "tenant_mode_enabled": bool(tenant_mode_enabled),
            "deployment_mode": "standalone_app",
        },
        "summary": summary,
        "integration_snapshot": {
            "connected_count": len(
                [item for item in integration_items if item.get("status") == "connected"]
            ),
            "attention_count": len(attention_items),
            "providers": integration_items,
        },
        "recent_bookings": recent_bookings,
        "priorities": priorities,
    }


async def build_tenant_bookings_snapshot(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    reporting_repository = ReportingRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    recent_bookings = await reporting_repository.list_recent_booking_intents(tenant_id, limit=12)

    status_summary = {
        "pending_confirmation": 0,
        "active": 0,
        "completed": 0,
        "cancelled": 0,
        "other": 0,
    }

    for booking in recent_bookings:
        status = str(booking.get("status") or "").lower()
        if status == "pending_confirmation":
            status_summary["pending_confirmation"] += 1
        elif status in {"captured", "pending", "confirmed", "in_progress"}:
            status_summary["active"] += 1
        elif status == "completed":
            status_summary["completed"] += 1
        elif status == "cancelled":
            status_summary["cancelled"] += 1
        else:
            status_summary["other"] += 1

    return {
        "tenant": tenant_profile,
        "status_summary": status_summary,
        "items": recent_bookings,
    }


async def build_tenant_integrations_snapshot(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    provider_items = await build_integration_provider_statuses(session, tenant_id=tenant_id)
    attention_items = await build_integration_attention_items(session, tenant_id=tenant_id)
    reconciliation = await build_reconciliation_details(session, tenant_id=tenant_id)
    crm_backlog = await build_crm_retry_backlog(session, tenant_id=tenant_id)

    return {
        "tenant": tenant_profile,
        "providers": provider_items,
        "attention": attention_items,
        "reconciliation": reconciliation,
        "crm_retry_backlog": crm_backlog,
    }
