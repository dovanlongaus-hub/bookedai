from __future__ import annotations

from fastapi import Request

from api.v1_routes import (
    ActorContextPayload,
    AppError,
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
        retry_result = await queue_crm_sync_retry(
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
            "warnings": retry_result.warning_codes,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )
