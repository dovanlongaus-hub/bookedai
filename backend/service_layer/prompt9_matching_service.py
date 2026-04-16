from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

from db import ServiceMerchantProfile


@dataclass(frozen=True)
class RankedServiceMatch:
    service: ServiceMerchantProfile
    score: float
    explanation: str
    trust_signal: str
    is_preferred: bool
    evidence: tuple[str, ...]
    semantic_score: float | None = None
    semantic_reason: str | None = None


MATCH_INTENT_EVIDENCE = {
    "exact_name_phrase",
    "exact_provider_phrase",
    "exact_summary_phrase",
    "all_terms_in_name",
    "all_terms_in_catalog",
    "name_overlap",
    "category_overlap",
    "summary_overlap",
    "tag_overlap",
    "category_preference_match",
    "requested_service_match",
}

NON_TOPIC_TERMS = {
    "a",
    "an",
    "and",
    "at",
    "book",
    "booking",
    "for",
    "from",
    "in",
    "near",
    "of",
    "on",
    "or",
    "the",
    "to",
    "under",
    "with",
}

TOPIC_SYNONYM_GROUPS: tuple[set[str], ...] = (
    {"facial", "facials", "spa", "beauty", "skincare", "skin", "glow", "led"},
    {"hair", "haircut", "colour", "color", "salon", "styling"},
    {"physio", "physiotherapy", "physical", "therapy", "rehab", "rehabilitation"},
    {"restaurant", "dining", "dinner", "table", "cafe", "private", "group"},
    {"venue", "function", "party", "event"},
    {"membership", "member", "renew", "renewal", "signup", "join"},
    {"housing", "property", "project", "apartment", "townhouse", "home", "estate", "investment"},
    {"signage", "printing", "print", "expo", "booth", "banner"},
)


def _normalized_terms(value: str | None) -> set[str]:
    normalized = re.sub(r"[^a-z0-9]+", " ", (value or "").lower())
    return {term for term in normalized.split() if term}


def _topical_terms(query: str | None, *, location_hint: str | None = None) -> set[str]:
    query_terms = _normalized_terms(query)
    location_terms = _normalized_terms(location_hint)
    topical_terms = {
        term
        for term in query_terms
        if term not in location_terms and term not in NON_TOPIC_TERMS and not term.isdigit()
    }
    return expand_topic_terms(topical_terms)


def expand_topic_terms(terms: set[str]) -> set[str]:
    expanded_terms = set(terms)
    for group in TOPIC_SYNONYM_GROUPS:
        if expanded_terms & group:
            expanded_terms |= group
    return expanded_terms


def _string_or_none(value: str | None) -> str | None:
    normalized = (value or "").strip()
    return normalized or None


def _extract_budget_limit(budget: dict[str, Any] | None) -> float | None:
    if not budget:
        return None

    for key in ("max_aud", "max", "upper", "amount"):
        value = budget.get(key)
        if value in {None, ""}:
            continue
        try:
            amount = float(value)
        except (TypeError, ValueError):
            continue
        if amount > 0:
            return amount
    return None


def _determine_trust_signal(service: ServiceMerchantProfile, score: float) -> str:
    if getattr(service, "booking_url", None):
        return "partner_verified" if score >= 0.7 else "partner_routed"
    if getattr(service, "featured", 0):
        return "featured_catalog"
    if score >= 0.7:
        return "strong_catalog_match"
    if score >= 0.45:
        return "review_recommended"
    return "low_confidence_catalog"


def _has_intent_evidence(match: RankedServiceMatch) -> bool:
    return any(item in MATCH_INTENT_EVIDENCE for item in match.evidence)


def filter_ranked_matches_for_relevance(
    ranked_matches: list[RankedServiceMatch],
    *,
    semantic_applied: bool,
    require_location_match: bool = False,
) -> list[RankedServiceMatch]:
    filtered: list[RankedServiceMatch] = []
    for match in ranked_matches:
        has_intent_evidence = _has_intent_evidence(match)
        semantic_score = match.semantic_score if match.semantic_score is not None else None
        intent_mismatch = "intent_mismatch" in match.evidence
        topic_mismatch = "topic_mismatch" in match.evidence
        location_mismatch = "location_mismatch" in match.evidence

        if require_location_match and location_mismatch:
            continue

        if semantic_applied:
            if topic_mismatch:
                continue
            if semantic_score is not None and semantic_score < 0.2:
                continue
            if semantic_score is not None and semantic_score < 0.35 and not has_intent_evidence:
                continue
            if semantic_score is not None and semantic_score < 0.5 and intent_mismatch:
                continue
        else:
            if topic_mismatch:
                continue
            if intent_mismatch and match.score < 0.25:
                continue

        if not has_intent_evidence and match.score < 0.2:
            continue

        filtered.append(match)

    return filtered


