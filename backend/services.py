from __future__ import annotations

from dataclasses import dataclass
import asyncio
import hashlib
import hmac
from html import unescape
from html.parser import HTMLParser
import imaplib
import json
import math
import re
import smtplib
import unicodedata
import os
from datetime import datetime, timedelta
from email import message_from_bytes
from email.message import EmailMessage
from email.policy import default
from email.utils import parseaddr
from typing import Any
from urllib.parse import parse_qs, quote, unquote, urlencode
from urllib.parse import urljoin, urlparse
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from config import Settings
from db import ConversationEvent
from schemas import (
    AIBookingDecision,
    AIEventItem,
    BookingAssistantCatalogResponse,
    BookingAssistantChatMessage,
    BookingAssistantChatResponse,
    BookingAssistantSessionRequest,
    BookingAssistantSessionResponse,
    BookingWorkflowPayload,
    InboxEmail,
    ServiceCatalogItem,
    TawkMessage,
)


def _build_google_maps_url(*parts: str | None) -> str | None:
    query = ", ".join(part.strip() for part in parts if part and part.strip())
    if not query:
        return None
    return f"https://www.google.com/maps/search/?api=1&query={quote(query)}"


def _build_map_snapshot_url(
    latitude: float | None,
    longitude: float | None,
    *,
    zoom: int = 15,
) -> str | None:
    if latitude is None or longitude is None:
        return None
    api_key = os.getenv("GOOGLE_MAPS_STATIC_API_KEY", "").strip()
    if not api_key:
        return None
    params = urlencode(
        {
            "center": f"{latitude},{longitude}",
            "zoom": str(zoom),
            "size": "1200x700",
            "scale": "2",
            "maptype": "roadmap",
            "markers": f"color:red|label:B|{latitude},{longitude}",
            "key": api_key,
        }
    )
    return f"https://maps.googleapis.com/maps/api/staticmap?{params}"


async def _geocode_place_query(
    query: str,
    *,
    client: httpx.AsyncClient,
) -> tuple[float, float] | None:
    normalized = query.strip()
    if not normalized:
        return None
    try:
        response = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": normalized,
                "format": "jsonv2",
                "limit": 1,
            },
            headers={"User-Agent": "BookedAI/1.0"},
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError):
        return None

    if not isinstance(payload, list) or not payload:
        return None
    item = payload[0]
    try:
        return float(item["lat"]), float(item["lon"])
    except (KeyError, TypeError, ValueError):
        return None


def _build_geocode_query(*parts: str | None) -> str:
    raw = ", ".join(part.strip() for part in parts if part and part.strip())
    if not raw:
        return ""
    normalized = re.sub(r"\s+", " ", raw.replace(" ,", ",")).strip(" ,")
    normalized = normalized.replace(",,", ",")
    normalized = re.sub(r"\bAU\b", "Australia", normalized, flags=re.IGNORECASE)
    normalized = normalized.replace(" - ", " ")
    normalized = normalized.replace("Spacecubed", "")
    normalized = re.sub(r"\bBuilding\s+[A-Z0-9]+\b", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\s*,\s*", ", ", normalized)
    normalized = re.sub(r",\s*,", ", ", normalized)
    return normalized.strip(" ,")


def _haversine_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    radius_km = 6371.0
    lat_a = math.radians(latitude_a)
    lon_a = math.radians(longitude_a)
    lat_b = math.radians(latitude_b)
    lon_b = math.radians(longitude_b)
    delta_lat = lat_b - lat_a
    delta_lon = lon_b - lon_a
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat_a) * math.cos(lat_b) * math.sin(delta_lon / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(value))


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.lower())
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "item"


def _extract_visible_text_from_html(html: str) -> str:
    without_scripts = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    without_styles = re.sub(r"<style[\s\S]*?</style>", " ", without_scripts, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", without_styles)
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _discover_related_pages(base_url: str, html: str) -> list[str]:
    extractor = _LinkExtractor()
    try:
        extractor.feed(html)
    except Exception:
        return []

    parsed_base = urlparse(base_url)
    candidates: list[str] = []
    keywords = {
        "service",
        "services",
        "pricing",
        "price",
        "menu",
        "book",
        "booking",
        "treatment",
        "membership",
        "shop",
        "product",
        "products",
        "category",
        "contact",
        "about",
        "location",
    }
    for href in extractor.links:
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        if parsed.netloc != parsed_base.netloc:
            continue
        if not any(keyword in absolute.lower() for keyword in keywords):
            continue
        cleaned = absolute.split("#", 1)[0]
        if cleaned not in candidates:
            candidates.append(cleaned)
    return candidates[:4]


def _discover_product_pages(base_url: str, html: str) -> list[str]:
    extractor = _LinkExtractor()
    try:
        extractor.feed(html)
    except Exception:
        return []

    parsed_base = urlparse(base_url)
    candidates: list[str] = []
    for href in extractor.links:
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        if parsed.netloc != parsed_base.netloc:
            continue
        if "/product/" not in parsed.path.lower() and "/service/" not in parsed.path.lower():
            continue
        cleaned = absolute.split("#", 1)[0]
        if cleaned not in candidates:
            candidates.append(cleaned)
    return candidates[:8]


def _looks_like_url(value: str) -> bool:
    stripped = value.strip()
    if not stripped:
        return False
    if stripped.startswith(("http://", "https://")):
        return True
    return "." in stripped and " " not in stripped and "/" not in stripped[:2]


def _extract_search_result_urls(html: str) -> list[str]:
    urls: list[str] = []
    for href in re.findall(r'href="([^"]+)"', html, flags=re.IGNORECASE):
        candidate = unescape(href).strip()
        if not candidate:
            continue
        if candidate.startswith("//"):
            candidate = f"https:{candidate}"
        if "duckduckgo.com/l/?" in candidate:
            parsed = urlparse(candidate)
            redirect_url = parse_qs(parsed.query).get("uddg", [None])[0]
            if redirect_url:
                candidate = unquote(redirect_url)
        if not candidate.startswith(("http://", "https://")):
            continue
        parsed_candidate = urlparse(candidate)
        if parsed_candidate.netloc.endswith(
            (
                "duckduckgo.com",
                "google.com",
                "www.google.com",
                "bing.com",
                "www.bing.com",
                "facebook.com",
                "www.facebook.com",
                "instagram.com",
                "www.instagram.com",
                "linkedin.com",
                "www.linkedin.com",
                "youtube.com",
                "www.youtube.com",
            )
        ):
            continue
        cleaned = candidate.split("#", 1)[0]
        if cleaned not in urls:
            urls.append(cleaned)
    return urls


def _flatten_json_ld(value: Any) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    if isinstance(value, dict):
        objects.append(value)
        for nested in value.values():
            objects.extend(_flatten_json_ld(nested))
    elif isinstance(value, list):
        for item in value:
            objects.extend(_flatten_json_ld(item))
    return objects


def _extract_json_ld_objects(html: str) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    for match in re.finditer(
        r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        payload = unescape(match.group(1)).strip()
        if not payload:
            continue
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            continue
        objects.extend(_flatten_json_ld(parsed))
    return objects


def _as_text_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _coerce_price(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = re.sub(r"[^0-9.]+", "", str(value))
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _truncate_summary(text: str, limit: int = 220) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 1].rstrip()}..."


def _extract_price_from_html(html: str) -> float | None:
    candidates: list[float] = []
    patterns = [
        r'"price"\s*:\s*"?(?P<price>[0-9]+(?:\.[0-9]{1,2})?)"?',
        r'product:price:amount"\s+content="(?P<price>[0-9]+(?:\.[0-9]{1,2})?)"',
        r"woocommerce-Price-amount[^>]*>\s*<bdi>(?P<price>.*?)</bdi>",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, html, flags=re.IGNORECASE | re.DOTALL):
            amount = _coerce_price(match.group("price"))
            if amount is not None and amount > 0:
                candidates.append(amount)
    if not candidates:
        return None
    return min(candidates)


def _extract_business_context_from_html_pages(
    html_pages: list[dict[str, str]],
    *,
    business_name: str | None = None,
) -> tuple[str | None, str | None]:
    venue_name = business_name.strip() if business_name else None
    location: str | None = None

    for page in html_pages:
        for item in _extract_json_ld_objects(page["html"]):
            type_names = {str(type_name).lower() for type_name in _as_text_list(item.get("@type"))}
            if not type_names.intersection({"localbusiness", "organization", "store"}):
                continue
            venue_name = venue_name or str(item.get("name") or "").strip() or None
            address = item.get("address")
            if isinstance(address, dict):
                location_parts = [
                    str(address.get("streetAddress") or "").strip(),
                    str(address.get("addressLocality") or "").strip(),
                    str(address.get("addressRegion") or "").strip(),
                    str(address.get("postalCode") or "").strip(),
                    str(address.get("addressCountry") or "").strip(),
                ]
                location = ", ".join(part for part in location_parts if part) or location
            if venue_name and location:
                return venue_name, location

    return venue_name, location


def _extract_structured_services_from_html_pages(
    html_pages: list[dict[str, str]],
    *,
    business_name: str | None = None,
    category_hint: str | None = None,
) -> list[dict[str, Any]]:
    venue_name, location = _extract_business_context_from_html_pages(
        html_pages,
        business_name=business_name,
    )
    items: list[dict[str, Any]] = []
    seen_names: set[str] = set()

    for page in html_pages:
        page_url = page["url"]
        fallback_price = _extract_price_from_html(page["html"])
        for obj in _extract_json_ld_objects(page["html"]):
            type_names = {str(type_name).lower() for type_name in _as_text_list(obj.get("@type"))}
            if not type_names.intersection({"product", "service"}):
                continue

            name = str(obj.get("name") or "").strip()
            if not name:
                continue
            normalized_name = name.casefold()
            if normalized_name in seen_names:
                continue

            offers = obj.get("offers")
            amount_aud: float | None = None
            booking_url = str(obj.get("url") or page_url).strip() or page_url
            if isinstance(offers, dict):
                amount_aud = _coerce_price(offers.get("price"))
                booking_url = str(offers.get("url") or booking_url).strip() or booking_url
            elif isinstance(offers, list):
                for offer in offers:
                    if isinstance(offer, dict):
                        amount_aud = _coerce_price(offer.get("price"))
                        booking_url = str(offer.get("url") or booking_url).strip() or booking_url
                        if amount_aud is not None:
                            break
            amount_aud = amount_aud if amount_aud is not None else fallback_price

            image_candidates = _as_text_list(obj.get("image"))
            description = str(obj.get("description") or "").strip()
            category = str(obj.get("category") or category_hint or "").strip() or None
            keywords = _as_text_list(obj.get("keywords"))
            item_tags = keywords[:6]

            items.append(
                {
                    "name": name,
                    "category": category,
                    "summary": _truncate_summary(description or f"Imported from {business_name or 'merchant website'}."),
                    "amount_aud": amount_aud,
                    "duration_minutes": None,
                    "venue_name": venue_name,
                    "location": location,
                    "booking_url": booking_url,
                    "image_url": image_candidates[0] if image_candidates else _extract_preferred_image_from_html(page_url, page["html"]),
                    "tags": item_tags,
                }
            )
            seen_names.add(normalized_name)
            if len(items) >= 12:
                return items

    return items


@dataclass(frozen=True)
class ServiceQuerySignals:
    budget_max: float | None = None
    group_size: int | None = None
    preferred_locations: tuple[str, ...] = ()
    prefers_fast_option: bool = False
    prefers_evening: bool = False
    prefers_morning: bool = False
    customer_types: tuple[str, ...] = ()
    urgency: str | None = None


@dataclass(frozen=True)
class ServiceMatchInsight:
    service: ServiceCatalogItem
    score: int


class _LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href)


