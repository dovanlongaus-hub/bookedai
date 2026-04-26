from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any

from service_layer.prompt9_matching_service import (
    filter_ranked_matches_for_relevance,
    rank_catalog_matches,
)


def _service(
    *,
    service_id: str,
    name: str,
    summary: str,
    category: str,
    location: str,
    amount_aud: float,
    tags: list[str],
    featured: bool = False,
) -> SimpleNamespace:
    return SimpleNamespace(
        service_id=service_id,
        business_name="Eval Catalog",
        name=name,
        summary=summary,
        category=category,
        venue_name="Eval Venue",
        location=location,
        amount_aud=amount_aud,
        tags_json=tags,
        featured=1 if featured else 0,
        booking_url="https://book.example.com",
    )


SEARCH_EVAL_SERVICES: list[SimpleNamespace] = [
    _service(
        service_id="led-skin-therapy-sydney",
        name="LED Skin Therapy Facial",
        summary="Skin-focused facial treatment with LED therapy and hydration.",
        category="Spa",
        location="Paddington, Sydney NSW 2021",
        amount_aud=149,
        tags=["facial", "skin", "spa", "led", "treatment"],
        featured=True,
    ),
    _service(
        service_id="signature-facial-sydney",
        name="Signature Facial",
        summary="Premium facial with skin analysis and hydration in Sydney.",
        category="Spa",
        location="Surry Hills, Sydney NSW 2010",
        amount_aud=139,
        tags=["facial", "skin", "spa", "beauty"],
    ),
    _service(
        service_id="express-facial-sydney",
        name="Express Facial Reset",
        summary="Fast city facial for hydration and skin refresh.",
        category="Spa",
        location="Sydney CBD NSW 2000",
        amount_aud=95,
        tags=["facial", "skin", "spa", "express"],
    ),
    _service(
        service_id="auzland-project-consult",
        name="Auzland Housing Project Consultation",
        summary="Review available housing projects, preferred suburbs, and purchase timing.",
        category="Housing and Property",
        location="Melbourne VIC 3000",
        amount_aud=49,
        tags=["housing", "property", "project", "apartment", "consultation"],
        featured=True,
    ),
    _service(
        service_id="codex-property-project-consult",
        name="Codex Property Project Consultation",
        summary="Discuss Sydney property projects, investment goals, and target suburbs.",
        category="Housing and Property",
        location="Sydney NSW 2000",
        amount_aud=49,
        tags=["housing", "property", "project", "consultation"],
    ),
    _service(
        service_id="rsl-membership-renewal",
        name="RSL Membership Renewal",
        summary="Renew an existing club membership and confirm expiry details.",
        category="Membership and Community",
        location="Wollongong NSW 2500",
        amount_aud=10,
        tags=["membership", "renewal", "member", "club"],
    ),
    _service(
        service_id="kids-swimming-lessons",
        name="Kids Swimming Lessons",
        summary="Weekly learn-to-swim classes for children at beginner level.",
        category="Kids Services",
        location="South Bank, Brisbane QLD 4101",
        amount_aud=32,
        tags=["kids", "children", "swimming", "lessons", "family"],
        featured=True,
    ),
    _service(
        service_id="co-mai-hung-chess-sydney-pilot-group",
        name="Kids Chess Class - Sydney Pilot",
        summary="Beginner-friendly chess class for children with Grandmaster coaching posture.",
        category="Kids Services",
        location="Sydney NSW 2000",
        amount_aud=30,
        tags=["kids", "children", "chess", "class", "lessons", "sydney"],
        featured=True,
    ),
    _service(
        service_id="haircut-wedding-brisbane",
        name="Wedding Hair Styling",
        summary="Bridal and wedding hair styling near James Street and Fortitude Valley.",
        category="Salon",
        location="James Street, Fortitude Valley QLD 4006",
        amount_aud=160,
        tags=["hair", "bridal", "wedding", "styling", "brisbane"],
        featured=True,
    ),
    _service(
        service_id="restaurant-table-booking",
        name="Restaurant Table Booking",
        summary="Reserve a table for dinner, group dining, or casual team catch-up.",
        category="Food and Beverage",
        location="Southbank VIC 3006",
        amount_aud=20,
        tags=["restaurant", "dining", "dinner", "table", "group"],
        featured=True,
    ),
    _service(
        service_id="gp-consultation",
        name="General Practice Consultation",
        summary="Clinic consultation for symptoms, referrals, and ongoing care.",
        category="Healthcare Service",
        location="Adelaide SA 5000",
        amount_aud=89,
        tags=["healthcare", "gp", "doctor", "medical", "consultation"],
    ),
    _service(
        service_id="hotel-room-reservation",
        name="Hotel Room Reservation Request",
        summary="Accommodation request for room reservations and special stay needs.",
        category="Hospitality and Events",
        location="Brisbane City QLD 4000",
        amount_aud=50,
        tags=["hotel", "room", "reservation", "stay", "hospitality"],
    ),
    _service(
        service_id="ndis-support-worker-western-sydney",
        name="NDIS Support Worker Home Visit",
        summary="In-home disability support and community access visits in Western Sydney.",
        category="NDIS Support",
        location="Parramatta, Western Sydney NSW 2150",
        amount_aud=95,
        tags=["ndis", "support", "worker", "disability", "community"],
        featured=True,
    ),
]


@dataclass(frozen=True)
class SearchEvalCase:
    name: str
    query: str
    location_hint: str | None = None
    requested_category: str | None = None
    budget: dict[str, Any] | None = None
    expected_ids: tuple[str, ...] = ()
    expected_top_id: str | None = None
    require_location_match: bool = False


