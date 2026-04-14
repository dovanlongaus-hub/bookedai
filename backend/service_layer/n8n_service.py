from __future__ import annotations

from dataclasses import dataclass

import httpx

from config import Settings
from schemas import BookingWorkflowPayload


@dataclass
class N8NService:
    settings: Settings

    async def trigger_booking(self, payload: BookingWorkflowPayload) -> str:
        if not self.settings.n8n_booking_webhook_url:
            return "skipped"

        headers = {"Content-Type": "application/json"}
        if self.settings.n8n_api_key:
            headers["X-N8N-API-KEY"] = self.settings.n8n_api_key
        if self.settings.n8n_webhook_bearer_token:
            headers["Authorization"] = f"Bearer {self.settings.n8n_webhook_bearer_token}"

        async with httpx.AsyncClient(timeout=20) as client:
            try:
                response = await client.post(
                    self.settings.n8n_booking_webhook_url,
                    headers=headers,
                    json=payload.model_dump(),
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if status_code == 401:
                    return "unauthorized"
                if status_code == 404:
                    return "webhook_not_registered"
                return f"http_{status_code}"
            except httpx.HTTPError:
                return "delivery_failed"

        return "triggered"