def rank_catalog_matches(
    *,
    query: str,
    services: list[ServiceMerchantProfile],
    location_hint: str | None = None,
    requested_service_id: str | None = None,
    requested_category: str | None = None,
    budget: dict[str, Any] | None = None,
) -> list[RankedServiceMatch]:
    normalized_query = " ".join((query or "").strip().lower().split())
    query_terms = _normalized_terms(query)
    topical_terms = _topical_terms(query, location_hint=location_hint)
    location_terms = _normalized_terms(location_hint)
    category_terms = _normalized_terms(requested_category)
    budget_limit = _extract_budget_limit(budget)
    requested_service_id_normalized = (requested_service_id or "").strip().lower()

    ranked: list[RankedServiceMatch] = []
    for service in services:
        score = 0.12
        reasons: list[str] = []
        evidence: list[str] = []
        service_name = _string_or_none(getattr(service, "name", None)) or ""
        business_name = _string_or_none(getattr(service, "business_name", None)) or ""
        summary = _string_or_none(getattr(service, "summary", None)) or ""
        venue_name = _string_or_none(getattr(service, "venue_name", None)) or ""
        location = _string_or_none(getattr(service, "location", None)) or ""
        tags = [str(tag).strip() for tag in (getattr(service, "tags_json", None) or []) if str(tag).strip()]
        service_terms = _normalized_terms(service_name)
        business_terms = _normalized_terms(business_name)
        summary_terms = _normalized_terms(summary)
        venue_terms = _normalized_terms(venue_name)
        tags_terms = {term for tag in tags for term in _normalized_terms(tag)}
        category_value = _string_or_none(getattr(service, "category", None))
        category_service_terms = _normalized_terms(category_value)
        location_service_terms = _normalized_terms(location) | venue_terms

        overlap_name = len(topical_terms & service_terms)
        overlap_business = len(topical_terms & business_terms)
        overlap_summary = len(topical_terms & summary_terms)
        overlap_tags = len(topical_terms & tags_terms)
        overlap_category = len(topical_terms & category_service_terms)
        overlap_location = len(location_terms & location_service_terms)
        preference_overlap = len(category_terms & category_service_terms)
        phrase_in_name = bool(normalized_query and normalized_query in service_name.lower())
        phrase_in_summary = bool(normalized_query and normalized_query in summary.lower())
        phrase_in_business = bool(normalized_query and normalized_query in business_name.lower())
        all_terms_in_name = bool(topical_terms) and topical_terms <= service_terms
        all_terms_in_service = bool(topical_terms) and topical_terms <= (
            service_terms | category_service_terms | summary_terms | tags_terms
        )

        score += min(0.42, overlap_name * 0.14)
        score += min(0.18, overlap_business * 0.06)
        score += min(0.16, overlap_summary * 0.04)
        score += min(0.12, overlap_tags * 0.06)
        score += min(0.16, overlap_category * 0.08)
        score += min(0.08, overlap_location * 0.04)
        score += min(0.12, preference_overlap * 0.06)

        if phrase_in_name:
            score += 0.2
            reasons.append("Exact query phrase appears in the service name.")
            evidence.append("exact_name_phrase")
        elif phrase_in_business:
            score += 0.1
            reasons.append("Exact query phrase appears in the provider name.")
            evidence.append("exact_provider_phrase")
        elif phrase_in_summary:
            score += 0.08
            reasons.append("Exact query phrase appears in the service summary.")
            evidence.append("exact_summary_phrase")

        if all_terms_in_name:
            score += 0.1
            reasons.append("All query terms are covered by the service name.")
            evidence.append("all_terms_in_name")
        elif all_terms_in_service:
            score += 0.06
            reasons.append("All query terms are covered by the catalog metadata.")
            evidence.append("all_terms_in_catalog")

        if getattr(service, "featured", 0):
            score += 0.04
            reasons.append("Featured catalog listing.")
            evidence.append("featured")

        service_id = str(getattr(service, "service_id", "") or "")
        if requested_service_id_normalized and service_id.lower() == requested_service_id_normalized:
            score += 0.22
            reasons.append("Matches the currently selected service.")
            evidence.append("requested_service_match")

        if overlap_name:
            reasons.append("Query matches the service name.")
            evidence.append("name_overlap")
        elif overlap_category:
            reasons.append("Query aligns with the catalog category.")
            evidence.append("category_overlap")
        elif overlap_summary:
            reasons.append("Query overlaps with the service summary.")
            evidence.append("summary_overlap")
        elif overlap_tags:
            reasons.append("Query aligns with the service tags.")
            evidence.append("tag_overlap")

        if overlap_location:
            reasons.append("Location hint aligns with the venue or suburb.")
            evidence.append("location_overlap")
        elif location_terms:
            score -= 0.12
            reasons.append("Location hint does not align with the venue or suburb.")
            evidence.append("location_mismatch")

        if category_value and preference_overlap:
            reasons.append("Matches the requested service category.")
            evidence.append("category_preference_match")

        intent_overlap = overlap_name + overlap_business + overlap_summary + overlap_tags + overlap_category
        if query_terms and not phrase_in_name and not phrase_in_business and not phrase_in_summary and intent_overlap == 0:
            score -= 0.18
            reasons.append("Catalog metadata does not strongly match the requested service intent.")
            evidence.append("intent_mismatch")
        if topical_terms and intent_overlap == 0:
            score -= 0.28
            reasons.append("Catalog metadata does not match the requested topic closely enough.")
            evidence.append("topic_mismatch")

        amount_aud = getattr(service, "amount_aud", None)
        if budget_limit is not None and amount_aud is not None:
            if amount_aud <= budget_limit:
                score += 0.08
                reasons.append("Estimated price fits within the stated budget.")
                evidence.append("within_budget")
            else:
                score -= 0.06
                reasons.append("Estimated price sits above the stated budget.")
                evidence.append("over_budget")

        if getattr(service, "booking_url", None):
            score += 0.03
            reasons.append("Has a direct partner booking path.")
            evidence.append("direct_booking_path")

        trust_signal = _determine_trust_signal(service, score)

        ranked.append(
            RankedServiceMatch(
                service=service,
                score=max(0.0, min(score, 0.99)),
                explanation=" ".join(dict.fromkeys(reasons)) or "Catalog candidate with baseline relevance.",
                trust_signal=trust_signal,
                is_preferred=bool(requested_service_id_normalized and service_id.lower() == requested_service_id_normalized),
                evidence=tuple(dict.fromkeys(evidence)),
            )
        )

    ranked.sort(
        key=lambda item: (
            item.score,
            1 if getattr(item.service, "booking_url", None) else 0,
            getattr(item.service, "featured", 0),
            -(getattr(item.service, "amount_aud", 0) or 0),
        ),
        reverse=True,
    )
    return ranked


