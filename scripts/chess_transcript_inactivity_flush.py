"""Cross-channel idle-conversation transcript flush (Phase 4 §4).

Every 15 minutes, scan ``conversation_events`` for sessions that have
gone quiet (web 30 min, WhatsApp/Telegram 4 hours) without a booking.
Build the rendered transcript and push it to Zoho CRM as a Completed
Task on the parent's Contact, even though they never booked. Useful for
follow-up on prospects.

Cron line (production VPS):

    */15 * * * * cd /home/dovanlong/BookedAI && \
        /home/dovanlong/BookedAI/.venv-backend/bin/python -m \
        scripts.chess_transcript_inactivity_flush >> \
        /var/log/chess-inactivity-flush.log 2>&1

Idempotency: per-(channel, contact_id) the script persists the
``last_transcript_flush_at`` timestamp on
``tenant_settings.settings_json`` so a subsequent cron run inside the
inactivity window will not double-flush. Stamp is keyed by
``"{channel}:{contact_id_lowercase}"``.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from sqlalchemy import text  # type: ignore

from config import get_settings  # type: ignore
from db import create_engine, create_session_factory, get_session  # type: ignore
from service_layer.zoho_crm_transcript_sync import (  # type: ignore
    find_idle_conversations,
    flush_idle_session,
)


_DEFAULT_TENANT_SLUG = "co-mai-hung-chess-class"
_LAST_FLUSH_STATE_KEY = "last_transcript_flush_at"


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("chess_inactivity_flush")


async def _resolve_tenant(session, tenant_slug: str) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select
              t.id::text as id,
              t.slug,
              t.name
            from tenants t
            where t.slug = :slug
            limit 1
            """
        ),
        {"slug": tenant_slug},
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def _fetch_tenant_settings(session, tenant_id: str) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select settings_json
            from tenant_settings
            where tenant_id = cast(:tenant_id as uuid)
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = result.mappings().first()
    settings_json = (row or {}).get("settings_json") if row else None
    return dict(settings_json) if isinstance(settings_json, dict) else {}


