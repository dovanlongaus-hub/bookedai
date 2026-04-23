from __future__ import annotations

from dataclasses import dataclass, field
import json
from uuid import uuid4

import httpx

from config import get_settings
from core.contracts.crm import LeadRecordContract
from db import ConversationEvent
from integrations.zoho_crm.adapter import ZohoCrmAdapter
from repositories.base import RepositoryContext
from repositories.crm_repository import CrmSyncRepository
from repositories.email_repository import EmailRepository


@dataclass
class CrmSyncOperationResult:
    record_id: int | None
    sync_status: str
    external_entity_id: str | None = None
    warning_codes: list[str] = field(default_factory=list)


@dataclass
class BookingCrmSyncOperationResult:
    deal_record_id: int | None
    deal_sync_status: str
    deal_external_entity_id: str | None = None
    task_record_id: int | None = None
    task_sync_status: str = "skipped"
    task_external_entity_id: str | None = None
    warning_codes: list[str] = field(default_factory=list)


@dataclass
class LeadQualificationCrmSyncOperationResult:
    lead_record_id: int | None
    lead_sync_status: str
    lead_external_entity_id: str | None = None
    contact_record_id: int | None = None
    contact_sync_status: str = "skipped"
    contact_external_entity_id: str | None = None
    deal_record_id: int | None = None
    deal_sync_status: str = "skipped"
    deal_external_entity_id: str | None = None
    warning_codes: list[str] = field(default_factory=list)


@dataclass
class CallScheduledCrmSyncOperationResult:
    task_record_id: int | None
    task_sync_status: str
    task_external_entity_id: str | None = None
    warning_codes: list[str] = field(default_factory=list)


@dataclass
class EmailSentCrmSyncOperationResult:
    task_record_id: int | None
    task_sync_status: str
    task_external_entity_id: str | None = None
    warning_codes: list[str] = field(default_factory=list)


@dataclass
class LifecycleEmailOperationResult:
    message_id: str
    delivery_status: str
    record_status: str
    provider: str
    warning_codes: list[str] = field(default_factory=list)


@dataclass
class CommunicationOperationResult:
    message_id: str
    channel: str
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
    contact_full_name: str | None = None,
    contact_phone: str | None = None,
    company_name: str | None = None,
    lead_status: str = "captured",
) -> CrmSyncOperationResult:
    if not tenant_id or not lead_id:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    lead_record = LeadRecordContract(
        lead_id=lead_id,
        full_name=contact_full_name,
        email=contact_email,
        phone=contact_phone,
        source=source,
        company_name=company_name,
        tenant_id=tenant_id,
        lead_status=lead_status,
    )
    record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="lead",
        local_entity_id=lead_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=_crm_payload_json(lead_record),
    )
    if record_id is None:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    if contact_email is None and (contact_phone or "").strip() == "":
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            sync_status="manual_review_required",
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            error_code="missing_contact_method",
            error_message="CRM sync requires at least one contact method.",
            retryable=False,
            payload_json=_crm_payload_json(lead_record),
        )
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status="manual_review_required",
            warning_codes=["missing_contact_method"],
        )

    if not contact_email:
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
            payload_json=_crm_payload_json(lead_record),
        )
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status="manual_review_required",
            warning_codes=["missing_contact_email"],
        )

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status="pending",
            warning_codes=["provider_unconfigured"],
        )

    try:
        upsert_result = await adapter.upsert_lead(settings, lead=lead_record)
    except ValueError as error:
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            sync_status="manual_review_required",
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            error_code="invalid_payload",
            error_message=str(error),
            retryable=False,
            payload_json=_crm_payload_json(lead_record),
        )
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status="manual_review_required",
            warning_codes=["invalid_payload"],
        )
    except httpx.HTTPStatusError as error:
        response_excerpt = error.response.text[:500] if error.response is not None else None
        retryable = error.response is None or error.response.status_code >= 500
        sync_status = "failed" if retryable else "manual_review_required"
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            sync_status=sync_status,
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            error_code=f"http_{error.response.status_code}" if error.response is not None else "http_error",
            error_message="Zoho CRM lead upsert failed.",
            retryable=retryable,
            payload_json=json.dumps(
                {
                    "lead": _crm_payload_dict(lead_record),
                    "response_excerpt": response_excerpt,
                }
            ),
        )
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status=sync_status,
            warning_codes=["provider_http_error"],
        )

    external_entity_id = str(upsert_result.get("external_id") or "").strip() or None
    await repository.update_sync_record_status(
        tenant_id=tenant_id,
        crm_sync_record_id=record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
        mark_synced=True,
    )
    return CrmSyncOperationResult(
        record_id=record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
    )


