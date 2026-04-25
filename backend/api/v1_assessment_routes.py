from fastapi import APIRouter

from api import v1_assessment_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-assessment"])

router.add_api_route("/assessments/sessions", handlers.create_assessment_session, methods=["POST"])
router.add_api_route(
    "/assessments/sessions/{session_id}/answers",
    handlers.submit_assessment_answers,
    methods=["POST"],
)
router.add_api_route("/placements/recommend", handlers.recommend_placement, methods=["POST"])
router.add_api_route("/classes/availability", handlers.class_availability, methods=["GET"])
router.add_api_route("/reports/preview", handlers.create_parent_report_preview, methods=["POST"])
router.add_api_route("/reports/preview/{booking_reference}", handlers.get_parent_report_preview, methods=["GET"])
