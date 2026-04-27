from __future__ import annotations

from fastapi import Request
from sqlalchemy import desc, select

from api.v1_routes import (
    AppError,
    CommunicationService,
    EmailService,
    IntegrationAppError,
    SendCommunicationMessageRequestPayload,
    SendLifecycleEmailRequestPayload,
    ValidationAppError,
    _error_response,
    _record_phase2_write_activity,
    _resolve_tenant_id,
    _success_response,
    get_session,
    httpx,
    orchestrate_communication_touch,
    orchestrate_email_sent_sync,
    orchestrate_lifecycle_email,
    render_bookedai_confirmation_email,
)
from db import MessagingChannelSession
from service_layer.communication_service import normalize_e164


def _normalize_phone_for_telegram_lookup(value: str) -> str:
    try:
        return normalize_e164(value)
    except ValueError:
        raise ValidationAppError(
            "Telegram follow-up requires an international-format phone number.",
            details={"to": ["phone number must be E.164, for example +61400000000"]},
        )


def _telegram_session_matches_phone(row: MessagingChannelSession, normalized_phone: str) -> bool:
    candidates: list[object] = []
    customer_identity = row.customer_identity_json if isinstance(row.customer_identity_json, dict) else {}
    metadata = row.metadata_json if isinstance(row.metadata_json, dict) else {}
    candidates.extend(
        [
            customer_identity.get("phone"),
            customer_identity.get("customer_phone"),
            customer_identity.get("sender_phone"),
            metadata.get("phone"),
            metadata.get("customer_phone"),
            metadata.get("sender_phone"),
        ]
    )
    for candidate in candidates:
        try:
            if normalize_e164(str(candidate or "")) == normalized_phone:
                return True
        except ValueError:
            continue
    return False


async def _find_telegram_chat_id_for_phone(session, normalized_phone: str) -> str | None:
    result = await session.execute(
        select(MessagingChannelSession)
        .where(MessagingChannelSession.channel == "telegram")
        .order_by(desc(MessagingChannelSession.updated_at))
        .limit(100)
    )
    rows = result.scalars().all()
    for row in rows:
        if _telegram_session_matches_phone(row, normalized_phone):
            return str(row.conversation_id or "").strip() or None
    return None