async def orchestrate_lead_qualification_sync(
    session,
    *,
    tenant_id: str,
    lead_id: str | None,
    full_name: str | None,
    email: str | None,
    phone: str | None,
    source: str | None,
    company_name: str | None,
    deal_name: str | None = None,
    notes: str | None = None,
    estimated_value_aud: float | None = None,
) -> LeadQualificationCrmSyncOperationResult:
    if not tenant_id or not lead_id:
        return LeadQualificationCrmSyncOperationResult(
            lead_record_id=None,
            lead_sync_status="skipped",
        )

    lead_result = await orchestrate_lead_capture(
        session,
        tenant_id=tenant_id,
        lead_id=lead_id,
        source=source or "qualified_lead",
        contact_email=email,
        contact_full_name=full_name,
        contact_phone=phone,
        company_name=company_name,
        lead_status="qualified",
    )
    contact_result = await orchestrate_contact_sync(
        session,
        tenant_id=tenant_id,
        contact_id=lead_id,
        full_name=full_name,
        email=email,
        phone=phone,
    )

    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    deal_record = LeadRecordContract(
        lead_id=lead_id,
        full_name=full_name,
        email=email,
        phone=phone,
        source=source,
        company_name=company_name or deal_name or "BookedAI Qualified Lead",
        tenant_id=tenant_id,
        lead_status="qualified",
        metadata={
            "deal_name": deal_name or company_name or "BookedAI Qualified Lead",
            "notes": notes,
            "amount_aud": estimated_value_aud,
            "external_lead_id": lead_result.external_entity_id,
            "external_contact_id": contact_result.external_entity_id,
            "deal_stage": "Qualification",
        },
    )
    deal_record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="deal",
        local_entity_id=lead_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=_crm_payload_json(deal_record),
    )

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        return LeadQualificationCrmSyncOperationResult(
            lead_record_id=lead_result.record_id,
            lead_sync_status=lead_result.sync_status,
            lead_external_entity_id=lead_result.external_entity_id,
            contact_record_id=contact_result.record_id,
            contact_sync_status=contact_result.sync_status,
            contact_external_entity_id=contact_result.external_entity_id,
            deal_record_id=deal_record_id,
            deal_sync_status="pending",
            warning_codes=_merge_warning_codes(
                lead_result.warning_codes,
                contact_result.warning_codes,
                ["provider_unconfigured"],
            ),
        )

    deal_result = await _execute_booking_deal_sync(
        repository=repository,
        tenant_id=tenant_id,
        crm_sync_record_id=deal_record_id,
        booking_record=deal_record,
    )
    return LeadQualificationCrmSyncOperationResult(
        lead_record_id=lead_result.record_id,
        lead_sync_status=lead_result.sync_status,
        lead_external_entity_id=lead_result.external_entity_id,
        contact_record_id=contact_result.record_id,
        contact_sync_status=contact_result.sync_status,
        contact_external_entity_id=contact_result.external_entity_id,
        deal_record_id=deal_result.record_id,
        deal_sync_status=deal_result.sync_status,
        deal_external_entity_id=deal_result.external_entity_id,
        warning_codes=_merge_warning_codes(
            lead_result.warning_codes,
            contact_result.warning_codes,
            deal_result.warning_codes,
        ),
    )


