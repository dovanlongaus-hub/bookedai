from __future__ import annotations

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
