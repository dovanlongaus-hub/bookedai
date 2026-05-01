"""Route registrations for the customer-facing booking lifecycle endpoints.

Mounts the cancel / reschedule / status handlers from
:mod:`api.v1_booking_lifecycle_handlers` under ``/api/v1/booking/...``.
"""

from fastapi import APIRouter

from api import v1_booking_lifecycle_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-booking-lifecycle"])

router.add_api_route(
    "/booking/{booking_reference}/cancel",
    handlers.cancel_booking,
    methods=["POST"],
)
router.add_api_route(
    "/booking/{booking_reference}/reschedule",
    handlers.reschedule_booking,
    methods=["PATCH"],
)
router.add_api_route(
    "/booking/{booking_reference}/status",
    handlers.get_booking_status,
    methods=["GET"],
)
