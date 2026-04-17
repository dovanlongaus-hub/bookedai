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


@dataclass(frozen=True)
class BookingRequestContext:
    party_size: int | None
    requested_date: str | None
    requested_time: str | None
    schedule_hint: str | None
    intent_label: str | None
    summary: str | None
    near_me_requested: bool = False
    is_chat_style: bool = False


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

LOCATION_ALIASES = {
    "sydney": "Sydney",
    "sydney cbd": "Sydney CBD",
    "melbourne": "Melbourne",
    "melbourne cbd": "Melbourne CBD",
    "brisbane": "Brisbane",
    "brisbane city": "Brisbane City",
    "brisbane cbd": "Brisbane CBD",
    "perth": "Perth",
    "perth cbd": "Perth CBD",
    "adelaide": "Adelaide",
    "canberra": "Canberra",
    "gold coast": "Gold Coast",
    "sunshine coast": "Sunshine Coast",
    "newcastle": "Newcastle",
    "wollongong": "Wollongong",
    "hobart": "Hobart",
    "darwin": "Darwin",
    "geelong": "Geelong",
    "townsville": "Townsville",
    "cairns": "Cairns",
    "castle hill": "Castle Hill",
    "fortitude valley": "Fortitude Valley",
    "james street": "James Street",
    "parramatta": "Parramatta",
    "paddington": "Paddington",
    "surry hills": "Surry Hills",
    "south bank": "South Bank",
    "southbank": "Southbank",
    "olympic park": "Sydney Olympic Park",
    "north sydney": "North Sydney",
    "manly": "Manly",
    "bondi": "Bondi",
    "bondi junction": "Bondi Junction",
    "chatswood": "Chatswood",
    "hornsby": "Hornsby",
    "penrith": "Penrith",
    "liverpool": "Liverpool",
    "blacktown": "Blacktown",
    "cronulla": "Cronulla",
    "st leonards": "St Leonards",
    "neutral bay": "Neutral Bay",
    "mosman": "Mosman",
    "newtown": "Newtown",
    "glebe": "Glebe",
    "pyrmont": "Pyrmont",
    "darlinghurst": "Darlinghurst",
    "chippendale": "Chippendale",
    "redfern": "Redfern",
    "zetland": "Zetland",
    "mascot": "Mascot",
    "st kilda": "St Kilda",
    "fitzroy": "Fitzroy",
    "collingwood": "Collingwood",
    "richmond": "Richmond",
    "brunswick": "Brunswick",
    "footscray": "Footscray",
    "hawthorn": "Hawthorn",
    "prahran": "Prahran",
    "south yarra": "South Yarra",
    "toorak": "Toorak",
    "new farm": "New Farm",
    "west end": "West End",
    "spring hill": "Spring Hill",
    "kangaroo point": "Kangaroo Point",
    "chermside": "Chermside",
    "indooroopilly": "Indooroopilly",
    "surfers paradise": "Surfers Paradise",
    "broadbeach": "Broadbeach",
    "burleigh heads": "Burleigh Heads",
    "noosa": "Noosa",
    "caloundra": "Caloundra",
}

