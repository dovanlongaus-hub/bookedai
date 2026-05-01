"""Route registration for the public AI Mentor catalog endpoint.

Mounts ``GET /api/v1/aimentor/programs`` from
:mod:`api.v1_aimentor_program_handlers`.
"""

from fastapi import APIRouter

from api import v1_aimentor_program_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-aimentor-program"])

router.add_api_route(
    "/aimentor/programs",
    handlers.list_aimentor_programs,
    methods=["GET"],
)
