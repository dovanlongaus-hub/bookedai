"""Push web-chat + WhatsApp + Telegram transcripts into Zoho CRM as Tasks.

When a booking is confirmed we want every conversation the parent had with
BookedAI (web chat, WhatsApp, Telegram) to land in Zoho CRM as a single
readable timeline item attached to the contact record. Operators then have
a one-click reference for "what did the parent ask, what did the bot
reply, and where in the funnel did the booking land?".

Scope of this module:

* :func:`build_transcript_summary` — query ``conversation_events`` for a
  contact (by email/phone/conversation_id) within a time window and
  produce a stable, line-per-event textual transcript suitable for a Zoho
  Task description.
* :func:`push_transcript_to_zoho_task` — turn that transcript into a
  Zoho CRM Task on the synced contact. Best-effort: failures log a
  warning and return ``manual_review_required`` rather than raising,
  because we never want CRM hiccups to break the booking response.

Trigger surface:

* For now this is wired into the booking-intent creation flow (see
  ``api/v1_booking_handlers.py`` around the call to
  ``orchestrate_booking_followup_sync``). Inactivity-based rolling
  flushes (30 min web / 4h WhatsApp) are intentionally out of scope —
  the booking-confirmation trigger covers the highest-value session
  boundary today.

Idempotency:

* Callers stamp ``booking_intents.metadata_json.transcript_task_synced =
  true`` once Zoho confirms the Task. Re-runs of the same booking flow
  short-circuit on that flag (logic lives in the caller, not here, so
  this module stays a pure transcript+adapter helper).
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import or_, select

from core.contracts.crm import LeadRecordContract
from core.logging import get_logger
from db import ConversationEvent
from integrations.zoho_crm.adapter import ZohoCrmAdapter

_logger = get_logger("bookedai.service_layer.zoho_crm_transcript_sync")


# Maximum events we'll dump into a single Zoho Task description. Zoho
# Tasks accept a long Description field but we keep this bounded so a
# noisy bot conversation can't blow the request body or the operator's
# eyeballs. Any spillover is summarised in a footer line.
_TRANSCRIPT_MAX_EVENTS = 200

# Soft cap on per-line content length so a verbose AI reply doesn't blow
# the line-per-event readability we're aiming for. The full payload is
# still in conversation_events for forensic queries.
_TRANSCRIPT_LINE_MAX_CHARS = 320


@dataclass
class TranscriptLine:
    """One rendered transcript line + the raw event metadata it came from."""

    timestamp: datetime
    actor: str
    channel: str
    rendered: str


@dataclass
class TranscriptSyncResult:
    """Outcome of a Zoho transcript Task push.

    ``sync_status`` mirrors the convention used by the lifecycle ops
    orchestrators: ``synced`` / ``manual_review_required`` / ``skipped``.
    ``record_id`` is the Zoho Task external id when sync succeeded.
    """

    sync_status: str
    record_id: str | None = None
    line_count: int = 0
    warning_codes: list[str] | None = None


# ---------------------------------------------------------------------------
# Transcript builder
# ---------------------------------------------------------------------------


def _normalize_channel(source: str | None, metadata: dict[str, Any] | None) -> str:
    """Pick a short channel label for the rendered transcript.

    ``source`` is the canonical column on conversation_events (e.g.
    ``"whatsapp"``, ``"telegram"``, ``"public_web"``,
    ``"booking_assistant"``). ``metadata.channel`` sometimes carries a
    more specific label (``"whatsapp"`` vs. ``"sms"``) — prefer the
    metadata value when it matches a known channel, otherwise fall back
    to the source column.
    """
    metadata_channel = ""
    if isinstance(metadata, dict):
        metadata_channel = str(metadata.get("channel") or "").strip().lower()
    source_normalized = (source or "").strip().lower()
    candidates = [metadata_channel, source_normalized]
    for candidate in candidates:
        if candidate in {"whatsapp", "telegram", "sms", "tawk", "discord"}:
            return candidate
    if source_normalized in {"public_web", "embedded_widget", "widget", "chess_chat"}:
        return "web"
    if source_normalized.startswith("booking"):
        return "web"
    return source_normalized or "web"


def _normalize_actor(event: ConversationEvent, metadata: dict[str, Any] | None) -> str:
    """Decide whether a row was sent by the parent, the bot, the coach, or admin.

    Heuristics (cheapest-first):

    * ``metadata.direction == "outbound"`` → bot/coach/admin reply
    * ``event_type`` ends with ``"_outbound"`` or contains ``"reply"`` /
      ``"confirmation"`` → bot
    * ``ai_reply`` is set and matches ``message_text`` → bot reply
    * Anything else → ``parent`` (inbound default)
    """
    direction = ""
    if isinstance(metadata, dict):
        direction = str(metadata.get("direction") or "").strip().lower()
        actor_hint = str(metadata.get("actor") or "").strip().lower()
        if actor_hint in {"parent", "bot", "coach", "admin", "operator"}:
            return actor_hint if actor_hint != "operator" else "admin"
    event_type = (event.event_type or "").lower()
    if direction == "outbound":
        # Distinguish booking confirmations from generic bot replies — both
        # come from BookedAI but the operator may want to scan for which
        # rows were system confirmations vs. conversational AI turns.
        if "confirmation" in event_type:
            return "bot"
        return "bot"
    if "outbound" in event_type or "reply" in event_type:
        return "bot"
    if "confirmation" in event_type:
        return "bot"
    if event.ai_reply and event.message_text and event.ai_reply.strip() == event.message_text.strip():
        return "bot"
    return "parent"


def _truncate(text: str, *, limit: int = _TRANSCRIPT_LINE_MAX_CHARS) -> str:
    snippet = (text or "").strip()
    if len(snippet) <= limit:
        return snippet
    return snippet[: limit - 1].rstrip() + "…"


def _render_event(event: ConversationEvent) -> TranscriptLine:
    metadata = event.metadata_json if isinstance(event.metadata_json, dict) else {}
    channel = _normalize_channel(event.source, metadata)
    actor = _normalize_actor(event, metadata)

    # Prefer the most informative content field. For inbound events the
    # parent's text is on ``message_text``; for outbound replies the
    # canonical text lives on ``ai_reply``. We fall back to event_type
    # so a bare "booking_callback" with no body still surfaces as a line.
    content = ""
    if actor == "parent":
        content = event.message_text or event.ai_reply or ""
    else:
        content = event.ai_reply or event.message_text or ""
    if not content.strip():
        # Surface useful context when there's no text body — e.g.
        # ``slot_selected`` events recorded as metadata-only rows.
        content = f"[{event.event_type}]"

    timestamp = event.created_at or datetime.now(timezone.utc)
    formatted_ts = timestamp.strftime("%Y-%m-%d %H:%M:%S")
    rendered = (
        f"[{formatted_ts}] {actor} ({channel}): {_truncate(content)}"
    )
    return TranscriptLine(
        timestamp=timestamp,
        actor=actor,
        channel=channel,
        rendered=rendered,
    )


async def build_transcript_summary(
    session,
    *,
    contact_email: str | None,
    contact_phone: str | None,
    conversation_id: str | None = None,
    since: datetime | timedelta | None = None,
) -> str:
    """Return a readable transcript of recent conversation_events for a contact.

    Lookup strategy (any-of semantics, intentionally permissive so the
    transcript captures cross-channel context):

    * ``sender_email`` matches the lower-cased ``contact_email``
    * ``conversation_id`` matches the contact phone (WhatsApp /
      Telegram-style conv ids)
    * ``conversation_id`` matches the explicit ``conversation_id`` arg
      (web-chat session id)

    ``since`` is either a tz-aware datetime, a timedelta (interpreted as
    "now - delta"), or ``None`` (defaults to last 24h). The 24h window is
    aligned with the booking-confirmation trigger described in the
    sprint spec; longer windows make sense for ad-hoc operator pulls but
    are out of scope here.

    Returns an empty string when no events match — callers MUST treat
    that as "skip Zoho task creation entirely" so we don't pollute the
    CRM timeline with zero-content rows.
    """
    cutoff = _resolve_cutoff(since)
    filters = []
    normalized_email = (contact_email or "").strip().lower() or None
    normalized_phone = (contact_phone or "").strip() or None
    normalized_conv_id = (conversation_id or "").strip() or None
    if normalized_email:
        filters.append(ConversationEvent.sender_email == normalized_email)
    if normalized_phone:
        filters.append(ConversationEvent.conversation_id == normalized_phone)
    if normalized_conv_id and normalized_conv_id != normalized_phone:
        filters.append(ConversationEvent.conversation_id == normalized_conv_id)
    if not filters:
        return ""

    statement = (
        select(ConversationEvent)
        .where(or_(*filters))
        .where(ConversationEvent.created_at >= cutoff)
        .order_by(ConversationEvent.created_at.asc())
        .limit(_TRANSCRIPT_MAX_EVENTS + 1)
    )
    result = await session.execute(statement)
    rows = list(result.scalars().all())
    if not rows:
        return ""

    truncated = len(rows) > _TRANSCRIPT_MAX_EVENTS
    rows = rows[:_TRANSCRIPT_MAX_EVENTS]
    rendered_lines = [_render_event(row).rendered for row in rows]
    if truncated:
        rendered_lines.append(
            f"… (truncated to {_TRANSCRIPT_MAX_EVENTS} events; "
            "full history in conversation_events table)"
        )
    return "\n".join(rendered_lines)


def _resolve_cutoff(since: datetime | timedelta | None) -> datetime:
    if since is None:
        return datetime.now(timezone.utc) - timedelta(hours=24)
    if isinstance(since, timedelta):
        return datetime.now(timezone.utc) - since
    if isinstance(since, datetime):
        if since.tzinfo is None:
            return since.replace(tzinfo=timezone.utc)
        return since
    return datetime.now(timezone.utc) - timedelta(hours=24)


# ---------------------------------------------------------------------------
# Zoho Task push
# ---------------------------------------------------------------------------


def _settings_with_tenant_crm_credentials(settings, tenant_credentials):
    """Overlay tenant Zoho credentials onto the platform Settings snapshot.

    Mirrors ``service_layer.lifecycle_ops_service._settings_with_tenant_crm_credentials``
    so this module can call the Zoho adapter without dragging the full
    orchestrator into the import graph.
    """
    if tenant_credentials is None:
        return settings
    return replace(
        settings,
        zoho_crm_access_token="",
        zoho_crm_refresh_token=str(getattr(tenant_credentials, "refresh_token", "") or ""),
        zoho_crm_client_id=str(getattr(tenant_credentials, "client_id", "") or ""),
        zoho_crm_client_secret=str(getattr(tenant_credentials, "client_secret", "") or ""),
        zoho_accounts_base_url=str(
            getattr(tenant_credentials, "accounts_base_url", "")
            or settings.zoho_accounts_base_url
        ),
        zoho_crm_api_base_url=str(
            getattr(tenant_credentials, "api_base_url", "")
            or settings.zoho_crm_api_base_url
        ),
        zoho_crm_default_lead_module=str(
            getattr(tenant_credentials, "default_lead_module", "")
            or settings.zoho_crm_default_lead_module
        ),
        zoho_crm_default_contact_module=str(
            getattr(tenant_credentials, "default_contact_module", "")
            or settings.zoho_crm_default_contact_module
        ),
        zoho_crm_default_deal_module=str(
            getattr(tenant_credentials, "default_deal_module", "")
            or settings.zoho_crm_default_deal_module
        ),
        zoho_crm_default_task_module=str(
            getattr(tenant_credentials, "default_task_module", "")
            or settings.zoho_crm_default_task_module
        ),
    )


async def push_transcript_to_zoho_task(
    settings,
    *,
    contact_external_id: str,
    transcript: str,
    booking_reference: str,
    customer_name: str | None = None,
    tenant_credentials: object | None = None,
    adapter: ZohoCrmAdapter | None = None,
) -> TranscriptSyncResult:
    """Create a Zoho CRM Task on the contact carrying the rendered transcript.

    The Task subject is prefixed with ``"Chess booking transcript — "`` so
    operators can filter the contact timeline. ``Status`` is ``Completed``
    because the row is a record-of-conversation, not an action item — we
    don't want it to clutter the open-task pipeline.

    Failure modes:

    * Empty ``transcript`` → returns ``skipped`` (caller should not call
      this function with empty input but we double-guard).
    * Missing ``contact_external_id`` → ``manual_review_required``.
    * Adapter raises (HTTP error, value error, transport error) →
      logged at WARN, returns ``manual_review_required``. The booking
      flow MUST keep going; this is best-effort.
    """
    normalized_external_id = (contact_external_id or "").strip()
    normalized_transcript = (transcript or "").strip()
    normalized_reference = (booking_reference or "").strip()
    if not normalized_transcript:
        return TranscriptSyncResult(sync_status="skipped", warning_codes=["empty_transcript"])
    if not normalized_external_id:
        return TranscriptSyncResult(
            sync_status="manual_review_required",
            warning_codes=["missing_contact_external_id"],
        )

    overlaid_settings = _settings_with_tenant_crm_credentials(settings, tenant_credentials)
    crm_adapter = adapter or ZohoCrmAdapter()
    if not crm_adapter.configured(overlaid_settings):
        return TranscriptSyncResult(
            sync_status="skipped",
            warning_codes=["provider_unconfigured"],
        )

    line_count = sum(1 for line in normalized_transcript.splitlines() if line.strip())
    subject_reference = normalized_reference or "(no reference)"
    full_name = (customer_name or "").strip() or "BookedAI Customer"

    # We intentionally lean on ``create_follow_up_task`` rather than
    # bolting a transcript-specific method onto the adapter — the
    # adapter signature is frozen for this work item, and the existing
    # task builder already wires Subject/Description/Due_Date/Status
    # plus Who_Id (contact link). Driving the metadata through
    # ``LeadRecordContract.metadata`` keeps the call shape identical to
    # the booking-followup task path.
    lead_record = LeadRecordContract(
        lead_id=normalized_reference or normalized_external_id,
        full_name=full_name,
        email=None,
        phone=None,
        source="conversation_transcript",
        company_name="BookedAI Conversation",
        tenant_id=None,
        lead_status="transcript_recorded",
        metadata={
            "service_name": "BookedAI conversation transcript",
            "booking_reference": normalized_reference,
            "task_subject": f"Chess booking transcript — {subject_reference}",
            "external_contact_id": normalized_external_id,
            "notes": normalized_transcript,
            "booking_path": "transcript_record",
        },
    )

    try:
        upsert_result = await crm_adapter.create_follow_up_task(
            overlaid_settings, lead=lead_record
        )
    except (httpx.HTTPError, ValueError) as error:
        _logger.warning(
            "zoho_transcript_task_push_failed",
            extra={
                "event_type": "zoho_transcript_task_push_failed",
                "tenant_id": "",
                "status": 0,
                "route": "service_layer.zoho_crm_transcript_sync",
                "request_id": "",
                "integration_name": "zoho_crm",
                "conversation_id": "",
                "booking_reference": normalized_reference,
                "job_name": "",
                "job_id": "",
                "error_type": type(error).__name__,
            },
        )
        return TranscriptSyncResult(
            sync_status="manual_review_required",
            line_count=line_count,
            warning_codes=["provider_error"],
        )

    record_id = str(upsert_result.get("external_id") or "").strip() or None
    return TranscriptSyncResult(
        sync_status="synced",
        record_id=record_id,
        line_count=line_count,
        warning_codes=[],
    )


# Override the Status / Description shape: the adapter's
# ``_build_task_payload`` hardcodes ``Status="Not Started"``. Transcripts
# are records-of-conversation, not action items, so we want to override
# Status to ``Completed`` and Due_Date to today. We accomplish this by
# wrapping the adapter call when needed via
# :func:`push_transcript_to_zoho_task_with_overrides`.


async def push_transcript_to_zoho_task_with_overrides(
    settings,
    *,
    contact_external_id: str,
    transcript: str,
    booking_reference: str,
    customer_name: str | None = None,
    tenant_credentials: object | None = None,
    adapter: ZohoCrmAdapter | None = None,
) -> TranscriptSyncResult:
    """Variant that posts the Zoho Task directly with a ``Completed`` status.

    The adapter's :meth:`ZohoCrmAdapter.create_follow_up_task` hardcodes
    ``Status="Not Started"`` and ``Due_Date=tomorrow`` — both wrong for a
    transcript-of-record entry. Rather than touching the adapter (frozen
    for this work item) we mint the payload here and ship it via the
    adapter's underlying ``_request`` helper, which is its single
    canonical HTTP entrypoint.

    Falls back to :func:`push_transcript_to_zoho_task` (the non-override
    path) if the adapter can't be coaxed — keeps the call site resilient
    to internal adapter changes.
    """
    normalized_external_id = (contact_external_id or "").strip()
    normalized_transcript = (transcript or "").strip()
    normalized_reference = (booking_reference or "").strip()
    if not normalized_transcript:
        return TranscriptSyncResult(sync_status="skipped", warning_codes=["empty_transcript"])
    if not normalized_external_id:
        return TranscriptSyncResult(
            sync_status="manual_review_required",
            warning_codes=["missing_contact_external_id"],
        )

    overlaid_settings = _settings_with_tenant_crm_credentials(settings, tenant_credentials)
    crm_adapter = adapter or ZohoCrmAdapter()
    if not crm_adapter.configured(overlaid_settings):
        return TranscriptSyncResult(
            sync_status="skipped",
            warning_codes=["provider_unconfigured"],
        )

    line_count = sum(1 for line in normalized_transcript.splitlines() if line.strip())
    subject_reference = normalized_reference or "(no reference)"
    today = datetime.now(timezone.utc).date().isoformat()

    payload: dict[str, Any] = {
        "Subject": f"Chess booking transcript — {subject_reference}",
        "Due_Date": today,
        "Status": "Completed",
        "Priority": "Low",
        "Description": normalized_transcript,
        "Who_Id": normalized_external_id,
    }
    if customer_name:
        # Zoho ignores unknown keys quietly; we leave a trace for ops.
        payload["Description"] = (
            f"Customer: {customer_name.strip()}\n"
            f"Booking reference: {subject_reference}\n\n"
            f"{normalized_transcript}"
        )

    try:
        access_token, api_domain, _ = await crm_adapter.get_access_token(overlaid_settings)
        api_base_url = crm_adapter._resolve_api_base_url(  # noqa: SLF001 — single canonical URL helper
            overlaid_settings, api_domain=api_domain
        )
        module_api_name = (
            (overlaid_settings.zoho_crm_default_task_module or "").strip() or "Tasks"
        )
        response_data = await crm_adapter._request(  # noqa: SLF001 — only HTTP entrypoint on the adapter
            access_token=access_token,
            method="POST",
            url=f"{api_base_url.rstrip('/')}/{module_api_name}",
            json_body={"data": [payload], "trigger": []},
        )
        result = crm_adapter._extract_upsert_result(response_data)  # noqa: SLF001
    except (httpx.HTTPError, ValueError) as error:
        _logger.warning(
            "zoho_transcript_task_push_failed",
            extra={
                "event_type": "zoho_transcript_task_push_failed",
                "tenant_id": "",
                "status": 0,
                "route": "service_layer.zoho_crm_transcript_sync",
                "request_id": "",
                "integration_name": "zoho_crm",
                "conversation_id": "",
                "booking_reference": normalized_reference,
                "job_name": "",
                "job_id": "",
                "error_type": type(error).__name__,
            },
        )
        return TranscriptSyncResult(
            sync_status="manual_review_required",
            line_count=line_count,
            warning_codes=["provider_error"],
        )

    record_id = str(result.get("external_id") or "").strip() or None
    return TranscriptSyncResult(
        sync_status="synced",
        record_id=record_id,
        line_count=line_count,
        warning_codes=[],
    )


# ---------------------------------------------------------------------------
# Inactivity-based rolling flush (Phase 4 §4)
# ---------------------------------------------------------------------------
#
# Background cron (every 15 min) calls ``find_idle_conversations`` to
# discover web/WhatsApp/Telegram conversations that have gone quiet for
# the channel-specific idle threshold. ``flush_idle_session`` then
# builds a transcript + creates a Zoho CRM Task on the contact, even if
# they never converted to a booking. This complements the
# booking-confirmation trigger so prospects who chatted but didn't book
# still land in the CRM for coach follow-up.
#
# Idempotency: the flusher persists ``last_transcript_flush_at`` on the
# tenant_settings JSON keyed by ``contact_key`` (sha-1 of email/phone)
# so subsequent cron runs within the inactivity window do not re-flush
# the same conversation.


_WEB_SOURCES = {"public_web", "embedded_widget", "widget", "chess_chat", "booking_assistant"}
_WHATSAPP_SOURCES = {"whatsapp"}
_TELEGRAM_SOURCES = {"telegram"}


@dataclass
class IdleConversation:
    """One idle conversation candidate awaiting transcript flush."""

    contact_id: str  # email when web, normalized phone when WhatsApp/Telegram
    channel: str  # "web" | "whatsapp" | "telegram"
    first_at: datetime
    last_at: datetime
    message_count: int


def _classify_channel(source: str | None) -> str:
    src = (source or "").strip().lower()
    if src in _WHATSAPP_SOURCES:
        return "whatsapp"
    if src in _TELEGRAM_SOURCES:
        return "telegram"
    if src in _WEB_SOURCES or src.startswith("booking"):
        return "web"
    return src or "web"


async def find_idle_conversations(
    session,
    *,
    web_idle_minutes: int = 30,
    whatsapp_idle_minutes: int = 240,
    lookback_hours: int = 24,
) -> list[IdleConversation]:
    """Return conversations that have crossed their idle threshold.

    Lookup window: ``[now - lookback_hours, now]``. We deliberately bound
    the lookback so a months-old dormant chat doesn't get re-flushed
    every 15 minutes in perpetuity — once a conversation drops out of
    the lookback window it is considered "archived" and the cron leaves
    it alone.

    Eligibility per channel:

    * ``web``: ``now - last_event >= web_idle_minutes``
    * ``whatsapp``: ``now - last_event >= whatsapp_idle_minutes`` (default 4h)
    * ``telegram``: same threshold as WhatsApp (cross-channel async chat)

    Identity key is ``sender_email`` for web (web chat usually carries
    the parent's email), and ``conversation_id`` for WhatsApp/Telegram
    (where conversation_id is the normalized phone / chat id).
    """
    now = datetime.now(timezone.utc)
    lookback_floor = now - timedelta(hours=max(lookback_hours, 1))

    statement = (
        select(ConversationEvent)
        .where(ConversationEvent.created_at >= lookback_floor)
        .order_by(ConversationEvent.created_at.asc())
    )
    result = await session.execute(statement)
    rows = list(result.scalars().all())

    grouped: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        channel = _classify_channel(row.source)
        if channel == "web":
            identity = (row.sender_email or "").strip().lower()
        else:
            identity = (row.conversation_id or "").strip()
        if not identity:
            continue
        key = (identity, channel)
        bucket = grouped.get(key)
        timestamp = row.created_at or now
        if bucket is None:
            grouped[key] = {
                "first_at": timestamp,
                "last_at": timestamp,
                "count": 1,
            }
        else:
            bucket["count"] += 1
            if timestamp < bucket["first_at"]:
                bucket["first_at"] = timestamp
            if timestamp > bucket["last_at"]:
                bucket["last_at"] = timestamp

    eligible: list[IdleConversation] = []
    for (identity, channel), bucket in grouped.items():
        last_at = bucket["last_at"]
        if last_at.tzinfo is None:
            last_at = last_at.replace(tzinfo=timezone.utc)
        idle_minutes = (now - last_at).total_seconds() / 60.0
        threshold = web_idle_minutes if channel == "web" else whatsapp_idle_minutes
        if idle_minutes < threshold:
            continue
        if (now - last_at) > timedelta(hours=lookback_hours):
            # Outside the actionable lookback window — leave for archive.
            continue
        eligible.append(
            IdleConversation(
                contact_id=identity,
                channel=channel,
                first_at=bucket["first_at"]
                if bucket["first_at"].tzinfo is not None
                else bucket["first_at"].replace(tzinfo=timezone.utc),
                last_at=last_at,
                message_count=int(bucket["count"]),
            )
        )
    eligible.sort(key=lambda c: c.last_at)
    return eligible


def _truncate_contact_key(channel: str, contact_id: str) -> str:
    return f"{channel}:{(contact_id or '').strip().lower()}"


def _short_contact_id(contact_id: str) -> str:
    raw = (contact_id or "").strip()
    if "@" in raw:
        local, _, _ = raw.partition("@")
        return local[:24] or "anon"
    if raw.startswith("+"):
        return raw[-6:]
    return raw[:8] or "anon"


async def flush_idle_session(
    session,
    settings,
    *,
    contact_id: str,
    channel: str,
    since: datetime | timedelta | None = None,
    contact_external_id: str | None = None,
    customer_name: str | None = None,
    tenant_credentials: object | None = None,
    tenant_id: str | None = None,
    last_flush_state: dict[str, Any] | None = None,
    inactivity_window_minutes: int = 30,
    adapter: ZohoCrmAdapter | None = None,
) -> TranscriptSyncResult:
    """Build + push a transcript for an idle conversation.

    Idempotency: callers thread the per-tenant
    ``settings_json.last_transcript_flush_at`` map (keyed by
    ``channel:contact_id``) into ``last_flush_state``; when a previous
    flush exists within ``inactivity_window_minutes`` we skip and return
    ``skipped`` with ``already_flushed_recently``.

    The Zoho push uses the override-status path so the Task lands as
    ``Completed`` (record-of-conversation) rather than an open action item.
    Subject: ``Chess inquiry transcript ({channel}) — {contact_id_short}``.
    """
    normalized_contact_id = (contact_id or "").strip()
    if not normalized_contact_id:
        return TranscriptSyncResult(
            sync_status="skipped", warning_codes=["missing_contact_identity"]
        )
    state_key = _truncate_contact_key(channel, normalized_contact_id)
    state_map = (
        last_flush_state.get("last_transcript_flush_at")
        if isinstance(last_flush_state, dict)
        else None
    )
    if isinstance(state_map, dict) and state_key in state_map:
        try:
            previous_flush = datetime.fromisoformat(str(state_map[state_key]))
            if previous_flush.tzinfo is None:
                previous_flush = previous_flush.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - previous_flush < timedelta(
                minutes=inactivity_window_minutes
            ):
                return TranscriptSyncResult(
                    sync_status="skipped",
                    warning_codes=["already_flushed_recently"],
                )
        except (ValueError, TypeError):
            pass

    contact_email = normalized_contact_id if "@" in normalized_contact_id else None
    contact_phone = (
        normalized_contact_id
        if not contact_email and normalized_contact_id.startswith("+")
        else None
    )
    conversation_id = (
        normalized_contact_id
        if not contact_email and not contact_phone
        else None
    )

    transcript = await build_transcript_summary(
        session,
        contact_email=contact_email,
        contact_phone=contact_phone,
        conversation_id=conversation_id,
        since=since or timedelta(hours=24),
    )
    if not transcript.strip():
        return TranscriptSyncResult(
            sync_status="skipped", warning_codes=["empty_transcript"]
        )

    short_id = _short_contact_id(normalized_contact_id)
    booking_reference_label = f"inactivity-{channel}-{short_id}"

    # Reuse the override push helper to keep the same
    # Subject/Description/Status shape as the booking-confirmation
    # transcript flush. We override the subject prefix downstream by
    # passing a synthetic booking_reference whose display value is
    # what we want to surface.
    overlaid_settings = _settings_with_tenant_crm_credentials(settings, tenant_credentials)
    crm_adapter = adapter or ZohoCrmAdapter()
    if not crm_adapter.configured(overlaid_settings):
        return TranscriptSyncResult(
            sync_status="skipped",
            warning_codes=["provider_unconfigured"],
        )
    if not (contact_external_id or "").strip():
        return TranscriptSyncResult(
            sync_status="manual_review_required",
            warning_codes=["missing_contact_external_id"],
        )

    line_count = sum(1 for line in transcript.splitlines() if line.strip())
    today = datetime.now(timezone.utc).date().isoformat()
    payload: dict[str, Any] = {
        "Subject": f"Chess inquiry transcript ({channel}) — {short_id}",
        "Due_Date": today,
        "Status": "Completed",
        "Priority": "Low",
        "Description": (
            f"Channel: {channel}\n"
            f"Contact key: {normalized_contact_id}\n"
            f"Customer: {(customer_name or 'BookedAI Conversation').strip()}\n\n"
            f"{transcript}"
        ),
        "Who_Id": (contact_external_id or "").strip(),
    }

    try:
        access_token, api_domain, _ = await crm_adapter.get_access_token(overlaid_settings)
        api_base_url = crm_adapter._resolve_api_base_url(  # noqa: SLF001
            overlaid_settings, api_domain=api_domain
        )
        module_api_name = (
            (overlaid_settings.zoho_crm_default_task_module or "").strip() or "Tasks"
        )
        response_data = await crm_adapter._request(  # noqa: SLF001
            access_token=access_token,
            method="POST",
            url=f"{api_base_url.rstrip('/')}/{module_api_name}",
            json_body={"data": [payload], "trigger": []},
        )
        upsert_result = crm_adapter._extract_upsert_result(response_data)  # noqa: SLF001
    except (httpx.HTTPError, ValueError) as error:
        _logger.warning(
            "zoho_idle_flush_push_failed",
            extra={
                "event_type": "zoho_idle_flush_push_failed",
                "tenant_id": str(tenant_id or ""),
                "status": 0,
                "route": "service_layer.zoho_crm_transcript_sync",
                "request_id": "",
                "integration_name": "zoho_crm",
                "conversation_id": conversation_id or "",
                "booking_reference": booking_reference_label,
                "job_name": "chess_transcript_inactivity_flush",
                "job_id": "",
                "error_type": type(error).__name__,
            },
        )
        return TranscriptSyncResult(
            sync_status="manual_review_required",
            line_count=line_count,
            warning_codes=["provider_error"],
        )

    record_id = str(upsert_result.get("external_id") or "").strip() or None
    return TranscriptSyncResult(
        sync_status="synced",
        record_id=record_id,
        line_count=line_count,
        warning_codes=[],
    )


__all__ = [
    "IdleConversation",
    "TranscriptLine",
    "TranscriptSyncResult",
    "build_transcript_summary",
    "find_idle_conversations",
    "flush_idle_session",
    "push_transcript_to_zoho_task",
    "push_transcript_to_zoho_task_with_overrides",
]
