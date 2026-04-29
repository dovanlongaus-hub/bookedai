"""Route registrations for the public order detail + wallet pass endpoints.

These routes back the chess.bookedai.au + portal.bookedai.au order
confirmation flow. ``order_reference`` is treated as the security token
(the lookup is public, no auth header required) — it must be opaque +
unguessable in URLs / emails.
"""

from fastapi import APIRouter

from api import v1_orders_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-orders"])

router.add_api_route(
    "/orders/{order_reference}",
    handlers.get_order,
    methods=["GET"],
)
router.add_api_route(
    "/orders/{order_reference}/wallet/apple",
    handlers.get_order_apple_wallet,
    methods=["GET"],
)
router.add_api_route(
    "/orders/{order_reference}/wallet/google",
    handlers.get_order_google_wallet,
    methods=["GET"],
)
