from fastapi import APIRouter

from api.v1_academy_routes import router as academy_router
from api.v1_assessment_routes import router as assessment_router
from api.v1_booking_routes import router as booking_router
from api.v1_communication_routes import router as communication_router
from api.v1_handoff_routes import router as handoff_router
from api.v1_integration_routes import router as integration_router
from api.v1_public_routes import router as public_router
from api.v1_search_routes import router as search_router
from api.v1_tenant_routes import router as tenant_router


router = APIRouter()
router.include_router(academy_router)
router.include_router(assessment_router)
router.include_router(search_router)
router.include_router(booking_router)
router.include_router(communication_router)
router.include_router(handoff_router)
router.include_router(integration_router)
router.include_router(public_router)
router.include_router(tenant_router)
