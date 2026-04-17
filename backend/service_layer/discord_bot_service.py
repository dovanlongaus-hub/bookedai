from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import json

import httpx
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from config import Settings
from service_layer.document_summary_service import DocumentSummaryService
from service_layer.discord_service import _clip_discord_content


DISCORD_EPHEMERAL_FLAG = 1 << 6
DISCORD_API_BASE_URL = "https://discord.com/api/v10"


@dataclass(frozen=True)
class DiscordCommandRequest:
    subcommand: str
    options: dict[str, object]
    private: bool
    application_id: str
    interaction_token: str


class DiscordBotService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.document_summary_service = DocumentSummaryService()

    def configured(self) -> bool:
        return bool(self.settings.discord_public_key.strip())

    def verify_interaction(self, *, headers: Mapping[str, str], body: bytes) -> None:
        public_key = self.settings.discord_public_key.strip()
        if not public_key:
            raise ValueError("Discord public key is not configured.")

        signature = headers.get("x-signature-ed25519") or headers.get("X-Signature-Ed25519")
        timestamp = headers.get("x-signature-timestamp") or headers.get("X-Signature-Timestamp")
        if not signature or not timestamp:
            raise ValueError("Missing Discord signature headers.")

        try:
            verify_key = VerifyKey(bytes.fromhex(public_key))
            verify_key.verify(timestamp.encode() + body, bytes.fromhex(signature))
        except (BadSignatureError, ValueError):
            raise ValueError("Invalid Discord interaction signature.") from None

    async def handle_interaction(
        self,
        payload: dict[str, object],
        *,
        background_tasks,
        booking_assistant_service,
        openai_service,
    ) -> dict[str, object]:
        interaction_type = int(payload.get("type") or 0)
        if interaction_type == 1:
            return {"type": 1}
        if interaction_type != 2:
            return self._message_response(
                "Unsupported Discord interaction type for this endpoint.",
                private=True,
            )

        command = self._parse_command(payload)
        if command.subcommand == "summary":
            topic = str(command.options.get("topic") or "all").strip().lower() or "all"
            return self._message_response(
                self.document_summary_service.build_summary(topic),
                private=command.private,
            )

        if command.subcommand == "ask":
            prompt = str(command.options.get("prompt") or "").strip()
            if not prompt:
                return self._message_response(
                    "Please provide a prompt for `/bookedai ask`.",
                    private=True,
                )
            background_tasks.add_task(
                self._complete_ask_interaction,
                application_id=command.application_id,
                interaction_token=command.interaction_token,
                prompt=prompt,
                booking_assistant_service=booking_assistant_service,
                openai_service=openai_service,
            )
            return self._deferred_response(private=command.private)

        return self._message_response(
            "Unsupported `/bookedai` subcommand. Try `ask` or `summary`.",
            private=True,
        )

    async def _complete_ask_interaction(
        self,
        *,
        application_id: str,
        interaction_token: str,
        prompt: str,
        booking_assistant_service,
        openai_service,
    ) -> None:
        context_blocks = self.document_summary_service.build_context_blocks()
        reply = await openai_service.team_assistant_reply(
            question=prompt,
            context_blocks=context_blocks,
        )
        if not reply:
            reply = self.document_summary_service.build_fallback_answer(prompt)

        # Add a short booking-aware follow-up only when the team is asking product-style questions.
        if any(token in prompt.lower() for token in ["booking", "assistant", "match", "service"]):
            try:
                booking_reply = await booking_assistant_service.chat(
                    message=prompt,
                    conversation=[],
                    openai_service=openai_service,
                )
                if booking_reply.reply.strip():
                    reply = (
                        f"{reply}\n\nProduct assistant lens:\n"
                        f"{booking_reply.reply.strip()}"
                    ).strip()
            except Exception:
                pass

        await self.edit_original_interaction_response(
            application_id=application_id,
            interaction_token=interaction_token,
            content=reply,
        )

    async def edit_original_interaction_response(
        self,
        *,
        application_id: str,
        interaction_token: str,
        content: str,
    ) -> None:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.patch(
                f"{DISCORD_API_BASE_URL}/webhooks/{application_id}/{interaction_token}/messages/@original",
                json={
                    "content": _clip_discord_content(content.strip() or "No response generated."),
                    "allowed_mentions": {"parse": []},
                },
            )
            response.raise_for_status()

    def _parse_command(self, payload: dict[str, object]) -> DiscordCommandRequest:
        data = payload.get("data")
        if not isinstance(data, dict):
            raise ValueError("Discord interaction is missing command data.")

        options = data.get("options")
        if not isinstance(options, list) or not options:
            raise ValueError("Discord interaction is missing command options.")

        subcommand_payload = next(
            (
                item
                for item in options
                if isinstance(item, dict) and int(item.get("type") or 0) == 1
            ),
            None,
        )
        if not isinstance(subcommand_payload, dict):
            raise ValueError("Discord interaction is missing a valid subcommand.")

        extracted_options: dict[str, object] = {}
        for item in subcommand_payload.get("options") or []:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            extracted_options[name] = item.get("value")

        return DiscordCommandRequest(
            subcommand=str(subcommand_payload.get("name") or "").strip().lower(),
            options=extracted_options,
            private=bool(extracted_options.get("private")),
            application_id=str(
                payload.get("application_id") or self.settings.discord_application_id
            ).strip(),
            interaction_token=str(payload.get("token") or "").strip(),
        )

    def _message_response(self, content: str, *, private: bool) -> dict[str, object]:
        data: dict[str, object] = {
            "content": _clip_discord_content(content.strip()),
            "allowed_mentions": {"parse": []},
        }
        if private:
            data["flags"] = DISCORD_EPHEMERAL_FLAG
        return {
            "type": 4,
            "data": data,
        }

    def _deferred_response(self, *, private: bool) -> dict[str, object]:
        data: dict[str, object] = {}
        if private:
            data["flags"] = DISCORD_EPHEMERAL_FLAG
        return {
            "type": 5,
            "data": data,
        }
