from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
import json
import logging
from typing import Any
from uuid import uuid4

import httpx
from sqlalchemy import text

from config import get_settings
from core.contracts.crm import LeadRecordContract
from db import ConversationEvent
from integrations.zoho_crm.adapter import ZohoCrmAdapter
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.chess_schedule_slot_repository import ChessScheduleSlotRepository
from repositories.crm_repository import CrmSyncRepository
from repositories.email_repository import EmailRepository
from repositories.outbox_repository import OutboxRepository

_logger = logging.getLogger(__name__)


def _settings_with_tenant_crm_credentials(settings, tenant_credentials: object | None):
    if tenant_credentials is None:
        return settings
    return replace(
        settings,
        zoho_crm_access_token="",
        zoho_crm_refresh_token=str(getattr(tenant_credentials, "refresh_token", "") or ""),
        zoho_crm_client_id=str(getattr(tenant_credentials, "client_id", "") or ""),
        zoho_crm_client_secret=str(getattr(tenant_credentials, "client_secret", "") or ""),
        zoho_accounts_base_url=str(
            getattr(tenant_credentials, "accounts_base_url", "") or settings.zoho_accounts_base_url
        ),
        zoho_crm_api_base_url=str(
            getattr(tenant_credentials, "api_base_url", "") or settings.zoho_crm_api_base_url
        ),
        zoho_crm_default_lead_module=str(
            getattr(tenant_credentials, "default_lead_module", "") or settings.zoho_crm_default_lead_module
        ),
        zoho_crm_default_contact_module=str(
            getattr(tenant_credentials, "default_contact_module", "") or settings.zoho_crm_default_contact_module
        ),
        zoho_crm_default_deal_module=str(
            getattr(tenant_credentials, "default_deal_module", "") or settings.zoho_crm_default_deal_module
        ),
        zoho_crm_default_task_module=str(
            getattr(tenant_credentials, "default_task_module", "") or settings.zoho_crm_default_task_module
        ),
    )


