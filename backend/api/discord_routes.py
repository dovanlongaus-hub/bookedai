from __future__ import annotations

import json

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse


router = APIRouter(prefix="/api/discord")


@router.post("/interactions")
async def discord_interactions(
    request: Request,
    background_tasks: BackgroundTasks,
) -> JSONResponse:
    discord_bot_service = request.app.state.discord_bot_service
    raw_body = await request.body()

    try:
        discord_bot_service.verify_interaction(headers=request.headers, body=raw_body)
    except ValueError as exc:
        detail = str(exc)
        if "not configured" in detail.lower():
            raise HTTPException(status_code=503, detail=detail) from exc
        raise HTTPException(status_code=401, detail=detail) from exc

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Discord interaction payload must be valid JSON.") from exc

    try:
        response_payload = await discord_bot_service.handle_interaction(
            payload,
            background_tasks=background_tasks,
            booking_assistant_service=request.app.state.booking_assistant_service,
            openai_service=request.app.state.openai_service,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JSONResponse(response_payload)
