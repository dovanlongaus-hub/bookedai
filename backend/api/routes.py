from fastapi import APIRouter

from api.admin_routes import router as admin_router
from api.communication_routes import router as communication_router
from api.public_catalog_routes import router as public_catalog_router
from api.upload_routes import router as upload_router
from api.v1_router import router as v1_router
from api.webhook_routes import router as webhook_router


api = APIRouter()
api.include_router(public_catalog_router)
api.include_router(upload_router)
api.include_router(webhook_router)
api.include_router(admin_router)
api.include_router(communication_router)
api.include_router(v1_router)