async def _record_crm_transport_error(
    *,
    repository: CrmSyncRepository,
    tenant_id: str,
    crm_sync_record_id: int,
    entity_label: str,
    record: LeadRecordContract,
    error: httpx.HTTPError,
    warning_code: str,
) -> CrmSyncOperationResult:
    await repository.update_sync_record_status(
        tenant_id=tenant_id,
        crm_sync_record_id=crm_sync_record_id,
        sync_status="failed",
    )
    await repository.record_sync_error(
        tenant_id=tenant_id,
        crm_sync_record_id=crm_sync_record_id,
        error_code="provider_transport_error",
        error_message=f"Zoho CRM {entity_label} sync could not reach the provider.",
        retryable=True,
        payload_json=json.dumps(
            {
                entity_label: _crm_payload_dict(record),
                "error_type": type(error).__name__,
            }
        ),
    )
    return CrmSyncOperationResult(
        record_id=crm_sync_record_id,
        sync_status="failed",
        warning_codes=[warning_code],
    )


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
    tenant_crm_credentials: object | None = None,
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

    settings = _settings_with_tenant_crm_credentials(get_settings(), tenant_crm_credentials)
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
    except httpx.HTTPError as error:
        return await _record_crm_transport_error(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            entity_label="lead",
            record=lead_record,
            error=error,
            warning_code="provider_transport_error",
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
    tenant_crm_credentials: object | None = None,
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

    settings = _settings_with_tenant_crm_credentials(get_settings(), tenant_crm_credentials)
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
    except httpx.HTTPError as error:
        return await _record_crm_transport_error(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=record_id,
            entity_label="contact",
            record=contact_record,
            error=error,
            warning_code="provider_transport_error",
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
    tenant_crm_credentials: object | None = None,
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

    settings = _settings_with_tenant_crm_credentials(get_settings(), tenant_crm_credentials)
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
        tenant_crm_credentials=tenant_crm_credentials,
    )
    task_result = await _execute_booking_task_sync(
        repository=repository,
        tenant_id=tenant_id,
        crm_sync_record_id=task_record_id,
        booking_record=booking_record,
        external_deal_id=deal_result.external_entity_id,
        tenant_crm_credentials=tenant_crm_credentials,
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


async def orchestrate_payment_paid_sync(
    session,
    *,
    tenant_id: str,
    booking_reference: str | None,
    booking_intent_id: str | None,
    customer_name: str | None,
    customer_email: str | None,
    customer_phone: str | None,
    service_name: str | None,
    requested_date: str | None,
    requested_time: str | None,
    timezone: str | None,
    payment_source: str | None,
    amount_aud: float | None,
    currency: str | None,
    paid_at: str | None,
    external_contact_id: str | None = None,
    external_deal_id: str | None = None,
) -> dict[str, object]:
    local_entity_id = (booking_reference or booking_intent_id or "").strip()
    if not tenant_id or not local_entity_id:
        return {"status": "skipped", "warning_codes": ["missing_booking_context"]}

    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    payment_record = LeadRecordContract(
        lead_id=booking_intent_id,
        full_name=customer_name,
        email=customer_email,
        phone=customer_phone,
        source=payment_source or "payment_reconciliation",
        company_name=service_name or "BookedAI Paid Booking",
        tenant_id=tenant_id,
        lead_status="paid",
        metadata={
            "booking_intent_id": booking_intent_id,
            "booking_reference": booking_reference,
            "service_name": service_name,
            "requested_date": requested_date,
            "requested_time": requested_time,
            "timezone": timezone,
            "booking_path": payment_source or "payment_reconciliation",
            "notes": (
                f"Payment received via {payment_source or 'payment reconciliation'}"
                f" for {amount_aud or 0:g} {(currency or 'aud').upper()} at {paid_at or 'unknown time'}."
            ),
            "amount_aud": amount_aud,
            "currency": currency,
            "paid_at": paid_at,
            "external_contact_id": external_contact_id,
            "external_deal_id": external_deal_id,
            "deal_stage": "Closed Won",
            "task_subject": "Payment received - send thank-you/support follow-up",
        },
    )
    payload_json = _crm_payload_json(payment_record)
    deal_record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="deal_payment",
        local_entity_id=local_entity_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=payload_json,
    )
    task_record_id = await repository.create_sync_record(
        tenant_id=tenant_id,
        entity_type="task_payment",
        local_entity_id=local_entity_id,
        provider="zoho_crm",
        sync_status="pending",
        payload_json=payload_json,
    )

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if not adapter.configured(settings):
        return {
            "status": "pending",
            "deal": {"record_id": deal_record_id, "sync_status": "pending"},
            "task": {"record_id": task_record_id, "sync_status": "pending"},
            "warning_codes": ["provider_unconfigured"],
        }

    deal_result = await _execute_booking_deal_sync(
        repository=repository,
        tenant_id=tenant_id,
        crm_sync_record_id=deal_record_id,
        booking_record=payment_record,
    )
    task_result = await _execute_booking_task_sync(
        repository=repository,
        tenant_id=tenant_id,
        crm_sync_record_id=task_record_id,
        booking_record=payment_record,
        external_deal_id=deal_result.external_entity_id or external_deal_id,
    )
    return {
        "status": "synced" if not (deal_result.warning_codes or task_result.warning_codes) else "partial",
        "deal": {
            "record_id": deal_result.record_id,
            "sync_status": deal_result.sync_status,
            "external_entity_id": deal_result.external_entity_id,
        },
        "task": {
            "record_id": task_result.record_id,
            "sync_status": task_result.sync_status,
            "external_entity_id": task_result.external_entity_id,
        },
        "warning_codes": _merge_warning_codes(deal_result.warning_codes, task_result.warning_codes),
    }


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
    elif entity_type in {"deal", "deal_payment"}:
        result = await _execute_booking_deal_sync(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            booking_record=lead_like,
        )
    elif entity_type in {"task", "task_payment"}:
        external_deal_id = str((lead_like.metadata or {}).get("external_deal_id") or "").strip() or None
        result = await _execute_booking_task_sync(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            booking_record=lead_like,
            external_deal_id=external_deal_id,
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
    tenant_crm_credentials: object | None = None,
) -> CrmSyncOperationResult:
    if crm_sync_record_id is None:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    settings = _settings_with_tenant_crm_credentials(get_settings(), tenant_crm_credentials)
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
    except httpx.HTTPError as error:
        return await _record_crm_transport_error(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            entity_label="deal",
            record=booking_record,
            error=error,
            warning_code="deal_provider_transport_error",
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
    tenant_crm_credentials: object | None = None,
) -> CrmSyncOperationResult:
    if crm_sync_record_id is None:
        return CrmSyncOperationResult(record_id=None, sync_status="skipped")

    if external_deal_id:
        booking_record.metadata["external_deal_id"] = external_deal_id

    settings = _settings_with_tenant_crm_credentials(get_settings(), tenant_crm_credentials)
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
    except httpx.HTTPError as error:
        return await _record_crm_transport_error(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            entity_label="task",
            record=booking_record,
            error=error,
            warning_code="task_provider_transport_error",
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
    except httpx.HTTPError as error:
        return await _record_crm_transport_error(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            entity_label="lead",
            record=lead_record,
            error=error,
            warning_code="provider_transport_error",
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
    except httpx.HTTPError as error:
        return await _record_crm_transport_error(
            repository=repository,
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            entity_label="contact",
            record=contact_record,
            error=error,
            warning_code="provider_transport_error",
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


# ---------------------------------------------------------------------------
# Phase 1 lifecycle orchestrators: cancellation + reschedule
# ---------------------------------------------------------------------------
#
# These orchestrators are append-only additions for the AI Mentor + chess
# lifecycle Phase 1 work. They mirror the structure of
# ``orchestrate_payment_paid_sync`` (return ``dict[str, object]`` with a
# ``status`` discriminator + per-side-effect sub-dicts + ``warnings`` list).
# Every external call (Zoho CRM/Meeting, repositories) is wrapped so the
# orchestrator never raises into HTTP handlers — partial results land in the
# return dict and outbox retry covers eventual consistency.


async def _lookup_booking_lifecycle_context(
    session,
    *,
    tenant_id: str | None,
    booking_reference: str | None,
    booking_intent_id: str | None,
) -> dict[str, Any] | None:
    """Resolve booking_intent + contact + meeting metadata for lifecycle ops.

    Mirrors :func:`payment_lifecycle_service._lookup_booking_payment_context`
    but tuned for cancel/reschedule (we need ``status`` and the meeting id
    rather than the latest payment intent). Falls back to looking the row up
    by either ``booking_reference`` or ``booking_intent_id`` so callers can
    pass whichever is at hand.
    """
    normalized_reference = (booking_reference or "").strip() or None
    normalized_intent_id = (booking_intent_id or "").strip() or None
    if not normalized_reference and not normalized_intent_id:
        return None

    result = await session.execute(
        text(
            """
            select
              bi.id::text as booking_intent_id,
              bi.tenant_id::text as tenant_id,
              bi.booking_reference,
              bi.status,
              bi.service_name,
              bi.requested_date,
              bi.requested_time,
              bi.timezone,
              bi.booking_path,
              bi.payment_dependency_state,
              bi.metadata_json as booking_metadata,
              bi.contact_id::text as contact_id,
              c.full_name as customer_name,
              c.email as customer_email,
              c.phone as customer_phone
            from booking_intents bi
            left join contacts c
              on c.id = bi.contact_id
            where (
                cast(:tenant_id as text) is null
                or bi.tenant_id::text = cast(:tenant_id as text)
              )
              and (
                bi.booking_reference = cast(:booking_reference as text)
                or bi.id::text = cast(:booking_intent_id as text)
              )
            limit 1
            """
        ),
        {
            "tenant_id": (tenant_id or "").strip() or None,
            "booking_reference": normalized_reference,
            "booking_intent_id": normalized_intent_id,
        },
    )
    row = result.mappings().first()
    return dict(row) if row else None


def _extract_meeting_id(booking_metadata: dict[str, Any] | None) -> str | None:
    """Pull the Zoho Meeting id out of ``booking_intent.metadata_json``.

    The booking-intent row stores meeting details under
    ``metadata_json.zoho_meeting`` (see
    :meth:`BookingIntentRepository.update_zoho_meeting_metadata`). Older
    rows may keep the id at the top level under a few historical keys, so
    we probe a small whitelist before giving up.
    """
    if not isinstance(booking_metadata, dict):
        return None
    zoho_block = booking_metadata.get("zoho_meeting")
    if isinstance(zoho_block, dict):
        for key in ("meeting_id", "meeting_key", "id", "event_id"):
            value = zoho_block.get(key)
            if value:
                return str(value).strip() or None
    for key in ("zoho_meeting_id", "meeting_id", "zoho_event_id"):
        value = booking_metadata.get(key)
        if value:
            return str(value).strip() or None
    return None


def _extract_meeting_url(booking_metadata: dict[str, Any] | None) -> str | None:
    if not isinstance(booking_metadata, dict):
        return None
    zoho_block = booking_metadata.get("zoho_meeting")
    if isinstance(zoho_block, dict):
        for key in ("meeting_url", "join_url", "attendee_url"):
            value = zoho_block.get(key)
            if value:
                return str(value).strip() or None
    return None


def _extract_customer_locale(booking_metadata: dict[str, Any] | None) -> str:
    if isinstance(booking_metadata, dict):
        for key in ("customer_locale", "locale", "language"):
            value = booking_metadata.get(key)
            if value:
                normalized = str(value).strip().lower()
                if normalized.startswith("vi"):
                    return "vi"
                if normalized.startswith("en"):
                    return "en"
    return "en"


def _is_chess_path(booking_path: str | None) -> bool:
    if not booking_path:
        return False
    return "chess" in str(booking_path).strip().lower()


async def _slot_belongs_to_chess(
    session,
    *,
    tenant_id: str,
    slot_id: str | None,
) -> bool:
    """Heuristic: returns True iff ``chess_course_schedule_slots`` has a row
    matching the given slot_id for this tenant. Used to decide whether to
    call ``release_capacity`` / ``reserve_capacity`` (chess) or skip the
    capacity dance entirely (AI Mentor)."""
    if not slot_id:
        return False
    try:
        repository = ChessScheduleSlotRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        row = await repository.get_slot_for_booking(
            tenant_id=tenant_id,
            slot_id=slot_id,
        )
        return row is not None
    except Exception as exc:  # noqa: BLE001
        _logger.debug(
            "chess_slot_heuristic_failed",
            extra={
                "event_type": "chess_slot_heuristic_failed",
                "tenant_id": tenant_id,
                "slot_id": slot_id,
            },
            exc_info=exc,
        )
        return False


async def orchestrate_booking_cancelled(
    session,
    *,
    tenant_id: str,
    booking_reference: str,
    booking_intent_id: str | None = None,
    actor_type: str,
    actor_id: str | None = None,
    channel: str,
    reason: str | None = None,
    raw_provider_payload: dict | None = None,
) -> dict[str, object]:
    """Orchestrate the full cancellation lifecycle for a booking.

    Steps (each external step is best-effort and never raises out):
      1. Resolve the booking_intent row + contact + meeting metadata.
      2. Short-circuit if the booking is already cancelled.
      3. Update ``booking_intents.status`` to ``'cancelled'``.
      4. Record a ``deal_cancelled`` CRM sync record (and try to push to
         Zoho CRM if configured).
      5. Cancel the Zoho Meeting if a meeting id is on the row.
      6. Enqueue an outbox event for downstream consumers (idempotent on
         ``f"{actor_type}:booking.cancelled:{booking_reference}"``).
      7. Queue a lifecycle email (``aimentor_cancellation``) and
         best-effort communication touches on telegram + whatsapp.
    """
    warnings: list[str] = []
    _logger.info(
        "orchestrate_booking_cancelled_begin",
        extra={
            "event_type": "orchestrate_booking_cancelled_begin",
            "tenant_id": tenant_id,
            "booking_reference": booking_reference,
            "actor_type": actor_type,
            "channel": channel,
        },
    )

    context = await _lookup_booking_lifecycle_context(
        session,
        tenant_id=tenant_id,
        booking_reference=booking_reference,
        booking_intent_id=booking_intent_id,
    )
    if not context:
        return {
            "status": "not_found",
            "booking_reference": booking_reference,
            "booking_intent_id": booking_intent_id,
            "warnings": ["booking_not_found"],
        }

    resolved_tenant_id = (context.get("tenant_id") or tenant_id or "").strip()
    resolved_reference = (context.get("booking_reference") or booking_reference or "").strip()
    resolved_intent_id = (context.get("booking_intent_id") or "").strip()
    current_status = (context.get("status") or "").strip().lower()
    booking_metadata = context.get("booking_metadata") if isinstance(context.get("booking_metadata"), dict) else {}
    meeting_id = _extract_meeting_id(booking_metadata)
    customer_email = (context.get("customer_email") or "").strip() or None
    customer_name = (context.get("customer_name") or "").strip() or None
    service_name = (context.get("service_name") or "").strip() or None
    contact_id = (context.get("contact_id") or "").strip() or None
    customer_locale = _extract_customer_locale(booking_metadata)
    cancelled_at = datetime.now(timezone.utc)

    if current_status == "cancelled":
        return {
            "status": "already_cancelled",
            "booking_reference": resolved_reference,
            "booking_intent_id": resolved_intent_id,
            "current_status": current_status,
            "warnings": [],
        }

    idempotency_key = f"{actor_type}:booking.cancelled:{resolved_reference}"

    # Step 3: flip booking row to cancelled.
    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    try:
        await booking_repository.sync_callback_status(
            tenant_id=resolved_tenant_id,
            booking_reference=resolved_reference,
            status="cancelled",
            metadata_updates={
                "cancelled_at": cancelled_at.isoformat(),
                "cancellation_reason": (reason or "").strip() or None,
                "cancellation_actor_type": actor_type,
                "cancellation_actor_id": actor_id,
                "cancellation_channel": channel,
            },
        )
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "booking_cancel_status_update_failed",
            extra={
                "event_type": "booking_cancel_status_update_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
            },
            exc_info=exc,
        )
        warnings.append("booking_status_update_failed")

    # Step 4: CRM sync record + best-effort Zoho push.
    crm_sync: dict[str, Any] = {}
    crm_repository = CrmSyncRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    crm_payload = {
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "service_name": service_name,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "deal_stage": "Cancelled",
        "reason": (reason or "").strip() or None,
        "cancelled_at": cancelled_at.isoformat(),
        "actor_type": actor_type,
    }
    crm_sync_record_id: int | None = None
    try:
        crm_sync_record_id = await crm_repository.create_sync_record(
            tenant_id=resolved_tenant_id,
            entity_type="deal_cancelled",
            local_entity_id=resolved_reference,
            provider="zoho_crm",
            sync_status="pending",
            payload_json=json.dumps(crm_payload),
        )
        crm_sync["record_id"] = crm_sync_record_id
        crm_sync["sync_status"] = "pending"
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "booking_cancel_crm_seed_failed",
            extra={
                "event_type": "booking_cancel_crm_seed_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
            },
            exc_info=exc,
        )
        warnings.append("crm_seed_failed")
        crm_sync["sync_status"] = "failed"

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if crm_sync_record_id is not None and adapter.configured(settings):
        try:
            cancel_record = LeadRecordContract(
                lead_id=resolved_intent_id or resolved_reference,
                full_name=customer_name,
                email=customer_email,
                phone=(context.get("customer_phone") or "").strip() or None,
                source="booking_cancellation",
                company_name=service_name or "BookedAI Booking",
                tenant_id=resolved_tenant_id,
                lead_status="cancelled",
                metadata={
                    **crm_payload,
                    "task_subject": f"Cancelled: {service_name or 'BookedAI Booking'}",
                },
            )
            upsert_result = await adapter.upsert_deal(settings, lead=cancel_record)
            external_entity_id = upsert_result.get("external_entity_id") or upsert_result.get(
                "id"
            )
            await crm_repository.update_sync_record_status(
                tenant_id=resolved_tenant_id,
                crm_sync_record_id=crm_sync_record_id,
                sync_status="synced",
                external_entity_id=str(external_entity_id) if external_entity_id else None,
                mark_synced=True,
            )
            crm_sync["sync_status"] = "synced"
            crm_sync["external_entity_id"] = (
                str(external_entity_id) if external_entity_id else None
            )
        except (ValueError, httpx.HTTPError) as exc:
            _logger.warning(
                "booking_cancel_crm_push_failed",
                extra={
                    "event_type": "booking_cancel_crm_push_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                },
                exc_info=exc,
            )
            warnings.append("crm_push_failed")
            crm_sync["sync_status"] = "pending"
    elif crm_sync_record_id is not None:
        crm_sync["sync_status"] = "pending"
        warnings.append("crm_provider_unconfigured")

    # Step 5: cancel Zoho Meeting (best-effort).
    meeting_cancellation: dict[str, Any] = {"status": "skipped"}
    if meeting_id:
        try:
            from service_layer.calls_scheduling import (
                cancel_zoho_meeting_for_booking,
            )

            meeting_cancellation = await cancel_zoho_meeting_for_booking(
                settings,
                meeting_id=meeting_id,
            )
            if meeting_cancellation.get("status") != "cancelled":
                warnings.append("meeting_cancel_failed")
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_cancel_meeting_failed",
                extra={
                    "event_type": "booking_cancel_meeting_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                    "meeting_id": meeting_id,
                },
                exc_info=exc,
            )
            warnings.append("meeting_cancel_failed")
            meeting_cancellation = {
                "status": "failed",
                "error": str(exc),
                "meeting_id": meeting_id,
            }

    # Step 6: outbox event.
    outbox_event_id: int | None = None
    outbox_repository = OutboxRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    outbox_payload = {
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "tenant_id": resolved_tenant_id,
        "service_name": service_name,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "actor_type": actor_type,
        "actor_id": actor_id,
        "channel": channel,
        "reason": (reason or "").strip() or None,
        "cancelled_at": cancelled_at.isoformat(),
        "meeting_cancellation": meeting_cancellation,
        "raw_provider_payload": raw_provider_payload or {},
    }
    try:
        outbox_event_id = await outbox_repository.enqueue_event(
            tenant_id=resolved_tenant_id,
            event_type="booking.cancelled",
            aggregate_type="booking_intent",
            aggregate_id=resolved_intent_id or resolved_reference,
            payload=outbox_payload,
            idempotency_key=idempotency_key,
        )
    except Exception as exc:  # noqa: BLE001
        # Most likely a UNIQUE-constraint hit on idempotency_key — treat as a
        # duplicate cancel and short-circuit, mirroring the contract from the
        # task description.
        _logger.info(
            "booking_cancel_outbox_duplicate_or_failed",
            extra={
                "event_type": "booking_cancel_outbox_duplicate_or_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
                "idempotency_key": idempotency_key,
            },
            exc_info=exc,
        )
        return {
            "status": "already_cancelled",
            "booking_reference": resolved_reference,
            "booking_intent_id": resolved_intent_id,
            "outbox_event_id": None,
            "idempotency_key": idempotency_key,
            "warnings": warnings + ["outbox_duplicate_or_failed"],
        }

    # Step 7: lifecycle email.
    email_result: dict[str, Any] = {"status": "skipped"}
    if customer_email:
        subject_label = service_name or "your BookedAI booking"
        try:
            email_outcome = await orchestrate_lifecycle_email(
                session,
                tenant_id=resolved_tenant_id,
                template_key="aimentor_cancellation",
                subject=f"Cancellation confirmed — {subject_label}",
                provider="outbox",
                delivery_status="queued",
                contact_id=contact_id,
                event_payload={
                    **outbox_payload,
                    "template_key": "aimentor_cancellation",
                    "locale": customer_locale,
                    "recipient_email": customer_email,
                    "variables": {
                        "customer_name": customer_name,
                        "service_name": service_name,
                        "booking_reference": resolved_reference,
                        "cancelled_at": cancelled_at.isoformat(),
                        "reason": (reason or "").strip() or None,
                    },
                },
            )
            email_result = {
                "message_id": email_outcome.message_id,
                "delivery_status": email_outcome.delivery_status,
                "record_status": email_outcome.record_status,
                "provider": email_outcome.provider,
                "warnings": email_outcome.warning_codes,
            }
            if email_outcome.warning_codes:
                warnings.extend(email_outcome.warning_codes)
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_cancel_email_failed",
                extra={
                    "event_type": "booking_cancel_email_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                },
                exc_info=exc,
            )
            warnings.append("email_failed")
            email_result = {"status": "failed", "error": str(exc)}
    else:
        email_result = {"status": "skipped", "reason": "no_customer_email"}
        warnings.append("missing_customer_email")

    # Step 8: best-effort communication touch on telegram + whatsapp.
    communications: dict[str, Any] = {}
    touch_message = (
        f"Your booking {resolved_reference} has been cancelled."
        + (f" Reason: {reason}" if reason else "")
    )
    for touch_channel in ("telegram", "whatsapp"):
        try:
            comm = await orchestrate_communication_touch(
                session,
                tenant_id=resolved_tenant_id,
                channel=touch_channel,
                to=customer_email or "",
                body=touch_message,
                provider=f"{touch_channel}_outbox",
                delivery_status="queued",
                actor_channel=channel,
                template_key="aimentor_cancellation",
                metadata={
                    "booking_reference": resolved_reference,
                    "booking_intent_id": resolved_intent_id,
                    "actor_type": actor_type,
                },
            )
            communications[touch_channel] = {
                "message_id": comm.message_id,
                "delivery_status": comm.delivery_status,
                "record_status": comm.record_status,
                "provider": comm.provider,
                "warnings": comm.warning_codes,
            }
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_cancel_communication_failed",
                extra={
                    "event_type": "booking_cancel_communication_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                    "channel": touch_channel,
                },
                exc_info=exc,
            )
            warnings.append(f"{touch_channel}_touch_failed")
            communications[touch_channel] = {"status": "failed", "error": str(exc)}

    _logger.info(
        "orchestrate_booking_cancelled_complete",
        extra={
            "event_type": "orchestrate_booking_cancelled_complete",
            "tenant_id": resolved_tenant_id,
            "booking_reference": resolved_reference,
            "outbox_event_id": outbox_event_id,
            "warnings": warnings,
        },
    )

    return {
        "status": "cancelled",
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "tenant_id": resolved_tenant_id,
        "cancelled_at": cancelled_at.isoformat(),
        "outbox_event_id": outbox_event_id,
        "idempotency_key": idempotency_key,
        "crm_sync": crm_sync,
        "meeting_cancellation": meeting_cancellation,
        "email": email_result,
        "communications": communications,
        "warnings": warnings,
    }


async def orchestrate_booking_rescheduled(
    session,
    *,
    tenant_id: str,
    booking_reference: str,
    new_start_at: datetime,
    actor_type: str,
    channel: str,
    booking_intent_id: str | None = None,
    new_slot_id: str | None = None,
    new_duration_minutes: int = 60,
    new_timezone: str = "Australia/Sydney",
    actor_id: str | None = None,
    raw_provider_payload: dict | None = None,
) -> dict[str, object]:
    """Orchestrate the full reschedule lifecycle for a booking.

    Mirrors :func:`orchestrate_booking_cancelled` in shape: every step is
    defensive, partial failures are recorded as ``warnings``, and the
    outbox event is the source of truth for downstream retries.

    Steps:
      1. Resolve booking row, refuse if not in {'paid','confirmed','pending'}.
      2. Capture old slot id + old start_at for the outbox payload.
      3. If the booking is on a chess slot, release/reserve capacity.
      4. Update slot assignment on the booking row.
      5. Reschedule the Zoho Meeting if a meeting id is present.
      6. Record a ``task_rescheduled`` CRM sync record (and push if configured).
      7. Enqueue an outbox event (idempotent on
         ``f"{actor_type}:booking.rescheduled:{ref}:{new_start.isoformat()}"``).
      8. Queue a lifecycle email + telegram + whatsapp touches.
    """
    warnings: list[str] = []
    _logger.info(
        "orchestrate_booking_rescheduled_begin",
        extra={
            "event_type": "orchestrate_booking_rescheduled_begin",
            "tenant_id": tenant_id,
            "booking_reference": booking_reference,
            "actor_type": actor_type,
            "channel": channel,
            "new_start_at": new_start_at.isoformat() if new_start_at else None,
        },
    )

    context = await _lookup_booking_lifecycle_context(
        session,
        tenant_id=tenant_id,
        booking_reference=booking_reference,
        booking_intent_id=booking_intent_id,
    )
    if not context:
        return {
            "status": "not_found",
            "booking_reference": booking_reference,
            "booking_intent_id": booking_intent_id,
            "warnings": ["booking_not_found"],
        }

    resolved_tenant_id = (context.get("tenant_id") or tenant_id or "").strip()
    resolved_reference = (context.get("booking_reference") or booking_reference or "").strip()
    resolved_intent_id = (context.get("booking_intent_id") or "").strip()
    current_status = (context.get("status") or "").strip().lower()
    booking_metadata = context.get("booking_metadata") if isinstance(context.get("booking_metadata"), dict) else {}
    meeting_id = _extract_meeting_id(booking_metadata)
    meeting_url = _extract_meeting_url(booking_metadata)
    customer_email = (context.get("customer_email") or "").strip() or None
    customer_name = (context.get("customer_name") or "").strip() or None
    service_name = (context.get("service_name") or "").strip() or None
    contact_id = (context.get("contact_id") or "").strip() or None
    booking_path = (context.get("booking_path") or "").strip() or None
    customer_locale = _extract_customer_locale(booking_metadata)

    if current_status not in {"paid", "confirmed", "pending"}:
        return {
            "status": "not_reschedulable",
            "booking_reference": resolved_reference,
            "booking_intent_id": resolved_intent_id,
            "current_status": current_status,
            "warnings": ["status_not_reschedulable"],
        }

    new_start_iso = new_start_at.isoformat()
    idempotency_key = (
        f"{actor_type}:booking.rescheduled:{resolved_reference}:{new_start_iso}"
    )

    old_slot_id_value = booking_metadata.get("slot_id") if isinstance(booking_metadata, dict) else None
    old_slot_id = (str(old_slot_id_value).strip() if old_slot_id_value else None) or None
    old_requested_date = context.get("requested_date")
    old_requested_time = context.get("requested_time")
    old_timezone = context.get("timezone")
    old_start_at_label = (
        f"{old_requested_date} {old_requested_time} ({old_timezone})"
        if old_requested_date and old_requested_time
        else None
    )

    # Step 3: capacity release/reserve for chess slots only.
    capacity_changes: dict[str, Any] = {}
    chess_path = _is_chess_path(booking_path)
    slot_repository = ChessScheduleSlotRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    if old_slot_id and (chess_path or await _slot_belongs_to_chess(
        session, tenant_id=resolved_tenant_id, slot_id=old_slot_id
    )):
        try:
            released = await slot_repository.release_capacity(
                tenant_id=resolved_tenant_id,
                slot_id=old_slot_id,
            )
            capacity_changes["released"] = (
                {"slot_id": old_slot_id, "status": "released"}
                if released
                else {"slot_id": old_slot_id, "status": "noop"}
            )
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_reschedule_release_failed",
                extra={
                    "event_type": "booking_reschedule_release_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                    "slot_id": old_slot_id,
                },
                exc_info=exc,
            )
            warnings.append("capacity_release_failed")
            capacity_changes["released"] = {"status": "failed", "error": str(exc)}

    if new_slot_id and (chess_path or await _slot_belongs_to_chess(
        session, tenant_id=resolved_tenant_id, slot_id=new_slot_id
    )):
        try:
            reserved = await slot_repository.reserve_capacity(
                tenant_id=resolved_tenant_id,
                slot_id=new_slot_id,
            )
            if reserved:
                capacity_changes["reserved"] = {
                    "slot_id": new_slot_id,
                    "status": "reserved",
                }
            else:
                warnings.append("capacity_reserve_unavailable")
                capacity_changes["reserved"] = {
                    "slot_id": new_slot_id,
                    "status": "unavailable",
                }
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_reschedule_reserve_failed",
                extra={
                    "event_type": "booking_reschedule_reserve_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                    "slot_id": new_slot_id,
                },
                exc_info=exc,
            )
            warnings.append("capacity_reserve_failed")
            capacity_changes["reserved"] = {"status": "failed", "error": str(exc)}

    # Step 4: update slot assignment on the booking_intent row.
    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    try:
        await booking_repository.update_slot_assignment(
            booking_reference=resolved_reference,
            new_slot_id=new_slot_id,
            new_requested_date=new_start_at.date().isoformat(),
            new_requested_time=new_start_at.time().strftime("%H:%M"),
            new_timezone=new_timezone,
        )
        await booking_repository.sync_callback_status(
            tenant_id=resolved_tenant_id,
            booking_reference=resolved_reference,
            metadata_updates={
                "rescheduled_at": datetime.now(timezone.utc).isoformat(),
                "previous_slot_id": old_slot_id,
                "previous_requested_date": str(old_requested_date) if old_requested_date else None,
                "previous_requested_time": str(old_requested_time) if old_requested_time else None,
                "previous_timezone": str(old_timezone) if old_timezone else None,
                "reschedule_actor_type": actor_type,
                "reschedule_actor_id": actor_id,
                "reschedule_channel": channel,
            },
        )
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "booking_reschedule_slot_update_failed",
            extra={
                "event_type": "booking_reschedule_slot_update_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
            },
            exc_info=exc,
        )
        warnings.append("slot_update_failed")

    # Step 5: reschedule Zoho Meeting (best-effort).
    settings = get_settings()
    meeting_update: dict[str, Any] = {"status": "skipped"}
    if meeting_id:
        try:
            from service_layer.calls_scheduling import (
                update_zoho_meeting_time_for_booking,
            )

            meeting_update = await update_zoho_meeting_time_for_booking(
                settings,
                meeting_id=meeting_id,
                new_start_at=new_start_at,
                duration_minutes=new_duration_minutes,
                timezone_name=new_timezone,
            )
            if meeting_update.get("status") != "updated":
                warnings.append("meeting_update_failed")
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_reschedule_meeting_failed",
                extra={
                    "event_type": "booking_reschedule_meeting_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                    "meeting_id": meeting_id,
                },
                exc_info=exc,
            )
            warnings.append("meeting_update_failed")
            meeting_update = {
                "status": "failed",
                "error": str(exc),
                "meeting_id": meeting_id,
            }

    # Step 6: CRM task_rescheduled sync record + push.
    crm_sync: dict[str, Any] = {}
    crm_repository = CrmSyncRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    crm_payload = {
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "service_name": service_name,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "task_subject": f"Rescheduled to {new_start_iso}",
        "previous_start_at": old_start_at_label,
        "new_start_at": new_start_iso,
        "new_timezone": new_timezone,
        "actor_type": actor_type,
    }
    crm_sync_record_id: int | None = None
    try:
        crm_sync_record_id = await crm_repository.create_sync_record(
            tenant_id=resolved_tenant_id,
            entity_type="task_rescheduled",
            local_entity_id=resolved_reference,
            provider="zoho_crm",
            sync_status="pending",
            payload_json=json.dumps(crm_payload),
        )
        crm_sync["record_id"] = crm_sync_record_id
        crm_sync["sync_status"] = "pending"
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "booking_reschedule_crm_seed_failed",
            extra={
                "event_type": "booking_reschedule_crm_seed_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
            },
            exc_info=exc,
        )
        warnings.append("crm_seed_failed")
        crm_sync["sync_status"] = "failed"

    adapter = ZohoCrmAdapter()
    if crm_sync_record_id is not None and adapter.configured(settings):
        try:
            reschedule_record = LeadRecordContract(
                lead_id=resolved_intent_id or resolved_reference,
                full_name=customer_name,
                email=customer_email,
                phone=(context.get("customer_phone") or "").strip() or None,
                source="booking_reschedule",
                company_name=service_name or "BookedAI Booking",
                tenant_id=resolved_tenant_id,
                lead_status="rescheduled",
                metadata=crm_payload,
            )
            task_result = await adapter.create_follow_up_task(
                settings, lead=reschedule_record
            )
            external_entity_id = task_result.get("external_entity_id") or task_result.get("id")
            await crm_repository.update_sync_record_status(
                tenant_id=resolved_tenant_id,
                crm_sync_record_id=crm_sync_record_id,
                sync_status="synced",
                external_entity_id=str(external_entity_id) if external_entity_id else None,
                mark_synced=True,
            )
            crm_sync["sync_status"] = "synced"
            crm_sync["external_entity_id"] = (
                str(external_entity_id) if external_entity_id else None
            )
        except (ValueError, httpx.HTTPError) as exc:
            _logger.warning(
                "booking_reschedule_crm_push_failed",
                extra={
                    "event_type": "booking_reschedule_crm_push_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                },
                exc_info=exc,
            )
            warnings.append("crm_push_failed")
            crm_sync["sync_status"] = "pending"
    elif crm_sync_record_id is not None:
        warnings.append("crm_provider_unconfigured")

    # Step 7: outbox event.
    outbox_event_id: int | None = None
    outbox_repository = OutboxRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    outbox_payload = {
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "tenant_id": resolved_tenant_id,
        "service_name": service_name,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "actor_type": actor_type,
        "actor_id": actor_id,
        "channel": channel,
        "old_slot_id": old_slot_id,
        "old_start_at_label": old_start_at_label,
        "new_slot_id": new_slot_id,
        "new_start_at": new_start_iso,
        "new_duration_minutes": new_duration_minutes,
        "new_timezone": new_timezone,
        "meeting_update": meeting_update,
        "capacity_changes": capacity_changes,
        "raw_provider_payload": raw_provider_payload or {},
    }
    try:
        outbox_event_id = await outbox_repository.enqueue_event(
            tenant_id=resolved_tenant_id,
            event_type="booking.rescheduled",
            aggregate_type="booking_intent",
            aggregate_id=resolved_intent_id or resolved_reference,
            payload=outbox_payload,
            idempotency_key=idempotency_key,
        )
    except Exception as exc:  # noqa: BLE001
        _logger.info(
            "booking_reschedule_outbox_duplicate_or_failed",
            extra={
                "event_type": "booking_reschedule_outbox_duplicate_or_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
                "idempotency_key": idempotency_key,
            },
            exc_info=exc,
        )
        warnings.append("outbox_duplicate_or_failed")

    # Step 8: lifecycle email.
    new_slot_label = f"{new_start_at.strftime('%A %d %B %Y, %H:%M')} ({new_timezone})"
    email_result: dict[str, Any] = {"status": "skipped"}
    if customer_email:
        subject_label = service_name or "your BookedAI booking"
        try:
            email_outcome = await orchestrate_lifecycle_email(
                session,
                tenant_id=resolved_tenant_id,
                template_key="aimentor_reschedule_confirmation",
                subject=f"Rescheduled — {subject_label}",
                provider="outbox",
                delivery_status="queued",
                contact_id=contact_id,
                event_payload={
                    **outbox_payload,
                    "template_key": "aimentor_reschedule_confirmation",
                    "locale": customer_locale,
                    "recipient_email": customer_email,
                    "variables": {
                        "customer_name": customer_name,
                        "service_name": service_name,
                        "booking_reference": resolved_reference,
                        "new_slot_label": new_slot_label,
                        "new_meeting_url": meeting_url,
                        "portal_url": "https://bookedai.au/portal",
                    },
                },
            )
            email_result = {
                "message_id": email_outcome.message_id,
                "delivery_status": email_outcome.delivery_status,
                "record_status": email_outcome.record_status,
                "provider": email_outcome.provider,
                "warnings": email_outcome.warning_codes,
            }
            if email_outcome.warning_codes:
                warnings.extend(email_outcome.warning_codes)
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_reschedule_email_failed",
                extra={
                    "event_type": "booking_reschedule_email_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                },
                exc_info=exc,
            )
            warnings.append("email_failed")
            email_result = {"status": "failed", "error": str(exc)}
    else:
        email_result = {"status": "skipped", "reason": "no_customer_email"}
        warnings.append("missing_customer_email")

    # Step 9: communication touches.
    communications: dict[str, Any] = {}
    touch_message = (
        f"Your booking {resolved_reference} has been rescheduled to "
        f"{new_slot_label}."
    )
    for touch_channel in ("telegram", "whatsapp"):
        try:
            comm = await orchestrate_communication_touch(
                session,
                tenant_id=resolved_tenant_id,
                channel=touch_channel,
                to=customer_email or "",
                body=touch_message,
                provider=f"{touch_channel}_outbox",
                delivery_status="queued",
                actor_channel=channel,
                template_key="aimentor_reschedule_confirmation",
                metadata={
                    "booking_reference": resolved_reference,
                    "booking_intent_id": resolved_intent_id,
                    "actor_type": actor_type,
                    "new_start_at": new_start_iso,
                },
            )
            communications[touch_channel] = {
                "message_id": comm.message_id,
                "delivery_status": comm.delivery_status,
                "record_status": comm.record_status,
                "provider": comm.provider,
                "warnings": comm.warning_codes,
            }
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_reschedule_communication_failed",
                extra={
                    "event_type": "booking_reschedule_communication_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                    "channel": touch_channel,
                },
                exc_info=exc,
            )
            warnings.append(f"{touch_channel}_touch_failed")
            communications[touch_channel] = {"status": "failed", "error": str(exc)}

    _logger.info(
        "orchestrate_booking_rescheduled_complete",
        extra={
            "event_type": "orchestrate_booking_rescheduled_complete",
            "tenant_id": resolved_tenant_id,
            "booking_reference": resolved_reference,
            "outbox_event_id": outbox_event_id,
            "warnings": warnings,
        },
    )

    return {
        "status": "rescheduled",
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "tenant_id": resolved_tenant_id,
        "old_slot_id": old_slot_id,
        "old_start_at_label": old_start_at_label,
        "new_slot_id": new_slot_id,
        "new_start_at": new_start_iso,
        "new_slot_label": new_slot_label,
        "new_timezone": new_timezone,
        "outbox_event_id": outbox_event_id,
        "idempotency_key": idempotency_key,
        "capacity_changes": capacity_changes,
        "meeting_update": meeting_update,
        "crm_sync": crm_sync,
        "email": email_result,
        "communications": communications,
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# Phase 4 lifecycle orchestrators: retention cadence + status transitions
# ---------------------------------------------------------------------------
#
# Append-only additions for the AI Mentor retention cadence (T+1d / T+7d /
# T+30d / T+90d) and the booking status-transition pipeline (completed /
# no_show / refunded / in_progress).
#
# These follow the same defensive contract as the Phase 1 orchestrators:
# every external call is wrapped in try/except, partial results land in the
# return dict via ``warnings``, and the outbox event is the source of truth
# for downstream retries.


# Inline copy table for retention bot messages on telegram + whatsapp. We
# keep this inline (rather than a template_key lookup) because retention
# bot blasts are plain-text and don't need the email render pipeline.
_RETENTION_BOT_COPY: dict[str, dict[str, str]] = {
    "t1d_thank_you": {
        "en": (
            "Thanks for your BookedAI session yesterday! "
            "We'd love your feedback — reply with a quick rating (1-5)."
        ),
        "vi": (
            "Cam on ban da tham gia phien BookedAI hom qua! "
            "Vui long phan hoi voi danh gia nhanh (1-5)."
        ),
    },
    "t7d_check_in": {
        "en": "How's your project going? Let us know if you'd like a follow-up call.",
        "vi": "Du an cua ban tien trien the nao? Bao chung toi neu ban muon hen mot cuoc goi tiep theo.",
    },
    "t30d_progress": {
        "en": (
            "Time for a check-in? Use code BOOKED10 for 10% off your next BookedAI session."
        ),
        "vi": (
            "Den luc kiem tra tien do? Dung ma BOOKED10 de giam 10% cho phien BookedAI tiep theo."
        ),
    },
    "t90d_winback": {
        "en": "We miss you! Come back to BookedAI — your next session is on us up to $50.",
        "vi": "Chung toi nho ban! Quay lai BookedAI — phien tiep theo duoc tang den $50.",
    },
}


_RETENTION_TEMPLATE_MAP: dict[str, str] = {
    "t1d_thank_you": "aimentor_retention_t1",
    "t7d_check_in": "aimentor_retention_t7",
    "t30d_progress": "aimentor_retention_t30",
    "t90d_winback": "aimentor_winback_t90",
}


_STATUS_DEAL_STAGE_MAP: dict[str, dict[str, str | None]] = {
    "completed": {"deal_stage": "Closed Won", "reason": None},
    "no_show": {"deal_stage": "Closed Lost", "reason": "no_show"},
    "refunded": {"deal_stage": "Closed Lost", "reason": "refund"},
    "in_progress": {"deal_stage": "In Progress", "reason": None},
}


async def orchestrate_retention_touch(
    session,
    *,
    tenant_id: str,
    booking_reference: str,
    customer_email: str,
    customer_name: str | None,
    cadence: str,
    preferred_channel: str = "email",
    locale: str = "en",
    raw_provider_payload: dict | None = None,
) -> dict[str, object]:
    """Orchestrate a single retention-cadence touch for a booking.

    The retention worker calls this once per cadence per booking. We
    enforce idempotency via the outbox UNIQUE constraint on
    ``f"retention:{cadence}:{booking_reference}"`` so a duplicate fire
    short-circuits with ``status='already_sent'``.

    Steps:
      1. Validate cadence; reject unknown values.
      2. Enqueue outbox event (idempotent on retention key).
      3. Dispatch the touch on the preferred channel (email / telegram /
         whatsapp).
      4. Record a ``retention_touch`` CRM sync record + best-effort Zoho
         follow-up task.
    """
    warnings: list[str] = []
    template_key = _RETENTION_TEMPLATE_MAP.get(cadence)
    if not template_key:
        return {
            "status": "invalid_cadence",
            "cadence": cadence,
            "booking_reference": booking_reference,
            "warnings": ["unknown_cadence"],
        }

    normalized_channel = (preferred_channel or "email").strip().lower()
    if normalized_channel not in ("email", "telegram", "whatsapp"):
        return {
            "status": "invalid_channel",
            "channel": normalized_channel,
            "booking_reference": booking_reference,
            "warnings": ["unknown_channel"],
        }

    normalized_locale = (locale or "en").strip().lower()
    if normalized_locale.startswith("vi"):
        normalized_locale = "vi"
    else:
        normalized_locale = "en"

    sent_at = datetime.now(timezone.utc)
    idempotency_key = f"retention:{cadence}:{booking_reference}"

    _logger.info(
        "orchestrate_retention_touch_begin",
        extra={
            "event_type": "orchestrate_retention_touch_begin",
            "tenant_id": tenant_id,
            "booking_reference": booking_reference,
            "cadence": cadence,
            "channel": normalized_channel,
        },
    )

    # Step 1: outbox enqueue with idempotency guard.
    outbox_repository = OutboxRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    outbox_payload = {
        "booking_reference": booking_reference,
        "tenant_id": tenant_id,
        "cadence": cadence,
        "channel": normalized_channel,
        "customer_email": customer_email,
        "customer_name": customer_name,
        "locale": normalized_locale,
        "template_key": template_key,
        "sent_at": sent_at.isoformat(),
        "raw_provider_payload": raw_provider_payload or {},
    }
    outbox_event_id: int | None = None
    try:
        outbox_event_id = await outbox_repository.enqueue_event(
            tenant_id=tenant_id,
            event_type="retention.touch.dispatched",
            aggregate_type="booking_intent",
            aggregate_id=booking_reference,
            payload=outbox_payload,
            idempotency_key=idempotency_key,
        )
    except Exception as exc:  # noqa: BLE001
        # Most likely a UNIQUE-constraint hit — duplicate retention touch.
        _logger.info(
            "retention_touch_outbox_duplicate_or_failed",
            extra={
                "event_type": "retention_touch_outbox_duplicate_or_failed",
                "tenant_id": tenant_id,
                "booking_reference": booking_reference,
                "cadence": cadence,
                "idempotency_key": idempotency_key,
            },
            exc_info=exc,
        )
        return {
            "status": "already_sent",
            "cadence": cadence,
            "channel": normalized_channel,
            "booking_reference": booking_reference,
            "idempotency_key": idempotency_key,
            "outbox_event_id": None,
            "warnings": ["outbox_duplicate_or_failed"],
        }

    # Step 2: dispatch on preferred channel.
    email_result: dict[str, Any] = {"status": "skipped"}
    communication_result: dict[str, Any] = {"status": "skipped"}

    if normalized_channel == "email":
        if customer_email:
            try:
                email_outcome = await orchestrate_lifecycle_email(
                    session,
                    tenant_id=tenant_id,
                    template_key=template_key,
                    subject=f"BookedAI follow-up — {cadence}",
                    provider="outbox",
                    delivery_status="queued",
                    contact_id=None,
                    event_payload={
                        "template_key": template_key,
                        "locale": normalized_locale,
                        "recipient_email": customer_email,
                        "cadence": cadence,
                        "booking_reference": booking_reference,
                        "variables": {
                            "customer_name": customer_name,
                            "booking_reference": booking_reference,
                            "cadence": cadence,
                            "current_year": datetime.now().year,
                        },
                    },
                )
                email_result = {
                    "message_id": email_outcome.message_id,
                    "delivery_status": email_outcome.delivery_status,
                    "record_status": email_outcome.record_status,
                    "provider": email_outcome.provider,
                    "warnings": email_outcome.warning_codes,
                }
                if email_outcome.warning_codes:
                    warnings.extend(email_outcome.warning_codes)
            except Exception as exc:  # noqa: BLE001
                _logger.warning(
                    "retention_touch_email_failed",
                    extra={
                        "event_type": "retention_touch_email_failed",
                        "tenant_id": tenant_id,
                        "booking_reference": booking_reference,
                        "cadence": cadence,
                    },
                    exc_info=exc,
                )
                warnings.append("email_failed")
                email_result = {"status": "failed", "error": str(exc)}
        else:
            email_result = {"status": "skipped", "reason": "no_customer_email"}
            warnings.append("missing_customer_email")
    else:
        # telegram / whatsapp bot copy from the inline _RETENTION_BOT_COPY
        # table. Fall back to EN if the locale strings don't exist.
        copy_table = _RETENTION_BOT_COPY.get(cadence) or {}
        body = copy_table.get(normalized_locale) or copy_table.get("en") or (
            f"BookedAI follow-up: {cadence}"
        )
        try:
            comm = await orchestrate_communication_touch(
                session,
                tenant_id=tenant_id,
                channel=normalized_channel,
                to=customer_email or "",
                body=body,
                provider=f"{normalized_channel}_outbox",
                delivery_status="queued",
                actor_channel="retention_worker",
                template_key=template_key,
                metadata={
                    "booking_reference": booking_reference,
                    "cadence": cadence,
                    "locale": normalized_locale,
                },
            )
            communication_result = {
                "message_id": comm.message_id,
                "delivery_status": comm.delivery_status,
                "record_status": comm.record_status,
                "provider": comm.provider,
                "warnings": comm.warning_codes,
            }
            if comm.warning_codes:
                warnings.extend(comm.warning_codes)
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "retention_touch_communication_failed",
                extra={
                    "event_type": "retention_touch_communication_failed",
                    "tenant_id": tenant_id,
                    "booking_reference": booking_reference,
                    "cadence": cadence,
                    "channel": normalized_channel,
                },
                exc_info=exc,
            )
            warnings.append(f"{normalized_channel}_touch_failed")
            communication_result = {"status": "failed", "error": str(exc)}

    # Step 3: CRM sync record + best-effort Zoho follow-up task.
    crm_sync: dict[str, Any] = {}
    crm_repository = CrmSyncRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    crm_payload = {
        "booking_reference": booking_reference,
        "cadence": cadence,
        "channel": normalized_channel,
        "sent_at": sent_at.isoformat(),
        "customer_name": customer_name,
        "customer_email": customer_email,
        "locale": normalized_locale,
    }
    crm_sync_record_id: int | None = None
    try:
        crm_sync_record_id = await crm_repository.create_sync_record(
            tenant_id=tenant_id,
            entity_type="retention_touch",
            local_entity_id=booking_reference,
            provider="zoho_crm",
            sync_status="pending",
            payload_json=json.dumps(crm_payload),
        )
        crm_sync["record_id"] = crm_sync_record_id
        crm_sync["sync_status"] = "pending"
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "retention_touch_crm_seed_failed",
            extra={
                "event_type": "retention_touch_crm_seed_failed",
                "tenant_id": tenant_id,
                "booking_reference": booking_reference,
                "cadence": cadence,
            },
            exc_info=exc,
        )
        warnings.append("crm_seed_failed")
        crm_sync["sync_status"] = "failed"

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if crm_sync_record_id is not None and adapter.configured(settings):
        try:
            follow_up_record = LeadRecordContract(
                lead_id=booking_reference,
                full_name=customer_name,
                email=customer_email,
                phone=None,
                source="retention_touch",
                company_name="BookedAI Retention",
                tenant_id=tenant_id,
                lead_status="retention_followup",
                metadata={
                    **crm_payload,
                    "task_subject": f"Retention {cadence} - {customer_name or 'BookedAI customer'}",
                },
            )
            task_result = await adapter.create_follow_up_task(
                settings, lead=follow_up_record
            )
            external_entity_id = task_result.get("external_entity_id") or task_result.get(
                "id"
            )
            await crm_repository.update_sync_record_status(
                tenant_id=tenant_id,
                crm_sync_record_id=crm_sync_record_id,
                sync_status="synced",
                external_entity_id=str(external_entity_id) if external_entity_id else None,
                mark_synced=True,
            )
            crm_sync["sync_status"] = "synced"
            crm_sync["external_entity_id"] = (
                str(external_entity_id) if external_entity_id else None
            )
        except (ValueError, httpx.HTTPError) as exc:
            _logger.warning(
                "retention_touch_crm_push_failed",
                extra={
                    "event_type": "retention_touch_crm_push_failed",
                    "tenant_id": tenant_id,
                    "booking_reference": booking_reference,
                    "cadence": cadence,
                },
                exc_info=exc,
            )
            warnings.append("crm_push_failed")
            crm_sync["sync_status"] = "pending"
        except Exception as exc:  # noqa: BLE001
            # Skip silently on any other Zoho failure (per spec).
            _logger.info(
                "retention_touch_crm_push_skipped",
                extra={
                    "event_type": "retention_touch_crm_push_skipped",
                    "tenant_id": tenant_id,
                    "booking_reference": booking_reference,
                    "cadence": cadence,
                },
                exc_info=exc,
            )
            warnings.append("crm_push_skipped")
            crm_sync["sync_status"] = "pending"
    elif crm_sync_record_id is not None:
        crm_sync["sync_status"] = "pending"
        warnings.append("crm_provider_unconfigured")

    _logger.info(
        "orchestrate_retention_touch_complete",
        extra={
            "event_type": "orchestrate_retention_touch_complete",
            "tenant_id": tenant_id,
            "booking_reference": booking_reference,
            "cadence": cadence,
            "channel": normalized_channel,
            "outbox_event_id": outbox_event_id,
            "warnings": warnings,
        },
    )

    return {
        "status": "sent",
        "cadence": cadence,
        "channel": normalized_channel,
        "booking_reference": booking_reference,
        "tenant_id": tenant_id,
        "sent_at": sent_at.isoformat(),
        "idempotency_key": idempotency_key,
        "outbox_event_id": outbox_event_id,
        "email_result": email_result,
        "communication_result": communication_result,
        "crm_sync": crm_sync,
        "warnings": warnings,
    }


