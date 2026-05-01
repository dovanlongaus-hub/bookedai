from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
from html import escape
import json
import logging
import os
import re
import unicodedata
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode, urlparse
from uuid import uuid4

from sqlalchemy import desc, func, or_, select, text as sql_text

from core.customer_booking_contact import DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL
from core.portal_tokens import PortalTokenError, generate_portal_access_token
from rate_limit import InMemoryRateLimiter
from db import ConversationEvent, MessagingChannelSession, ServiceMerchantProfile
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.contact_repository import ContactRepository
from repositories.lead_repository import LeadRepository
from repositories.tenant_repository import TenantRepository
from schemas import TawkMessage
from service_layer.calls_scheduling import build_qr_code_url
from service_layer.communication_service import CommunicationService
from service_layer.lifecycle_ops_service import (
    orchestrate_booking_cancelled,
    orchestrate_booking_rescheduled,
)
from service_layer.messaging_experiments import (
    assign_arm,
    experiment_arm_summary,
    merge_assignments,
)
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

_logger = logging.getLogger(__name__)


# Per-chat-id inbound abuse guardrail. Default: 30 messages per hour per
# (channel, chat_id) pair. On exceed we silently DROP the inbound message —
# replying confirms receipt and helps an attacker calibrate timing, so we
# would rather appear unresponsive than chatty under abuse. Tuneable via
# BOOKEDAI_MESSAGING_PER_CHAT_LIMIT and BOOKEDAI_MESSAGING_PER_CHAT_WINDOW_SECONDS.
def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(str(raw).strip())
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


MESSAGING_PER_CHAT_LIMIT = _env_int("BOOKEDAI_MESSAGING_PER_CHAT_LIMIT", 30)
MESSAGING_PER_CHAT_WINDOW_SECONDS = _env_int(
    "BOOKEDAI_MESSAGING_PER_CHAT_WINDOW_SECONDS", 3600
)

# Bot voice-out: when enabled, if the user originally sent a voice message
# on Telegram we synthesize the assistant reply via Piper TTS and attach
# the audio to the outbound payload so the route handler can send it via
# Telegram sendVoice. Default OFF — flip to "true" to activate once a Piper
# service is reachable from the bot host.
ENABLE_BOT_VOICE_OUT = os.getenv("ENABLE_BOT_VOICE_OUT", "false").lower() in (
    "true",
    "1",
    "yes",
)

_messaging_per_chat_limiter = InMemoryRateLimiter()


