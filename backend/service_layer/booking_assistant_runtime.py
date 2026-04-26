from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from schemas import AIEventItem, BookingAssistantChatMessage, ServiceCatalogItem
from service_layer.geo_utils import haversine_km
from service_layer.service_query_parsing import (
    CATEGORY_KEYWORDS,
    FOLLOW_UP_CONTEXT_TOKENS,
    LOCATION_REQUEST_KEYWORDS,
    SERVICE_KEYWORD_SYNONYMS,
    ServiceQuerySignals,
    extract_service_query_signals,
    merge_service_query_signals,
    tokenize_text,
)


@dataclass(frozen=True)
class ServiceMatchInsight:
    service: ServiceCatalogItem
    score: int


NON_DECISIVE_QUERY_TOKENS = {
    "in", "near", "around", "at", "within", "today", "tomorrow", "tonight", "week", "weekend",
    "morning", "afternoon", "evening", "night", "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday", "am", "pm", "book", "booking", "need", "want", "looking",
    "find", "service", "services", "option", "options", "best", "good", "local", "nearby", "closest",
    "a", "an", "the", "this", "that", "for", "to", "of",
}

GENERIC_CORE_INTENT_TOKENS = {
    "activity",
    "appointment",
    "class",
    "classes",
    "coach",
    "coaching",
    "course",
    "kids",
    "lesson",
    "lessons",
    "session",
    "sessions",
}