async def send_lifecycle_email(request: Request, payload: SendLifecycleEmailRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        if not payload.to:
            raise ValidationAppError(
                "Lifecycle email requires at least one recipient.",
                details={"to": ["at least one recipient is required"]},
            )

        email_service: EmailService = request.app.state.email_service
        rendered_email = None
        if payload.template_key == "bookedai_booking_confirmation":
            rendered_email = render_bookedai_confirmation_email(
                variables=payload.variables,
                public_app_url=request.app.state.settings.public_app_url,
            )
        subject = payload.subject or (
            rendered_email.subject if rendered_email else f"Bookedai.au lifecycle: {payload.template_key}"
        )
        if rendered_email:
            body = rendered_email.text
            html = rendered_email.html
        else:
            body_lines = [f"{key}: {value}" for key, value in sorted(payload.variables.items())]
            body = "\n".join(body_lines) if body_lines else f"Template {payload.template_key} triggered."
            html = None
        delivery_status = "queued"
        warnings: list[str] = []

        smtp_configured = email_service.smtp_configured()
        if smtp_configured:
            await email_service.send_email(
                to=payload.to,
                cc=payload.cc,
                subject=subject,
                text=body,
                html=html,
            )
            delivery_status = "sent"
        else:
            warnings.append("SMTP is not fully configured; lifecycle email was recorded but not delivered.")

        async with get_session(request.app.state.session_factory) as session:
            email_result = await orchestrate_lifecycle_email(
                session,
                tenant_id=tenant_id,
                template_key=payload.template_key,
                subject=subject,
                provider="smtp" if smtp_configured else "unconfigured",
                delivery_status=delivery_status,
                event_payload={
                    "template_key": payload.template_key,
                    "recipient_count": len(payload.to),
                    "cc_count": len(payload.cc),
                },
            )
            email_crm_sync_result = await orchestrate_email_sent_sync(
                session,
                tenant_id=tenant_id,
                message_id=email_result.message_id,
                template_key=payload.template_key,
                subject=subject,
                recipient_email=payload.to[0] if payload.to else None,
                provider="smtp" if smtp_configured else "unconfigured",
                delivery_status=delivery_status,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="email.lifecycle_recorded",
                entity_type="email_message",
                entity_id=email_result.message_id,
                audit_payload={
                    "template_key": payload.template_key,
                    "delivery_status": email_result.delivery_status,
                    "provider": email_result.provider,
                    "recipient_count": len(payload.to),
                    "crm_task_sync_status": email_crm_sync_result.task_sync_status,
                },
                outbox_event_type="email.lifecycle.dispatch_recorded",
                outbox_payload={
                    "message_id": email_result.message_id,
                    "template_key": payload.template_key,
                    "delivery_status": email_result.delivery_status,
                    "provider": email_result.provider,
                    "crm_task_record_id": email_crm_sync_result.task_record_id,
                },
                idempotency_key=f"email-message:{email_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": email_result.message_id,
                "delivery_status": email_result.delivery_status,
                "provider_message_id": None,
                "warnings": warnings + email_crm_sync_result.warning_codes,
                "crm_sync": {
                    "task": {
                        "record_id": email_crm_sync_result.task_record_id,
                        "sync_status": email_crm_sync_result.task_sync_status,
                        "external_entity_id": email_crm_sync_result.task_external_entity_id,
                    }
                },
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def send_sms_message(request: Request, payload: SendCommunicationMessageRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        communication_service: CommunicationService = request.app.state.communication_service
        result = await communication_service.send_sms(
            to=payload.to,
            body=payload.body,
            template_key=payload.template_key,
            variables=payload.variables,
        )

        async with get_session(request.app.state.session_factory) as session:
            message_result = await orchestrate_communication_touch(
                session,
                tenant_id=tenant_id or "",
                channel="sms",
                to=payload.to,
                body=communication_service.render_template(
                    template_key=payload.template_key,
                    variables=payload.variables,
                    fallback_body=payload.body,
                ),
                provider=result.provider,
                delivery_status=result.delivery_status,
                actor_channel=payload.actor_context.channel,
                template_key=payload.template_key,
                metadata=payload.context,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="sms.message_recorded",
                entity_type="communication_message",
                entity_id=message_result.message_id,
                audit_payload={
                    "channel": "sms",
                    "to": payload.to,
                    "template_key": payload.template_key,
                    "delivery_status": message_result.delivery_status,
                    "provider": message_result.provider,
                },
                outbox_event_type="sms.message.dispatch_recorded",
                outbox_payload={
                    "message_id": message_result.message_id,
                    "channel": "sms",
                    "provider": message_result.provider,
                    "delivery_status": message_result.delivery_status,
                },
                idempotency_key=f"sms-message:{message_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": message_result.message_id,
                "delivery_status": message_result.delivery_status,
                "provider": message_result.provider,
                "provider_message_id": result.provider_message_id,
                "warnings": result.warnings or message_result.warning_codes,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except ValueError as error:
        return _error_response(
            ValidationAppError(str(error), details={"to": ["invalid or missing phone number"]}),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except httpx.HTTPError as error:
        return _error_response(
            IntegrationAppError(
                "SMS provider request failed.",
                provider="sms",
                details={"provider_error": str(error)},
            ),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )


async def send_whatsapp_message(request: Request, payload: SendCommunicationMessageRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        communication_service: CommunicationService = request.app.state.communication_service
        result = await communication_service.send_whatsapp(
            to=payload.to,
            body=payload.body,
            template_key=payload.template_key,
            variables=payload.variables,
        )

        async with get_session(request.app.state.session_factory) as session:
            message_result = await orchestrate_communication_touch(
                session,
                tenant_id=tenant_id or "",
                channel="whatsapp",
                to=payload.to,
                body=communication_service.render_template(
                    template_key=payload.template_key,
                    variables=payload.variables,
                    fallback_body=payload.body,
                ),
                provider=result.provider,
                delivery_status=result.delivery_status,
                actor_channel=payload.actor_context.channel,
                template_key=payload.template_key,
                metadata=payload.context,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="whatsapp.message_recorded",
                entity_type="communication_message",
                entity_id=message_result.message_id,
                audit_payload={
                    "channel": "whatsapp",
                    "to": payload.to,
                    "template_key": payload.template_key,
                    "delivery_status": message_result.delivery_status,
                    "provider": message_result.provider,
                },
                outbox_event_type="whatsapp.message.dispatch_recorded",
                outbox_payload={
                    "message_id": message_result.message_id,
                    "channel": "whatsapp",
                    "provider": message_result.provider,
                    "delivery_status": message_result.delivery_status,
                },
                idempotency_key=f"whatsapp-message:{message_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": message_result.message_id,
                "delivery_status": message_result.delivery_status,
                "provider": message_result.provider,
                "provider_message_id": result.provider_message_id,
                "warnings": result.warnings or message_result.warning_codes,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except ValueError as error:
        return _error_response(
            ValidationAppError(str(error), details={"to": ["invalid or missing phone number"]}),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except httpx.HTTPError as error:
        return _error_response(
            IntegrationAppError(
                "WhatsApp provider request failed.",
                provider="whatsapp",
                details={"provider_error": str(error)},
            ),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )


async def send_telegram_message_by_phone(request: Request, payload: SendCommunicationMessageRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        normalized_phone = _normalize_phone_for_telegram_lookup(payload.to)
        communication_service: CommunicationService = request.app.state.communication_service
        rendered_body = communication_service.render_template(
            template_key=payload.template_key,
            variables=payload.variables,
            fallback_body=payload.body,
        )
        warnings: list[str] = []
        provider = "telegram_bot"
        delivery_status = "queued"
        provider_message_id = None
        chat_id = None

        async with get_session(request.app.state.session_factory) as session:
            chat_id = await _find_telegram_chat_id_for_phone(session, normalized_phone)
            if chat_id:
                result = await communication_service.send_telegram(
                    chat_id=chat_id,
                    body=rendered_body,
                )
                provider = result.provider
                delivery_status = result.delivery_status
                provider_message_id = result.provider_message_id
                warnings.extend(result.warnings or [])
            else:
                warnings.append(
                    "customer_telegram_chat_not_linked: Telegram can only message customers who have opened BookedAI Manager Bot or shared a matching phone in Telegram."
                )

            message_result = await orchestrate_communication_touch(
                session,
                tenant_id=tenant_id or "",
                channel="telegram",
                to=chat_id or normalized_phone,
                body=rendered_body,
                provider=provider,
                delivery_status=delivery_status,
                actor_channel=payload.actor_context.channel,
                template_key=payload.template_key,
                metadata={
                    **(payload.context or {}),
                    "customer_phone": normalized_phone,
                    "telegram_chat_id": chat_id,
                    "delivery_lookup": "phone_to_linked_telegram_chat",
                },
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="telegram.message_recorded",
                entity_type="communication_message",
                entity_id=message_result.message_id,
                audit_payload={
                    "channel": "telegram",
                    "to": chat_id or normalized_phone,
                    "template_key": payload.template_key,
                    "delivery_status": message_result.delivery_status,
                    "provider": message_result.provider,
                    "linked_chat": bool(chat_id),
                },
                outbox_event_type="telegram.message.dispatch_recorded",
                outbox_payload={
                    "message_id": message_result.message_id,
                    "channel": "telegram",
                    "provider": message_result.provider,
                    "delivery_status": message_result.delivery_status,
                    "linked_chat": bool(chat_id),
                },
                idempotency_key=f"telegram-message:{message_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": message_result.message_id,
                "delivery_status": message_result.delivery_status,
                "provider": message_result.provider,
                "provider_message_id": provider_message_id,
                "warnings": warnings or message_result.warning_codes,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)
    except ValueError as error:
        return _error_response(
            ValidationAppError(str(error), details={"to": ["invalid or missing phone number"]}),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