async def orchestrate_call_scheduled_sync(
    session,
    *,
    tenant_id: str,
    lead_id: str | None,
    full_name: str | None,
    email: str | None,
    phone: str | None,
    source: str | None,
    service_name: str | None,
    scheduled_for: str | None,
    owner_name: str | None,
    note: str | None,
    external_contact_id: str | None = None,
    external_deal_id: str | None = None,
) -> CallScheduledCrmSyncOperationResult:
    normalized_lead_id = (lead_id or "").strip()
    local_entity_id = ":".join(
        part
        for part in [normalized_lead_id or None, (scheduled_for or "").strip() or None, "call_scheduled"]
        if part
    )
    if not tenant_id or not local_entity_id:
        return CallScheduledCrmSyncOperationResult(task_record_id=None, task_sync_status="skipped")

    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    task_record = LeadRecordContract(
        lead_id=normalized_lead_id,
        full_name=full_name,
        email=email,
        phone=phone,
        source=source,
        company_name=service_name or "BookedAI Scheduled Call",
        tenant_id=tenant_id,
        lead_status="call_scheduled",
        metadata={
            "service_name": service_name or "BookedAI service",
            "requested_date": (scheduled_for or "").strip()[:10] or None,
            "requested_time": (scheduled_for or "").strip()[11:16] or None,
            "notes": note,
            "owner_name": owner_name,
            "external_contact_id": external_contact_id,
            "external_deal_id": external_deal_id,
            "task_subject": f"Scheduled call: {service_name or 'BookedAI lead'}",
            "booking_path": "request_callback",
        },
    )
    task_record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="task",
        local_entity_id=local_entity_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=_crm_payload_json(task_record),
    )

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        return CallScheduledCrmSyncOperationResult(
            task_record_id=task_record_id,
            task_sync_status="pending",
            warning_codes=["provider_unconfigured"],
        )

    task_result = await _execute_booking_task_sync(
        repository=repository,
        tenant_id=tenant_id,
        crm_sync_record_id=task_record_id,
        booking_record=task_record,
        external_deal_id=external_deal_id,
    )
    return CallScheduledCrmSyncOperationResult(
        task_record_id=task_result.record_id,
        task_sync_status=task_result.sync_status,
        task_external_entity_id=task_result.external_entity_id,
        warning_codes=task_result.warning_codes,
    )


async def orchestrate_email_sent_sync(
    session,
    *,
    tenant_id: str,
    message_id: str | None,
    template_key: str | None,
    subject: str,
    recipient_email: str | None,
    provider: str,
    delivery_status: str,
) -> EmailSentCrmSyncOperationResult:
    normalized_message_id = (message_id or "").strip()
    if not tenant_id or not normalized_message_id:
        return EmailSentCrmSyncOperationResult(task_record_id=None, task_sync_status="skipped")

    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    email_record = LeadRecordContract(
        lead_id=normalized_message_id,
        full_name=None,
        email=(recipient_email or "").strip().lower() or None,
        phone=None,
        source="email_lifecycle",
        company_name="BookedAI Email",
        tenant_id=tenant_id,
        lead_status="email_sent",
        metadata={
            "service_name": template_key or "BookedAI lifecycle email",
            "requested_date": None,
            "requested_time": None,
            "notes": (
                f"Lifecycle email sent via {provider} with delivery_status={delivery_status}. "
                f"Template={template_key or 'custom'}. Subject={subject}."
            ),
            "task_subject": f"Email sent: {template_key or subject}",
            "booking_path": "request_callback",
        },
    )
    task_record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="task",
        local_entity_id=normalized_message_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=_crm_payload_json(email_record),
    )

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        return EmailSentCrmSyncOperationResult(
            task_record_id=task_record_id,
            task_sync_status="pending",
            warning_codes=["provider_unconfigured"],
        )

    task_result = await _execute_booking_task_sync(
        repository=repository,
        tenant_id=tenant_id,
        crm_sync_record_id=task_record_id,
        booking_record=email_record,
        external_deal_id=None,
    )
    return EmailSentCrmSyncOperationResult(
        task_record_id=task_result.record_id,
        task_sync_status=task_result.sync_status,
        task_external_entity_id=task_result.external_entity_id,
        warning_codes=task_result.warning_codes,
    )


