from fastapi import APIRouter

from api.v1_academy_routes import router as academy_router
from api.v1_admin_tenant_config_routes import router as admin_tenant_config_router
from api.v1_agent_routes import router as agent_router
from api.v1_ai_mentor_student_routes import router as ai_mentor_student_router
from api.v1_aimentor_program_routes import router as aimentor_program_router
from api.v1_assessment_routes import router as assessment_router
from api.v1_booking_lifecycle_routes import router as booking_lifecycle_router
from api.v1_booking_routes import router as booking_router
from api.v1_chess_meeting_routes import router as chess_meeting_router
from api.v1_chess_payment_routes import router as chess_payment_router
from api.v1_chess_slot_routes import router as chess_slot_router
from api.v1_chess_student_routes import router as chess_student_router
from api.v1_communication_routes import router as communication_router
from api.v1_handoff_routes import router as handoff_router
from api.v1_integration_routes import router as integration_router
from api.v1_orders_routes import router as orders_router
from api.v1_public_routes import router as public_router
from api.v1_public_stats_routes import router as public_stats_router
from api.v1_public_tenant_config_routes import router as public_tenant_config_router
from api.v1_sandbox_routes import router as sandbox_router
from api.v1_search_routes import router as search_router
from api.v1_tenant_ai_mentor_progress_routes import (
    router as tenant_ai_mentor_progress_router,
)
from api.v1_tenant_broadcast_routes import router as tenant_broadcast_router
from api.v1_tenant_care_list_routes import router as tenant_care_list_router
from api.v1_tenant_chess_progress_routes import router as tenant_chess_progress_router
from api.v1_tenant_routes import router as tenant_router
from api.v1_tenant_zoho_integration_routes import (
    router as tenant_zoho_integration_router,
)


router = APIRouter()
router.include_router(academy_router)
router.include_router(agent_router)
router.include_router(ai_mentor_student_router)
router.include_router(aimentor_program_router)
router.include_router(assessment_router)
router.include_router(search_router)
router.include_router(booking_router)
router.include_router(booking_lifecycle_router)
router.include_router(chess_meeting_router)
router.include_router(chess_payment_router)
router.include_router(chess_slot_router)
router.include_router(chess_student_router)
router.include_router(communication_router)
router.include_router(handoff_router)
router.include_router(integration_router)
router.include_router(orders_router)
router.include_router(public_router)
router.include_router(public_stats_router)
router.include_router(public_tenant_config_router)
router.include_router(admin_tenant_config_router)
router.include_router(sandbox_router)
router.include_router(tenant_ai_mentor_progress_router)
router.include_router(tenant_broadcast_router)
router.include_router(tenant_care_list_router)
router.include_router(tenant_chess_progress_router)
router.include_router(tenant_router)
router.include_router(tenant_zoho_integration_router)