class _ImageExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta_images: list[str] = []
        self.inline_images: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        lowered = tag.lower()
        values = {key.lower(): value for key, value in attrs if value}

        if lowered == "meta":
            meta_key = (values.get("property") or values.get("name") or "").lower()
            if meta_key in {"og:image", "twitter:image", "twitter:image:src"}:
                content = (values.get("content") or "").strip()
                if content:
                    self.meta_images.append(content)
            return

        if lowered == "img":
            source = (
                values.get("src")
                or values.get("data-src")
                or values.get("data-lazy-src")
                or values.get("data-original")
                or ""
            ).strip()
            if source:
                self.inline_images.append(source)


def _looks_like_real_image_asset(url: str) -> bool:
    lowered = url.lower()
    blocked_tokens = (
        "logo",
        "icon",
        "avatar",
        "placeholder",
        "map",
        "staticmap",
        "sprite",
        "favicon",
    )
    return not any(token in lowered for token in blocked_tokens)


def _extract_preferred_image_from_html(page_url: str, html: str) -> str | None:
    extractor = _ImageExtractor()
    try:
        extractor.feed(html)
    except Exception:
        return None

    for candidate in extractor.meta_images + extractor.inline_images:
        absolute = urljoin(page_url, candidate).strip()
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        if not _looks_like_real_image_asset(absolute):
            continue
        return absolute
    return None


def _resolve_imported_service_image(
    service: dict[str, Any],
    html_pages: list[dict[str, str]],
) -> str | None:
    current_image = str(service.get("image_url") or "").strip()
    if current_image:
        return current_image

    booking_url = str(service.get("booking_url") or "").strip().rstrip("/")
    fallback_image: str | None = None
    for page in html_pages:
        page_image = _extract_preferred_image_from_html(page["url"], page["html"])
        if not page_image:
            continue
        if booking_url and booking_url == page["url"].rstrip("/"):
            return page_image
        if fallback_image is None:
            fallback_image = page_image
    return fallback_image


def _service_catalog_item(
    *,
    id: str,
    name: str,
    category: str,
    summary: str,
    duration_minutes: int,
    amount_aud: float,
    tags: list[str],
    featured: bool = False,
    image_url: str | None = None,
    venue_name: str | None = None,
    location: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    booking_url: str | None = None,
) -> ServiceCatalogItem:
    return ServiceCatalogItem(
        id=id,
        name=name,
        category=category,
        summary=summary,
        duration_minutes=duration_minutes,
        amount_aud=amount_aud,
        image_url=image_url,
        map_snapshot_url=_build_map_snapshot_url(latitude, longitude) if not image_url else None,
        venue_name=venue_name,
        location=location,
        map_url=_build_google_maps_url(venue_name, location),
        booking_url=booking_url,
        latitude=latitude,
        longitude=longitude,
        tags=tags,
        featured=featured,
    )


def _extract_service_query_signals(query: str, tokens: set[str]) -> ServiceQuerySignals:
    lowered = query.lower()

    budget_max = None
    budget_patterns = [
        r"(?:under|below|less than|max|budget)\s*\$?\s*(\d{1,4})",
        r"\$\s*(\d{1,4})",
        r"duoi\s*(\d{1,4})",
    ]
    for pattern in budget_patterns:
        match = re.search(pattern, lowered)
        if match:
            budget_max = float(match.group(1))
            break

    group_size = None
    group_patterns = [
        r"(?:for|group of|party of|table for)\s+(\d{1,2})",
        r"(\d{1,2})\s*(?:people|guests|pax|nguoi)",
    ]
    for pattern in group_patterns:
        match = re.search(pattern, lowered)
        if match:
            group_size = int(match.group(1))
            break

    preferred_locations: list[str] = []
    for location in [
        "parramatta",
        "north parramatta",
        "sydney olympic park",
        "george street",
        "church street",
        "macquarie street",
        "westfield parramatta",
    ]:
        if location in lowered:
            preferred_locations.append(location)

    prefers_fast_option = bool(
        {"quick", "fast", "express"} & tokens or {"after", "work"} <= tokens
    )
    prefers_evening = bool(
        {"tonight", "evening"} & tokens
        or "after work" in lowered
        or "tomorrow night" in lowered
    )
    prefers_morning = bool(
        {"morning"} & tokens or "tomorrow morning" in lowered or "mai sang" in lowered
    )

    customer_types: list[str] = []
    customer_type_map = {
        "family": {"family", "kids", "children"},
        "corporate": {"corporate", "team", "office", "client", "workshop"},
        "first_time": {"first", "new", "beginner"},
    }
    for label, keywords in customer_type_map.items():
        if keywords & tokens:
            customer_types.append(label)

    urgency = None
    if {"urgent", "asap", "today", "tonight"} & tokens:
        urgency = "urgent"
    elif {"tomorrow", "soon"} & tokens:
        urgency = "soon"

    return ServiceQuerySignals(
        budget_max=budget_max,
        group_size=group_size,
        preferred_locations=tuple(preferred_locations),
        prefers_fast_option=prefers_fast_option,
        prefers_evening=prefers_evening,
        prefers_morning=prefers_morning,
        customer_types=tuple(customer_types),
        urgency=urgency,
    )


def _merge_service_query_signals(
    primary: ServiceQuerySignals,
    secondary: ServiceQuerySignals,
) -> ServiceQuerySignals:
    return ServiceQuerySignals(
        budget_max=primary.budget_max if primary.budget_max is not None else secondary.budget_max,
        group_size=primary.group_size if primary.group_size is not None else secondary.group_size,
        preferred_locations=tuple(
            dict.fromkeys([*primary.preferred_locations, *secondary.preferred_locations])
        ),
        prefers_fast_option=primary.prefers_fast_option or secondary.prefers_fast_option,
        prefers_evening=primary.prefers_evening or secondary.prefers_evening,
        prefers_morning=primary.prefers_morning or secondary.prefers_morning,
        customer_types=tuple(dict.fromkeys([*primary.customer_types, *secondary.customer_types])),
        urgency=primary.urgency or secondary.urgency,
    )


