from __future__ import annotations

from repositories.base import RepositoryContext
from repositories.integration_repository import IntegrationRepository


async def build_integration_provider_statuses(
    session,
    *,
    tenant_id: str,
) -> list[dict[str, object | None]]:
    repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    connections = await repository.list_connections(tenant_id=tenant_id)
    items: list[dict[str, object | None]] = []
    for connection in connections:
        settings_json = connection.get("settings_json") or {}
        configured_fields = sorted(
            key
            for key, value in dict(settings_json).items()
            if value not in (None, "", [], {}, False)
        )
        items.append(
            {
                "provider": connection.get("provider"),
                "status": connection.get("status") or "unknown",
                "sync_mode": connection.get("sync_mode") or "read_only",
                "safe_config": {
                    "provider": connection.get("provider"),
                    "enabled": connection.get("status") == "connected",
                    "configured_fields": configured_fields,
                    "label": "Integration connection",
                    "notes": [],
                },
                "updated_at": connection.get("updated_at"),
            }
        )
    return items


async def build_reconciliation_summary(
    session,
    *,
    tenant_id: str,
) -> dict[str, object | None]:
    repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    summary = await repository.summarize_reconciliation(tenant_id=tenant_id)
    failed_jobs = int(summary.get("failed_jobs") or 0)
    pending_webhooks = int(summary.get("pending_webhooks") or 0)
    pending_outbox = int(summary.get("pending_outbox") or 0)
    conflicts: list[str] = []
    if failed_jobs:
        conflicts.append(f"{failed_jobs} failed background jobs need investigation.")
    if pending_webhooks:
        conflicts.append(f"{pending_webhooks} webhook events are still pending processing.")
    if pending_outbox:
        conflicts.append(f"{pending_outbox} outbox events are waiting for delivery.")

    return {
        "status": "attention_required" if conflicts else "healthy",
        "checked_at": summary.get("last_job_created_at")
        or summary.get("last_webhook_received_at")
        or summary.get("last_outbox_created_at"),
        "conflicts": conflicts,
        "metadata": summary,
    }


async def build_integration_attention_items(
    session,
    *,
    tenant_id: str,
) -> list[dict[str, object | None]]:
    repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    items = await repository.list_attention_items(tenant_id=tenant_id)
    attention_items: list[dict[str, object | None]] = []
    for item in items:
        source = str(item.get("source") or "unknown")
        issue_type = str(item.get("issue_type") or "unknown")
        item_count = int(item.get("item_count") or 0)
        latest_at = item.get("latest_at")
        recommended_action = "Inspect operator queue."
        severity = "medium"

        if source == "crm_sync":
            if issue_type == "retrying":
                recommended_action = "Monitor queued CRM retry work before manual escalation."
                severity = "medium"
            else:
                recommended_action = "Review CRM sync ledger and reconcile local lead state."
                severity = "high" if issue_type in {"failed", "conflict"} else "medium"
        elif source == "email_messages":
            recommended_action = "Inspect lifecycle email delivery state before resending."
            severity = "high" if issue_type == "failed" else "medium"
        elif source == "job_runs":
            recommended_action = "Check failed worker jobs before widening rollout."
            severity = "high"
        elif source == "webhook_events":
            recommended_action = "Inspect pending webhook ingestion backlog."
        elif source == "outbox_events":
            recommended_action = "Inspect outbox delivery backlog."

        attention_items.append(
            {
                "source": source,
                "issue_type": issue_type,
                "severity": severity,
                "item_count": item_count,
                "latest_at": latest_at,
                "recommended_action": recommended_action,
            }
        )
    return attention_items