async def seed_crm_sync_for_lead(
    session,
    *,
    tenant_id: str,
    lead_id: str | None,
    source: str,
    contact_email: str | None,
    contact_full_name: str | None = None,
    contact_phone: str | None = None,
    company_name: str | None = None,
) -> int | None:
    result = await orchestrate_lead_capture(
        session,
        tenant_id=tenant_id,
        lead_id=lead_id,
        source=source,
        contact_email=contact_email,
        contact_full_name=contact_full_name,
        contact_phone=contact_phone,
        company_name=company_name,
    )
    return result.record_id


def _crm_payload_dict(lead: LeadRecordContract) -> dict[str, object | None]:
    if hasattr(lead, "model_dump"):
        return lead.model_dump(mode="json")
    return lead.dict()


def _crm_payload_json(lead: LeadRecordContract) -> str:
    return json.dumps(_crm_payload_dict(lead))


def _merge_warning_codes(*warning_lists: list[str]) -> list[str]:
    ordered: list[str] = []
    for warnings in warning_lists:
        for warning in warnings:
            if warning not in ordered:
                ordered.append(warning)
    return ordered


async def orchestrate_contact_sync(
    session,
    *,
    tenant_id: str,
    contact_id: str | None,
    full_name: str | None,
    email: str | None,
    phone: str | None,
) -> CrmSyncOperationResult:
    if not tenant_id or not contact_id:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    contact_record = LeadRecordContract(
        lead_id=contact_id,
        full_name=full_name,
        email=email,
        phone=phone,
        tenant_id=tenant_id,
    )
    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="contact",
        local_entity_id=contact_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=_crm_payload_json(contact_record),
    )
    if record_id is None:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    if not (email or "").strip():
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            sync_status="manual_review_required",
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            error_code="missing_contact_email",
            error_message="CRM contact sync requires manual review when the contact has no email address.",
            retryable=False,
            payload_json=_crm_payload_json(contact_record),
        )
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status="manual_review_required",
            warning_codes=["missing_contact_email"],
        )

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status="pending",
            warning_codes=["provider_unconfigured"],
        )

    try:
        upsert_result = await adapter.upsert_contact(settings, lead=contact_record)
    except ValueError as error:
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            sync_status="manual_review_required",
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            error_code="invalid_payload",
            error_message=str(error),
            retryable=False,
            payload_json=_crm_payload_json(contact_record),
        )
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status="manual_review_required",
            warning_codes=["invalid_payload"],
        )
    except httpx.HTTPStatusError as error:
        response_excerpt = error.response.text[:500] if error.response is not None else None
        retryable = error.response is None or error.response.status_code >= 500
        sync_status = "failed" if retryable else "manual_review_required"
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            sync_status=sync_status,
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            error_code=f"http_{error.response.status_code}" if error.response is not None else "http_error",
            error_message="Zoho CRM contact upsert failed.",
            retryable=retryable,
            payload_json=json.dumps(
                {
                    "contact": _crm_payload_dict(contact_record),
                    "response_excerpt": response_excerpt,
                }
            ),
        )
        return CrmSyncOperationResult(
            record_id=record_id,
            sync_status=sync_status,
            warning_codes=["provider_http_error"],
        )

    external_entity_id = str(upsert_result.get("external_id") or "").strip() or None
    await repository.update_sync_record_status(
        tenant_id=tenant_id,
        crm_sync_record_id=record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
        mark_synced=True,
    )
    return CrmSyncOperationResult(
        record_id=record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
    )


