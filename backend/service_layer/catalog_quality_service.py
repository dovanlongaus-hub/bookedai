from __future__ import annotations

import re
from typing import Any

from service_layer.prompt9_matching_service import expand_topic_terms


CANONICAL_TOPIC_TAGS: tuple[tuple[str, set[str]], ...] = (
    ("facial", {"facial", "facials", "spa", "beauty", "skincare", "skin", "glow", "led"}),
    ("hair", {"hair", "haircut", "colour", "color", "salon", "styling", "bridal", "wedding"}),
    ("kids", {"kids", "kid", "children", "child", "family", "junior", "swim", "swimming", "soccer", "sport"}),
    ("healthcare", {"healthcare", "medical", "doctor", "gp", "dental", "dentist", "teeth"}),
    ("physio", {"physio", "physiotherapy", "physical", "rehab", "rehabilitation"}),
    ("restaurant", {"restaurant", "dining", "dinner", "table", "cafe", "catering", "menu"}),
    ("venue", {"venue", "function", "party", "event", "hotel", "accommodation", "room", "reservation", "stay"}),
    ("membership", {"membership", "member", "renew", "renewal", "signup", "join"}),
    ("housing", {"housing", "property", "project", "apartment", "townhouse", "home", "estate", "investment"}),
    ("signage", {"signage", "printing", "print", "expo", "booth", "banner"}),
)

CANONICAL_CATEGORY_SYNONYMS: tuple[tuple[str, set[str]], ...] = (
    ("Spa", {"spa", "beauty", "facial", "skincare", "skin treatment"}),
    ("Salon", {"salon", "hair", "haircut", "barber", "styling", "colour", "color", "bridal hair", "wedding hair"}),
    ("Kids Services", {"kids", "children", "family", "junior", "swim school", "sports for kids"}),
    ("Food and Beverage", {"restaurant", "dining", "cafe", "catering", "food", "beverage", "private dining"}),
    ("Healthcare Service", {"healthcare", "medical", "doctor", "clinic", "physio", "physiotherapy", "dental", "gp clinic", "medical clinic"}),
    ("Membership and Community", {"membership", "community", "club", "gym", "coworking"}),
    ("Hospitality and Events", {"hospitality", "events", "event", "venue", "function", "hotel"}),
    ("Housing and Property", {"housing", "property", "real estate", "project", "apartment", "townhouse"}),
    ("Print and Signage", {"signage", "printing", "print", "expo", "banner", "booth"}),
)

CANONICAL_LOCATION_TAGS: tuple[tuple[str, set[str]], ...] = (
    ("sydney", {"sydney", "sydney cbd", "paddington", "surry hills", "parramatta", "newtown", "the rocks", "sydney olympic park", "olympic park", "western sydney", "castle hill"}),
    ("melbourne", {"melbourne", "melbourne cbd", "southbank", "carlton", "richmond", "collins street"}),
    ("brisbane", {"brisbane", "brisbane city", "south bank", "south bank brisbane", "newstead", "west end", "fortitude valley", "james street", "surfers paradise"}),
    ("wollongong", {"wollongong"}),
    ("newcastle", {"newcastle"}),
    ("adelaide", {"adelaide", "rundle mall"}),
    ("perth", {"perth", "subiaco"}),
    ("canberra", {"canberra"}),
)

CATEGORY_TOPIC_EXPECTATIONS: dict[str, set[str]] = {
    "Spa": {"facial"},
    "Salon": {"hair"},
    "Kids Services": {"kids"},
    "Food and Beverage": {"restaurant"},
    "Healthcare Service": {"healthcare", "physio", "facial"},
    "Membership and Community": {"membership"},
    "Hospitality and Events": {"venue", "restaurant", "signage"},
    "Housing and Property": {"housing"},
    "Print and Signage": {"signage"},
}


def _normalized_terms(*values: str | None) -> set[str]:
    terms: set[str] = set()
    for value in values:
        normalized = re.sub(r"[^a-z0-9]+", " ", (value or "").lower())
        for term in normalized.split():
            if len(term) >= 3 and not term.isdigit():
                terms.add(term)
    return terms


def _derived_topic_tags_from_terms(source_terms: set[str], tags: list[str] | None) -> list[str]:
    derived_tags: list[str] = []

    for canonical_tag, group in CANONICAL_TOPIC_TAGS:
        if source_terms & group and canonical_tag not in derived_tags:
            derived_tags.append(canonical_tag)

    for tag in tags or []:
        cleaned = str(tag).strip().lower()
        if cleaned and cleaned not in derived_tags:
            derived_tags.append(cleaned)

    return derived_tags[:8]


