from fastapi import APIRouter

from api.admin_routes import router as admin_router
from api.automation_routes import router as automation_router
from api.discord_routes import router as discord_router
from api.email_routes import router as email_router
from api.public_routes import router as public_router
from api.route_handlers import lifespan, settings


api = APIRouter()
api.include_router(public_router)
api.include_router(automation_router)
api.include_router(admin_router)
api.include_router(email_router)
api.include_router(discord_router)
