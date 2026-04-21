from fastapi import APIRouter

from api import v1_search_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-search"])

router.add_api_route("/matching/search", handlers.search_candidates, methods=["POST"])
router.add_api_route("/booking-trust/checks", handlers.check_availability, methods=["POST"])