def derive_catalog_topic_tags(
    *,
    name: str | None,
    category: str | None,
    summary: str | None,
    tags: list[str] | None,
) -> list[str]:
    source_terms = _normalized_terms(name, category, summary, " ".join(tags or []))
    return _derived_topic_tags_from_terms(source_terms, tags)


def derive_catalog_location_tags(
    *,
    location: str | None,
    venue_name: str | None = None,
    tags: list[str] | None = None,
) -> list[str]:
    source_text = " ".join(
        value.strip() for value in (location or "", venue_name or "", " ".join(tags or [])) if value and value.strip()
    )
    normalized_source = re.sub(r"[^a-z0-9]+", " ", source_text.lower()).strip()
    if not normalized_source:
        return []

    derived_tags: list[str] = []
    for canonical_tag, aliases in CANONICAL_LOCATION_TAGS:
        for alias in aliases:
            pattern = rf"(^| ){re.escape(alias)}( |$)"
            if re.search(pattern, normalized_source) and canonical_tag not in derived_tags:
                derived_tags.append(canonical_tag)
                break

    return derived_tags


def normalize_catalog_category(
    *,
    category: str | None,
    name: str | None,
    summary: str | None,
    tags: list[str] | None,
) -> str | None:
    source_terms = _normalized_terms(category, name, summary, " ".join(tags or []))
    expanded_terms = expand_topic_terms(source_terms)
    normalized_category = str(category or "").strip()

    for canonical_category, synonyms in CANONICAL_CATEGORY_SYNONYMS:
        if normalized_category and normalized_category.lower() == canonical_category.lower():
            return canonical_category
        if normalized_category and normalized_category.lower() in synonyms:
            return canonical_category

    for canonical_category, synonyms in CANONICAL_CATEGORY_SYNONYMS:
        if expanded_terms & synonyms:
            return canonical_category

    return normalized_category or None


def catalog_quality_warnings(payload: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    category = normalize_catalog_category(
        category=str(payload.get("category") or "").strip() or None,
        name=str(payload.get("name") or "").strip() or None,
        summary=str(payload.get("summary") or "").strip() or None,
        tags=list(payload.get("tags_json") or []),
    ) or ""
    location = str(payload.get("location") or "").strip()
    amount_aud = payload.get("amount_aud")
    tags = payload.get("_source_tags_json") or payload.get("tags_json") or []
    content_derived_tags = _derived_topic_tags_from_terms(
        _normalized_terms(
            str(payload.get("name") or "").strip() or None,
            str(payload.get("summary") or "").strip() or None,
            " ".join(tags),
        ),
        list(tags),
    )
    derived_tags = derive_catalog_topic_tags(
        name=str(payload.get("name") or "").strip() or None,
        category=category or None,
        summary=str(payload.get("summary") or "").strip() or None,
        tags=list(tags),
    )

    if not category:
        warnings.append("missing_category")
    elif category not in CATEGORY_TOPIC_EXPECTATIONS:
        warnings.append("unknown_category")
    if not location:
        warnings.append("missing_location")
    if amount_aud is None or float(amount_aud) <= 0:
        warnings.append("missing_price")
    if not content_derived_tags:
        warnings.append("missing_topic_tags")
    elif category and category in CATEGORY_TOPIC_EXPECTATIONS:
        expected_topics = CATEGORY_TOPIC_EXPECTATIONS[category]
        if not (set(content_derived_tags) & expected_topics):
            warnings.append("category_topic_mismatch")

    return warnings


def apply_catalog_quality_gate(payload: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    normalized_payload = dict(payload)
    raw_tags = list(normalized_payload.get("tags_json") or [])
    normalized_payload["_source_tags_json"] = raw_tags
    normalized_payload["category"] = normalize_catalog_category(
        category=str(normalized_payload.get("category") or "").strip() or None,
        name=str(normalized_payload.get("name") or "").strip() or None,
        summary=str(normalized_payload.get("summary") or "").strip() or None,
        tags=raw_tags,
    )
    topic_tags = derive_catalog_topic_tags(
        name=str(normalized_payload.get("name") or "").strip() or None,
        category=normalized_payload["category"],
        summary=str(normalized_payload.get("summary") or "").strip() or None,
        tags=raw_tags,
    )
    location_tags = derive_catalog_location_tags(
        location=str(normalized_payload.get("location") or "").strip() or None,
        venue_name=str(normalized_payload.get("venue_name") or "").strip() or None,
        tags=raw_tags,
    )
    normalized_payload["tags_json"] = list(dict.fromkeys([*topic_tags, *location_tags]))
    warnings = catalog_quality_warnings(normalized_payload)
    normalized_payload["is_active"] = 0 if warnings else int(normalized_payload.get("is_active", 1) or 0)
    normalized_payload.pop("_source_tags_json", None)
    return normalized_payload, warnings