async def orchestrate_booking_followup_sync(
    session,
    *,
    tenant_id: str,
    booking_intent_id: str | None,
    booking_reference: str | None,
    full_name: str | None,
    email: str | None,
    phone: str | None,
    source: str | None,
    service_name: str | None,
    requested_date: str | None,
    requested_time: str | None,
    timezone: str | None,
    booking_path: str | None,
    notes: str | None,
    external_lead_id: str | None = None,
    external_contact_id: str | None = None,
) -> BookingCrmSyncOperationResult:
    local_entity_id = (booking_reference or booking_intent_id or "").strip()
    if not tenant_id or not local_entity_id:
        return BookingCrmSyncOperationResult(
            deal_record_id=None,
            deal_sync_status="skipped",
            task_record_id=None,
            task_sync_status="skipped",
        )

    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    booking_record = LeadRecordContract(
        lead_id=booking_intent_id,
        full_name=full_name,
        email=email,
        phone=phone,
        source=source,
        company_name=service_name or "BookedAI Booking",
        tenant_id=tenant_id,
        lead_status="booking_requested",
        metadata={
            "booking_intent_id": booking_intent_id,
            "booking_reference": booking_reference,
            "service_name": service_name,
            "requested_date": requested_date,
            "requested_time": requested_time,
            "timezone": timezone,
            "booking_path": booking_path,
            "notes": notes,
            "external_lead_id": external_lead_id,
            "external_contact_id": external_contact_id,
            "deal_stage": "Qualification",
            "task_subject": f"Booking follow-up: {service_name or 'BookedAI service'}",
        },
    )
    payload_json = _crm_payload_json(booking_record)
    deal_record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="deal",
        local_entity_id=local_entity_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=payload_json,
    )
    task_record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="task",
        local_entity_id=local_entity_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=payload_json,
    )

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        return BookingCrmSyncOperationResult(
            deal_record_id=deal_record_id,
            deal_sync_status="pending",
            task_record_id=task_record_id,
            task_sync_status="pending",
            warning_codes=["provider_unconfigured"],
        )

    deal_result = await _execute_booking_deal_sync(
        repository=repository,
        tenant_id=tenant_id,
        crm_sync_record_id=deal_record_id,
        booking_record=booking_record,
    )
    task_result = await _execute_booking_task_sync(
        repository=repository,
        tenant_id=tenant_id,
        crm_sync_record_id=task_record_id,
        booking_record=booking_record,
        external_deal_id=deal_result.external_entity_id,
    )
    return BookingCrmSyncOperationResult(
        deal_record_id=deal_result.record_id,
        deal_sync_status=deal_result.sync_status,
        deal_external_entity_id=deal_result.external_entity_id,
        task_record_id=task_result.record_id,
        task_sync_status=task_result.sync_status,
        task_external_entity_id=task_result.external_entity_id,
        warning_codes=_merge_warning_codes(deal_result.warning_codes, task_result.warning_codes),
    )


async def execute_crm_sync_retry(
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
    if current_status not in {"failed", "manual_review_required", "conflict", "retrying"}:
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status=current_status,
            external_entity_id=str(existing_record.get("external_entity_id") or "").strip() or None,
            warning_codes=["retry_not_required"],
        )

    payload = existing_record.get("payload") if isinstance(existing_record.get("payload"), dict) else {}
    if not payload:
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="missing_payload",
            error_message="CRM retry could not proceed because the stored sync payload is missing.",
            retryable=False,
            payload_json=json.dumps({"reason": reason}),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status=current_status,
            warning_codes=["missing_payload"],
        )

    await repository.mark_retrying(
        tenant_id=tenant_id,
        crm_sync_record_id=crm_sync_record_id,
    )
    lead_like = LeadRecordContract(**payload)
    entity_type = str(existing_record.get("entity_type") or "").strip().lower()

    if entity_type == "lead":
        result = await _replay_lead_sync(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            lead_record=lead_like,
        )
    elif entity_type == "contact":
        result = await _replay_contact_sync(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            contact_record=lead_like,
        )
    else:
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="unsupported_entity_type",
            error_message=f"CRM retry does not yet support entity type '{entity_type}'.",
            retryable=False,
            payload_json=json.dumps({"reason": reason, "entity_type": entity_type}),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="manual_review_required",
            warning_codes=["unsupported_entity_type"],
        )

    if result.warning_codes:
        result.warning_codes.append(f"retry_from_{current_status}")
    else:
        result.warning_codes = [f"retry_from_{current_status}"]
    return result


