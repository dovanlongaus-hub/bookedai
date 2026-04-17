from __future__ import annotations
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.discord_bot_service import DiscordBotService


class _BackgroundTaskCollector:
    def __init__(self) -> None:
        self.tasks: list[tuple] = []

    def add_task(self, func, *args, **kwargs) -> None:
        self.tasks.append((func, args, kwargs))


class DiscordBotServiceTestCase(IsolatedAsyncioTestCase):
    async def test_summary_command_returns_immediate_message(self):
        service = DiscordBotService(
            SimpleNamespace(
                discord_public_key="configured",
                discord_application_id="app-123",
            )
        )
        response = await service.handle_interaction(
            {
                "type": 2,
                "application_id": "app-123",
                "token": "interaction-token",
                "data": {
                    "name": "bookedai",
                    "options": [
                        {
                            "type": 1,
                            "name": "summary",
                            "options": [
                                {"name": "topic", "value": "sprint14"},
                                {"name": "private", "value": True},
                            ],
                        }
                    ],
                },
            },
            background_tasks=_BackgroundTaskCollector(),
            booking_assistant_service=SimpleNamespace(),
            openai_service=SimpleNamespace(),
        )

        self.assertEqual(response["type"], 4)
        self.assertEqual(response["data"]["flags"], 64)
        self.assertIn("Sprint 14 summary:", response["data"]["content"])

    async def test_ask_command_defers_and_completes_follow_up(self):
        service = DiscordBotService(
            SimpleNamespace(
                discord_public_key="configured",
                discord_application_id="app-123",
            )
        )
        service.edit_original_interaction_response = AsyncMock()
        background_tasks = _BackgroundTaskCollector()
        booking_service = SimpleNamespace(
            chat=AsyncMock(
                return_value=SimpleNamespace(reply="Booking assistant context from product lens.")
            )
        )
        openai_service = SimpleNamespace(
            team_assistant_reply=AsyncMock(return_value="Repo-backed answer for the Discord team.")
        )

        response = await service.handle_interaction(
            {
                "type": 2,
                "application_id": "app-123",
                "token": "interaction-token",
                "data": {
                    "name": "bookedai",
                    "options": [
                        {
                            "type": 1,
                            "name": "ask",
                            "options": [
                                {"name": "prompt", "value": "What did we finish for Sprint 14?"},
                                {"name": "private", "value": False},
                            ],
                        }
                    ],
                },
            },
            background_tasks=background_tasks,
            booking_assistant_service=booking_service,
            openai_service=openai_service,
        )

        self.assertEqual(response["type"], 5)
        self.assertEqual(len(background_tasks.tasks), 1)

        func, args, kwargs = background_tasks.tasks[0]
        await func(*args, **kwargs)

        openai_service.team_assistant_reply.assert_awaited_once()
        booking_service.chat.assert_not_awaited()
        service.edit_original_interaction_response.assert_awaited_once()
        sent_content = service.edit_original_interaction_response.await_args.kwargs["content"]
        self.assertIn("Repo-backed answer for the Discord team.", sent_content)

    async def test_ask_command_adds_product_lens_for_booking_questions(self):
        service = DiscordBotService(
            SimpleNamespace(
                discord_public_key="configured",
                discord_application_id="app-123",
            )
        )
        service.edit_original_interaction_response = AsyncMock()

        await service._complete_ask_interaction(
            application_id="app-123",
            interaction_token="interaction-token",
            prompt="How does the booking assistant match services now?",
            booking_assistant_service=SimpleNamespace(
                chat=AsyncMock(
                    return_value=SimpleNamespace(reply="Matching now returns ranked shortlist guidance.")
                )
            ),
            openai_service=SimpleNamespace(
                team_assistant_reply=AsyncMock(return_value="Core progress answer.")
            ),
        )

        sent_content = service.edit_original_interaction_response.await_args.kwargs["content"]
        self.assertIn("Core progress answer.", sent_content)
        self.assertIn("Product assistant lens:", sent_content)
