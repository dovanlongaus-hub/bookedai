from __future__ import annotations

import httpx
import time
from datetime import UTC, datetime, timedelta
from uuid import uuid4
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.v1_routes import (
    ActorContextPayload,
    AppError,
    IntegrationAppError,
    AuditLogRepository,
    CommunicationService,
    DispatchOutboxRequestPayload,
    OutboxRepository,
    ReplayOutboxEventRequestPayload,
    RepositoryContext,
    RetryCrmSyncRequestPayload,
    _error_response,
    _resolve_tenant_id,
    _success_response,
    build_attention_triage_snapshot,
    build_crm_retry_backlog,
    build_integration_attention_items,
    build_integration_provider_statuses,
    build_outbox_backlog,
    build_recent_runtime_activity,
    build_reconciliation_details,
    build_reconciliation_summary,
    dispatch_phase2_outbox_event,
    get_session,
    queue_crm_sync_retry,
    run_tracked_outbox_dispatch,
)
from repositories.crm_repository import CrmSyncRepository
from repositories.webhook_repository import WebhookEventRepository
from integrations.zoho_crm.adapter import ZohoCrmAdapter
from workers.contracts import JobContext, JobResult
from workers.scheduler import run_tracked_job
from service_layer.lifecycle_ops_service import (
    orchestrate_call_scheduled_sync,
    execute_crm_sync_retry,
    orchestrate_contact_sync,
    orchestrate_lead_qualification_sync,
)


class ContactSyncRequestPayload(BaseModel):
    contact_id: str
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    actor_context: ActorContextPayload | None = None


class LeadQualificationSyncRequestPayload(BaseModel):
    lead_id: str
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    company_name: str | None = None
    deal_name: str | None = None
    notes: str | None = None
    estimated_value_aud: float | None = None
    actor_context: ActorContextPayload | None = None


class CallScheduledSyncRequestPayload(BaseModel):
    lead_id: str
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    service_name: str | None = None
    scheduled_for: str | None = None
    owner_name: str | None = None
    note: str | None = None
    external_contact_id: str | None = None
    external_deal_id: str | None = None
    actor_context: ActorContextPayload | None = None


class DealOutcomeFeedbackRequestPayload(BaseModel):
    external_deal_id: str
    local_entity_id: str | None = None
    outcome: str
    stage: str | None = None
    owner_name: str | None = None
    source_label: str | None = None
    amount_aud: float | None = None
    closed_at: str | None = None
    lost_reason: str | None = None
    task_completed: bool | None = None
    task_completed_at: str | None = None
    stage_changed_at: str | None = None
    actor_context: ActorContextPayload | None = None


class ZohoDealFeedbackPollRequestPayload(BaseModel):
    external_deal_ids: list[str]
    actor_context: ActorContextPayload | None = None


class ZohoDealWebhookTriggerPayload(BaseModel):
    module: str
    ids: list[str]
    operation: str | None = None
    channel_id: str | None = None
    token: str | None = None
    resource_uri: str | None = None
    server_time: int | None = None
    affected_fields: list[object] | None = None
    query_params: dict[str, object] | None = None


class ZohoWebhookRegistrationRequestPayload(BaseModel):
    module_api_name: str | None = None
    channel_id: str | None = None
    token: str | None = None
    notify_url: str | None = None
    events: list[str] | None = None
    return_affected_field_values: bool = True
    actor_context: ActorContextPayload | None = None


class ZohoWebhookUpdateRequestPayload(BaseModel):
    channel_id: str | None = None
    token: str | None = None
    notify_url: str | None = None
    events: list[str] | None = None
    channel_expiry: str | None = None
    return_affected_field_values: bool = True
    actor_context: ActorContextPayload | None = None


class ZohoWebhookDisableRequestPayload(BaseModel):
    channel_ids: list[str] | None = None
    actor_context: ActorContextPayload | None = None


class ZohoWebhookAutoRenewRequestPayload(BaseModel):
    channel_id: str | None = None
    module_api_name: str | None = None
    threshold_hours: int = 24
    actor_context: ActorContextPayload | None = None


