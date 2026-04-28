from __future__ import annotations

from dataclasses import dataclass, field
from html import escape
import json
import re
import unicodedata
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode, urlparse
from uuid import uuid4

from sqlalchemy import desc, func, or_, select

from core.customer_booking_contact import DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL
from db import ConversationEvent, MessagingChannelSession, ServiceMerchantProfile
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.contact_repository import ContactRepository
from repositories.lead_repository import LeadRepository
from repositories.tenant_repository import TenantRepository
from schemas import TawkMessage
from service_layer.calls_scheduling import build_qr_code_url
from service_layer.communication_service import CommunicationService
from service_layer.tenant_app_service import (
    build_portal_customer_care_turn,
    infer_portal_request_type_from_message,
    queue_portal_booking_request,
    resolve_customer_care_booking_reference,
)


EMAIL_RE = re.compile(r"[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(\+\d[\d\s().-]{7,}\d)")
BOOK_OPTION_RE = re.compile(r"\b(?:book|booking|reserve|chon|chọn|dat|đặt)\s*(?:option\s*)?([1-9])\b", re.I)
DATE_RE = re.compile(r"\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b")
TIME_RE = re.compile(r"\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b", re.I)

CUSTOMER_AGENT_CANONICAL_NAME = "BookedAI Manager Bot"
CUSTOMER_AGENT_INTERNAL_ID = "bookedai_manager_bot"
BOOKEDAI_CUSTOMER_PROJECT_NAME = "BookedAI.au"
BOOKEDAI_PUBLIC_URL = "https://bookedai.au"
BOOKEDAI_PORTAL_URL = "https://portal.bookedai.au"
CUSTOMER_AGENT_PLATFORM_NAMES = {
    "telegram": {
        "display_name": "BookedAI Manager Bot",
        "preferred_username": "BookedAI_Manager_Bot",
        "fallback_usernames": [
            "BookedAIServiceBot",
            "BookedAIBookingBot",
            "BookedAIHelpBot",
        ],
    },
    "whatsapp": {
        "display_name": "BookedAI Manager Bot",
        "profile_name": "BookedAI Manager Bot",
    },
    "sms": {
        "sender_label": "BookedAI",
    },
    "email": {
        "from_name": "BookedAI Manager Bot",
    },
}


@dataclass(frozen=True)
class MessagingAutomationPolicy:
    """Policy for the shared customer messaging agent."""

    conversation_window_days: int = 60
    max_history_turns: int = 6
    max_service_options: int = 3
    public_web_search_enabled: bool = True
    supported_request_types: set[str] = field(
        default_factory=lambda: {"cancel_request", "reschedule_request"}
    )


@dataclass(frozen=True)
class MessagingAutomationResult:
    ai_reply: str | None
    ai_intent: str
    workflow_status: str
    metadata: dict[str, object]


