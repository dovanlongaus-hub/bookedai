from __future__ import annotations

import math
import os
import re
from typing import Any
from urllib.parse import quote, urlencode

import httpx


def build_google_maps_url(*parts: str | None) -> str | None:
    query = ", ".join(part.strip() for part in parts if part and part.strip())
    if not query:
        return None
    return f"https://www.google.com/maps/search/?api=1&query={quote(query)}"


def build_map_snapshot_url(
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


async def geocode_place_query(
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


def build_geocode_query(*parts: str | None) -> str:
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


def haversine_km(
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


# Backwards-compatible aliases for legacy callers.
_build_google_maps_url = build_google_maps_url
_build_map_snapshot_url = build_map_snapshot_url
_geocode_place_query = geocode_place_query
_build_geocode_query = build_geocode_query
_haversine_km = haversine_km