async def integration_provider_statuses(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        items = await build_integration_provider_statuses(session, tenant_id=tenant_id or "")
    communication_service: CommunicationService = request.app.state.communication_service
    items.extend(
        [
            {
                "provider": communication_service.sms_adapter.provider_name,
                "status": "connected" if communication_service.sms_configured() else "unconfigured",
                "sync_mode": "write_back",
                "safe_config": communication_service.sms_safe_summary(),
                "updated_at": None,
            },
            {
                "provider": communication_service.whatsapp_adapter.provider_name,
                "status": "connected" if communication_service.whatsapp_configured() else "unconfigured",
                "sync_mode": "bidirectional",
                "safe_config": communication_service.whatsapp_safe_summary(),
                "updated_at": None,
            },
        ]
    )
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def integration_reconciliation_summary(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        summary = await build_reconciliation_summary(session, tenant_id=tenant_id or "")
    return _success_response(
        summary,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def integration_attention(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        items = await build_integration_attention_items(session, tenant_id=tenant_id or "")
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def integration_attention_triage(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        snapshot = await build_attention_triage_snapshot(session, tenant_id=tenant_id or "")
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def integration_crm_sync_backlog(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        backlog = await build_crm_retry_backlog(session, tenant_id=tenant_id or "")
    return _success_response(
        backlog,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def crm_sync_status(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    entity_type = str(request.query_params.get("entity_type") or "").strip().lower()
    local_entity_id = str(request.query_params.get("local_entity_id") or "").strip()
    provider = str(request.query_params.get("provider") or "zoho_crm").strip().lower() or "zoho_crm"

    if not entity_type or not local_entity_id:
        return _error_response(
            AppError(
                code="crm_sync_status_query_invalid",
                message="Both entity_type and local_entity_id are required to load CRM sync status.",
                status_code=400,
                details={
                    "entity_type": entity_type or None,
                    "local_entity_id": local_entity_id or None,
                    "provider": provider,
                },
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    async with get_session(request.app.state.session_factory) as session:
        repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        record = await repository.get_latest_sync_record_for_entity(
            tenant_id=tenant_id or "",
            entity_type=entity_type,
            local_entity_id=local_entity_id,
            provider=provider,
        )

    return _success_response(
        {
            "provider": provider,
            "entity_type": entity_type,
            "local_entity_id": local_entity_id,
            "record": record,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def crm_deal_outcome_summary(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        summary = await repository.get_deal_feedback_summary(tenant_id=tenant_id or "")

    return _success_response(
        summary,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def ingest_crm_deal_outcome_feedback(request: Request, payload: DealOutcomeFeedbackRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="zoho_crm",
        role="integration_feedback",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    normalized_outcome = str(payload.outcome or "").strip().lower()
    if normalized_outcome not in {"won", "lost"}:
        return _error_response(
            AppError(
                code="crm_deal_outcome_invalid",
                message="Deal outcome feedback must be either won or lost.",
                status_code=400,
                details={"outcome": payload.outcome},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    local_entity_id = str(payload.local_entity_id or payload.external_deal_id or "").strip()
    if not tenant_id or not local_entity_id:
        return _error_response(
            AppError(
                code="crm_deal_outcome_context_missing",
                message="Tenant context and a deal identifier are required for CRM deal outcome feedback.",
                status_code=400,
                details={
                    "tenant_id": tenant_id,
                    "local_entity_id": payload.local_entity_id,
                    "external_deal_id": payload.external_deal_id,
                },
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    async with get_session(request.app.state.session_factory) as session:
        repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        record_id = await repository.create_sync_record(
            tenant_id=tenant_id,
            entity_type="deal_feedback",
            local_entity_id=local_entity_id,
            provider="zoho_crm",
            sync_status="pending",
            payload_json=httpx._content.json_dumps(
                {
                    "outcome": normalized_outcome,
                    "stage": payload.stage,
                    "owner_name": payload.owner_name,
                    "source_label": payload.source_label,
                    "amount_aud": payload.amount_aud,
                    "closed_at": payload.closed_at,
                    "lost_reason": payload.lost_reason,
                    "task_completed": payload.task_completed,
                    "task_completed_at": payload.task_completed_at,
                    "stage_changed_at": payload.stage_changed_at,
                    "external_deal_id": payload.external_deal_id,
                }
            ),
        )
        if record_id is not None:
            await repository.update_sync_record_status(
                tenant_id=tenant_id,
                crm_sync_record_id=record_id,
                sync_status="synced",
                external_entity_id=payload.external_deal_id,
                mark_synced=True,
            )
        await session.commit()

    return _success_response(
        {
            "crm_sync_record_id": record_id,
            "sync_status": "synced",
            "external_entity_id": payload.external_deal_id,
            "outcome": normalized_outcome,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


def _normalize_zoho_deal_outcome(stage: str | None) -> str | None:
    normalized = str(stage or "").strip().lower()
    if normalized in {"closed won", "won"}:
        return "won"
    if normalized in {"closed lost", "lost"}:
        return "lost"
    return None


def _extract_zoho_owner_name(payload: dict[str, object]) -> str | None:
    owner = payload.get("Owner")
    if isinstance(owner, dict):
        owner_name = str(owner.get("name") or "").strip()
        if owner_name:
            return owner_name
    return None


def _extract_zoho_lost_reason(payload: dict[str, object]) -> str | None:
    for key in ("Reason_For_Loss", "Reason_Lost", "Loss_Reason"):
        value = str(payload.get(key) or "").strip()
        if value:
            return value
    return None


async def poll_zoho_deal_feedback(request: Request, payload: ZohoDealFeedbackPollRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_feedback",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_context_required",
                message="Tenant context is required for Zoho CRM deal feedback polling.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    external_deal_ids = [str(item).strip() for item in payload.external_deal_ids if str(item).strip()]
    if not external_deal_ids:
        return _error_response(
            AppError(
                code="crm_feedback_poll_invalid",
                message="At least one Zoho external deal id is required for polling.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    adapter = ZohoCrmAdapter()
    settings = request.app.state.settings
    if not adapter.configured(settings):
        return _error_response(
            AppError(
                code="zoho_crm_not_configured",
                message="Zoho CRM is not configured yet. Add OAuth credentials before polling deal feedback.",
                status_code=409,
                details={
                    "provider": "zoho_crm",
                    "safe_config": adapter.safe_summary_payload(settings),
                },
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    ingested_items: list[dict[str, object]] = []
    skipped_items: list[dict[str, object]] = []
    async with get_session(request.app.state.session_factory) as session:
        repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        for external_deal_id in external_deal_ids:
            try:
                result = await adapter.fetch_deal_by_id(settings, external_deal_id=external_deal_id)
            except ValueError as error:
                skipped_items.append(
                    {
                        "external_deal_id": external_deal_id,
                        "status": "skipped_invalid_response",
                        "detail": str(error),
                    }
                )
                continue
            except httpx.HTTPStatusError as error:
                skipped_items.append(
                    {
                        "external_deal_id": external_deal_id,
                        "status": "skipped_provider_error",
                        "detail": error.response.text[:200] if error.response is not None else str(error),
                    }
                )
                continue

            deal_payload = result.get("deal")
            if not isinstance(deal_payload, dict):
                skipped_items.append(
                    {
                        "external_deal_id": external_deal_id,
                        "status": "skipped_invalid_payload",
                    }
                )
                continue

            stage = str(deal_payload.get("Stage") or "").strip() or None
            outcome = _normalize_zoho_deal_outcome(stage)
            if outcome is None:
                skipped_items.append(
                    {
                        "external_deal_id": external_deal_id,
                        "status": "skipped_non_terminal",
                        "stage": stage,
                    }
                )
                continue

            record_id = await repository.create_sync_record(
                tenant_id=tenant_id,
                entity_type="deal_feedback",
                local_entity_id=external_deal_id,
                provider="zoho_crm",
                sync_status="pending",
                payload_json=httpx._content.json_dumps(
                    {
                        "outcome": outcome,
                        "stage": stage,
                        "owner_name": _extract_zoho_owner_name(deal_payload),
                        "source_label": str(
                            deal_payload.get("Lead_Source")
                            or deal_payload.get("Source")
                            or deal_payload.get("BookedAI_Source")
                            or ""
                        ).strip()
                        or None,
                        "amount_aud": deal_payload.get("Amount"),
                        "closed_at": deal_payload.get("Closing_Date"),
                        "lost_reason": _extract_zoho_lost_reason(deal_payload),
                        "task_completed": bool(
                            str(deal_payload.get("Task_Completed") or "").strip().lower() in {"true", "1", "yes"}
                        ),
                        "task_completed_at": deal_payload.get("Task_Completed_At"),
                        "stage_changed_at": deal_payload.get("Modified_Time") or deal_payload.get("Stage_Changed_At"),
                        "external_deal_id": external_deal_id,
                        "deal_name": deal_payload.get("Deal_Name"),
                    }
                ),
            )
            if record_id is not None:
                await repository.update_sync_record_status(
                    tenant_id=tenant_id,
                    crm_sync_record_id=record_id,
                    sync_status="synced",
                    external_entity_id=external_deal_id,
                    mark_synced=True,
                )
            ingested_items.append(
                {
                    "external_deal_id": external_deal_id,
                    "crm_sync_record_id": record_id,
                    "sync_status": "synced",
                    "outcome": outcome,
                    "stage": stage,
                    "owner_name": _extract_zoho_owner_name(deal_payload),
                }
            )

        await session.commit()

    return _success_response(
        {
            "polled_count": len(external_deal_ids),
            "ingested_count": len(ingested_items),
            "skipped_count": len(skipped_items),
            "items": ingested_items,
            "skipped": skipped_items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def zoho_deal_feedback_webhook(request: Request, payload: ZohoDealWebhookTriggerPayload):
    actor_context = ActorContextPayload(
        channel="zoho_crm",
        role="integration_feedback",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_context_required",
                message="Tenant context is required for Zoho CRM webhook feedback ingestion.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    settings = request.app.state.settings
    expected_token = str(getattr(settings, "zoho_crm_notification_token", "") or "").strip()
    expected_channel_id = str(getattr(settings, "zoho_crm_notification_channel_id", "") or "").strip()
    payload_token = str(payload.token or "").strip()
    payload_channel_id = str(payload.channel_id or "").strip()

    if expected_token and payload_token != expected_token:
        return _error_response(
            AppError(
                code="zoho_crm_webhook_token_invalid",
                message="Zoho CRM webhook token verification failed.",
                status_code=403,
                details={"channel_id": payload_channel_id or None},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    if expected_channel_id and payload_channel_id != expected_channel_id:
        return _error_response(
            AppError(
                code="zoho_crm_webhook_channel_invalid",
                message="Zoho CRM webhook channel verification failed.",
                status_code=403,
                details={"channel_id": payload_channel_id or None},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    module_name = str(payload.module or "").strip()
    if module_name.lower() != "deals":
        return _success_response(
            {
                "webhook_status": "ignored",
                "reason": "unsupported_module",
                "module": module_name or None,
                "ids": payload.ids,
            },
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    external_deal_ids = [str(item).strip() for item in payload.ids if str(item).strip()]
    if not external_deal_ids:
        return _error_response(
            AppError(
                code="zoho_crm_webhook_ids_missing",
                message="Zoho CRM webhook payload must include at least one Deal id.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    payload_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    async with get_session(request.app.state.session_factory) as session:
        webhook_repository = WebhookEventRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        external_event_id = ":".join(
            [
                "zoho_crm",
                payload_channel_id or "default",
                str(payload.operation or "unknown").strip() or "unknown",
                ",".join(external_deal_ids),
            ]
        )
        webhook_event_id = await webhook_repository.record_event(
            provider="zoho_crm",
            external_event_id=external_event_id,
            payload=payload_dict,
            tenant_id=tenant_id,
        )
        await session.commit()

    poll_payload = ZohoDealFeedbackPollRequestPayload(
        external_deal_ids=external_deal_ids,
        actor_context=actor_context,
    )
    poll_response = await poll_zoho_deal_feedback(request, poll_payload)
    body = getattr(poll_response, "body", b"")
    if webhook_event_id is not None:
        async with get_session(request.app.state.session_factory) as session:
            webhook_repository = WebhookEventRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            await webhook_repository.mark_processed(webhook_event_id)
            await session.commit()

    if not body:
        return poll_response

    enriched_payload = httpx._content.json_loads(body)
    if isinstance(enriched_payload, dict) and isinstance(enriched_payload.get("data"), dict):
        enriched_payload["data"]["webhook_event_id"] = webhook_event_id
        enriched_payload["data"]["module"] = module_name
        enriched_payload["data"]["operation"] = payload.operation
    return JSONResponse(content=enriched_payload)


async def register_zoho_deal_feedback_webhook(
    request: Request,
    payload: ZohoWebhookRegistrationRequestPayload,
):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    settings = request.app.state.settings
    adapter = ZohoCrmAdapter()

    if not adapter.configured(settings):
        return _error_response(
            AppError(
                code="zoho_crm_not_configured",
                message="Zoho CRM is not configured yet. Add OAuth credentials before registering notification channels.",
                status_code=409,
                details={
                    "provider": "zoho_crm",
                    "safe_config": adapter.safe_summary_payload(settings),
                },
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    module_api_name = str(payload.module_api_name or settings.zoho_crm_default_deal_module or "Deals").strip() or "Deals"
    default_notify_url = f"{settings.public_api_url.rstrip('/')}/api/v1/integrations/crm-feedback/zoho-webhook"
    channel_id = (
        str(payload.channel_id or "").strip()
        or str(getattr(settings, "zoho_crm_notification_channel_id", "") or "").strip()
        or str(int(time.time() * 1000))
    )
    token = (
        str(payload.token or "").strip()
        or str(getattr(settings, "zoho_crm_notification_token", "") or "").strip()
        or f"bai.{module_api_name.lower()}.{channel_id}"[:50]
    )
    notify_url = str(payload.notify_url or "").strip() or default_notify_url
    events = payload.events or [f"{module_api_name}.all"]

    try:
        result = await adapter.enable_notifications(
            settings,
            channel_id=channel_id,
            token=token,
            notify_url=notify_url,
            events=events,
            return_affected_field_values=payload.return_affected_field_values,
        )
    except ValueError as error:
        return _error_response(
            AppError(
                code="zoho_crm_notification_registration_invalid",
                message=str(error),
                status_code=422,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )
    except httpx.HTTPStatusError as error:
        return _error_response(
            IntegrationAppError(
                "Zoho CRM rejected the notification registration request.",
                provider="zoho_crm",
                status_code=error.response.status_code if error.response is not None else 502,
                details={
                    "status_code": error.response.status_code if error.response is not None else 502,
                    "response_excerpt": error.response.text[:500] if error.response is not None else None,
                    "notify_url": notify_url,
                    "channel_id": channel_id,
                    "token": token,
                    "events": events,
                },
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    env_matches = (
        str(getattr(settings, "zoho_crm_notification_channel_id", "") or "").strip() == channel_id
        and str(getattr(settings, "zoho_crm_notification_token", "") or "").strip() == token
    )
    return _success_response(
        {
            **result,
            "module_api_name": module_api_name,
            "verification_env_matches": env_matches,
            "recommended_env": {
                "ZOHO_CRM_NOTIFICATION_CHANNEL_ID": channel_id,
                "ZOHO_CRM_NOTIFICATION_TOKEN": token,
            },
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def list_zoho_deal_feedback_webhook(request: Request):
    actor_context = ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    settings = request.app.state.settings
    adapter = ZohoCrmAdapter()

    if not adapter.configured(settings):
        return _error_response(
            AppError(
                code="zoho_crm_not_configured",
                message="Zoho CRM is not configured yet. Add OAuth credentials before listing notification channels.",
                status_code=409,
                details={"provider": "zoho_crm", "safe_config": adapter.safe_summary_payload(settings)},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    channel_id = str(request.query_params.get("channel_id") or getattr(settings, "zoho_crm_notification_channel_id", "") or "").strip()
    if not channel_id:
        return _error_response(
            AppError(
                code="zoho_crm_notification_channel_required",
                message="A channel_id is required to list Zoho CRM notification details.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    module_api_name = str(request.query_params.get("module") or "Deals").strip() or "Deals"
    try:
        result = await adapter.get_notification_details(
            settings,
            channel_id=channel_id,
            module_api_name=module_api_name,
        )
    except httpx.HTTPStatusError as error:
        return _error_response(
            IntegrationAppError(
                "Zoho CRM rejected the notification details request.",
                provider="zoho_crm",
                status_code=error.response.status_code if error.response is not None else 502,
                details={"response_excerpt": error.response.text[:500] if error.response is not None else None},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    return _success_response(result, tenant_id=tenant_id, actor_context=actor_context)


async def update_zoho_deal_feedback_webhook(
    request: Request,
    payload: ZohoWebhookUpdateRequestPayload,
):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    settings = request.app.state.settings
    adapter = ZohoCrmAdapter()

    if not adapter.configured(settings):
        return _error_response(
            AppError(
                code="zoho_crm_not_configured",
                message="Zoho CRM is not configured yet. Add OAuth credentials before updating notification channels.",
                status_code=409,
                details={"provider": "zoho_crm", "safe_config": adapter.safe_summary_payload(settings)},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    channel_id = str(payload.channel_id or getattr(settings, "zoho_crm_notification_channel_id", "") or "").strip()
    token = str(payload.token or getattr(settings, "zoho_crm_notification_token", "") or "").strip()
    notify_url = str(payload.notify_url or f"{settings.public_api_url.rstrip('/')}/api/v1/integrations/crm-feedback/zoho-webhook").strip()
    events = payload.events or [f"{settings.zoho_crm_default_deal_module or 'Deals'}.all"]
    if not channel_id or not token:
        return _error_response(
            AppError(
                code="zoho_crm_notification_update_invalid",
                message="Both channel_id and token are required to update a Zoho CRM notification channel.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    try:
        result = await adapter.update_notification_details(
            settings,
            channel_id=channel_id,
            token=token,
            notify_url=notify_url,
            events=events,
            channel_expiry=payload.channel_expiry,
            return_affected_field_values=payload.return_affected_field_values,
        )
    except httpx.HTTPStatusError as error:
        return _error_response(
            IntegrationAppError(
                "Zoho CRM rejected the notification update request.",
                provider="zoho_crm",
                status_code=error.response.status_code if error.response is not None else 502,
                details={"response_excerpt": error.response.text[:500] if error.response is not None else None},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    return _success_response(result, tenant_id=tenant_id, actor_context=actor_context)


async def disable_zoho_deal_feedback_webhook(
    request: Request,
    payload: ZohoWebhookDisableRequestPayload,
):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    settings = request.app.state.settings
    adapter = ZohoCrmAdapter()

    if not adapter.configured(settings):
        return _error_response(
            AppError(
                code="zoho_crm_not_configured",
                message="Zoho CRM is not configured yet. Add OAuth credentials before disabling notification channels.",
                status_code=409,
                details={"provider": "zoho_crm", "safe_config": adapter.safe_summary_payload(settings)},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    channel_ids = payload.channel_ids or [str(getattr(settings, "zoho_crm_notification_channel_id", "") or "").strip()]
    channel_ids = [item for item in channel_ids if item]
    if not channel_ids:
        return _error_response(
            AppError(
                code="zoho_crm_notification_channel_required",
                message="At least one channel_id is required to disable Zoho CRM notifications.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    try:
        result = await adapter.disable_notifications(settings, channel_ids=channel_ids)
    except httpx.HTTPStatusError as error:
        return _error_response(
            IntegrationAppError(
                "Zoho CRM rejected the notification disable request.",
                provider="zoho_crm",
                status_code=error.response.status_code if error.response is not None else 502,
                details={"response_excerpt": error.response.text[:500] if error.response is not None else None},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    return _success_response(result, tenant_id=tenant_id, actor_context=actor_context)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    normalized = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


async def auto_renew_zoho_deal_feedback_webhook(
    request: Request,
    payload: ZohoWebhookAutoRenewRequestPayload,
):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    settings = request.app.state.settings
    adapter = ZohoCrmAdapter()

    if not adapter.configured(settings):
        return _error_response(
            AppError(
                code="zoho_crm_not_configured",
                message="Zoho CRM is not configured yet. Add OAuth credentials before running notification auto-renew.",
                status_code=409,
                details={"provider": "zoho_crm", "safe_config": adapter.safe_summary_payload(settings)},
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    channel_id = str(payload.channel_id or getattr(settings, "zoho_crm_notification_channel_id", "") or "").strip()
    module_api_name = str(payload.module_api_name or settings.zoho_crm_default_deal_module or "Deals").strip() or "Deals"
    threshold_hours = max(1, min(int(payload.threshold_hours or 24), 168))
    token = str(getattr(settings, "zoho_crm_notification_token", "") or "").strip()
    notify_url = f"{settings.public_api_url.rstrip('/')}/api/v1/integrations/crm-feedback/zoho-webhook"
    events = [f"{module_api_name}.all"]

    if not channel_id or not token:
        return _error_response(
            AppError(
                code="zoho_crm_notification_auto_renew_invalid",
                message="Both ZOHO_CRM_NOTIFICATION_CHANNEL_ID and ZOHO_CRM_NOTIFICATION_TOKEN must be configured before auto-renew can run.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    async def _handler(_context: JobContext) -> JobResult:
        details = await adapter.get_notification_details(
            settings,
            channel_id=channel_id,
            module_api_name=module_api_name,
        )
        items = details.get("items") if isinstance(details, dict) else []
        first_item = items[0] if isinstance(items, list) and items else {}
        channel_expiry = _parse_iso_datetime(first_item.get("channel_expiry") if isinstance(first_item, dict) else None)
        now = datetime.now(UTC)
        threshold_at = now + timedelta(hours=threshold_hours)

        if channel_expiry and channel_expiry > threshold_at:
            return JobResult(
                status="completed",
                detail="Zoho notification channel is still healthy; no renewal needed.",
                metadata={
                    "channel_id": channel_id,
                    "channel_expiry": channel_expiry.isoformat(),
                    "renewed": False,
                    "threshold_hours": threshold_hours,
                },
            )

        new_expiry = (now + timedelta(days=6, hours=23)).replace(microsecond=0).isoformat()
        renewed = await adapter.update_notification_details(
            settings,
            channel_id=channel_id,
            token=token,
            notify_url=notify_url,
            events=events,
            channel_expiry=new_expiry,
            return_affected_field_values=True,
        )
        return JobResult(
            status="completed",
            detail="Zoho notification channel renewed successfully.",
            metadata={
                "channel_id": channel_id,
                "previous_channel_expiry": channel_expiry.isoformat() if channel_expiry else None,
                "new_channel_expiry": new_expiry,
                "renewed": True,
                "module_api_name": module_api_name,
                "provider_status": renewed.get("status") if isinstance(renewed, dict) else None,
            },
        )

    async with get_session(request.app.state.session_factory) as session:
        tracked = await run_tracked_job(
            session,
            context=JobContext(
                job_id=f"zoho-webhook-renew-{uuid4()}",
                job_name="zoho_crm_notification_auto_renew",
                tenant_id=tenant_id,
            ),
            handler=_handler,
            detail="Zoho CRM notification auto-renew check",
        )
        await session.commit()

    return _success_response(
        {
            "job_run_id": tracked.job_run_id,
            "job_status": tracked.result.status,
            "detail": tracked.result.detail,
            "metadata": tracked.result.metadata,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def integration_reconciliation_details(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        details = await build_reconciliation_details(session, tenant_id=tenant_id or "")
    return _success_response(
        details,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def integration_runtime_activity(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        activity = await build_recent_runtime_activity(session, tenant_id=tenant_id or "")
    return _success_response(
        activity,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def integration_outbox_dispatched_audit(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        items = await repository.list_recent_entries(
            tenant_id=tenant_id,
            limit=12,
            event_type="outbox.event.dispatched",
        )
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def integration_outbox_backlog(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        backlog = await build_outbox_backlog(session, tenant_id=tenant_id or "")
    return _success_response(
        backlog,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def sync_crm_lead_qualification(request: Request, payload: LeadQualificationSyncRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_context_required",
                message="Tenant context is required for lead qualification CRM sync.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            result = await orchestrate_lead_qualification_sync(
                session,
                tenant_id=tenant_id,
                lead_id=payload.lead_id,
                full_name=payload.full_name,
                email=payload.email,
                phone=payload.phone,
                source=payload.source,
                company_name=payload.company_name,
                deal_name=payload.deal_name,
                notes=payload.notes,
                estimated_value_aud=payload.estimated_value_aud,
            )
            await session.commit()
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=actor_context)

    return _success_response(
        {
            "lead": {
                "sync_status": result.lead_sync_status,
                "crm_sync_record_id": result.lead_record_id,
                "external_entity_id": result.lead_external_entity_id,
            },
            "contact": {
                "sync_status": result.contact_sync_status,
                "crm_sync_record_id": result.contact_record_id,
                "external_entity_id": result.contact_external_entity_id,
            },
            "deal": {
                "sync_status": result.deal_sync_status,
                "crm_sync_record_id": result.deal_record_id,
                "external_entity_id": result.deal_external_entity_id,
            },
            "warnings": result.warning_codes,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def sync_crm_call_scheduled(request: Request, payload: CallScheduledSyncRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_context_required",
                message="Tenant context is required for call scheduled CRM sync.",
                status_code=400,
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            result = await orchestrate_call_scheduled_sync(
                session,
                tenant_id=tenant_id,
                lead_id=payload.lead_id,
                full_name=payload.full_name,
                email=payload.email,
                phone=payload.phone,
                source=payload.source,
                service_name=payload.service_name,
                scheduled_for=payload.scheduled_for,
                owner_name=payload.owner_name,
                note=payload.note,
                external_contact_id=payload.external_contact_id,
                external_deal_id=payload.external_deal_id,
            )
            await session.commit()
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=actor_context)

    return _success_response(
        {
            "sync_status": result.task_sync_status,
            "crm_sync_record_id": result.task_record_id,
            "external_entity_id": result.task_external_entity_id,
            "warnings": result.warning_codes,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def dispatch_outbox_events(request: Request, payload: DispatchOutboxRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    dispatch_limit = max(1, min(payload.limit, 25))

    async with get_session(request.app.state.session_factory) as session:
        tracked_result = await run_tracked_outbox_dispatch(
            session,
            dispatcher=lambda event: dispatch_phase2_outbox_event(session, event),
            tenant_id=tenant_id,
            limit=dispatch_limit,
        )
        await session.commit()

    return _success_response(
        {
            "job_run_id": tracked_result.job_run_id,
            "dispatch_status": tracked_result.result.status,
            "detail": tracked_result.result.detail,
            "retryable": tracked_result.result.retryable,
            "metadata": tracked_result.result.metadata,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def replay_outbox_event(request: Request, payload: ReplayOutboxEventRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_recovery",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)

    async with get_session(request.app.state.session_factory) as session:
        outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        replayed_event = await outbox_repository.requeue_event(
            payload.outbox_event_id,
            tenant_id=tenant_id,
        )
        if not replayed_event:
            return _error_response(
                AppError(
                    code="outbox_event_not_found",
                    message="The requested outbox event could not be replayed.",
                    status_code=404,
                    details={"outbox_event_id": payload.outbox_event_id},
                ),
                tenant_id=tenant_id,
                actor_context=actor_context,
            )

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="outbox.event.requeued",
            entity_type=replayed_event.get("aggregate_type") or "outbox_event",
            entity_id=replayed_event.get("aggregate_id"),
            actor_type=actor_context.channel,
            actor_id=actor_context.actor_id,
            payload={
                "outbox_event_id": replayed_event.get("id"),
                "outbox_event_type": replayed_event.get("event_type"),
                "aggregate_type": replayed_event.get("aggregate_type"),
                "aggregate_id": replayed_event.get("aggregate_id"),
                "idempotency_key": replayed_event.get("idempotency_key"),
            },
        )
        await session.commit()

    return _success_response(
        {
            "outbox_event_id": replayed_event.get("id"),
            "status": replayed_event.get("status"),
            "available_at": replayed_event.get("available_at"),
            "warnings": [
                "Replay only re-queues the event. Run outbox dispatch again to attempt delivery."
            ],
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def retry_crm_sync(request: Request, payload: RetryCrmSyncRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_retry",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        retry_result = await execute_crm_sync_retry(
            session,
            tenant_id=tenant_id or "",
            crm_sync_record_id=payload.crm_sync_record_id,
            reason="api_v1_retry_request",
        )
        await session.commit()
    return _success_response(
        {
            "crm_sync_record_id": retry_result.record_id,
            "sync_status": retry_result.sync_status,
            "external_entity_id": retry_result.external_entity_id,
            "warnings": retry_result.warning_codes,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def sync_crm_contact(request: Request, payload: ContactSyncRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        sync_result = await orchestrate_contact_sync(
            session,
            tenant_id=tenant_id or "",
            contact_id=payload.contact_id,
            full_name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
        )
        await session.commit()
    return _success_response(
        {
            "contact_id": payload.contact_id,
            "crm_sync_record_id": sync_result.record_id,
            "sync_status": sync_result.sync_status,
            "external_entity_id": sync_result.external_entity_id,
            "warnings": sync_result.warning_codes,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def zoho_crm_connection_test(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    adapter = ZohoCrmAdapter()
    settings = request.app.state.settings
    requested_module = (
        str(request.query_params.get("module") or request.query_params.get("module_api_name") or "").strip()
        or None
    )

    if not adapter.configured(settings):
        return _error_response(
            AppError(
                code="zoho_crm_not_configured",
                message="Zoho CRM is not configured yet. Add either a direct access token or refresh-token OAuth credentials before testing the connection.",
                status_code=409,
                details={
                    "provider": "zoho_crm",
                    "required": [
                        "ZOHO_CRM_ACCESS_TOKEN",
                        "or ZOHO_CRM_REFRESH_TOKEN + ZOHO_CRM_CLIENT_ID + ZOHO_CRM_CLIENT_SECRET",
                    ],
                    "safe_config": adapter.safe_summary_payload(settings),
                },
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    try:
        result = await adapter.test_connection(settings, module_api_name=requested_module)
    except ValueError as error:
        return _error_response(
            AppError(
                code="zoho_crm_configuration_error",
                message=str(error),
                status_code=422,
                details={
                    "provider": "zoho_crm",
                    "requested_module": requested_module,
                    "safe_config": adapter.safe_summary_payload(settings),
                },
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )
    except httpx.HTTPStatusError as error:
        response_text = error.response.text[:500] if error.response is not None else None
        return _error_response(
            IntegrationAppError(
                "Zoho CRM rejected the connection test.",
                provider="zoho_crm",
                status_code=error.response.status_code if error.response is not None else 502,
                details={
                    "requested_module": requested_module,
                    "status_code": error.response.status_code if error.response is not None else 502,
                    "response_excerpt": response_text,
                    "safe_config": adapter.safe_summary_payload(settings),
                },
            ),
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    return _success_response(
        result,
        tenant_id=tenant_id,
        actor_context=actor_context,
        message="Zoho CRM connection test completed.",
    )
