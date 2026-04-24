from __future__ import annotations

from dataclasses import dataclass
import asyncio
import hashlib
import hmac
import json
import logging
import os
import re
import time
import unicodedata
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlparse
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
from service_layer.booking_assistant_runtime import (
    ServiceMatchInsight,
    _build_clarification_prompt,
    _build_effective_query,
    _curate_event_matches,
    _curate_service_matches,
    _filter_service_shortlist_for_category_intent,
    _match_services,
    _rank_services,
    _service_search_text,
    _should_match_services,
    _should_request_location,
)
from service_layer.calls_scheduling import (
    build_customer_portal_url,
    build_google_calendar_url,
    build_qr_code_url,
    create_zoho_calendar_event,
    format_amount,
    get_zoho_access_token,
    zoho_calendar_configured,
)
from service_layer.catalog_assets import resolve_service_image_url
from service_layer.email_service import EmailService
from service_layer.event_store import store_event
from service_layer.geo_utils import (
    _build_geocode_query,
    _build_google_maps_url,
    _build_map_snapshot_url,
    _geocode_place_query,
    _haversine_km,
)
from service_layer.followup_copy import (
    build_booking_customer_confirmation_text,
    build_booking_internal_notification_text,
    build_consultation_customer_confirmation_text,
    build_consultation_internal_notification_text,
    build_demo_customer_confirmation_text,
    build_demo_internal_notification_text,
    build_manual_followup_url,
)
from service_layer.n8n_service import N8NService
from service_layer.service_query_parsing import (
    CATEGORY_KEYWORDS,
    FOLLOW_UP_CONTEXT_TOKENS,
    SERVICE_KEYWORD_SYNONYMS,
    ServiceQuerySignals,
    _extract_service_query_signals,
    _merge_service_query_signals,
    tokenize_text,
)
from service_layer.website_import_utils import (
    _ImageExtractor,
    _LinkExtractor,
    _as_text_list,
    _coerce_price,
    _discover_product_pages,
    _discover_related_pages,
    _extract_business_context_from_html_pages,
    _extract_json_ld_objects,
    _extract_preferred_image_from_html,
    _extract_price_from_html,
    _extract_search_result_urls,
    _extract_structured_services_from_html_pages,
    _extract_visible_text_from_html,
    _flatten_json_ld,
    _looks_like_real_image_asset,
    _looks_like_url,
    _resolve_imported_service_image,
    _truncate_summary,
)


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AIProviderConfig:
    label: str
    api_key: str
    base_url: str
    model: str
    provider_name: str = "compatible"

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


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.lower())
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "item"







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


def _normalize_contact_phone(value: Any) -> str | None:
    normalized = str(value or "").strip()
    if not normalized or not PHONE_PATTERN.match(normalized):
        return None
    digits_only = re.sub(r"\D", "", normalized)
    if len(digits_only) < 8:
        return None
    return normalized