def build_booking_trust_payload(
    service: ServiceMerchantProfile | None,
    *,
    party_size: int | None = None,
    desired_date: str | None = None,
    desired_time: str | None = None,
) -> tuple[str, bool, str, list[str], bool, str]:
    if not service:
        return (
            "availability_unknown",
            False,
            "request_callback",
            ["Candidate not found."],
            False,
            "low",
        )

    warnings: list[str] = []
    if desired_date and desired_time:
        warnings.append("Availability is estimated from catalog metadata until provider verification is connected.")

    if party_size and party_size > 6:
        warnings.append("Large party sizes should be confirmed manually before payment.")

    if service.booking_url:
        return (
            "partner_booking_only",
            True,
            "book_on_partner_site",
            warnings,
            False,
            "high" if service.featured else "medium",
        )

    if service.category and service.category.lower() in {"event", "events", "venue", "private dining"}:
        warnings.append("Event and venue bookings usually require manual confirmation.")
        return (
            "needs_manual_confirmation",
            False,
            "request_callback",
            warnings,
            False,
            "medium",
        )

    return (
        "availability_unverified",
        False,
        "request_callback",
        warnings,
        True,
        "medium" if service.featured else "low",
    )


def resolve_booking_path_policy(
    *,
    availability_state: str,
    booking_confidence: str,
    payment_option: str | None,
    context: dict[str, object | None] | None = None,
) -> tuple[str, str, list[str], bool]:
    warnings: list[str] = []
    context = context or {}
    party_size = int(context.get("party_size") or 0) if str(context.get("party_size") or "").isdigit() else 0

    if availability_state == "partner_booking_only":
        return (
            "book_on_partner_site",
            "Redirect the customer to the partner booking flow and keep BookedAI advisory only.",
            warnings,
            False,
        )

    if availability_state in {"needs_manual_confirmation", "availability_unknown"}:
        warnings.append("Manual confirmation is required before committing to a slot.")
        return (
            "request_callback",
            "Escalate to operator review or provider follow-up before taking payment.",
            warnings,
            False,
        )

    if party_size and party_size > 6:
        warnings.append("Large party size should be confirmed manually.")
        return (
            "request_callback",
            "Route to a callback path so an operator can confirm capacity and policy constraints.",
            warnings,
            False,
        )

    if booking_confidence in {"low", "unverified"}:
        warnings.append("Confidence is too weak for an instant-book commitment.")
        return (
            "request_callback",
            "Collect more context or escalate to human review before committing the booking.",
            warnings,
            False,
        )

    if availability_state in {"available", "limited_availability", "temporarily_held"}:
        payment_allowed = payment_option in {None, "", "stripe_card", "bank_transfer", "bank_transfer_qr"}
        if not payment_allowed:
            warnings.append("Selected payment option is not ready for immediate confirmation.")
        return (
            "instant_book",
            "Continue to confirm slot and create a payment intent.",
            warnings,
            payment_allowed,
        )

    warnings.append("No safe booking path could be resolved automatically.")
    return (
        "request_callback",
        "Escalate to manual follow-up because the booking path is still uncertain.",
        warnings,
        False,
    )
