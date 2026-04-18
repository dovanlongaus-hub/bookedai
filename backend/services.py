from __future__ import annotations

from dataclasses import dataclass
import asyncio
import hashlib
import hmac
from html import unescape
from html.parser import HTMLParser
import json
import logging
import math
import re
import unicodedata
import os
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import parse_qs, quote, unquote, urlencode
from urllib.parse import urljoin, urlparse
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from config import Settings
from schemas import (
    AIBookingDecision,
    AIEventItem,
    BookingAssistantCatalogResponse,
    BookingAssistantChatMessage,
    BookingAssistantChatResponse,
    BookingAssistantSessionRequest,
    BookingAssistantSessionResponse,
    BookingWorkflowPayload,
    DemoBookingRequest,
    DemoBookingResponse,
    PricingConsultationRequest,
    PricingConsultationResponse,
    ServiceCatalogItem,
    TawkMessage,
)
from service_layer.email_service import EmailService
from service_layer.event_store import store_event
from service_layer.n8n_service import N8NService


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AIProviderConfig:
    label: str
    api_key: str
    base_url: str
    model: str

    @property
    def responses_endpoint(self) -> str:
        return f"{self.base_url.rstrip('/')}/responses"

    @property
    def is_openai(self) -> bool:
        return "api.openai.com" in self.base_url


@dataclass(frozen=True)
class PricingPlanDefinition:
    id: str
    name: str
    amount_aud: float
    price_suffix: str
    description: str
    onboarding_label: str
    consultation_minutes: int = 30


PRICING_PLAN_DEFINITIONS: dict[str, PricingPlanDefinition] = {
    "basic": PricingPlanDefinition(
        id="basic",
        name="Starter",
        amount_aud=119,
        price_suffix="/month",
        description="BookedAI Starter plan for Australian SMEs that need always-on lead capture and a simpler booking path.",
        onboarding_label="Lead capture setup",
    ),
    "standard": PricingPlanDefinition(
        id="standard",
        name="Growth",
        amount_aud=299,
        price_suffix="/month",
        description="BookedAI Growth plan for Australian SMEs that want stronger booking automation and follow-up.",
        onboarding_label="Booking automation setup",
    ),
    "pro": PricingPlanDefinition(
        id="pro",
        name="Pro",
        amount_aud=649,
        price_suffix="/month",
        description="BookedAI Pro plan for multi-location or higher-volume service teams.",
        onboarding_label="Advanced rollout setup",
    ),
}


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
    if api_key:
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
    params = urlencode(
        {
            "center": f"{latitude},{longitude}",
            "zoom": str(zoom),
            "size": "1200x700",
            "markers": f"{latitude},{longitude},red-pushpin",
        }
    )
    return f"https://staticmap.openstreetmap.de/staticmap.php?{params}"


CATEGORY_IMAGE_URLS: dict[str, str] = {
    "Salon": "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "Kids Services": "https://images.pexels.com/photos/8613089/pexels-photo-8613089.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "Food and Beverage": "https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "Healthcare Service": "https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "Membership and Community": "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "Hospitality and Events": "https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "Housing and Property": "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1200",
}

SERVICE_IMAGE_URLS: dict[str, str] = {
    "kids-swimming-lessons": "https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "kids-chess-club": "https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "junior-soccer-skills": "https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "kids-multisport-clinic": "https://images.pexels.com/photos/3662630/pexels-photo-3662630.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "restaurant-table-booking": "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "cafe-group-booking": "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "catering-enquiry": "https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "physio-initial-assessment": "https://images.pexels.com/photos/6111582/pexels-photo-6111582.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "dental-checkup-clean": "https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "skin-clinic-consult": "https://images.pexels.com/photos/3762875/pexels-photo-3762875.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "gym-membership-tour": "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "coworking-membership-tour": "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "hotel-room-reservation": "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "codex-property-project-consult": "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "auzland-project-consult": "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200",
}


def resolve_service_image_url(
    *,
    service_id: str,
    category: str,
    tags: list[str] | tuple[str, ...],
    image_url: str | None = None,
) -> str | None:
    normalized_image_url = (image_url or "").strip()
    if normalized_image_url:
        return normalized_image_url

    if service_id in SERVICE_IMAGE_URLS:
        return SERVICE_IMAGE_URLS[service_id]

    normalized_tags = {tag.strip().lower() for tag in tags if tag and tag.strip()}
    if {"swimming", "swim", "water"} & normalized_tags:
        return SERVICE_IMAGE_URLS["kids-swimming-lessons"]
    if {"chess", "strategy"} & normalized_tags:
        return SERVICE_IMAGE_URLS["kids-chess-club"]
    if {"soccer", "football"} & normalized_tags:
        return SERVICE_IMAGE_URLS["junior-soccer-skills"]
    if {"sport", "sports", "holiday"} & normalized_tags:
        return SERVICE_IMAGE_URLS["kids-multisport-clinic"]
    if {"restaurant", "dining"} & normalized_tags:
        return SERVICE_IMAGE_URLS["restaurant-table-booking"]
    if {"cafe", "coffee", "brunch"} & normalized_tags:
        return SERVICE_IMAGE_URLS["cafe-group-booking"]
    if {"catering", "menu"} & normalized_tags:
        return SERVICE_IMAGE_URLS["catering-enquiry"]
    if {"physio", "physiotherapy", "rehab"} & normalized_tags:
        return SERVICE_IMAGE_URLS["physio-initial-assessment"]
    if {"dental", "dentist", "teeth"} & normalized_tags:
        return SERVICE_IMAGE_URLS["dental-checkup-clean"]
    if {"skin", "aesthetic", "dermal"} & normalized_tags:
        return SERVICE_IMAGE_URLS["skin-clinic-consult"]
    if {"gym", "fitness"} & normalized_tags:
        return SERVICE_IMAGE_URLS["gym-membership-tour"]
    if {"coworking", "workspace", "office"} & normalized_tags:
        return SERVICE_IMAGE_URLS["coworking-membership-tour"]
    if {"hotel", "room", "accommodation"} & normalized_tags:
        return SERVICE_IMAGE_URLS["hotel-room-reservation"]

    return CATEGORY_IMAGE_URLS.get(category)


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
    explicit_location_need: bool = False
    follow_up_refinement: bool = False


@dataclass(frozen=True)
class ServiceMatchInsight:
    service: ServiceCatalogItem
    score: int


LOCATION_REQUEST_KEYWORDS = {
    "near",
    "nearby",
    "closest",
    "around",
    "local",
    "location",
    "suburb",
    "where",
    "nearest",
    "gan",
    "dia",
    "diem",
    "khu",
    "vuc",
    "o",
    "tai",
    "gan",
    "toi",
}


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
    business_email: str | None = None,
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
    resolved_image_url = resolve_service_image_url(
        service_id=id,
        category=category,
        tags=tags,
        image_url=image_url,
    )
    return ServiceCatalogItem(
        id=id,
        name=name,
        category=category,
        business_email=business_email,
        summary=summary,
        duration_minutes=duration_minutes,
        amount_aud=amount_aud,
        image_url=resolved_image_url,
        map_snapshot_url=_build_map_snapshot_url(latitude, longitude) if not resolved_image_url else None,
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
        r"(?:gia|duoi|tam)\s*(\d{1,4})\s*(?:do|aud)?",
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
        r"(?:nhom|ban|cho nhom|cho)\s*(\d{1,2})\s*(?:nguoi)?",
    ]
    for pattern in group_patterns:
        match = re.search(pattern, lowered)
        if match:
            group_size = int(match.group(1))
            break

    preferred_locations = _extract_preferred_locations_from_query(query)

    prefers_fast_option = bool(
        {"quick", "fast", "express", "quickest", "faster", "nhanh", "gap"} & tokens
        or {"after", "work"} <= tokens
        or "sau gio lam" in lowered
    )
    prefers_evening = bool(
        {"tonight", "evening"} & tokens
        or "after work" in lowered
        or "tomorrow night" in lowered
        or "toi nay" in lowered
        or "buoi toi" in lowered
        or "chieu toi" in lowered
        or "sau gio lam" in lowered
    )
    prefers_morning = bool(
        {"morning", "sang"} & tokens
        or "tomorrow morning" in lowered
        or "mai sang" in lowered
        or "buoi sang" in lowered
    )

    customer_types: list[str] = []
    customer_type_map = {
        "family": {"family", "kids", "children", "gia", "dinh", "be", "tre"},
        "corporate": {"corporate", "team", "office", "client", "workshop", "cong", "ty", "nhom"},
        "first_time": {"first", "new", "beginner", "lan", "dau", "moi"},
    }
    for label, keywords in customer_type_map.items():
        if keywords & tokens:
            customer_types.append(label)

    urgency = None
    if {"urgent", "asap", "today", "tonight", "hom", "nay", "gap"} & tokens or "hom nay" in lowered:
        urgency = "urgent"
    elif {"tomorrow", "soon", "mai"} & tokens or "ngay mai" in lowered:
        urgency = "soon"

    explicit_location_need = bool(
        LOCATION_REQUEST_KEYWORDS & tokens
        or "near me" in lowered
        or "closest to me" in lowered
        or "gan toi" in lowered
        or "gan day" in lowered
        or "o gan" in lowered
        or "gan nhat" in lowered
    )
    follow_up_refinement = bool(tokens & FOLLOW_UP_CONTEXT_TOKENS)

    return ServiceQuerySignals(
        budget_max=budget_max,
        group_size=group_size,
        preferred_locations=tuple(preferred_locations),
        prefers_fast_option=prefers_fast_option,
        prefers_evening=prefers_evening,
        prefers_morning=prefers_morning,
        customer_types=tuple(customer_types),
        urgency=urgency,
        explicit_location_need=explicit_location_need,
        follow_up_refinement=follow_up_refinement,
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
        explicit_location_need=primary.explicit_location_need or secondary.explicit_location_need,
        follow_up_refinement=primary.follow_up_refinement or secondary.follow_up_refinement,
    )