async def _execute_booking_deal_sync(
    *,
    repository: CrmSyncRepository,
    tenant_id: str,
    crm_sync_record_id: int | None,
    booking_record: LeadRecordContract,
) -> CrmSyncOperationResult:
    if crm_sync_record_id is None:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    try:
        upsert_result = await adapter.upsert_deal(settings, lead=booking_record)
    except ValueError as error:
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status="manual_review_required",
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="invalid_deal_payload",
            error_message=str(error),
            retryable=False,
            payload_json=_crm_payload_json(booking_record),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="manual_review_required",
            warning_codes=["invalid_deal_payload"],
        )
    except httpx.HTTPStatusError as error:
        response_excerpt = error.response.text[:500] if error.response is not None else None
        retryable = error.response is None or error.response.status_code >= 500
        sync_status = "failed" if retryable else "manual_review_required"
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status=sync_status,
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code=f"http_{error.response.status_code}" if error.response is not None else "http_error",
            error_message="Zoho CRM deal sync failed.",
            retryable=retryable,
            payload_json=json.dumps(
                {
                    "booking": _crm_payload_dict(booking_record),
                    "response_excerpt": response_excerpt,
                }
            ),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status=sync_status,
            warning_codes=["deal_provider_http_error"],
        )

    external_entity_id = str(upsert_result.get("external_id") or "").strip() or None
    await repository.update_sync_record_status(
        tenant_id=tenant_id,
        crm_sync_record_id=crm_sync_record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
        mark_synced=True,
    )
    return CrmSyncOperationResult(
        record_id=crm_sync_record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
    )


async def _execute_booking_task_sync(
    *,
    repository: CrmSyncRepository,
    tenant_id: str,
    crm_sync_record_id: int | None,
    booking_record: LeadRecordContract,
    external_deal_id: str | None,
) -> CrmSyncOperationResult:
    if crm_sync_record_id is None:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    if external_deal_id:
        booking_record.metadata["external_deal_id"] = external_deal_id

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    try:
        create_result = await adapter.create_follow_up_task(settings, lead=booking_record)
    except ValueError as error:
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status="manual_review_required",
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="invalid_task_payload",
            error_message=str(error),
            retryable=False,
            payload_json=_crm_payload_json(booking_record),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="manual_review_required",
            warning_codes=["invalid_task_payload"],
        )
    except httpx.HTTPStatusError as error:
        response_excerpt = error.response.text[:500] if error.response is not None else None
        retryable = error.response is None or error.response.status_code >= 500
        sync_status = "failed" if retryable else "manual_review_required"
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status=sync_status,
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code=f"http_{error.response.status_code}" if error.response is not None else "http_error",
            error_message="Zoho CRM follow-up task sync failed.",
            retryable=retryable,
            payload_json=json.dumps(
                {
                    "booking": _crm_payload_dict(booking_record),
                    "response_excerpt": response_excerpt,
                }
            ),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status=sync_status,
            warning_codes=["task_provider_http_error"],
        )

    external_entity_id = str(create_result.get("external_id") or "").strip() or None
    await repository.update_sync_record_status(
        tenant_id=tenant_id,
        crm_sync_record_id=crm_sync_record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
        mark_synced=True,
    )
    return CrmSyncOperationResult(
        record_id=crm_sync_record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
    )


async def _replay_lead_sync(
    *,
    repository: CrmSyncRepository,
    tenant_id: str,
    crm_sync_record_id: int,
    lead_record: LeadRecordContract,
) -> CrmSyncOperationResult:
    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="provider_unconfigured",
            error_message="CRM retry cannot execute because Zoho CRM credentials are not configured.",
            retryable=True,
            payload_json=_crm_payload_json(lead_record),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="retrying",
            warning_codes=["provider_unconfigured"],
        )
    try:
        upsert_result = await adapter.upsert_lead(settings, lead=lead_record)
    except ValueError as error:
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status="manual_review_required",
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="invalid_payload",
            error_message=str(error),
            retryable=False,
            payload_json=_crm_payload_json(lead_record),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="manual_review_required",
            warning_codes=["invalid_payload"],
        )
    except httpx.HTTPStatusError as error:
        response_excerpt = error.response.text[:500] if error.response is not None else None
        retryable = error.response is None or error.response.status_code >= 500
        sync_status = "failed" if retryable else "manual_review_required"
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status=sync_status,
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code=f"http_{error.response.status_code}" if error.response is not None else "http_error",
            error_message="Zoho CRM lead retry failed.",
            retryable=retryable,
            payload_json=json.dumps(
                {"lead": _crm_payload_dict(lead_record), "response_excerpt": response_excerpt}
            ),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status=sync_status,
            warning_codes=["provider_http_error"],
        )

    external_entity_id = str(upsert_result.get("external_id") or "").strip() or None
    await repository.update_sync_record_status(
        tenant_id=tenant_id,
        crm_sync_record_id=crm_sync_record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
        mark_synced=True,
    )
    return CrmSyncOperationResult(
        record_id=crm_sync_record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
    )