SERVICE_CATALOG: list[ServiceCatalogItem] = [
    _service_catalog_item(
        id="haircut-classic",
        name="Classic Haircut",
        category="Salon",
        summary="A clean everyday cut with consultation, wash, and finish.",
        duration_minutes=45,
        amount_aud=79,
        image_url=None,
        venue_name="Willow & Ash Studio",
        location="Church Street, Parramatta NSW 2150",
        latitude=-33.8150,
        longitude=151.0010,
        tags=["haircut", "trim", "salon", "men", "women"],
        featured=True,
    ),
    _service_catalog_item(
        id="haircut-wedding",
        name="Wedding Haircut and Styling",
        category="Salon",
        summary="A pre-event haircut and styling session for wedding-ready presentation.",
        duration_minutes=90,
        amount_aud=149,
        image_url=None,
        venue_name="Luna Bridal Hair Lounge",
        location="North Parramatta NSW 2151",
        latitude=-33.8015,
        longitude=151.0005,
        tags=["wedding", "haircut", "styling", "event", "bridal"],
        featured=True,
    ),
    _service_catalog_item(
        id="blowdry-finish",
        name="Blow Dry and Finish",
        category="Salon",
        summary="A quick refresh with blow dry, smoothing, and polished finish.",
        duration_minutes=35,
        amount_aud=65,
        image_url=None,
        venue_name="Willow & Ash Studio",
        location="Church Street, Parramatta NSW 2150",
        latitude=-33.8150,
        longitude=151.0010,
        tags=["blow dry", "finish", "styling", "refresh"],
    ),
    _service_catalog_item(
        id="colour-consult",
        name="Colour Consultation",
        category="Salon",
        summary="A guided consultation to scope colour work, timing, and price before booking.",
        duration_minutes=30,
        amount_aud=35,
        image_url=None,
        venue_name="Hue Lab Salon",
        location="Westfield Parramatta, Parramatta NSW 2150",
        latitude=-33.8176,
        longitude=151.0027,
        tags=["colour", "consultation", "styling", "salon"],
    ),
    _service_catalog_item(
        id="restaurant-table-booking",
        name="Restaurant Table Booking",
        category="Food and Beverage",
        summary="Reserve a table for lunch, dinner, celebrations, or walk-in dining follow-up.",
        duration_minutes=15,
        amount_aud=20,
        image_url=None,
        venue_name="Riverside Dining Room",
        location="Parramatta Square, Parramatta NSW 2150",
        latitude=-33.8155,
        longitude=151.0036,
        tags=["restaurant", "food", "dining", "table", "booking", "eat", "lunch", "dinner"],
        featured=True,
    ),
    _service_catalog_item(
        id="cafe-group-booking",
        name="Cafe Group Booking",
        category="Food and Beverage",
        summary="Group seating request for cafe brunch, meetings, and casual gatherings.",
        duration_minutes=15,
        amount_aud=15,
        image_url=None,
        venue_name="Grounded Social Cafe",
        location="George Street, Parramatta NSW 2150",
        latitude=-33.8139,
        longitude=151.0040,
        tags=["cafe", "coffee", "brunch", "group booking", "food", "drink"],
    ),
    _service_catalog_item(
        id="catering-enquiry",
        name="Catering Enquiry and Quote",
        category="Food and Beverage",
        summary="Collect guest count, event timing, and menu needs before issuing a catering quote.",
        duration_minutes=30,
        amount_aud=45,
        image_url=None,
        venue_name="Harvest Catering Co.",
        location="Sydney Olympic Park NSW 2127",
        latitude=-33.8474,
        longitude=151.0673,
        tags=["catering", "event", "food", "corporate", "party", "quote"],
    ),
    _service_catalog_item(
        id="gp-consultation",
        name="General Practice Consultation",
        category="Healthcare Service",
        summary="Standard clinic consultation for symptoms, referrals, or ongoing care review.",
        duration_minutes=20,
        amount_aud=89,
        image_url=None,
        venue_name="Parramatta Health Hub",
        location="Macquarie Street, Parramatta NSW 2150",
        latitude=-33.8143,
        longitude=151.0032,
        tags=["gp", "doctor", "clinic", "healthcare", "consultation", "medical"],
        featured=True,
    ),
    _service_catalog_item(
        id="physio-initial-assessment",
        name="Initial Physio Assessment",
        category="Healthcare Service",
        summary="First physiotherapy assessment covering mobility, pain points, and treatment planning.",
        duration_minutes=45,
        amount_aud=120,
        image_url=None,
        venue_name="MoveWell Physio Clinic",
        location="Hassall Street, Parramatta NSW 2150",
        latitude=-33.8200,
        longitude=151.0052,
        tags=["physio", "physiotherapy", "rehab", "injury", "healthcare", "assessment"],
    ),
    _service_catalog_item(
        id="dental-checkup-clean",
        name="Dental Check-up and Clean",
        category="Healthcare Service",
        summary="Routine dental examination and professional clean for new or returning patients.",
        duration_minutes=40,
        amount_aud=149,
        image_url=None,
        venue_name="Smile Lane Dental",
        location="Phillip Street, Parramatta NSW 2150",
        latitude=-33.8148,
        longitude=151.0094,
        tags=["dental", "dentist", "teeth", "checkup", "clean", "healthcare"],
    ),
    _service_catalog_item(
        id="skin-clinic-consult",
        name="Skin Clinic Consultation",
        category="Healthcare Service",
        summary="Aesthetic or skin health consultation to review concerns and treatment suitability.",
        duration_minutes=30,
        amount_aud=95,
        image_url=None,
        venue_name="Lumina Skin Clinic",
        location="Church Street, Parramatta NSW 2150",
        latitude=-33.8136,
        longitude=151.0016,
        tags=["skin", "clinic", "aesthetic", "consultation", "healthcare", "treatment"],
    ),
    _service_catalog_item(
        id="rsl-membership-signup",
        name="RSL Membership Signup",
        category="Membership and Community",
        summary="New RSL membership enquiry with eligibility, fee, and document collection support.",
        duration_minutes=20,
        amount_aud=10,
        image_url=None,
        venue_name="Parramatta RSL Club",
        location="Macquarie Street, Parramatta NSW 2150",
        latitude=-33.8133,
        longitude=151.0056,
        tags=["rsl", "membership", "member", "signup", "community", "club"],
        featured=True,
    ),
    _service_catalog_item(
        id="rsl-membership-renewal",
        name="RSL Membership Renewal",
        category="Membership and Community",
        summary="Renew an existing RSL membership and confirm payment, expiry, and member details.",
        duration_minutes=15,
        amount_aud=10,
        image_url=None,
        venue_name="Parramatta RSL Club",
        location="Macquarie Street, Parramatta NSW 2150",
        latitude=-33.8133,
        longitude=151.0056,
        tags=["rsl", "membership", "renewal", "member", "club"],
    ),
    _service_catalog_item(
        id="gym-membership-tour",
        name="Gym Membership Tour and Signup",
        category="Membership and Community",
        summary="Introductory gym tour, membership explanation, and onboarding appointment.",
        duration_minutes=30,
        amount_aud=5,
        image_url=None,
        venue_name="Momentum Fitness Club",
        location="Sydney Olympic Park NSW 2127",
        latitude=-33.8481,
        longitude=151.0665,
        tags=["gym", "fitness", "membership", "tour", "signup"],
    ),
    _service_catalog_item(
        id="coworking-membership-tour",
        name="Coworking Membership Tour",
        category="Membership and Community",
        summary="Tour flexible desks or private offices before choosing a coworking plan.",
        duration_minutes=30,
        amount_aud=5,
        image_url=None,
        venue_name="WOTSO Parramatta",
        location="George Street, Parramatta NSW 2150",
        latitude=-33.8140,
        longitude=151.0047,
        tags=["coworking", "membership", "office", "tour", "workspace"],
    ),
    _service_catalog_item(
        id="pub-function-enquiry",
        name="Pub Function and Event Enquiry",
        category="Hospitality and Events",
        summary="Capture guest numbers, event date, and room needs for private functions or events.",
        duration_minutes=25,
        amount_aud=35,
        image_url=None,
        venue_name="Riverside Brewhouse",
        location="Church Street, Parramatta NSW 2150",
        latitude=-33.8158,
        longitude=151.0002,
        tags=["pub", "event", "function", "party", "hospitality", "booking"],
    ),
    _service_catalog_item(
        id="hotel-room-reservation",
        name="Hotel Room Reservation Request",
        category="Hospitality and Events",
        summary="Reservation intake for accommodation, special requests, and arrival details.",
        duration_minutes=20,
        amount_aud=50,
        image_url=None,
        venue_name="Harbour View Hotel Parramatta",
        location="Parramatta CBD NSW 2150",
        latitude=-33.8163,
        longitude=151.0051,
        tags=["hotel", "room", "reservation", "stay", "hospitality", "booking"],
    ),
]

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_PATTERN = re.compile(r"^[0-9+\s().-]+$")
JSON_LD_PATTERN = re.compile(
    r'<script type="application/ld\+json">(?P<payload>.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)
MAX_BOOKING_DAYS_AHEAD = 180
MIN_BOOKING_LEAD_MINUTES = 30
GENERIC_MATCH_TOKENS = {
    "book",
    "booking",
    "service",
    "services",
    "appointment",
    "appointments",
    "consult",
    "consultation",
    "help",
    "need",
    "needs",
    "want",
    "wants",
    "looking",
}
CATEGORY_KEYWORDS: dict[str, set[str]] = {
    "Salon": {
        "salon",
        "hair",
        "haircut",
        "styling",
        "blow",
        "blowdry",
        "blowout",
        "colour",
        "color",
        "bridal",
        "wedding",
    },
    "Food and Beverage": {
        "restaurant",
        "table",
        "dining",
        "food",
        "lunch",
        "dinner",
        "brunch",
        "cafe",
        "coffee",
        "catering",
        "meal",
        "eat",
    },
    "Healthcare Service": {
        "health",
        "healthcare",
        "medical",
        "doctor",
        "gp",
        "clinic",
        "physio",
        "physiotherapy",
        "injury",
        "shoulder",
        "pain",
        "rehab",
        "dental",
        "dentist",
        "teeth",
        "skin",
        "patient",
        "treatment",
    },
    "Membership and Community": {
        "membership",
        "member",
        "renew",
        "renewal",
        "signup",
        "sign",
        "join",
        "community",
        "club",
        "rsl",
        "gym",
        "coworking",
        "workspace",
    },
    "Hospitality and Events": {
        "hotel",
        "room",
        "reservation",
        "stay",
        "accommodation",
        "pub",
        "function",
        "event",
        "party",
        "venue",
        "hospitality",
    },
    "Print and signage": {
        "print",
        "printing",
        "sign",
        "signage",
        "banner",
        "backdrop",
        "media",
        "wall",
        "booth",
        "expo",
        "display",
        "poster",
        "brochure",
        "flyer",
        "corflute",
        "branding",
    },
}
SERVICE_KEYWORD_SYNONYMS: dict[str, set[str]] = {
    "physio-initial-assessment": {"shoulder", "back", "pain", "mobility", "injury", "rehab"},
    "gp-consultation": {"doctor", "medical", "symptoms", "general", "health"},
    "dental-checkup-clean": {"dentist", "tooth", "teeth", "checkup", "clean"},
    "skin-clinic-consult": {"skin", "acne", "aesthetic", "treatment", "dermal"},
    "restaurant-table-booking": {"restaurant", "table", "dinner", "lunch", "party", "guests"},
    "cafe-group-booking": {"cafe", "coffee", "brunch", "group", "meeting"},
    "catering-enquiry": {"catering", "quote", "event", "corporate", "menu"},
    "rsl-membership-renewal": {"rsl", "membership", "renew", "renewal", "member"},
    "rsl-membership-signup": {"rsl", "membership", "join", "signup", "member"},
    "gym-membership-tour": {"gym", "fitness", "tour", "membership", "join"},
    "coworking-membership-tour": {"coworking", "workspace", "office", "desk", "tour"},
    "pub-function-enquiry": {"pub", "function", "party", "event", "venue"},
    "hotel-room-reservation": {"hotel", "room", "reservation", "stay", "accommodation"},
}
FOLLOW_UP_CONTEXT_TOKENS = {
    "best",
    "better",
    "cheapest",
    "closest",
    "compare",
    "comparison",
    "option",
    "options",
    "that",
    "those",
    "this",
    "it",
    "one",
    "ones",
    "which",
}
AI_EVENT_KEYWORDS = {
    "ai",
    "artificial",
    "intelligence",
    "event",
    "events",
    "meetup",
    "workshop",
    "hackathon",
    "summit",
    "startup",
    "startups",
    "conference",
    "wsti",
    "western",
    "sydney",
    "innovators",
    "su",
    "kien",
    "hoi",
    "thao",
    "cong",
    "nghe",
    "networking",
    "session",
    "sessions",
    "pitch",
    "demo",
    "community",
}
WSTI_KEYWORDS = {
    "wsti",
    "western",
    "sydney",
    "startup",
    "startuphub",
    "spacecubed",
    "innovators",
    "westernsydney",
    "west",
}
QUERY_NOISE_TOKENS = {
    "a",
    "an",
    "and",
    "any",
    "are",
    "at",
    "can",
    "coming",
    "find",
    "for",
    "happening",
    "i",
    "in",
    "is",
    "me",
    "of",
    "on",
    "show",
    "tell",
    "the",
    "this",
    "up",
    "upcoming",
    "week",
    "what",
    "toi",
    "muon",
    "tim",
    "kiem",
    "cac",
    "nhung",
    "o",
    "tai",
    "ve",
}
MAX_SERVICE_MATCHES = 4
MAX_EVENT_MATCHES = 4
SERVICE_DISCOVERY_KEYWORDS = {
    "book",
    "booking",
    "appointment",
    "appointments",
    "service",
    "services",
    "membership",
    "consultation",
    "consult",
    "reservation",
    "quote",
    "price",
    "cost",
    "renew",
    "renewal",
    "signup",
    "join",
    "dat",
    "lich",
    "dich",
    "vu",
    "tu",
    "van",
    "gia",
}
SERVICE_DISCOVERY_QUESTION_KEYWORDS = {
    "best",
    "better",
    "compare",
    "comparison",
    "recommend",
    "recommended",
    "recommendation",
    "suitable",
    "suit",
    "option",
    "options",
    "available",
    "availability",
    "closest",
    "near",
    "nearby",
    "where",
    "which",
    "match",
    "matches",
    "phu",
    "hop",
    "nen",
    "chon",
    "nao",
    "gan",
    "so",
    "sanh",
    "goi",
    "y",
}


def tokenize_text(value: str) -> set[str]:
    normalized = unicodedata.normalize("NFKD", value.lower())
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    compact = ascii_value.replace("western sydney", "westernsydney")
    return {token for token in re.findall(r"[a-z0-9]+", compact) if token}


def parse_cors_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def nested_value(payload: dict[str, Any], *paths: tuple[str, ...]) -> Any:
    for path in paths:
        current: Any = payload
        found = True
        for segment in path:
            if not isinstance(current, dict) or segment not in current:
                found = False
                break
            current = current[segment]
        if found and current not in (None, ""):
            return current
    return None


def extract_tawk_message(payload: dict[str, Any]) -> TawkMessage:
    text = nested_value(
        payload,
        ("message", "text"),
        ("message", "body"),
        ("text",),
        ("body",),
    ) or ""

    return TawkMessage(
        conversation_id=str(
            nested_value(
                payload,
                ("conversation", "id"),
                ("conversation", "_id"),
                ("chat", "id"),
                ("chatId",),
                ("conversationId",),
            )
            or ""
        )
        or None,
        message_id=str(
            nested_value(payload, ("message", "id"), ("messageId",), ("id",)) or ""
        )
        or None,
        text=str(text),
        sender_name=nested_value(
            payload,
            ("sender", "name"),
            ("visitor", "name"),
            ("contact", "name"),
            ("name",),
        ),
        sender_email=nested_value(
            payload,
            ("sender", "email"),
            ("visitor", "email"),
            ("contact", "email"),
            ("email",),
        ),
        sender_phone=nested_value(
            payload,
            ("sender", "phone"),
            ("visitor", "phone"),
            ("contact", "phone"),
            ("phone",),
        ),
        metadata=payload,
    )


def verify_tawk_signature(
    raw_body: bytes,
    headers: dict[str, str],
    secret: str,
    enabled: bool,
) -> None:
    if not enabled:
        return
    if not secret:
        raise ValueError("TAWK_VERIFY_SIGNATURE is enabled but TAWK_WEBHOOK_SECRET is empty")

    header_candidates = [
        headers.get("x-tawk-signature"),
        headers.get("x-tawk-signature-v1"),
        headers.get("x-tawkto-signature"),
    ]
    provided = next((value for value in header_candidates if value), None)
    if not provided:
        raise ValueError("Missing Tawk signature header")

    sha1 = hmac.new(secret.encode(), raw_body, hashlib.sha1).hexdigest()
    sha256 = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    valid_values = {sha1, sha256, f"sha1={sha1}", f"sha256={sha256}"}
    if provided not in valid_values:
        raise ValueError("Invalid Tawk webhook signature")


def verify_bearer_token(
    provided_token: str | None,
    expected_token: str,
    *,
    label: str,
) -> None:
    if not expected_token:
        raise ValueError(f"{label} token is not configured")
    if not provided_token:
        raise ValueError(f"Missing {label} token")
    if not hmac.compare_digest(provided_token, expected_token):
        raise ValueError(f"Invalid {label} token")


def _extract_json_ld_blocks(html: str) -> list[Any]:
    blocks: list[Any] = []
    for match in JSON_LD_PATTERN.finditer(html):
        raw_payload = match.group("payload").strip()
        if not raw_payload:
            continue
        try:
            parsed = json.loads(raw_payload)
        except json.JSONDecodeError:
            continue
        blocks.append(parsed)
    return blocks


def _flatten_json_ld_events(payload: Any) -> list[dict[str, Any]]:
    items = payload if isinstance(payload, list) else [payload]
    events: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        if item.get("@type") == "Event":
            events.append(item)
    return events


def _clean_event_summary(value: str | None, *, limit: int = 220) -> str:
    text = re.sub(r"\s+", " ", value or "").strip()
    if len(text) <= limit:
        return text
    truncated = text[: limit - 1].rsplit(" ", 1)[0].strip()
    return f"{truncated}..."


def _extract_location(event: dict[str, Any]) -> tuple[str | None, str | None]:
    location = event.get("location")
    if not isinstance(location, dict):
        return None, None

    venue_name = str(location.get("name") or "").strip() or None
    address = location.get("address")
    if not isinstance(address, dict):
        return venue_name, None

    location_bits = [
        str(address.get("streetAddress") or "").strip(),
        str(address.get("addressLocality") or "").strip(),
        str(address.get("addressRegion") or "").strip(),
        str(address.get("addressCountry") or "").strip(),
    ]
    cleaned = [item for item in location_bits if item]
    return venue_name, ", ".join(cleaned) if cleaned else None


def _parse_event_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if normalized.endswith("Z"):
        normalized = f"{normalized[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        try:
            return parsed.replace(tzinfo=ZoneInfo("Australia/Sydney"))
        except ZoneInfoNotFoundError:
            return parsed
    return parsed


@dataclass
class AIEventSearchService:
    settings: Settings
    meetup_timeout_seconds: int = 12

    async def search(self, query: str) -> list[AIEventItem]:
        query_tokens = tokenize_text(query)
        wants_wsti_only = bool(query_tokens & WSTI_KEYWORDS)

        async with httpx.AsyncClient(
            timeout=min(self.settings.openai_timeout_seconds, self.meetup_timeout_seconds)
        ) as client:
            responses = await asyncio.gather(
                self._fetch_events(
                    client,
                    "https://www.meetup.com/western-sydney-tech-innovators/",
                    source="wsti_meetup",
                    source_priority=100,
                    is_wsti_priority=True,
                ),
                self._fetch_events(
                    client,
                    "https://www.meetup.com/find/?keywords=artificial%20intelligence&location=Sydney%2C%20Australia&source=EVENTS",
                    source="meetup_ai_sydney",
                    source_priority=40,
                    is_wsti_priority=False,
                ),
            )

        deduped: dict[str, AIEventItem] = {}
        for event in [item for collection in responses for item in collection]:
            key = event.url.strip().lower()
            current = deduped.get(key)
            if current is None or event.source_priority > current.source_priority:
                deduped[key] = event

        now = datetime.now(ZoneInfo("Australia/Sydney"))
        upcoming = [
            event
            for event in deduped.values()
            if (parsed := _parse_event_datetime(event.start_at)) and parsed >= now - timedelta(days=1)
        ]

        if wants_wsti_only:
            upcoming = [event for event in upcoming if event.is_wsti_priority]

        filtered = self._filter_events_for_query(query_tokens, upcoming)
        ranked = sorted(
            filtered or upcoming,
            key=lambda item: (
                not item.is_wsti_priority,
                -item.source_priority,
                _parse_event_datetime(item.start_at) or datetime.max.replace(tzinfo=ZoneInfo("Australia/Sydney")),
            ),
        )
        return ranked[:MAX_EVENT_MATCHES]

    async def _fetch_events(
        self,
        client: httpx.AsyncClient,
        url: str,
        *,
        source: str,
        source_priority: int,
        is_wsti_priority: bool,
    ) -> list[AIEventItem]:
        try:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
        except httpx.HTTPError:
            return []

        items: list[AIEventItem] = []
        for block in _extract_json_ld_blocks(response.text):
            for event in _flatten_json_ld_events(block):
                parsed = self._build_event_item(
                    event,
                    source=source,
                    source_priority=source_priority,
                    is_wsti_priority=is_wsti_priority,
                )
                if parsed:
                    if not parsed.image_url and (parsed.venue_name or parsed.location):
                        geocoded = await _geocode_place_query(
                            _build_geocode_query(parsed.venue_name, parsed.location),
                            client=client,
                        )
                        if geocoded:
                            latitude, longitude = geocoded
                            parsed = parsed.model_copy(
                                update={
                                    "latitude": latitude,
                                    "longitude": longitude,
                                    "map_snapshot_url": _build_map_snapshot_url(latitude, longitude),
                                }
                            )
                    items.append(parsed)
        return items

    def _build_event_item(
        self,
        event: dict[str, Any],
        *,
        source: str,
        source_priority: int,
        is_wsti_priority: bool,
    ) -> AIEventItem | None:
        title = str(event.get("name") or "").strip()
        url = str(event.get("url") or "").strip()
        start_at = str(event.get("startDate") or "").strip()
        if not title or not url or not start_at:
            return None

        organizer = event.get("organizer")
        organizer_name = None
        if isinstance(organizer, dict):
            organizer_name = str(organizer.get("name") or "").strip() or None

        venue_name, location = _extract_location(event)
        summary = _clean_event_summary(str(event.get("description") or "").strip())

        image_url = str(event.get("image") or "").strip() or None
        is_wsti_event = is_wsti_priority or "western sydney tech innovators" in (organizer_name or "").lower()

        return AIEventItem(
            title=title,
            summary=summary or "AI community event",
            start_at=start_at,
            end_at=str(event.get("endDate") or "").strip() or None,
            venue_name=venue_name,
            location=location,
            organizer=organizer_name,
            url=url,
            image_url=image_url,
            map_snapshot_url=None,
            map_url=_build_google_maps_url(venue_name, location),
            latitude=None,
            longitude=None,
            source=source,
            source_priority=source_priority + (10 if is_wsti_event else 0),
            is_wsti_priority=is_wsti_event,
        )

    def _filter_events_for_query(
        self,
        query_tokens: set[str],
        events: list[AIEventItem],
    ) -> list[AIEventItem]:
        meaningful_tokens = query_tokens - QUERY_NOISE_TOKENS
        if not meaningful_tokens:
            return events

        filtered: list[AIEventItem] = []
        for event in events:
            haystack = tokenize_text(
                " ".join(
                    [
                        event.title,
                        event.summary,
                        event.organizer or "",
                        event.venue_name or "",
                        event.location or "",
                    ]
                )
            )
            overlap = meaningful_tokens & haystack
            if not overlap:
                continue
            if "ai" in meaningful_tokens and not ({"ai", "wsti", "innovators"} & haystack):
                continue
            if "wsti" in meaningful_tokens and not event.is_wsti_priority:
                continue
            if overlap:
                filtered.append(event)

        return filtered


@dataclass
class OpenAIService:
    settings: Settings

    async def triage_message(self, message: TawkMessage) -> AIBookingDecision:
        if not self.is_configured():
            return self.fallback_decision(message)

        prompt = (
            "You are BookedAI, a booking assistant for bookedai.au. "
            "Classify the user's message, extract contact and booking details when present, "
            "and return a concise customer reply. "
            "Trigger the booking workflow only when the message is clearly about booking, "
            "rescheduling, availability, or confirming an appointment."
        )
        schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "intent": {
                    "type": "string",
                    "enum": ["booking", "support", "faq", "human_handoff", "unknown"],
                },
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                "should_trigger_booking_workflow": {"type": "boolean"},
                "needs_human_handoff": {"type": "boolean"},
                "summary": {"type": "string"},
                "customer_reply": {"type": "string"},
                "contact": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": ["string", "null"]},
                        "email": {"type": ["string", "null"]},
                        "phone": {"type": ["string", "null"]},
                    },
                    "required": ["name", "email", "phone"],
                },
                "booking": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "requested_service": {"type": ["string", "null"]},
                        "requested_date": {"type": ["string", "null"]},
                        "requested_time": {"type": ["string", "null"]},
                        "timezone": {"type": ["string", "null"]},
                        "notes": {"type": ["string", "null"]},
                    },
                    "required": [
                        "requested_service",
                        "requested_date",
                        "requested_time",
                        "timezone",
                        "notes",
                    ],
                },
            },
            "required": [
                "intent",
                "confidence",
                "should_trigger_booking_workflow",
                "needs_human_handoff",
                "summary",
                "customer_reply",
                "contact",
                "booking",
            ],
        }

        try:
            output_text = await self._generate_structured_json(
                prompt=prompt,
                payload={
                    "message": message.text,
                    "sender_name": message.sender_name,
                    "sender_email": message.sender_email,
                    "sender_phone": message.sender_phone,
                    "conversation_id": message.conversation_id,
                },
                schema_name="booking_triage",
                schema=schema,
            )
        except Exception:
            return self.fallback_decision(message)

        if not output_text:
            return self.fallback_decision(message)

        try:
            return AIBookingDecision.model_validate_json(output_text)
        except Exception:
            return self.fallback_decision(message)

    async def booking_assistant_reply(
        self,
        *,
        message: str,
        conversation: list[BookingAssistantChatMessage],
        services: list[ServiceCatalogItem],
    ) -> tuple[str, list[str] | None]:
        if not self.is_configured():
            return "", None

        service_catalog = [
            {
                "id": service.id,
                "name": service.name,
                "category": service.category,
                "summary": service.summary,
                "duration_minutes": service.duration_minutes,
                "amount_aud": service.amount_aud,
                "tags": service.tags,
            }
            for service in services
        ]
        conversation_payload = [
            {"role": item.role, "content": item.content}
            for item in conversation[-8:]
        ]
        prompt = (
            "You are BookedAI, a premium booking and discovery assistant for bookedai.au. "
            "Answer like an experienced front-desk consultant. Recommend only services that exist in the catalog. "
            "Keep the tone concise, polished, and decision-oriented. Lead with the strongest recommendation, "
            "then briefly explain why it fits. Mention price, duration, venue, or timing when they help the user "
            "decide. End with one concrete next step. If the user is vague, ask one clarifying question while still "
            "offering the closest options. Adapt your wording to the service category: salon should focus on look, timing, "
            "and occasion-readiness; healthcare should focus on suitability, assessment, and care context without sounding medical-legal; "
            "food and hospitality should focus on group fit, table or venue suitability, and booking convenience; memberships should focus "
            "on eligibility, renewal, onboarding, and value; AI/community events should focus on relevance, timing, networking value, and venue. "
            "The user may write in English or Vietnamese. Avoid filler, hype, or long paragraphs."
        )
        schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "reply": {"type": "string"},
                "matched_service_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 5,
                },
            },
            "required": ["reply", "matched_service_ids"],
        }
        try:
            output_text = await self._generate_structured_json(
                prompt=prompt,
                payload={
                    "message": message,
                    "conversation": conversation_payload,
                    "service_catalog": service_catalog,
                },
                schema_name="booking_assistant_chat",
                schema=schema,
            )
        except Exception:
            return "", None

        if not output_text:
            return "", None

        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError:
            return "", None

        reply = str(parsed.get("reply", "")).strip()
        matched_service_ids = parsed.get("matched_service_ids")
        if not isinstance(matched_service_ids, list):
            matched_service_ids = []
        normalized_ids = [str(item) for item in matched_service_ids if str(item).strip()]
        return reply, normalized_ids

    async def extract_services_from_website(
        self,
        *,
        website_url: str,
        business_name: str | None = None,
        category_hint: str | None = None,
    ) -> list[dict[str, Any]]:
        if not self.is_configured():
            return []

        normalized_url = website_url.strip()
        if not normalized_url.startswith(("http://", "https://")):
            normalized_url = f"https://{normalized_url}"

        async with httpx.AsyncClient(timeout=min(self.settings.openai_timeout_seconds, 15)) as client:
            homepage_response = await client.get(normalized_url, follow_redirects=True)
            homepage_response.raise_for_status()
            pages = [
                {
                    "url": str(homepage_response.url),
                    "text": _extract_visible_text_from_html(homepage_response.text)[:16000],
                    "html": homepage_response.text,
                }
            ]

            for related_url in _discover_related_pages(str(homepage_response.url), homepage_response.text):
                try:
                    response = await client.get(related_url, follow_redirects=True)
                    response.raise_for_status()
                except httpx.HTTPError:
                    continue
                pages.append(
                    {
                        "url": str(response.url),
                        "text": _extract_visible_text_from_html(response.text)[:16000],
                        "html": response.text,
                    }
                )

            product_pages: list[str] = []
            for page in pages:
                for product_url in _discover_product_pages(page["url"], page["html"]):
                    if product_url not in product_pages:
                        product_pages.append(product_url)

            for product_url in product_pages[:6]:
                try:
                    response = await client.get(product_url, follow_redirects=True)
                    response.raise_for_status()
                except httpx.HTTPError:
                    continue
                pages.append(
                    {
                        "url": str(response.url),
                        "text": _extract_visible_text_from_html(response.text)[:16000],
                        "html": response.text,
                    }
                )

        prompt = (
            "You extract real service catalog data for SMEs from their website. "
            "Return only services that appear to be genuinely offered by the business. "
            "Prefer concrete details such as price, duration, venue, location, booking links, and short decision-useful summaries. "
            "If a value is not clear, return null instead of guessing wildly."
        )
        schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "services": {
                    "type": "array",
                    "maxItems": 12,
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "name": {"type": "string"},
                            "category": {"type": ["string", "null"]},
                            "summary": {"type": "string"},
                            "amount_aud": {"type": ["number", "null"]},
                            "duration_minutes": {"type": ["integer", "null"]},
                            "venue_name": {"type": ["string", "null"]},
                            "location": {"type": ["string", "null"]},
                            "booking_url": {"type": ["string", "null"]},
                            "image_url": {"type": ["string", "null"]},
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                                "maxItems": 8,
                            },
                        },
                        "required": [
                            "name",
                            "category",
                            "summary",
                            "amount_aud",
                            "duration_minutes",
                            "venue_name",
                            "location",
                            "booking_url",
                            "image_url",
                            "tags",
                        ],
                    },
                }
            },
            "required": ["services"],
        }

        try:
            output_text = await self._generate_structured_json(
                prompt=prompt,
                payload={
                    "website_url": normalized_url,
                    "business_name": business_name,
                    "category_hint": category_hint,
                    "pages": [{"url": page["url"], "text": page["text"]} for page in pages],
                },
                schema_name="website_service_import",
                schema=schema,
            )
        except Exception:
            return _extract_structured_services_from_html_pages(
                pages,
                business_name=business_name,
                category_hint=category_hint,
            )

        if not output_text:
            return []

        try:
            payload = json.loads(output_text)
        except json.JSONDecodeError:
            return []

        services = payload.get("services")
        if not isinstance(services, list):
            return _extract_structured_services_from_html_pages(
                pages,
                business_name=business_name,
                category_hint=category_hint,
            )
        extracted = [item for item in services if isinstance(item, dict) and str(item.get("name") or "").strip()]
        if extracted:
            for item in extracted:
                item["image_url"] = _resolve_imported_service_image(item, pages)
            return extracted
        return _extract_structured_services_from_html_pages(
            pages,
            business_name=business_name,
            category_hint=category_hint,
        )

    async def resolve_business_website(
        self,
        *,
        website_or_query: str,
        business_name: str | None = None,
    ) -> str | None:
        candidate = website_or_query.strip()
        if not candidate:
            return None

        async with httpx.AsyncClient(
            timeout=min(self.settings.openai_timeout_seconds, 15),
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (X11; Linux x86_64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/123.0 Safari/537.36"
                )
            },
        ) as client:
            if _looks_like_url(candidate):
                normalized_url = candidate
                if not normalized_url.startswith(("http://", "https://")):
                    normalized_url = f"https://{normalized_url}"
                try:
                    response = await client.get(normalized_url, follow_redirects=True)
                    response.raise_for_status()
                    return str(response.url)
                except httpx.HTTPError:
                    return normalized_url

            search_query = " ".join(
                part
                for part in (
                    candidate,
                    business_name.strip() if business_name else "",
                    "official website services pricing booking australia",
                )
                if part
            )
            search_urls = [
                f"https://duckduckgo.com/html/?{urlencode({'q': search_query})}",
                f"https://html.duckduckgo.com/html/?{urlencode({'q': search_query})}",
            ]
            for search_url in search_urls:
                try:
                    response = await client.get(search_url, follow_redirects=True)
                    response.raise_for_status()
                except httpx.HTTPError:
                    continue

                for result_url in _extract_search_result_urls(response.text):
                    try:
                        resolved = await client.get(result_url, follow_redirects=True)
                        resolved.raise_for_status()
                    except httpx.HTTPError:
                        continue

                    content_type = resolved.headers.get("content-type", "")
                    if "text/html" not in content_type:
                        continue
                    return str(resolved.url)

        return None

    def is_configured(self) -> bool:
        return bool(self.settings.openai_api_key)

    async def _generate_structured_json(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        schema_name: str,
        schema: dict[str, Any],
    ) -> str:
        return await self._generate_openai_structured_json(
            prompt=prompt,
            payload=payload,
            schema_name=schema_name,
            schema=schema,
        )

    async def _generate_openai_structured_json(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        schema_name: str,
        schema: dict[str, Any],
    ) -> str:
        request_payload = {
            "model": self.settings.openai_model,
            "reasoning": {"effort": "none"},
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": prompt}],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": json.dumps(payload),
                        }
                    ],
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "schema": schema,
                    "strict": True,
                }
            },
        }
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.settings.openai_timeout_seconds) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers=headers,
                json=request_payload,
            )
            response.raise_for_status()
            data = response.json()

        return self._extract_openai_output_text(data)

    @staticmethod
    def _extract_openai_output_text(data: dict[str, Any]) -> str:
        output_text = data.get("output_text")
        if output_text:
            return str(output_text).strip()

        for item in data.get("output", []):
            for content in item.get("content", []):
                if content.get("type") in {"output_text", "text"} and content.get("text"):
                    return str(content["text"]).strip()
        return ""

    @staticmethod
    def fallback_decision(message: TawkMessage) -> AIBookingDecision:
        lowered = message.text.lower()
        booking_words = ["book", "booking", "schedule", "appointment", "calendar", "available"]
        is_booking = any(word in lowered for word in booking_words)
        reply = (
            "Thanks. I can help with booking. Please share your preferred date, time, "
            "service, and contact details."
            if is_booking
            else "Thanks for your message. A team member will review it shortly."
        )
        return AIBookingDecision(
            intent="booking" if is_booking else "unknown",
            confidence=0.35 if is_booking else 0.15,
            should_trigger_booking_workflow=is_booking,
            needs_human_handoff=not is_booking,
            summary=message.text[:280],
            customer_reply=reply,
            contact={
                "name": message.sender_name,
                "email": message.sender_email,
                "phone": message.sender_phone,
            },
            booking={},
        )


