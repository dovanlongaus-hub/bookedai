from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata


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

CATEGORY_KEYWORDS: dict[str, set[str]] = {
    "Salon": {
        "salon", "hair", "haircut", "styling", "blow", "blowdry", "blowout", "colour", "color", "bridal", "wedding", "toc", "cat", "uon", "nhuom", "lam",
    },
    "Food and Beverage": {
        "restaurant", "table", "dining", "food", "lunch", "dinner", "brunch", "cafe", "coffee", "catering", "meal", "eat", "an", "uong", "ban", "dat", "cho", "nha", "hang", "quan", "ca", "phe", "tiec", "nhom",
    },
    "Healthcare Service": {
        "health", "healthcare", "medical", "doctor", "gp", "clinic", "physio", "physiotherapy", "injury", "shoulder", "pain", "rehab", "dental", "dentist", "teeth", "skin", "patient", "treatment", "kham", "bac", "si", "dau", "vai", "vat", "ly", "tri", "lieu",
    },
    "Kids Services": {
        "kids", "kid", "children", "child", "family", "swimming", "swim", "chess", "junior", "sport", "sports", "soccer", "football", "class", "lesson", "lessons", "after", "school", "be", "tre", "lop", "hoc", "boi", "co", "vua", "the", "thao",
    },
    "Membership and Community": {
        "membership", "member", "renew", "renewal", "signup", "sign", "join", "community", "club", "rsl", "gym", "coworking", "workspace", "hoi", "vien", "thanh", "gia", "han", "dang", "ky",
    },
    "Hospitality and Events": {
        "hotel", "room", "reservation", "stay", "accommodation", "pub", "function", "event", "party", "venue", "hospitality", "khach", "san", "phong", "su", "kien", "dia", "diem",
    },
    "Housing and Property": {
        "housing", "property", "properties", "real", "estate", "project", "projects", "apartment", "apartments", "unit", "units", "house", "home", "homes", "townhouse", "investment", "investor", "buyer", "buyers", "off", "plan", "mortgage", "suburb", "du", "an", "nha", "dat", "bat", "dong", "san", "can", "ho", "mua",
    },
    "Print and signage": {
        "print", "printing", "sign", "signage", "banner", "backdrop", "media", "wall", "booth", "expo", "display", "poster", "brochure", "flyer", "corflute", "branding", "bien", "bang", "hieu",
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
    "codex-property-project-consult": {"housing", "property", "project", "projects", "apartment", "home", "investment", "off the plan", "real estate"},
    "auzland-project-consult": {"housing", "property", "project", "projects", "townhouse", "house", "apartment", "first home", "real estate"},
}

FOLLOW_UP_CONTEXT_TOKENS = {
    "best", "better", "cheapest", "cheap", "closest", "compare", "comparison", "option", "options", "that", "those", "this", "it", "one", "ones", "which", "re", "nhat", "gan", "nhanh", "tot",
}


def tokenize_text(value: str) -> set[str]:
    normalized = unicodedata.normalize("NFKD", value.lower())
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    compact = ascii_value.replace("western sydney", "westernsydney")
    return {token for token in re.findall(r"[a-z0-9]+", compact) if token}


def extract_service_query_signals(query: str, tokens: set[str]) -> ServiceQuerySignals:
    lowered = query.lower()

    budget_max = None
    for pattern in [
        r"(?:under|below|less than|max|budget)\s*\$?\s*(\d{1,4})",
        r"\$\s*(\d{1,4})",
        r"duoi\s*(\d{1,4})",
        r"(?:gia|duoi|tam)\s*(\d{1,4})\s*(?:do|aud)?",
    ]:
        match = re.search(pattern, lowered)
        if match:
            budget_max = float(match.group(1))
            break

    group_size = None
    for pattern in [
        r"(?:for|group of|party of|table for)\s+(\d{1,2})",
        r"(\d{1,2})\s*(?:people|guests|pax|nguoi)",
        r"(?:nhom|ban|cho nhom|cho)\s*(\d{1,2})\s*(?:nguoi)?",
    ]:
        match = re.search(pattern, lowered)
        if match:
            group_size = int(match.group(1))
            break

    preferred_locations = extract_preferred_locations_from_query(query)
    prefers_fast_option = bool({"quick", "fast", "express", "quickest", "faster", "nhanh", "gap"} & tokens or {"after", "work"} <= tokens or "sau gio lam" in lowered)
    prefers_evening = bool({"tonight", "evening"} & tokens or "after work" in lowered or "tomorrow night" in lowered or "toi nay" in lowered or "buoi toi" in lowered or "chieu toi" in lowered or "sau gio lam" in lowered)
    prefers_morning = bool({"morning", "sang"} & tokens or "tomorrow morning" in lowered or "mai sang" in lowered or "buoi sang" in lowered)

    customer_types: list[str] = []
    for label, keywords in {
        "family": {"family", "kids", "children", "gia", "dinh", "be", "tre"},
        "corporate": {"corporate", "team", "office", "client", "workshop", "cong", "ty", "nhom"},
        "first_time": {"first", "new", "beginner", "lan", "dau", "moi"},
    }.items():
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


def merge_service_query_signals(primary: ServiceQuerySignals, secondary: ServiceQuerySignals) -> ServiceQuerySignals:
    return ServiceQuerySignals(
        budget_max=primary.budget_max if primary.budget_max is not None else secondary.budget_max,
        group_size=primary.group_size if primary.group_size is not None else secondary.group_size,
        preferred_locations=tuple(dict.fromkeys([*primary.preferred_locations, *secondary.preferred_locations])),
        prefers_fast_option=primary.prefers_fast_option or secondary.prefers_fast_option,
        prefers_evening=primary.prefers_evening or secondary.prefers_evening,
        prefers_morning=primary.prefers_morning or secondary.prefers_morning,
        customer_types=tuple(dict.fromkeys([*primary.customer_types, *secondary.customer_types])),
        urgency=primary.urgency or secondary.urgency,
        explicit_location_need=primary.explicit_location_need or secondary.explicit_location_need,
        follow_up_refinement=primary.follow_up_refinement or secondary.follow_up_refinement,
    )


def extract_preferred_locations_from_query(query: str) -> list[str]:
    lowered = query.lower()
    candidates: list[str] = []
    broad_location_tokens = {"australia", "australian", "nationwide", "anywhere", "across australia", "all australia"}
    known_locations = [
        "sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "gold coast", "sunshine coast", "newcastle", "wollongong", "geelong", "hobart", "darwin", "parramatta", "north parramatta", "sydney olympic park", "george street", "church street", "macquarie street", "westfield parramatta", "parramatta cbd",
    ]
    for location in known_locations:
        if location in lowered and location not in candidates:
            candidates.append(location)

    trailing_stopwords = {"today", "tomorrow", "tonight", "please", "now", "for", "with", "under", "after", "before", "this", "next", "week", "weekend"}
    for pattern in [r"(?:in|near|around|at|close to|within)\s+([a-z][a-z0-9\s-]{2,40})", r"(?:o|gan|tai)\s+([a-z][a-z0-9\s-]{2,40})"]:
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
            if len(candidate) < 3 or candidate in candidates or candidate in broad_location_tokens:
                continue
            candidates.append(candidate)

    return [candidate for candidate in candidates if candidate not in broad_location_tokens]


# Backwards-compatible aliases for legacy callers.
_extract_service_query_signals = extract_service_query_signals
_merge_service_query_signals = merge_service_query_signals
_extract_preferred_locations_from_query = extract_preferred_locations_from_query