class MessagingAutomationService:
    """Shared Messaging Automation Layer for WhatsApp, Telegram, SMS, email, and future channels."""

    def __init__(
        self,
        *,
        policy: MessagingAutomationPolicy | None = None,
        public_search_service: object | None = None,
    ) -> None:
        self.policy = policy or MessagingAutomationPolicy()
        self.public_search_service = public_search_service

    async def handle_customer_message(
        self,
        session,
        *,
        channel: str,
        message: TawkMessage,
        metadata: dict[str, object],
    ) -> MessagingAutomationResult:
        normalized_channel = self._normalize_channel(channel)
        conversation_key = self._conversation_key(message=message, metadata=metadata)
        customer_phone = self._customer_phone(message=message, metadata=metadata)
        customer_email = self._customer_email(message=message, metadata=metadata)
        identity_metadata = self._customer_identity_metadata(
            channel=normalized_channel,
            customer_email=customer_email,
            customer_phone=customer_phone,
        )

        locale = self._resolve_locale(metadata.get("telegram_language_code"))

        if (
            normalized_channel == "telegram"
            and str(metadata.get("start_command_kind") or "") == "welcome"
        ):
            return self._build_welcome_result(
                channel=normalized_channel,
                message=message,
                identity_metadata=identity_metadata,
                locale=locale,
            )

        channel_state = await self._load_channel_session_state(
            session,
            channel=normalized_channel,
            conversation_id=conversation_key,
        )
        tenant_ref = str(metadata.get("tenant_ref") or "").strip() or None

        slash_intent, slash_args = self._parse_slash_command(message.text)
        cancel_intent_locked = False

        if slash_intent == "help":
            return self._build_welcome_result(
                channel=normalized_channel,
                message=message,
                identity_metadata=identity_metadata,
                locale=locale,
            )
        if slash_intent == "search":
            if slash_args:
                message.text = slash_args
            else:
                return self._build_search_prompt_result(
                    channel=normalized_channel,
                    message=message,
                    identity_metadata=identity_metadata,
                    locale=locale,
                )
        elif slash_intent == "mybookings":
            if slash_args:
                message.text = slash_args
            else:
                return self._build_my_bookings_prompt_result(
                    channel=normalized_channel,
                    message=message,
                    identity_metadata=identity_metadata,
                    locale=locale,
                )
        elif slash_intent == "cancel":
            if slash_args:
                message.text = slash_args
                cancel_intent_locked = True
            else:
                await self._mark_cancel_intent_pending(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=tenant_ref,
                    customer_identity=identity_metadata,
                    existing_state=channel_state,
                )
                return self._build_cancel_prompt_result(
                    channel=normalized_channel,
                    message=message,
                    identity_metadata=identity_metadata,
                    locale=locale,
                )
        elif slash_intent == "support":
            return self._build_support_handoff_result(
                channel=normalized_channel,
                message=message,
                identity_metadata=identity_metadata,
                locale=locale,
            )

        if slash_intent is None:
            keyboard_intent = self._reply_keyboard_intent(message.text)
            if keyboard_intent == "search":
                return self._build_search_prompt_result(
                    channel=normalized_channel,
                    message=message,
                    identity_metadata=identity_metadata,
                    locale=locale,
                )
            if keyboard_intent == "mybookings":
                return self._build_my_bookings_prompt_result(
                    channel=normalized_channel,
                    message=message,
                    identity_metadata=identity_metadata,
                    locale=locale,
                )
            if keyboard_intent == "support":
                return self._build_support_handoff_result(
                    channel=normalized_channel,
                    message=message,
                    identity_metadata=identity_metadata,
                    locale=locale,
                )

        picker = self._parse_reschedule_picker_callback(message.text)
        if picker is not None:
            step, picker_booking_ref, picker_date, picker_time = picker
            if step == "date":
                return self._build_reschedule_date_picker_result(
                    channel=normalized_channel,
                    booking_reference=picker_booking_ref,
                    identity_metadata=identity_metadata,
                    locale=locale,
                )
            if step == "time":
                return self._build_reschedule_time_picker_result(
                    channel=normalized_channel,
                    booking_reference=picker_booking_ref,
                    selected_date=picker_date,
                    identity_metadata=identity_metadata,
                    locale=locale,
                )
            if step == "confirm":
                return await self._handle_reschedule_confirm(
                    session,
                    channel=normalized_channel,
                    booking_reference=picker_booking_ref,
                    selected_date=picker_date,
                    selected_time=picker_time,
                    identity_metadata=identity_metadata,
                    locale=locale,
                    customer_phone=customer_phone,
                    customer_email=customer_email,
                )

        if not cancel_intent_locked and self._is_cancel_intent_active(
            channel_state.get("session_metadata") if isinstance(channel_state, dict) else None
        ):
            cancel_intent_locked = True

        history = await self._load_conversation_history(
            session,
            channel=normalized_channel,
            conversation_id=conversation_key,
        )
        prior_booking_reference = self._latest_booking_reference(history)
        prior_service_query = self._latest_service_query(history) or str(
            channel_state.get("service_search_query") or ""
        ).strip() or None

        resolution = await resolve_customer_care_booking_reference(
            session,
            message=message.text,
            customer_phone=customer_phone,
            customer_email=customer_email,
        )
        booking_reference = str(
            resolution.get("booking_reference") or prior_booking_reference or ""
        ).strip()

        if not booking_reference:
            booking_selection = self._parse_booking_selection(message.text)
            if booking_selection:
                prior_options = self._latest_service_options(history) or [
                    item
                    for item in channel_state.get("service_options", [])
                    if isinstance(item, dict)
                ]
                selected_option = self._service_option_by_index(prior_options, booking_selection)
                if selected_option:
                    booking_result = await self._try_create_chat_booking_intent(
                        session,
                        channel=normalized_channel,
                        message=message,
                        metadata=metadata,
                        selected_option=selected_option,
                    )
                    if booking_result:
                        return booking_result
                    return MessagingAutomationResult(
                        ai_reply=(
                            f"I can book option {booking_selection}, but I still need a name and either "
                            "an email or phone number. Reply like: Book "
                            f"{booking_selection} for Alex Nguyen alex@example.com tomorrow 4pm."
                        ),
                        ai_intent="booking_details_needed",
                        workflow_status="answered",
                        metadata={
                            "messaging_layer": self._layer_metadata(normalized_channel),
                            "customer_identity": identity_metadata,
                            "customer_care_status": "booking_details_needed",
                            "selected_option": selected_option,
                            "booking_resolution": resolution,
                        },
                    )

            effective_query = self._effective_search_query(
                message.text,
                prior_service_query=prior_service_query,
            )
            public_web_requested = self._is_public_web_expansion_request(message.text)
            service_search = await self._search_service_options(
                session,
                query=effective_query,
                tenant_ref=str(metadata.get("tenant_ref") or "").strip() or None,
            )
            public_web_options: list[dict[str, object]] = []
            if self.policy.public_web_search_enabled and (
                public_web_requested or not service_search
            ):
                public_web_options = await self._search_public_web_options(
                    query=effective_query,
                    location_hint=str(metadata.get("user_locality") or "").strip() or None,
                    user_location=metadata.get("user_location") if isinstance(metadata.get("user_location"), dict) else None,
                )
            combined_search = self._merge_service_options(service_search, public_web_options)
            if combined_search:
                chat_response = self._build_bookedai_chat_response(
                    query=effective_query,
                    options=combined_search,
                    public_web_requested=public_web_requested,
                )
                reply_controls = self._service_search_reply_controls(
                    query=effective_query,
                    include_public_web_button=not public_web_requested,
                    options=combined_search,
                )
                await self._upsert_channel_session_state(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=str(metadata.get("tenant_ref") or "").strip() or None,
                    customer_identity=identity_metadata,
                    service_search_query=effective_query,
                    service_options=combined_search,
                    reply_controls=reply_controls,
                    last_ai_intent="service_search",
                    last_workflow_status="answered",
                    metadata={
                        "source": "service_search",
                        "bookedai_chat_response": chat_response,
                    },
                )
                return MessagingAutomationResult(
                    ai_reply=self._build_service_search_reply(
                        query=effective_query,
                        options=combined_search,
                        public_web_requested=public_web_requested,
                    ),
                    ai_intent="service_search",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(normalized_channel),
                        "customer_identity": identity_metadata,
                        "customer_care_status": "service_search",
                        "service_search_query": effective_query,
                        "service_options": combined_search,
                        "bookedai_chat_response": chat_response,
                        "reply_controls": reply_controls,
                        "booking_resolution": resolution,
                    },
                )

            if self._is_booking_care_intent(message.text):
                return MessagingAutomationResult(
                    ai_reply=(
                        "I can help with booking status, payment, rescheduling, or cancellation. "
                        "Please reply with your booking reference, or the email/phone used for the booking, "
                        "so I can look up only your booking."
                    ),
                    ai_intent="needs_booking_reference",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(normalized_channel),
                        "customer_identity": identity_metadata,
                        "customer_care_status": "needs_booking_reference",
                        "booking_resolution": resolution,
                        "reply_controls": self._needs_booking_reference_reply_controls(locale),
                    },
                )

            if self._is_booking_intake_intent(message.text):
                return MessagingAutomationResult(
                    ai_reply=self._build_booking_intake_reply(channel=normalized_channel, message=message),
                    ai_intent="booking_intake",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(normalized_channel),
                        "customer_identity": identity_metadata,
                        "customer_care_status": "booking_intake",
                        "booking_resolution": resolution,
                        "booking_intake": {
                            "source": normalized_channel,
                            "requested_service_text": message.text,
                            "sender_phone": customer_phone,
                        },
                    },
                )
            if resolution.get("resolved_by") == "ambiguous_customer_identity":
                return MessagingAutomationResult(
                    ai_reply=(
                        "I found more than one recent booking for this contact. "
                        "Please reply with the booking reference so I can answer against the correct booking."
                    ),
                    ai_intent="needs_booking_reference",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(normalized_channel),
                        "customer_identity": identity_metadata,
                        "customer_care_status": "needs_booking_reference",
                        "booking_resolution": resolution,
                        "reply_controls": self._needs_booking_reference_reply_controls(locale),
                    },
                )
            return MessagingAutomationResult(
                ai_reply=(
                    "I can help with booking status, payment, rescheduling, or cancellation. "
                    "Please reply with your booking reference, or the email/phone used for the booking, "
                    "so I can look up only your booking."
                ),
                ai_intent="needs_booking_reference",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(normalized_channel),
                    "customer_identity": identity_metadata,
                    "customer_care_status": "needs_booking_reference",
                    "booking_resolution": resolution,
                    "reply_controls": self._needs_booking_reference_reply_controls(locale),
                    },
                )

        if (
            booking_reference
            and self._is_existing_booking_alternative_search_intent(message.text)
            and not self._is_existing_booking_search_override(message.text)
        ):
            effective_query = self._effective_search_query(
                message.text,
                prior_service_query=prior_service_query,
            )
            reply_controls = self._existing_booking_search_reply_controls(
                booking_reference=booking_reference,
                query=effective_query,
            )
            await self._upsert_channel_session_state(
                session,
                channel=normalized_channel,
                conversation_id=conversation_key,
                tenant_id=str(metadata.get("tenant_ref") or "").strip() or None,
                customer_identity=identity_metadata,
                service_search_query=effective_query,
                service_options=[],
                reply_controls=reply_controls,
                last_ai_intent="existing_booking_search_confirmation",
                last_workflow_status="answered",
                metadata={
                    "source": "existing_booking_search_confirmation",
                    "booking_reference": booking_reference,
                    "portal_url": self._portal_booking_url(booking_reference),
                    "qr_code_url": self._portal_qr_url(booking_reference),
                },
            )
            return MessagingAutomationResult(
                ai_reply=self._build_existing_booking_search_confirmation_reply(
                    booking_reference=booking_reference,
                    query=effective_query,
                ),
                ai_intent="existing_booking_search_confirmation",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(normalized_channel),
                    "customer_identity": identity_metadata,
                    "customer_care_status": "existing_booking_search_confirmation",
                    "booking_reference": booking_reference,
                    "booking_resolution": resolution,
                    "service_search_query": effective_query,
                    "portal_url": self._portal_booking_url(booking_reference),
                    "qr_code_url": self._portal_qr_url(booking_reference),
                    "reply_controls": reply_controls,
                },
            )

        if booking_reference and self._is_existing_booking_search_override(message.text):
            effective_query = self._effective_search_query(
                message.text,
                prior_service_query=prior_service_query,
            )
            public_web_requested = self._is_public_web_expansion_request(message.text)
            service_search = await self._search_service_options(
                session,
                query=effective_query,
                tenant_ref=str(metadata.get("tenant_ref") or "").strip() or None,
            )
            public_web_options: list[dict[str, object]] = []
            if self.policy.public_web_search_enabled and (
                public_web_requested or not service_search
            ):
                public_web_options = await self._search_public_web_options(
                    query=effective_query,
                    location_hint=str(metadata.get("user_locality") or "").strip() or None,
                    user_location=metadata.get("user_location") if isinstance(metadata.get("user_location"), dict) else None,
                )
            combined_search = self._merge_service_options(service_search, public_web_options)
            if combined_search:
                chat_response = self._build_bookedai_chat_response(
                    query=effective_query,
                    options=combined_search,
                    public_web_requested=public_web_requested,
                )
                reply_controls = self._with_current_booking_return_controls(
                    self._service_search_reply_controls(
                        query=effective_query,
                        include_public_web_button=not public_web_requested,
                        options=combined_search,
                    ),
                    booking_reference=booking_reference,
                )
                await self._upsert_channel_session_state(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=str(metadata.get("tenant_ref") or "").strip() or None,
                    customer_identity=identity_metadata,
                    service_search_query=effective_query,
                    service_options=combined_search,
                    reply_controls=reply_controls,
                    last_ai_intent="service_search",
                    last_workflow_status="answered",
                    metadata={
                        "source": "service_search",
                        "active_booking_reference": booking_reference,
                        "bookedai_chat_response": chat_response,
                    },
                )
                return MessagingAutomationResult(
                    ai_reply=(
                        self._build_service_search_reply(
                            query=effective_query,
                            options=combined_search,
                            public_web_requested=public_web_requested,
                        )
                        + "\n\n"
                        + f"Current order stays available in {BOOKEDAI_CUSTOMER_PROJECT_NAME}: "
                        + self._portal_booking_url(booking_reference)
                    ),
                    ai_intent="service_search",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(normalized_channel),
                        "customer_identity": identity_metadata,
                        "customer_care_status": "service_search",
                        "active_booking_reference": booking_reference,
                        "service_search_query": effective_query,
                        "service_options": combined_search,
                        "bookedai_chat_response": chat_response,
                        "reply_controls": reply_controls,
                        "booking_resolution": resolution,
                    },
                )

        care_turn = await build_portal_customer_care_turn(
            session,
            booking_reference=booking_reference,
            message=message.text,
            customer_email=customer_email,
            customer_phone=customer_phone,
        )
        if not care_turn:
            return MessagingAutomationResult(
                ai_reply=(
                    f"I could not open booking {booking_reference}. "
                    f"Please check the reference or contact {DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL}."
                ),
                ai_intent="booking_not_found",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(normalized_channel),
                    "customer_identity": identity_metadata,
                    "customer_care_status": "booking_not_found",
                    "booking_reference": booking_reference,
                    "booking_resolution": resolution,
                    "reply_controls": self._needs_booking_reference_reply_controls(locale),
                },
            )

        if cancel_intent_locked:
            cancel_action_enabled = any(
                isinstance(action, dict)
                and str(action.get("id") or "") == "request_cancel"
                and bool(action.get("enabled"))
                for action in care_turn.get("next_actions", [])
            )
            if cancel_action_enabled:
                await self._clear_cancel_intent_pending(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=tenant_ref,
                    customer_identity=identity_metadata,
                    existing_state=channel_state,
                )
                return self._build_cancel_confirm_result(
                    channel=normalized_channel,
                    booking_reference=booking_reference,
                    identity_metadata=identity_metadata,
                    booking_resolution=resolution,
                    locale=locale,
                )

        reply = str(care_turn.get("reply") or "").strip()
        queued_request: dict[str, object] | None = None
        request_type = infer_portal_request_type_from_message(message.text)
        if request_type in self.policy.supported_request_types:
            enabled_action_id = (
                "request_cancel" if request_type == "cancel_request" else "request_reschedule"
            )
            action_enabled = any(
                isinstance(action, dict)
                and str(action.get("id") or "") == enabled_action_id
                and bool(action.get("enabled"))
                for action in care_turn.get("next_actions", [])
            )
            if action_enabled:
                queued_request = await queue_portal_booking_request(
                    session,
                    booking_reference=booking_reference,
                    request_type=request_type,
                    customer_note=message.text,
                    preferred_date=None,
                    preferred_time=None,
                    timezone=None,
                )
                if queued_request:
                    reply = f"{reply} {queued_request.get('message')}".strip()

        return MessagingAutomationResult(
            ai_reply=reply,
            ai_intent="answered",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(normalized_channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "answered",
                "booking_reference": booking_reference,
                "booking_resolution": resolution,
                "care_turn": care_turn,
                "queued_request": queued_request,
                "reply_controls": self._booking_care_reply_controls(booking_reference),
            },
        )

    async def send_reply(
        self,
        communication_service: CommunicationService,
        *,
        channel: str,
        recipient: str | None,
        body: str | None,
        reply_markup: dict[str, object] | None = None,
        parse_mode: str | None = None,
    ) -> dict[str, object] | None:
        if not recipient or not body:
            return None
        normalized_channel = self._normalize_channel(channel)
        if normalized_channel == "telegram":
            result = await communication_service.send_telegram(
                chat_id=recipient,
                body=body,
                reply_markup=reply_markup,
                parse_mode=parse_mode,
            )
        elif normalized_channel == "whatsapp":
            result = await communication_service.send_whatsapp(to=recipient, body=body)
        else:
            return {
                "provider": normalized_channel,
                "delivery_status": "queued",
                "warnings": [f"Reply delivery for {normalized_channel} is not configured yet."],
            }
        return {
            "provider": result.provider,
            "delivery_status": result.delivery_status,
            "provider_message_id": result.provider_message_id,
            "warnings": result.warnings or [],
        }

    async def send_tenant_booking_notification(
        self,
        session,
        communication_service: CommunicationService,
        *,
        tenant_id: str | None,
        booking_reference: str,
        service_name: str,
        customer_name: str,
        requested_date: str,
        requested_time: str,
        timezone: str,
        portal_url: str,
        tenant_email: str | None = None,
    ) -> dict[str, object]:
        normalized_tenant_id = str(tenant_id or "").strip()
        if not normalized_tenant_id:
            return {
                "provider": "tenant_messaging",
                "delivery_status": "skipped",
                "warnings": ["tenant_id_missing"],
            }

        tenant_repository = TenantRepository(RepositoryContext(session=session))
        profile = await tenant_repository.get_tenant_profile(normalized_tenant_id) or {}
        settings = await tenant_repository.get_tenant_settings(normalized_tenant_id)
        targets = self._tenant_notification_targets(settings)
        tenant_slug = str(profile.get("slug") or "").strip()
        tenant_name = str(profile.get("name") or tenant_slug or "Tenant workspace").strip()
        tenant_workspace_url = (
            f"https://tenant.bookedai.au/{tenant_slug}" if tenant_slug else "https://tenant.bookedai.au"
        )
        email_line = (
            f"\nEmail notice: {tenant_email} was CC'd on the BookedAI internal booking email."
            if tenant_email
            else ""
        )
        body = (
            f"New BookedAI booking for {tenant_name}\n"
            f"Service: {service_name}\n"
            f"Customer: {customer_name}\n"
            f"Slot: {requested_date} {requested_time} {timezone}\n"
            f"Reference: {booking_reference}\n"
            f"Portal: {portal_url}\n"
            f"Tenant workspace: {tenant_workspace_url}"
            f"{email_line}\n\n"
            "You can sign in to your tenant workspace to review details, then reply in this channel "
            "if you need BookedAI to help with follow-up."
        )

        telegram_targets = targets.get("telegram", [])
        if telegram_targets:
            deliveries = []
            for chat_id in telegram_targets:
                deliveries.append(
                    await self.send_reply(
                        communication_service,
                        channel="telegram",
                        recipient=chat_id,
                        body=body,
                        reply_markup={
                            "inline_keyboard": [
                                [{"text": "Open tenant workspace", "url": tenant_workspace_url}],
                                [{"text": "Open booking portal", "url": portal_url}],
                            ]
                        },
                    )
                )
            return {
                "provider": "telegram_bot",
                "delivery_status": (
                    "sent"
                    if any((item or {}).get("delivery_status") == "sent" for item in deliveries)
                    else "queued"
                ),
                "channel": "telegram",
                "targets": len(telegram_targets),
                "deliveries": deliveries,
                "warnings": [
                    warning
                    for item in deliveries
                    for warning in ((item or {}).get("warnings") or [])
                ],
            }

        return {
            "provider": "telegram_bot",
            "delivery_status": "queued",
            "channel": "telegram",
            "targets": 0,
            "warnings": ["tenant_telegram_chat_id_not_configured"],
        }

    async def _load_conversation_history(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
    ) -> list[dict[str, object]]:
        if not conversation_id:
            return []
        cutoff = datetime.now(UTC) - timedelta(days=self.policy.conversation_window_days)
        result = await session.execute(
            select(ConversationEvent)
            .where(ConversationEvent.source == channel)
            .where(ConversationEvent.conversation_id == conversation_id)
            .where(ConversationEvent.created_at >= cutoff)
            .order_by(desc(ConversationEvent.created_at))
            .limit(max(self.policy.max_history_turns, 1))
        )
        events = list(reversed(result.scalars().all()))
        turns: list[dict[str, object]] = []
        for event in events:
            metadata = event.metadata_json if isinstance(event.metadata_json, dict) else {}
            booking_reference = str(metadata.get("booking_reference") or "").strip() or None
            service_options = metadata.get("service_options")
            if not isinstance(service_options, list):
                service_options = []
            service_search_query = str(metadata.get("service_search_query") or "").strip() or None
            if event.message_text:
                turns.append(
                    {
                        "role": "customer",
                        "text": event.message_text,
                        "booking_reference": booking_reference,
                        "service_options": service_options,
                        "service_search_query": service_search_query,
                    }
                )
            if event.ai_reply:
                turns.append(
                    {
                        "role": "assistant",
                        "text": event.ai_reply,
                        "booking_reference": booking_reference,
                        "service_options": service_options,
                        "service_search_query": service_search_query,
                    }
                )
        return turns[-self.policy.max_history_turns :]

    async def _load_channel_session_state(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
    ) -> dict[str, object]:
        if not conversation_id:
            return {}
        try:
            result = await session.execute(
                select(MessagingChannelSession)
                .where(MessagingChannelSession.channel == channel)
                .where(MessagingChannelSession.conversation_id == conversation_id)
            )
            rows = result.scalars().all()
        except Exception:
            return {}
        row = rows[0] if rows else None
        if not row:
            return {}
        return {
            "service_search_query": str(row.service_search_query or "").strip() or None,
            "service_options": (
                row.service_options_json if isinstance(row.service_options_json, list) else []
            ),
            "reply_controls": (
                row.reply_controls_json if isinstance(row.reply_controls_json, dict) else {}
            ),
            "customer_identity": (
                row.customer_identity_json if isinstance(row.customer_identity_json, dict) else {}
            ),
            "session_metadata": (
                row.metadata_json if isinstance(row.metadata_json, dict) else {}
            ),
            "tenant_id": str(row.tenant_id or "").strip() or None,
        }

    async def _upsert_channel_session_state(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        customer_identity: dict[str, object],
        service_search_query: str | None,
        service_options: list[dict[str, object]],
        reply_controls: dict[str, object],
        last_ai_intent: str,
        last_workflow_status: str,
        metadata: dict[str, object] | None = None,
    ) -> None:
        if not conversation_id:
            return
        try:
            result = await session.execute(
                select(MessagingChannelSession)
                .where(MessagingChannelSession.channel == channel)
                .where(MessagingChannelSession.conversation_id == conversation_id)
            )
            rows = result.scalars().all()
            row = rows[0] if rows else None
            if not row:
                row = MessagingChannelSession(
                    channel=channel,
                    conversation_id=conversation_id,
                )
                session.add(row)
            row.tenant_id = tenant_id
            row.customer_identity_json = customer_identity
            row.service_search_query = service_search_query
            row.service_options_json = service_options[: self.policy.max_service_options]
            row.reply_controls_json = reply_controls
            row.last_ai_intent = last_ai_intent
            row.last_workflow_status = last_workflow_status
            row.metadata_json = metadata or {}
            row.updated_at = func.now()
        except Exception:
            return

    def _with_history_context(self, history: list[dict[str, object]], text: str) -> str:
        if not history:
            return text
        lines = ["[Prior conversation:"]
        for turn in history[-self.policy.max_history_turns :]:
            role = str(turn.get("role") or "").capitalize()
            turn_text = str(turn.get("text") or "").strip()
            if turn_text:
                lines.append(f"  {role}: {turn_text}")
        lines.append("]")
        return f"{chr(10).join(lines)}\n{text}".strip()

    def _layer_metadata(self, channel: str) -> dict[str, object]:
        return {
            "layer": "messaging_automation",
            "agent": {
                "id": CUSTOMER_AGENT_INTERNAL_ID,
                "canonical_name": CUSTOMER_AGENT_CANONICAL_NAME,
                "platform": CUSTOMER_AGENT_PLATFORM_NAMES.get(channel, {}),
            },
            "channel": channel,
            "conversation_window_days": self.policy.conversation_window_days,
            "max_history_turns": self.policy.max_history_turns,
            "max_service_options": self.policy.max_service_options,
            "policy": {
                "system_of_record": "portal_booking_snapshot",
                "customer_identity_scope": "private_channel_booking_reference_or_safe_phone_email_match",
                "safe_mutations": [
                    "booking_intent_capture",
                    "service_search_handoff",
                    *sorted(self.policy.supported_request_types),
                ],
                "unsupported_mutations": "manual_review",
            },
            "workflow_engine": "agent_action_runs/outbox/n8n",
        }

    @staticmethod
    def _tenant_notification_targets(settings: dict[str, object]) -> dict[str, list[str]]:
        candidates: list[object] = []
        messaging = settings.get("messaging_automation")
        if isinstance(messaging, dict):
            tenant_notifications = messaging.get("tenant_notifications")
            if isinstance(tenant_notifications, dict):
                candidates.extend(
                    [
                        tenant_notifications.get("telegram_chat_id"),
                        tenant_notifications.get("telegram_chat_ids"),
                    ]
                )
            channels = messaging.get("channels")
            if isinstance(channels, dict):
                telegram = channels.get("telegram")
                if isinstance(telegram, dict):
                    candidates.extend([telegram.get("chat_id"), telegram.get("chat_ids")])
        notifications = settings.get("notifications")
        if isinstance(notifications, dict):
            telegram = notifications.get("telegram")
            if isinstance(telegram, dict):
                candidates.extend([telegram.get("chat_id"), telegram.get("chat_ids")])
        candidates.extend(
            [
                settings.get("tenant_telegram_chat_id"),
                settings.get("telegram_chat_id"),
                settings.get("telegram_chat_ids"),
            ]
        )

        chat_ids: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            values = candidate if isinstance(candidate, list) else [candidate]
            for value in values:
                normalized = str(value or "").strip()
                if not normalized or normalized in seen:
                    continue
                seen.add(normalized)
                chat_ids.append(normalized)
        return {"telegram": chat_ids}

    @staticmethod
    def _normalize_channel(value: str | None) -> str:
        return str(value or "").strip().lower() or "unknown"

    @staticmethod
    def _conversation_key(*, message: TawkMessage, metadata: dict[str, object]) -> str | None:
        return (
            str(metadata.get("conversation_id") or "").strip()
            or str(metadata.get("sender_phone") or "").strip()
            or str(metadata.get("telegram_chat_id") or "").strip()
            or str(message.conversation_id or "").strip()
            or None
        )

    @staticmethod
    def _customer_phone(*, message: TawkMessage, metadata: dict[str, object]) -> str | None:
        value = str(metadata.get("sender_phone") or message.sender_phone or "").strip()
        if value:
            return value
        match = PHONE_RE.search(message.text or "")
        if not match:
            return None
        digits = re.sub(r"[^\d+]", "", match.group(1))
        if not digits:
            return None
        return digits if digits.startswith("+") else f"+{digits}"

    @staticmethod
    def _latest_booking_reference(history: list[dict[str, object]]) -> str | None:
        for turn in reversed(history):
            reference = str(turn.get("booking_reference") or "").strip()
            if reference:
                return reference
        return None

    @staticmethod
    def _latest_service_options(history: list[dict[str, object]]) -> list[dict[str, object]]:
        for turn in reversed(history):
            options = turn.get("service_options")
            if isinstance(options, list) and options:
                return [item for item in options if isinstance(item, dict)]
        return []

    @staticmethod
    def _latest_service_query(history: list[dict[str, object]]) -> str | None:
        for turn in reversed(history):
            query = str(turn.get("service_search_query") or "").strip()
            if query:
                return query
        return None

    @staticmethod
    def _customer_email(*, message: TawkMessage, metadata: dict[str, object]) -> str | None:
        explicit = str(metadata.get("sender_email") or message.sender_email or "").strip().lower()
        if explicit:
            return explicit
        match = EMAIL_RE.search(message.text or "")
        return match.group(0).lower() if match else None

    @staticmethod
    def _customer_identity_metadata(
        *,
        channel: str,
        customer_email: str | None,
        customer_phone: str | None,
    ) -> dict[str, object]:
        identity_type = "missing"
        if customer_email:
            identity_type = "email"
        elif customer_phone:
            identity_type = "phone"
        return {
            "channel": channel,
            "identity_type": identity_type,
            "has_email": bool(customer_email),
            "has_phone": bool(customer_phone),
            "booking_data_policy": "load_by_booking_reference_or_safe_single_phone_email_match_only",
            "private_channel": channel in {"telegram", "whatsapp", "sms", "email"},
        }

    @staticmethod
    def _parse_booking_selection(message: str) -> int | None:
        match = BOOK_OPTION_RE.search(str(message or ""))
        if not match:
            return None
        try:
            return int(match.group(1))
        except ValueError:
            return None

    @staticmethod
    def _service_option_by_index(options: list[dict[str, object]], index: int | None) -> dict[str, object] | None:
        if not index or index < 1:
            return None
        offset = index - 1
        if offset >= len(options):
            return None
        return options[offset]

    @staticmethod
    def _parse_slash_command(message: str) -> tuple[str | None, str]:
        text = str(message or "").strip()
        if not text.startswith("/"):
            return None, ""
        parts = text.split(maxsplit=1)
        head = parts[0]
        args = parts[1].strip() if len(parts) > 1 else ""
        if "@" in head:
            head = head.split("@", 1)[0]
        head = head.lower()
        mapping = {
            "/help": "help",
            "/start": "help",
            "/search": "search",
            "/find": "search",
            "/mybookings": "mybookings",
            "/booking": "mybookings",
            "/cancel": "cancel",
            "/support": "support",
        }
        return mapping.get(head), args

    @classmethod
    def _slash_command_intent(cls, message: str) -> str | None:
        intent, _ = cls._parse_slash_command(message)
        return intent

    @staticmethod
    def _is_booking_intake_intent(message: str) -> bool:
        normalized = unicodedata.normalize("NFKD", str(message or "").strip().lower())
        ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        booking_terms = {
            "book",
            "booking",
            "appointment",
            "reserve",
            "reservation",
            "schedule",
            "dat lich",
            "dat cho",
            "giu cho",
            "hen lich",
            "muon dat",
            "can dat",
        }
        return any(term in ascii_text for term in booking_terms)

    @staticmethod
    def _is_booking_care_intent(message: str) -> bool:
        normalized = unicodedata.normalize("NFKD", str(message or "").strip().lower())
        ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        care_terms = {
            "status",
            "confirm",
            "confirmation",
            "payment",
            "invoice",
            "bill",
            "paid",
            "cancel",
            "cancellation",
            "reschedule",
            "change time",
            "change date",
            "doi lich",
            "đổi lịch",
            "huy",
            "hủy",
            "hoa don",
            "hóa đơn",
            "thanh toan",
            "thanh toán",
        }
        return any(term in ascii_text for term in care_terms)

    @staticmethod
    def _is_service_discovery_intent(message: str) -> bool:
        normalized = unicodedata.normalize("NFKD", str(message or "").strip().lower())
        ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        terms = {
            "find",
            "search",
            "recommend",
            "compare",
            "service",
            "class",
            "lesson",
            "near",
            "nearby",
            "tim",
            "tìm",
            "kiem",
            "kiếm",
            "goi y",
            "gợi ý",
            "tu van",
            "tư vấn",
        }
        return (
            any(term in ascii_text for term in terms)
            or MessagingAutomationService._is_booking_intake_intent(message)
            or MessagingAutomationService._is_public_web_expansion_request(message)
        )

    @staticmethod
    def _is_existing_booking_alternative_search_intent(message: str) -> bool:
        normalized = unicodedata.normalize("NFKD", str(message or "").strip().lower())
        ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        terms = {
            "another",
            "other",
            "different",
            "alternative",
            "option",
            "search",
            "find",
            "compare",
            "internet",
            "web",
            "near me",
            "nearby",
            "khac",
            "lua chon",
            "tim",
            "kiem",
            "mo rong",
        }
        return any(term in ascii_text for term in terms) and (
            MessagingAutomationService._is_service_discovery_intent(message)
            or MessagingAutomationService._is_public_web_expansion_request(message)
        )

    @staticmethod
    def _is_existing_booking_search_override(message: str) -> bool:
        normalized = unicodedata.normalize("NFKD", str(message or "").strip().lower())
        ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        return (
            "keep current booking" in ascii_text
            or "giu booking hien tai" in ascii_text
            or "search bookedai.au" in ascii_text
            or "find more on internet" in ascii_text
        )

    @staticmethod
    def _is_public_web_expansion_request(message: str) -> bool:
        normalized = unicodedata.normalize("NFKD", str(message or "").strip().lower())
        ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        phrases = {
            "internet",
            "web",
            "online",
            "near me",
            "nearby",
            "live read",
            "find more",
            "search more",
            "tim them",
            "tìm thêm",
            "mo rong",
            "mở rộng",
        }
        return any(phrase in ascii_text for phrase in phrases)

    @staticmethod
    def _effective_search_query(message: str, *, prior_service_query: str | None) -> str:
        if (
            MessagingAutomationService._is_public_web_expansion_request(message)
            or MessagingAutomationService._is_existing_booking_search_override(message)
        ) and prior_service_query:
            return prior_service_query
        return str(message or "").strip()

    @staticmethod
    def _search_terms(value: str) -> list[str]:
        normalized = unicodedata.normalize("NFKD", str(value or "").lower())
        ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        terms = re.findall(r"[a-z0-9]{3,}", ascii_text)
        ignored = {
            "book",
            "booking",
            "find",
            "search",
            "near",
            "nearby",
            "please",
            "want",
            "need",
            "service",
            "this",
            "that",
            "with",
            "cho",
            "toi",
            "can",
            "tim",
            "kiem",
        }
        return [term for term in terms if term not in ignored][:8]

    async def _search_public_web_options(
        self,
        *,
        query: str,
        location_hint: str | None = None,
        user_location: dict[str, Any] | None = None,
    ) -> list[dict[str, object]]:
        service = self.public_search_service
        if service is None or not hasattr(service, "search_public_service_candidates"):
            return []
        try:
            web_results = await service.search_public_service_candidates(
                query=query,
                location_hint=location_hint,
                user_location=user_location,
                booking_context={"summary": query},
                budget=None,
                preferences={"source": "bookedai_manager_bot"},
            )
        except Exception:
            return []
        options: list[dict[str, object]] = []
        if not isinstance(web_results, list):
            return options
        for item in web_results:
            if not isinstance(item, dict):
                continue
            provider_name = str(item.get("provider_name") or "").strip()
            service_name = str(item.get("service_name") or "").strip()
            source_url = self._safe_http_url(item.get("source_url"))
            if not provider_name or not service_name or not source_url:
                continue
            options.append(
                {
                    "index": len(options) + 1,
                    "candidate_id": str(item.get("candidate_id") or source_url),
                    "service_id": "",
                    "provider_name": provider_name,
                    "service_name": service_name,
                    "category": "",
                    "summary": str(item.get("summary") or "").strip(),
                    "location": str(item.get("location") or "").strip(),
                    "booking_url": self._safe_http_url(item.get("booking_url")),
                    "source_url": source_url,
                    "price": "Check provider site for final pricing",
                    "duration_minutes": None,
                    "tenant_id": "",
                    "source_type": "public_web_search",
                    "contact_phone": str(item.get("contact_phone") or "").strip(),
                    "match_score": item.get("match_score"),
                    "why_this_matches": str(item.get("why_this_matches") or "").strip(),
                }
            )
            if len(options) >= self.policy.max_service_options:
                break
        return options

    def _merge_service_options(
        self,
        service_options: list[dict[str, object]],
        public_web_options: list[dict[str, object]],
    ) -> list[dict[str, object]]:
        merged: list[dict[str, object]] = []
        seen: set[str] = set()
        for option in [*service_options, *public_web_options]:
            key = str(option.get("candidate_id") or option.get("service_id") or option.get("source_url") or "").strip()
            if key and key in seen:
                continue
            if key:
                seen.add(key)
            next_option = dict(option)
            next_option["index"] = len(merged) + 1
            next_option.setdefault("source_type", "service_catalog")
            merged.append(next_option)
            if len(merged) >= self.policy.max_service_options:
                break
        return merged

    async def _search_service_options(
        self,
        session,
        *,
        query: str,
        tenant_ref: str | None = None,
    ) -> list[dict[str, object]]:
        if not self._is_service_discovery_intent(query):
            return []
        terms = self._search_terms(query)
        if not terms:
            return []
        tenant_id: str | None = None
        if tenant_ref:
            tenant_id = await TenantRepository(RepositoryContext(session=session)).resolve_tenant_id(tenant_ref)

        search_fields = (
            ServiceMerchantProfile.name,
            ServiceMerchantProfile.business_name,
            ServiceMerchantProfile.category,
            ServiceMerchantProfile.summary,
            ServiceMerchantProfile.location,
            ServiceMerchantProfile.venue_name,
        )
        statement = (
            select(ServiceMerchantProfile)
            .where(ServiceMerchantProfile.is_active == 1)
            .order_by(desc(ServiceMerchantProfile.featured), ServiceMerchantProfile.name.asc())
            .limit(24)
        )
        if tenant_id:
            statement = statement.where(ServiceMerchantProfile.tenant_id == tenant_id)
        clauses = []
        for term in terms:
            pattern = f"%{term}%"
            clauses.append(or_(*(field.ilike(pattern) for field in search_fields)))
        if clauses:
            statement = statement.where(or_(*clauses))

        result = await session.execute(statement)
        rows = list(result.scalars().all())
        scored_rows = sorted(
            rows,
            key=lambda item: self._score_service_option(item, query=query, terms=terms),
            reverse=True,
        )
        options: list[dict[str, object]] = []
        for item in scored_rows[: self.policy.max_service_options]:
            display_price = str(getattr(item, "display_price", "") or "").strip()
            amount = getattr(item, "amount_aud", None)
            price = display_price or (f"AUD {amount:g}" if isinstance(amount, (int, float)) and amount > 0 else "Price TBC")
            option = {
                "index": len(options) + 1,
                "candidate_id": str(getattr(item, "service_id", "") or ""),
                "service_id": str(getattr(item, "service_id", "") or ""),
                "provider_name": str(getattr(item, "business_name", "") or ""),
                "service_name": str(getattr(item, "name", "") or ""),
                "category": str(getattr(item, "category", "") or ""),
                "summary": str(getattr(item, "summary", "") or ""),
                "location": str(getattr(item, "location", "") or getattr(item, "venue_name", "") or ""),
                "booking_url": self._safe_http_url(getattr(item, "booking_url", "")),
                "source_url": self._safe_http_url(getattr(item, "source_url", "")),
                "price": price,
                "duration_minutes": getattr(item, "duration_minutes", None),
                "tenant_id": str(getattr(item, "tenant_id", "") or ""),
                "source_type": "service_catalog",
            }
            options.append(option)
        return options

    @staticmethod
    def _score_service_option(item: ServiceMerchantProfile, *, query: str, terms: list[str]) -> tuple[int, float, str]:
        haystack = " ".join(
            str(value or "").lower()
            for value in (
                getattr(item, "name", None),
                getattr(item, "business_name", None),
                getattr(item, "category", None),
                getattr(item, "summary", None),
                getattr(item, "location", None),
                getattr(item, "venue_name", None),
            )
        )
        hits = sum(1 for term in terms if term in haystack)
        featured = 1 if bool(getattr(item, "featured", 0)) else 0
        return (hits, featured, str(getattr(item, "name", "") or ""))

    @staticmethod
    def _build_service_search_reply(
        *,
        query: str,
        options: list[dict[str, object]],
        public_web_requested: bool = False,
    ) -> str:
        has_public_web = any(str(option.get("source_type") or "") == "public_web_search" for option in options)
        heading = (
            "BookedAI found options, including Internet results."
            if has_public_web
            else "BookedAI.au found matching services."
        )
        lines = [
            f"<b>{MessagingAutomationService._html(heading)}</b>",
            f"<b>Search</b>: {MessagingAutomationService._html(MessagingAutomationService._truncate_text(query, limit=90))}",
            f"<b>Website</b>: <a href=\"{BOOKEDAI_PUBLIC_URL}\">bookedai.au</a>",
            "",
        ]
        for option in options:
            source_label = "Internet" if str(option.get("source_type") or "") == "public_web_search" else "BookedAI"
            option_index = option.get("index") or len(lines)
            title = str(option.get("service_name") or "Service").strip()
            provider = str(option.get("provider_name") or "").strip()
            location = str(option.get("location") or "").strip()
            price = str(option.get("price") or "").strip()
            summary = MessagingAutomationService._truncate_text(
                str(option.get("summary") or option.get("why_this_matches") or "").strip(),
                limit=120,
            )
            lines.append(f"<b>Option {MessagingAutomationService._html(option_index)}: {MessagingAutomationService._html(title)}</b>")
            if provider:
                lines.append(f"Provider: {MessagingAutomationService._html(provider)}")
            detail_bits = [bit for bit in (location, price, source_label) if bit]
            if detail_bits:
                lines.append(MessagingAutomationService._html(" | ".join(detail_bits)))
            if summary:
                lines.append(MessagingAutomationService._html(summary))
            lines.append(
                f"<b>Next</b>: tap <b>Book {MessagingAutomationService._html(option_index)}</b>, then send name, email/phone, and preferred time."
            )
            lines.append("")
        lines.extend(
            [
                "<b>Suggested actions</b>: View details, Book an option, or open the full BookedAI form.",
                (
                    "For a wider search, tap <b>Find more on Internet near me</b> or send your suburb."
                    if not public_web_requested
                    else "Internet results are sourced options. Confirm final details before booking."
                ),
            ]
        )
        return "\n".join(lines)

    @staticmethod
    def _build_bookedai_chat_response(
        *,
        query: str,
        options: list[dict[str, object]],
        public_web_requested: bool = False,
    ) -> dict[str, object]:
        matched_services = []
        for option in options:
            matched_services.append(
                {
                    "id": str(option.get("candidate_id") or option.get("service_id") or ""),
                    "service_id": str(option.get("service_id") or ""),
                    "name": str(option.get("service_name") or ""),
                    "business_name": str(option.get("provider_name") or ""),
                    "category": str(option.get("category") or ""),
                    "summary": str(option.get("summary") or ""),
                    "location": str(option.get("location") or ""),
                    "booking_url": MessagingAutomationService._safe_http_url(option.get("booking_url")),
                    "source_url": MessagingAutomationService._safe_http_url(option.get("source_url")),
                    "display_price": str(option.get("price") or ""),
                    "duration_minutes": option.get("duration_minutes"),
                    "tags": [str(option.get("source_type") or "service_catalog")],
                    "featured": False,
                }
            )
        return {
            "status": "ok",
            "reply": MessagingAutomationService._build_service_search_reply(
                query=query,
                options=options,
                public_web_requested=public_web_requested,
            ),
            "matched_services": matched_services,
            "matched_events": [],
            "suggested_service_id": str(options[0].get("service_id") or options[0].get("candidate_id") or "") if options else None,
            "should_request_location": MessagingAutomationService._is_public_web_expansion_request(query),
            "source": "telegram_customer_agent",
        }

    @staticmethod
    def _bookedai_web_assistant_url(query: str, *, selected_service_id: str | None = None) -> str:
        params = {"assistant": "open", "q": query}
        if selected_service_id:
            params["service_id"] = selected_service_id
        return BOOKEDAI_PUBLIC_URL + "/?" + urlencode(params)

    @staticmethod
    def _portal_booking_url(booking_reference: str) -> str:
        return BOOKEDAI_PORTAL_URL + "/?" + urlencode({"booking_reference": booking_reference})

    @staticmethod
    def _portal_qr_url(booking_reference: str) -> str:
        return build_qr_code_url(MessagingAutomationService._portal_booking_url(booking_reference))

    @staticmethod
    def _safe_http_url(value: object) -> str:
        candidate = str(value or "").strip()
        parsed = urlparse(candidate)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return candidate
        return ""

    @staticmethod
    def _service_option_url(query: str, option: dict[str, object]) -> str:
        booking_url = MessagingAutomationService._safe_http_url(option.get("booking_url"))
        source_url = MessagingAutomationService._safe_http_url(option.get("source_url"))
        if booking_url:
            return booking_url
        if source_url:
            return source_url
        selected_service_id = str(option.get("service_id") or option.get("candidate_id") or "").strip()
        return MessagingAutomationService._bookedai_web_assistant_url(
            query,
            selected_service_id=selected_service_id or None,
        )

    @staticmethod
    def _truncate_text(value: str, *, limit: int) -> str:
        text = re.sub(r"\s+", " ", str(value or "")).strip()
        if len(text) <= limit:
            return text
        return f"{text[: max(limit - 3, 0)].rstrip()}..."

    @staticmethod
    def _html(value: object) -> str:
        return escape(str(value or ""), quote=False)

    @staticmethod
    def _service_search_reply_controls(
        *,
        query: str,
        include_public_web_button: bool,
        options: list[dict[str, object]] | None = None,
    ) -> dict[str, object]:
        safe_options = [option for option in (options or []) if isinstance(option, dict)]
        inline_keyboard: list[list[dict[str, object]]] = []
        primary_service_id = (
            str(safe_options[0].get("service_id") or safe_options[0].get("candidate_id") or "").strip()
            if safe_options
            else ""
        )
        inline_keyboard.append(
            [
                {
                    "text": "Open full results",
                    "url": MessagingAutomationService._bookedai_web_assistant_url(
                        query,
                        selected_service_id=primary_service_id or None,
                    ),
                }
            ]
        )
        for option in safe_options[:3]:
            option_index = option.get("index")
            if option_index:
                inline_keyboard.append(
                    [
                        {
                            "text": f"View option {option_index}",
                            "url": MessagingAutomationService._service_option_url(query, option),
                        },
                        {
                            "text": f"Book option {option_index}",
                            "callback_data": f"Book {option_index}",
                        },
                    ]
                )
        return {
            "telegram_reply_markup": {
                "inline_keyboard": [
                    *inline_keyboard,
                    *(
                        [[{"text": "Find more on Internet", "callback_data": "Find more on Internet near me"}]]
                        if include_public_web_button
                        else []
                    ),
                ],
            },
            "telegram_parse_mode": "HTML",
            "actions": [
                {
                    "id": "open_bookedai",
                    "label": "Open full results in BookedAI",
                    "url": MessagingAutomationService._bookedai_web_assistant_url(query),
                },
                *[
                    {
                        "id": f"view_option_{option.get('index')}",
                        "label": f"View {option.get('index')}",
                        "url": MessagingAutomationService._service_option_url(query, option),
                    }
                    for option in safe_options[:3]
                    if option.get("index")
                ],
                *[
                    {
                        "id": f"book_option_{option.get('index')}",
                        "label": f"Book {option.get('index')}",
                        "callback_data": f"Book {option.get('index')}",
                    }
                    for option in safe_options[:3]
                    if option.get("index")
                ],
                *(
                    [
                        {
                            "id": "public_web_near_me",
                            "label": "Find more on Internet near me",
                            "query": f"{query} near me internet",
                        }
                    ]
                    if include_public_web_button
                    else []
                ),
            ],
        }

    @staticmethod
    def _build_existing_booking_search_confirmation_reply(
        *,
        booking_reference: str,
        query: str,
    ) -> str:
        portal_url = MessagingAutomationService._portal_booking_url(booking_reference)
        qr_url = MessagingAutomationService._portal_qr_url(booking_reference)
        return "\n".join(
            [
                f"<b>{BOOKEDAI_CUSTOMER_PROJECT_NAME}: current order found</b>",
                f"<b>Current order</b>: <code>{MessagingAutomationService._html(booking_reference)}</code>",
                f"<b>Portal</b>: <a href=\"{MessagingAutomationService._html(portal_url)}\">open order</a>",
                f"<b>QR</b>: <a href=\"{MessagingAutomationService._html(qr_url)}\">open QR code</a>",
                "",
                f"<b>You asked to search</b>: {MessagingAutomationService._html(MessagingAutomationService._truncate_text(query, limit=90))}",
                "Before I move into new options, please choose what should happen with the current booking.",
                "",
                "<b>Suggested actions</b>",
                "- Keep this booking and search BookedAI.au",
                "- Find Internet options for another booking service",
                "- Request a change to the current booking",
                "- Return to the current order portal anytime",
            ]
        )

    @staticmethod
    def _existing_booking_search_reply_controls(
        *,
        booking_reference: str,
        query: str,
    ) -> dict[str, object]:
        portal_url = MessagingAutomationService._portal_booking_url(booking_reference)
        qr_url = MessagingAutomationService._portal_qr_url(booking_reference)
        return {
            "telegram_reply_markup": {
                "inline_keyboard": [
                    [{"text": "Open current order portal", "url": portal_url}],
                    [{"text": "Open order QR", "url": qr_url}],
                    [
                        {
                            "text": "Keep current booking, search BookedAI.au",
                            "callback_data": "Keep current booking and search BookedAI.au",
                        }
                    ],
                    [
                        {
                            "text": "Find Internet options, keep current booking",
                            "callback_data": "Find more on Internet near me and keep current booking",
                        }
                    ],
                    [
                        {
                            "text": "Change current booking",
                            "callback_data": f"Change current booking {booking_reference}",
                        }
                    ],
                ]
            },
            "telegram_parse_mode": "HTML",
            "actions": [
                {
                    "id": "open_current_booking_portal",
                    "label": "Open current order portal",
                    "url": portal_url,
                },
                {
                    "id": "open_current_booking_qr",
                    "label": "Open order QR",
                    "url": qr_url,
                },
                {
                    "id": "keep_current_booking_search_bookedai",
                    "label": "Keep current booking, search BookedAI.au",
                    "query": query,
                },
                {
                    "id": "keep_current_booking_search_internet",
                    "label": "Find Internet options, keep current booking",
                    "query": f"{query} near me internet",
                },
                {
                    "id": "change_current_booking",
                    "label": "Change current booking",
                    "booking_reference": booking_reference,
                },
            ],
        }

    @staticmethod
    def _with_current_booking_return_controls(
        controls: dict[str, object],
        *,
        booking_reference: str,
    ) -> dict[str, object]:
        next_controls = dict(controls)
        telegram_markup = next_controls.get("telegram_reply_markup")
        if isinstance(telegram_markup, dict):
            rows = telegram_markup.get("inline_keyboard")
            if isinstance(rows, list):
                telegram_markup = dict(telegram_markup)
                telegram_markup["inline_keyboard"] = [
                    *rows,
                    [
                        {
                            "text": "Return to current order",
                            "url": MessagingAutomationService._portal_booking_url(booking_reference),
                        }
                    ],
                ]
                next_controls["telegram_reply_markup"] = telegram_markup
        actions = next_controls.get("actions")
        if isinstance(actions, list):
            next_controls["actions"] = [
                *actions,
                {
                    "id": "return_to_current_order",
                    "label": "Return to current order",
                    "url": MessagingAutomationService._portal_booking_url(booking_reference),
                },
            ]
        next_controls["telegram_parse_mode"] = "HTML"
        return next_controls

    @staticmethod
    def _booking_care_reply_controls(
        booking_reference: str,
        *,
        new_booking_query: str | None = None,
    ) -> dict[str, object]:
        portal_url = MessagingAutomationService._portal_booking_url(booking_reference)
        qr_url = MessagingAutomationService._portal_qr_url(booking_reference)
        search_query = str(new_booking_query or "Find another booking option").strip()
        bookedai_search_url = MessagingAutomationService._bookedai_web_assistant_url(search_query)
        return {
            "telegram_reply_markup": {
                "inline_keyboard": [
                    [{"text": "Keep this booking", "callback_data": f"Keep current booking {booking_reference}"}],
                    [{"text": "View booking", "url": portal_url}],
                    [{"text": "Open order QR", "url": qr_url}],
                    [
                        {
                            "text": "Change time",
                            "callback_data": f"reschedule:date:{booking_reference}",
                        },
                        {
                            "text": "Cancel booking",
                            "callback_data": f"Cancel current booking {booking_reference}",
                        },
                    ],
                    [
                        {
                            "text": "New booking search",
                            "callback_data": "Find another booking option and keep current booking",
                        },
                        {
                            "text": "Open BookedAI",
                            "url": bookedai_search_url,
                        },
                    ],
                ]
            },
            "telegram_parse_mode": "HTML",
            "actions": [
                {
                    "id": "keep_booking",
                    "label": "Keep this booking",
                    "booking_reference": booking_reference,
                },
                {
                    "id": "open_booking_portal",
                    "label": "View booking",
                    "url": portal_url,
                },
                {
                    "id": "open_order_qr",
                    "label": "Open order QR",
                    "url": qr_url,
                },
                {
                    "id": "request_reschedule",
                    "label": "Change time",
                    "booking_reference": booking_reference,
                },
                {
                    "id": "request_cancel",
                    "label": "Cancel booking",
                    "booking_reference": booking_reference,
                },
                {
                    "id": "new_booking_search",
                    "label": "New booking search",
                    "query": search_query,
                },
                {
                    "id": "open_bookedai",
                    "label": "Open BookedAI",
                    "url": bookedai_search_url,
                },
            ],
        }

    async def _try_create_chat_booking_intent(
        self,
        session,
        *,
        channel: str,
        message: TawkMessage,
        metadata: dict[str, object],
        selected_option: dict[str, object],
    ) -> MessagingAutomationResult | None:
        contact = self._parse_contact_for_booking(message.text, fallback_name=message.sender_name)
        if not (contact.get("email") or contact.get("phone")):
            return None

        tenant_id = str(selected_option.get("tenant_id") or "").strip()
        if not tenant_id:
            tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id() or ""
        if not tenant_id:
            return None

        service_id = str(selected_option.get("service_id") or selected_option.get("candidate_id") or "").strip() or None
        service_name = str(selected_option.get("service_name") or "BookedAI service").strip()
        booking_reference = f"v1-{uuid4().hex[:10]}"
        contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        booking_repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        contact_id = await contact_repository.upsert_contact(
            tenant_id=tenant_id,
            full_name=str(contact.get("name") or "").strip() or None,
            email=str(contact.get("email") or "").strip().lower() or None,
            phone=str(contact.get("phone") or "").strip() or None,
            primary_channel=channel,
        )
        lead_id = await lead_repository.upsert_lead(
            tenant_id=tenant_id,
            contact_id=contact_id,
            source=channel,
            status="captured",
        )
        booking_intent_id = await booking_repository.upsert_booking_intent(
            tenant_id=tenant_id,
            contact_id=contact_id,
            booking_reference=booking_reference,
            conversation_id=str(message.conversation_id or metadata.get("conversation_id") or ""),
            source=channel,
            service_name=service_name,
            service_id=service_id,
            requested_date=str(contact.get("requested_date") or "").strip() or None,
            requested_time=str(contact.get("requested_time") or "").strip() or None,
            timezone="Australia/Sydney",
            booking_path="request_callback",
            confidence_level="medium",
            status="captured",
            payment_dependency_state="pending",
            metadata_json=json.dumps(
                {
                    "source": "messaging_automation",
                    "channel": channel,
                    "selected_option": selected_option,
                    "customer_message": message.text,
                    "telegram_chat_id": metadata.get("telegram_chat_id"),
                    "lead_id": lead_id,
                }
            ),
        )
        await session.commit()

        portal_url = self._portal_booking_url(booking_reference)
        qr_code_url = self._portal_qr_url(booking_reference)
        payment_line = (
            "Payment status: pending. Your booking request is kept in BookedAI while provider "
            "confirmation and payment instructions are prepared."
        )
        reply = (
            f"<b>{BOOKEDAI_CUSTOMER_PROJECT_NAME}: booking request started</b>\n"
            f"<b>Service</b>: {self._html(service_name)}\n"
            f"<b>Reference</b>: <code>{self._html(booking_reference)}</code> (tap to copy)\n"
            "<b>Status</b>: booking captured, payment pending\n"
            f"<b>Portal</b>: <a href=\"{self._html(portal_url)}\">open order</a>\n"
            f"<b>QR</b>: <a href=\"{self._html(qr_code_url)}\">open QR code</a>\n"
            f"<b>Website</b>: <a href=\"{BOOKEDAI_PUBLIC_URL}\">bookedai.au</a>\n\n"
            f"{self._html(payment_line)}\n"
            "Use the menu below to keep this booking, review it, ask for a change, cancel, or start a new search."
        )
        return MessagingAutomationResult(
            ai_reply=reply,
            ai_intent="booking_intent_captured",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_care_status": "booking_intent_captured",
                "booking_reference": booking_reference,
                "booking_intent": {
                    "booking_intent_id": booking_intent_id,
                    "booking_reference": booking_reference,
                    "portal_url": portal_url,
                    "qr_code_url": qr_code_url,
                    "tenant_id": tenant_id,
                    "service_id": service_id,
                    "service_name": service_name,
                    "contact_id": contact_id,
                    "lead_id": lead_id,
                    "customer_name": str(contact.get("name") or "").strip() or None,
                    "customer_email": str(contact.get("email") or "").strip().lower() or None,
                    "customer_phone": str(contact.get("phone") or "").strip() or None,
                    "requested_date": str(contact.get("requested_date") or "").strip() or None,
                    "requested_time": str(contact.get("requested_time") or "").strip() or None,
                    "timezone": "Australia/Sydney",
                    "booking_path": "request_callback",
                    "payment_status": "pending",
                },
                "reply_controls": self._booking_care_reply_controls(
                    booking_reference,
                    new_booking_query=service_name,
                ),
                "selected_option": selected_option,
            },
        )

    @staticmethod
    def _parse_contact_for_booking(message: str, *, fallback_name: str | None = None) -> dict[str, str | None]:
        text = str(message or "").strip()
        email_match = EMAIL_RE.search(text)
        phone_match = PHONE_RE.search(text)
        date_match = DATE_RE.search(text)
        time_match = TIME_RE.search(text)
        name = str(fallback_name or "").strip() or None
        name_match = re.search(r"\b(?:for|name is|ten la|tên là)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ .'’-]{1,60})", text, re.I)
        if name_match:
            candidate = name_match.group(1).strip()
            candidate = EMAIL_RE.sub("", candidate)
            candidate = PHONE_RE.sub("", candidate)
            candidate = re.split(r"\b(?:at|on|tomorrow|today|next|email|phone)\b", candidate, flags=re.I)[0].strip()
            if candidate:
                name = candidate
        return {
            "name": name,
            "email": email_match.group(0).lower() if email_match else None,
            "phone": phone_match.group(1).strip() if phone_match else None,
            "requested_date": date_match.group(1) if date_match else None,
            "requested_time": time_match.group(1) if time_match else None,
        }

    @staticmethod
    def _build_booking_intake_reply(*, channel: str, message: TawkMessage) -> str:
        sender_name = str(message.sender_name or "").strip()
        greeting = f"Hi {sender_name}," if sender_name else "Hi,"
        channel_hint = (
            "You can keep replying here on Telegram."
            if channel == "telegram"
            else "You can keep replying here."
        )
        return (
            f"{greeting} I can help you start a new booking with BookedAI. "
            "Please reply with the service you want, preferred day/time, suburb or online preference, "
            "and your name/email if you want a confirmation sent. "
            "If you already booked, send the booking reference and I can check status, payment, "
            f"reschedule, or cancellation options. {channel_hint} You can also continue at https://bookedai.au."
        )

    def _build_welcome_result(
        self,
        *,
        channel: str,
        message: TawkMessage,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        sender_name = escape(str(message.sender_name or "").strip())
        greeting = (
            self._localized("welcome_greeting_named", locale, name=sender_name)
            if sender_name
            else self._localized("welcome_greeting_anonymous", locale)
        )
        body = self._localized("welcome", locale, greeting=greeting)
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="welcome",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "welcome",
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": self._home_reply_keyboard(locale),
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    def _build_search_prompt_result(
        self,
        *,
        channel: str,
        message: TawkMessage,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        body = self._localized("search_prompt", locale)
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="search_prompt",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "search_prompt",
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": self._home_reply_keyboard(locale),
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    def _build_my_bookings_prompt_result(
        self,
        *,
        channel: str,
        message: TawkMessage,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        body = self._localized("mybookings_prompt", locale)
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="needs_booking_reference",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "needs_booking_reference",
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": self._home_reply_keyboard(locale),
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    def _build_cancel_prompt_result(
        self,
        *,
        channel: str,
        message: TawkMessage,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        body = self._localized("cancel_prompt", locale)
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="needs_booking_reference",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "needs_booking_reference",
                "cancel_intent_pending": True,
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": self._home_reply_keyboard(locale),
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    def _build_support_handoff_result(
        self,
        *,
        channel: str,
        message: TawkMessage,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        body = self._localized(
            "support_handoff",
            locale,
            support_email=DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
        )
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="support_handoff",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "support_handoff",
                "human_handoff_requested": True,
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": self._home_reply_keyboard(locale),
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    def _build_cancel_confirm_result(
        self,
        *,
        channel: str,
        booking_reference: str,
        identity_metadata: dict[str, object],
        booking_resolution: dict[str, object] | None,
        locale: str = "en",
    ) -> MessagingAutomationResult:
        body = self._localized(
            "cancel_confirm_prompt", locale, booking_reference=booking_reference
        )
        reply_markup = {
            "inline_keyboard": [
                [
                    {
                        "text": self._localized("cancel_confirm_yes", locale),
                        "callback_data": f"Cancel current booking {booking_reference}",
                    },
                    {
                        "text": self._localized("cancel_confirm_no", locale),
                        "callback_data": f"Keep current booking {booking_reference}",
                    },
                ]
            ]
        }
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="cancel_confirmation",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "cancel_confirmation",
                "booking_reference": booking_reference,
                "booking_resolution": booking_resolution,
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": reply_markup,
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    RESCHEDULE_TIME_SLOTS: tuple[str, ...] = ("09:00", "12:00", "15:00", "18:00")
    RESCHEDULE_DATE_OFFSETS: tuple[int, ...] = (1, 2, 3, 4, 5, 6, 7)

    @staticmethod
    def _parse_reschedule_picker_callback(
        text: str,
    ) -> tuple[str, str, str | None, str | None] | None:
        raw = str(text or "").strip()
        if not raw.startswith("reschedule:"):
            return None
        parts = raw.split(":")
        # ["reschedule", step, booking_ref, ...optional date/time]
        if len(parts) < 3:
            return None
        step = parts[1].strip().lower()
        booking_ref = parts[2].strip()
        if step not in {"date", "time", "confirm"} or not booking_ref:
            return None
        if step == "date":
            return ("date", booking_ref, None, None)
        if step == "time":
            if len(parts) < 4 or not parts[3].strip():
                return None
            return ("time", booking_ref, parts[3].strip(), None)
        # step == "confirm"
        if len(parts) < 5 or not parts[3].strip() or not parts[4].strip():
            return None
        # rejoin time which may contain ":" (e.g. "18:00")
        time_value = ":".join(parts[4:]).strip()
        return ("confirm", booking_ref, parts[3].strip(), time_value)

    @classmethod
    def _reschedule_date_options(cls) -> list[tuple[str, str]]:
        today = datetime.now(UTC).date()
        options: list[tuple[str, str]] = []
        weekday_short = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
        for offset in cls.RESCHEDULE_DATE_OFFSETS:
            target = today + timedelta(days=offset)
            label = f"{weekday_short[target.weekday()]} {target.day}/{target.month}"
            options.append((target.isoformat(), label))
        return options

    def _build_reschedule_date_picker_result(
        self,
        *,
        channel: str,
        booking_reference: str,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        body = self._localized(
            "reschedule_date_prompt",
            locale,
            booking_reference=booking_reference,
        )
        date_options = self._reschedule_date_options()
        rows: list[list[dict[str, object]]] = []
        for index in range(0, len(date_options), 2):
            row = []
            for iso_date, label in date_options[index : index + 2]:
                row.append(
                    {
                        "text": label,
                        "callback_data": f"reschedule:time:{booking_reference}:{iso_date}",
                    }
                )
            rows.append(row)
        rows.append(
            [
                {
                    "text": self._localized("reschedule_back_to_booking", locale),
                    "callback_data": f"Keep current booking {booking_reference}",
                }
            ]
        )
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="reschedule_date_picker",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "reschedule_date_picker",
                "booking_reference": booking_reference,
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": {"inline_keyboard": rows},
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    def _build_reschedule_time_picker_result(
        self,
        *,
        channel: str,
        booking_reference: str,
        selected_date: str,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        body = self._localized(
            "reschedule_time_prompt",
            locale,
            booking_reference=booking_reference,
            selected_date=selected_date,
        )
        slots = list(self.RESCHEDULE_TIME_SLOTS)
        rows: list[list[dict[str, object]]] = []
        for index in range(0, len(slots), 2):
            row = []
            for slot in slots[index : index + 2]:
                row.append(
                    {
                        "text": slot,
                        "callback_data": f"reschedule:confirm:{booking_reference}:{selected_date}:{slot}",
                    }
                )
            rows.append(row)
        rows.append(
            [
                {
                    "text": self._localized("reschedule_back_to_dates", locale),
                    "callback_data": f"reschedule:date:{booking_reference}",
                }
            ]
        )
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="reschedule_time_picker",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "reschedule_time_picker",
                "booking_reference": booking_reference,
                "selected_date": selected_date,
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": {"inline_keyboard": rows},
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    async def _handle_reschedule_confirm(
        self,
        session,
        *,
        channel: str,
        booking_reference: str,
        selected_date: str,
        selected_time: str,
        identity_metadata: dict[str, object],
        locale: str,
        customer_phone: str | None,
        customer_email: str | None,
    ) -> MessagingAutomationResult:
        queued_request = await queue_portal_booking_request(
            session,
            booking_reference=booking_reference,
            request_type="reschedule_request",
            customer_note=(
                f"Customer requested reschedule via inline picker: {selected_date} {selected_time}"
            ),
            preferred_date=selected_date,
            preferred_time=selected_time,
            timezone="Australia/Sydney",
        )
        body = self._localized(
            "reschedule_confirmed",
            locale,
            booking_reference=booking_reference,
            selected_date=selected_date,
            selected_time=selected_time,
        )
        if not queued_request:
            body = self._localized(
                "reschedule_could_not_queue",
                locale,
                booking_reference=booking_reference,
            )
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="reschedule_confirmed" if queued_request else "reschedule_failed",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": (
                    "reschedule_confirmed" if queued_request else "reschedule_failed"
                ),
                "booking_reference": booking_reference,
                "selected_date": selected_date,
                "selected_time": selected_time,
                "queued_request": queued_request,
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": {
                        "inline_keyboard": [
                            [
                                {
                                    "text": self._localized(
                                        "reschedule_back_to_booking", locale
                                    ),
                                    "callback_data": f"Keep current booking {booking_reference}",
                                }
                            ]
                        ]
                    },
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    @staticmethod
    def _support_inline_button(locale: str) -> dict[str, object]:
        return {
            "text": MessagingAutomationService._localized("talk_to_support", locale),
            "callback_data": "/support",
        }

    @classmethod
    def _needs_booking_reference_reply_controls(cls, locale: str) -> dict[str, object]:
        return {
            "telegram_reply_markup": {
                "inline_keyboard": [[cls._support_inline_button(locale)]],
                "keyboard": cls._home_reply_keyboard(locale)["keyboard"],
                "resize_keyboard": True,
                "is_persistent": True,
                "input_field_placeholder": cls._localized("keyboard_placeholder", locale),
            },
            "telegram_parse_mode": "HTML",
        }

    async def _mark_cancel_intent_pending(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        customer_identity: dict[str, object],
        existing_state: dict[str, object] | None = None,
    ) -> None:
        if not conversation_id:
            return
        existing_metadata = (existing_state or {}).get("session_metadata") if existing_state else {}
        if not isinstance(existing_metadata, dict):
            existing_metadata = {}
        merged_metadata = {
            **existing_metadata,
            "cancel_intent_pending": True,
            "cancel_intent_recorded_at": datetime.now(UTC).isoformat(),
        }
        await self._upsert_channel_session_state(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=customer_identity,
            service_search_query=(existing_state or {}).get("service_search_query"),
            service_options=[
                item
                for item in ((existing_state or {}).get("service_options") or [])
                if isinstance(item, dict)
            ],
            reply_controls=(existing_state or {}).get("reply_controls") or {},
            last_ai_intent="cancel_intent_pending",
            last_workflow_status="answered",
            metadata=merged_metadata,
        )

    async def _clear_cancel_intent_pending(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        customer_identity: dict[str, object],
        existing_state: dict[str, object] | None = None,
    ) -> None:
        if not conversation_id:
            return
        existing_metadata = (existing_state or {}).get("session_metadata") if existing_state else {}
        if not isinstance(existing_metadata, dict) or not existing_metadata.get("cancel_intent_pending"):
            return
        cleared = {
            key: value
            for key, value in existing_metadata.items()
            if key not in {"cancel_intent_pending", "cancel_intent_recorded_at"}
        }
        await self._upsert_channel_session_state(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=customer_identity,
            service_search_query=(existing_state or {}).get("service_search_query"),
            service_options=[
                item
                for item in ((existing_state or {}).get("service_options") or [])
                if isinstance(item, dict)
            ],
            reply_controls=(existing_state or {}).get("reply_controls") or {},
            last_ai_intent="cancel_intent_cleared",
            last_workflow_status="answered",
            metadata=cleared,
        )

    @classmethod
    def _is_cancel_intent_active(cls, session_metadata: dict[str, object] | None) -> bool:
        if not isinstance(session_metadata, dict):
            return False
        if not session_metadata.get("cancel_intent_pending"):
            return False
        recorded = str(session_metadata.get("cancel_intent_recorded_at") or "").strip()
        if not recorded:
            return True
        try:
            recorded_at = datetime.fromisoformat(recorded)
        except ValueError:
            return True
        if recorded_at.tzinfo is None:
            recorded_at = recorded_at.replace(tzinfo=UTC)
        if datetime.now(UTC) - recorded_at > timedelta(seconds=cls.CANCEL_INTENT_TTL_SECONDS):
            return False
        return True

    SUPPORTED_LOCALES = ("en", "vi")
    DEFAULT_LOCALE = "en"

    LOCALIZED_COPY: dict[str, dict[str, str]] = {
        "welcome": {
            "en": (
                "{greeting} I'm <b>BookedAI Manager Bot</b>. "
                "I can find and book services for you across Australia and online.\n\n"
                "Try one of these:\n"
                "• Tap <b>Find a service</b> below\n"
                "• Or type what you want, e.g. <i>Find a chess class in Sydney this weekend</i>\n"
                "• Send /mybookings to see your active bookings\n"
                "• Send /help anytime to see what I can do"
            ),
            "vi": (
                "{greeting} Mình là <b>BookedAI Manager Bot</b>. "
                "Mình giúp bạn tìm và đặt dịch vụ ở Úc và online.\n\n"
                "Bạn có thể:\n"
                "• Bấm <b>Tìm dịch vụ</b> bên dưới\n"
                "• Hoặc gõ điều bạn muốn, ví dụ <i>Tìm lớp cờ vua ở Sydney cuối tuần này</i>\n"
                "• Gõ /mybookings để xem các booking đang có\n"
                "• Gõ /help bất cứ lúc nào để xem mình hỗ trợ được gì"
            ),
        },
        "welcome_greeting_named": {
            "en": "Hi {name},",
            "vi": "Chào {name},",
        },
        "welcome_greeting_anonymous": {
            "en": "Hi there,",
            "vi": "Xin chào,",
        },
        "search_prompt": {
            "en": (
                "What would you like to find? Reply with the service plus location and time, for example:\n"
                "• <i>Find a chess class in Sydney this weekend</i>\n"
                "• <i>Massage in Surry Hills tomorrow afternoon</i>\n"
                "• <i>AI Mentor 1-1 session next week</i>"
            ),
            "vi": (
                "Bạn muốn tìm gì? Trả lời theo dạng dịch vụ + địa điểm + thời gian, ví dụ:\n"
                "• <i>Tìm lớp cờ vua ở Sydney cuối tuần này</i>\n"
                "• <i>Massage ở Surry Hills chiều mai</i>\n"
                "• <i>AI Mentor 1-1 tuần sau</i>"
            ),
        },
        "mybookings_prompt": {
            "en": (
                "To pull up your booking I need one of:\n"
                "• your booking reference (looks like <code>v1-xxxxxx</code>)\n"
                "• the email used to book\n"
                "• the phone number used to book\n\n"
                "Reply with one of those and I'll show the booking and the actions available."
            ),
            "vi": (
                "Để mở booking của bạn, mình cần một trong các thông tin sau:\n"
                "• mã booking (dạng <code>v1-xxxxxx</code>)\n"
                "• email đã dùng khi đặt\n"
                "• số điện thoại đã dùng khi đặt\n\n"
                "Bạn gửi mình một trong các thông tin trên là mình mở được booking và các thao tác đi kèm."
            ),
        },
        "cancel_prompt": {
            "en": (
                "I can request a cancellation for you. Please reply with the booking reference "
                "(<code>v1-xxxxxx</code>) or the email/phone used to book, and I'll route the cancel "
                "request to the provider. If the booking is already paid, refund handling is provider-led."
            ),
            "vi": (
                "Mình có thể gửi yêu cầu hủy giúp bạn. Bạn gửi mình mã booking "
                "(<code>v1-xxxxxx</code>) hoặc email/số điện thoại đã đặt, mình sẽ chuyển yêu cầu hủy "
                "cho nhà cung cấp. Nếu đã thanh toán, việc hoàn tiền do nhà cung cấp xử lý."
            ),
        },
        "support_handoff": {
            "en": (
                "I've flagged this conversation for a BookedAI human teammate. "
                "Someone will jump in here within business hours.\n\n"
                "If it's urgent, email <b>{support_email}</b> with your booking reference and the "
                "question. Meanwhile I'll keep listening here."
            ),
            "vi": (
                "Mình đã chuyển hội thoại này tới đội hỗ trợ BookedAI. "
                "Có người sẽ vào trả lời bạn trong giờ làm việc.\n\n"
                "Nếu gấp, bạn email <b>{support_email}</b> kèm mã booking và câu hỏi. "
                "Trong lúc đó mình vẫn theo dõi tin nhắn ở đây."
            ),
        },
        "keyboard_find_service": {"en": "Find a service", "vi": "Tìm dịch vụ"},
        "keyboard_my_bookings": {"en": "My bookings", "vi": "Booking của tôi"},
        "keyboard_talk_support": {"en": "Talk to support", "vi": "Gặp hỗ trợ"},
        "keyboard_placeholder": {
            "en": "Tell me what you want to book…",
            "vi": "Bạn muốn đặt gì? Gõ vào đây…",
        },
        "cancel_confirm_prompt": {
            "en": (
                "Confirm cancellation of booking <code>{booking_reference}</code>?\n\n"
                "Tap <b>Confirm cancel</b> to send the cancel request to the provider, or "
                "<b>Keep booking</b> to leave it untouched."
            ),
            "vi": (
                "Xác nhận hủy booking <code>{booking_reference}</code>?\n\n"
                "Bấm <b>Xác nhận hủy</b> để gửi yêu cầu hủy cho nhà cung cấp, hoặc "
                "<b>Giữ booking</b> để giữ nguyên."
            ),
        },
        "cancel_confirm_yes": {"en": "✅ Confirm cancel", "vi": "✅ Xác nhận hủy"},
        "cancel_confirm_no": {"en": "↩ Keep booking", "vi": "↩ Giữ booking"},
        "talk_to_support": {"en": "👤 Talk to support", "vi": "👤 Gặp hỗ trợ"},
        "reschedule_date_prompt": {
            "en": (
                "Pick a new date for booking <code>{booking_reference}</code>:\n\n"
                "Tap a date below. After picking, you'll choose a time slot. "
                "The provider will confirm the new slot."
            ),
            "vi": (
                "Chọn ngày mới cho booking <code>{booking_reference}</code>:\n\n"
                "Bấm vào một ngày bên dưới. Sau khi chọn ngày, bạn sẽ chọn giờ. "
                "Nhà cung cấp sẽ xác nhận lại lịch mới."
            ),
        },
        "reschedule_time_prompt": {
            "en": (
                "New date: <b>{selected_date}</b> for booking <code>{booking_reference}</code>.\n\n"
                "Pick a time slot below."
            ),
            "vi": (
                "Ngày mới: <b>{selected_date}</b> cho booking <code>{booking_reference}</code>.\n\n"
                "Bấm chọn khung giờ bên dưới."
            ),
        },
        "reschedule_confirmed": {
            "en": (
                "Reschedule request sent.\n"
                "Booking: <code>{booking_reference}</code>\n"
                "New slot: <b>{selected_date} {selected_time}</b>\n\n"
                "The provider will confirm. We'll keep you posted here."
            ),
            "vi": (
                "Đã gửi yêu cầu đổi lịch.\n"
                "Booking: <code>{booking_reference}</code>\n"
                "Lịch mới: <b>{selected_date} {selected_time}</b>\n\n"
                "Nhà cung cấp sẽ xác nhận. Mình sẽ cập nhật lại ở đây."
            ),
        },
        "reschedule_could_not_queue": {
            "en": (
                "I couldn't queue the reschedule request for <code>{booking_reference}</code> "
                "right now. Please try again or tap Talk to support."
            ),
            "vi": (
                "Mình không gửi được yêu cầu đổi lịch cho <code>{booking_reference}</code> "
                "lúc này. Bạn thử lại hoặc bấm Gặp hỗ trợ."
            ),
        },
        "reschedule_back_to_booking": {
            "en": "↩ Back to booking",
            "vi": "↩ Về booking",
        },
        "reschedule_back_to_dates": {
            "en": "↩ Pick a different date",
            "vi": "↩ Chọn ngày khác",
        },
    }

    CANCEL_INTENT_TTL_SECONDS = 600

    @classmethod
    def _resolve_locale(cls, language_code: str | None) -> str:
        raw = str(language_code or "").strip().lower()
        if not raw:
            return cls.DEFAULT_LOCALE
        primary = raw.split("-", 1)[0].split("_", 1)[0]
        if primary in cls.SUPPORTED_LOCALES:
            return primary
        return cls.DEFAULT_LOCALE

    @classmethod
    def _localized(cls, key: str, locale: str, **format_args: str) -> str:
        catalog = cls.LOCALIZED_COPY.get(key) or {}
        text = catalog.get(locale) or catalog.get(cls.DEFAULT_LOCALE) or ""
        if format_args and text:
            try:
                return text.format(**format_args)
            except (KeyError, IndexError):
                return text
        return text

    @classmethod
    def _home_reply_keyboard(cls, locale: str = DEFAULT_LOCALE) -> dict[str, object]:
        return {
            "keyboard": [
                [
                    {"text": cls._localized("keyboard_find_service", locale)},
                    {"text": cls._localized("keyboard_my_bookings", locale)},
                ],
                [{"text": cls._localized("keyboard_talk_support", locale)}],
            ],
            "resize_keyboard": True,
            "is_persistent": True,
            "input_field_placeholder": cls._localized("keyboard_placeholder", locale),
        }

    @classmethod
    def _reply_keyboard_intent(cls, message: str) -> str | None:
        text = str(message or "").strip().lower()
        if not text:
            return None
        mapping = {
            "find a service": "search",
            "find service": "search",
            "my bookings": "mybookings",
            "mybookings": "mybookings",
            "talk to support": "support",
            "support": "support",
            # Vietnamese keyboard labels (and tolerated variants)
            "tìm dịch vụ": "search",
            "tim dich vu": "search",
            "booking của tôi": "mybookings",
            "booking cua toi": "mybookings",
            "gặp hỗ trợ": "support",
            "gap ho tro": "support",
            "hỗ trợ": "support",
            "ho tro": "support",
        }
        return mapping.get(text)
