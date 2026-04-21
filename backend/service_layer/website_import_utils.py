from __future__ import annotations

import json
import re
from html import unescape
from html.parser import HTMLParser
from typing import Any
from urllib.parse import parse_qs, unquote, urljoin, urlparse


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href)


class ImageExtractor(HTMLParser):
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


def extract_visible_text_from_html(html: str) -> str:
    without_scripts = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    without_styles = re.sub(r"<style[\s\S]*?</style>", " ", without_scripts, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", without_styles)
    return re.sub(r"\s+", " ", unescape(text)).strip()


def discover_related_pages(base_url: str, html: str) -> list[str]:
    extractor = LinkExtractor()
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


def discover_product_pages(base_url: str, html: str) -> list[str]:
    extractor = LinkExtractor()
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


def looks_like_url(value: str) -> bool:
    stripped = value.strip()
    if not stripped:
        return False
    if stripped.startswith(("http://", "https://")):
        return True
    return "." in stripped and " " not in stripped and "/" not in stripped[:2]


def extract_search_result_urls(html: str) -> list[str]:
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


def flatten_json_ld(value: Any) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    if isinstance(value, dict):
        objects.append(value)
        for nested in value.values():
            objects.extend(flatten_json_ld(nested))
    elif isinstance(value, list):
        for item in value:
            objects.extend(flatten_json_ld(item))
    return objects


def extract_json_ld_objects(html: str) -> list[dict[str, Any]]:
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
        objects.extend(flatten_json_ld(parsed))
    return objects


def as_text_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def coerce_price(value: Any) -> float | None:
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


def truncate_summary(text: str, limit: int = 220) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 1].rstrip()}..."


def extract_price_from_html(html: str) -> float | None:
    candidates: list[float] = []
    patterns = [
        r'"price"\s*:\s*"?(?P<price>[0-9]+(?:\.[0-9]{1,2})?)"?',
        r'product:price:amount"\s+content="(?P<price>[0-9]+(?:\.[0-9]{1,2})?)"',
        r"woocommerce-Price-amount[^>]*>\s*<bdi>(?P<price>.*?)</bdi>",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, html, flags=re.IGNORECASE | re.DOTALL):
            amount = coerce_price(match.group("price"))
            if amount is not None and amount > 0:
                candidates.append(amount)
    if not candidates:
        return None
    return min(candidates)


def extract_business_context_from_html_pages(
    html_pages: list[dict[str, str]],
    *,
    business_name: str | None = None,
) -> tuple[str | None, str | None]:
    venue_name = (business_name or "").strip() or None
    location: str | None = None
    for page in html_pages:
        text = extract_visible_text_from_html(page["html"])
        if not venue_name:
            title_match = re.search(r"<title>(.*?)</title>", page["html"], flags=re.IGNORECASE | re.DOTALL)
            if title_match:
                venue_name = re.sub(r"\s+", " ", unescape(title_match.group(1))).strip() or venue_name
        if not location:
            address_patterns = [
                r"\b\d{1,5}\s+[A-Za-z0-9 .'-]+,\s*[A-Za-z .'-]+(?:,\s*[A-Z]{2,3})?(?:\s+\d{4})?",
                r"\b(?:Perth|Sydney|Melbourne|Brisbane|Adelaide|Canberra|Hobart|Darwin)\b[^.]{0,80}",
            ]
            for pattern in address_patterns:
                match = re.search(pattern, text, flags=re.IGNORECASE)
                if match:
                    location = match.group(0).strip(" ,")
                    break
        if venue_name and location:
            break
    return venue_name, location


def looks_like_real_image_asset(url: str) -> bool:
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


def extract_preferred_image_from_html(page_url: str, html: str) -> str | None:
    extractor = ImageExtractor()
    try:
        extractor.feed(html)
    except Exception:
        return None

    for candidate in extractor.meta_images + extractor.inline_images:
        absolute = urljoin(page_url, candidate).strip()
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        if not looks_like_real_image_asset(absolute):
            continue
        return absolute
    return None


def extract_structured_services_from_html_pages(
    html_pages: list[dict[str, str]],
    *,
    business_name: str | None = None,
    category_hint: str | None = None,
) -> list[dict[str, Any]]:
    venue_name, location = extract_business_context_from_html_pages(
        html_pages,
        business_name=business_name,
    )
    items: list[dict[str, Any]] = []
    seen_names: set[str] = set()

    for page in html_pages:
        page_url = page["url"]
        fallback_price = extract_price_from_html(page["html"])
        for obj in extract_json_ld_objects(page["html"]):
            type_names = {str(type_name).lower() for type_name in as_text_list(obj.get("@type"))}
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
                amount_aud = coerce_price(offers.get("price"))
                booking_url = str(offers.get("url") or booking_url).strip() or booking_url
            elif isinstance(offers, list):
                for offer in offers:
                    if isinstance(offer, dict):
                        amount_aud = coerce_price(offer.get("price"))
                        booking_url = str(offer.get("url") or booking_url).strip() or booking_url
                        if amount_aud is not None:
                            break
            amount_aud = amount_aud if amount_aud is not None else fallback_price

            image_candidates = as_text_list(obj.get("image"))
            description = str(obj.get("description") or "").strip()
            category = str(obj.get("category") or category_hint or "").strip() or None
            keywords = as_text_list(obj.get("keywords"))
            item_tags = keywords[:6]

            items.append(
                {
                    "name": name,
                    "category": category,
                    "summary": truncate_summary(description or f"Imported from {business_name or 'merchant website'}."),
                    "amount_aud": amount_aud,
                    "currency_code": "AUD" if amount_aud is not None else None,
                    "display_price": None,
                    "duration_minutes": None,
                    "venue_name": venue_name,
                    "location": location,
                    "booking_url": booking_url,
                    "image_url": image_candidates[0] if image_candidates else extract_preferred_image_from_html(page_url, page["html"]),
                    "tags": item_tags,
                }
            )
            seen_names.add(normalized_name)
            if len(items) >= 12:
                return items

    return items


def resolve_imported_service_image(
    service: dict[str, Any],
    html_pages: list[dict[str, str]],
) -> str | None:
    current_image = str(service.get("image_url") or "").strip()
    if current_image:
        return current_image

    booking_url = str(service.get("booking_url") or "").strip().rstrip("/")
    fallback_image: str | None = None
    for page in html_pages:
        page_image = extract_preferred_image_from_html(page["url"], page["html"])
        if not page_image:
            continue
        if booking_url and booking_url == page["url"].rstrip("/"):
            return page_image
        if fallback_image is None:
            fallback_image = page_image
    return fallback_image


# Backwards-compatible aliases for legacy callers.
_LinkExtractor = LinkExtractor
_ImageExtractor = ImageExtractor
_extract_visible_text_from_html = extract_visible_text_from_html
_discover_related_pages = discover_related_pages
_discover_product_pages = discover_product_pages
_looks_like_url = looks_like_url
_extract_search_result_urls = extract_search_result_urls
_flatten_json_ld = flatten_json_ld
_extract_json_ld_objects = extract_json_ld_objects
_as_text_list = as_text_list
_coerce_price = coerce_price
_truncate_summary = truncate_summary
_extract_price_from_html = extract_price_from_html
_extract_business_context_from_html_pages = extract_business_context_from_html_pages
_looks_like_real_image_asset = looks_like_real_image_asset
_extract_preferred_image_from_html = extract_preferred_image_from_html
_extract_structured_services_from_html_pages = extract_structured_services_from_html_pages
_resolve_imported_service_image = resolve_imported_service_image
