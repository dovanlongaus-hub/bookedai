from __future__ import annotations

from dataclasses import dataclass, field
import json
from uuid import uuid4

from repositories.base import RepositoryContext
from repositories.crm_repository import CrmSyncRepository
from repositories.email_repository import EmailRepository


@dataclass
class CrmSyncOperationResult:
    record_id: int | None
    sync_status: str
    warning_codes: list[str] = field(default_factory=list)


@dataclass
class LifecycleEmailOperationResult:
    message_id: str
    delivery_status: str
    record_status: str
    provider: str
    warning_codes: list[str] = field(default_factory=list)


async def orchestrate_lead_capture(
    session,
    *,
    tenant_id: str,
    lead_id: str | None,
    source: str,
    contact_email: str | None,
) -> CrmSyncOperationResult:
    if not tenant_id or not lead_id:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="lead",
        local_entity_id=lead_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=json.dumps(
            {
                "source": source,
                "contact_email": contact_email,
            }
        ),
    )
    if record_id is None:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    if contact_email:
        return CrmSyncOperationResult(record_id=record_id, sync_status="pending")

    await repository.update_sync_record_status(
        tenant_id=tenant_id,
        crm_sync_record_id=record_id,
        sync_status="manual_review_required",
    )
    await repository.record_sync_error(
        tenant_id=tenant_id,
        crm_sync_record_id=record_id,
        error_code="missing_contact_email",
        error_message="CRM sync requires manual review when the lead has no email address.",
        retryable=False,
        payload_json=json.dumps(
            {
                "source": source,
                "contact_email": contact_email,
            }
        ),
    )
    return CrmSyncOperationResult(
        record_id=record_id,
        sync_status="manual_review_required",
        warning_codes=["missing_contact_email"],
    )


async def seed_crm_sync_for_lead(
    session,
    *,
    tenant_id: str,
    lead_id: str | None,
    source: str,
    contact_email: str | None,
) -> int | None:
    result = await orchestrate_lead_capture(
        session,
        tenant_id=tenant_id,
        lead_id=lead_id,
        source=source,
        contact_email=contact_email,
    )
    return result.record_id


async def queue_crm_sync_retry(
    session,
    *,
    tenant_id: str,
    crm_sync_record_id: int | None,
    reason: str = "operator_retry",
) -> CrmSyncOperationResult:
    if not tenant_id or crm_sync_record_id is None:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    existing_record = await repository.get_sync_record(
        tenant_id=tenant_id,
        crm_sync_record_id=crm_sync_record_id,
    )
    if not existing_record:
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="not_found",
            warning_codes=["crm_sync_record_missing"],
        )

    current_status = str(existing_record.get("sync_status") or "unknown")
    if current_status in {"failed", "manual_review_required", "conflict"}:
        await repository.mark_retrying(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="retry_queued",
            error_message="CRM sync was queued for retry and reconciliation review.",
            retryable=True,
            payload_json=json.dumps(
                {
                    "reason": reason,
                    "previous_status": current_status,
                }
            ),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="retrying",
            warning_codes=[f"retry_from_{current_status}"],
        )

    if current_status == "retrying":
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="retrying",
            warning_codes=["retry_already_queued"],
        )

    return CrmSyncOperationResult(
        record_id=crm_sync_record_id,
        sync_status=current_status,
        warning_codes=["retry_not_required"],
    )


async def orchestrate_lifecycle_email(
    session,
    *,
    tenant_id: str,
    template_key: str | None,
    subject: str,
    provider: str,
    delivery_status: str,
    contact_id: str | None = None,
    event_payload: dict[str, object | None] | None = None,
) -> LifecycleEmailOperationResult:
    message_id = str(uuid4())
    repository = EmailRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    warning_codes: list[str] = []
    record_status = delivery_status

    if provider == "unconfigured":
        record_status = "manual_review_required"
        warning_codes.append("provider_unconfigured")
    elif delivery_status == "failed":
        record_status = "failed"
        warning_codes.append("delivery_failed")

    await repository.create_message(
        tenant_id=tenant_id,
        message_id=message_id,
        contact_id=contact_id,
        template_key=template_key,
        subject=subject,
        provider=provider,
        status=record_status,
    )
    await repository.append_message_event(
        tenant_id=tenant_id,
        message_id=message_id,
        event_type="lifecycle_recorded",
        payload_json=json.dumps(
            {
                **(event_payload or {}),
                "delivery_status": delivery_status,
                "record_status": record_status,
                "provider": provider,
            }
        ),
    )
    await repository.append_message_event(
        tenant_id=tenant_id,
        message_id=message_id,
        event_type=delivery_status,
        payload_json=json.dumps(event_payload or {}),
    )
    if record_status != delivery_status:
        await repository.update_message_status(
            tenant_id=tenant_id,
            message_id=message_id,
            status=record_status,
        )
        await repository.append_message_event(
            tenant_id=tenant_id,
            message_id=message_id,
            event_type=record_status,
            payload_json=json.dumps(
                {
                    **(event_payload or {}),
                    "warning_codes": warning_codes,
                }
            ),
        )
    return LifecycleEmailOperationResult(
        message_id=message_id,
        delivery_status=delivery_status,
        record_status=record_status,
        provider=provider,
        warning_codes=warning_codes,
    )


async def record_lifecycle_email(
    session,
    *,
    tenant_id: str,
    template_key: str | None,
    subject: str,
    provider: str,
    status: str,
    contact_id: str | None = None,
    event_payload: dict[str, object | None] | None = None,
) -> str:
    result = await orchestrate_lifecycle_email(
        session,
        tenant_id=tenant_id,
        template_key=template_key,
        subject=subject,
        provider=provider,
        delivery_status=status,
        contact_id=contact_id,
        event_payload=event_payload,
    )
    return result.message_id