AI_EVENT_DISCOVERY_KEYWORDS = {
    "event",
    "events",
    "meetup",
    "workshop",
    "hackathon",
    "summit",
    "conference",
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
AI_EVENT_TOPIC_KEYWORDS = {
    "ai",
    "artificial",
    "intelligence",
    "wsti",
    "western",
    "startup",
    "startups",
    "innovators",
    "westernsydney",
    "startuphub",
    "spacecubed",
}
WSTI_KEYWORDS = {
    "wsti",
    "western",
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
    RETRYABLE_STATUS_CODES = {408, 409, 425, 429, 500, 502, 503, 504}

    @staticmethod
    def _is_hospitality_booking_query(
        query: str,
        preferences: dict[str, Any] | None = None,
    ) -> bool:
        normalized_query = " ".join((query or "").strip().lower().split())
        if not normalized_query:
            return False

        category = str((preferences or {}).get("service_category") or "").strip().lower()
        hospitality_terms = {
            "restaurant",
            "dining",
            "dinner",
            "lunch",
            "table",
            "reservation",
            "book a table",
            "private dining",
            "team dinner",
            "group dinner",
            "party dinner",
            "hospitality",
        }
        if any(term in normalized_query for term in hospitality_terms):
            return True
        return category in {"food and beverage", "hospitality and events", "restaurant"}

    @classmethod
    def _build_public_web_fallback_prompt(
        cls,
        *,
        query: str,
        preferences: dict[str, Any] | None = None,
        hospitality_retry: bool = False,
    ) -> str:
        prompt = (
            "You are BookedAI's public web fallback search assistant for Australian services. "
            "Use web search to find real service options only when tenant catalog results are absent or not relevant enough. "
            "Prioritize official provider websites and real booking pages over directories or generic aggregator pages. "
            "Return only options that closely match the user's current request, location intent, time intent, and booking constraints. "
            "A result must not be returned if it only matches the city but not the requested service. "
            "If time, party size, budget, or other booking constraints are present, use them as hard relevance inputs. "
            "If the query is weakly matched on the web, return an empty results list instead of broad or wrong-domain options."
        )
        if cls._is_hospitality_booking_query(query, preferences):
            prompt += (
                " For restaurant, private dining, and hospitality booking queries, search specifically for named venues that have a real reservation flow. "
                "Do not stop at generic city dining pages if a venue-level booking path exists. "
                "Reputable live-booking platforms are acceptable when they lead directly to a real reservation flow for the requested venue or table booking. "
                "Examples of acceptable booking platforms include OpenTable, SevenRooms, Quandoo, Tock, and Resy when they provide a direct book-now path for the actual venue. "
                "Prefer venues that clearly support dinner service, table bookings, private dining, or group dining for the requested party size. "
                "If you can find even one strong venue-level reservation option that fits the request, return it instead of an empty list."
            )
            if hospitality_retry:
                prompt += (
                    " This is a hospitality rescue pass because the first search returned no strong venue-level options. "
                    "Actively search for named venues with 'book now', 'reservations', 'private dining', 'group dining', or 'book a table' flows in the requested location. "
                    "Prefer venue-owned booking pages first, but do not miss strong reservation-platform links when they lead directly to a specific venue booking flow."
                )
        return prompt

    @staticmethod
    def _build_public_web_fallback_user_payload(
        *,
        query: str,
        location_hint: str | None,
        user_location: dict[str, Any] | None,
        booking_context: dict[str, Any] | None,
        budget: dict[str, Any] | None,
        preferences: dict[str, Any] | None,
        hospitality_retry: bool,
    ) -> dict[str, Any]:
        payload = {
            "query": query,
            "location_hint": location_hint,
            "user_location": user_location,
            "booking_context": booking_context,
            "budget": budget,
            "preferences": preferences,
            "country": "AU",
        }
        if hospitality_retry:
            party_size = (booking_context or {}).get("party_size")
            schedule_hint = str((booking_context or {}).get("schedule_hint") or "").strip() or None
            payload["search_focus"] = {
                "mode": "hospitality_rescue_pass",
                "goal": "Find named venues with a real reservation flow before returning an empty result.",
                "preferred_signals": [
                    "book now",
                    "book a table",
                    "reservations",
                    "private dining",
                    "group dining",
                    "venue booking page",
                ],
                "party_size": party_size,
                "schedule_hint": schedule_hint,
            }
        return payload

    def _normalize_public_web_results(
        self,
        *,
        results: list[Any],
        location_hint: str | None,
        booking_context: dict[str, Any] | None,
        budget: dict[str, Any] | None,
        preferences: dict[str, Any] | None,
        hospitality_search_mode: bool,
        hospitality_retry: bool,
    ) -> list[dict[str, Any]]:
        normalized_results: list[dict[str, Any]] = []
        requested_time = str((booking_context or {}).get("requested_time") or "").strip()
        schedule_hint = str((booking_context or {}).get("schedule_hint") or "").strip()
        party_size = (booking_context or {}).get("party_size")
        has_time_constraint = bool(requested_time or schedule_hint)
        has_party_size_constraint = bool(isinstance(party_size, int) and party_size > 0)
        has_budget_constraint = bool(budget)
        has_category_preference = bool(str((preferences or {}).get("service_category") or "").strip())
        minimum_match_score = 0.62 if hospitality_search_mode and hospitality_retry else 0.68
        minimum_location_relevance = 0.5 if hospitality_search_mode and hospitality_retry else 0.58
        minimum_time_relevance = 0.4 if hospitality_search_mode and hospitality_retry else 0.45
        minimum_constraint_relevance = 0.4 if hospitality_search_mode and hospitality_retry else 0.45

        for item in results:
            if not isinstance(item, dict):
                continue
            source_url = str(item.get("source_url") or "").strip()
            if not source_url:
                continue
            try:
                match_score = max(0.0, min(float(item.get("match_score") or 0.0), 1.0))
                service_relevance = max(0.0, min(float(item.get("service_relevance") or 0.0), 1.0))
                location_relevance = max(0.0, min(float(item.get("location_relevance") or 0.0), 1.0))
                time_relevance = max(0.0, min(float(item.get("time_relevance") or 0.0), 1.0))
                constraint_relevance = max(0.0, min(float(item.get("constraint_relevance") or 0.0), 1.0))
            except (TypeError, ValueError):
                continue

            official_source = bool(item.get("official_source"))
            if service_relevance < 0.72:
                continue
            if location_hint and location_relevance < minimum_location_relevance:
                continue
            if has_time_constraint and time_relevance < minimum_time_relevance:
                continue
            if (
                has_budget_constraint or has_party_size_constraint or has_category_preference
            ) and constraint_relevance < minimum_constraint_relevance:
                continue
            if match_score < minimum_match_score:
                continue
            if not official_source and not str(item.get("booking_url") or "").strip():
                continue

            normalized_results.append(
                {
                    "candidate_id": str(item.get("candidate_id") or "").strip() or f"web_{len(normalized_results) + 1}",
                    "provider_name": str(item.get("provider_name") or "").strip() or "Web result",
                    "service_name": str(item.get("service_name") or "").strip() or "Service option",
                    "summary": str(item.get("summary") or "").strip() or None,
                    "location": str(item.get("location") or "").strip() or None,
                    "source_url": source_url,
                    "booking_url": str(item.get("booking_url") or "").strip() or None,
                    "contact_phone": _normalize_contact_phone(item.get("contact_phone")),
                    "match_score": match_score,
                    "service_relevance": service_relevance,
                    "location_relevance": location_relevance,
                    "time_relevance": time_relevance,
                    "constraint_relevance": constraint_relevance,
                    "official_source": official_source,
                    "why_this_matches": str(item.get("why_this_matches") or "").strip() or None,
                }
            )

        normalized_results.sort(
            key=lambda item: (
                float(item.get("match_score") or 0.0),
                float(item.get("service_relevance") or 0.0),
                float(item.get("location_relevance") or 0.0),
                float(item.get("time_relevance") or 0.0),
                float(item.get("constraint_relevance") or 0.0),
                1 if item.get("booking_url") else 0,
                1 if item.get("contact_phone") else 0,
                1 if item.get("official_source") else 0,
            ),
            reverse=True,
        )
        return normalized_results[:3]

    async def search_public_service_candidates(
        self,
        *,
        query: str,
        location_hint: str | None = None,
        user_location: dict[str, Any] | None = None,
        booking_context: dict[str, Any] | None = None,
        budget: dict[str, Any] | None = None,
        preferences: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        normalized_query = query.strip()
        if not normalized_query:
            return []
        if not self.settings.openai_api_key.strip():
            return []
        if "api.openai.com" not in self.settings.openai_base_url:
            return []

        hospitality_search_mode = self._is_hospitality_booking_query(normalized_query, preferences)
        schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "results": {
                    "type": "array",
                    "maxItems": 5,
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "candidate_id": {"type": "string"},
                            "provider_name": {"type": "string"},
                            "service_name": {"type": "string"},
                            "summary": {"type": ["string", "null"]},
                            "location": {"type": ["string", "null"]},
                            "source_url": {"type": "string"},
                            "booking_url": {"type": ["string", "null"]},
                            "contact_phone": {"type": ["string", "null"]},
                            "match_score": {"type": "number", "minimum": 0, "maximum": 1},
                            "service_relevance": {"type": "number", "minimum": 0, "maximum": 1},
                            "location_relevance": {"type": "number", "minimum": 0, "maximum": 1},
                            "time_relevance": {"type": "number", "minimum": 0, "maximum": 1},
                            "constraint_relevance": {"type": "number", "minimum": 0, "maximum": 1},
                            "official_source": {"type": "boolean"},
                            "why_this_matches": {"type": ["string", "null"]},
                        },
                        "required": [
                            "candidate_id",
                            "provider_name",
                            "service_name",
                            "summary",
                            "location",
                            "source_url",
                            "booking_url",
                            "contact_phone",
                            "match_score",
                            "service_relevance",
                            "location_relevance",
                            "time_relevance",
                            "constraint_relevance",
                            "official_source",
                            "why_this_matches",
                        ],
                    },
                }
            },
            "required": ["results"],
        }

        endpoint = f"{self.settings.openai_base_url.rstrip('/')}/responses"
        attempt_flags = [False]
        if hospitality_search_mode:
            attempt_flags.append(True)

        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.settings.openai_timeout_seconds) as client:
            for hospitality_retry in attempt_flags:
                prompt = self._build_public_web_fallback_prompt(
                    query=normalized_query,
                    preferences=preferences,
                    hospitality_retry=hospitality_retry,
                )
                request_payload: dict[str, Any] = {
                    "model": self.settings.openai_model.strip() or "gpt-5-mini",
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
                                    "text": json.dumps(
                                        self._build_public_web_fallback_user_payload(
                                            query=normalized_query,
                                            location_hint=location_hint,
                                            user_location=user_location,
                                            booking_context=booking_context,
                                            budget=budget,
                                            preferences=preferences,
                                            hospitality_retry=hospitality_retry,
                                        )
                                    ),
                                }
                            ],
                        },
                    ],
                    "tools": [
                        {
                            "type": "web_search",
                            "search_context_size": "medium" if hospitality_search_mode else "low",
                            "user_location": {
                                "type": "approximate",
                                "country": "AU",
                                **({"city": location_hint} if location_hint else {}),
                            },
                        }
                    ],
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": "public_web_service_search",
                            "schema": schema,
                            "strict": True,
                        }
                    },
                    "reasoning": {"effort": "low"},
                }
                attempt_headers = {
                    **headers,
                    "X-Client-Request-Id": f"bookedai-public-web-{uuid4().hex}",
                }

                try:
                    response = await client.post(
                        endpoint,
                        headers=attempt_headers,
                        json=request_payload,
                    )
                    response.raise_for_status()
                    data = response.json()
                except httpx.HTTPStatusError as error:
                    response = error.response
                    logger.warning(
                        "openai_public_web_search_http_error",
                        extra={
                            "status_code": response.status_code if response is not None else None,
                            "x_request_id": response.headers.get("x-request-id") if response is not None else None,
                            "response_body": (response.text[:1000] if response is not None else ""),
                            "query": normalized_query[:160],
                            "location_hint": (location_hint or "")[:80],
                            "hospitality_retry": hospitality_retry,
                        },
                    )
                    continue
                except httpx.HTTPError as error:
                    logger.warning(
                        "openai_public_web_search_transport_error",
                        extra={
                            "error_type": type(error).__name__,
                            "error_message": str(error)[:500],
                            "query": normalized_query[:160],
                            "location_hint": (location_hint or "")[:80],
                            "hospitality_retry": hospitality_retry,
                        },
                    )
                    continue

                output_text = self._extract_openai_output_text(data)
                if not output_text:
                    continue

                try:
                    parsed = json.loads(output_text)
                except json.JSONDecodeError:
                    continue

                results = parsed.get("results")
                if not isinstance(results, list):
                    continue

                normalized_results = self._normalize_public_web_results(
                    results=results,
                    location_hint=location_hint,
                    booking_context=booking_context,
                    budget=budget,
                    preferences=preferences,
                    hospitality_search_mode=hospitality_search_mode,
                    hospitality_retry=hospitality_retry,
                )
                if normalized_results:
                    return normalized_results

        return []

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

    async def booking_assistant_streaming_reply(
        self,
        *,
        message: str,
        conversation: list[BookingAssistantChatMessage],
        services: list[ServiceCatalogItem],
    ):
        """Async generator yielding SSE-ready strings for streaming chat reply.

        Yields strings in the form 'data: {...}\\n\\n' for each token, then a
        final 'data: {"type":"done"}\\n\\n' sentinel.
        Falls back silently on configuration or network errors.
        """
        if not self.is_configured():
            yield f"data: {json.dumps({'type': 'token', 'text': 'I can help you find and book services. What are you looking for today?'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'matched_service_ids': []})}\n\n"
            return

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
        system_prompt = (
            "You are BookedAI, a premium booking and discovery assistant for bookedai.au. "
            "Answer like an experienced front-desk consultant. Recommend only services that exist in the catalog. "
            "Keep the tone concise, polished, and decision-oriented. Lead with the strongest recommendation, "
            "then briefly explain why it fits. Mention price, duration, venue, or timing when they help the user decide. "
            "End with one concrete next step. If the user is vague, ask one clarifying question while still offering the closest options. "
            "The user may write in English or Vietnamese. Reply in the user's language when clear. "
            "Do not invent services, locations, or prices. Avoid filler, hype, or long paragraphs. "
            f"Available service catalog: {json.dumps(service_catalog)}"
        )
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_payload)
        messages.append({"role": "user", "content": message})

        providers = self._provider_configs()
        if not providers:
            yield f"data: {json.dumps({'type': 'done', 'matched_service_ids': []})}\n\n"
            return

        request_payload = {
            "messages": messages,
            "stream": True,
            "max_tokens": 400,
        }

        collected_text = ""
        last_error: Exception | None = None
        for provider in providers:
            chat_completions_url = f"{provider.base_url.rstrip('/')}/chat/completions"
            headers = {
                "Authorization": f"Bearer {provider.api_key}",
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
            }
            try:
                async with httpx.AsyncClient(timeout=self.settings.openai_timeout_seconds) as client:
                    self._mark_provider_used(provider)
                    async with client.stream(
                        "POST",
                        chat_completions_url,
                        headers=headers,
                        json={**request_payload, "model": provider.model},
                    ) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            chunk_data = line[6:]
                            if chunk_data.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(chunk_data)
                            except json.JSONDecodeError:
                                continue
                            delta_content = (
                                chunk.get("choices", [{}])[0]
                                .get("delta", {})
                                .get("content")
                            )
                            if delta_content:
                                collected_text += delta_content
                                yield f"data: {json.dumps({'type': 'token', 'text': delta_content})}\n\n"
                break
            except httpx.HTTPStatusError as exc:
                retryable = exc.response.status_code in self.RETRYABLE_STATUS_CODES
                self._mark_provider_failure(provider, retryable=retryable)
                last_error = exc
                continue
            except httpx.HTTPError as exc:
                self._mark_provider_failure(provider, retryable=True)
                last_error = exc
                continue
            except Exception as exc:
                self._mark_provider_failure(provider, retryable=True)
                last_error = exc
                continue

        if not collected_text and last_error is not None:
            logger.warning("streaming_reply_error: %s", last_error)
            fallback = "I can help you find and book the right service. What are you looking for today?"
            yield f"data: {json.dumps({'type': 'token', 'text': fallback})}\n\n"

        yield f"data: {json.dumps({'type': 'done', 'matched_service_ids': []})}\n\n"

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
        search_focus: str | None = None,
        required_fields: list[str] | None = None,
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
            "If a value is not clear, return null instead of guessing wildly. "
            "Prioritize fields that directly affect booking and search quality."
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
                            "currency_code": {"type": ["string", "null"]},
                            "display_price": {"type": ["string", "null"]},
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
                            "currency_code",
                            "display_price",
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
                    "search_focus": search_focus,
                    "required_fields": required_fields or [],
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
        groq_primary_keys = self._parse_api_keys(os.getenv("GROQ_API_KEYS", ""))
        groq_fallback_keys = self._parse_api_keys(os.getenv("GROQ_FALLBACK_API_KEYS", ""))
        groq_base_url = os.getenv("GROQ_BASE_URL", "").strip() or "https://api.groq.com/openai/v1"
        groq_model = os.getenv("GROQ_MODEL", "").strip() or self.settings.ai_model

        providers.extend(
            self._build_provider_configs(
                label="groq-primary",
                provider_name="groq",
                api_keys=groq_primary_keys,
                base_url=groq_base_url,
                model=groq_model,
            )
        )
        providers.extend(
            self._build_provider_configs(
                label="primary",
                provider_name=self.settings.ai_provider or "primary",
                api_keys=self._parse_api_keys(self.settings.ai_api_key),
                base_url=self.settings.ai_base_url,
                model=self.settings.ai_model,
            )
        )
        providers.extend(
            self._build_provider_configs(
                label="groq-fallback",
                provider_name="groq",
                api_keys=groq_fallback_keys,
                base_url=groq_base_url,
                model=groq_model,
            )
        )
        providers.extend(
            self._build_provider_configs(
                label="fallback",
                provider_name=self.settings.ai_fallback_provider or "fallback",
                api_keys=self._parse_api_keys(self.settings.ai_fallback_api_key),
                base_url=self.settings.ai_fallback_base_url,
                model=self.settings.ai_fallback_model,
            )
        )
        if not providers:
            return []

        key_state = self._provider_key_state()
        now = time.monotonic()

        def provider_sort_key(provider: AIProviderConfig) -> tuple[float, float, str]:
            state = key_state.get(provider.api_key, {})
            cooldown_until = float(state.get("cooldown_until", 0.0))
            in_cooldown = 1.0 if cooldown_until > now else 0.0
            last_used = float(state.get("last_used_at", 0.0))
            return (in_cooldown, last_used, provider.label)

        return sorted(providers, key=provider_sort_key)

    @staticmethod
    def _build_provider_config(
        *,
        label: str,
        provider_name: str,
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
            provider_name=provider_name.strip() or "compatible",
        )

    @classmethod
    def _parse_api_keys(cls, raw_value: str) -> list[str]:
        if not raw_value:
            return []
        values = re.split(r"[\n,;]+", raw_value)
        return [value.strip() for value in values if value.strip()]

    def _build_provider_configs(
        self,
        *,
        label: str,
        provider_name: str,
        api_keys: list[str],
        base_url: str,
        model: str,
    ) -> list[AIProviderConfig]:
        providers: list[AIProviderConfig] = []
        for index, key in enumerate(api_keys):
            provider = self._build_provider_config(
                label=f"{label}-{index + 1}",
                provider_name=provider_name,
                api_key=key,
                base_url=base_url,
                model=model,
            )
            if provider:
                providers.append(provider)
        return providers

    def _provider_key_state(self) -> dict[str, dict[str, float]]:
        state = getattr(self, "_key_state", None)
        if state is None:
            state = {}
            setattr(self, "_key_state", state)
        return state

    def _mark_provider_used(self, provider: AIProviderConfig) -> None:
        state = self._provider_key_state().setdefault(provider.api_key, {})
        state["last_used_at"] = time.monotonic()

    def _mark_provider_failure(self, provider: AIProviderConfig, *, retryable: bool) -> None:
        state = self._provider_key_state().setdefault(provider.api_key, {})
        failures = int(state.get("failure_count", 0.0)) + 1
        state["failure_count"] = float(failures)
        now = time.monotonic()
        cooldown_seconds = min(1.0 * failures, 8.0) if retryable else 30.0
        state["cooldown_until"] = now + cooldown_seconds

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
            try:
                self._mark_provider_used(provider)
                response = await client.post(
                    provider.responses_endpoint,
                    headers=headers,
                    json=request_payload,
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                retryable = exc.response.status_code in self.RETRYABLE_STATUS_CODES
                self._mark_provider_failure(provider, retryable=retryable)
                raise
            except httpx.HTTPError:
                self._mark_provider_failure(provider, retryable=True)
                raise
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
    CUSTOMER_PORTAL_BASE_URL = "https://portal.bookedai.au"

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
        effective_query, memory_signals = _build_effective_query(
            message=message,
            conversation=conversation,
        )
        wants_events = self._should_search_ai_events(message)
        matched_events: list[AIEventItem] = []
        if wants_events:
            event_search_service = AIEventSearchService(self.settings)
            try:
                matched_events = await event_search_service.search(message)
            except Exception as exc:
                logger.warning("booking_assistant_event_search_failed: %s", exc)
                matched_events = []

        ranked_matches = _rank_services(
            effective_query,
            services=catalog,
            max_service_matches=MAX_SERVICE_MATCHES,
            generic_match_tokens=GENERIC_MATCH_TOKENS,
            user_latitude=user_latitude,
            user_longitude=user_longitude,
            user_locality=user_locality,
            precomputed_signals=memory_signals,
        )
        shortlist = [item.service for item in ranked_matches[: max(MAX_SERVICE_MATCHES * 2, 6)]]
        shortlist = _filter_service_shortlist_for_category_intent(
            effective_query,
            shortlist,
        )
        matched_services = _curate_service_matches(shortlist, limit=MAX_SERVICE_MATCHES)
        ai_shortlist = _curate_service_matches(shortlist, limit=max(MAX_SERVICE_MATCHES * 2, 6))
        wants_services = _should_match_services(
            message=message,
            matched_services=matched_services,
            service_discovery_keywords=SERVICE_DISCOVERY_KEYWORDS,
            service_discovery_question_keywords=SERVICE_DISCOVERY_QUESTION_KEYWORDS,
            should_search_ai_events=self._should_search_ai_events(message),
        )

        if wants_events and not wants_services:
            return BookingAssistantChatResponse(
                status="ok",
                reply=self._build_ai_events_reply(message, matched_events),
                matched_services=[],
                matched_events=_curate_event_matches(matched_events, limit=MAX_EVENT_MATCHES),
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
            matched_services = _curate_service_matches(matched_services, limit=MAX_SERVICE_MATCHES)

        matched_events = _curate_event_matches(matched_events, limit=MAX_EVENT_MATCHES)

        suggested_service_id = matched_services[0].id if matched_services else None
        should_request_location = _should_request_location(
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

        clarification = _build_clarification_prompt(
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

        normalized_email = (payload.customer_email or "").strip().lower() or None
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
        portal_url = build_customer_portal_url(self.CUSTOMER_PORTAL_BASE_URL, booking_reference)
        business_recipient = (
            (service.business_email or "").strip().lower() or self.settings.booking_business_email
        )
        info_recipient = self.settings.booking_business_email.strip().lower()
        amount_label = format_amount(service.amount_aud)

        payment_status = "payment_follow_up_required"
        payment_url = build_manual_followup_url(
            booking_reference=booking_reference,
            service_name=service.name,
            business_recipient=business_recipient,
            customer_name=payload.customer_name,
            customer_email=normalized_email,
            customer_phone=normalized_phone,
            requested_date=payload.requested_date.isoformat(),
            requested_time=payload.requested_time.strftime("%H:%M"),
            timezone=payload.timezone,
            notes=payload.notes,
        )
        meeting_status = "configuration_required"
        meeting_join_url: str | None = None
        meeting_event_url: str | None = None
        calendar_add_url = build_google_calendar_url(
            booking_reference=booking_reference,
            service=service,
            customer_name=payload.customer_name,
            requested_date=payload.requested_date,
            requested_time=payload.requested_time,
            timezone=payload.timezone,
            notes=payload.notes,
        )

        if normalized_email and zoho_calendar_configured(self.settings):
            try:
                meeting_join_url, meeting_event_url = await create_zoho_calendar_event(
                    settings=self.settings,
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
                        text=build_booking_customer_confirmation_text(
                            booking_reference=booking_reference,
                            service_name=service.name,
                            requested_date=payload.requested_date.isoformat(),
                            requested_time=payload.requested_time.strftime("%H:%M"),
                            timezone=payload.timezone,
                            amount_label=amount_label,
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
                    text=build_booking_internal_notification_text(
                        booking_reference=booking_reference,
                        service_name=service.name,
                        customer_name=payload.customer_name,
                        customer_email=normalized_email,
                        customer_phone=normalized_phone,
                        requested_date=payload.requested_date.isoformat(),
                        requested_time=payload.requested_time.strftime("%H:%M"),
                        timezone=payload.timezone,
                        notes=payload.notes,
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
                customer_reply="Booking assistant session created and ready for payment or follow-up.",
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
                    "portal_url": portal_url,
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
            portal_url=portal_url,
            service=service,
            amount_aud=service.amount_aud,
            amount_label=amount_label,
            requested_date=payload.requested_date.isoformat(),
            requested_time=payload.requested_time.strftime("%H:%M"),
            timezone=payload.timezone,
            payment_status=payment_status,  # type: ignore[arg-type]
            payment_url=payment_url,
            qr_code_url=build_qr_code_url(payment_url),
            email_status=email_status,  # type: ignore[arg-type]
            meeting_status=meeting_status,  # type: ignore[arg-type]
            meeting_join_url=meeting_join_url,
            meeting_event_url=meeting_event_url,
            calendar_add_url=calendar_add_url,
            confirmation_message=confirmation_message,
            contact_email=business_recipient,
            workflow_status=workflow_status,
        )

    def _should_search_ai_events(self, message: str) -> bool:
        tokens = tokenize_text(message)
        has_event_signal = bool(tokens & AI_EVENT_DISCOVERY_KEYWORDS)
        has_ai_topic_signal = bool(tokens & AI_EVENT_TOPIC_KEYWORDS)
        return has_event_signal and has_ai_topic_signal

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

    @staticmethod
    def _resolve_public_package_name(
        plan: PricingPlanDefinition,
        payload: PricingConsultationRequest,
    ) -> str:
        source_detail = (payload.source_detail or "").strip().lower()
        source_plan_id = (payload.source_plan_id or "").strip().lower()

        if "launch10" in source_detail or "top10" in source_detail or "first10" in source_detail:
            return "Top 10 SMEs"
        if "freemium" in source_detail or source_plan_id == "freemium":
            return "Freemium"
        if "upgrade1" in source_detail or source_plan_id == "upgrade1":
            return "Upgrade 1"
        if "upgrade2" in source_detail or source_plan_id == "upgrade2":
            return "Upgrade 2"
        if "upgrade3" in source_detail or source_plan_id == "upgrade3":
            return "Upgrade 3"

        return {
            "basic": "Upgrade 1",
            "standard": "Upgrade 2",
            "pro": "Upgrade 3",
        }.get(plan.id, plan.name)

    @staticmethod
    def _resolve_public_onboarding_label(
        public_package_name: str,
        plan: PricingPlanDefinition,
    ) -> str:
        if public_package_name == "Top 10 SMEs":
            return "Top 10 SME setup"
        if public_package_name == "Freemium":
            return "Freemium activation"
        if public_package_name.startswith("Upgrade"):
            return f"{public_package_name} onboarding"
        return plan.onboarding_label

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
                "then the selected package starts."
            )
        return "Subscription is free for the first 30 days, then the selected package starts."

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
        public_package_name = self._resolve_public_package_name(plan, payload)
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
                subject=f"BookedAI {public_package_name} consultation booked ({consultation_reference})",
                text=self._build_customer_confirmation_text(
                    consultation_reference=consultation_reference,
                    plan=plan,
                    public_package_name=public_package_name,
                    payload=payload,
                    meeting_join_url=meeting_join_url,
                    meeting_event_url=meeting_event_url,
                    payment_url=payment_url,
                ),
            )
            await email_service.send_email(
                to=[self.settings.booking_business_email],
                subject=f"New BookedAI {public_package_name} consultation ({consultation_reference})",
                text=self._build_internal_notification_text(
                    consultation_reference=consultation_reference,
                    plan=plan,
                    public_package_name=public_package_name,
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
            package_name=public_package_name,
            plan_name=public_package_name,
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
        public_package_name = self._resolve_public_package_name(plan, payload)
        public_onboarding_label = self._resolve_public_onboarding_label(public_package_name, plan)
        zone = ZoneInfo(payload.timezone)
        start_at = datetime.combine(payload.preferred_date, payload.preferred_time, tzinfo=zone)
        end_at = start_at + timedelta(minutes=plan.consultation_minutes)
        description_lines = [
            f"BookedAI onboarding booking for the {public_package_name} package.",
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
            "title": f"BookedAI {public_onboarding_label} - {payload.business_name}",
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
        public_package_name = self._resolve_public_package_name(plan, payload)
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
            ("line_items[0][price_data][product_data][name]", f"BookedAI {public_package_name}"),
            ("line_items[0][price_data][product_data][description]", f"BookedAI {public_package_name} package for Australian SMEs."),
            ("client_reference_id", consultation_reference),
            ("metadata[consultation_reference]", consultation_reference),
            ("metadata[plan_id]", plan.id),
            ("metadata[plan_name]", public_package_name),
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
        public_package_name: str,
        payload: PricingConsultationRequest,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
        payment_url: str | None,
    ) -> str:
        startup_offer_applied = bool(payload.startup_referral_eligible and (payload.referral_partner or '').strip())
        trial_days = 90 if startup_offer_applied else 30
        return build_consultation_customer_confirmation_text(
            consultation_reference=consultation_reference,
            public_package_name=public_package_name,
            amount_label=self._format_amount(plan.amount_aud, plan.price_suffix),
            trial_summary=self._build_trial_summary(trial_days, startup_offer_applied),
            business_name=payload.business_name,
            business_type=payload.business_type,
            onboarding_mode=payload.onboarding_mode,
            preferred_date=payload.preferred_date.isoformat(),
            preferred_time=payload.preferred_time.strftime('%H:%M'),
            timezone=payload.timezone,
            referral_partner=payload.referral_partner,
            referral_location=payload.referral_location,
            source_section=payload.source_section,
            source_cta=payload.source_cta,
            travel_fee_note=self._build_onsite_travel_fee_note(payload.onboarding_mode),
            meeting_join_url=meeting_join_url,
            meeting_event_url=meeting_event_url,
            payment_url=payment_url,
            notes=payload.notes,
        )

    def _build_internal_notification_text(
        self,
        *,
        consultation_reference: str,
        plan: PricingPlanDefinition,
        public_package_name: str,
        payload: PricingConsultationRequest,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
        payment_url: str | None,
    ) -> str:
        return build_consultation_internal_notification_text(
            consultation_reference=consultation_reference,
            internal_plan_id=plan.id,
            public_package_name=public_package_name,
            customer_name=payload.customer_name,
            customer_email=payload.customer_email,
            customer_phone=payload.customer_phone,
            business_name=payload.business_name,
            business_type=payload.business_type,
            onboarding_mode=payload.onboarding_mode,
            preferred_date=payload.preferred_date.isoformat(),
            preferred_time=payload.preferred_time.strftime('%H:%M'),
            timezone=payload.timezone,
            referral_partner=payload.referral_partner,
            referral_location=payload.referral_location,
            source_section=payload.source_section,
            source_cta=payload.source_cta,
            source_path=payload.source_path,
            travel_fee_note=self._build_onsite_travel_fee_note(payload.onboarding_mode),
            meeting_join_url=meeting_join_url,
            meeting_event_url=meeting_event_url,
            payment_url=payment_url,
            notes=payload.notes,
        )

    def _build_demo_customer_confirmation_text(
        self,
        *,
        demo_reference: str,
        payload: DemoBookingRequest,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
    ) -> str:
        return build_demo_customer_confirmation_text(
            demo_reference=demo_reference,
            business_name=payload.business_name,
            business_type=payload.business_type,
            preferred_date=payload.preferred_date.isoformat(),
            preferred_time=payload.preferred_time.strftime('%H:%M'),
            timezone=payload.timezone,
            meeting_join_url=meeting_join_url,
            meeting_event_url=meeting_event_url,
            notes=payload.notes,
        )

    def _build_demo_internal_notification_text(
        self,
        *,
        demo_reference: str,
        payload: DemoBookingRequest,
        meeting_join_url: str | None,
        meeting_event_url: str | None,
    ) -> str:
        return build_demo_internal_notification_text(
            demo_reference=demo_reference,
            customer_name=payload.customer_name,
            customer_email=payload.customer_email,
            customer_phone=payload.customer_phone,
            business_name=payload.business_name,
            business_type=payload.business_type,
            preferred_date=payload.preferred_date.isoformat(),
            preferred_time=payload.preferred_time.strftime('%H:%M'),
            timezone=payload.timezone,
            source_section=payload.source_section,
            source_cta=payload.source_cta,
            source_path=payload.source_path,
            meeting_join_url=meeting_join_url,
            meeting_event_url=meeting_event_url,
            notes=payload.notes,
        )