SEARCH_EVAL_CASES: tuple[SearchEvalCase, ...] = (
    SearchEvalCase(
        name="skin-care-sydney",
        query="skin care Sydney",
        location_hint="Sydney",
        requested_category="Spa",
        budget={"max_aud": 150},
        expected_ids=(
            "led-skin-therapy-sydney",
            "signature-facial-sydney",
            "express-facial-sydney",
        ),
        expected_top_id="led-skin-therapy-sydney",
        require_location_match=True,
    ),
    SearchEvalCase(
        name="paddington-facial-infers-sydney-metro",
        query="facial Paddington under 150",
        requested_category="Spa",
        budget={"max_aud": 150},
        expected_ids=(
            "led-skin-therapy-sydney",
            "signature-facial-sydney",
            "express-facial-sydney",
        ),
        expected_top_id="led-skin-therapy-sydney",
        require_location_match=True,
    ),
    SearchEvalCase(
        name="facial-melbourne-no-false-positive",
        query="facial Melbourne",
        location_hint="Melbourne",
        requested_category="Spa",
        budget={"max_aud": 150},
        expected_ids=(),
        require_location_match=True,
    ),
    SearchEvalCase(
        name="housing-melbourne",
        query="housing Melbourne",
        location_hint="Melbourne",
        requested_category="Housing and Property",
        expected_ids=("auzland-project-consult",),
        require_location_match=True,
    ),
    SearchEvalCase(
        name="membership-renewal-wollongong",
        query="membership renewal Wollongong",
        location_hint="Wollongong",
        requested_category="Membership and Community",
        expected_ids=("rsl-membership-renewal",),
        require_location_match=True,
    ),
    SearchEvalCase(
        name="kids-swimming-brisbane",
        query="kids swimming Brisbane",
        location_hint="Brisbane",
        requested_category="Kids Services",
        budget={"max_aud": 40},
        expected_ids=("kids-swimming-lessons",),
        require_location_match=True,
    ),
    SearchEvalCase(
        name="chess-class-sydney-live-safe",
        query="Find a chess class in Sydney this weekend",
        location_hint="Sydney",
        requested_category="Kids Services",
        expected_ids=("co-mai-hung-chess-sydney-pilot-group",),
        expected_top_id="co-mai-hung-chess-sydney-pilot-group",
        require_location_match=True,
    ),
    SearchEvalCase(
        name="wedding-hair-fortitude-valley",
        query="wedding hair Fortitude Valley",
        requested_category="Salon",
        expected_ids=("haircut-wedding-brisbane",),
        expected_top_id="haircut-wedding-brisbane",
        require_location_match=True,
    ),
    SearchEvalCase(
        name="signage-sydney-no-incomplete-records",
        query="signage Sydney",
        location_hint="Sydney",
        requested_category="Print and Signage",
        expected_ids=(),
        require_location_match=True,
    ),
    SearchEvalCase(
        name="vietnamese-ndis-support-western-sydney",
        query="Toi can dich vu support worker NDIS tai nha o Western Sydney",
        location_hint="Western Sydney",
        requested_category="NDIS Support",
        expected_ids=("ndis-support-worker-western-sydney",),
        expected_top_id="ndis-support-worker-western-sydney",
        require_location_match=True,
    ),
    SearchEvalCase(
        name="english-haircut-should-not-fall_back_to_generic_beauty",
        query="I need a haircut in Sydney",
        location_hint="Sydney",
        requested_category="Salon",
        expected_ids=(),
        require_location_match=True,
    ),
    SearchEvalCase(
        name="restaurant-table-melbourne",
        query="restaurant table in Melbourne",
        location_hint="Melbourne",
        requested_category="Food and Beverage",
        expected_ids=("restaurant-table-booking",),
        expected_top_id="restaurant-table-booking",
        require_location_match=True,
    ),
    SearchEvalCase(
        name="private-dining-southbank",
        query="private dining Southbank",
        requested_category="Food and Beverage",
        expected_ids=("restaurant-table-booking",),
        expected_top_id="restaurant-table-booking",
        require_location_match=True,
    ),
    SearchEvalCase(
        name="support-worker-western-sydney-english",
        query="NDIS support worker at home in Western Sydney tomorrow",
        location_hint="Western Sydney",
        requested_category="NDIS Support",
        expected_ids=("ndis-support-worker-western-sydney",),
        expected_top_id="ndis-support-worker-western-sydney",
        require_location_match=True,
    ),
)


def evaluate_search_case(case: SearchEvalCase) -> dict[str, Any]:
    ranked = rank_catalog_matches(
        query=case.query,
        services=SEARCH_EVAL_SERVICES,
        location_hint=case.location_hint,
        requested_category=case.requested_category,
        budget=case.budget,
    )
    filtered = filter_ranked_matches_for_relevance(
        ranked,
        semantic_applied=False,
        require_location_match=case.require_location_match,
        location_hint=case.location_hint,
    )
    actual_ids = tuple(item.service.service_id for item in filtered)
    if len(case.expected_ids) <= 1:
        passed = actual_ids == case.expected_ids
    else:
        passed = set(actual_ids) == set(case.expected_ids)
        if case.expected_top_id:
            passed = passed and bool(actual_ids) and actual_ids[0] == case.expected_top_id
    return {
        "name": case.name,
        "query": case.query,
        "expected_ids": list(case.expected_ids),
        "expected_top_id": case.expected_top_id,
        "actual_ids": list(actual_ids),
        "passed": passed,
    }


def evaluate_search_cases() -> list[dict[str, Any]]:
    return [evaluate_search_case(case) for case in SEARCH_EVAL_CASES]