LOCATION_SIGNAL_GROUPS: dict[str, set[str]] = {
    "sydney": {
        "sydney",
        "sydney cbd",
        "cbd",
        "paddington",
        "surry hills",
        "parramatta",
        "sydney olympic park",
        "olympic park",
        "western sydney",
        "north sydney",
        "manly",
        "bondi",
        "bondi junction",
        "chatswood",
        "hornsby",
        "penrith",
        "liverpool",
        "blacktown",
        "cronulla",
        "st leonards",
        "neutral bay",
        "mosman",
        "newtown",
        "glebe",
        "pyrmont",
        "darlinghurst",
        "chippendale",
        "redfern",
        "zetland",
        "mascot",
        "castle hill",
    },
    "melbourne": {
        "melbourne",
        "melbourne cbd",
        "southbank",
        "south bank melbourne",
        "collins street",
        "st kilda",
        "fitzroy",
        "collingwood",
        "richmond",
        "brunswick",
        "footscray",
        "hawthorn",
        "prahran",
        "south yarra",
        "toorak",
    },
    "brisbane": {
        "brisbane",
        "brisbane city",
        "brisbane cbd",
        "south bank brisbane",
        "south bank",
        "fortitude valley",
        "james street",
        "new farm",
        "west end",
        "spring hill",
        "kangaroo point",
        "chermside",
        "indooroopilly",
    },
    "gold coast": {
        "gold coast",
        "surfers paradise",
        "broadbeach",
        "burleigh heads",
        "robina",
        "southport",
        "coolangatta",
    },
    "sunshine coast": {
        "sunshine coast",
        "noosa",
        "caloundra",
        "maroochydore",
        "mooloolaba",
    },
    "perth": {
        "perth",
        "perth cbd",
        "fremantle",
        "subiaco",
        "cottesloe",
        "scarborough",
        "joondalup",
        "cannington",
    },
    "adelaide": {
        "adelaide",
        "adelaide cbd",
        "norwood",
        "glenelg",
        "unley",
    },
    "canberra": {
        "canberra",
        "act",
        "belconnen",
        "woden",
        "tuggeranong",
        "gungahlin",
    },
    "wollongong": {
        "wollongong",
        "illawarra",
        "wollongong cbd",
    },
    "newcastle": {
        "newcastle",
        "newcastle cbd",
        "hunter valley",
        "maitland",
        "cessnock",
    },
}

TOPIC_PHRASE_SYNONYMS: dict[str, set[str]] = {
    "skin care": {"skincare", "skin", "facial", "spa", "beauty"},
    "skin treatment": {"skincare", "skin", "facial", "spa", "beauty"},
    "private dining": {"private", "dining", "dinner", "restaurant", "group", "table"},
    "team dinner": {"team", "dinner", "dining", "restaurant", "group", "table"},
    "team lunch": {"team", "lunch", "dining", "restaurant", "group", "table"},
    "group dinner": {"group", "dinner", "dining", "restaurant", "table"},
    "membership renewal": {"membership", "member", "renew", "renewal", "signup", "join"},
    "member renewal": {"membership", "member", "renew", "renewal", "signup", "join"},
    "sign printing": {"signage", "print", "printing", "banner", "expo", "booth"},
    "event signage": {"signage", "print", "printing", "banner", "expo", "booth"},
    "expo printing": {"signage", "print", "printing", "banner", "expo", "booth"},
    "a frame signage": {"signage", "sign", "frame", "banner"},
    "pavement sign": {"signage", "sign", "frame", "banner"},
    "bridal hair": {"hair", "haircut", "salon", "bridal", "wedding", "styling"},
    "wedding hair": {"hair", "haircut", "salon", "bridal", "wedding", "styling"},
    "hair styling": {"hair", "haircut", "salon", "styling", "colour", "color"},
    "skin clinic": {"skin", "facial", "spa", "beauty", "treatment"},
    "gp clinic": {"gp", "doctor", "medical", "clinic", "consultation"},
    "medical clinic": {"gp", "doctor", "medical", "clinic", "consultation"},
    # Chat-style natural language patterns
    "looking for": set(),  # intent marker only, no expansion
    "need a massage": {"massage", "remedial", "relaxation", "therapy", "spa"},
    "need a facial": {"facial", "skincare", "beauty", "spa", "treatment"},
    "want a haircut": {"hair", "haircut", "salon", "barber", "cut"},
    "get a haircut": {"hair", "haircut", "salon", "barber", "cut"},
    "something to eat": {"restaurant", "dining", "dinner", "lunch", "cafe", "food"},
    "place to eat": {"restaurant", "dining", "dinner", "lunch", "cafe", "food"},
    "good restaurant": {"restaurant", "dining", "dinner", "lunch", "cafe"},
    "beauty treatment": {"beauty", "facial", "spa", "skincare", "treatment", "glow"},
    "pampering session": {"spa", "facial", "massage", "beauty", "treatment", "glow"},
    "relaxation massage": {"massage", "remedial", "relaxation", "therapy", "spa"},
    "sports massage": {"massage", "remedial", "sports", "therapy", "physio"},
    "deep tissue": {"massage", "remedial", "deep tissue", "therapy"},
    "hair colour": {"hair", "colour", "color", "salon", "highlights", "balayage"},
    "hair color": {"hair", "colour", "color", "salon", "highlights", "balayage"},
    "nail appointment": {"nail", "nails", "manicure", "pedicure", "beauty"},
    "nail salon": {"nail", "nails", "manicure", "pedicure", "beauty"},
    "manicure pedicure": {"nail", "nails", "manicure", "pedicure", "beauty"},
    "teeth whitening": {"teeth", "whitening", "dental", "smile", "cosmetic"},
    "dental checkup": {"dental", "dentist", "checkup", "oral", "teeth"},
    "personal training": {"personal", "trainer", "training", "fitness", "gym", "workout"},
    "personal trainer": {"personal", "trainer", "training", "fitness", "gym"},
    "pilates class": {"pilates", "yoga", "fitness", "class", "studio"},
    "yoga class": {"yoga", "pilates", "fitness", "class", "studio", "wellness"},
    "gym membership": {"gym", "fitness", "membership", "workout", "training"},
    "brow lamination": {"brow", "eyebrow", "lamination", "beauty", "wax"},
    "lash lift": {"lash", "eyelash", "lift", "beauty", "extensions"},
    "eyelash extensions": {"lash", "eyelash", "extensions", "beauty"},
    "spray tan": {"tan", "spray", "beauty", "tanning"},
    "wax appointment": {"wax", "waxing", "beauty", "hair removal"},
    "laser hair removal": {"laser", "hair removal", "beauty", "ipl"},
    "photo shoot": {"photo", "photography", "shoot", "portrait", "headshot"},
    "photography session": {"photo", "photography", "shoot", "portrait"},
    "function venue": {"venue", "function", "event", "party", "hire"},
    "event space": {"venue", "event", "function", "space", "hire"},
    "party venue": {"venue", "party", "function", "event", "hire"},
    "birthday party": {"birthday", "party", "venue", "function", "event"},
    "corporate event": {"corporate", "event", "venue", "function", "conference"},
    "osteopath appointment": {"osteo", "osteopath", "therapy", "rehab", "clinic"},
    "chiropractic": {"chiro", "chiropractor", "spine", "therapy", "rehab"},
    "physio appointment": {"physio", "physiotherapy", "therapy", "rehab", "clinic"},
    "acupuncture": {"acupuncture", "tcm", "therapy", "wellness", "holistic"},
    "naturopath": {"naturopath", "holistic", "wellness", "natural", "therapy"},
    "psychology appointment": {"psychology", "psychologist", "mental health", "therapy", "counselling"},
    "counselling": {"counselling", "counselor", "mental health", "therapy", "psychology"},
    "life coaching": {"coaching", "coach", "life coach", "wellness", "mindset"},
    "property consultation": {"property", "real estate", "investment", "consultation"},
    "financial advice": {"financial", "finance", "advice", "planning", "investment"},
}