async def _resolve_contact_external_id(
    session, *, tenant_id: str, channel: str, contact_id: str
) -> tuple[str | None, str | None]:
    """Look up the Zoho CRM external id + display name for a contact key.

    For web (email-keyed) we match ``contacts.email``; for WhatsApp /
    Telegram (phone-keyed) we match ``contacts.phone``. The Zoho CRM
    external id lives on ``crm_sync_records`` (the canonical mirror)
    when the contact has been synced.
    """
    if channel == "web":
        match_clause = "lower(coalesce(c.email, '')) = :match_value"
        match_value = contact_id.lower()
    else:
        match_clause = "regexp_replace(coalesce(c.phone, ''), '[^0-9+]', '', 'g') = :match_value"
        match_value = contact_id

    result = await session.execute(
        text(
            f"""
            select
              c.id::text as contact_uuid,
              c.full_name,
              csr.external_entity_id as zoho_external_id
            from contacts c
            left join crm_sync_records csr
              on csr.tenant_id = c.tenant_id
             and csr.entity_type = 'contact'
             and csr.entity_id = c.id::text
            where c.tenant_id = cast(:tenant_id as uuid)
              and {match_clause}
            order by csr.updated_at desc nulls last
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "match_value": match_value},
    )
    row = result.mappings().first()
    if not row:
        return (None, None)
    external = (row.get("zoho_external_id") or "")
    return (str(external).strip() or None, (row.get("full_name") or "").strip() or None)


async def _persist_flush_timestamp(
    session, tenant_id: str, *, key: str, ran_at: datetime
) -> None:
    payload = {_LAST_FLUSH_STATE_KEY: {key: ran_at.isoformat()}}
    await session.execute(
        text(
            """
            insert into tenant_settings (tenant_id, settings_json)
            values (cast(:tenant_id as uuid), cast(:settings_json as jsonb))
            on conflict (tenant_id) do update
            set settings_json = jsonb_set(
                  coalesce(tenant_settings.settings_json, '{}'::jsonb),
                  ARRAY[:state_key, :entry_key],
                  to_jsonb(cast(:entry_value as text)),
                  true
                ),
                version = tenant_settings.version + 1,
                updated_at = now()
            """
        ),
        {
            "tenant_id": tenant_id,
            "settings_json": json.dumps(payload),
            "state_key": _LAST_FLUSH_STATE_KEY,
            "entry_key": key,
            "entry_value": ran_at.isoformat(),
        },
    )


async def run(
    *,
    tenant_slug: str,
    web_idle_minutes: int,
    whatsapp_idle_minutes: int,
    dry_run: bool,
) -> int:
    settings = get_settings()
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)

    summary = {"eligible": 0, "synced": 0, "skipped": 0, "failed": 0, "dry_run": 0}

    async with get_session(session_factory) as session:
        tenant = await _resolve_tenant(session, tenant_slug)
        if not tenant:
            log.error("tenant slug %s not found", tenant_slug)
            return 2
        tenant_id = tenant["id"]
        tenant_settings_json = await _fetch_tenant_settings(session, tenant_id)

        idle_conversations = await find_idle_conversations(
            session,
            web_idle_minutes=web_idle_minutes,
            whatsapp_idle_minutes=whatsapp_idle_minutes,
        )
        summary["eligible"] = len(idle_conversations)
        log.info(
            "idle conversations | tenant=%s eligible=%d web_idle_min=%d whatsapp_idle_min=%d dry_run=%s",
            tenant_slug,
            len(idle_conversations),
            web_idle_minutes,
            whatsapp_idle_minutes,
            dry_run,
        )

        for idle in idle_conversations:
            log_payload = {
                "channel": idle.channel,
                "contact_id": idle.contact_id,
                "first_at": idle.first_at.isoformat(),
                "last_at": idle.last_at.isoformat(),
                "message_count": idle.message_count,
            }
            if dry_run:
                summary["dry_run"] += 1
                log.info("dry-run | %s", log_payload)
                continue

            contact_external_id, customer_name = await _resolve_contact_external_id(
                session,
                tenant_id=tenant_id,
                channel=idle.channel,
                contact_id=idle.contact_id,
            )
            result = await flush_idle_session(
                session,
                settings,
                contact_id=idle.contact_id,
                channel=idle.channel,
                contact_external_id=contact_external_id,
                customer_name=customer_name,
                tenant_id=tenant_id,
                last_flush_state=tenant_settings_json,
                inactivity_window_minutes=(
                    web_idle_minutes if idle.channel == "web" else whatsapp_idle_minutes
                ),
            )
            log.info(
                "flush | %s sync_status=%s warnings=%s",
                log_payload,
                result.sync_status,
                result.warning_codes,
            )
            if result.sync_status == "synced":
                summary["synced"] += 1
                key = f"{idle.channel}:{idle.contact_id.lower()}"
                await _persist_flush_timestamp(
                    session,
                    tenant_id,
                    key=key,
                    ran_at=datetime.now(timezone.utc),
                )
            elif result.sync_status == "skipped":
                summary["skipped"] += 1
            else:
                summary["failed"] += 1

        if not dry_run:
            await session.commit()

    log.info("summary: %s", summary)
    return 0 if summary["failed"] == 0 else 1


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cross-channel idle conversation transcript flush."
    )
    parser.add_argument("--tenant-slug", default=_DEFAULT_TENANT_SLUG)
    parser.add_argument(
        "--web-idle-minutes",
        type=int,
        default=30,
        help="Minutes of inactivity before a web chat is flushed (default 30).",
    )
    parser.add_argument(
        "--whatsapp-idle-minutes",
        type=int,
        default=240,
        help="Minutes of inactivity before a WhatsApp/Telegram session is flushed (default 240 = 4h).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute + log eligibility without dispatching.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(list(argv if argv is not None else sys.argv[1:]))
    return asyncio.run(
        run(
            tenant_slug=args.tenant_slug,
            web_idle_minutes=args.web_idle_minutes,
            whatsapp_idle_minutes=args.whatsapp_idle_minutes,
            dry_run=args.dry_run,
        )
    )


if __name__ == "__main__":
    sys.exit(main())
