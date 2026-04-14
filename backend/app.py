from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.route_handlers import api, lifespan, settings
from services import parse_cors_origins


def create_app() -> FastAPI:
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
    app.include_router(api)
    return app


app = create_app()
