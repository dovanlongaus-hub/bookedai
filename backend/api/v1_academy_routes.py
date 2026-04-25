from fastapi import APIRouter

from api import v1_academy_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-academy"])

router.add_api_route("/academy/students/{student_ref}", handlers.get_academy_student, methods=["GET"])
router.add_api_route(
    "/academy/students/{student_ref}/report-preview",
    handlers.get_academy_student_report_preview,
    methods=["GET"],
)
router.add_api_route(
    "/academy/students/{student_ref}/enrollment",
    handlers.get_academy_student_enrollment,
    methods=["GET"],
)
router.add_api_route("/portal/requests/pause", handlers.create_academy_pause_request, methods=["POST"])
router.add_api_route(
    "/portal/requests/downgrade",
    handlers.create_academy_downgrade_request,
    methods=["POST"],
)
router.add_api_route("/subscriptions/intents", handlers.create_subscription_intent, methods=["POST"])
router.add_api_route("/reports/generate", handlers.queue_report_generation, methods=["POST"])
router.add_api_route("/retention/evaluate", handlers.queue_retention_evaluation, methods=["POST"])
router.add_api_route("/revenue-ops/handoffs", handlers.queue_revenue_ops_handoff, methods=["POST"])
router.add_api_route("/agent-actions", handlers.list_agent_actions, methods=["GET"])
router.add_api_route("/agent-actions/dispatch", handlers.dispatch_agent_actions, methods=["POST"])
router.add_api_route("/agent-actions/{action_run_id}", handlers.get_agent_action, methods=["GET"])
router.add_api_route(
    "/agent-actions/{action_run_id}/transition",
    handlers.transition_agent_action,
    methods=["POST"],
)