async def _replay_contact_sync(
    *,
    repository: CrmSyncRepository,
    tenant_id: str,
    crm_sync_record_id: int,
    contact_record: LeadRecordContract,
) -> CrmSyncOperationResult:
    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="provider_unconfigured",
            error_message="CRM contact retry cannot execute because Zoho CRM credentials are not configured.",
            retryable=True,
            payload_json=_crm_payload_json(contact_record),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="retrying",
            warning_codes=["provider_unconfigured"],
        )
    try:
        upsert_result = await adapter.upsert_contact(settings, lead=contact_record)
    except ValueError as error:
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status="manual_review_required",
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code="invalid_payload",
            error_message=str(error),
            retryable=False,
            payload_json=_crm_payload_json(contact_record),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status="manual_review_required",
            warning_codes=["invalid_payload"],
        )
    except httpx.HTTPStatusError as error:
        response_excerpt = error.response.text[:500] if error.response is not None else None
        retryable = error.response is None or error.response.status_code >= 500
        sync_status = "failed" if retryable else "manual_review_required"
        await repository.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status=sync_status,
        )
        await repository.record_sync_error(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            error_code=f"http_{error.response.status_code}" if error.response is not None else "http_error",
            error_message="Zoho CRM contact retry failed.",
            retryable=retryable,
            payload_json=json.dumps(
                {"contact": _crm_payload_dict(contact_record), "response_excerpt": response_excerpt}
            ),
        )
        return CrmSyncOperationResult(
            record_id=crm_sync_record_id,
            sync_status=sync_status,
            warning_codes=["provider_http_error"],
        )

    external_entity_id = str(upsert_result.get("external_id") or "").strip() or None
    await repository.update_sync_record_status(
        tenant_id=tenant_id,
        crm_sync_record_id=crm_sync_record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
        mark_synced=True,
    )
    return CrmSyncOperationResult(
        record_id=crm_sync_record_id,
        sync_status="synced",
        external_entity_id=external_entity_id,
    )


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


async def orchestrate_communication_touch(
    session,
    *,
    tenant_id: str,
    channel: str,
    to: str,
    body: str,
    provider: str,
    delivery_status: str,
    actor_channel: str | None = None,
    template_key: str | None = None,
    metadata: dict[str, object | None] | None = None,
) -> CommunicationOperationResult:
    message_id = str(uuid4())
    warning_codes: list[str] = []
    record_status = delivery_status

    if provider.endswith("unconfigured"):
        record_status = "manual_review_required"
        warning_codes.append("provider_unconfigured")
    elif delivery_status == "failed":
        record_status = "failed"
        warning_codes.append("delivery_failed")

    session.add(
        ConversationEvent(
            source=channel,
            event_type=f"outbound_{channel}",
            conversation_id=message_id,
            sender_name="Bookedai.au",
            sender_email=None,
            message_text=body,
            ai_intent="lifecycle_message",
            ai_reply=None,
            workflow_status=record_status,
            metadata_json={
                "tenant_id": tenant_id,
                "channel": channel,
                "provider": provider,
                "delivery_status": delivery_status,
                "record_status": record_status,
                "to": to,
                "template_key": template_key,
                "actor_channel": actor_channel,
                "warning_codes": warning_codes,
                **(metadata or {}),
            },
        )
    )

    return CommunicationOperationResult(
        message_id=message_id,
        channel=channel,
        delivery_status=delivery_status,
        record_status=record_status,
        provider=provider,
        warning_codes=warning_codes,
    )