TOPIC_SYNONYM_GROUPS: tuple[set[str], ...] = (
    {"facial", "facials", "spa", "beauty", "skincare", "skin", "glow", "led", "pampering"},
    {"hair", "haircut", "haircuts", "colour", "color", "salon", "styling", "bridal", "wedding", "barber", "balayage", "highlights"},
    {"massage", "remedial", "relaxation", "sports massage", "deep tissue", "swedish"},
    {"nail", "nails", "manicure", "pedicure", "gel", "shellac"},
    {"lash", "eyelash", "brow", "eyebrow", "lamination", "extensions", "lift"},
    {"tan", "tanning", "spray tan", "sunless"},
    {"wax", "waxing", "ipl", "laser", "hair removal"},
    {"physio", "physiotherapy", "physical", "therapy", "rehab", "rehabilitation", "osteo", "osteopath", "chiro", "chiropractor"},
    {"yoga", "pilates", "fitness", "gym", "workout", "studio", "class", "training"},
    {"personal", "trainer", "personal trainer", "pt"},
    {"gp", "doctor", "medical", "clinic", "consultation", "dental", "dentist", "teeth"},
    {"psychology", "psychologist", "counselling", "counselor", "mental health", "therapy", "coaching"},
    {"acupuncture", "naturopath", "holistic", "wellness", "natural", "tcm"},
    {"restaurant", "dining", "dinner", "table", "cafe", "private", "group", "food", "lunch"},
    {"venue", "function", "party", "event", "hire", "space"},
    {"membership", "member", "renew", "renewal", "signup", "join"},
    {"housing", "property", "project", "apartment", "townhouse", "home", "estate", "investment"},
    {"signage", "sign", "banner", "frame", "expo", "booth", "media", "wall"},
    {"photo", "photography", "shoot", "portrait", "headshot", "photographer"},
    {"teeth", "whitening", "dental", "dentist", "smile", "cosmetic"},
    {"financial", "finance", "advice", "planning", "investment", "mortgage"},
    {"corporate", "conference", "meeting", "workshop", "seminar"},
)

