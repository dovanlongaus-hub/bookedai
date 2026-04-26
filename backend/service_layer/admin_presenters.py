from __future__ import annotations

from datetime import UTC

from db import ConversationEvent, PartnerProfile, ServiceMerchantProfile
from service_layer.catalog_quality_service import catalog_quality_warnings
from schemas import ServiceCatalogItem
from services import resolve_service_image_url


def build_booking_record(event: ConversationEvent) -> dict[str, object | None]:
    metadata = event.metadata_json or {}
    service = metadata.get("service") if isinstance(metadata.get("service"), dict) else {}
    contact = metadata.get("contact") if isinstance(metadata.get("contact"), dict) else {}
    booking = metadata.get("booking") if isinstance(metadata.get("booking"), dict) else {}
    service_name = (
        metadata.get("package_name")
        or service.get("name")
        or (metadata.get("service") if isinstance(metadata.get("service"), str) else None)
    )

    return {
        "booking_reference": metadata.get("booking_reference")
        or event.conversation_id
        or f"event-{event.id}",
        "created_at": event.created_at.astimezone(UTC).isoformat(),
        "industry": metadata.get("industry") or service.get("category"),
        "customer_name": contact.get("name") or event.sender_name,
        "customer_email": contact.get("email") or event.sender_email,
        "business_email": metadata.get("business_email"),
        "customer_phone": contact.get("phone"),
        "service_name": service_name or booking.get("requested_service"),
        "service_id": service.get("id"),
        "requested_date": booking.get("requested_date"),
        "requested_time": booking.get("requested_time"),
        "timezone": booking.get("timezone"),
        "amount_aud": metadata.get("amount_aud"),
        "payment_status": metadata.get("payment_status") or event.workflow_status,
        "payment_url": metadata.get("payment_url"),
        "email_status": metadata.get("email_status"),
        "workflow_status": metadata.get("workflow_status") or event.workflow_status,
        "notes": booking.get("notes") or event.message_text,
    }


def merge_booking_records(events: list[ConversationEvent]) -> list[dict[str, object | None]]:
    by_reference: dict[str, dict[str, object | None]] = {}
    for event in sorted(events, key=lambda item: item.created_at):
        record = build_booking_record(event)
        reference = str(record["booking_reference"])
        current = by_reference.get(reference)
        if current is None:
            by_reference[reference] = record
            continue

        merged = dict(current)
        for key, value in record.items():
            if value not in (None, "", []):
                if (
                    event.source == "n8n"
                    and key in {"customer_name", "customer_email", "customer_phone", "notes"}
                    and current.get(key) not in (None, "", [])
                ):
                    continue
                merged[key] = value
        merged["created_at"] = current["created_at"]
        by_reference[reference] = merged

    return sorted(
        by_reference.values(),
        key=lambda item: str(item["created_at"]),
        reverse=True,
    )


def filter_booking_records(
    records: list[dict[str, object | None]],
    *,
    query: str | None = None,
    industry: str | None = None,
    payment_status: str | None = None,
    email_status: str | None = None,
    workflow_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, object | None]]:
    filtered = records

    if query and query.strip():
        needle = query.strip().lower()
        filtered = [
            item
            for item in filtered
            if needle in " ".join(
                [
                    str(item.get("booking_reference") or ""),
                    str(item.get("customer_name") or ""),
                    str(item.get("customer_email") or ""),
                    str(item.get("service_name") or ""),
                    str(item.get("industry") or ""),
                    str(item.get("notes") or ""),
                ]
            ).lower()
        ]

    def matches_status(value: object | None, expected: str | None) -> bool:
        return not expected or str(value or "") == expected

    filtered = [
        item
        for item in filtered
        if matches_status(item.get("industry"), industry)
        and matches_status(item.get("payment_status"), payment_status)
        and matches_status(item.get("email_status"), email_status)
        and matches_status(item.get("workflow_status"), workflow_status)
    ]

    if date_from:
        filtered = [
            item for item in filtered if str(item.get("requested_date") or "") >= date_from
        ]
    if date_to:
        filtered = [
            item for item in filtered if str(item.get("requested_date") or "") <= date_to
        ]

    return filtered