def _hash_chat_id(value: str) -> str:
    """Stable, non-reversible hash of a chat_id for structured logs.

    We never log the raw chat_id (privacy / GDPR). Using a truncated SHA-256
    digest gives enough uniqueness to correlate repeat offenders without
    leaking the source identifier.
    """

    if not value:
        return "anon"
    return sha256(value.encode("utf-8", errors="ignore")).hexdigest()[:16]


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

        # Voice STT — runs BEFORE the rate limiter / slash dispatch so the
        # downstream pipeline sees a normal text message. Telegram-only for
        # v1; WhatsApp voice (different audio format + auth flow) is deferred.
        voice_failure = await self._maybe_transcribe_voice(
            channel=normalized_channel,
            message=message,
            metadata=metadata,
        )
        if voice_failure is not None:
            return voice_failure

        conversation_key = self._conversation_key(message=message, metadata=metadata)

        # Per-chat-id inbound rate limit (Lane 6 §5 P2 guardrail). Silently
        # drop messages once a single (channel, chat_id) pair exceeds 30
        # messages/hour — replying confirms receipt to an abusive sender and
        # hands them a calibration signal. Failure inside the limiter must
        # not break the dispatcher, so we fail open on any internal error.
        if conversation_key:
            try:
                bucket_key = f"messaging_inbound:{normalized_channel}:{conversation_key}"
                acquired = await _messaging_per_chat_limiter.try_acquire(
                    bucket_key,
                    limit=MESSAGING_PER_CHAT_LIMIT,
                    window_seconds=MESSAGING_PER_CHAT_WINDOW_SECONDS,
                )
                if not acquired:
                    _logger.warning(
                        "messaging_rate_limit_exceeded channel=%s chat_id_hash=%s limit=%s window_seconds=%s",
                        normalized_channel,
                        _hash_chat_id(conversation_key),
                        MESSAGING_PER_CHAT_LIMIT,
                        MESSAGING_PER_CHAT_WINDOW_SECONDS,
                        extra={
                            "event_type": "messaging_rate_limit_exceeded",
                            "channel": normalized_channel,
                            "chat_id_hash": _hash_chat_id(conversation_key),
                            "limit": MESSAGING_PER_CHAT_LIMIT,
                            "window_seconds": MESSAGING_PER_CHAT_WINDOW_SECONDS,
                        },
                    )
                    return MessagingAutomationResult(
                        ai_reply=None,
                        ai_intent="rate_limited",
                        workflow_status="rate_limited",
                        metadata={
                            "rate_limited": True,
                            "channel": normalized_channel,
                            "chat_id_hash": _hash_chat_id(conversation_key),
                        },
                    )
            except Exception as exc:  # noqa: BLE001
                # Fail-open: never let a broken rate limiter block real traffic.
                _logger.warning("messaging_rate_limit_check_failed: %s", exc)

        customer_phone = self._customer_phone(message=message, metadata=metadata)
        customer_email = self._customer_email(message=message, metadata=metadata)
        identity_metadata = self._customer_identity_metadata(
            channel=normalized_channel,
            customer_email=customer_email,
            customer_phone=customer_phone,
        )

        locale = self._resolve_locale(metadata.get("telegram_language_code"))
        channel_state = await self._load_channel_session_state(
            session,
            channel=normalized_channel,
            conversation_id=conversation_key,
        )
        if self._is_handoff_claimed(
            channel_state.get("session_metadata") if isinstance(channel_state, dict) else None
        ):
            return self._build_handoff_claimed_active_result(
                channel=normalized_channel,
                identity_metadata=identity_metadata,
                locale=locale,
                claim_metadata=channel_state.get("session_metadata") if isinstance(channel_state, dict) else None,
            )

        # Load any prior experiment arm assignments so we can keep them sticky
        # for returning conversations and persist any new arms before the bot's
        # first reply on this conversation goes out.
        prior_channel_state = await self._load_channel_session_state(
            session,
            channel=normalized_channel,
            conversation_id=conversation_key,
        )
        existing_assignments = (
            prior_channel_state.get("session_metadata") or {}
        ).get("experiment_assignments") or {}
        if not isinstance(existing_assignments, dict):
            existing_assignments = {}
        welcome_arm = assign_arm(
            "welcome_copy_v1",
            conversation_key,
            existing_assignments=existing_assignments,
        )
        merged_assignments = merge_assignments(
            existing_assignments,
            {"welcome_copy_v1": welcome_arm},
        )

        # Phase C: route_handlers._apply_handoff_session_context has already
        # consumed the customer_handoff_sessions row (if any) and rewritten
        # message.text in place. We just need to map the residual
        # start_command_kind back to a downstream-friendly value so the rest of
        # the pipeline doesn't see "handoff_session" — it should behave as if
        # the customer had typed the recovered context themselves (booking-ref
        # → booking-care, service_query → search, empty/unknown → welcome).
        if (
            normalized_channel == "telegram"
            and str(metadata.get("start_command_kind") or "") == "handoff_session"
        ):
            payload = metadata.get("handoff_session_payload")
            if isinstance(payload, dict):
                if str(payload.get("booking_reference") or "").strip():
                    metadata["start_command_kind"] = "booking_reference"
                elif str(payload.get("service_query") or "").strip() or str(
                    payload.get("service_slug") or ""
                ).strip():
                    metadata["start_command_kind"] = "service_search"
                else:
                    metadata["start_command_kind"] = "welcome"
            else:
                metadata["start_command_kind"] = "welcome"

        if (
            normalized_channel == "telegram"
            and str(metadata.get("start_command_kind") or "") == "welcome"
        ):
            return await self._build_welcome_result(
                session,
                channel=normalized_channel,
                conversation_id=conversation_key,
                tenant_id=str(metadata.get("tenant_ref") or "").strip() or None,
                message=message,
                identity_metadata=identity_metadata,
                locale=locale,
                welcome_arm=welcome_arm,
                experiment_assignments=merged_assignments,
            )

        tenant_ref = str(metadata.get("tenant_ref") or "").strip() or None

        slash_intent, slash_args = self._parse_slash_command(message.text)
        cancel_intent_locked = False

        # ── Phase 2: AIMentor in-Telegram booking flow ──────────────────────
        # 1) Honour an active book-flow state machine first (collecting
        #    name → email → phone → confirming). Any free-text message
        #    while a state is active should advance/reset that state, not
        #    be re-routed through the regular intent dispatcher.
        # 2) Detect Telegram inline-keyboard callbacks. The webhook layer
        #    has already mapped callback_data → message.text, so we look
        #    for the `aim:program:` / `aim:slot:` prefixes here.
        # 3) Promote free-text "programs" / "khoá học" / "courses" to the
        #    same handler as the /programs slash command for parity.
        active_book_state = self._active_book_intent_state(
            channel_state.get("session_metadata") if isinstance(channel_state, dict) else None
        )
        if normalized_channel == "telegram" and active_book_state:
            book_state_result = await self._handle_book_state_machine(
                session,
                channel=normalized_channel,
                conversation_id=conversation_key,
                tenant_id=tenant_ref,
                identity_metadata=identity_metadata,
                locale=locale,
                message=message,
                metadata=metadata,
                existing_state=channel_state,
                state=active_book_state,
            )
            if book_state_result is not None:
                return book_state_result

        if normalized_channel == "telegram":
            raw_text = str(message.text or "").strip()
            if raw_text.startswith("aim:program:"):
                service_id = raw_text[len("aim:program:") :].strip()
                return await self._handle_program_pick(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=tenant_ref,
                    identity_metadata=identity_metadata,
                    locale=locale,
                    service_id=service_id,
                    existing_state=channel_state,
                )
            if raw_text.startswith("aim:slot:"):
                payload = raw_text[len("aim:slot:") :].strip()
                # Format: aim:slot:<service_id>:<starts_at_iso>
                # Note: ISO timestamps contain ':' so split on first ':'
                # and treat the rest as starts_at.
                if ":" in payload:
                    slot_service_id, _, slot_starts_at = payload.partition(":")
                    return await self._handle_slot_pick(
                        session,
                        channel=normalized_channel,
                        conversation_id=conversation_key,
                        tenant_id=tenant_ref,
                        identity_metadata=identity_metadata,
                        locale=locale,
                        service_id=slot_service_id.strip(),
                        starts_at_iso=slot_starts_at.strip(),
                        existing_state=channel_state,
                    )
            if slash_intent is None and self._is_programs_keyword_intent(message.text):
                slash_intent = "programs"

        if slash_intent == "programs":
            return await self._handle_programs_list(
                session,
                channel=normalized_channel,
                conversation_id=conversation_key,
                tenant_id=tenant_ref,
                identity_metadata=identity_metadata,
                locale=locale,
                existing_state=channel_state,
            )

        if slash_intent == "help":
            return await self._build_welcome_result(
                session,
                channel=normalized_channel,
                conversation_id=conversation_key,
                tenant_id=str(metadata.get("tenant_ref") or "").strip() or None,
                message=message,
                identity_metadata=identity_metadata,
                locale=locale,
                welcome_arm=welcome_arm,
                experiment_assignments=merged_assignments,
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
                recent_reference = self._recent_booking_reference(
                    channel_state.get("session_metadata") if isinstance(channel_state, dict) else None
                )
                if recent_reference:
                    message.text = recent_reference
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
            return await self._dispatch_support_handoff(
                session,
                channel=normalized_channel,
                conversation_id=conversation_key,
                tenant_id=tenant_ref,
                channel_state=channel_state,
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
                recent_reference = self._recent_booking_reference(
                    channel_state.get("session_metadata") if isinstance(channel_state, dict) else None
                )
                if recent_reference:
                    message.text = recent_reference
                else:
                    return self._build_my_bookings_prompt_result(
                        channel=normalized_channel,
                        message=message,
                        identity_metadata=identity_metadata,
                        locale=locale,
                    )
            if keyboard_intent == "support":
                return await self._dispatch_support_handoff(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=tenant_ref,
                    channel_state=channel_state,
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

        cancel_confirm_decision = self._parse_cancel_confirm_callback(
            message.text,
            session_metadata=channel_state.get("session_metadata") if isinstance(channel_state, dict) else None,
        )
        if cancel_confirm_decision is not None:
            decision, decision_booking_ref = cancel_confirm_decision
            if decision == "yes":
                return await self._handle_cancel_confirm(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=tenant_ref,
                    booking_reference=decision_booking_ref,
                    identity_metadata=identity_metadata,
                    locale=locale,
                    customer_phone=customer_phone,
                    customer_email=customer_email,
                    existing_state=channel_state,
                    cancel_reason=message.text,
                )
            if decision == "no":
                await self._clear_cancel_intent_pending(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=tenant_ref,
                    customer_identity=identity_metadata,
                    existing_state=channel_state,
                )
                return MessagingAutomationResult(
                    ai_reply=self._localized("cancel_kept", locale),
                    ai_intent="cancel_kept",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(normalized_channel),
                        "customer_identity": identity_metadata,
                        "customer_care_status": "cancel_kept",
                        "booking_reference": decision_booking_ref,
                        "locale": locale,
                    },
                )

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
            and resolution.get("resolved_by") == "message_booking_reference"
            and not customer_phone
            and not customer_email
            and prior_booking_reference != booking_reference
        ):
            return MessagingAutomationResult(
                ai_reply=(
                    "I found that booking reference, but I need to verify it belongs to you before "
                    "I show booking details or queue a change. Please reply with the email or phone "
                    "used for the booking, or open the secure portal link from your confirmation."
                ),
                ai_intent="identity_verification_required",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(normalized_channel),
                    "customer_identity": identity_metadata,
                    "customer_care_status": "identity_verification_required",
                    "booking_reference": booking_reference,
                    "booking_resolution": {
                        **resolution,
                        "identity_gate": "booking_reference_requires_contact_or_same_conversation",
                    },
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
                # Keep the cancel intent pending and stash the booking
                # reference so a bare YES/NO reply on the next turn can
                # resolve to this booking.
                await self._mark_cancel_intent_pending(
                    session,
                    channel=normalized_channel,
                    conversation_id=conversation_key,
                    tenant_id=tenant_ref,
                    customer_identity=identity_metadata,
                    existing_state=channel_state,
                    booking_reference=booking_reference,
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

        await self._remember_recent_booking_reference(
            session,
            channel=normalized_channel,
            conversation_id=conversation_key,
            tenant_id=tenant_ref,
            customer_identity=identity_metadata,
            booking_reference=booking_reference,
            existing_state=channel_state,
        )
        reply_controls = self._booking_care_reply_controls(booking_reference)
        # Bot voice-out: if the user originally sent a voice message and the
        # feature flag is on, synthesize the reply via Piper and stash audio
        # bytes in reply_controls so the route handler can sendVoice. We do
        # this at the LAST possible point (after queued_request append) so
        # the audio mirrors the final assistant text the user will see.
        user_spoke = bool(metadata.get("voice")) if isinstance(metadata, dict) else False
        voice_audio = await self._maybe_synthesize_voice_reply(
            reply_text=reply,
            channel=normalized_channel,
            user_spoke=user_spoke,
        )
        if voice_audio:
            reply_controls.setdefault("telegram_voice_audio", voice_audio)

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
                "reply_controls": reply_controls,
            },
        )

    async def _maybe_synthesize_voice_reply(
        self,
        *,
        reply_text: str,
        channel: str,
        user_spoke: bool,
    ) -> dict | None:
        """If voice-out is enabled AND the user originally sent voice AND
        channel is Telegram, synthesize the reply text via Piper and return
        audio metadata. Returns None to skip voice-out (fall through to
        text-only reply).

        Errors are caught and logged — voice is a bonus, never critical, so
        any Piper failure must NOT break the text reply path.
        """
        if not ENABLE_BOT_VOICE_OUT:
            return None
        if channel != "telegram":
            return None
        if not user_spoke:
            return None  # user typed — don't surprise them with audio
        if not reply_text or not reply_text.strip():
            return None
        if len(reply_text) > 800:
            return None  # too long for a voice reply; let text reply handle it
        try:
            from integrations.piper.piper_adapter import (
                PiperAdapter,
                PiperAdapterError,
            )

            adapter = PiperAdapter.from_env()
            result = await adapter.synthesize(reply_text)
            return {
                "audio_bytes": result.audio_bytes,
                "audio_format": result.audio_format,
                "voice": result.voice,
                "latency_ms": result.latency_ms,
                # Piper-medium ~ 1 char per 60ms; rough estimate omitted for v1.
                "duration_seconds": None,
            }
        except PiperAdapterError as exc:
            _logger.warning(
                "bot_voice_out_failed",
                extra={"channel": channel, "error": str(exc), "len": len(reply_text)},
            )
            return None
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "bot_voice_out_failed",
                extra={"channel": channel, "error": str(exc), "len": len(reply_text)},
            )
            return None

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
            result = await communication_service.send_whatsapp(
                to=recipient,
                body=body,
                reply_markup=reply_markup,
                parse_mode=parse_mode,
            )
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

    RECENT_BOOKING_REFERENCE_TTL_SECONDS = 60 * 60 * 6

    @classmethod
    def _recent_booking_reference(cls, session_metadata: dict[str, object] | None) -> str | None:
        if not isinstance(session_metadata, dict):
            return None
        reference = str(session_metadata.get("recent_booking_reference") or "").strip()
        if not reference:
            return None
        recorded = str(session_metadata.get("recent_booking_recorded_at") or "").strip()
        if not recorded:
            return reference
        try:
            recorded_at = datetime.fromisoformat(recorded)
        except ValueError:
            return reference
        if recorded_at.tzinfo is None:
            recorded_at = recorded_at.replace(tzinfo=UTC)
        if datetime.now(UTC) - recorded_at > timedelta(seconds=cls.RECENT_BOOKING_REFERENCE_TTL_SECONDS):
            return None
        return reference

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
            "/programs": "programs",
            "/program": "programs",
            "/courses": "programs",
            "/course": "programs",
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
            amount_value = float(amount) if isinstance(amount, (int, float)) and amount > 0 else None
            price = display_price or (f"AUD {amount:g}" if amount_value else "Price TBC")
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
                "amount_aud": amount_value,
                "currency_code": "AUD",
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
            f"<b>Search</b>: {MessagingAutomationService._html(MessagingAutomationService._truncate_text(query, limit=64))}",
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
                lines.append(f"<b>Provider</b>: {MessagingAutomationService._html(provider)}")
            detail_bits = [bit for bit in (location, price, source_label) if bit]
            if detail_bits:
                lines.append(MessagingAutomationService._html(" | ".join(detail_bits)))
            if summary:
                lines.append(MessagingAutomationService._html(summary))
            lines.append(f"<b>Book {MessagingAutomationService._html(option_index)}</b>: send name + email/phone + time.")
            lines.append("")
        lines.extend(
            [
                "<b>Choose below</b>: View, Book, or open the full BookedAI form.",
                (
                    "Need different options? Tap <b>Search more</b>."
                    if not public_web_requested
                    else f"More info: <a href=\"{BOOKEDAI_PUBLIC_URL}\">bookedai.au</a>"
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
    def _portal_booking_url(booking_reference: str, *, access_token: str | None = None) -> str:
        params = {"booking_reference": booking_reference}
        if access_token:
            params["token"] = access_token
        return BOOKEDAI_PORTAL_URL + "/?" + urlencode(params)

    @staticmethod
    def _portal_qr_url(booking_reference: str, *, access_token: str | None = None) -> str:
        return build_qr_code_url(
            MessagingAutomationService._portal_booking_url(
                booking_reference,
                access_token=access_token,
            )
        )

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
                "<b>Current booking</b>",
                f"<code>{MessagingAutomationService._html(booking_reference)}</code>",
                f"<b>Portal</b>: <a href=\"{MessagingAutomationService._html(portal_url)}\">open order</a>",
                f"<b>QR</b>: <a href=\"{MessagingAutomationService._html(qr_url)}\">open QR code</a>",
                "",
                f"<b>New search</b>: {MessagingAutomationService._html(MessagingAutomationService._truncate_text(query, limit=64))}",
                "BookedAI.au: choose what should happen with the current booking.",
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
        portal_access_token: str | None = None
        try:
            issued_portal_token = generate_portal_access_token(booking_reference)
            stored_portal_token = await booking_repository.store_portal_access_token(
                booking_reference=booking_reference,
                token_hash=issued_portal_token.token_hash,
                expires_at=issued_portal_token.expires_at,
            )
            if stored_portal_token:
                portal_access_token = issued_portal_token.plaintext
        except PortalTokenError:
            _logger.warning(
                "messaging_booking_portal_token_issue_failed",
                extra={
                    "event_type": "messaging_booking_portal_token_issue_failed",
                    "tenant_id": tenant_id,
                    "booking_reference": booking_reference,
                    "channel": channel,
                },
            )
        except Exception:
            _logger.warning(
                "messaging_booking_portal_token_persist_failed",
                extra={
                    "event_type": "messaging_booking_portal_token_persist_failed",
                    "tenant_id": tenant_id,
                    "booking_reference": booking_reference,
                    "channel": channel,
                },
                exc_info=True,
            )
        await session.commit()

        portal_url = self._portal_booking_url(
            booking_reference,
            access_token=portal_access_token,
        )
        qr_code_url = self._portal_qr_url(
            booking_reference,
            access_token=portal_access_token,
        )
        payment_line = (
            "Payment pending. We will send the next step here."
        )
        reply = (
            "<b>Booking started</b>\n"
            f"<b>Service</b>: {self._html(service_name)}\n"
            f"<b>Ref</b>: <code>{self._html(booking_reference)}</code> (tap to copy)\n"
            "<b>Status</b>: pending\n"
            f"<b>Portal</b>: <a href=\"{self._html(portal_url)}\">open order</a>\n"
            f"{self._html(payment_line)}\n\n"
            "<b>Choose below</b>: view, change, cancel, or search new."
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
                    "portal_access_token_issued": portal_access_token is not None,
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
                    "amount_aud": (
                        float(selected_option.get("amount_aud"))
                        if isinstance(selected_option.get("amount_aud"), (int, float))
                        and selected_option.get("amount_aud") > 0
                        else None
                    ),
                    "currency_code": str(selected_option.get("currency_code") or "AUD").upper() or "AUD",
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
            f"{greeting} I can help you start a new booking.\n"
            "What would you like to book?\n"
            "Send service + suburb/online + preferred time.\n"
            "Already booked? Send your booking ref.\n"
            f"{channel_hint}"
        )

    async def _build_welcome_result(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        message: TawkMessage,
        identity_metadata: dict[str, object],
        locale: str = "en",
        welcome_arm: str = "control",
        experiment_assignments: dict[str, str] | None = None,
    ) -> MessagingAutomationResult:
        sender_name = escape(str(message.sender_name or "").strip())
        greeting = (
            self._localized("welcome_greeting_named", locale, name=sender_name)
            if sender_name
            else self._localized("welcome_greeting_anonymous", locale)
        )
        body_key = "welcome_copy_concise" if welcome_arm == "concise" else "welcome"
        body = self._localized(body_key, locale, greeting=greeting)
        assignments = experiment_assignments or {"welcome_copy_v1": welcome_arm}
        experiments_summary = experiment_arm_summary(assignments)
        reply_controls = {
            "telegram_reply_markup": self._home_reply_keyboard(locale),
            "telegram_parse_mode": "HTML",
        }
        # Persist the assignment before the bot's first reply on this
        # conversation goes out so analytics can attribute the welcome reply
        # back to the assigned arm.
        await self._upsert_channel_session_state(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=identity_metadata,
            service_search_query=None,
            service_options=[],
            reply_controls=reply_controls,
            last_ai_intent="welcome",
            last_workflow_status="answered",
            metadata={
                "source": "welcome",
                "experiment_assignments": assignments,
            },
        )
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="welcome",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "welcome",
                "locale": locale,
                "reply_controls": reply_controls,
                "experiments": experiments_summary,
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

    def _build_support_handoff_recent_result(
        self,
        *,
        channel: str,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        body = self._localized(
            "support_handoff_recent",
            locale,
            support_email=DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
        )
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="support_handoff_recent",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "support_handoff_recent",
                "human_handoff_requested": False,
                "support_handoff_debounced": True,
                "locale": locale,
                "reply_controls": {
                    "telegram_reply_markup": self._home_reply_keyboard(locale),
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    HANDOFF_CLAIMED_TTL_SECONDS = 60 * 60 * 4

    def _build_handoff_claimed_active_result(
        self,
        *,
        channel: str,
        identity_metadata: dict[str, object],
        locale: str = "en",
        claim_metadata: dict[str, object] | None = None,
    ) -> MessagingAutomationResult:
        body = self._localized("handoff_claimed_active", locale)
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="handoff_claimed_active",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "handoff_claimed_active",
                "human_handoff_active": True,
                "human_handoff_claimed_by": str(
                    (claim_metadata or {}).get("handoff_claimed_by") or ""
                ).strip() or None,
                "human_handoff_claimed_at": str(
                    (claim_metadata or {}).get("handoff_claimed_at") or ""
                ).strip() or None,
                "locale": locale,
                "reply_controls": {
                    "telegram_parse_mode": "HTML",
                },
            },
        )

    async def _dispatch_support_handoff(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        channel_state: dict[str, object] | None,
        message: TawkMessage,
        identity_metadata: dict[str, object],
        locale: str = "en",
    ) -> MessagingAutomationResult:
        if self._is_support_handoff_recent(
            (channel_state or {}).get("session_metadata") if isinstance(channel_state, dict) else None
        ):
            return self._build_support_handoff_recent_result(
                channel=channel,
                identity_metadata=identity_metadata,
                locale=locale,
            )
        await self._mark_support_handoff_dispatched(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=identity_metadata,
            existing_state=channel_state,
        )
        return self._build_support_handoff_result(
            channel=channel,
            message=message,
            identity_metadata=identity_metadata,
            locale=locale,
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
        tenant_id: str | None = None,
        new_slot_id: str | None = None,
        new_timezone: str = "Australia/Sydney",
    ) -> MessagingAutomationResult:
        # Combine selected_date + selected_time into a timezone-aware datetime.
        new_start_at = self._combine_picker_datetime(
            selected_date, selected_time, timezone_name=new_timezone
        )
        actor_id = (
            customer_phone
            or customer_email
            or str(identity_metadata.get("chat_id") or "").strip()
            or None
        )
        orchestrator_status: str | None = None
        orchestrator_result: dict[str, object] | None = None
        queued_request: dict[str, object] | None = None

        if new_start_at is not None and tenant_id:
            try:
                orchestrator_result = await orchestrate_booking_rescheduled(
                    session,
                    tenant_id=tenant_id,
                    booking_reference=booking_reference,
                    new_start_at=new_start_at,
                    actor_type="customer_message",
                    channel=channel,
                    new_slot_id=new_slot_id,
                    new_timezone=new_timezone,
                    actor_id=actor_id,
                )
                orchestrator_status = str(orchestrator_result.get("status") or "").strip().lower()
            except Exception:  # pragma: no cover - defensive
                _logger.exception("orchestrate_booking_rescheduled_failed")
                orchestrator_status = "failed"

        if orchestrator_status == "rescheduled":
            body = self._localized(
                "reschedule_confirmed",
                locale,
                booking_reference=booking_reference,
                selected_date=selected_date,
                selected_time=selected_time,
            )
            ai_intent = "reschedule_confirmed"
            care_status = "reschedule_confirmed"
        elif orchestrator_status == "not_reschedulable":
            body = self._localized(
                "reschedule_failed_state",
                locale,
                booking_reference=booking_reference,
            )
            ai_intent = "reschedule_failed"
            care_status = "reschedule_failed_state"
        elif orchestrator_status == "not_found":
            body = self._localized(
                "reschedule_failed_not_found",
                locale,
                booking_reference=booking_reference,
            )
            ai_intent = "reschedule_failed"
            care_status = "reschedule_failed_not_found"
        else:
            # Fallback: keep legacy queue so a human can still handle it.
            queued_request = await queue_portal_booking_request(
                session,
                booking_reference=booking_reference,
                request_type="reschedule_request",
                customer_note=(
                    f"Customer requested reschedule via inline picker: {selected_date} {selected_time}"
                ),
                preferred_date=selected_date,
                preferred_time=selected_time,
                timezone=new_timezone,
            )
            if queued_request:
                body = self._localized(
                    "reschedule_confirmed",
                    locale,
                    booking_reference=booking_reference,
                    selected_date=selected_date,
                    selected_time=selected_time,
                )
                ai_intent = "reschedule_confirmed"
                care_status = "reschedule_confirmed"
            else:
                body = self._localized(
                    "reschedule_failed_generic",
                    locale,
                    booking_reference=booking_reference,
                )
                ai_intent = "reschedule_failed"
                care_status = "reschedule_failed_generic"

        # Always clear any reschedule intent metadata on the session.
        await self._clear_reschedule_intent_pending(
            session,
            channel=channel,
            conversation_id=str(identity_metadata.get("conversation_id") or "").strip() or None,
            tenant_id=tenant_id,
            customer_identity=identity_metadata,
        )

        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent=ai_intent,
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": care_status,
                "booking_reference": booking_reference,
                "selected_date": selected_date,
                "selected_time": selected_time,
                "orchestrator_status": orchestrator_status,
                "orchestrator_result": orchestrator_result,
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
    def _combine_picker_datetime(
        selected_date: str,
        selected_time: str,
        *,
        timezone_name: str = "Australia/Sydney",
    ) -> datetime | None:
        try:
            from zoneinfo import ZoneInfo

            tz = ZoneInfo(timezone_name)
        except Exception:  # pragma: no cover - fallback to UTC if zoneinfo missing
            tz = UTC
        raw = f"{str(selected_date or '').strip()} {str(selected_time or '').strip()}"
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
            try:
                naive = datetime.strptime(raw, fmt)
                return naive.replace(tzinfo=tz)
            except ValueError:
                continue
        return None

    _CANCEL_YES_TOKENS = frozenset(
        {"yes", "y", "co", "đồng ý", "dong y"}
    )
    _CANCEL_NO_TOKENS = frozenset(
        {"no", "n", "không", "khong", "huỷ", "huy"}
    )

    @classmethod
    def _parse_cancel_confirm_callback(
        cls,
        text: str,
        *,
        session_metadata: dict[str, object] | None = None,
    ) -> tuple[str, str] | None:
        """Detect a YES/NO answer to a cancel-confirm prompt.

        Returns (decision, booking_reference) or None. ``decision`` is one of
        ``'yes'`` / ``'no'``. The booking reference is parsed from the inline
        callback text (``Cancel current booking <ref>`` / ``Keep current
        booking <ref>``) or, when the user typed a bare YES/NO token, from
        ``session_metadata['cancel_intent_booking_reference']``.
        """
        raw = str(text or "").strip()
        if not raw:
            return None
        lowered = raw.lower()
        # Inline-keyboard callback shapes from _build_cancel_confirm_result.
        if lowered.startswith("cancel current booking"):
            ref = raw[len("cancel current booking"):].strip()
            if ref:
                return ("yes", ref)
        if lowered.startswith("keep current booking") and not lowered.startswith(
            "keep current booking, search bookedai.au"
        ) and "and search bookedai.au" not in lowered and "find another booking option" not in lowered:
            ref = raw[len("keep current booking"):].strip()
            if ref:
                return ("no", ref)
        # Bare YES / NO requires a pending cancel intent recorded in metadata.
        normalized = unicodedata.normalize("NFKC", lowered).strip()
        meta = session_metadata if isinstance(session_metadata, dict) else {}
        if not meta.get("cancel_intent_pending"):
            return None
        pending_ref = str(meta.get("cancel_intent_booking_reference") or "").strip()
        if not pending_ref:
            return None
        if normalized in cls._CANCEL_YES_TOKENS:
            return ("yes", pending_ref)
        if normalized in cls._CANCEL_NO_TOKENS:
            return ("no", pending_ref)
        return None

    async def _handle_cancel_confirm(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        booking_reference: str,
        identity_metadata: dict[str, object],
        locale: str,
        customer_phone: str | None,
        customer_email: str | None,
        existing_state: dict[str, object] | None,
        cancel_reason: str | None,
    ) -> MessagingAutomationResult:
        actor_id = (
            customer_phone
            or customer_email
            or str(identity_metadata.get("chat_id") or "").strip()
            or None
        )
        orchestrator_status: str | None = None
        orchestrator_result: dict[str, object] | None = None
        queued_request: dict[str, object] | None = None

        if tenant_id and booking_reference:
            try:
                orchestrator_result = await orchestrate_booking_cancelled(
                    session,
                    tenant_id=tenant_id,
                    booking_reference=booking_reference,
                    actor_type="customer_message",
                    channel=channel,
                    actor_id=actor_id,
                    reason=cancel_reason,
                )
                orchestrator_status = str(orchestrator_result.get("status") or "").strip().lower()
            except Exception:  # pragma: no cover - defensive
                _logger.exception("orchestrate_booking_cancelled_failed")
                orchestrator_status = "failed"

        if orchestrator_status in {"cancelled", "already_cancelled"}:
            ai_intent = "cancel_confirmation"
            care_status = "cancel_confirmation"
            success_result = self._build_cancel_confirm_result(
                channel=channel,
                booking_reference=booking_reference,
                identity_metadata=identity_metadata,
                booking_resolution=None,
                locale=locale,
            )
            body = success_result.ai_reply
            reply_controls = success_result.metadata.get("reply_controls") if success_result.metadata else None
        elif orchestrator_status == "not_found":
            body = self._localized(
                "cancel_failed_not_found", locale, booking_reference=booking_reference
            )
            ai_intent = "cancel_failed"
            care_status = "cancel_failed_not_found"
            reply_controls = None
        else:
            # Fallback queue so a human can still handle.
            queued_request = await queue_portal_booking_request(
                session,
                booking_reference=booking_reference,
                request_type="cancel_request",
                customer_note=cancel_reason,
                preferred_date=None,
                preferred_time=None,
                timezone=None,
            )
            body = self._localized(
                "cancel_failed_generic", locale, booking_reference=booking_reference
            )
            ai_intent = "cancel_failed"
            care_status = "cancel_failed_generic"
            reply_controls = None

        # Always clear cancel intent metadata after a confirm decision.
        await self._clear_cancel_intent_pending(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=identity_metadata,
            existing_state=existing_state,
        )

        metadata: dict[str, object] = {
            "messaging_layer": self._layer_metadata(channel),
            "customer_identity": identity_metadata,
            "customer_care_status": care_status,
            "booking_reference": booking_reference,
            "orchestrator_status": orchestrator_status,
            "orchestrator_result": orchestrator_result,
            "queued_request": queued_request,
            "locale": locale,
        }
        if reply_controls:
            metadata["reply_controls"] = reply_controls
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent=ai_intent,
            workflow_status="answered",
            metadata=metadata,
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
        booking_reference: str | None = None,
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
        if booking_reference:
            merged_metadata["cancel_intent_booking_reference"] = booking_reference
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
            if key
            not in {
                "cancel_intent_pending",
                "cancel_intent_recorded_at",
                "cancel_intent_booking_reference",
            }
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

    async def _mark_reschedule_intent_pending(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        customer_identity: dict[str, object],
        booking_reference: str | None = None,
        existing_state: dict[str, object] | None = None,
    ) -> None:
        if not conversation_id:
            return
        existing_metadata = (existing_state or {}).get("session_metadata") if existing_state else {}
        if not isinstance(existing_metadata, dict):
            existing_metadata = {}
        merged_metadata = {
            **existing_metadata,
            "reschedule_intent_pending": True,
            "reschedule_intent_recorded_at": datetime.now(UTC).isoformat(),
        }
        if booking_reference:
            merged_metadata["reschedule_intent_booking_reference"] = booking_reference
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
            last_ai_intent="reschedule_intent_pending",
            last_workflow_status="answered",
            metadata=merged_metadata,
        )

    async def _clear_reschedule_intent_pending(
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
        if not isinstance(existing_metadata, dict) or not existing_metadata.get("reschedule_intent_pending"):
            return
        cleared = {
            key: value
            for key, value in existing_metadata.items()
            if key
            not in {
                "reschedule_intent_pending",
                "reschedule_intent_recorded_at",
                "reschedule_intent_booking_reference",
            }
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
            last_ai_intent="reschedule_intent_cleared",
            last_workflow_status="answered",
            metadata=cleared,
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 2: AIMentor in-Telegram booking flow
    #
    # State machine (stored on MessagingChannelSession.metadata):
    #
    #   <none>  ── /programs ──▶  picking_program
    #   picking_program  ── aim:program:<sid> ──▶  picking_slot
    #   picking_slot  ── aim:slot:<sid>:<iso> ──▶  collecting_name
    #   collecting_name  ── free text ──▶  collecting_email
    #   collecting_email  ── free text ──▶  collecting_phone
    #   collecting_phone  ── free text ──▶  confirming
    #   confirming  ── YES ──▶  <none> + booking created
    #   confirming  ── NO  ──▶  <none>
    #
    # Tenant: AIMENTOR_TENANT_SLUG ("ai-mentor-doer"). Resolved via
    # TenantRepository.resolve_tenant_id at handler time so we don't
    # have to thread tenant_id from the dispatcher.
    # ──────────────────────────────────────────────────────────────────

    AIMENTOR_TENANT_SLUG = "ai-mentor-doer"
    BOOK_INTENT_TTL_SECONDS = 60 * 30  # 30 min — clears stale half-typed flows.
    PROGRAMS_INLINE_KEYBOARD_LIMIT = 6
    SLOTS_INLINE_KEYBOARD_LIMIT = 5

    BOOK_INTENT_STATES = {
        "picking_program",
        "picking_slot",
        "collecting_name",
        "collecting_email",
        "collecting_phone",
        "confirming",
    }

    @classmethod
    def _active_book_intent_state(
        cls, session_metadata: dict[str, object] | None
    ) -> str | None:
        if not isinstance(session_metadata, dict):
            return None
        state = str(session_metadata.get("book_intent_state") or "").strip()
        if state not in {"collecting_name", "collecting_email", "collecting_phone", "confirming"}:
            # Only the *interactive text-collection* states count as
            # "active" — picking_program / picking_slot just record where
            # the user paused after a callback button press.
            return None
        recorded = str(session_metadata.get("book_intent_recorded_at") or "").strip()
        if recorded:
            try:
                recorded_at = datetime.fromisoformat(recorded)
            except ValueError:
                return state
            if recorded_at.tzinfo is None:
                recorded_at = recorded_at.replace(tzinfo=UTC)
            if datetime.now(UTC) - recorded_at > timedelta(
                seconds=cls.BOOK_INTENT_TTL_SECONDS
            ):
                return None
        return state

    @staticmethod
    def _is_programs_keyword_intent(message_text: str) -> bool:
        normalized = unicodedata.normalize(
            "NFKD", str(message_text or "").strip().lower()
        )
        ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
        keywords = {"programs", "program", "courses", "course", "khoa hoc", "khoahoc"}
        return ascii_text in keywords

    async def _resolve_aimentor_tenant_id(self, session) -> str | None:
        try:
            repo = TenantRepository(RepositoryContext(session=session))
            return await repo.resolve_tenant_id(self.AIMENTOR_TENANT_SLUG)
        except Exception:  # pragma: no cover - defensive
            _logger.exception("aimentor_tenant_resolve_failed")
            return None

    async def _fetch_aimentor_programs(
        self, session, *, limit: int = PROGRAMS_INLINE_KEYBOARD_LIMIT
    ) -> list[dict[str, object]]:
        tenant_id = await self._resolve_aimentor_tenant_id(session)
        if not tenant_id:
            return []
        try:
            result = await session.execute(
                sql_text(
                    """
                    select
                      service_id, name, summary, display_price,
                      coalesce(featured, 0) as featured
                    from service_merchant_profiles
                    where tenant_id = cast(:tenant_id as text)
                      and publish_state = 'published'
                      and coalesce(is_active, 1) = 1
                    order by
                      coalesce(featured, 0) desc,
                      coalesce((metadata->>'sort_order')::int, 9999) asc,
                      name asc
                    limit :limit
                    """
                ),
                {"tenant_id": tenant_id, "limit": int(limit)},
            )
            rows = result.mappings().all()
        except Exception:  # pragma: no cover - defensive
            _logger.exception("aimentor_programs_fetch_failed")
            return []
        return [dict(row) for row in rows]

    async def _fetch_aimentor_slots(
        self, session, *, service_id: str, limit: int = SLOTS_INLINE_KEYBOARD_LIMIT
    ) -> list[dict[str, object]]:
        if not service_id:
            return []
        try:
            result = await session.execute(
                sql_text(
                    """
                    select
                      sts.id::text as id,
                      sts.service_id,
                      sts.slot_start_at,
                      sts.slot_end_at,
                      sts.timezone,
                      sts.capacity,
                      sts.booked_count
                    from service_time_slots sts
                    where sts.tenant_id = (
                      select id from tenants where slug = :slug
                    )
                      and sts.service_id = :service_id
                      and sts.is_active = true
                      and sts.slot_start_at > now()
                      and (sts.capacity - sts.booked_count) > 0
                    order by sts.slot_start_at asc
                    limit :limit
                    """
                ),
                {
                    "slug": self.AIMENTOR_TENANT_SLUG,
                    "service_id": service_id,
                    "limit": int(limit),
                },
            )
            rows = result.mappings().all()
        except Exception:  # pragma: no cover - defensive
            _logger.exception("aimentor_slots_fetch_failed")
            return []
        return [dict(row) for row in rows]

    @staticmethod
    def _format_slot_button_label(slot_start_at: object) -> str:
        if isinstance(slot_start_at, datetime):
            ts = slot_start_at
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=UTC)
            return ts.strftime("%a %d %b, %H:%M")
        return str(slot_start_at or "").strip() or "Available slot"

    async def _set_book_intent_metadata(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        customer_identity: dict[str, object],
        existing_state: dict[str, object] | None,
        updates: dict[str, object],
    ) -> None:
        if not conversation_id:
            return
        existing_metadata = (existing_state or {}).get("session_metadata") if existing_state else {}
        if not isinstance(existing_metadata, dict):
            existing_metadata = {}
        merged = {**existing_metadata, **updates}
        merged["book_intent_recorded_at"] = datetime.now(UTC).isoformat()
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
            last_ai_intent=str(updates.get("book_intent_state") or "book_intent_active"),
            last_workflow_status="answered",
            metadata=merged,
        )

    async def _clear_book_intent_metadata(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        customer_identity: dict[str, object],
        existing_state: dict[str, object] | None,
    ) -> None:
        if not conversation_id:
            return
        existing_metadata = (existing_state or {}).get("session_metadata") if existing_state else {}
        if not isinstance(existing_metadata, dict):
            return
        keys_to_clear = {
            "book_intent_state",
            "book_intent_program_id",
            "book_intent_program_name",
            "book_intent_slot_starts_at",
            "book_intent_slot_label",
            "book_intent_collected_name",
            "book_intent_collected_email",
            "book_intent_collected_phone",
            "book_intent_recorded_at",
        }
        cleared = {k: v for k, v in existing_metadata.items() if k not in keys_to_clear}
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
            last_ai_intent="book_intent_cleared",
            last_workflow_status="answered",
            metadata=cleared,
        )

    async def _handle_programs_list(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        identity_metadata: dict[str, object],
        locale: str,
        existing_state: dict[str, object] | None,
    ) -> MessagingAutomationResult:
        # WhatsApp parity is best-effort: WhatsApp Cloud reply buttons cap
        # at 3 per message and the catalog can have up to 6 programs, so
        # we ship a deep-link instead and surface a TODO.
        if channel != "telegram":
            body = self._localized(
                "programs_pick_open_web",
                locale,
                url="https://aimentor.bookedai.au",
            )
            return MessagingAutomationResult(
                ai_reply=body,
                ai_intent="programs_open_web",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "customer_care_status": "programs_open_web",
                    "locale": locale,
                },
            )

        programs = await self._fetch_aimentor_programs(session)
        if not programs:
            body = self._localized("programs_empty", locale)
            return MessagingAutomationResult(
                ai_reply=body,
                ai_intent="programs_empty",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "customer_care_status": "programs_empty",
                    "locale": locale,
                },
            )

        keyboard_rows: list[list[dict[str, str]]] = []
        for program in programs:
            service_id = str(program.get("service_id") or "").strip()
            name = str(program.get("name") or "").strip() or service_id
            if not service_id:
                continue
            callback = f"aim:program:{service_id}"
            # Telegram callback_data limit is 64 bytes. Skip rather than
            # truncate — a truncated id would silently mis-route.
            if len(callback.encode("utf-8")) > 64:
                continue
            keyboard_rows.append(
                [{"text": name[:60], "callback_data": callback}]
            )

        body = self._localized("programs_pick_prompt", locale)
        reply_markup = {"inline_keyboard": keyboard_rows} if keyboard_rows else None

        await self._set_book_intent_metadata(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=identity_metadata,
            existing_state=existing_state,
            updates={"book_intent_state": "picking_program"},
        )

        result_metadata: dict[str, object] = {
            "messaging_layer": self._layer_metadata(channel),
            "customer_identity": identity_metadata,
            "customer_care_status": "programs_pick",
            "locale": locale,
            "book_intent_state": "picking_program",
        }
        if reply_markup is not None:
            result_metadata["reply_controls"] = {
                "telegram_reply_markup": reply_markup,
                "telegram_parse_mode": "HTML",
            }
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="programs_pick",
            workflow_status="answered",
            metadata=result_metadata,
        )

    async def _handle_program_pick(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        identity_metadata: dict[str, object],
        locale: str,
        service_id: str,
        existing_state: dict[str, object] | None,
    ) -> MessagingAutomationResult:
        if not service_id:
            return MessagingAutomationResult(
                ai_reply=self._localized("programs_empty", locale),
                ai_intent="programs_empty",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "locale": locale,
                },
            )

        slots = await self._fetch_aimentor_slots(session, service_id=service_id)
        # Resolve program display name for later confirmation summary.
        program_name = service_id
        try:
            programs = await self._fetch_aimentor_programs(session, limit=50)
            for program in programs:
                if str(program.get("service_id") or "").strip() == service_id:
                    program_name = str(program.get("name") or service_id).strip()
                    break
        except Exception:  # pragma: no cover - defensive
            pass

        if not slots:
            body = self._localized("programs_no_slots", locale)
            return MessagingAutomationResult(
                ai_reply=body,
                ai_intent="programs_no_slots",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "customer_care_status": "programs_no_slots",
                    "locale": locale,
                },
            )

        keyboard_rows: list[list[dict[str, str]]] = []
        for slot in slots:
            slot_start = slot.get("slot_start_at")
            if isinstance(slot_start, datetime):
                if slot_start.tzinfo is None:
                    slot_start = slot_start.replace(tzinfo=UTC)
                starts_at_iso = slot_start.isoformat()
            else:
                starts_at_iso = str(slot_start or "").strip()
            if not starts_at_iso:
                continue
            label = self._format_slot_button_label(slot_start)
            callback = f"aim:slot:{service_id}:{starts_at_iso}"
            if len(callback.encode("utf-8")) > 64:
                # Compress the iso to the shortest representation
                # (drop seconds, microseconds, timezone offset chars).
                if isinstance(slot_start, datetime):
                    short_iso = slot_start.strftime("%Y-%m-%dT%H:%M")
                    callback = f"aim:slot:{service_id}:{short_iso}"
            if len(callback.encode("utf-8")) > 64:
                continue
            keyboard_rows.append([{"text": label, "callback_data": callback}])

        body = self._localized("programs_pick_slot", locale)
        reply_markup = {"inline_keyboard": keyboard_rows} if keyboard_rows else None

        await self._set_book_intent_metadata(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=identity_metadata,
            existing_state=existing_state,
            updates={
                "book_intent_state": "picking_slot",
                "book_intent_program_id": service_id,
                "book_intent_program_name": program_name,
            },
        )

        result_metadata: dict[str, object] = {
            "messaging_layer": self._layer_metadata(channel),
            "customer_identity": identity_metadata,
            "customer_care_status": "programs_pick_slot",
            "locale": locale,
            "book_intent_state": "picking_slot",
            "book_intent_program_id": service_id,
        }
        if reply_markup is not None:
            result_metadata["reply_controls"] = {
                "telegram_reply_markup": reply_markup,
                "telegram_parse_mode": "HTML",
            }
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="programs_pick_slot",
            workflow_status="answered",
            metadata=result_metadata,
        )

    async def _handle_slot_pick(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        identity_metadata: dict[str, object],
        locale: str,
        service_id: str,
        starts_at_iso: str,
        existing_state: dict[str, object] | None,
    ) -> MessagingAutomationResult:
        if not service_id or not starts_at_iso:
            return MessagingAutomationResult(
                ai_reply=self._localized("programs_no_slots", locale),
                ai_intent="programs_no_slots",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "locale": locale,
                },
            )

        # Format a nicer label for confirmation summary.
        slot_label = starts_at_iso
        try:
            parsed = datetime.fromisoformat(starts_at_iso)
            slot_label = self._format_slot_button_label(parsed)
        except ValueError:
            pass

        await self._set_book_intent_metadata(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=identity_metadata,
            existing_state=existing_state,
            updates={
                "book_intent_state": "collecting_name",
                "book_intent_program_id": service_id,
                "book_intent_slot_starts_at": starts_at_iso,
                "book_intent_slot_label": slot_label,
            },
        )

        body = self._localized("book_collect_name", locale)
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="book_collect_name",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "book_collect_name",
                "locale": locale,
                "book_intent_state": "collecting_name",
                "book_intent_program_id": service_id,
                "book_intent_slot_starts_at": starts_at_iso,
                "reply_controls": {"telegram_parse_mode": "HTML"},
            },
        )

    async def _handle_book_state_machine(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        identity_metadata: dict[str, object],
        locale: str,
        message: TawkMessage,
        metadata: dict[str, object],
        existing_state: dict[str, object] | None,
        state: str,
    ) -> MessagingAutomationResult | None:
        text_value = str(message.text or "").strip()
        existing_metadata = (
            (existing_state or {}).get("session_metadata") if existing_state else {}
        )
        if not isinstance(existing_metadata, dict):
            existing_metadata = {}

        # Allow users to bail out of the flow by typing /cancel or /help —
        # don't gobble those messages.
        if text_value.startswith("/"):
            await self._clear_book_intent_metadata(
                session,
                channel=channel,
                conversation_id=conversation_id,
                tenant_id=tenant_id,
                customer_identity=identity_metadata,
                existing_state=existing_state,
            )
            return None

        if state == "collecting_name":
            name = text_value
            if len(name) < 2 or len(name) > 120:
                return MessagingAutomationResult(
                    ai_reply=self._localized("book_collect_name", locale),
                    ai_intent="book_collect_name",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(channel),
                        "customer_identity": identity_metadata,
                        "locale": locale,
                        "book_intent_state": state,
                    },
                )
            await self._set_book_intent_metadata(
                session,
                channel=channel,
                conversation_id=conversation_id,
                tenant_id=tenant_id,
                customer_identity=identity_metadata,
                existing_state=existing_state,
                updates={
                    "book_intent_state": "collecting_email",
                    "book_intent_collected_name": name,
                },
            )
            return MessagingAutomationResult(
                ai_reply=self._localized("book_collect_email", locale),
                ai_intent="book_collect_email",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "locale": locale,
                    "book_intent_state": "collecting_email",
                },
            )

        if state == "collecting_email":
            email = text_value
            if "@" not in email or "." not in email or len(email) > 200:
                return MessagingAutomationResult(
                    ai_reply=self._localized("book_invalid_email", locale),
                    ai_intent="book_invalid_email",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(channel),
                        "customer_identity": identity_metadata,
                        "locale": locale,
                        "book_intent_state": state,
                    },
                )
            await self._set_book_intent_metadata(
                session,
                channel=channel,
                conversation_id=conversation_id,
                tenant_id=tenant_id,
                customer_identity=identity_metadata,
                existing_state=existing_state,
                updates={
                    "book_intent_state": "collecting_phone",
                    "book_intent_collected_email": email.lower(),
                },
            )
            return MessagingAutomationResult(
                ai_reply=self._localized("book_collect_phone", locale),
                ai_intent="book_collect_phone",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "locale": locale,
                    "book_intent_state": "collecting_phone",
                },
            )

        if state == "collecting_phone":
            phone_digits = re.sub(r"[^\d+]", "", text_value)
            digits_only = re.sub(r"\D", "", phone_digits)
            if len(digits_only) < 7 or len(phone_digits) > 32:
                return MessagingAutomationResult(
                    ai_reply=self._localized("book_invalid_phone", locale),
                    ai_intent="book_invalid_phone",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(channel),
                        "customer_identity": identity_metadata,
                        "locale": locale,
                        "book_intent_state": state,
                    },
                )
            program_name = str(
                existing_metadata.get("book_intent_program_name")
                or existing_metadata.get("book_intent_program_id")
                or ""
            ).strip()
            slot_label = str(
                existing_metadata.get("book_intent_slot_label")
                or existing_metadata.get("book_intent_slot_starts_at")
                or ""
            ).strip()
            await self._set_book_intent_metadata(
                session,
                channel=channel,
                conversation_id=conversation_id,
                tenant_id=tenant_id,
                customer_identity=identity_metadata,
                existing_state=existing_state,
                updates={
                    "book_intent_state": "confirming",
                    "book_intent_collected_phone": phone_digits,
                },
            )
            summary = self._localized(
                "book_summary",
                locale,
                program=program_name or "AIMentor",
                slot=slot_label or "TBC",
            )
            return MessagingAutomationResult(
                ai_reply=summary,
                ai_intent="book_summary",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "locale": locale,
                    "book_intent_state": "confirming",
                    "reply_controls": {
                        "telegram_reply_markup": {
                            "inline_keyboard": [
                                [
                                    {"text": "YES", "callback_data": "YES"},
                                    {"text": "NO", "callback_data": "NO"},
                                ]
                            ]
                        },
                        "telegram_parse_mode": "HTML",
                    },
                },
            )

        if state == "confirming":
            decision = text_value.strip().lower()
            if decision in {"yes", "y", "ok", "confirm", "đồng ý", "dong y", "co"}:
                return await self._finalize_book_intent(
                    session,
                    channel=channel,
                    conversation_id=conversation_id,
                    identity_metadata=identity_metadata,
                    locale=locale,
                    message=message,
                    existing_state=existing_state,
                    existing_metadata=existing_metadata,
                )
            if decision in {"no", "n", "cancel", "huy", "hủy", "khong", "không"}:
                await self._clear_book_intent_metadata(
                    session,
                    channel=channel,
                    conversation_id=conversation_id,
                    tenant_id=tenant_id,
                    customer_identity=identity_metadata,
                    existing_state=existing_state,
                )
                return MessagingAutomationResult(
                    ai_reply=self._localized("book_cancelled", locale),
                    ai_intent="book_cancelled",
                    workflow_status="answered",
                    metadata={
                        "messaging_layer": self._layer_metadata(channel),
                        "customer_identity": identity_metadata,
                        "customer_care_status": "book_cancelled",
                        "locale": locale,
                    },
                )
            # Unknown reply at confirm step → re-prompt.
            program_name = str(
                existing_metadata.get("book_intent_program_name")
                or existing_metadata.get("book_intent_program_id")
                or ""
            ).strip()
            slot_label = str(
                existing_metadata.get("book_intent_slot_label")
                or existing_metadata.get("book_intent_slot_starts_at")
                or ""
            ).strip()
            return MessagingAutomationResult(
                ai_reply=self._localized(
                    "book_summary",
                    locale,
                    program=program_name or "AIMentor",
                    slot=slot_label or "TBC",
                ),
                ai_intent="book_summary",
                workflow_status="answered",
                metadata={
                    "messaging_layer": self._layer_metadata(channel),
                    "customer_identity": identity_metadata,
                    "locale": locale,
                    "book_intent_state": "confirming",
                },
            )

        return None

    async def _finalize_book_intent(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        identity_metadata: dict[str, object],
        locale: str,
        message: TawkMessage,
        existing_state: dict[str, object] | None,
        existing_metadata: dict[str, object],
    ) -> MessagingAutomationResult:
        tenant_id = await self._resolve_aimentor_tenant_id(session)
        service_id = str(existing_metadata.get("book_intent_program_id") or "").strip() or None
        service_name = str(existing_metadata.get("book_intent_program_name") or "AIMentor").strip()
        starts_at_iso = str(existing_metadata.get("book_intent_slot_starts_at") or "").strip()
        full_name = str(existing_metadata.get("book_intent_collected_name") or "").strip() or None
        email = str(existing_metadata.get("book_intent_collected_email") or "").strip().lower() or None
        phone = str(existing_metadata.get("book_intent_collected_phone") or "").strip() or None

        booking_reference = f"v1-{uuid4().hex[:10]}"
        booking_intent_id: str | None = None
        try:
            if tenant_id:
                contact_repository = ContactRepository(
                    RepositoryContext(session=session, tenant_id=tenant_id)
                )
                lead_repository = LeadRepository(
                    RepositoryContext(session=session, tenant_id=tenant_id)
                )
                booking_repository = BookingIntentRepository(
                    RepositoryContext(session=session, tenant_id=tenant_id)
                )
                contact_id = await contact_repository.upsert_contact(
                    tenant_id=tenant_id,
                    full_name=full_name,
                    email=email,
                    phone=phone,
                    primary_channel=channel,
                )
                lead_id = await lead_repository.upsert_lead(
                    tenant_id=tenant_id,
                    contact_id=contact_id,
                    source=channel,
                    status="captured",
                )
                requested_date: str | None = None
                requested_time: str | None = None
                if starts_at_iso:
                    try:
                        parsed = datetime.fromisoformat(starts_at_iso)
                        requested_date = parsed.strftime("%Y-%m-%d")
                        requested_time = parsed.strftime("%H:%M")
                    except ValueError:
                        pass
                booking_intent_id = await booking_repository.upsert_booking_intent(
                    tenant_id=tenant_id,
                    contact_id=contact_id,
                    booking_reference=booking_reference,
                    conversation_id=str(message.conversation_id or conversation_id or ""),
                    source=f"{channel}_aimentor",
                    service_name=service_name,
                    service_id=service_id,
                    requested_date=requested_date,
                    requested_time=requested_time,
                    timezone="Australia/Sydney",
                    booking_path="aimentor_telegram_bot",
                    confidence_level="high",
                    status="captured",
                    payment_dependency_state="pending",
                    metadata_json=json.dumps(
                        {
                            "source": "messaging_automation_aimentor",
                            "channel": channel,
                            "service_id": service_id,
                            "slot_starts_at": starts_at_iso,
                            "lead_id": lead_id,
                            "telegram_chat_id": str(
                                identity_metadata.get("telegram_chat_id") or ""
                            )
                            or None,
                        }
                    ),
                )
                try:
                    await session.commit()
                except Exception:  # pragma: no cover - defensive
                    _logger.exception("aimentor_booking_commit_failed")
        except Exception:  # pragma: no cover - defensive
            _logger.exception("aimentor_booking_intent_persist_failed")

        await self._clear_book_intent_metadata(
            session,
            channel=channel,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            customer_identity=identity_metadata,
            existing_state=existing_state,
        )

        body = self._localized(
            "book_success",
            locale,
            ref=booking_reference,
        )
        return MessagingAutomationResult(
            ai_reply=body,
            ai_intent="book_success",
            workflow_status="answered",
            metadata={
                "messaging_layer": self._layer_metadata(channel),
                "customer_identity": identity_metadata,
                "customer_care_status": "book_success",
                "booking_reference": booking_reference,
                "booking_intent_id": booking_intent_id,
                "service_id": service_id,
                "service_name": service_name,
                "slot_starts_at": starts_at_iso,
                "locale": locale,
                "reply_controls": {"telegram_parse_mode": "HTML"},
            },
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

    @classmethod
    def _is_support_handoff_recent(cls, session_metadata: dict[str, object] | None) -> bool:
        if not isinstance(session_metadata, dict):
            return False
        recorded = str(session_metadata.get("support_handoff_recorded_at") or "").strip()
        if not recorded:
            return False
        try:
            recorded_at = datetime.fromisoformat(recorded)
        except ValueError:
            return False
        if recorded_at.tzinfo is None:
            recorded_at = recorded_at.replace(tzinfo=UTC)
        if datetime.now(UTC) - recorded_at > timedelta(seconds=cls.SUPPORT_HANDOFF_DEBOUNCE_SECONDS):
            return False
        return True

    @classmethod
    def _is_handoff_claimed(cls, session_metadata: dict[str, object] | None) -> bool:
        if not isinstance(session_metadata, dict):
            return False
        recorded = str(session_metadata.get("handoff_claimed_at") or "").strip()
        if not recorded:
            return False
        try:
            recorded_at = datetime.fromisoformat(recorded)
        except ValueError:
            return False
        if recorded_at.tzinfo is None:
            recorded_at = recorded_at.replace(tzinfo=UTC)
        if datetime.now(UTC) - recorded_at > timedelta(seconds=cls.HANDOFF_CLAIMED_TTL_SECONDS):
            return False
        return True

    async def _mark_support_handoff_dispatched(
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
            "support_handoff_recorded_at": datetime.now(UTC).isoformat(),
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
            last_ai_intent="support_handoff",
            last_workflow_status="answered",
            metadata=merged_metadata,
        )

    @classmethod
    def render_support_handoff_failed(cls, *, locale: str, support_email: str) -> str:
        return cls._localized(
            "support_handoff_failed",
            cls._resolve_locale(locale),
            support_email=support_email,
        )

    # ------------------------------------------------------------------
    # Voice STT (Telegram only for v1; WhatsApp deferred — different audio
    # format + auth flow). Lifted out of ``handle_customer_message`` to keep
    # the dispatcher readable. Tests patch ``_download_voice_audio`` and
    # ``_build_whisper_adapter`` to avoid touching the network. See also
    # ``LOCALIZED_COPY['voice_failed']`` for the friendly fallback string.
    # ------------------------------------------------------------------

    async def _maybe_transcribe_voice(
        self,
        *,
        channel: str,
        message: TawkMessage,
        metadata: dict[str, object],
    ) -> "MessagingAutomationResult | None":
        """If the inbound message is a Telegram voice note, run Whisper STT.

        Returns ``None`` when there is no voice payload or transcription
        succeeds (in which case ``message.text`` has been replaced in place).
        Returns a populated :class:`MessagingAutomationResult` when STT
        fails — caller should short-circuit and reply with that result.
        """

        if channel != "telegram":
            return None
        voice_meta = metadata.get("voice")
        if not isinstance(voice_meta, dict):
            return None
        file_id = str(voice_meta.get("file_id") or "").strip()
        if not file_id:
            return None

        locale = self._resolve_locale(metadata.get("telegram_language_code"))
        bot_token = (
            os.getenv("BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN")
            or os.getenv("TELEGRAM_BOT_TOKEN")
            or ""
        ).strip()

        try:
            audio_bytes = await self._download_voice_audio(
                token=bot_token,
                file_id=file_id,
            )
            adapter = self._build_whisper_adapter()
            transcription = await adapter.transcribe(
                audio_bytes,
                filename="voice.ogg",
                language_hint=locale,
            )
        except Exception as exc:  # noqa: BLE001 — any failure → friendly fallback
            _logger.warning(
                "messaging_voice_transcription_failed channel=%s error_type=%s",
                channel,
                type(exc).__name__,
                extra={
                    "event_type": "messaging_voice_transcription_failed",
                    "channel": channel,
                    "error_type": type(exc).__name__,
                },
            )
            failure_reply = self._localized("voice_failed", locale)
            return MessagingAutomationResult(
                ai_reply=failure_reply,
                ai_intent="voice_transcription_failed",
                workflow_status="answered",
                metadata={
                    "channel": channel,
                    "customer_care_status": "voice_transcription_failed",
                    "voice_transcription": {
                        "status": "failed",
                        "error_type": type(exc).__name__,
                    },
                    "locale": locale,
                },
            )

        # Replace the placeholder text with the transcription so downstream
        # slash-command parsing, NLU, and lifecycle ops behave identically to
        # a typed message. Privacy: never log the transcription content.
        message.text = transcription.text
        existing_message_meta = (
            message.metadata if isinstance(message.metadata, dict) else {}
        )
        existing_message_meta["voice_transcribed"] = True
        message.metadata = existing_message_meta
        metadata["voice_transcription"] = {
            "status": "ok",
            "detected_language": transcription.detected_language,
            "duration_seconds": transcription.duration_seconds,
            "latency_ms": transcription.latency_ms,
            "text_length": len(transcription.text),
        }
        return None

    @staticmethod
    async def _download_voice_audio(*, token: str, file_id: str) -> bytes:
        """Wrapper so tests can patch the network call without touching
        :mod:`integrations.telegram.voice_download` directly.
        """

        from integrations.telegram.voice_download import download_telegram_voice

        return await download_telegram_voice(token, file_id)

    @staticmethod
    def _build_whisper_adapter():
        """Factory hook for the Whisper adapter; tests patch this to inject
        a mock without monkeypatching the whole module.
        """

        from integrations.ai_models.whisper_adapter import WhisperAdapter

        return WhisperAdapter.from_env()

    async def _remember_recent_booking_reference(
        self,
        session,
        *,
        channel: str,
        conversation_id: str | None,
        tenant_id: str | None,
        customer_identity: dict[str, object],
        booking_reference: str,
        existing_state: dict[str, object] | None = None,
    ) -> None:
        if not conversation_id or not booking_reference:
            return
        existing_metadata = (existing_state or {}).get("session_metadata") if existing_state else {}
        if not isinstance(existing_metadata, dict):
            existing_metadata = {}
        merged_metadata = {
            **existing_metadata,
            "recent_booking_reference": booking_reference,
            "recent_booking_recorded_at": datetime.now(UTC).isoformat(),
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
            last_ai_intent="recent_booking_recorded",
            last_workflow_status="answered",
            metadata=merged_metadata,
        )

    SUPPORTED_LOCALES = ("en", "vi")
    DEFAULT_LOCALE = "en"

    LOCALIZED_COPY: dict[str, dict[str, str]] = {
        "welcome": {
            "en": (
                "{greeting} I'm <b>BookedAI Manager Bot</b>.\n"
                "What do you want to book?\n\n"
                "Tap <b>Find a service</b>.\n"
                "Or type what you want."
            ),
            "vi": (
                "{greeting} Mình là <b>BookedAI Manager Bot</b>.\n"
                "Bạn muốn đặt gì?\n\n"
                "Bấm <b>Tìm dịch vụ</b> hoặc nhắn trực tiếp ở đây."
            ),
        },
        "welcome_copy_concise": {
            "en": (
                "{greeting} I'm <b>BookedAI Manager Bot</b>.\n"
                "Tap <b>Find a service</b> or tell me what you want to book."
            ),
            "vi": (
                "{greeting} Mình là <b>BookedAI Manager Bot</b>.\n"
                "Bấm <b>Tìm dịch vụ</b> hoặc nhắn bạn muốn đặt gì."
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
                "What would you like to find?\n"
                "Example: <i>chess class in Sydney this weekend</i>"
            ),
            "vi": (
                "Bạn muốn tìm gì?\n"
                "Ví dụ: <i>lớp cờ vua ở Sydney cuối tuần này</i>"
            ),
        },
        "mybookings_prompt": {
            "en": (
                "Send your booking reference or email/phone.\n"
                "Example: <code>v1-xxxxxx</code>"
            ),
            "vi": (
                "Gửi mã booking hoặc email/số điện thoại.\n"
                "Ví dụ: <code>v1-xxxxxx</code>"
            ),
        },
        "cancel_prompt": {
            "en": (
                "Send the booking reference for cancellation.\n"
                "Example: <code>v1-xxxxxx</code>"
            ),
            "vi": (
                "Gửi mã booking để hủy.\n"
                "Ví dụ: <code>v1-xxxxxx</code>"
            ),
        },
        "support_handoff": {
            "en": (
                "I've flagged this conversation for support.\n"
                "A BookedAI teammate will reply here.\n"
                "Urgent: <b>{support_email}</b>"
            ),
            "vi": (
                "Đã gọi hỗ trợ.\n"
                "Đội BookedAI sẽ trả lời tại đây.\n"
                "Gấp: <b>{support_email}</b>"
            ),
        },
        "support_handoff_failed": {
            "en": (
                "I couldn't reach support just now.\n"
                "Email <b>{support_email}</b> with your booking ref."
            ),
            "vi": (
                "Kênh hỗ trợ đang tạm lỗi.\n"
                "Email <b>{support_email}</b> kèm mã booking."
            ),
        },
        "support_handoff_recent": {
            "en": (
                "I've already pinged support.\n"
                "Urgent: <b>{support_email}</b>"
            ),
            "vi": (
                "Đội hỗ trợ đã được báo.\n"
                "Gấp: <b>{support_email}</b>"
            ),
        },
        "handoff_claimed_active": {
            "en": (
                "A BookedAI teammate is here now.\n"
                "Please chat with them directly."
            ),
            "vi": (
                "Đội BookedAI đang ở đây.\n"
                "Bạn trao đổi trực tiếp tại đây nhé."
            ),
        },
        "keyboard_find_service": {"en": "Find a service", "vi": "Tìm dịch vụ"},
        "keyboard_my_bookings": {"en": "My bookings", "vi": "Booking của tôi"},
        "keyboard_talk_support": {"en": "Talk to support", "vi": "Gặp hỗ trợ"},
        "keyboard_placeholder": {
            "en": "Type service, booking ref, or question...",
            "vi": "Gõ dịch vụ, mã booking, hoặc câu hỏi...",
        },
        "cancel_confirm_prompt": {
            "en": (
                "Confirm cancel of <code>{booking_reference}</code>? "
                "Reply YES to confirm or NO to keep your booking."
            ),
            "vi": (
                "Bạn xác nhận huỷ <code>{booking_reference}</code>? "
                "Trả lời YES để huỷ hoặc NO để giữ buổi học."
            ),
        },
        "cancel_confirm_yes": {"en": "Confirm cancel", "vi": "Xác nhận hủy"},
        "cancel_confirm_no": {"en": "Keep booking", "vi": "Giữ booking"},
        "talk_to_support": {"en": "Support", "vi": "Hỗ trợ"},
        "reschedule_date_prompt": {
            "en": (
                "Pick a new date.\n"
                "Booking: <code>{booking_reference}</code>"
            ),
            "vi": (
                "Chọn ngày mới.\n"
                "Booking: <code>{booking_reference}</code>"
            ),
        },
        "reschedule_time_prompt": {
            "en": (
                "Pick a time.\n"
                "<b>{selected_date}</b> | <code>{booking_reference}</code>"
            ),
            "vi": (
                "Chọn giờ.\n"
                "<b>{selected_date}</b> | <code>{booking_reference}</code>"
            ),
        },
        "reschedule_confirmed": {
            "en": (
                "Change request sent.\n"
                "<code>{booking_reference}</code> | <b>{selected_date} {selected_time}</b>"
            ),
            "vi": (
                "Đã gửi yêu cầu đổi lịch.\n"
                "<code>{booking_reference}</code> | <b>{selected_date} {selected_time}</b>"
            ),
        },
        "reschedule_could_not_queue": {
            "en": (
                "Could not send change request for <code>{booking_reference}</code>.\n"
                "Try again or tap Support."
            ),
            "vi": (
                "Chưa gửi được yêu cầu đổi lịch cho <code>{booking_reference}</code>.\n"
                "Thử lại hoặc bấm Hỗ trợ."
            ),
        },
        "reschedule_back_to_booking": {
            "en": "Back",
            "vi": "Quay lại",
        },
        "reschedule_back_to_dates": {
            "en": "Change date",
            "vi": "Đổi ngày",
        },
        "cancel_kept": {
            "en": "Got it — your booking is unchanged.",
            "vi": "OK, giữ nguyên buổi học của bạn.",
        },
        "cancel_failed_not_found": {
            "en": "We couldn't find that booking. Please contact support.",
            "vi": "Không tìm thấy booking. Vui lòng liên hệ hỗ trợ.",
        },
        "cancel_failed_generic": {
            "en": "Something went wrong cancelling. Our team will follow up shortly.",
            "vi": "Có lỗi khi huỷ. Đội ngũ sẽ liên hệ với bạn sớm.",
        },
        "reschedule_confirm_prompt": {
            "en": "Confirm new time {new_slot_label}? YES to confirm or NO to keep.",
            "vi": "Xác nhận giờ mới {new_slot_label}? YES để xác nhận hoặc NO để giữ.",
        },
        "reschedule_failed_state": {
            "en": "This booking can no longer be rescheduled.",
            "vi": "Booking này không thể đổi lịch nữa.",
        },
        "reschedule_failed_not_found": {
            "en": "We couldn't find that booking. Please contact support.",
            "vi": "Không tìm thấy booking. Vui lòng liên hệ hỗ trợ.",
        },
        "reschedule_failed_generic": {
            "en": "Something went wrong rescheduling. Our team will follow up shortly.",
            "vi": "Có lỗi khi đổi lịch. Đội ngũ sẽ liên hệ với bạn sớm.",
        },
        # ── Phase 2: AIMentor in-Telegram booking flow ──
        "programs_pick_prompt": {
            "en": "Pick a program to book:",
            "vi": "Chọn khoá để đặt:",
        },
        "programs_pick_slot": {
            "en": "Pick a time:",
            "vi": "Chọn giờ:",
        },
        "programs_empty": {
            "en": "No programs are open for booking right now. Try again soon.",
            "vi": "Hiện chưa có khoá học nào mở booking. Bạn quay lại sau nhé.",
        },
        "programs_no_slots": {
            "en": "No open slots for this program right now. Try another program.",
            "vi": "Khoá này chưa có lịch trống. Bạn chọn khoá khác giúp mình.",
        },
        "programs_pick_open_web": {
            "en": "Book on web: {url}",
            "vi": "Đặt trên web: {url}",
        },
        "book_collect_name": {
            "en": "Great. What's your full name?",
            "vi": "OK. Tên đầy đủ của bạn?",
        },
        "book_collect_email": {
            "en": "Email?",
            "vi": "Email?",
        },
        "book_collect_phone": {
            "en": "Phone?",
            "vi": "Số điện thoại?",
        },
        "book_invalid_email": {
            "en": "That doesn't look like a valid email. Please try again.",
            "vi": "Email chưa hợp lệ. Bạn nhập lại giúp mình.",
        },
        "book_invalid_phone": {
            "en": "That doesn't look like a valid phone. Please try again (digits + optional +).",
            "vi": "Số điện thoại chưa hợp lệ. Bạn nhập lại (chỉ số và dấu +).",
        },
        "book_summary": {
            "en": "Confirm booking: {program} at {slot}? Reply YES/NO",
            "vi": "Xác nhận đặt: {program} lúc {slot}? Trả lời YES/NO",
        },
        "book_success": {
            "en": "Booked! Reference {ref}. We'll email confirmation.",
            "vi": "Đã đặt! Mã {ref}. Mình sẽ gửi xác nhận qua email.",
        },
        "book_cancelled": {
            "en": "Booking cancelled.",
            "vi": "Đã huỷ đặt chỗ.",
        },
        "voice_heard": {
            "en": "Heard: \"{text}\"",
            "vi": "Nghe được: \"{text}\"",
        },
        "voice_failed": {
            "en": "I couldn't hear that. Could you type your message?",
            "vi": "Mình không nghe rõ. Bạn gõ lại giúp nhé?",
        },
    }

    CANCEL_INTENT_TTL_SECONDS = 600
    SUPPORT_HANDOFF_DEBOUNCE_SECONDS = 300

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
            "book / search": "search",
            "book": "search",
            "search": "search",
            "find a service": "search",
            "find service": "search",
            "my booking": "mybookings",
            "my bookings": "mybookings",
            "mybookings": "mybookings",
            "talk to support": "support",
            "support": "support",
            # Vietnamese keyboard labels (and tolerated variants)
            "đặt / tìm": "search",
            "dat / tim": "search",
            "đặt": "search",
            "dat": "search",
            "tìm dịch vụ": "search",
            "tim dich vu": "search",
            "booking": "mybookings",
            "booking của tôi": "mybookings",
            "booking cua toi": "mybookings",
            "gặp hỗ trợ": "support",
            "gap ho tro": "support",
            "hỗ trợ": "support",
            "ho tro": "support",
        }
        return mapping.get(text)