_NEAR_ME_PATTERNS = re.compile(
    r"\b(near me|nearby|close to me|around me|around here|in my area|close by|near here|"
    r"within walking distance|close enough|my location|current location)\b",
    re.IGNORECASE,
)

_CHAT_STYLE_MARKERS = re.compile(
    r"\b(i need|i want|i am looking|i'm looking|looking for|can you|do you have|"
    r"recommend|suggest|help me|where can i|what is|whats the best|best|"
    r"any good|something for|good place|please|thanks|thank you)\b",
    re.IGNORECASE,
)


def is_near_me_requested(query: str | None) -> bool:
    if not query:
        return False
    return bool(_NEAR_ME_PATTERNS.search(query))


def is_chat_style_query(query: str | None) -> bool:
    if not query:
        return False
    words = query.split()
    if len(words) >= 5:
        return True
    return bool(_CHAT_STYLE_MARKERS.search(query))


def _normalized_terms(value: str | None) -> set[str]:
    normalized = re.sub(r"[^a-z0-9]+", " ", (value or "").lower())
    return {term for term in normalized.split() if term}


def _normalized_text(value: str | None) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).split())


def expand_location_terms(terms: set[str], *, text: str | None = None) -> set[str]:
    expanded_terms = set(terms)
    normalized_text = _normalized_text(text)
    for canonical, aliases in LOCATION_SIGNAL_GROUPS.items():
        alias_hit = any(
            re.search(rf"(^| )({re.escape(alias)})( |$)", normalized_text)
            for alias in aliases
        ) if normalized_text else False
        if alias_hit or canonical in expanded_terms:
            expanded_terms.add(canonical)
    return expanded_terms


def _location_signals(value: str | None) -> set[str]:
    terms = set(_normalized_terms(value))
    normalized_text = _normalized_text(value)
    for canonical, aliases in LOCATION_SIGNAL_GROUPS.items():
        alias_hit = any(
            re.search(rf"(^| )({re.escape(alias)})( |$)", normalized_text)
            for alias in aliases
        ) if normalized_text else False
        if alias_hit or canonical in terms:
            terms.add(f"metro:{canonical}")
    return terms