def recent_user_context(
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


def build_effective_query(
    *,
    message: str,
    conversation: list[BookingAssistantChatMessage],
) -> tuple[str, ServiceQuerySignals]:
    message_tokens = tokenize_text(message)
    primary_signals = extract_service_query_signals(message, message_tokens)
    recent_context = recent_user_context(conversation, current_message=message)
    if not recent_context:
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

    context_text = " ".join(recent_context[-2:])
    secondary_signals = extract_service_query_signals(context_text, tokenize_text(context_text))
    merged_signals = merge_service_query_signals(primary_signals, secondary_signals)
    effective_query = f"{message}\nContext from earlier in the conversation: {context_text}"
    return effective_query, merged_signals


def curate_service_matches(
    services: list[ServiceCatalogItem],
    *,
    limit: int,
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


def filter_service_shortlist_for_category_intent(
    query: str,
    services: list[ServiceCatalogItem],
) -> list[ServiceCatalogItem]:
    if not services:
        return []

    query_tokens = tokenize_text(query)
    detected_categories = {
        category
        for category, keywords in CATEGORY_KEYWORDS.items()
        if query_tokens & keywords
    }
    if not detected_categories:
        return services

    category_aligned = [service for service in services if service.category in detected_categories]
    return category_aligned or services


def curate_event_matches(
    events: list[AIEventItem],
    *,
    limit: int,
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


def should_match_services(
    *,
    message: str,
    matched_services: list[ServiceCatalogItem],
    service_discovery_keywords: set[str],
    service_discovery_question_keywords: set[str],
    should_search_ai_events: bool,
) -> bool:
    tokens = tokenize_text(message)
    if tokens & service_discovery_keywords:
        return True
    if tokens & service_discovery_question_keywords:
        return True
    if any(category_tokens & tokens for category_tokens in CATEGORY_KEYWORDS.values()):
        return True
    if should_search_ai_events:
        return bool(tokens & service_discovery_keywords or tokens & service_discovery_question_keywords)
    return bool(matched_services)


def service_search_text(service: ServiceCatalogItem) -> str:
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


def should_request_location(
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
            item for item in [match.service.venue_name or "", match.service.location or ""] if item
        ).strip()
        for match in ranked_matches[:3]
    }
    distinct_locations.discard("")

    return explicit_location_need and (
        len(distinct_locations) >= 2 or (second_score is not None and abs(top_score - second_score) <= 5)
    )


def rank_services(
    query: str,
    *,
    services: list[ServiceCatalogItem],
    max_service_matches: int,
    generic_match_tokens: set[str],
    user_latitude: float | None = None,
    user_longitude: float | None = None,
    user_locality: str | None = None,
    precomputed_signals: ServiceQuerySignals | None = None,
) -> list[ServiceMatchInsight]:
    query_lower = query.lower().strip()
    query_tokens = tokenize_text(query)
    if not query_tokens:
        return [
            ServiceMatchInsight(service=service, score=12 if service.featured else 6)
            for service in services
            if service.featured
        ][:max_service_matches]

    intent_tokens = {token for token in query_tokens if token not in generic_match_tokens}
    if not intent_tokens:
        intent_tokens = set(query_tokens)

    detected_categories = {
        category
        for category, keywords in CATEGORY_KEYWORDS.items()
        if intent_tokens & keywords
    }
    query_signals = precomputed_signals or extract_service_query_signals(query, intent_tokens)
    if user_locality and user_locality.lower() not in query_lower:
        query_signals = ServiceQuerySignals(
            budget_max=query_signals.budget_max,
            group_size=query_signals.group_size,
            preferred_locations=tuple(dict.fromkeys([*query_signals.preferred_locations, user_locality.lower()])),
            prefers_fast_option=query_signals.prefers_fast_option,
            prefers_evening=query_signals.prefers_evening,
            prefers_morning=query_signals.prefers_morning,
            customer_types=query_signals.customer_types,
            urgency=query_signals.urgency,
            explicit_location_need=query_signals.explicit_location_need,
            follow_up_refinement=query_signals.follow_up_refinement,
        )

    prefers_fast_option = query_signals.prefers_fast_option
    group_visit = bool({"group", "team", "people", "guests"} & intent_tokens or query_signals.group_size)
    social_booking_intent = bool(
        (query_signals.group_size is not None and query_signals.group_size >= 4)
        or {"group", "guests", "party", "meeting", "table", "people", "nhom", "nguoi"} & intent_tokens
    )
    explicit_location_need = query_signals.explicit_location_need
    follow_up_refinement = query_signals.follow_up_refinement
    location_tokens = {
        token
        for location in query_signals.preferred_locations
        for token in tokenize_text(location)
    }
    core_intent_tokens = {
        token
        for token in query_tokens
        if token not in NON_DECISIVE_QUERY_TOKENS and token not in location_tokens
    }
    prefers_low_cost = bool(
        {"cheap", "cheapest", "budget", "re", "nhat"} & intent_tokens
        or "gia re" in query_lower
        or "re nhat" in query_lower
    )

    specific_category_intent = bool(detected_categories)
    scored_services: list[ServiceMatchInsight] = []
    for service in services:
        search_text = service_search_text(service)
        service_tokens = tokenize_text(search_text)
        service_tags = {tag.lower() for tag in service.tags}
        category_tokens = {*CATEGORY_KEYWORDS.get(service.category, set()), *tokenize_text(service.category)}
        synonym_tokens = SERVICE_KEYWORD_SYNONYMS.get(service.id, set())
        aligned_tokens = service_tokens | service_tags | category_tokens | synonym_tokens
        discriminating_aligned_tokens = service_tokens | service_tags | synonym_tokens

        overlap = len(intent_tokens & service_tokens)
        exact_tag_matches = len(intent_tokens & service_tags)
        category_overlap = len(intent_tokens & category_tokens)
        synonym_overlap = len(intent_tokens & synonym_tokens)
        core_intent_overlap = len(core_intent_tokens & aligned_tokens)
        discriminating_core_tokens = core_intent_tokens - GENERIC_CORE_INTENT_TOKENS
        discriminating_core_overlap = len(discriminating_core_tokens & discriminating_aligned_tokens)

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

        if not detected_categories and core_intent_tokens and not (core_intent_tokens & aligned_tokens):
            continue
        if discriminating_core_tokens and not discriminating_core_overlap:
            continue

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
            supports_groups = bool({"group", "guests", "party", "meeting", "table", "event"} & service_tokens) or service.category in {"Food and Beverage", "Hospitality and Events"}
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
            service_location_text = " ".join([service.venue_name or "", service.location or ""]).lower()
            matching_locations = [location for location in query_signals.preferred_locations if location in service_location_text]
            if matching_locations:
                fit_bonus += 8 + len(matching_locations)
            elif query_signals.preferred_locations:
                fit_bonus -= 2

        if user_latitude is not None and user_longitude is not None:
            if service.latitude is not None and service.longitude is not None:
                distance_km = haversine_km(user_latitude, user_longitude, service.latitude, service.longitude)
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
            + core_intent_overlap * 8
            + discriminating_core_overlap * 12
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


def match_services(
    query: str,
    *,
    services: list[ServiceCatalogItem],
    max_service_matches: int,
    generic_match_tokens: set[str],
    limit: int,
    user_latitude: float | None = None,
    user_longitude: float | None = None,
    user_locality: str | None = None,
    precomputed_signals: ServiceQuerySignals | None = None,
) -> list[ServiceCatalogItem]:
    ranked = rank_services(
        query,
        services=services,
        max_service_matches=max_service_matches,
        generic_match_tokens=generic_match_tokens,
        user_latitude=user_latitude,
        user_longitude=user_longitude,
        user_locality=user_locality,
        precomputed_signals=precomputed_signals,
    )
    return [item.service for item in ranked[:limit]]


def build_clarification_prompt(
    *,
    message: str,
    matched_services: list[ServiceCatalogItem],
    ranked_matches: list[Any],
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


# Backwards-compatible aliases for incremental migration.
_build_effective_query = build_effective_query
_recent_user_context = recent_user_context
_curate_service_matches = curate_service_matches
_filter_service_shortlist_for_category_intent = filter_service_shortlist_for_category_intent
_curate_event_matches = curate_event_matches
_should_match_services = should_match_services
_service_search_text = service_search_text
_should_request_location = should_request_location
_rank_services = rank_services
_match_services = match_services
_build_clarification_prompt = build_clarification_prompt
