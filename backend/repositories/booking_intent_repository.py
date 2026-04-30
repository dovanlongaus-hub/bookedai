from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import text

from repositories.base import BaseRepository


class BookingIntentRepository(BaseRepository):
    """Repository seam for dual-written booking intent records."""

    async def upsert_booking_intent(
        self,
        *,
        tenant_id: str | None = None,
        contact_id: str | None = None,
        booking_reference: str,
        conversation_id: str | None = None,
        source: str | None = None,
        service_name: str | None = None,
        service_id: str | None = None,
        requested_date: str | None = None,
        requested_time: str | None = None,
        timezone: str | None = None,
        booking_path: str = "request_callback",
        confidence_level: str = "unverified",
        status: str = "draft",
        payment_dependency_state: str | None = None,
        metadata_json: str = "{}",
    ) -> str | None:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_reference = booking_reference.strip()
        if not effective_tenant_id or not normalized_reference:
            return None

        result = await self.session.execute(
            text(
                """
                insert into booking_intents (
                  tenant_id,
                  contact_id,
                  conversation_id,
                  booking_reference,
                  source,
                  service_name,
                  service_id,
                  requested_date,
                  requested_time,
                  timezone,
                  booking_path,
                  confidence_level,
                  status,
                  payment_dependency_state,
                  metadata_json
                )
                values (
                  :tenant_id,
                  cast(:contact_id as uuid),
                  :conversation_id,
                  :booking_reference,
                  :source,
                  :service_name,
                  :service_id,
                  :requested_date,
                  :requested_time,
                  :timezone,
                  :booking_path,
                  :confidence_level,
                  :status,
                  :payment_dependency_state,
                  cast(:metadata_json as jsonb)
                )
                on conflict (booking_reference)
                do update set
                  contact_id = excluded.contact_id,
                  conversation_id = excluded.conversation_id,
                  source = excluded.source,
                  service_name = excluded.service_name,
                  service_id = excluded.service_id,
                  requested_date = excluded.requested_date,
                  requested_time = excluded.requested_time,
                  timezone = excluded.timezone,
                  booking_path = excluded.booking_path,
                  confidence_level = excluded.confidence_level,
                  status = excluded.status,
                  payment_dependency_state = excluded.payment_dependency_state,
                  metadata_json = excluded.metadata_json,
                  updated_at = now()
                returning id::text
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "contact_id": (contact_id or "").strip() or None,
                "conversation_id": conversation_id,
                "booking_reference": normalized_reference,
                "source": source,
                "service_name": service_name,
                "service_id": service_id,
                "requested_date": requested_date,
                "requested_time": requested_time,
                "timezone": timezone,
                "booking_path": booking_path,
                "confidence_level": confidence_level,
                "status": status,
                "payment_dependency_state": payment_dependency_state,
                "metadata_json": metadata_json,
            },
        )
        return result.scalar_one_or_none()

    async def list_shadow_booking_rows(
        self,
        *,
        tenant_id: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, object | None]]:
        effective_tenant_id = tenant_id or self.tenant_id
        if not effective_tenant_id:
            return []

        result = await self.session.execute(
            text(
                """
                select
                  bi.id::text as booking_intent_id,
                  bi.booking_reference,
                  bi.service_name,
                  bi.service_id,
                  bi.requested_date,
                  bi.requested_time,
                  bi.timezone,
                  bi.status as booking_status,
                  bi.created_at,
                  bi.metadata_json
                from booking_intents bi
                where bi.tenant_id = :tenant_id
                order by bi.created_at desc
                limit :limit
                """
            ),
            {"tenant_id": effective_tenant_id, "limit": max(limit, 1)},
        )
        return [dict(row._mapping) for row in result]

    async def sync_callback_status(
        self,
        *,
        tenant_id: str | None = None,
        booking_reference: str,
        status: str | None = None,
        payment_dependency_state: str | None = None,
        metadata_updates: dict[str, object | None] | None = None,
    ) -> dict[str, object | None]:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_reference = booking_reference.strip()
        if not effective_tenant_id or not normalized_reference:
            return {}

        lookup = await self.session.execute(
            text(
                """
                select
                  id::text as booking_intent_id,
                  contact_id::text as contact_id,
                  metadata_json
                from booking_intents
                where tenant_id = :tenant_id
                  and booking_reference = :booking_reference
                limit 1
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "booking_reference": normalized_reference,
            },
        )
        row = lookup.mappings().first()
        if not row:
            return {}

        existing_metadata = dict(row.get("metadata_json") or {})
        if metadata_updates:
            existing_metadata.update(
                {
                    key: value
                    for key, value in metadata_updates.items()
                    if value is not None and str(value).strip() != ""
                }
            )

        await self.session.execute(
            text(
                """
                update booking_intents
                set
                  status = coalesce(:status, status),
                  payment_dependency_state = coalesce(
                    :payment_dependency_state,
                    payment_dependency_state
                  ),
                  metadata_json = cast(:metadata_json as jsonb),
                  updated_at = now()
                where id = cast(:booking_intent_id as uuid)
                """
            ),
            {
                "booking_intent_id": row["booking_intent_id"],
                "status": (status or "").strip() or None,
                "payment_dependency_state": (payment_dependency_state or "").strip() or None,
                "metadata_json": json.dumps(existing_metadata),
            },
        )
        return {
            "booking_intent_id": row["booking_intent_id"],
            "contact_id": row.get("contact_id"),
        }

    async def update_zoho_meeting_metadata(
        self,
        *,
        booking_reference: str,
        meeting_url: str | None,
        calendar_event_url: str | None = None,
        event_id: str | None = None,
        scheduled_at: datetime | None = None,
        extra: dict[str, object | None] | None = None,
    ) -> dict[str, object | None] | None:
        """Persist Zoho Meeting + calendar metadata onto a booking_intent row.

        Stores the conference details under ``metadata_json.zoho_meeting`` so
        downstream surfaces (student portal, tenant view, lifecycle emails) can
        read a single canonical location. Returns the merged metadata for the
        caller's logging or ``None`` when the booking_reference does not match
        any row.
        """
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return None

        normalized_meeting_url = (meeting_url or "").strip() or None
        if normalized_meeting_url is None and not (calendar_event_url or event_id):
            # Nothing actionable to persist — keep callers idempotent.
            return None

        lookup = await self.session.execute(
            text(
                """
                select id::text as booking_intent_id, metadata_json
                from booking_intents
                where booking_reference = :booking_reference
                limit 1
                """
            ),
            {"booking_reference": normalized_reference},
        )
        row = lookup.mappings().first()
        if not row:
            return None

        existing_metadata = dict(row.get("metadata_json") or {})
        existing_zoho = (
            dict(existing_metadata.get("zoho_meeting") or {})
            if isinstance(existing_metadata.get("zoho_meeting"), dict)
            else {}
        )
        if normalized_meeting_url is not None:
            existing_zoho["meeting_url"] = normalized_meeting_url
        if calendar_event_url:
            existing_zoho["calendar_event_url"] = calendar_event_url
        if event_id:
            existing_zoho["event_id"] = event_id
        if scheduled_at is not None:
            existing_zoho["scheduled_at"] = (
                scheduled_at.isoformat()
                if hasattr(scheduled_at, "isoformat")
                else str(scheduled_at)
            )
        if extra:
            for key, value in extra.items():
                if value is None:
                    continue
                existing_zoho[key] = value

        existing_metadata["zoho_meeting"] = existing_zoho

        await self.session.execute(
            text(
                """
                update booking_intents
                set
                  metadata_json = cast(:metadata_json as jsonb),
                  updated_at = now()
                where id = cast(:booking_intent_id as uuid)
                """
            ),
            {
                "booking_intent_id": row["booking_intent_id"],
                "metadata_json": json.dumps(existing_metadata),
            },
        )
        return existing_metadata

    async def update_slot_assignment(
        self,
        *,
        booking_reference: str,
        new_slot_id: str | None = None,
        new_requested_date: str | None = None,
        new_requested_time: str | None = None,
        new_timezone: str | None = None,
    ) -> dict | None:
        """Update slot assignment fields on a booking_intent row.

        Used by reschedule flows: chess paths typically pass ``new_slot_id``
        (which is persisted under ``metadata_json.slot_id`` since the
        ``booking_intents`` table has no dedicated column for it), while AI
        Mentor paths typically pass new date/time/timezone. Each parameter is
        only applied when non-None — callers can mix and match without
        clobbering unrelated fields. Returns the updated row as a dict, or
        ``None`` when no row matched ``booking_reference``.
        """
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return None

        normalized_slot_id = (new_slot_id or "").strip() or None
        if (
            normalized_slot_id is None
            and new_requested_date is None
            and new_requested_time is None
            and new_timezone is None
        ):
            # Nothing actionable to persist — keep callers idempotent.
            return None

        if normalized_slot_id is not None:
            lookup = await self.session.execute(
                text(
                    """
                    select id::text as booking_intent_id, metadata_json
                    from booking_intents
                    where booking_reference = :booking_reference
                    limit 1
                    """
                ),
                {"booking_reference": normalized_reference},
            )
            row = lookup.mappings().first()
            if not row:
                return None
            existing_metadata = dict(row.get("metadata_json") or {})
            existing_metadata["slot_id"] = normalized_slot_id
            metadata_payload = json.dumps(existing_metadata)
        else:
            metadata_payload = None

        result = await self.session.execute(
            text(
                """
                update booking_intents
                set
                  requested_date = coalesce(:new_requested_date, requested_date),
                  requested_time = coalesce(:new_requested_time, requested_time),
                  timezone = coalesce(:new_timezone, timezone),
                  metadata_json = coalesce(
                    cast(:metadata_json as jsonb),
                    metadata_json
                  ),
                  updated_at = now()
                where booking_reference = :booking_reference
                returning
                  id::text as booking_intent_id,
                  tenant_id::text as tenant_id,
                  booking_reference,
                  requested_date,
                  requested_time,
                  timezone,
                  metadata_json,
                  status,
                  updated_at
                """
            ),
            {
                "booking_reference": normalized_reference,
                "new_requested_date": new_requested_date,
                "new_requested_time": new_requested_time,
                "new_timezone": new_timezone,
                "metadata_json": metadata_payload,
            },
        )
        row = result.mappings().first()
        if not row:
            return None
        return dict(row)

    async def fetch_meeting_metadata(
        self,
        *,
        booking_reference: str,
    ) -> dict[str, object | None] | None:
        """Return ``zoho_meeting`` metadata + tenant context for a booking.

        Used by the regenerate endpoint and the chess+tenant view handlers so
        they can read the meeting URL plus the tenant id (for fallback +
        authorisation checks) in a single round-trip.
        """
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return None

        result = await self.session.execute(
            text(
                """
                select
                  bi.id::text as booking_intent_id,
                  bi.tenant_id::text as tenant_id,
                  bi.booking_reference,
                  bi.service_name,
                  bi.service_id,
                  bi.requested_date,
                  bi.requested_time,
                  bi.timezone,
                  bi.metadata_json,
                  c.email as customer_email,
                  c.full_name as customer_name
                from booking_intents bi
                left join contacts c on c.id = bi.contact_id
                where bi.booking_reference = :booking_reference
                limit 1
                """
            ),
            {"booking_reference": normalized_reference},
        )
        row = result.mappings().first()
        if not row:
            return None
        record = dict(row)
        metadata = record.get("metadata_json") or {}
        record["metadata_json"] = dict(metadata) if isinstance(metadata, dict) else {}
        return record

    async def store_portal_access_token(
        self,
        *,
        booking_reference: str,
        token_hash: str,
        expires_at: datetime,
    ) -> bool:
        """Persist the SHA-256 hash of a freshly minted portal access token."""
        normalized_reference = (booking_reference or "").strip()
        normalized_hash = (token_hash or "").strip()
        if not normalized_reference or not normalized_hash:
            return False

        result = await self.session.execute(
            text(
                """
                update booking_intents
                set
                  portal_access_token_hash = :token_hash,
                  portal_access_token_expires_at = :expires_at,
                  portal_access_token_revoked_at = null,
                  updated_at = now()
                where booking_reference = :booking_reference
                returning id::text
                """
            ),
            {
                "booking_reference": normalized_reference,
                "token_hash": normalized_hash,
                "expires_at": expires_at,
            },
        )
        return result.scalar_one_or_none() is not None

    async def load_portal_access_token_record(
        self,
        *,
        booking_reference: str,
    ) -> dict[str, object | None] | None:
        """Return stored portal access token metadata for verification."""
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return None

        result = await self.session.execute(
            text(
                """
                select
                  portal_access_token_hash,
                  portal_access_token_expires_at,
                  portal_access_token_revoked_at
                from booking_intents
                where booking_reference = :booking_reference
                limit 1
                """
            ),
            {"booking_reference": normalized_reference},
        )
        row = result.mappings().first()
        if not row:
            return None
        return dict(row)

    async def configure_reminder_cadence(
        self,
        *,
        booking_reference: str,
        cadence: str | None,
        next_at: datetime | None,
    ) -> dict[str, object | None] | None:
        """Configure or clear the recurring reminder for a booking."""
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return None

        result = await self.session.execute(
            text(
                """
                update booking_intents
                set
                  reminder_cadence = :cadence,
                  reminder_next_at = :next_at,
                  updated_at = now()
                where booking_reference = :booking_reference
                returning
                  id::text as booking_intent_id,
                  tenant_id::text as tenant_id,
                  reminder_cadence,
                  reminder_next_at,
                  reminder_last_sent_at
                """
            ),
            {
                "booking_reference": normalized_reference,
                "cadence": (cadence or "").strip() or None,
                "next_at": next_at,
            },
        )
        row = result.mappings().first()
        if not row:
            return None
        return dict(row)

    async def load_reminder_state(
        self,
        *,
        booking_reference: str,
    ) -> dict[str, object | None] | None:
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return None

        result = await self.session.execute(
            text(
                """
                select
                  id::text as booking_intent_id,
                  tenant_id::text as tenant_id,
                  reminder_cadence,
                  reminder_next_at,
                  reminder_last_sent_at
                from booking_intents
                where booking_reference = :booking_reference
                limit 1
                """
            ),
            {"booking_reference": normalized_reference},
        )
        row = result.mappings().first()
        if not row:
            return None
        return dict(row)

    async def list_reminders_due(
        self,
        *,
        cadence: str = "monthly",
        limit: int = 50,
    ) -> list[dict[str, object | None]]:
        """Return bookings whose monthly reminder is due to fire.

        ``preferred_locale`` is best-effort — pulled from
        ``ai_mentor_student_users`` when the email matches a signed-in AI
        Mentor learner; null otherwise. Workers fall back to ``en`` when null.
        """
        result = await self.session.execute(
            text(
                """
                select
                  bi.id::text as booking_intent_id,
                  bi.tenant_id::text as tenant_id,
                  bi.booking_reference,
                  bi.service_name,
                  bi.requested_date,
                  bi.requested_time,
                  bi.timezone,
                  bi.reminder_cadence,
                  bi.reminder_next_at,
                  bi.reminder_last_sent_at,
                  c.full_name as customer_name,
                  c.email as customer_email,
                  c.phone as customer_phone,
                  amsu.preferred_locale as preferred_locale
                from booking_intents bi
                left join contacts c on c.id = bi.contact_id
                left join ai_mentor_student_users amsu
                  on lower(amsu.email) = lower(coalesce(c.email, ''))
                where bi.reminder_cadence = :cadence
                  and bi.reminder_next_at is not null
                  and bi.reminder_next_at <= now()
                order by bi.reminder_next_at asc
                limit :limit
                """
            ),
            {"cadence": cadence, "limit": max(int(limit or 1), 1)},
        )
        return [dict(row._mapping) for row in result]

    async def mark_reminder_sent(
        self,
        *,
        booking_reference: str,
        next_at: datetime,
    ) -> bool:
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return False

        result = await self.session.execute(
            text(
                """
                update booking_intents
                set
                  reminder_last_sent_at = now(),
                  reminder_next_at = :next_at,
                  updated_at = now()
                where booking_reference = :booking_reference
                returning id::text
                """
            ),
            {
                "booking_reference": normalized_reference,
                "next_at": next_at,
            },
        )
        return result.scalar_one_or_none() is not None

    async def list_feedback_requests_due(
        self,
        *,
        elapsed_hours: int = 24,
        limit: int = 50,
    ) -> list[dict[str, object | None]]:
        """Return confirmed bookings whose session ended ``elapsed_hours`` ago
        and whose post-session feedback prompt has not yet been dispatched.

        Session end is derived from ``requested_date + requested_time`` in the
        booking timezone (defaulting to UTC). Tenants must have the
        ``post_booking_feedback`` feature enabled in
        ``tenants.partner_config_jsonb -> 'features' ->> 'post_booking_feedback'
        = 'true'`` OR be the legacy ``ai-mentor-doer`` slug used as the launch
        partner.
        """
        result = await self.session.execute(
            text(
                """
                select
                  bi.id::text as booking_intent_id,
                  bi.tenant_id::text as tenant_id,
                  bi.booking_reference,
                  bi.service_name,
                  bi.requested_date,
                  bi.requested_time,
                  bi.timezone,
                  bi.status,
                  c.full_name as customer_name,
                  c.email as customer_email,
                  c.phone as customer_phone,
                  t.slug as tenant_slug,
                  t.partner_config_jsonb as tenant_partner_config
                from booking_intents bi
                left join contacts c on c.id = bi.contact_id
                left join tenants t on t.id = bi.tenant_id
                where bi.status = 'confirmed'
                  and bi.feedback_request_sent_at is null
                  and bi.requested_date is not null
                  and (
                    coalesce(
                      (bi.requested_date || ' ' || coalesce(bi.requested_time, '00:00'))::timestamp
                        at time zone coalesce(nullif(bi.timezone, ''), 'UTC'),
                      now()
                    )
                  ) + (:elapsed_hours::int * interval '1 hour') < now()
                  and (
                    (t.partner_config_jsonb -> 'features' ->> 'post_booking_feedback') = 'true'
                    or t.slug = 'ai-mentor-doer'
                  )
                order by bi.requested_date asc, bi.requested_time asc
                limit :limit
                """
            ),
            {
                "elapsed_hours": int(max(elapsed_hours, 0)),
                "limit": max(int(limit or 1), 1),
            },
        )
        return [dict(row._mapping) for row in result]

    async def mark_feedback_request_sent(
        self,
        *,
        booking_reference: str,
    ) -> bool:
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return False

        result = await self.session.execute(
            text(
                """
                update booking_intents
                set
                  feedback_request_sent_at = now(),
                  updated_at = now()
                where booking_reference = :booking_reference
                  and feedback_request_sent_at is null
                returning id::text
                """
            ),
            {"booking_reference": normalized_reference},
        )
        return result.scalar_one_or_none() is not None

    async def fetch_booking_with_contact(
        self,
        *,
        booking_reference: str,
    ) -> dict[str, object | None] | None:
        """Lookup booking + linked contact + tenant for downstream consumers.

        Used by the Zoho CRM feedback note consumer so the worker can look
        up the contact's email/phone in a single SQL round-trip rather than
        chaining repository calls.
        """
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return None

        result = await self.session.execute(
            text(
                """
                select
                  bi.id::text as booking_intent_id,
                  bi.tenant_id::text as tenant_id,
                  bi.booking_reference,
                  bi.service_name,
                  c.full_name as customer_name,
                  c.email as customer_email,
                  c.phone as customer_phone,
                  t.slug as tenant_slug,
                  t.partner_config_jsonb as tenant_partner_config
                from booking_intents bi
                left join contacts c on c.id = bi.contact_id
                left join tenants t on t.id = bi.tenant_id
                where bi.booking_reference = :booking_reference
                limit 1
                """
            ),
            {"booking_reference": normalized_reference},
        )
        row = result.mappings().first()
        if not row:
            return None
        return dict(row)

    async def is_transcript_task_synced(
        self,
        *,
        booking_reference: str,
    ) -> bool:
        """Return True when this booking already has a Zoho transcript Task.

        Idempotency guard for the conversation-transcript Zoho sync flow:
        the booking-confirmation handler may fire twice on retries, and we
        must not spam the CRM contact timeline with duplicate transcripts.
        Reads ``metadata_json.transcript_task_synced`` and treats a truthy
        value as "already synced; skip".
        """
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return False
        result = await self.session.execute(
            text(
                """
                select metadata_json
                from booking_intents
                where booking_reference = :booking_reference
                limit 1
                """
            ),
            {"booking_reference": normalized_reference},
        )
        row = result.mappings().first()
        if not row:
            return False
        metadata = row.get("metadata_json")
        if not isinstance(metadata, dict):
            return False
        return bool(metadata.get("transcript_task_synced"))

    async def mark_transcript_task_synced(
        self,
        *,
        booking_reference: str,
        zoho_task_id: str | None = None,
        line_count: int | None = None,
    ) -> bool:
        """Stamp a booking_intent row as having had its transcript pushed to Zoho.

        Stores ``transcript_task_synced=true`` plus a small audit dict
        (``transcript_task = {zoho_task_id, line_count, synced_at}``) so
        operators can reconcile the Zoho Task back to the local booking
        without round-tripping the CRM API.
        """
        normalized_reference = (booking_reference or "").strip()
        if not normalized_reference:
            return False

        lookup = await self.session.execute(
            text(
                """
                select id::text as booking_intent_id, metadata_json
                from booking_intents
                where booking_reference = :booking_reference
                limit 1
                """
            ),
            {"booking_reference": normalized_reference},
        )
        row = lookup.mappings().first()
        if not row:
            return False

        existing_metadata = (
            dict(row.get("metadata_json")) if isinstance(row.get("metadata_json"), dict) else {}
        )
        existing_metadata["transcript_task_synced"] = True
        transcript_audit = {
            "zoho_task_id": (zoho_task_id or "").strip() or None,
            "line_count": int(line_count) if line_count is not None else None,
            "synced_at": datetime.utcnow().isoformat() + "Z",
        }
        existing_metadata["transcript_task"] = {
            key: value for key, value in transcript_audit.items() if value is not None
        }

        await self.session.execute(
            text(
                """
                update booking_intents
                set
                  metadata_json = cast(:metadata_json as jsonb),
                  updated_at = now()
                where id = cast(:booking_intent_id as uuid)
                """
            ),
            {
                "booking_intent_id": row["booking_intent_id"],
                "metadata_json": json.dumps(existing_metadata),
            },
        )
        return True
