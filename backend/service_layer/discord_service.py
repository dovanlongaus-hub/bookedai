from __future__ import annotations

from dataclasses import dataclass

import httpx

from config import Settings


DISCORD_MESSAGE_LIMIT = 2000


@dataclass
class DiscordPostResult:
    status: str
    message: str


def _clip_discord_content(value: str, *, suffix: str = "\n\n[truncated]") -> str:
    if len(value) <= DISCORD_MESSAGE_LIMIT:
        return value
    clipped_length = max(DISCORD_MESSAGE_LIMIT - len(suffix), 0)
    return f"{value[:clipped_length].rstrip()}{suffix}"


class DiscordService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def configured(self) -> bool:
        return bool(self.settings.discord_webhook_url.strip())

    async def send_handoff_summary(
        self,
        *,
        title: str,
        body: str,
        lane_label: str | None = None,
        handoff_format: str | None = None,
    ) -> DiscordPostResult:
        if not self.configured():
            return DiscordPostResult(
                status="not_configured",
                message="Discord webhook is not configured.",
            )

        metadata: list[str] = []
        if lane_label:
            metadata.append(f"Lane: {lane_label}")
        if handoff_format:
            metadata.append(f"Format: {handoff_format}")

        content_lines = [f"**{title.strip() or 'BookedAI team update'}**"]
        if metadata:
            content_lines.append(" | ".join(metadata))
        content_lines.append("")
        content_lines.append(body.strip())
        content = _clip_discord_content("\n".join(content_lines).strip())

        payload: dict[str, str] = {"content": content}
        if self.settings.discord_webhook_username.strip():
            payload["username"] = self.settings.discord_webhook_username.strip()
        if self.settings.discord_webhook_avatar_url.strip():
            payload["avatar_url"] = self.settings.discord_webhook_avatar_url.strip()

        async with httpx.AsyncClient(timeout=20) as client:
            try:
                response = await client.post(
                    self.settings.discord_webhook_url,
                    json=payload,
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if status_code in {401, 403}:
                    return DiscordPostResult(
                        status="unauthorized",
                        message="Discord webhook rejected the request.",
                    )
                if status_code == 404:
                    return DiscordPostResult(
                        status="webhook_not_found",
                        message="Discord webhook URL was not found.",
                    )
                return DiscordPostResult(
                    status=f"http_{status_code}",
                    message=f"Discord webhook returned HTTP {status_code}.",
                )
            except httpx.HTTPError:
                return DiscordPostResult(
                    status="delivery_failed",
                    message="Could not reach Discord webhook.",
                )

        return DiscordPostResult(
            status="sent",
            message="Discord handoff was posted successfully.",
        )