async def orchestrate_status_update(
    session,
    *,
    tenant_id: str,
    booking_reference: str,
    new_status: str,
    actor_type: str,
    actor_id: str | None = None,
    notes: str | None = None,
    raw_provider_payload: dict | None = None,
) -> dict[str, object]:
    """Orchestrate a booking status transition (completed / no_show /
    refunded / in_progress).

    Mirrors the defensive contract of :func:`orchestrate_booking_cancelled`:
    each external step is best-effort, partial failures are recorded as
    ``warnings``, and the outbox event is the source of truth for
    downstream retries (the feedback-request worker subscribes to
    ``booking.status.updated`` for ``completed`` rows).
    """
    warnings: list[str] = []

    if new_status not in {"completed", "no_show", "refunded", "in_progress"}:
        return {
            "status": "invalid_status",
            "requested": new_status,
            "booking_reference": booking_reference,
            "warnings": ["invalid_status"],
        }

    _logger.info(
        "orchestrate_status_update_begin",
        extra={
            "event_type": "orchestrate_status_update_begin",
            "tenant_id": tenant_id,
            "booking_reference": booking_reference,
            "new_status": new_status,
            "actor_type": actor_type,
        },
    )

    context = await _lookup_booking_lifecycle_context(
        session,
        tenant_id=tenant_id,
        booking_reference=booking_reference,
        booking_intent_id=None,
    )
    if not context:
        return {
            "status": "not_found",
            "booking_reference": booking_reference,
            "warnings": ["booking_not_found"],
        }

    resolved_tenant_id = (context.get("tenant_id") or tenant_id or "").strip()
    resolved_reference = (context.get("booking_reference") or booking_reference or "").strip()
    resolved_intent_id = (context.get("booking_intent_id") or "").strip()
    booking_metadata = (
        context.get("booking_metadata")
        if isinstance(context.get("booking_metadata"), dict)
        else {}
    )
    customer_email = (context.get("customer_email") or "").strip() or None
    customer_name = (context.get("customer_name") or "").strip() or None
    service_name = (context.get("service_name") or "").strip() or None
    contact_id = (context.get("contact_id") or "").strip() or None
    customer_locale = _extract_customer_locale(booking_metadata)
    updated_at = datetime.now(timezone.utc)

    stage_map = _STATUS_DEAL_STAGE_MAP[new_status]
    deal_stage = stage_map["deal_stage"]
    deal_reason = stage_map["reason"]

    idempotency_key = (
        f"{actor_type}:status_update:{new_status}:{resolved_reference}"
    )

    # Step 1: update booking row.
    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    try:
        await booking_repository.sync_callback_status(
            tenant_id=resolved_tenant_id,
            booking_reference=resolved_reference,
            status=new_status,
            metadata_updates={
                "status_updated_at": updated_at.isoformat(),
                "status_update_actor_type": actor_type,
                "status_update_actor_id": actor_id,
                "status_update_notes": (notes or "").strip() or None,
                "status_update_deal_stage": deal_stage,
                "status_update_deal_reason": deal_reason,
            },
        )
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "status_update_row_failed",
            extra={
                "event_type": "status_update_row_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
                "new_status": new_status,
            },
            exc_info=exc,
        )
        warnings.append("booking_status_update_failed")

    # Step 2: CRM sync record + best-effort Zoho deal upsert.
    crm_sync: dict[str, Any] = {}
    crm_repository = CrmSyncRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    crm_payload = {
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "service_name": service_name,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "new_status": new_status,
        "deal_stage": deal_stage,
        "reason": deal_reason,
        "notes": (notes or "").strip() or None,
        "updated_at": updated_at.isoformat(),
        "actor_type": actor_type,
    }
    crm_sync_record_id: int | None = None
    try:
        crm_sync_record_id = await crm_repository.create_sync_record(
            tenant_id=resolved_tenant_id,
            entity_type="deal_status_update",
            local_entity_id=resolved_reference,
            provider="zoho_crm",
            sync_status="pending",
            payload_json=json.dumps(crm_payload),
        )
        crm_sync["record_id"] = crm_sync_record_id
        crm_sync["sync_status"] = "pending"
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "status_update_crm_seed_failed",
            extra={
                "event_type": "status_update_crm_seed_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
                "new_status": new_status,
            },
            exc_info=exc,
        )
        warnings.append("crm_seed_failed")
        crm_sync["sync_status"] = "failed"

    settings = get_settings()
    adapter = ZohoCrmAdapter()
    if crm_sync_record_id is not None and adapter.configured(settings):
        try:
            status_record = LeadRecordContract(
                lead_id=resolved_intent_id or resolved_reference,
                full_name=customer_name,
                email=customer_email,
                phone=(context.get("customer_phone") or "").strip() or None,
                source="booking_status_update",
                company_name=service_name or "BookedAI Booking",
                tenant_id=resolved_tenant_id,
                lead_status=new_status,
                metadata={
                    **crm_payload,
                    "task_subject": f"Status update: {new_status} — {service_name or 'BookedAI Booking'}",
                },
            )
            upsert_result = await adapter.upsert_deal(settings, lead=status_record)
            external_entity_id = upsert_result.get("external_entity_id") or upsert_result.get(
                "id"
            )
            await crm_repository.update_sync_record_status(
                tenant_id=resolved_tenant_id,
                crm_sync_record_id=crm_sync_record_id,
                sync_status="synced",
                external_entity_id=str(external_entity_id) if external_entity_id else None,
                mark_synced=True,
            )
            crm_sync["sync_status"] = "synced"
            crm_sync["external_entity_id"] = (
                str(external_entity_id) if external_entity_id else None
            )
        except (ValueError, httpx.HTTPError) as exc:
            _logger.warning(
                "status_update_crm_push_failed",
                extra={
                    "event_type": "status_update_crm_push_failed",
                    "tenant_id": resolved_tenant_id,
                    "booking_reference": resolved_reference,
                    "new_status": new_status,
                },
                exc_info=exc,
            )
            warnings.append("crm_push_failed")
            crm_sync["sync_status"] = "pending"
    elif crm_sync_record_id is not None:
        crm_sync["sync_status"] = "pending"
        warnings.append("crm_provider_unconfigured")

    # Step 3: outbox event (idempotent on actor_type:status_update:status:ref).
    outbox_event_id: int | None = None
    outbox_repository = OutboxRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    outbox_payload = {
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "tenant_id": resolved_tenant_id,
        "service_name": service_name,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "new_status": new_status,
        "deal_stage": deal_stage,
        "reason": deal_reason,
        "notes": (notes or "").strip() or None,
        "actor_type": actor_type,
        "actor_id": actor_id,
        "updated_at": updated_at.isoformat(),
        "raw_provider_payload": raw_provider_payload or {},
    }
    try:
        outbox_event_id = await outbox_repository.enqueue_event(
            tenant_id=resolved_tenant_id,
            event_type="booking.status.updated",
            aggregate_type="booking_intent",
            aggregate_id=resolved_intent_id or resolved_reference,
            payload=outbox_payload,
            idempotency_key=idempotency_key,
        )
    except Exception as exc:  # noqa: BLE001
        # UNIQUE-constraint hit — duplicate status update.
        _logger.info(
            "status_update_outbox_duplicate_or_failed",
            extra={
                "event_type": "status_update_outbox_duplicate_or_failed",
                "tenant_id": resolved_tenant_id,
                "booking_reference": resolved_reference,
                "new_status": new_status,
                "idempotency_key": idempotency_key,
            },
            exc_info=exc,
        )
        return {
            "status": "already_updated",
            "booking_reference": resolved_reference,
            "new_status": new_status,
            "deal_stage": deal_stage,
            "outbox_event_id": None,
            "idempotency_key": idempotency_key,
            "crm_sync": crm_sync,
            "warnings": warnings + ["outbox_duplicate_or_failed"],
        }

    # Step 4: completion email (only on 'completed' — other statuses are
    # admin-only signals and stay silent).
    email_result: dict[str, Any] = {"status": "skipped"}
    if new_status == "completed":
        if customer_email:
            subject_label = service_name or "your BookedAI booking"
            try:
                email_outcome = await orchestrate_lifecycle_email(
                    session,
                    tenant_id=resolved_tenant_id,
                    template_key="aimentor_completion_thank_you",
                    subject=f"Thanks for completing {subject_label}",
                    provider="outbox",
                    delivery_status="queued",
                    contact_id=contact_id,
                    event_payload={
                        **outbox_payload,
                        "template_key": "aimentor_completion_thank_you",
                        "locale": customer_locale,
                        "recipient_email": customer_email,
                        "variables": {
                            "customer_name": customer_name,
                            "service_name": service_name,
                            "booking_reference": resolved_reference,
                            "completed_at": updated_at.isoformat(),
                            "current_year": datetime.now().year,
                        },
                    },
                )
                email_result = {
                    "message_id": email_outcome.message_id,
                    "delivery_status": email_outcome.delivery_status,
                    "record_status": email_outcome.record_status,
                    "provider": email_outcome.provider,
                    "warnings": email_outcome.warning_codes,
                }
                if email_outcome.warning_codes:
                    warnings.extend(email_outcome.warning_codes)
            except Exception as exc:  # noqa: BLE001
                _logger.warning(
                    "status_update_email_failed",
                    extra={
                        "event_type": "status_update_email_failed",
                        "tenant_id": resolved_tenant_id,
                        "booking_reference": resolved_reference,
                        "new_status": new_status,
                    },
                    exc_info=exc,
                )
                warnings.append("email_failed")
                email_result = {"status": "failed", "error": str(exc)}
        else:
            email_result = {"status": "skipped", "reason": "no_customer_email"}
            warnings.append("missing_customer_email")
    else:
        email_result = {"status": "skipped", "reason": "admin_only_signal"}

    _logger.info(
        "orchestrate_status_update_complete",
        extra={
            "event_type": "orchestrate_status_update_complete",
            "tenant_id": resolved_tenant_id,
            "booking_reference": resolved_reference,
            "new_status": new_status,
            "deal_stage": deal_stage,
            "outbox_event_id": outbox_event_id,
            "warnings": warnings,
        },
    )

    return {
        "status": "updated",
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_intent_id,
        "tenant_id": resolved_tenant_id,
        "new_status": new_status,
        "deal_stage": deal_stage,
        "reason": deal_reason,
        "updated_at": updated_at.isoformat(),
        "outbox_event_id": outbox_event_id,
        "idempotency_key": idempotency_key,
        "crm_sync": crm_sync,
        "email": email_result,
        "warnings": warnings,
    }
