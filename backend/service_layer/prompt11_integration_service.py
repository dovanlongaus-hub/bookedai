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


async def build_crm_retry_backlog(
    session,
    *,
    tenant_id: str,
) -> dict[str, object | None]:
    repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    items = await repository.list_crm_retry_backlog(tenant_id=tenant_id)

    backlog_items: list[dict[str, object | None]] = []
    retrying_count = 0
    failed_count = 0
    manual_review_count = 0
    latest_at = None

    for item in items:
        sync_status = str(item.get("sync_status") or "unknown")
        retry_count = int(item.get("retry_count") or 0)
        latest_error_at = item.get("latest_error_at")

        if sync_status == "retrying":
            retrying_count += 1
        elif sync_status in {"failed", "conflict"}:
            failed_count += 1
        elif sync_status == "manual_review_required":
            manual_review_count += 1

        if latest_error_at and (latest_at is None or str(latest_error_at) > str(latest_at)):
            latest_at = latest_error_at

        recommended_action = "Monitor retry queue burn-down before widening rollout."
        if sync_status in {"failed", "conflict"}:
            recommended_action = "Operator review needed before another retry is queued."
        elif sync_status == "manual_review_required":
            recommended_action = "Fix local lead payload before queueing another CRM sync attempt."
        elif retry_count >= 2:
            recommended_action = "Escalate if retries keep repeating without a successful sync."

        backlog_items.append(
            {
                "record_id": item.get("id"),
                "provider": item.get("provider"),
                "entity_type": item.get("entity_type"),
                "local_entity_id": item.get("local_entity_id"),
                "external_entity_id": item.get("external_entity_id"),
                "sync_status": sync_status,
                "retry_count": retry_count,
                "latest_error_code": item.get("latest_error_code"),
                "latest_error_message": item.get("latest_error_message"),
                "latest_error_retryable": bool(item.get("latest_error_retryable")),
                "latest_error_at": latest_error_at,
                "last_synced_at": item.get("last_synced_at"),
                "created_at": item.get("created_at"),
                "recommended_action": recommended_action,
            }
        )

    status = "healthy"
    if failed_count or manual_review_count:
        status = "attention_required"
    elif retrying_count:
        status = "monitoring"

    hold_recommended = failed_count > 0 or (retrying_count > 0 and manual_review_count > 0)
    operator_note = (
        "Hold broader rollout while failed CRM records or manual-review backlog stay mixed with queued retries."
        if hold_recommended
        else "Retry backlog is additive-only and can stay in monitor mode while queued work is burning down."
    )

    return {
        "status": status,
        "checked_at": latest_at,
        "summary": {
            "retrying_records": retrying_count,
            "manual_review_records": manual_review_count,
            "failed_records": failed_count,
            "hold_recommended": hold_recommended,
            "operator_note": operator_note,
        },
        "items": backlog_items,
    }


async def build_outbox_backlog(
    session,
    *,
    tenant_id: str,
) -> dict[str, object | None]:
    repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    items = await repository.list_outbox_backlog(tenant_id=tenant_id)

    failed_count = 0
    retrying_count = 0
    pending_count = 0
    latest_at = None
    backlog_items: list[dict[str, object | None]] = []

    for item in items:
        status = str(item.get("status") or "pending")
        attempt_count = int(item.get("attempt_count") or 0)
        last_error_at = item.get("last_error_at")
        available_at = item.get("available_at")
        created_at = item.get("created_at")
        latest_marker = last_error_at or available_at or created_at

        if status == "failed":
            failed_count += 1
        elif status == "retrying":
            retrying_count += 1
        elif status == "pending":
            pending_count += 1

        if latest_marker and (latest_at is None or str(latest_marker) > str(latest_at)):
            latest_at = latest_marker

        recommended_action = "Dispatch pending outbox work when you are ready to process the queue."
        if status == "failed":
            recommended_action = "Review the last error, replay this event, then rerun dispatch."
        elif status == "retrying":
            recommended_action = "Rerun dispatch so the queued retry can be attempted."
        elif attempt_count >= 2:
            recommended_action = "Escalate if this event keeps cycling without a successful dispatch."

        backlog_items.append(
            {
                "outbox_event_id": item.get("id"),
                "event_type": item.get("event_type"),
                "aggregate_type": item.get("aggregate_type"),
                "aggregate_id": item.get("aggregate_id"),
                "status": status,
                "attempt_count": attempt_count,
                "last_error": item.get("last_error"),
                "last_error_at": last_error_at,
                "processed_at": item.get("processed_at"),
                "available_at": available_at,
                "idempotency_key": item.get("idempotency_key"),
                "created_at": created_at,
                "recommended_action": recommended_action,
            }
        )

    overall_status = "healthy"
    if failed_count:
        overall_status = "attention_required"
    elif retrying_count or pending_count:
        overall_status = "monitoring"

    return {
        "status": overall_status,
        "checked_at": latest_at,
        "summary": {
            "failed_events": failed_count,
            "retrying_events": retrying_count,
            "pending_events": pending_count,
        },
        "items": backlog_items,
    }


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


async def build_recent_runtime_activity(
    session,
    *,
    tenant_id: str,
) -> dict[str, object | None]:
    repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    items = await repository.list_recent_runtime_activity(tenant_id=tenant_id)
    normalized_items: list[dict[str, object | None]] = []
    latest_at = None

    for item in items:
        occurred_at = item.get("occurred_at")
        if occurred_at and (latest_at is None or str(occurred_at) > str(latest_at)):
            latest_at = occurred_at

        source = str(item.get("source") or "unknown")
        status = str(item.get("status") or "unknown")
        title = str(item.get("title") or source)
        summary = item.get("detail")
        if source == "job_runs":
            summary = item.get("detail") or f"Attempt count {int(item.get('attempt_count') or 0)}"
        elif source == "webhook_events":
            summary = item.get("external_ref") or "Webhook event"
        elif source == "outbox_events":
            summary = item.get("detail") or "Outbox event"

        normalized_items.append(
            {
                "source": source,
                "item_id": item.get("item_id"),
                "title": title,
                "status": status,
                "summary": summary,
                "occurred_at": occurred_at,
                "started_at": item.get("started_at"),
                "finished_at": item.get("finished_at"),
                "external_ref": item.get("external_ref"),
                "attempt_count": int(item.get("attempt_count") or 0),
            }
        )

    return {
        "status": "healthy" if normalized_items else "idle",
        "checked_at": latest_at,
        "items": normalized_items,
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
