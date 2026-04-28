"""Thin route module for the public booking stats endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from api import v1_public_stats_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-public-stats"])

router.add_api_route(
    "/public/stats/bookings",
    handlers.get_public_booking_stats,
    methods=["GET"],
)