def extract_query_location_hint(query: str | None, location_hint: str | None = None) -> str | None:
    explicit_location = _string_or_none(location_hint)
    if explicit_location:
        return explicit_location

    normalized_query = _normalized_text(query)
    if not normalized_query:
        return None

    for phrase, canonical in sorted(LOCATION_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        if re.search(rf"(^| )({re.escape(phrase)})( |$)", normalized_query):
            return canonical
    return None


def extract_query_budget_limit(query: str | None, budget: dict[str, Any] | None = None) -> float | None:
    explicit_budget_limit = _extract_budget_limit(budget)
    if explicit_budget_limit is not None:
        return explicit_budget_limit

    normalized_query = _normalized_text(query)
    if not normalized_query:
        return None

    patterns = (
        r"(?:under|below|less than|max|up to|within)\s+\$?\s*(\d+(?:\.\d+)?)",
        r"\$?\s*(\d+(?:\.\d+)?)\s*(?:or less|and under|maximum)",
    )
    for pattern in patterns:
        match = re.search(pattern, normalized_query)
        if not match:
            continue
        try:
            amount = float(match.group(1))
        except (TypeError, ValueError):
            continue
        if amount > 0:
            return amount
    return None


def extract_booking_request_context(
    query: str | None,
    time_window: dict[str, Any] | None = None,
) -> BookingRequestContext:
    normalized_query = _normalized_text(query)
    if not normalized_query and not time_window:
        return BookingRequestContext(
            party_size=None,
            requested_date=None,
            requested_time=None,
            schedule_hint=None,
            intent_label=None,
            summary=None,
        )

    requested_date = _string_or_none(str((time_window or {}).get("date") or ""))
    requested_time = _string_or_none(str((time_window or {}).get("time") or ""))
    schedule_hint = _string_or_none(str((time_window or {}).get("label") or ""))
    party_size: int | None = None
    intent_label: str | None = None

    party_match = re.search(
        r"(?:for|party of)\s+(\d{1,2})(?:\s+(?:people|guests|adults|kids|children|persons))?|(\d{1,2})\s+(?:people|guests|adults|kids|children|persons)",
        normalized_query,
    )
    if party_match:
        for index in (1, 2):
            value = party_match.group(index)
            if value and value.isdigit():
                parsed_party_size = int(value)
                if parsed_party_size > 0:
                    party_size = parsed_party_size
                break

    if "tonight" in normalized_query:
        schedule_hint = schedule_hint or "tonight"
    elif "tomorrow" in normalized_query:
        schedule_hint = schedule_hint or "tomorrow"
    elif "this weekend" in normalized_query or "weekend" in normalized_query:
        schedule_hint = schedule_hint or "this weekend"

    if not requested_time:
        for label in ("morning", "afternoon", "evening"):
            if label in normalized_query:
                requested_time = label
                break

    if any(term in normalized_query for term in {"book", "booking", "reserve", "reservation"}):
        intent_label = "ready_to_book"
    elif any(term in normalized_query for term in {"consult", "consultation", "call", "quote"}):
        intent_label = "consultation"
    elif any(term in normalized_query for term in {"compare", "options"}):
        intent_label = "compare_options"
    elif any(term in normalized_query for term in {"recommend", "suggest", "best", "good", "looking for", "need", "want"}):
        intent_label = "recommendation_request"

    near_me = is_near_me_requested(query)
    chat_style = is_chat_style_query(query)

    summary_parts: list[str] = []
    if near_me:
        summary_parts.append("near user location")
    if party_size:
        summary_parts.append(f"for {party_size}")
    if schedule_hint:
        summary_parts.append(schedule_hint)
    elif requested_date or requested_time:
        summary_parts.append("at requested time")
    if intent_label == "consultation":
        summary_parts.append("consultation flow")
    elif intent_label == "ready_to_book":
        summary_parts.append("booking-ready")
    elif intent_label == "compare_options":
        summary_parts.append("compare-first")
    elif intent_label == "recommendation_request":
        summary_parts.append("recommendation")

    return BookingRequestContext(
        party_size=party_size,
        requested_date=requested_date,
        requested_time=requested_time,
        schedule_hint=schedule_hint,
        intent_label=intent_label,
        summary=", ".join(summary_parts) or None,
        near_me_requested=near_me,
        is_chat_style=chat_style,
    )


def _topical_terms(query: str | None, *, location_hint: str | None = None) -> set[str]:
    query_terms = _normalized_terms(query)
    location_terms = _location_signals(extract_query_location_hint(query, location_hint))
    topical_terms = {
        term
        for term in query_terms
        if term not in location_terms and term not in NON_TOPIC_TERMS and not term.isdigit()
    }
    return expand_topic_terms(topical_terms, query=query)


def expand_topic_terms(terms: set[str], *, query: str | None = None) -> set[str]:
    expanded_terms = set(terms)
    normalized_query = _normalized_text(query)
    if normalized_query:
        for phrase, phrase_terms in TOPIC_PHRASE_SYNONYMS.items():
            if re.search(rf"(^| )({re.escape(phrase)})( |$)", normalized_query):
                expanded_terms |= phrase_terms
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
    effective_location_hint = extract_query_location_hint(query, location_hint)
    topical_terms = _topical_terms(query, location_hint=effective_location_hint)
    location_terms = _location_signals(effective_location_hint)
    category_terms = _normalized_terms(requested_category)
    budget_limit = extract_query_budget_limit(query, budget)
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
        location_service_terms = _location_signals(location) | _location_signals(venue_name)

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
    category_value = _string_or_none(getattr(service, "category", None))
    featured = bool(getattr(service, "featured", 0))
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
            "high" if featured else "medium",
        )

    if category_value and category_value.lower() in {"event", "events", "venue", "private dining"}:
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
        "medium" if featured else "low",
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
            "Redirect the customer to the partner booking flow and keep Bookedai.au advisory only.",
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