@dataclass
class N8NService:
    settings: Settings

    async def trigger_booking(self, payload: BookingWorkflowPayload) -> str:
        if not self.settings.n8n_booking_webhook_url:
            return "skipped"

        headers = {"Content-Type": "application/json"}
        if self.settings.n8n_api_key:
            headers["X-N8N-API-KEY"] = self.settings.n8n_api_key
        if self.settings.n8n_webhook_bearer_token:
            headers["Authorization"] = f"Bearer {self.settings.n8n_webhook_bearer_token}"

        async with httpx.AsyncClient(timeout=20) as client:
            try:
                response = await client.post(
                    self.settings.n8n_booking_webhook_url,
                    headers=headers,
                    json=payload.model_dump(),
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if status_code == 401:
                    return "unauthorized"
                if status_code == 404:
                    return "webhook_not_registered"
                return f"http_{status_code}"
            except httpx.HTTPError:
                return "delivery_failed"

        return "triggered"


@dataclass
class BookingAssistantService:
    settings: Settings

    def get_catalog(
        self,
        services: list[ServiceCatalogItem] | None = None,
    ) -> BookingAssistantCatalogResponse:
        catalog = services or SERVICE_CATALOG
        return BookingAssistantCatalogResponse(
            status="ok",
            business_email=self.settings.booking_business_email,
            stripe_enabled=bool(self.settings.stripe_secret_key),
            services=catalog,
        )

    async def chat(
        self,
        *,
        message: str,
        conversation: list[BookingAssistantChatMessage],
        openai_service: OpenAIService,
        user_latitude: float | None = None,
        user_longitude: float | None = None,
        user_locality: str | None = None,
        services: list[ServiceCatalogItem] | None = None,
    ) -> BookingAssistantChatResponse:
        catalog = services or SERVICE_CATALOG
        effective_query, memory_signals = self._build_effective_query(
            message=message,
            conversation=conversation,
        )
        wants_events = self._should_search_ai_events(message)
        matched_events: list[AIEventItem] = []
        if wants_events:
            event_search_service = AIEventSearchService(self.settings)
            matched_events = await event_search_service.search(message)

        ranked_matches = self._rank_services(
            effective_query,
            services=catalog,
            user_latitude=user_latitude,
            user_longitude=user_longitude,
            user_locality=user_locality,
            precomputed_signals=memory_signals,
        )
        matched_services = [item.service for item in ranked_matches[:MAX_SERVICE_MATCHES]]
        matched_services = self._curate_service_matches(matched_services)
        wants_services = self._should_match_services(message, matched_services)

        if wants_events and not wants_services:
            return BookingAssistantChatResponse(
                status="ok",
                reply=self._build_ai_events_reply(message, matched_events),
                matched_services=[],
                matched_events=self._curate_event_matches(matched_events),
                suggested_service_id=None,
            )

        try:
            ai_reply, ai_service_ids = await openai_service.booking_assistant_reply(
                message=message,
                conversation=conversation,
                services=catalog,
            )
        except Exception:
            ai_reply, ai_service_ids = "", None

        if ai_service_ids:
            services_by_id = {service.id: service for service in catalog}
            matched_services = [
                services_by_id[service_id]
                for service_id in ai_service_ids
                if service_id in services_by_id
            ] or matched_services
            matched_services = self._curate_service_matches(matched_services)

        matched_events = self._curate_event_matches(matched_events)

        suggested_service_id = matched_services[0].id if matched_services else None
        reply = ai_reply.strip() or self._build_fallback_chat_reply(
            message,
            matched_services,
            matched_events=matched_events if wants_events else [],
        )

        if wants_events and matched_events:
            reply = self._build_hybrid_reply(
                message=message,
                base_reply=reply,
                matched_services=matched_services,
                matched_events=matched_events,
            )

        clarification = self._build_clarification_prompt(
            message=message,
            matched_services=matched_services,
            ranked_matches=ranked_matches,
            query_signals=memory_signals,
        )
        if clarification:
            reply = f"{reply}\n\n{clarification}"

        return BookingAssistantChatResponse(
            status="ok",
            reply=reply,
            matched_services=matched_services,
            matched_events=matched_events if wants_events else [],
            suggested_service_id=suggested_service_id,
        )

    def _should_search_ai_events(self, message: str) -> bool:
        tokens = tokenize_text(message)
        has_ai_signal = bool(tokens & {"ai", "artificial", "intelligence", *WSTI_KEYWORDS})
        has_event_signal = bool(tokens & AI_EVENT_KEYWORDS)
        return has_event_signal and has_ai_signal

    @staticmethod
    def _recent_user_context(
        conversation: list[BookingAssistantChatMessage],
        *,
        current_message: str,
    ) -> list[str]:
        current_normalized = current_message.strip().casefold()
        context: list[str] = []
        for item in reversed(conversation):
            if item.role != "user":
                continue
            normalized = item.content.strip().casefold()
            if not normalized or normalized == current_normalized:
                continue
            context.append(item.content.strip())
            if len(context) >= 3:
                break
        context.reverse()
        return context

    @classmethod
    def _build_effective_query(
        cls,
        *,
        message: str,
        conversation: list[BookingAssistantChatMessage],
    ) -> tuple[str, ServiceQuerySignals]:
        message_tokens = tokenize_text(message)
        primary_signals = _extract_service_query_signals(message, message_tokens)
        recent_user_context = cls._recent_user_context(conversation, current_message=message)
        if not recent_user_context:
            return message, primary_signals

        needs_context = (
            len(message_tokens) <= 8
            or bool(message_tokens & FOLLOW_UP_CONTEXT_TOKENS)
            or not any(message_tokens & keywords for keywords in CATEGORY_KEYWORDS.values())
        )
        if not needs_context:
            return message, primary_signals

        context_text = " ".join(recent_user_context[-2:])
        secondary_signals = _extract_service_query_signals(
            context_text,
            tokenize_text(context_text),
        )
        merged_signals = _merge_service_query_signals(primary_signals, secondary_signals)
        effective_query = f"{message}\nContext from earlier in the conversation: {context_text}"
        return effective_query, merged_signals

    @staticmethod
    def _curate_service_matches(
        services: list[ServiceCatalogItem],
        *,
        limit: int = MAX_SERVICE_MATCHES,
    ) -> list[ServiceCatalogItem]:
        curated: list[ServiceCatalogItem] = []
        seen_ids: set[str] = set()
        for service in services:
            if service.id in seen_ids:
                continue
            curated.append(service)
            seen_ids.add(service.id)
            if len(curated) >= limit:
                break
        return curated

    @staticmethod
    def _curate_event_matches(
        events: list[AIEventItem],
        *,
        limit: int = MAX_EVENT_MATCHES,
    ) -> list[AIEventItem]:
        curated: list[AIEventItem] = []
        seen_keys: set[str] = set()
        for event in events:
            key = f"{event.url.strip().lower()}::{event.start_at.strip().lower()}"
            if key in seen_keys:
                continue
            curated.append(event)
            seen_keys.add(key)
            if len(curated) >= limit:
                break
        return curated

    def _should_match_services(
        self,
        message: str,
        matched_services: list[ServiceCatalogItem],
    ) -> bool:
        tokens = tokenize_text(message)
        if tokens & SERVICE_DISCOVERY_KEYWORDS:
            return True
        if tokens & SERVICE_DISCOVERY_QUESTION_KEYWORDS:
            return True
        if any(category_tokens & tokens for category_tokens in CATEGORY_KEYWORDS.values()):
            return True
        if self._should_search_ai_events(message):
            return bool(tokens & SERVICE_DISCOVERY_KEYWORDS or tokens & SERVICE_DISCOVERY_QUESTION_KEYWORDS)
        return bool(matched_services)

    @staticmethod
    def _category_decision_frame(service: ServiceCatalogItem) -> str:
        category = service.category.lower()
        if "salon" in category:
            return "timing, finish, and occasion-readiness"
        if "healthcare" in category:
            return "fit, assessment depth, and care context"
        if "food" in category or "hospitality" in category:
            return "group fit, venue suitability, and booking convenience"
        if "membership" in category or "community" in category:
            return "eligibility, onboarding, and renewal simplicity"
        return "fit, convenience, and next-step clarity"

    @classmethod
    def _recommendation_opening(cls, service: ServiceCatalogItem) -> str:
        category = service.category.lower()
        if "salon" in category:
            return f"My strongest recommendation is {service.name} if you want the cleanest finish with a clear booking path."
        if "healthcare" in category:
            return f"My strongest recommendation is {service.name} because it gives you the clearest starting point for assessment and follow-up."
        if "food" in category or "hospitality" in category:
            return f"My strongest recommendation is {service.name} if you want the smoothest booking option for this plan."
        if "membership" in category or "community" in category:
            return f"My strongest recommendation is {service.name} because it is the clearest path to get your membership request moving."
        return f"My strongest recommendation is {service.name}."

    @classmethod
    def _comparison_opening(
        cls,
        first: ServiceCatalogItem,
        second: ServiceCatalogItem,
    ) -> str:
        frame = cls._category_decision_frame(first)
        return (
            f"The two strongest options to compare are {first.name} and {second.name}. "
            f"For this type of request, the key decision factors are {frame}."
        )

    @staticmethod
    def _decision_use_case_label(service: ServiceCatalogItem) -> str:
        category = service.category.lower()
        tags = {tag.lower() for tag in service.tags}
        if "print" in category:
            return "display visibility, branding impact, and event presentation"
        if "healthcare" in category:
            return "assessment quality and care fit"
        if "food" in category or "hospitality" in category:
            return "group size, venue fit, and convenience"
        if "membership" in category:
            return "joining, renewing, and onboarding simplicity"
        if {"wedding", "bridal", "event"} & tags:
            return "important occasions and presentation"
        if service.duration_minutes <= 20:
            return "speed and convenience"
        return "a standard booking need"

    def _build_ai_events_reply(self, message: str, events: list[AIEventItem]) -> str:
        if not events:
            return (
                "I could not confirm a strong live AI event match right now. "
                "Try asking for WSTI events, Sydney AI meetups, or Western Sydney Startup Hub sessions."
            )

        intro = (
            "Here are the strongest upcoming AI events, ranked for relevance with WSTI and Western Sydney Startup Hub results first."
        )
        if "wsti" in tokenize_text(message):
            intro = "Here are the strongest current WSTI AI event matches."

        lines = [intro]
        for event in events[:3]:
            start_label = self._format_event_time_label(event.start_at)
            venue_bits = [event.venue_name or "", event.location or ""]
            venue = " | ".join([item for item in venue_bits if item])
            prefix = "Top WSTI option" if event.is_wsti_priority else "Recommended AI event"
            detail = f"{event.title} on {start_label}"
            if venue:
                detail = f"{detail} at {venue}"
            lines.append(f"- {prefix}: {detail}")

        lines.append("Review the event cards below for venue, timing, and direct links.")
        return "\n".join(lines)

    def _build_hybrid_reply(
        self,
        *,
        message: str,
        base_reply: str,
        matched_services: list[ServiceCatalogItem],
        matched_events: list[AIEventItem],
    ) -> str:
        if not matched_events:
            return base_reply

        if not matched_services:
            return self._build_ai_events_reply(message, matched_events)

        event = matched_events[0]
        event_time = self._format_event_time_label(event.start_at)
        service_names = ", ".join(service.name for service in matched_services[:2])
        prefix = "WSTI event" if event.is_wsti_priority else "AI event"
        return (
            f"{base_reply}\n\n"
            f"I also found a strong {prefix} match: {event.title} on {event_time}. "
            f"You can review that event alongside service options such as {service_names} before deciding."
        )

    def _format_event_time_label(self, value: str) -> str:
        parsed = _parse_event_datetime(value)
        if not parsed:
            return value
        try:
            local = parsed.astimezone(ZoneInfo("Australia/Sydney"))
        except ZoneInfoNotFoundError:
            local = parsed
        return local.strftime("%a %d %b %Y, %I:%M %p %Z")

    async def create_session(
        self,
        payload: BookingAssistantSessionRequest,
        *,
        email_service: "EmailService",
        n8n_service: N8NService,
        services: list[ServiceCatalogItem] | None = None,
    ) -> BookingAssistantSessionResponse:
        catalog = services or SERVICE_CATALOG
        service = next((item for item in catalog if item.id == payload.service_id), None)
        if not service:
            raise ValueError("Selected service was not found")

        normalized_email = (payload.customer_email or "").strip().lower()
        normalized_phone = payload.customer_phone.strip() if payload.customer_phone else None
        self._validate_customer_details(
            customer_name=payload.customer_name,
            customer_email=normalized_email,
            customer_phone=normalized_phone,
        )
        self._validate_requested_slot(
            requested_date=payload.requested_date,
            requested_time=payload.requested_time,
            timezone_name=payload.timezone,
        )

        booking_reference = f"BAI-{uuid4().hex[:8].upper()}"
        payment_status = "payment_follow_up_required"
        payment_url = self._build_manual_followup_url(booking_reference, service, payload)

        if self.settings.stripe_secret_key:
            try:
                payment_url = await self._create_stripe_checkout_url(
                    booking_reference=booking_reference,
                    service=service,
                    payload=payload,
                )
                payment_status = "stripe_checkout_ready"
            except Exception:
                payment_status = "payment_follow_up_required"

        email_status = "pending_manual_followup"
        if email_service.smtp_configured():
            try:
                if normalized_email:
                    await email_service.send_email(
                        to=[normalized_email],
                        subject=f"BookedAI booking request {booking_reference}",
                        text=self._build_customer_confirmation_text(
                            booking_reference=booking_reference,
                            service=service,
                            payload=payload,
                            payment_url=payment_url,
                        ),
                    )
                await email_service.send_email(
                    to=[self.settings.booking_business_email],
                    subject=f"New BookedAI booking lead {booking_reference}",
                    text=self._build_internal_notification_text(
                        booking_reference=booking_reference,
                        service=service,
                        payload=payload,
                        payment_url=payment_url,
                    ),
                )
                email_status = "sent" if normalized_email else "pending_manual_followup"
            except Exception:
                email_status = "pending_manual_followup"

        workflow_status = await n8n_service.trigger_booking(
            BookingWorkflowPayload(
                conversation_id=booking_reference,
                message_id=booking_reference,
                source="booking_assistant",
                customer_message=payload.notes or f"Booking request for {service.name}",
                ai_summary=(
                    f"{payload.customer_name} requested {service.name} on "
                    f"{payload.requested_date} at {payload.requested_time}"
                ),
                ai_intent="booking",
                customer_reply=(
                    "Booking assistant session created and ready for payment or follow-up."
                ),
                contact={
                    "name": payload.customer_name,
                    "email": normalized_email,
                    "phone": normalized_phone,
                },
                booking={
                    "requested_service": service.name,
                    "requested_date": payload.requested_date.isoformat(),
                    "requested_time": payload.requested_time.strftime("%H:%M"),
                    "timezone": payload.timezone,
                    "notes": payload.notes,
                },
                metadata={
                    "booking_reference": booking_reference,
                    "service_id": service.id,
                    "payment_status": payment_status,
                    "payment_url": payment_url,
                },
            )
        )

        confirmation_message = (
            "Your booking request is ready. Continue to Stripe checkout to secure the appointment."
            if payment_status == "stripe_checkout_ready"
            else (
                "Your booking request has been captured. Payment checkout will be completed with "
                f"a follow-up from {self.settings.booking_business_email}."
            )
        )

        return BookingAssistantSessionResponse(
            status="ok",
            booking_reference=booking_reference,
            service=service,
            amount_aud=service.amount_aud,
            amount_label=self._format_amount(service.amount_aud),
            requested_date=payload.requested_date.isoformat(),
            requested_time=payload.requested_time.strftime("%H:%M"),
            timezone=payload.timezone,
            payment_status=payment_status,
            payment_url=payment_url,
            qr_code_url=self._build_qr_code_url(payment_url),
            email_status=email_status,
            confirmation_message=confirmation_message,
            contact_email=self.settings.booking_business_email,
            workflow_status=workflow_status,
        )

    async def _create_stripe_checkout_url(
        self,
        *,
        booking_reference: str,
        service: ServiceCatalogItem,
        payload: BookingAssistantSessionRequest,
    ) -> str:
        line_item_name = f"{service.name} - {booking_reference}"
        amount_cents = int(round(service.amount_aud * 100))
        form_data: list[tuple[str, str]] = [
            ("mode", "payment"),
            (
                "success_url",
                f"{self.settings.public_app_url}/?booking=success&ref={booking_reference}",
            ),
            (
                "cancel_url",
                f"{self.settings.public_app_url}/?booking=cancelled&ref={booking_reference}",
            ),
            ("payment_method_types[]", "card"),
            ("line_items[0][quantity]", "1"),
            ("line_items[0][price_data][currency]", self.settings.stripe_currency),
            ("line_items[0][price_data][unit_amount]", str(amount_cents)),
            ("line_items[0][price_data][product_data][name]", line_item_name),
            ("line_items[0][price_data][product_data][description]", service.summary),
            ("metadata[booking_reference]", booking_reference),
            ("metadata[service_id]", service.id),
            ("metadata[requested_date]", payload.requested_date.isoformat()),
            ("metadata[requested_time]", payload.requested_time.strftime("%H:%M")),
            ("metadata[timezone]", payload.timezone),
        ]

        normalized_email = (payload.customer_email or "").strip().lower()
        if normalized_email:
            form_data.insert(3, ("customer_email", normalized_email))

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.stripe.com/v1/checkout/sessions",
                headers={
                    "Authorization": f"Bearer {self.settings.stripe_secret_key}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                content=urlencode(form_data).encode(),
            )
            response.raise_for_status()
            data = response.json()

        checkout_url = data.get("url")
        if not checkout_url:
            raise ValueError("Stripe response did not include a checkout URL")
        return str(checkout_url)

    def _build_manual_followup_url(
        self,
        booking_reference: str,
        service: ServiceCatalogItem,
        payload: BookingAssistantSessionRequest,
    ) -> str:
        subject = quote(f"BookedAI booking request {booking_reference}")
        body = quote(
            "\n".join(
                [
                    f"Booking reference: {booking_reference}",
                    f"Service: {service.name}",
                    f"Customer: {payload.customer_name}",
                    f"Email: {(payload.customer_email or '').strip().lower() or 'Not provided'}",
                    f"Phone: {payload.customer_phone or 'Not provided'}",
                    f"Requested date: {payload.requested_date.isoformat()}",
                    f"Requested time: {payload.requested_time.strftime('%H:%M')}",
                    f"Timezone: {payload.timezone}",
                    f"Notes: {payload.notes or 'None'}",
                ]
            )
        )
        return (
            f"mailto:{self.settings.booking_business_email}?subject={subject}&body={body}"
        )

    @staticmethod
    def _build_qr_code_url(target_url: str) -> str:
        return (
            "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data="
            f"{quote(target_url, safe='')}"
        )

    @staticmethod
    def _format_amount(amount_aud: float) -> str:
        return f"A${amount_aud:,.2f}"

    def _build_customer_confirmation_text(
        self,
        *,
        booking_reference: str,
        service: ServiceCatalogItem,
        payload: BookingAssistantSessionRequest,
        payment_url: str,
    ) -> str:
        return "\n".join(
            [
                "Thanks for booking with BookedAI.",
                "",
                f"Booking reference: {booking_reference}",
                f"Service: {service.name}",
                f"Requested date: {payload.requested_date.isoformat()}",
                f"Requested time: {payload.requested_time.strftime('%H:%M')}",
                f"Timezone: {payload.timezone}",
                f"Price: {self._format_amount(service.amount_aud)}",
                "",
                f"Payment and confirmation link: {payment_url}",
                "",
                f"If you need help, reply to {self.settings.booking_business_email}.",
            ]
        )

    @staticmethod
    def _build_internal_notification_text(
        *,
        booking_reference: str,
        service: ServiceCatalogItem,
        payload: BookingAssistantSessionRequest,
        payment_url: str,
    ) -> str:
        return "\n".join(
            [
                "New booking assistant lead received.",
                "",
                f"Reference: {booking_reference}",
                f"Service: {service.name}",
                f"Customer: {payload.customer_name}",
                f"Email: {(payload.customer_email or '').strip().lower() or 'Not provided'}",
                f"Phone: {payload.customer_phone or 'Not provided'}",
                f"Requested date: {payload.requested_date.isoformat()}",
                f"Requested time: {payload.requested_time.strftime('%H:%M')}",
                f"Timezone: {payload.timezone}",
                f"Notes: {payload.notes or 'None'}",
                f"Payment URL: {payment_url}",
            ]
        )

    @staticmethod
    def _build_fallback_chat_reply(
        message: str,
        matched_services: list[ServiceCatalogItem],
        *,
        matched_events: list[AIEventItem] | None = None,
    ) -> str:
        lowered = message.lower()
        if matched_events and matched_services:
            highlighted_services = ", ".join(service.name for service in matched_services[:2])
            top_event = matched_events[0]
            return (
                f"I found both event and service matches. "
                f"The strongest event result is {top_event.title}, and the best-fit services are "
                f"{highlighted_services}. Review the cards below to compare price, location, timing, and next steps."
            )

        if matched_events:
            top_event = matched_events[0]
            return (
                f"The strongest live AI event match is {top_event.title}. "
                "Review the event cards below to compare the best upcoming options."
            )

        if matched_services:
            compare_request = any(word in lowered for word in ["compare", "comparison", "so sanh"])
            recommendation_request = any(
                word in lowered
                for word in ["best", "which", "recommend", "suitable", "quick", "fast"]
            )
            highlighted = ", ".join(service.name for service in matched_services[:3])
            if compare_request and len(matched_services) >= 2:
                first = matched_services[0]
                second = matched_services[1]
                return (
                    f"{BookingAssistantService._comparison_opening(first, second)} "
                    f"{first.name} is the better fit when you want {BookingAssistantService._decision_use_case_label(first)}, "
                    f"while {second.name} suits you better if you prefer {BookingAssistantService._decision_use_case_label(second)}. "
                    "Review the cards below for price, location, and booking next steps."
                )
            if recommendation_request:
                top_service = matched_services[0]
                location_hint = ""
                if top_service.venue_name or top_service.location:
                    location_hint = (
                        f" It is available at "
                        f"{' • '.join([item for item in [top_service.venue_name, top_service.location] if item])}."
                    )
                comparison_hint = ""
                alternatives = ", ".join(service.name for service in matched_services[1:3])
                if alternatives:
                    comparison_hint = f"You can choose it below now, or compare it with {alternatives} before booking."
                else:
                    comparison_hint = "You can choose it below now and continue straight to booking."
                return (
                    f"{BookingAssistantService._recommendation_opening(top_service)} "
                    f"It is {BookingAssistantService._format_amount(top_service.amount_aud)} and usually takes {top_service.duration_minutes} minutes. "
                    f"{location_hint}"
                    f"{comparison_hint}"
                )
            return (
                f"I found a short list of strong matches: {highlighted}. "
                "Review the cards below for price, location, fit, and next steps, then choose the best option."
            )

        if any(word in lowered for word in ["price", "cost", "how much"]):
            return (
                "I can help with pricing. Tell me the service or outcome you need, "
                "such as a haircut, physio, restaurant booking, membership, or AI event, and I will surface the strongest options."
            )

        return (
            "Tell me the outcome you need and I will surface the strongest matching services or events. "
            "For example: physio for shoulder pain, restaurant table for 6, renew my membership, or AI events at WSTI."
        )

    @staticmethod
    def _service_search_text(service: ServiceCatalogItem) -> str:
        return " ".join(
            [
                service.name,
                service.category,
                service.summary,
                *service.tags,
            ]
        ).lower()

    def _rank_services(
        self,
        query: str,
        *,
        services: list[ServiceCatalogItem] | None = None,
        user_latitude: float | None = None,
        user_longitude: float | None = None,
        user_locality: str | None = None,
        precomputed_signals: ServiceQuerySignals | None = None,
    ) -> list[ServiceMatchInsight]:
        catalog = services or SERVICE_CATALOG
        query_lower = query.lower().strip()
        query_tokens = tokenize_text(query)
        if not query_tokens:
            return [
                ServiceMatchInsight(service=service, score=12 if service.featured else 6)
                for service in catalog
                if service.featured
            ][:MAX_SERVICE_MATCHES]

        intent_tokens = {token for token in query_tokens if token not in GENERIC_MATCH_TOKENS}
        if not intent_tokens:
            intent_tokens = set(query_tokens)

        detected_categories = {
            category
            for category, keywords in CATEGORY_KEYWORDS.items()
            if intent_tokens & keywords
        }
        query_signals = precomputed_signals or _extract_service_query_signals(query, intent_tokens)
        if user_locality and user_locality.lower() not in query_lower:
            query_signals = ServiceQuerySignals(
                budget_max=query_signals.budget_max,
                group_size=query_signals.group_size,
                preferred_locations=tuple(
                    dict.fromkeys([*query_signals.preferred_locations, user_locality.lower()])
                ),
                prefers_fast_option=query_signals.prefers_fast_option,
                prefers_evening=query_signals.prefers_evening,
                prefers_morning=query_signals.prefers_morning,
                customer_types=query_signals.customer_types,
                urgency=query_signals.urgency,
            )
        prefers_fast_option = query_signals.prefers_fast_option
        group_visit = bool(
            {"group", "team", "people", "guests"} & intent_tokens or query_signals.group_size
        )

        specific_category_intent = bool(detected_categories)
        scored_services: list[ServiceMatchInsight] = []
        for service in catalog:
            search_text = self._service_search_text(service)
            service_tokens = tokenize_text(search_text)
            service_tags = {tag.lower() for tag in service.tags}
            category_tokens = {
                *CATEGORY_KEYWORDS.get(service.category, set()),
                *tokenize_text(service.category),
            }
            synonym_tokens = SERVICE_KEYWORD_SYNONYMS.get(service.id, set())

            overlap = len(intent_tokens & service_tokens)
            exact_tag_matches = len(intent_tokens & service_tags)
            category_overlap = len(intent_tokens & category_tokens)
            synonym_overlap = len(intent_tokens & synonym_tokens)

            phrase_bonus = 0
            category_score = 0
            specificity_penalty = 0
            fit_bonus = 0

            if detected_categories:
                if service.category in detected_categories:
                    category_score += 12
                else:
                    category_score -= 12

            if service.name.lower() in query_lower:
                phrase_bonus += 18
            if service.category.lower() in query_lower:
                phrase_bonus += 10
            if query_lower in search_text:
                phrase_bonus += 6
            if any(tag in query_lower for tag in service_tags if len(tag) > 3):
                phrase_bonus += 4
            if service.featured:
                phrase_bonus += 1

            if detected_categories and service.category not in detected_categories and overlap == 0:
                specificity_penalty -= 8

            if specific_category_intent and service.category not in detected_categories:
                if overlap == 0 and exact_tag_matches == 0 and category_overlap == 0 and synonym_overlap == 0:
                    specificity_penalty -= 18
                elif service.category not in detected_categories:
                    specificity_penalty -= 6

            if prefers_fast_option:
                if service.duration_minutes <= 20:
                    fit_bonus += 8
                elif service.duration_minutes <= 35:
                    fit_bonus += 4
                else:
                    fit_bonus -= 2

            if group_visit:
                if {"group", "guests", "party", "meeting"} & service_tokens:
                    fit_bonus += 8
                elif service.category == "Food and Beverage":
                    fit_bonus += 3

            if query_signals.group_size:
                if query_signals.group_size >= 6:
                    if {"group", "guests", "party", "meeting", "table"} & service_tokens:
                        fit_bonus += 8
                    elif service.category == "Food and Beverage":
                        fit_bonus += 4
                elif query_signals.group_size <= 2 and service.category == "Food and Beverage":
                    fit_bonus += 2

            if query_signals.budget_max is not None:
                if service.amount_aud <= query_signals.budget_max:
                    fit_bonus += 7
                else:
                    over_budget = service.amount_aud - query_signals.budget_max
                    fit_bonus -= min(10, int(over_budget // 10) + 2)

            if query_signals.preferred_locations:
                service_location_text = " ".join(
                    [service.venue_name or "", service.location or ""]
                ).lower()
                matching_locations = [
                    location
                    for location in query_signals.preferred_locations
                    if location in service_location_text
                ]
                if matching_locations:
                    fit_bonus += 8 + len(matching_locations)
                elif query_signals.preferred_locations:
                    fit_bonus -= 2

            if user_latitude is not None and user_longitude is not None:
                if service.latitude is not None and service.longitude is not None:
                    distance_km = _haversine_km(
                        user_latitude,
                        user_longitude,
                        service.latitude,
                        service.longitude,
                    )
                    if distance_km <= 2:
                        fit_bonus += 10
                    elif distance_km <= 5:
                        fit_bonus += 7
                    elif distance_km <= 12:
                        fit_bonus += 4
                    else:
                        fit_bonus -= min(6, int(distance_km // 5))
                elif "near me" in query_lower or "nearby" in query_lower:
                    fit_bonus -= 2

            if query_signals.prefers_evening:
                if service.category in {"Food and Beverage", "Hospitality and Events"}:
                    fit_bonus += 6
                elif service.category == "Membership and Community":
                    fit_bonus += 2

            if query_signals.prefers_morning:
                if service.category in {"Salon", "Healthcare Service"}:
                    fit_bonus += 5
                elif service.category == "Food and Beverage":
                    fit_bonus += 2

            if "family" in query_signals.customer_types:
                if {"group", "guests", "party", "kids", "children"} & service_tokens:
                    fit_bonus += 5
                elif service.category == "Food and Beverage":
                    fit_bonus += 3

            if "corporate" in query_signals.customer_types:
                if {"corporate", "meeting", "workspace", "office"} & service_tokens:
                    fit_bonus += 6
                elif service.category in {"Food and Beverage", "Membership and Community"}:
                    fit_bonus += 2

            if "first_time" in query_signals.customer_types:
                if {"consultation", "assessment", "tour", "signup"} & service_tokens:
                    fit_bonus += 6

            if query_signals.urgency == "urgent":
                if service.duration_minutes <= 20:
                    fit_bonus += 8
                elif service.duration_minutes <= 30:
                    fit_bonus += 4
            elif query_signals.urgency == "soon" and service.duration_minutes <= 30:
                fit_bonus += 3

            score = (
                overlap * 5
                + exact_tag_matches * 7
                + category_overlap * 6
                + synonym_overlap * 7
                + phrase_bonus
                + category_score
                + fit_bonus
                + specificity_penalty
            )
            if score > 0:
                scored_services.append(ServiceMatchInsight(service=service, score=score))

        scored_services.sort(
            key=lambda item: (
                item.score,
                item.service.featured,
                len(SERVICE_KEYWORD_SYNONYMS.get(item.service.id, set())),
                -item.service.amount_aud,
            ),
            reverse=True,
        )
        return scored_services

    def _match_services(
        self,
        query: str,
        limit: int = MAX_SERVICE_MATCHES,
        *,
        services: list[ServiceCatalogItem] | None = None,
        user_latitude: float | None = None,
        user_longitude: float | None = None,
        user_locality: str | None = None,
        precomputed_signals: ServiceQuerySignals | None = None,
    ) -> list[ServiceCatalogItem]:
        ranked = self._rank_services(
            query,
            services=services,
            user_latitude=user_latitude,
            user_longitude=user_longitude,
            user_locality=user_locality,
            precomputed_signals=precomputed_signals,
        )
        return [item.service for item in ranked[:limit]]

    @staticmethod
    def _build_clarification_prompt(
        *,
        message: str,
        matched_services: list[ServiceCatalogItem],
        ranked_matches: list[ServiceMatchInsight],
        query_signals: ServiceQuerySignals,
    ) -> str | None:
        lowered = message.lower()
        if not ranked_matches:
            return "I can narrow this quickly. Which matters most here: the type of service, your budget, or the location?"

        top_score = ranked_matches[0].score
        second_score = ranked_matches[1].score if len(ranked_matches) > 1 else None
        ambiguous = top_score < 16 or (
            second_score is not None
            and abs(top_score - second_score) <= 3
            and ranked_matches[0].service.category != ranked_matches[1].service.category
        )
        if not ambiguous:
            return None

        if not query_signals.preferred_locations and not any(token in lowered for token in ["near", "location", "suburb", "where"]):
            return "I can tighten this up fast. Which area or suburb should I prioritize?"
        if query_signals.budget_max is None and not any(token in lowered for token in ["budget", "under", "below", "price", "cost"]):
            return "I can make this more precise. What budget range should I stay within?"
        if not any(token in lowered for token in ["today", "tomorrow", "morning", "afternoon", "night", "urgent", "asap"]):
            return "I can narrow this to the right option. Do you need it today, this week, or just the best overall fit?"
        if len(matched_services) >= 2 and ranked_matches[0].service.category != ranked_matches[1].service.category:
            return (
                f"To narrow this down, are you mainly looking for {ranked_matches[0].service.category.lower()} "
                f"or {ranked_matches[1].service.category.lower()}?"
            )
        return "I can make this more exact with one detail. Is price, location, or speed the biggest priority?"

    @staticmethod
    def _validate_customer_details(
        *,
        customer_name: str,
        customer_email: str | None,
        customer_phone: str | None,
    ) -> None:
        normalized_name = customer_name.strip()
        if len(normalized_name) < 2:
            raise ValueError("Enter a customer name with at least 2 characters")
        if len(normalized_name) > 120:
            raise ValueError("Customer name must be 120 characters or fewer")

        normalized_email = (customer_email or "").strip().lower()
        normalized_phone = (customer_phone or "").strip()

        if not normalized_email and not normalized_phone:
            raise ValueError("Enter an email address or phone number")

        if normalized_email and not EMAIL_PATTERN.match(normalized_email):
            raise ValueError("Enter a valid email address")

        if normalized_phone:
            digits_only = re.sub(r"\D", "", normalized_phone)
            if len(digits_only) < 8:
                raise ValueError("Phone number must include at least 8 digits")
            if len(digits_only) > 15:
                raise ValueError("Phone number must include no more than 15 digits")
            if not PHONE_PATTERN.match(normalized_phone):
                raise ValueError("Phone number contains unsupported characters")

    @staticmethod
    def _validate_requested_slot(
        *,
        requested_date,
        requested_time,
        timezone_name: str,
    ) -> None:
        try:
            timezone = ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Timezone must be a valid IANA timezone") from exc

        now_local = datetime.now(tz=timezone)
        requested_at = datetime.combine(requested_date, requested_time, tzinfo=timezone)
        lead_time = timedelta(minutes=MIN_BOOKING_LEAD_MINUTES)

        if requested_at < now_local + lead_time:
            raise ValueError("Requested booking time must be at least 30 minutes from now")
        if requested_date > now_local.date() + timedelta(days=MAX_BOOKING_DAYS_AHEAD):
            raise ValueError("Requested booking date is too far in the future")
        if (
            requested_time.minute % 15 != 0
            or requested_time.second != 0
            or requested_time.microsecond != 0
        ):
            raise ValueError("Requested time must be in 15-minute increments")


@dataclass
class EmailService:
    settings: Settings

    def smtp_configured(self) -> bool:
        return all(
            [
                self.settings.email_smtp_host,
                self.settings.email_smtp_port > 0,
                self.settings.email_smtp_username,
                self.settings.email_smtp_password,
                self.settings.email_smtp_from,
            ]
        )

    def imap_configured(self) -> bool:
        return all(
            [
                self.settings.email_imap_host,
                self.settings.email_imap_port > 0,
                self.settings.email_imap_username,
                self.settings.email_imap_password,
            ]
        )

    async def send_email(
        self,
        *,
        to: list[str],
        subject: str,
        text: str,
        html: str | None = None,
    ) -> None:
        if not self.smtp_configured():
            raise ValueError("SMTP is not fully configured")

        await asyncio.to_thread(
            self._send_email_sync,
            to=to,
            subject=subject,
            text=text,
            html=html,
        )

    def _send_email_sync(
        self,
        *,
        to: list[str],
        subject: str,
        text: str,
        html: str | None = None,
    ) -> None:
        message = EmailMessage()
        message["From"] = self.settings.email_smtp_from
        message["To"] = ", ".join(to)
        message["Subject"] = subject
        message.set_content(text)
        if html:
            message.add_alternative(html, subtype="html")

        if self.settings.email_smtp_use_tls:
            server: smtplib.SMTP = smtplib.SMTP_SSL(
                self.settings.email_smtp_host,
                self.settings.email_smtp_port,
                timeout=20,
            )
        else:
            server = smtplib.SMTP(
                self.settings.email_smtp_host,
                self.settings.email_smtp_port,
                timeout=20,
            )

        try:
            server.ehlo()
            if self.settings.email_smtp_use_starttls and not self.settings.email_smtp_use_tls:
                server.starttls()
                server.ehlo()
            server.login(
                self.settings.email_smtp_username,
                self.settings.email_smtp_password,
            )
            server.send_message(message)
        finally:
            server.quit()

    async def fetch_inbox(self, limit: int = 20) -> list[InboxEmail]:
        if not self.imap_configured():
            raise ValueError("IMAP is not fully configured")
        if limit < 1:
            return []
        return await asyncio.to_thread(self._fetch_inbox_sync, limit)

    def _fetch_inbox_sync(self, limit: int) -> list[InboxEmail]:
        if self.settings.email_imap_use_ssl:
            mailbox: imaplib.IMAP4 = imaplib.IMAP4_SSL(
                self.settings.email_imap_host,
                self.settings.email_imap_port,
            )
        else:
            mailbox = imaplib.IMAP4(
                self.settings.email_imap_host,
                self.settings.email_imap_port,
            )

        try:
            mailbox.login(
                self.settings.email_imap_username,
                self.settings.email_imap_password,
            )
            mailbox.select(self.settings.email_imap_mailbox)
            status, data = mailbox.search(None, "ALL")
            if status != "OK" or not data:
                return []

            uids = [value for value in data[0].split() if value]
            selected = uids[-limit:]
            selected.reverse()

            result: list[InboxEmail] = []
            for uid in selected:
                fetch_status, msg_data = mailbox.fetch(uid, "(RFC822)")
                if fetch_status != "OK" or not msg_data:
                    continue
                raw = next((item[1] for item in msg_data if isinstance(item, tuple)), None)
                if not raw:
                    continue
                parsed = message_from_bytes(raw, policy=default)
                from_header = parseaddr(parsed.get("From", ""))[1] or parsed.get("From", "")
                subject = parsed.get("Subject", "")
                date = parsed.get("Date", "")
                snippet = self._extract_snippet(parsed)
                result.append(
                    InboxEmail(
                        uid=uid.decode(),
                        from_address=from_header,
                        subject=subject,
                        date=date,
                        snippet=snippet,
                    )
                )
            return result
        finally:
            try:
                mailbox.close()
            except Exception:
                pass
            mailbox.logout()

    @staticmethod
    def _extract_snippet(message: EmailMessage) -> str:
        if message.is_multipart():
            for part in message.walk():
                if part.get_content_type() == "text/plain":
                    text = part.get_content()
                    return str(text).strip()[:240]
        else:
            text = message.get_content()
            return str(text).strip()[:240]
        return ""


async def store_event(
    session: AsyncSession,
    *,
    source: str,
    event_type: str,
    message: TawkMessage,
    ai_intent: str | None,
    ai_reply: str | None,
    workflow_status: str | None,
    metadata: dict[str, Any],
) -> None:
    session.add(
        ConversationEvent(
            source=source,
            event_type=event_type,
            conversation_id=message.conversation_id,
            sender_name=message.sender_name,
            sender_email=message.sender_email,
            message_text=message.text,
            ai_intent=ai_intent,
            ai_reply=ai_reply,
            workflow_status=workflow_status,
            metadata_json=metadata,
        )
    )
    await session.commit()