async def build_reconciliation_details(
    session,
    *,
    tenant_id: str,
) -> dict[str, object | None]:
    repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    raw_sections = await repository.reconciliation_details(tenant_id=tenant_id)
    sections: list[dict[str, object | None]] = []
    for section in raw_sections:
        area = str(section.get("area") or "unknown")
        total_count = int(section.get("total_count") or 0)
        pending_count = int(section.get("pending_count") or 0)
        manual_review_count = int(section.get("manual_review_count") or 0)
        failed_count = int(section.get("failed_count") or 0)
        latest_at = section.get("latest_at")
        recommended_action = "Monitor this area."
        status = "healthy"

        if failed_count > 0 or manual_review_count > 0:
            status = "attention_required"
        elif pending_count > 0:
            status = "monitoring"

        if area == "crm_sync":
            recommended_action = "Reconcile CRM sync issues before enabling broader sync automation."
        elif area == "email_lifecycle":
            recommended_action = "Review lifecycle email failures or manual review cases before resends."
        elif area == "background_jobs":
            recommended_action = "Inspect worker failures and queue lag."
        elif area == "webhook_ingestion":
            recommended_action = "Inspect webhook processing backlog."
        elif area == "outbox_delivery":
            recommended_action = "Inspect delivery backlog and failed outbox events."

        sections.append(
            {
                "area": area,
                "status": status,
                "total_count": total_count,
                "pending_count": pending_count,
                "manual_review_count": manual_review_count,
                "failed_count": failed_count,
                "latest_at": latest_at,
                "recommended_action": recommended_action,
            }
        )

    attention_required_sections = sum(1 for section in sections if section["status"] == "attention_required")
    monitoring_sections = sum(1 for section in sections if section["status"] == "monitoring")
    overall_status = "healthy"
    if attention_required_sections:
        overall_status = "attention_required"
    elif monitoring_sections:
        overall_status = "monitoring"

    checked_at = next((section["latest_at"] for section in sections if section.get("latest_at")), None)
    return {
        "status": overall_status,
        "checked_at": checked_at,
        "summary": {
            "attention_required_sections": attention_required_sections,
            "monitoring_sections": monitoring_sections,
            "healthy_sections": sum(1 for section in sections if section["status"] == "healthy"),
        },
        "sections": sections,
    }