def build_timeline_event(event: ConversationEvent) -> dict[str, object | None]:
    return {
        "id": event.id,
        "source": event.source,
        "event_type": event.event_type,
        "created_at": event.created_at.astimezone(UTC).isoformat(),
        "ai_intent": event.ai_intent,
        "workflow_status": event.workflow_status,
        "message_text": event.message_text,
        "ai_reply": event.ai_reply,
        "sender_name": event.sender_name,
        "sender_email": event.sender_email,
        "metadata": event.metadata_json or {},
    }


def build_partner_item(partner: PartnerProfile) -> dict[str, object]:
    return {
        "id": partner.id,
        "name": partner.name,
        "category": partner.category,
        "website_url": partner.website_url,
        "description": partner.description,
        "logo_url": partner.logo_url,
        "image_url": partner.image_url,
        "featured": bool(partner.featured),
        "sort_order": partner.sort_order,
        "is_active": bool(partner.is_active),
    }


def build_service_merchant_item(service: ServiceMerchantProfile) -> dict[str, object | None]:
    currency_code = str(getattr(service, "currency_code", "AUD") or "AUD").upper()
    display_price = getattr(service, "display_price", None)
    quality_warnings = catalog_quality_warnings(
        {
            "name": service.name,
            "category": service.category,
            "summary": service.summary,
            "amount_aud": service.amount_aud,
            "display_price": display_price,
            "location": service.location,
            "tags_json": list(service.tags_json or []),
        }
    )
    return {
        "id": service.id,
        "service_id": service.service_id,
        "tenant_id": getattr(service, "tenant_id", None),
        "business_name": service.business_name,
        "business_email": service.business_email,
        "owner_email": getattr(service, "owner_email", None),
        "name": service.name,
        "category": service.category,
        "summary": service.summary,
        "amount_aud": service.amount_aud,
        "currency_code": currency_code,
        "display_price": display_price,
        "duration_minutes": service.duration_minutes,
        "venue_name": service.venue_name,
        "location": service.location,
        "map_url": service.map_url,
        "booking_url": service.booking_url,
        "image_url": service.image_url,
        "source_url": service.source_url,
        "tags": service.tags_json or [],
        "featured": bool(service.featured),
        "is_active": bool(service.is_active),
        "publish_state": str(getattr(service, "publish_state", "draft") or "draft"),
        "is_publish_ready": not quality_warnings,
        "is_search_ready": bool(service.is_active)
        and str(getattr(service, "publish_state", "draft") or "draft") == "published"
        and not quality_warnings,
        "quality_warnings": quality_warnings,
        "updated_at": service.updated_at.astimezone(UTC).isoformat(),
    }


def build_service_catalog_quality_counts(
    items: list[dict[str, object | None]],
) -> dict[str, int]:
    return {
        "total_records": len(items),
        "search_ready_records": sum(1 for item in items if bool(item.get("is_search_ready"))),
        "warning_records": sum(1 for item in items if bool(item.get("quality_warnings"))),
        "inactive_records": sum(1 for item in items if not bool(item.get("is_active"))),
        "published_records": sum(1 for item in items if item.get("publish_state") == "published"),
        "review_records": sum(1 for item in items if item.get("publish_state") in {"draft", "review"}),
    }


def build_service_catalog_item(service: ServiceMerchantProfile) -> ServiceCatalogItem:
    currency_code = str(getattr(service, "currency_code", "AUD") or "AUD").upper()
    display_price = getattr(service, "display_price", None)
    resolved_image_url = resolve_service_image_url(
        service_id=service.service_id,
        category=service.category or "General Service",
        tags=list(service.tags_json or []),
        image_url=service.image_url,
    )
    return ServiceCatalogItem(
        id=service.service_id,
        name=service.name,
        category=service.category or "General Service",
        tenant_id=service.tenant_id,
        business_email=service.business_email,
        owner_email=service.owner_email,
        summary=service.summary or "Service imported from merchant website.",
        duration_minutes=service.duration_minutes or 30,
        amount_aud=service.amount_aud or 0.01,
        currency_code=currency_code,
        display_price=display_price,
        image_url=resolved_image_url,
        map_snapshot_url=None,
        venue_name=service.venue_name,
        location=service.location,
        map_url=service.map_url,
        booking_url=service.booking_url,
        latitude=None,
        longitude=None,
        tags=list(service.tags_json or []),
        featured=bool(service.featured),
    )
