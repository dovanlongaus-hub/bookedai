from fastapi import APIRouter

from api.v1_booking_routes import router as booking_router
from api.v1_communication_routes import router as communication_router
from api.v1_integration_routes import router as integration_router
from api.v1_search_routes import router as search_router
from api.v1_tenant_routes import router as tenant_router


router = APIRouter()
router.include_router(search_router)
router.include_router(booking_router)
router.include_router(communication_router)
router.include_router(integration_router)
router.include_router(tenant_router)
