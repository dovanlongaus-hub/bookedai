from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.admin_routes import router as admin_router
from api.communication_routes import router as communication_router
from api.public_catalog_routes import router as public_catalog_router
from api.route_handlers import lifespan, settings
from api.upload_routes import router as upload_router
from api.v1_router import router as v1_router
from api.webhook_routes import router as webhook_router
from core.logging import configure_logging
from core.observability import CorrelationIdMiddleware, register_exception_handlers
from services import parse_cors_origins


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(
        title="BookedAI API",
        version="1.0.1-stable",
        docs_url="/api/docs" if settings.expose_api_docs else None,
        redoc_url="/api/redoc" if settings.expose_api_docs else None,
        openapi_url="/api/openapi.json" if settings.expose_api_docs else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=parse_cors_origins(settings.cors_allow_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(CorrelationIdMiddleware)
    register_exception_handlers(app)
    app.include_router(public_catalog_router)
    app.include_router(upload_router)
    app.include_router(webhook_router)
    app.include_router(admin_router)
    app.include_router(communication_router)
    app.include_router(v1_router)
    return app


app = create_app()