def _extract_preferred_locations_from_query(query: str) -> list[str]:
    lowered = query.lower()
    candidates: list[str] = []
    broad_location_tokens = {
        "australia",
        "australian",
        "nationwide",
        "anywhere",
        "across australia",
        "all australia",
    }
    known_locations = [
        "sydney",
        "melbourne",
        "brisbane",
        "perth",
        "adelaide",
        "canberra",
        "gold coast",
        "sunshine coast",
        "newcastle",
        "wollongong",
        "geelong",
        "hobart",
        "darwin",
        "parramatta",
        "north parramatta",
        "sydney olympic park",
        "george street",
        "church street",
        "macquarie street",
        "westfield parramatta",
        "parramatta cbd",
    ]
    for location in known_locations:
        if location in lowered and location not in candidates:
            candidates.append(location)

    patterns = [
        r"(?:in|near|around|at|close to|within)\s+([a-z][a-z0-9\s-]{2,40})",
        r"(?:o|gan|tai)\s+([a-z][a-z0-9\s-]{2,40})",
    ]
    trailing_stopwords = {
        "today",
        "tomorrow",
        "tonight",
        "please",
        "now",
        "for",
        "with",
        "under",
        "after",
        "before",
        "this",
        "next",
        "week",
        "weekend",
    }
    for pattern in patterns:
        for match in re.finditer(pattern, lowered):
            phrase = re.split(r"[,.!?;\n]", match.group(1), maxsplit=1)[0].strip(" -")
            if not phrase or phrase in {"me", "my location", "day"}:
                continue
            words = [word for word in phrase.split() if word]
            while words and words[-1] in trailing_stopwords:
                words.pop()
            if not words:
                continue
            candidate = " ".join(words[:4]).strip()
            if (
                len(candidate) < 3
                or candidate in candidates
                or candidate in broad_location_tokens
            ):
                continue
            candidates.append(candidate)

    return [candidate for candidate in candidates if candidate not in broad_location_tokens]


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
        location="Collins Street, Melbourne VIC 3000",
        latitude=-37.8153,
        longitude=144.9631,
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
        location="James Street, Fortitude Valley QLD 4006",
        latitude=-27.4574,
        longitude=153.0402,
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
        location="King Street, Newtown NSW 2042",
        latitude=-33.8983,
        longitude=151.1794,
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
        location="Rundle Mall, Adelaide SA 5000",
        latitude=-34.9227,
        longitude=138.6040,
        tags=["colour", "consultation", "styling", "salon"],
    ),
    _service_catalog_item(
        id="signature-facial-sydney",
        name="Signature Facial",
        category="Spa",
        summary="A premium facial with skin analysis, deep cleanse, hydration, and finishing massage for a polished glow.",
        duration_minutes=60,
        amount_aud=139,
        image_url=None,
        venue_name="Harbour Glow Spa",
        location="Surry Hills, Sydney NSW 2010",
        latitude=-33.8840,
        longitude=151.2094,
        tags=["facial", "spa", "skin", "hydration", "glow", "beauty", "treatment"],
        featured=True,
    ),
    _service_catalog_item(
        id="express-facial-sydney",
        name="Express Facial Reset",
        category="Spa",
        summary="A fast lunchtime facial focused on cleanse, exfoliation, and hydration for busy city schedules.",
        duration_minutes=35,
        amount_aud=95,
        image_url=None,
        venue_name="Harbour Glow Spa",
        location="Sydney CBD NSW 2000",
        latitude=-33.8680,
        longitude=151.2070,
        tags=["facial", "spa", "express", "skin", "hydration", "city", "quick"],
    ),
    _service_catalog_item(
        id="led-skin-therapy-sydney",
        name="LED Skin Therapy Facial",
        category="Spa",
        summary="Targeted facial treatment combining LED therapy, calming mask, and tailored post-treatment skincare advice.",
        duration_minutes=50,
        amount_aud=149,
        image_url=None,
        venue_name="Lumina Skin Studio Sydney",
        location="Paddington, Sydney NSW 2021",
        latitude=-33.8848,
        longitude=151.2294,
        tags=["facial", "spa", "led", "skin", "therapy", "beauty", "treatment"],
    ),
    _service_catalog_item(
        id="kids-swimming-lessons",
        name="Kids Swimming Lessons",
        category="Kids Services",
        business_email="info@bookedai.au",
        summary="Weekly learn-to-swim classes for children with beginner, intermediate, and confidence-building lanes.",
        duration_minutes=45,
        amount_aud=32,
        image_url=None,
        venue_name="Aqua Stars Swim School",
        location="South Bank, Brisbane QLD 4101",
        latitude=-27.4811,
        longitude=153.0234,
        tags=["kids", "children", "swimming", "swim", "lessons", "water", "beginner", "family"],
        featured=True,
    ),
    _service_catalog_item(
        id="kids-chess-club",
        name="Kids Chess Club",
        category="Kids Services",
        business_email="info@bookedai.au",
        summary="Beginner-friendly chess coaching for kids focused on tactics, confidence, and weekend tournament prep.",
        duration_minutes=60,
        amount_aud=24,
        image_url=None,
        venue_name="Checkmate Kids Academy",
        location="Carlton VIC 3053",
        latitude=-37.8009,
        longitude=144.9661,
        tags=["kids", "children", "chess", "club", "class", "lesson", "beginner", "strategy"],
    ),
    _service_catalog_item(
        id="junior-soccer-skills",
        name="Junior Soccer Skills Program",
        category="Kids Services",
        business_email="info@bookedai.au",
        summary="After-school soccer sessions for children covering movement, ball control, and small-team play.",
        duration_minutes=60,
        amount_aud=28,
        image_url=None,
        venue_name="Junior Football Academy",
        location="Perth WA 6000",
        latitude=-31.9522,
        longitude=115.8614,
        tags=["kids", "children", "junior", "soccer", "football", "sport", "after school", "team"],
    ),
    _service_catalog_item(
        id="kids-multisport-clinic",
        name="Kids Multi-Sport Holiday Clinic",
        category="Kids Services",
        business_email="info@bookedai.au",
        summary="School holiday sports sessions for kids combining basketball, running games, and coordination drills.",
        duration_minutes=90,
        amount_aud=35,
        image_url=None,
        venue_name="Active Kids Hub",
        location="Canberra ACT 2601",
        latitude=-35.2802,
        longitude=149.1310,
        tags=["kids", "children", "sport", "sports", "holiday", "clinic", "basketball", "active"],
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
        location="Southbank VIC 3006",
        latitude=-37.8216,
        longitude=144.9648,
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
        location="West End QLD 4101",
        latitude=-27.4820,
        longitude=153.0080,
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
        venue_name="City Health Hub",
        location="Adelaide SA 5000",
        latitude=-34.9286,
        longitude=138.6007,
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
        location="Richmond VIC 3121",
        latitude=-37.8231,
        longitude=144.9989,
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
        location="Subiaco WA 6008",
        latitude=-31.9488,
        longitude=115.8247,
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
        location="Newstead QLD 4006",
        latitude=-27.4485,
        longitude=153.0448,
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
        venue_name="City RSL Club",
        location="Newcastle NSW 2300",
        latitude=-32.9283,
        longitude=151.7817,
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
        venue_name="City RSL Club",
        location="Wollongong NSW 2500",
        latitude=-34.4278,
        longitude=150.8931,
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
        location="Surfers Paradise QLD 4217",
        latitude=-28.0027,
        longitude=153.4290,
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
        venue_name="WOTSO Melbourne",
        location="Melbourne VIC 3000",
        latitude=-37.8136,
        longitude=144.9631,
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
        location="The Rocks NSW 2000",
        latitude=-33.8599,
        longitude=151.2090,
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
        venue_name="Harbour View Hotel Brisbane",
        location="Brisbane City QLD 4000",
        latitude=-27.4698,
        longitude=153.0251,
        tags=["hotel", "room", "reservation", "stay", "hospitality", "booking"],
    ),
    _service_catalog_item(
        id="codex-property-project-consult",
        name="Codex Property Project Consultation",
        category="Housing and Property",
        summary="Book a consultation to discuss off-the-plan housing projects, target suburbs, budget range, and investment or owner-occupier goals.",
        duration_minutes=45,
        amount_aud=49,
        image_url=None,
        venue_name="Codex Property",
        location="Sydney NSW 2000",
        latitude=-33.8688,
        longitude=151.2093,
        booking_url="https://codexproperty.com.au",
        tags=[
            "housing",
            "property",
            "project",
            "apartment",
            "home",
            "investment",
            "off the plan",
            "consultation",
            "real estate",
        ],
        featured=True,
    ),
    _service_catalog_item(
        id="auzland-project-consult",
        name="Auzland Housing Project Consultation",
        category="Housing and Property",
        summary="Schedule a housing consultation to review available projects, preferred locations, budget, and settlement timeline with the Auzland team.",
        duration_minutes=45,
        amount_aud=49,
        image_url=None,
        venue_name="Auzland",
        location="Melbourne VIC 3000",
        latitude=-37.8136,
        longitude=144.9631,
        booking_url="https://auzland.au/",
        tags=[
            "housing",
            "property",
            "project",
            "townhouse",
            "house",
            "apartment",
            "first home",
            "consultation",
            "real estate",
        ],
        featured=True,
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
    "dich",
    "vu",
    "tim",
    "kiem",
    "toi",
    "can",
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
        "toc",
        "cat",
        "uon",
        "nhuom",
        "lam",
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
        "an",
        "uong",
        "ban",
        "dat",
        "cho",
        "nha",
        "hang",
        "quan",
        "cafe",
        "ca",
        "phe",
        "tiec",
        "nhom",
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
        "kham",
        "bac",
        "si",
        "dau",
        "vai",
        "vat",
        "ly",
        "tri",
        "lieu",
    },
    "Kids Services": {
        "kids",
        "kid",
        "children",
        "child",
        "family",
        "swimming",
        "swim",
        "chess",
        "junior",
        "sport",
        "sports",
        "soccer",
        "football",
        "class",
        "lesson",
        "lessons",
        "after",
        "school",
        "be",
        "tre",
        "lop",
        "hoc",
        "boi",
        "co",
        "vua",
        "the",
        "thao",
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
        "hoi",
        "vien",
        "thanh",
        "gia",
        "han",
        "dang",
        "ky",
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
        "khach",
        "san",
        "phong",
        "su",
        "kien",
        "dia",
        "diem",
    },
    "Housing and Property": {
        "housing",
        "property",
        "properties",
        "real",
        "estate",
        "project",
        "projects",
        "apartment",
        "apartments",
        "unit",
        "units",
        "house",
        "home",
        "homes",
        "townhouse",
        "investment",
        "investor",
        "buyer",
        "buyers",
        "off",
        "plan",
        "mortgage",
        "suburb",
        "du",
        "an",
        "nha",
        "dat",
        "bat",
        "dong",
        "san",
        "can",
        "ho",
        "mua",
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
        "bien",
        "bang",
        "hieu",
        "booth",
        "backdrop",
        "poster",
    },
}
SERVICE_KEYWORD_SYNONYMS: dict[str, set[str]] = {
    "physio-initial-assessment": {"shoulder", "back", "pain", "mobility", "injury", "rehab"},
    "gp-consultation": {"doctor", "medical", "symptoms", "general", "health"},
    "dental-checkup-clean": {"dentist", "tooth", "teeth", "checkup", "clean"},
    "skin-clinic-consult": {"skin", "acne", "aesthetic", "treatment", "dermal"},
    "kids-swimming-lessons": {"kids", "children", "swimming", "swim", "lessons", "water", "learn"},
    "kids-chess-club": {"kids", "children", "chess", "class", "club", "beginner", "strategy"},
    "junior-soccer-skills": {"kids", "children", "junior", "soccer", "football", "sport", "after school"},
    "kids-multisport-clinic": {"kids", "children", "sport", "sports", "holiday", "clinic", "active"},
    "restaurant-table-booking": {"restaurant", "table", "dinner", "lunch", "party", "guests", "dat", "ban", "cho"},
    "cafe-group-booking": {"cafe", "coffee", "brunch", "group", "meeting", "nhom", "ban"},
    "catering-enquiry": {"catering", "quote", "event", "corporate", "menu"},
    "rsl-membership-renewal": {"rsl", "membership", "renew", "renewal", "member"},
    "rsl-membership-signup": {"rsl", "membership", "join", "signup", "member"},
    "gym-membership-tour": {"gym", "fitness", "tour", "membership", "join"},
    "coworking-membership-tour": {"coworking", "workspace", "office", "desk", "tour"},
    "pub-function-enquiry": {"pub", "function", "party", "event", "venue"},
    "hotel-room-reservation": {"hotel", "room", "reservation", "stay", "accommodation"},
    "codex-property-project-consult": {
        "housing",
        "property",
        "project",
        "projects",
        "apartment",
        "home",
        "investment",
        "off the plan",
        "real estate",
    },
    "auzland-project-consult": {
        "housing",
        "property",
        "project",
        "projects",
        "townhouse",
        "house",
        "apartment",
        "first home",
        "real estate",
    },
}
FOLLOW_UP_CONTEXT_TOKENS = {
    "best",
    "better",
    "cheapest",
    "cheap",
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
    "re",
    "nhat",
    "gan",
    "nhanh",
    "tot",
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
    "re",
    "nhat",
    "ban",
    "cho",
    "nhom",
}
SERVICE_DISCOVERY_QUESTION_KEYWORDS = {
    "best",
    "better",
    "cheap",
    "cheapest",
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
    "nhanh",
    "re",
    "gan",
    "toi",
    "nhat",
    "dat",
    "ban",
    "cho",
    "nhom",
    "sau",
    "gio",
    "lam",
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
            "Use the user's exact wording, the recent conversation context, and the catalog together as a semantic search brief. "
            "Treat the provided catalog as a ranked shortlist for the current request, not the full database. "
            "Stay anchored to the user's latest message first, and use older conversation context only to refine follow-up intent. "
            "Keep the tone concise, polished, and decision-oriented. Lead with the strongest recommendation, "
            "then briefly explain why it fits. Mention price, duration, venue, or timing when they help the user "
            "decide. End with one concrete next step. If the user is vague, ask one clarifying question while still "
            "offering the closest options. Adapt your wording to the service category: salon should focus on look, timing, "
            "and occasion-readiness; healthcare should focus on suitability, assessment, and care context without sounding medical-legal; "
            "food and hospitality should focus on group fit, table or venue suitability, and booking convenience; memberships should focus "
            "on eligibility, renewal, onboarding, and value; AI/community events should focus on relevance, timing, networking value, and venue. "
            "The user may write in English or Vietnamese. Reply in the user's language when clear. "
            "Do not invent services, locations, or prices. Avoid filler, hype, or long paragraphs."
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

    async def team_assistant_reply(
        self,
        *,
        question: str,
        context_blocks: list[dict[str, str]],
    ) -> str:
        if not self.is_configured():
            return ""

        prompt = (
            "You are BookedAI's internal team assistant. "
            "Answer using only the supplied repo planning and progress context. "
            "Be concise, operational, and truthful. "
            "If the context is insufficient, say that clearly instead of guessing. "
            "Prefer short bullet-ready language and reference the most relevant source file path when helpful."
        )
        schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "reply": {"type": "string"},
            },
            "required": ["reply"],
        }

        try:
            output_text = await self._generate_structured_json(
                prompt=prompt,
                payload={
                    "question": question,
                    "context_blocks": context_blocks,
                },
                schema_name="team_assistant_reply",
                schema=schema,
            )
        except Exception:
            return ""

        if not output_text:
            return ""

        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError:
            return ""

        return str(parsed.get("reply") or "").strip()

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
        return any(config.api_key for config in self._provider_configs())

    async def _generate_structured_json(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        schema_name: str,
        schema: dict[str, Any],
    ) -> str:
        last_error: Exception | None = None
        for provider in self._provider_configs():
            try:
                return await self._generate_provider_structured_json(
                    provider=provider,
                    prompt=prompt,
                    payload=payload,
                    schema_name=schema_name,
                    schema=schema,
                )
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "AI provider %s failed; trying next configured provider: %s",
                    provider.label,
                    exc,
                )

        if last_error is not None:
            raise last_error
        raise RuntimeError("No AI provider is configured")

    def _provider_configs(self) -> list[AIProviderConfig]:
        providers: list[AIProviderConfig] = []
        primary = self._build_provider_config(
            label=self.settings.ai_provider or "primary",
            api_key=self.settings.ai_api_key,
            base_url=self.settings.ai_base_url,
            model=self.settings.ai_model,
        )
        fallback = self._build_provider_config(
            label=self.settings.ai_fallback_provider or "fallback",
            api_key=self.settings.ai_fallback_api_key,
            base_url=self.settings.ai_fallback_base_url,
            model=self.settings.ai_fallback_model,
        )
        for provider in (primary, fallback):
            if provider and provider.api_key:
                providers.append(provider)
        return providers

    @staticmethod
    def _build_provider_config(
        *,
        label: str,
        api_key: str,
        base_url: str,
        model: str,
    ) -> AIProviderConfig | None:
        normalized_key = api_key.strip()
        if not normalized_key:
            return None
        return AIProviderConfig(
            label=label.strip() or "provider",
            api_key=normalized_key,
            base_url=base_url.strip() or "https://api.openai.com/v1",
            model=model.strip() or "gpt-5-mini",
        )

    async def _generate_provider_structured_json(
        self,
        *,
        provider: AIProviderConfig,
        prompt: str,
        payload: dict[str, Any],
        schema_name: str,
        schema: dict[str, Any],
    ) -> str:
        request_payload = {
            "model": provider.model,
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
        if provider.is_openai:
            request_payload["reasoning"] = {"effort": "minimal"}
        headers = {
            "Authorization": f"Bearer {provider.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.settings.openai_timeout_seconds) as client:
            response = await client.post(
                provider.responses_endpoint,
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
        shortlist = [item.service for item in ranked_matches[: max(MAX_SERVICE_MATCHES * 2, 6)]]
        matched_services = self._curate_service_matches(shortlist)
        ai_shortlist = self._curate_service_matches(shortlist, limit=max(MAX_SERVICE_MATCHES * 2, 6))
        wants_services = self._should_match_services(message, matched_services)

        if wants_events and not wants_services:
            return BookingAssistantChatResponse(
                status="ok",
                reply=self._build_ai_events_reply(message, matched_events),
                matched_services=[],
                matched_events=self._curate_event_matches(matched_events),
                suggested_service_id=None,
                should_request_location=False,
            )

        try:
            ai_reply, ai_service_ids = await openai_service.booking_assistant_reply(
                message=effective_query,
                conversation=conversation,
                services=ai_shortlist,
            )
        except Exception:
            ai_reply, ai_service_ids = "", None

        if ai_service_ids:
            services_by_id = {service.id: service for service in ai_shortlist}
            matched_services = [
                services_by_id[service_id]
                for service_id in ai_service_ids
                if service_id in services_by_id
            ] or matched_services
            matched_services = self._curate_service_matches(matched_services)

        matched_events = self._curate_event_matches(matched_events)

        suggested_service_id = matched_services[0].id if matched_services else None
        should_request_location = self._should_request_location(
            message=message,
            query_signals=memory_signals,
            ranked_matches=ranked_matches,
            user_latitude=user_latitude,
            user_longitude=user_longitude,
            user_locality=user_locality,
        )
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
            should_request_location=should_request_location,
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

        explicit_follow_up = bool(message_tokens & FOLLOW_UP_CONTEXT_TOKENS)
        has_current_category = any(message_tokens & keywords for keywords in CATEGORY_KEYWORDS.values())
        has_current_filters = bool(
            primary_signals.budget_max is not None
            or primary_signals.group_size is not None
            or primary_signals.preferred_locations
            or primary_signals.prefers_fast_option
            or primary_signals.prefers_evening
            or primary_signals.prefers_morning
            or primary_signals.explicit_location_need
            or primary_signals.urgency
        )
        needs_context = explicit_follow_up or (
            len(message_tokens) <= 5 and not has_current_category and not has_current_filters
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
        if "housing" in category or "property" in category:
            return "project fit, budget alignment, and consultation clarity"
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
        if "housing" in category or "property" in category:
            return f"My strongest recommendation is {service.name} because it is the clearest path to discuss the right project options with a consultant."
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
        if "housing" in category or "property" in category:
            return "project suitability, budget range, and next-step consultation"
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
        meeting_status = "configuration_required"
        meeting_join_url: str | None = None
        meeting_event_url: str | None = None
        calendar_add_url = self._build_google_calendar_url(
            booking_reference=booking_reference,
            service=service,
            payload=payload,
        )
        business_recipient = (
            (service.business_email or "").strip().lower() or self.settings.booking_business_email
        )
        info_recipient = self.settings.booking_business_email.strip().lower()

        if normalized_email and self.zoho_calendar_configured():
            try:
                meeting_join_url, meeting_event_url = await self._create_zoho_calendar_event(
                    booking_reference=booking_reference,
                    service=service,
                    payload=payload,
                    customer_email=normalized_email,
                )
                meeting_status = "scheduled"
            except Exception:
                meeting_status = "configuration_required"

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
                        cc=[business_recipient, info_recipient],
                        subject=f"BookedAI booking request {booking_reference}",
                        text=self._build_customer_confirmation_text(
                            booking_reference=booking_reference,
                            service=service,
                            payload=payload,
                            payment_url=payment_url,
                            business_email=business_recipient,
                            meeting_join_url=meeting_join_url,
                            meeting_event_url=meeting_event_url,
                            calendar_add_url=calendar_add_url,
                        ),
                    )
                await email_service.send_email(
                    to=[business_recipient],
                    cc=[info_recipient],
                    subject=f"New BookedAI booking lead {booking_reference}",
                    text=self._build_internal_notification_text(
                        booking_reference=booking_reference,
                        service=service,
                        payload=payload,
                        payment_url=payment_url,
                        meeting_join_url=meeting_join_url,
                        meeting_event_url=meeting_event_url,
                        calendar_add_url=calendar_add_url,
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
                    "business_email": business_recipient,
                    "meeting_status": meeting_status,
                    "meeting_join_url": meeting_join_url,
                    "meeting_event_url": meeting_event_url,
                    "calendar_add_url": calendar_add_url,
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
                f"a follow-up from {business_recipient}."
            )
        )
        if meeting_status == "scheduled":
            confirmation_message += " Your calendar event has also been prepared."

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
            meeting_status=meeting_status,  # type: ignore[arg-type]
            meeting_join_url=meeting_join_url,
            meeting_event_url=meeting_event_url,
            calendar_add_url=calendar_add_url,
            confirmation_message=confirmation_message,
            contact_email=business_recipient,
            workflow_status=workflow_status,
        )

    def zoho_calendar_configured(self) -> bool:
        return bool(
            self.settings.zoho_calendar_uid
            and (
                self.settings.zoho_calendar_access_token
                or (
                    self.settings.zoho_calendar_refresh_token
                    and self.settings.zoho_calendar_client_id
                    and self.settings.zoho_calendar_client_secret
                )
            )
        )

    async def _get_zoho_access_token(self) -> str:
        direct_token = self.settings.zoho_calendar_access_token.strip()
        if direct_token:
            return direct_token

        if not (
            self.settings.zoho_calendar_refresh_token
            and self.settings.zoho_calendar_client_id
            and self.settings.zoho_calendar_client_secret
        ):
            raise ValueError("Zoho Calendar OAuth credentials are incomplete")

        token_url = f"{self.settings.zoho_accounts_base_url.rstrip('/')}/oauth/v2/token"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                token_url,
                data={
                    "refresh_token": self.settings.zoho_calendar_refresh_token,
                    "client_id": self.settings.zoho_calendar_client_id,
                    "client_secret": self.settings.zoho_calendar_client_secret,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            payload = response.json()

        access_token = str(payload.get("access_token") or "").strip()
        if not access_token:
            raise ValueError("Zoho OAuth response did not include an access token")
        return access_token

    async def _create_zoho_calendar_event(
        self,
        *,
        booking_reference: str,
        service: ServiceCatalogItem,
        payload: BookingAssistantSessionRequest,
        customer_email: str,
    ) -> tuple[str | None, str | None]:
        access_token = await self._get_zoho_access_token()
        zone = ZoneInfo(payload.timezone)
        start_at = datetime.combine(payload.requested_date, payload.requested_time, tzinfo=zone)
        end_at = start_at + timedelta(minutes=service.duration_minutes)
        description_lines = [
            f"BookedAI booking request for {service.name}.",
            f"Booking reference: {booking_reference}",
            f"Customer: {payload.customer_name}",
            f"Email: {customer_email}",
            f"Phone: {(payload.customer_phone or '').strip() or 'Not provided'}",
            f"Location: {' • '.join(item for item in [service.venue_name, service.location] if item) or 'To be confirmed'}",
            f"Price: {self._format_amount(service.amount_aud)}",
        ]
        if payload.notes:
            description_lines.append(f"Notes: {payload.notes.strip()}")

        event_data = {
            "title": f"{service.name} - {payload.customer_name}",
            "location": " • ".join(item for item in [service.venue_name, service.location] if item)
            or "Service booking via BookedAI",
            "description": "\n".join(description_lines),
            "dateandtime": {
                "timezone": payload.timezone,
                "start": start_at.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ"),
                "end": end_at.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ"),
            },
            "attendees": [
                {
                    "email": customer_email,
                    "permission": 1,
                    "attendance": 1,
                }
            ],
            "reminders": [
                {"action": "email", "minutes": 60},
                {"action": "popup", "minutes": 15},
            ],
            "notify_attendee": 2,
            "conference": "zmeeting",
            "allowForwarding": True,
            "notifyType": 1,
        }
        encoded_event_data = quote(json.dumps(event_data, separators=(",", ":")), safe="")
        calendar_url = (
            f"{self.settings.zoho_calendar_api_base_url.rstrip('/')}/calendars/"
            f"{self.settings.zoho_calendar_uid}/events?eventdata={encoded_event_data}"
        )

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                calendar_url,
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
            )
            response.raise_for_status()
            payload_data = response.json()

        event = ((payload_data.get("events") or [None])[0] or {}) if isinstance(payload_data, dict) else {}
        app_data = event.get("app_data") if isinstance(event.get("app_data"), dict) else {}
        meeting_data = app_data.get("meetingdata") if isinstance(app_data.get("meetingdata"), dict) else {}
        meeting_link = str(meeting_data.get("meetinglink") or "").strip() or None
        event_url = str(event.get("viewEventURL") or "").strip() or None
        return meeting_link, event_url

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
        business_recipient = (
            (service.business_email or "").strip().lower() or self.settings.booking_business_email
        )
        return f"mailto:{business_recipient}?subject={subject}&body={body}"

    @staticmethod
    def _build_qr_code_url(target_url: str) -> str:
        return (
            "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data="
            f"{quote(target_url, safe='')}"
        )

    @staticmethod
    def _format_amount(amount_aud: float) -> str:
        return f"A${amount_aud:,.2f}"

    def _build_google_calendar_url(
        self,
        *,
        booking_reference: str,
        service: ServiceCatalogItem,
        payload: BookingAssistantSessionRequest,
    ) -> str:
        zone = ZoneInfo(payload.timezone)
        start_at = datetime.combine(payload.requested_date, payload.requested_time, tzinfo=zone)
        end_at = start_at + timedelta(minutes=service.duration_minutes)
        details = [
            f"BookedAI booking reference: {booking_reference}",
            f"Service: {service.name}",
            f"Customer: {payload.customer_name}",
        ]
        if payload.notes:
            details.append(f"Notes: {payload.notes.strip()}")
        params = urlencode(
            {
                "action": "TEMPLATE",
                "text": f"{service.name} - {payload.customer_name}",
                "dates": (
                    f"{start_at.astimezone(ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')}/"
                    f"{end_at.astimezone(ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')}"
                ),
                "details": "\n".join(details),
                "location": " • ".join(
                    item for item in [service.venue_name, service.location] if item
                )
                or "Service booking via BookedAI",
                "ctz": payload.timezone,
            }
        )
        return f"https://calendar.google.com/calendar/render?{params}"

    def _build_customer_confirmation_text(
        self,
        *,
        booking_reference: str,
        service: ServiceCatalogItem,
        payload: BookingAssistantSessionRequest,
        payment_url: str,
        business_email: str,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
        calendar_add_url: str | None,
    ) -> str:
        lines = [
            "Thanks for booking with BookedAI.",
            "",
            f"Booking reference: {booking_reference}",
            f"Service: {service.name}",
            f"Requested date: {payload.requested_date.isoformat()}",
            f"Requested time: {payload.requested_time.strftime('%H:%M')}",
            f"Timezone: {payload.timezone}",
            f"Price: {self._format_amount(service.amount_aud)}",
        ]
        if meeting_event_url:
            lines.append(f"Calendar event: {meeting_event_url}")
        if meeting_join_url:
            lines.append(f"Calendar join link: {meeting_join_url}")
        if calendar_add_url:
            lines.append(f"Add to Google Calendar: {calendar_add_url}")
        lines.extend(
            [
                "",
                f"Payment and confirmation link: {payment_url}",
                "",
                f"If you need help, reply to {business_email}.",
            ]
        )
        return "\n".join(lines)

    @staticmethod
    def _build_internal_notification_text(
        *,
        booking_reference: str,
        service: ServiceCatalogItem,
        payload: BookingAssistantSessionRequest,
        payment_url: str,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
        calendar_add_url: str | None,
    ) -> str:
        lines = [
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
        if meeting_event_url:
            lines.append(f"Calendar event: {meeting_event_url}")
        if meeting_join_url:
            lines.append(f"Calendar join link: {meeting_join_url}")
        if calendar_add_url:
            lines.append(f"Add to Google Calendar: {calendar_add_url}")
        return "\n".join(lines)

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
            "For example: facial in Sydney under 150 dollars, physio for shoulder pain near Parramatta, restaurant table for 6, renew my membership, or AI events at WSTI."
        )

    @staticmethod
    def _service_search_text(service: ServiceCatalogItem) -> str:
        return " ".join(
            [
                service.name,
                service.category,
                service.summary,
                service.venue_name or "",
                service.location or "",
                *service.tags,
            ]
        ).lower()

    @staticmethod
    def _should_request_location(
        *,
        message: str,
        query_signals: ServiceQuerySignals,
        ranked_matches: list[ServiceMatchInsight],
        user_latitude: float | None,
        user_longitude: float | None,
        user_locality: str | None,
    ) -> bool:
        if user_latitude is not None and user_longitude is not None:
            return False
        if user_locality and user_locality.strip():
            return False
        if query_signals.preferred_locations:
            return False

        tokens = tokenize_text(message)
        explicit_location_need = bool(tokens & LOCATION_REQUEST_KEYWORDS)
        if not ranked_matches:
            return explicit_location_need

        top_score = ranked_matches[0].score
        second_score = ranked_matches[1].score if len(ranked_matches) > 1 else None
        distinct_locations = {
            " | ".join(
                item
                for item in [match.service.venue_name or "", match.service.location or ""]
                if item
            ).strip()
            for match in ranked_matches[:3]
        }
        distinct_locations.discard("")

        return explicit_location_need and (
            len(distinct_locations) >= 2
            or (second_score is not None and abs(top_score - second_score) <= 5)
        )

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
                explicit_location_need=query_signals.explicit_location_need,
                follow_up_refinement=query_signals.follow_up_refinement,
            )
        prefers_fast_option = query_signals.prefers_fast_option
        group_visit = bool(
            {"group", "team", "people", "guests"} & intent_tokens or query_signals.group_size
        )
        social_booking_intent = bool(
            (query_signals.group_size is not None and query_signals.group_size >= 4)
            or {"group", "guests", "party", "meeting", "table", "people", "nhom", "nguoi"}
            & intent_tokens
        )
        explicit_location_need = query_signals.explicit_location_need
        follow_up_refinement = query_signals.follow_up_refinement
        prefers_low_cost = bool(
            {"cheap", "cheapest", "budget", "re", "nhat"} & intent_tokens
            or "gia re" in query_lower
            or "re nhat" in query_lower
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
            bookability_bonus = 0

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

            if service.booking_url:
                bookability_bonus += 10
            if service.map_url:
                bookability_bonus += 4
            if service.location or service.venue_name:
                bookability_bonus += 5
            if service.summary and len(service.summary.strip()) >= 40:
                bookability_bonus += 3
            if service.image_url:
                bookability_bonus += 1
            if service.featured:
                bookability_bonus += 2
            if service.amount_aud > 0:
                bookability_bonus += 2
            if service.duration_minutes <= 45:
                bookability_bonus += 2
            if service.duration_minutes <= 30:
                bookability_bonus += 1
            if not service.booking_url and not service.map_url:
                specificity_penalty -= 2
            if not service.location and not service.venue_name:
                specificity_penalty -= 3

            if detected_categories and service.category not in detected_categories and overlap == 0:
                specificity_penalty -= 8

            if specific_category_intent and service.category not in detected_categories:
                if overlap == 0 and exact_tag_matches == 0 and category_overlap == 0 and synonym_overlap == 0:
                    specificity_penalty -= 18
                elif service.category not in detected_categories:
                    specificity_penalty -= 6

            if social_booking_intent:
                supports_groups = bool(
                    {"group", "guests", "party", "meeting", "table", "event"} & service_tokens
                ) or service.category in {"Food and Beverage", "Hospitality and Events"}
                if supports_groups:
                    fit_bonus += 6
                else:
                    specificity_penalty -= 20

            if explicit_location_need and not detected_categories:
                location_relevant = bool(service.venue_name or service.location)
                if location_relevant:
                    fit_bonus += 2
                else:
                    specificity_penalty -= 6

            if prefers_fast_option:
                if service.duration_minutes <= 20:
                    fit_bonus += 8
                elif service.duration_minutes <= 30:
                    fit_bonus += 6
                elif service.duration_minutes <= 35:
                    fit_bonus += 4
                elif service.duration_minutes >= 45:
                    fit_bonus -= 8
                else:
                    fit_bonus -= 4

            if follow_up_refinement:
                if service.duration_minutes <= 20:
                    fit_bonus += 10
                elif service.duration_minutes <= 30:
                    fit_bonus += 6
                elif service.duration_minutes <= 35:
                    fit_bonus += 2
                elif service.duration_minutes >= 45:
                    specificity_penalty -= 10

                if {"after", "work"} <= intent_tokens:
                    if service.category == "Healthcare Service" and service.duration_minutes <= 30:
                        fit_bonus += 4
                    elif service.category == "Healthcare Service" and service.duration_minutes >= 45:
                        specificity_penalty -= 4
                    elif service.category in {"Food and Beverage", "Hospitality and Events"}:
                        fit_bonus += 2

                if prefers_fast_option and {"initial", "assessment"} & service_tokens and service.duration_minutes >= 40:
                    specificity_penalty -= 6

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
                    elif service.category in {"Healthcare Service", "Membership and Community", "Salon"}:
                        specificity_penalty -= 14
                elif query_signals.group_size <= 2 and service.category == "Food and Beverage":
                    fit_bonus += 2

            if query_signals.budget_max is not None:
                if service.amount_aud <= query_signals.budget_max:
                    fit_bonus += 7
                else:
                    over_budget = service.amount_aud - query_signals.budget_max
                    fit_bonus -= min(10, int(over_budget // 10) + 2)
            elif prefers_low_cost:
                if service.amount_aud <= 20:
                    fit_bonus += 8
                elif service.amount_aud <= 35:
                    fit_bonus += 5
                elif service.amount_aud <= 50:
                    fit_bonus += 2
                elif service.amount_aud >= 100:
                    specificity_penalty -= 6

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
                    specificity_penalty -= 6

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
                + bookability_bonus
                + specificity_penalty
            )
            if score > 0:
                scored_services.append(ServiceMatchInsight(service=service, score=score))

        scored_services.sort(
            key=lambda item: (
                item.score,
                bool(item.service.booking_url),
                bool(item.service.location or item.service.venue_name),
                bool(item.service.map_url),
                bool(item.service.featured),
                item.service.featured,
                len(SERVICE_KEYWORD_SYNONYMS.get(item.service.id, set())),
                -(item.service.duration_minutes if item.service.duration_minutes else 999),
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
class PricingService:
    def __init__(self, settings: Settings):
        self.settings = settings

    @staticmethod
    def _format_amount(amount_aud: float, suffix: str = "") -> str:
        formatted = f"A${amount_aud:,.2f}"
        return f"{formatted}{suffix}" if suffix else formatted

    def _get_plan(self, plan_id: str) -> PricingPlanDefinition:
        plan = PRICING_PLAN_DEFINITIONS.get(plan_id)
        if not plan:
            raise ValueError("Selected pricing plan was not found")
        return plan

    def _validate_payload(self, payload: PricingConsultationRequest) -> None:
        normalized_email = payload.customer_email.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", normalized_email):
            raise ValueError("Enter a valid email address")

        phone = (payload.customer_phone or "").strip()
        if phone:
            digits = re.sub(r"\D", "", phone)
            if len(digits) < 8:
                raise ValueError("Enter a valid phone number with at least 8 digits")

        try:
            zone = ZoneInfo(payload.timezone)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unsupported timezone for consultation scheduling") from exc

        preferred_start = datetime.combine(payload.preferred_date, payload.preferred_time, tzinfo=zone)
        if preferred_start <= datetime.now(zone) + timedelta(minutes=30):
            raise ValueError("Choose a consultation time at least 30 minutes from now")

        if payload.startup_referral_eligible and not (payload.referral_partner or "").strip():
            raise ValueError("Enter the accelerator or incubator that referred you")

    def _validate_demo_payload(self, payload: DemoBookingRequest) -> None:
        normalized_email = payload.customer_email.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", normalized_email):
            raise ValueError("Enter a valid email address")

        phone = (payload.customer_phone or "").strip()
        if phone:
            digits = re.sub(r"\D", "", phone)
            if len(digits) < 8:
                raise ValueError("Enter a valid phone number with at least 8 digits")

        try:
            zone = ZoneInfo(payload.timezone)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unsupported timezone for demo scheduling") from exc

        preferred_start = datetime.combine(payload.preferred_date, payload.preferred_time, tzinfo=zone)
        if preferred_start <= datetime.now(zone) + timedelta(minutes=30):
            raise ValueError("Choose a demo time at least 30 minutes from now")

    @staticmethod
    def _build_trial_summary(trial_days: int, startup_offer_applied: bool) -> str:
        if startup_offer_applied:
            return (
                "Subscription is free for the first 3 months when referred by an Australian accelerator or incubator, "
                "then the selected monthly plan starts."
            )
        return "Subscription is free for the first 30 days, then the selected monthly plan starts."

    @staticmethod
    def _build_onsite_travel_fee_note(onboarding_mode: str) -> str | None:
        if onboarding_mode != "onsite":
            return None
        return "Onsite setup is available. Travel is quoted separately once the address is confirmed."

    def zoho_calendar_configured(self) -> bool:
        return bool(
            self.settings.zoho_calendar_uid
            and (
                self.settings.zoho_calendar_access_token
                or (
                    self.settings.zoho_calendar_refresh_token
                    and self.settings.zoho_calendar_client_id
                    and self.settings.zoho_calendar_client_secret
                )
            )
        )

    async def create_consultation(
        self,
        payload: PricingConsultationRequest,
        *,
        email_service: "EmailService",
    ) -> PricingConsultationResponse:
        self._validate_payload(payload)
        plan = self._get_plan(payload.plan_id)
        consultation_reference = f"CONS-{uuid4().hex[:8].upper()}"
        startup_offer_applied = bool(payload.startup_referral_eligible and (payload.referral_partner or "").strip())
        trial_days = 90 if startup_offer_applied else 30
        trial_summary = self._build_trial_summary(trial_days, startup_offer_applied)
        onsite_travel_fee_note = self._build_onsite_travel_fee_note(payload.onboarding_mode)
        meeting_status = "configuration_required"
        meeting_join_url: str | None = None
        meeting_event_url: str | None = None

        if self.zoho_calendar_configured():
            meeting_join_url, meeting_event_url = await self._create_zoho_calendar_event(
                consultation_reference=consultation_reference,
                plan=plan,
                payload=payload,
            )
            meeting_status = "scheduled"

        payment_status = "payment_follow_up_required"
        payment_url: str | None = None
        if self.settings.stripe_secret_key:
            payment_url = await self._create_stripe_checkout_url(
                consultation_reference=consultation_reference,
                plan=plan,
                payload=payload,
            )
            payment_status = "stripe_checkout_ready"

        email_status = "pending_manual_followup"
        if email_service.smtp_configured():
            await email_service.send_email(
                to=[payload.customer_email],
                cc=[self.settings.booking_business_email],
                subject=f"BookedAI consultation booked for {plan.name} ({consultation_reference})",
                text=self._build_customer_confirmation_text(
                    consultation_reference=consultation_reference,
                    plan=plan,
                    payload=payload,
                    meeting_join_url=meeting_join_url,
                    meeting_event_url=meeting_event_url,
                    payment_url=payment_url,
                ),
            )
            await email_service.send_email(
                to=[self.settings.booking_business_email],
                subject=f"New pricing consultation for {plan.name} ({consultation_reference})",
                text=self._build_internal_notification_text(
                    consultation_reference=consultation_reference,
                    plan=plan,
                    payload=payload,
                    meeting_join_url=meeting_join_url,
                    meeting_event_url=meeting_event_url,
                    payment_url=payment_url,
                ),
            )
            email_status = "sent"

        return PricingConsultationResponse(
            status="ok",
            consultation_reference=consultation_reference,
            plan_id=plan.id,  # type: ignore[arg-type]
            plan_name=plan.name,
            amount_aud=plan.amount_aud,
            amount_label=self._format_amount(plan.amount_aud, plan.price_suffix),
            preferred_date=payload.preferred_date.isoformat(),
            preferred_time=payload.preferred_time.strftime("%H:%M"),
            timezone=payload.timezone,
            onboarding_mode=payload.onboarding_mode,  # type: ignore[arg-type]
            trial_days=trial_days,
            trial_summary=trial_summary,
            startup_offer_applied=startup_offer_applied,
            startup_offer_summary=trial_summary if startup_offer_applied else None,
            onsite_travel_fee_note=onsite_travel_fee_note,
            meeting_status=meeting_status,  # type: ignore[arg-type]
            meeting_join_url=meeting_join_url,
            meeting_event_url=meeting_event_url,
            payment_status=payment_status,  # type: ignore[arg-type]
            payment_url=payment_url,
            email_status=email_status,  # type: ignore[arg-type]
        )

    async def create_demo_request(
        self,
        payload: DemoBookingRequest,
        *,
        email_service: "EmailService",
    ) -> DemoBookingResponse:
        self._validate_demo_payload(payload)
        demo_reference = f"DEMO-{uuid4().hex[:8].upper()}"
        meeting_status = "configuration_required"
        meeting_join_url: str | None = None
        meeting_event_url: str | None = None

        if self.zoho_calendar_configured():
            meeting_join_url, meeting_event_url = await self._create_zoho_demo_event(
                demo_reference=demo_reference,
                payload=payload,
            )
            meeting_status = "scheduled"

        email_status = "pending_manual_followup"
        if email_service.smtp_configured():
            await email_service.send_email(
                to=[payload.customer_email],
                cc=[self.settings.booking_business_email],
                subject=f"BookedAI demo booked ({demo_reference})",
                text=self._build_demo_customer_confirmation_text(
                    demo_reference=demo_reference,
                    payload=payload,
                    meeting_join_url=meeting_join_url,
                    meeting_event_url=meeting_event_url,
                ),
            )
            await email_service.send_email(
                to=[self.settings.booking_business_email],
                subject=f"New BookedAI demo request ({demo_reference})",
                text=self._build_demo_internal_notification_text(
                    demo_reference=demo_reference,
                    payload=payload,
                    meeting_join_url=meeting_join_url,
                    meeting_event_url=meeting_event_url,
                ),
            )
            email_status = "sent"

        confirmation_message = (
            "Your demo request is confirmed. We have sent the invite details and added the session to our calendar."
            if meeting_status == "scheduled"
            else "Your demo request is captured. Our team will follow up shortly to confirm the meeting."
        )

        return DemoBookingResponse(
            status="ok",
            demo_reference=demo_reference,
            preferred_date=payload.preferred_date.isoformat(),
            preferred_time=payload.preferred_time.strftime("%H:%M"),
            timezone=payload.timezone,
            meeting_status=meeting_status,  # type: ignore[arg-type]
            meeting_join_url=meeting_join_url,
            meeting_event_url=meeting_event_url,
            email_status=email_status,  # type: ignore[arg-type]
            confirmation_message=confirmation_message,
        )

    def zoho_bookings_configured(self) -> bool:
        return bool(
            self.settings.zoho_bookings_api_base_url
            and (
                self.settings.zoho_bookings_access_token
                or (
                    self.settings.zoho_bookings_refresh_token
                    and self.settings.zoho_bookings_client_id
                    and self.settings.zoho_bookings_client_secret
                )
            )
        )

    async def fetch_recent_demo_booking(
        self,
        *,
        customer_email: str,
        customer_name: str | None,
        appointment_created_from: datetime,
        appointment_created_till: datetime | None = None,
    ) -> dict[str, Any] | None:
        if not self.zoho_bookings_configured():
            return None

        access_token = await self._get_zoho_bookings_access_token()
        bookings_url = (
            f"{self.settings.zoho_bookings_api_base_url.rstrip('/')}/fetchappointment"
        )
        created_till = appointment_created_till or datetime.utcnow() + timedelta(minutes=5)
        payload = {
            "customer_email": customer_email.strip().lower(),
            "appointment_created_from": appointment_created_from.strftime("%d-%b-%Y %H:%M:%S"),
            "appointment_created_till": created_till.strftime("%d-%b-%Y %H:%M:%S"),
            "need_customer_more_info": "true",
            "per_page": "20",
        }
        if customer_name and customer_name.strip():
            payload["customer_name"] = customer_name.strip()

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                bookings_url,
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
                data=payload,
            )
            response.raise_for_status()
            data = response.json()

        appointments = (
            ((data.get("response") or {}).get("returnvalue") or {}).get("response") or []
        )
        if not isinstance(appointments, list):
            return None

        normalized_email = customer_email.strip().lower()
        normalized_name = (customer_name or "").strip().lower()

        def parse_booked_on(value: str) -> datetime:
            try:
                return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return datetime.min

        matched: list[dict[str, Any]] = []
        for item in appointments:
            if not isinstance(item, dict):
                continue
            email = str(item.get("customer_email") or "").strip().lower()
            if email != normalized_email:
                continue
            if normalized_name:
                name = str(item.get("customer_name") or "").strip().lower()
                if normalized_name not in name and name not in normalized_name:
                    continue
            matched.append(item)

        if not matched:
            return None

        matched.sort(key=lambda item: parse_booked_on(str(item.get("booked_on") or "")), reverse=True)
        return matched[0]

    async def _get_zoho_access_token(self) -> str:
        direct_token = self.settings.zoho_calendar_access_token.strip()
        if direct_token:
            return direct_token

        if not (
            self.settings.zoho_calendar_refresh_token
            and self.settings.zoho_calendar_client_id
            and self.settings.zoho_calendar_client_secret
        ):
            raise ValueError("Zoho Calendar OAuth credentials are incomplete")

        token_url = (
            f"{self.settings.zoho_accounts_base_url.rstrip('/')}/oauth/v2/token"
        )
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                token_url,
                data={
                    "refresh_token": self.settings.zoho_calendar_refresh_token,
                    "client_id": self.settings.zoho_calendar_client_id,
                    "client_secret": self.settings.zoho_calendar_client_secret,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            payload = response.json()

        access_token = str(payload.get("access_token") or "").strip()
        if not access_token:
            raise ValueError("Zoho OAuth response did not include an access token")
        return access_token

    async def _get_zoho_bookings_access_token(self) -> str:
        direct_token = self.settings.zoho_bookings_access_token.strip()
        if direct_token:
            return direct_token

        if not (
            self.settings.zoho_bookings_refresh_token
            and self.settings.zoho_bookings_client_id
            and self.settings.zoho_bookings_client_secret
        ):
            raise ValueError("Zoho Bookings OAuth credentials are incomplete")

        token_url = (
            f"{self.settings.zoho_accounts_base_url.rstrip('/')}/oauth/v2/token"
        )
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                token_url,
                data={
                    "refresh_token": self.settings.zoho_bookings_refresh_token,
                    "client_id": self.settings.zoho_bookings_client_id,
                    "client_secret": self.settings.zoho_bookings_client_secret,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            payload = response.json()

        access_token = str(payload.get("access_token") or "").strip()
        if not access_token:
            raise ValueError("Zoho OAuth response did not include a Bookings access token")
        return access_token

    async def _create_zoho_calendar_event(
        self,
        *,
        consultation_reference: str,
        plan: PricingPlanDefinition,
        payload: PricingConsultationRequest,
    ) -> tuple[str | None, str | None]:
        access_token = await self._get_zoho_access_token()
        zone = ZoneInfo(payload.timezone)
        start_at = datetime.combine(payload.preferred_date, payload.preferred_time, tzinfo=zone)
        end_at = start_at + timedelta(minutes=plan.consultation_minutes)
        description_lines = [
            f"BookedAI onboarding booking for the {plan.name} plan.",
            f"Consultation reference: {consultation_reference}",
            f"Business: {payload.business_name}",
            f"Business type: {payload.business_type}",
            f"Setup mode: {payload.onboarding_mode}",
            f"Customer: {payload.customer_name}",
            f"Email: {payload.customer_email.strip().lower()}",
            f"Phone: {(payload.customer_phone or '').strip() or 'Not provided'}",
        ]
        if payload.startup_referral_eligible:
            description_lines.append(
                f"Startup referral: {(payload.referral_partner or '').strip() or 'Referral requested'}"
            )
        if payload.referral_location:
            description_lines.append(f"Referral location: {payload.referral_location.strip()}")
        travel_fee_note = self._build_onsite_travel_fee_note(payload.onboarding_mode)
        if travel_fee_note:
            description_lines.append(travel_fee_note)
        if payload.notes:
            description_lines.append(f"Notes: {payload.notes.strip()}")

        event_data = {
            "title": f"BookedAI {plan.onboarding_label} - {payload.business_name}",
            "location": payload.onboarding_mode == "onsite" and "Onsite setup" or "Zoho Meeting",
            "description": "\n".join(description_lines),
            "dateandtime": {
                "timezone": payload.timezone,
                "start": start_at.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ"),
                "end": end_at.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ"),
            },
            "attendees": [
                {
                    "email": payload.customer_email.strip().lower(),
                    "permission": 1,
                    "attendance": 1,
                }
            ],
            "reminders": [
                {"action": "email", "minutes": 60},
                {"action": "popup", "minutes": 15},
            ],
            "notify_attendee": 2,
            "conference": "zmeeting",
            "allowForwarding": True,
            "notifyType": 1,
        }
        encoded_event_data = quote(json.dumps(event_data, separators=(",", ":")), safe="")
        calendar_url = (
            f"{self.settings.zoho_calendar_api_base_url.rstrip('/')}/calendars/"
            f"{self.settings.zoho_calendar_uid}/events?eventdata={encoded_event_data}"
        )

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                calendar_url,
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
            )
            response.raise_for_status()
            payload_data = response.json()

        event = ((payload_data.get("events") or [None])[0] or {}) if isinstance(payload_data, dict) else {}
        app_data = event.get("app_data") if isinstance(event.get("app_data"), dict) else {}
        meeting_data = app_data.get("meetingdata") if isinstance(app_data.get("meetingdata"), dict) else {}
        meeting_link = str(meeting_data.get("meetinglink") or "").strip() or None
        event_url = str(event.get("viewEventURL") or "").strip() or None
        return meeting_link, event_url

    async def _create_zoho_demo_event(
        self,
        *,
        demo_reference: str,
        payload: DemoBookingRequest,
    ) -> tuple[str | None, str | None]:
        access_token = await self._get_zoho_access_token()
        zone = ZoneInfo(payload.timezone)
        start_at = datetime.combine(payload.preferred_date, payload.preferred_time, tzinfo=zone)
        end_at = start_at + timedelta(minutes=30)
        description_lines = [
            "BookedAI live product demo.",
            f"Demo reference: {demo_reference}",
            f"Business: {payload.business_name}",
            f"Business type: {payload.business_type}",
            f"Customer: {payload.customer_name}",
            f"Email: {payload.customer_email.strip().lower()}",
            f"Phone: {(payload.customer_phone or '').strip() or 'Not provided'}",
        ]
        if payload.notes:
            description_lines.append(f"Notes: {payload.notes.strip()}")

        event_data = {
            "title": f"BookedAI demo - {payload.business_name}",
            "location": "Zoho Meeting",
            "description": "\n".join(description_lines),
            "dateandtime": {
                "timezone": payload.timezone,
                "start": start_at.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ"),
                "end": end_at.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ"),
            },
            "attendees": [
                {
                    "email": payload.customer_email.strip().lower(),
                    "permission": 1,
                    "attendance": 1,
                }
            ],
            "reminders": [
                {"action": "email", "minutes": 60},
                {"action": "popup", "minutes": 15},
            ],
            "notify_attendee": 2,
            "conference": "zmeeting",
            "allowForwarding": True,
            "notifyType": 1,
        }
        encoded_event_data = quote(json.dumps(event_data, separators=(",", ":")), safe="")
        calendar_url = (
            f"{self.settings.zoho_calendar_api_base_url.rstrip('/')}/calendars/"
            f"{self.settings.zoho_calendar_uid}/events?eventdata={encoded_event_data}"
        )

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                calendar_url,
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
            )
            response.raise_for_status()
            payload_data = response.json()

        event = ((payload_data.get("events") or [None])[0] or {}) if isinstance(payload_data, dict) else {}
        app_data = event.get("app_data") if isinstance(event.get("app_data"), dict) else {}
        meeting_data = app_data.get("meetingdata") if isinstance(app_data.get("meetingdata"), dict) else {}
        meeting_link = str(meeting_data.get("meetinglink") or "").strip() or None
        event_url = str(event.get("viewEventURL") or "").strip() or None
        return meeting_link, event_url

    async def _create_stripe_checkout_url(
        self,
        *,
        consultation_reference: str,
        plan: PricingPlanDefinition,
        payload: PricingConsultationRequest,
    ) -> str:
        amount_cents = int(round(plan.amount_aud * 100))
        form_data: list[tuple[str, str]] = [
            ("mode", "subscription"),
            (
                "success_url",
                f"{self.settings.public_app_url}/?pricing=success&plan={plan.id}&ref={consultation_reference}",
            ),
            (
                "cancel_url",
                f"{self.settings.public_app_url}/?pricing=cancelled&plan={plan.id}&ref={consultation_reference}",
            ),
            ("payment_method_types[]", "card"),
            ("line_items[0][quantity]", "1"),
            ("line_items[0][price_data][currency]", self.settings.stripe_currency),
            ("line_items[0][price_data][unit_amount]", str(amount_cents)),
            ("line_items[0][price_data][recurring][interval]", "month"),
            ("line_items[0][price_data][product_data][name]", f"BookedAI {plan.name}"),
            ("line_items[0][price_data][product_data][description]", plan.description),
            ("client_reference_id", consultation_reference),
            ("metadata[consultation_reference]", consultation_reference),
            ("metadata[plan_id]", plan.id),
            ("metadata[plan_name]", plan.name),
            ("metadata[business_name]", payload.business_name),
            ("metadata[business_type]", payload.business_type),
            ("metadata[onboarding_mode]", payload.onboarding_mode),
            ("metadata[trial_days]", str(90 if bool(payload.startup_referral_eligible and (payload.referral_partner or "").strip()) else 30)),
            ("metadata[preferred_date]", payload.preferred_date.isoformat()),
            ("metadata[preferred_time]", payload.preferred_time.strftime("%H:%M")),
            ("metadata[timezone]", payload.timezone),
            ("subscription_data[metadata][consultation_reference]", consultation_reference),
            ("subscription_data[metadata][plan_id]", plan.id),
            ("subscription_data[trial_period_days]", str(90 if bool(payload.startup_referral_eligible and (payload.referral_partner or "").strip()) else 30)),
        ]
        if payload.source_page:
            form_data.append(("metadata[source_page]", payload.source_page.strip()))
        if payload.source_section:
            form_data.append(("metadata[source_section]", payload.source_section.strip()))
        if payload.source_cta:
            form_data.append(("metadata[source_cta]", payload.source_cta.strip()))
        if payload.source_plan_id:
            form_data.append(("metadata[source_plan_id]", payload.source_plan_id.strip()))
        if payload.source_flow_mode:
            form_data.append(("metadata[source_flow_mode]", payload.source_flow_mode.strip()))
        if payload.source_path:
            form_data.append(("metadata[source_path]", payload.source_path.strip()))
        if payload.referral_partner:
            form_data.append(("metadata[referral_partner]", payload.referral_partner.strip()))
        if payload.referral_location:
            form_data.append(("metadata[referral_location]", payload.referral_location.strip()))
        normalized_email = payload.customer_email.strip().lower()
        if normalized_email:
            form_data.append(("customer_email", normalized_email))

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
            response_data = response.json()

        checkout_url = str(response_data.get("url") or "").strip()
        if not checkout_url:
            raise ValueError("Stripe response did not include a checkout URL")
        return checkout_url

    def _build_customer_confirmation_text(
        self,
        *,
        consultation_reference: str,
        plan: PricingPlanDefinition,
        payload: PricingConsultationRequest,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
        payment_url: str | None,
    ) -> str:
        lines = [
            f"Thanks for booking BookedAI {plan.name}.",
            "",
            f"Consultation reference: {consultation_reference}",
            f"Plan: {plan.name} ({self._format_amount(plan.amount_aud, plan.price_suffix)})",
            f"Offer: {self._build_trial_summary(90 if bool(payload.startup_referral_eligible and (payload.referral_partner or '').strip()) else 30, bool(payload.startup_referral_eligible and (payload.referral_partner or '').strip()))}",
            f"Business: {payload.business_name}",
            f"Business type: {payload.business_type}",
            f"Setup mode: {payload.onboarding_mode}",
            f"Preferred time: {payload.preferred_date.isoformat()} {payload.preferred_time.strftime('%H:%M')} {payload.timezone}",
        ]
        if payload.referral_partner:
            lines.append(f"Referral partner: {payload.referral_partner.strip()}")
        if payload.referral_location:
            lines.append(f"Referral location: {payload.referral_location.strip()}")
        if payload.source_section or payload.source_cta:
            lines.append(
                f"Source: {(payload.source_section or 'unknown')} / {(payload.source_cta or 'unknown')}"
            )
        travel_fee_note = self._build_onsite_travel_fee_note(payload.onboarding_mode)
        if travel_fee_note:
            lines.append(travel_fee_note)
        if meeting_join_url:
            lines.extend(["", f"Zoho meeting link: {meeting_join_url}"])
        if meeting_event_url:
            lines.append(f"Zoho calendar event: {meeting_event_url}")
        if payment_url:
            lines.extend(["", f"Stripe checkout: {payment_url}"])
        if payload.notes:
            lines.extend(["", f"Notes: {payload.notes.strip()}"])
        lines.extend(
            [
                "",
                "A confirmation copy has also been sent to info@bookedai.au.",
            ]
        )
        return "\n".join(lines)

    def _build_internal_notification_text(
        self,
        *,
        consultation_reference: str,
        plan: PricingPlanDefinition,
        payload: PricingConsultationRequest,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
        payment_url: str | None,
    ) -> str:
        lines = [
            "New BookedAI plan onboarding booking received.",
            "",
            f"Reference: {consultation_reference}",
            f"Plan: {plan.name}",
            f"Customer: {payload.customer_name}",
            f"Email: {payload.customer_email.strip().lower()}",
            f"Phone: {(payload.customer_phone or '').strip() or 'Not provided'}",
            f"Business: {payload.business_name}",
            f"Business type: {payload.business_type}",
            f"Setup mode: {payload.onboarding_mode}",
            f"Preferred time: {payload.preferred_date.isoformat()} {payload.preferred_time.strftime('%H:%M')} {payload.timezone}",
        ]
        if payload.referral_partner:
            lines.append(f"Referral partner: {payload.referral_partner.strip()}")
        if payload.referral_location:
            lines.append(f"Referral location: {payload.referral_location.strip()}")
        if payload.source_section or payload.source_cta:
            lines.append(
                f"Source: {(payload.source_section or 'unknown')} / {(payload.source_cta or 'unknown')}"
            )
        if payload.source_path:
            lines.append(f"Source path: {payload.source_path}")
        travel_fee_note = self._build_onsite_travel_fee_note(payload.onboarding_mode)
        if travel_fee_note:
            lines.append(travel_fee_note)
        if meeting_join_url:
            lines.append(f"Zoho meeting link: {meeting_join_url}")
        if meeting_event_url:
            lines.append(f"Zoho calendar event: {meeting_event_url}")
        if payment_url:
            lines.append(f"Stripe checkout: {payment_url}")
        if payload.notes:
            lines.append(f"Notes: {payload.notes.strip()}")
        return "\n".join(lines)

    def _build_demo_customer_confirmation_text(
        self,
        *,
        demo_reference: str,
        payload: DemoBookingRequest,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
    ) -> str:
        lines = [
            "Thanks for booking a BookedAI live demo.",
            "",
            f"Demo reference: {demo_reference}",
            f"Business: {payload.business_name}",
            f"Business type: {payload.business_type}",
            f"Preferred time: {payload.preferred_date.isoformat()} {payload.preferred_time.strftime('%H:%M')} {payload.timezone}",
        ]
        if meeting_join_url:
            lines.extend(["", f"Zoho meeting link: {meeting_join_url}"])
        if meeting_event_url:
            lines.append(f"Zoho calendar event: {meeting_event_url}")
        if payload.notes:
            lines.extend(["", f"Notes: {payload.notes.strip()}"])
        lines.extend(["", "A confirmation copy has also been sent to info@bookedai.au."])
        return "\n".join(lines)

    def _build_demo_internal_notification_text(
        self,
        *,
        demo_reference: str,
        payload: DemoBookingRequest,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
    ) -> str:
        lines = [
            "New BookedAI demo request received.",
            "",
            f"Reference: {demo_reference}",
            f"Customer: {payload.customer_name}",
            f"Email: {payload.customer_email.strip().lower()}",
            f"Phone: {(payload.customer_phone or '').strip() or 'Not provided'}",
            f"Business: {payload.business_name}",
            f"Business type: {payload.business_type}",
            f"Preferred time: {payload.preferred_date.isoformat()} {payload.preferred_time.strftime('%H:%M')} {payload.timezone}",
        ]
        if payload.source_section or payload.source_cta:
            lines.append(
                f"Source: {(payload.source_section or 'unknown')} / {(payload.source_cta or 'unknown')}"
            )
        if payload.source_path:
            lines.append(f"Source path: {payload.source_path}")
        if meeting_join_url:
            lines.append(f"Zoho meeting link: {meeting_join_url}")
        if meeting_event_url:
            lines.append(f"Zoho calendar event: {meeting_event_url}")
        if payload.notes:
            lines.append(f"Notes: {payload.notes.strip()}")
        return "\n".join(lines)