async def build_attention_triage_snapshot(
    session,
    *,
    tenant_id: str,
) -> dict[str, object | None]:
    attention_items = await build_integration_attention_items(session, tenant_id=tenant_id)
    reconciliation_details = await build_reconciliation_details(session, tenant_id=tenant_id)

    immediate_action: list[dict[str, object | None]] = []
    monitor: list[dict[str, object | None]] = []
    stable: list[dict[str, object | None]] = []
    source_slices: list[dict[str, object | None]] = []

    severity_rank = {"high": 3, "medium": 2, "low": 1}
    grouped_by_source: dict[str, dict[str, object | None]] = {}

    for item in attention_items:
        lane_item = {
            "source": item.get("source"),
            "issue_type": item.get("issue_type"),
            "severity": item.get("severity"),
            "item_count": item.get("item_count"),
            "latest_at": item.get("latest_at"),
            "recommended_action": item.get("recommended_action"),
        }
        severity = str(item.get("severity") or "medium")
        source = str(item.get("source") or "unknown")
        issue_type = str(item.get("issue_type") or "unknown")
        item_count = int(item.get("item_count") or 0)

        source_bucket = grouped_by_source.setdefault(
            source,
            {
                "source": source,
                "open_items": 0,
                "highest_severity": "low",
                "manual_review_count": 0,
                "failed_count": 0,
                "pending_count": 0,
                "latest_at": item.get("latest_at"),
                "operator_note": "Monitor this source.",
            },
        )
        source_bucket["open_items"] = int(source_bucket["open_items"] or 0) + item_count
        if severity_rank.get(severity, 0) > severity_rank.get(str(source_bucket["highest_severity"]), 0):
            source_bucket["highest_severity"] = severity
        latest_at = item.get("latest_at")
        if latest_at and (
            source_bucket.get("latest_at") is None
            or str(latest_at) > str(source_bucket.get("latest_at"))
        ):
            source_bucket["latest_at"] = latest_at

        if issue_type in {"failed", "conflict"}:
            source_bucket["failed_count"] = int(source_bucket["failed_count"] or 0) + item_count
        if issue_type == "manual_review_required":
            source_bucket["manual_review_count"] = (
                int(source_bucket["manual_review_count"] or 0) + item_count
            )
        if issue_type in {"retrying", "pending"}:
            source_bucket["pending_count"] = int(source_bucket["pending_count"] or 0) + item_count

        if severity == "high" or issue_type in {"failed", "conflict", "manual_review_required"}:
            immediate_action.append(lane_item)
        elif issue_type in {"retrying", "pending"}:
            monitor.append(lane_item)
        else:
            stable.append(lane_item)

    for section in reconciliation_details.get("sections", []):
        area = str(section.get("area") or "unknown")
        mapped_source = {
            "crm_sync": "crm_sync",
            "email_lifecycle": "email_messages",
            "background_jobs": "job_runs",
            "webhook_ingestion": "webhook_events",
            "outbox_delivery": "outbox_events",
        }.get(area)
        if not mapped_source:
            continue

        source_bucket = grouped_by_source.setdefault(
            mapped_source,
            {
                "source": mapped_source,
                "open_items": 0,
                "highest_severity": "low",
                "manual_review_count": 0,
                "failed_count": 0,
                "pending_count": 0,
                "latest_at": section.get("latest_at"),
                "operator_note": section.get("recommended_action") or "Monitor this source.",
            },
        )
        source_bucket["manual_review_count"] = int(section.get("manual_review_count") or 0)
        source_bucket["failed_count"] = int(section.get("failed_count") or 0)
        source_bucket["pending_count"] = int(section.get("pending_count") or 0)
        source_bucket["operator_note"] = section.get("recommended_action") or source_bucket["operator_note"]
        latest_at = section.get("latest_at")
        if latest_at and (
            source_bucket.get("latest_at") is None
            or str(latest_at) > str(source_bucket.get("latest_at"))
        ):
            source_bucket["latest_at"] = latest_at

    source_slices.extend(
        sorted(
            grouped_by_source.values(),
            key=lambda item: (
                -severity_rank.get(str(item.get("highest_severity") or "low"), 0),
                -int(item.get("failed_count") or 0),
                -int(item.get("manual_review_count") or 0),
                str(item.get("source") or ""),
            ),
        )
    )

    crm_retry_slice = grouped_by_source.get(
        "crm_sync",
        {
            "pending_count": 0,
            "manual_review_count": 0,
            "failed_count": 0,
            "latest_at": None,
        },
    )
    queued_retries = int(crm_retry_slice.get("pending_count") or 0)
    manual_review_backlog = int(crm_retry_slice.get("manual_review_count") or 0)
    failed_records = int(crm_retry_slice.get("failed_count") or 0)

    overall_status = "healthy"
    if immediate_action:
        overall_status = "operator_action_required"
    elif monitor:
        overall_status = "monitoring"

    return {
        "status": overall_status,
        "triage_lanes": {
            "immediate_action": immediate_action,
            "monitor": monitor,
            "stable": stable,
        },
        "source_slices": source_slices,
        "retry_posture": {
            "queued_retries": queued_retries,
            "manual_review_backlog": manual_review_backlog,
            "failed_records": failed_records,
            "latest_retry_at": crm_retry_slice.get("latest_at"),
            "hold_recommended": queued_retries > 0
            and (manual_review_backlog > 0 or failed_records > 0),
            "operator_note": (
                "Hold broader rollout if queued retries are not burning down or failed CRM records continue to grow."
                if queued_retries > 0 and (manual_review_backlog > 0 or failed_records > 0)
                else "Retry lane is additive and can stay in monitor mode while failures remain flat."
            ),
        },
    }
