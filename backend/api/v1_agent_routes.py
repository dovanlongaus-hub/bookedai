"""Thin route module for the v1 agent activity drawer endpoint.

Mirrors the composition pattern used by ``v1_search_routes.py``: this file
only mounts URL paths to handler callables, keeping import side-effects
predictable for the central ``v1_router`` aggregator.
"""

from fastapi import APIRouter

from api import v1_agent_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-agent"])

router.add_api_route(
    "/agent/activity",
    handlers.get_agent_activity,
    methods=["GET"],
)
