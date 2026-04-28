"""Tests for the lightweight Telegram bot A/B testing harness."""

from __future__ import annotations

import asyncio
import sys
from collections import Counter
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from schemas import TawkMessage  # noqa: E402
from service_layer.messaging_automation_service import (  # noqa: E402
    MessagingAutomationService,
)
from service_layer.messaging_experiments import (  # noqa: E402
    EXPERIMENTS,
    assign_arm,
    experiment_arm_summary,
    merge_assignments,
)


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalars(self):
        return SimpleNamespace(all=lambda: [] if self._value is None else [self._value])


async def _fake_execute(*_args, **_kwargs):
    return _FakeExecuteResult()


def _fake_session() -> SimpleNamespace:
    return SimpleNamespace(execute=_fake_execute, add=lambda _row: None)


class AssignArmTests(TestCase):
    def test_assign_arm_is_deterministic_for_same_conversation(self):
        first = assign_arm("welcome_copy_v1", "tg-conversation-42")
        second = assign_arm("welcome_copy_v1", "tg-conversation-42")
        self.assertEqual(first, second)
        self.assertIn(first, EXPERIMENTS["welcome_copy_v1"])

    def test_assign_arm_distributes_roughly_evenly_across_conversations(self):
        counts: Counter[str] = Counter()
        for index in range(100):
            arm = assign_arm("welcome_copy_v1", f"tg-conversation-{index}")
            counts[arm] += 1

        # Hash-based assignment: each arm should get a meaningful share. We
        # tolerate a wide band so the test stays stable across hash changes,
        # while still failing if assignment collapses to a single arm.
        for arm in EXPERIMENTS["welcome_copy_v1"]:
            self.assertGreaterEqual(counts[arm], 30, f"arm {arm!r} got {counts[arm]} of 100")
            self.assertLessEqual(counts[arm], 70, f"arm {arm!r} got {counts[arm]} of 100")

    def test_assign_arm_is_sticky_when_existing_assignment_present(self):
        # Find a conversation_id whose fresh hash lands on "control" so we can
        # prove that an existing "concise" assignment overrides the hash.
        conversation_id = None
        for index in range(50):
            candidate = f"tg-sticky-probe-{index}"
            if assign_arm("welcome_copy_v1", candidate) == "control":
                conversation_id = candidate
                break
        self.assertIsNotNone(conversation_id, "could not find a control-arm conversation_id")

        sticky_arm = assign_arm(
            "welcome_copy_v1",
            conversation_id,
            existing_assignments={"welcome_copy_v1": "concise"},
        )
        self.assertEqual(sticky_arm, "concise")

    def test_assign_arm_ignores_existing_assignment_for_unknown_arm(self):
        existing = {"welcome_copy_v1": "no_such_arm"}
        arm = assign_arm("welcome_copy_v1", "tg-x", existing_assignments=existing)
        self.assertIn(arm, EXPERIMENTS["welcome_copy_v1"])

    def test_assign_arm_raises_for_unknown_experiment(self):
        with self.assertRaises(KeyError):
            assign_arm("not_an_experiment", "tg-1")


class MergeAndSummariseTests(TestCase):
    def test_merge_assignments_keeps_existing_and_adds_new(self):
        merged = merge_assignments(
            {"welcome_copy_v1": "concise"},
            {"picker_layout_v1": "two_columns"},
        )
        self.assertEqual(
            merged,
            {"welcome_copy_v1": "concise", "picker_layout_v1": "two_columns"},
        )

    def test_merge_assignments_does_not_overwrite_existing(self):
        merged = merge_assignments(
            {"welcome_copy_v1": "concise"},
            {"welcome_copy_v1": "control"},
        )
        self.assertEqual(merged, {"welcome_copy_v1": "concise"})

    def test_merge_assignments_drops_non_string_values(self):
        merged = merge_assignments(
            {"welcome_copy_v1": "concise", 42: "x"},
            {"picker_layout_v1": 7, "ok": "control"},
        )
        self.assertEqual(merged, {"welcome_copy_v1": "concise", "ok": "control"})

    def test_experiment_arm_summary_returns_flat_string_map(self):
        summary = experiment_arm_summary(
            {"welcome_copy_v1": "control", "picker_layout_v1": "two_columns"}
        )
        self.assertEqual(
            summary,
            {"welcome_copy_v1": "control", "picker_layout_v1": "two_columns"},
        )

    def test_experiment_arm_summary_handles_none(self):
        self.assertEqual(experiment_arm_summary(None), {})


class WelcomeCopyArmIntegrationTests(TestCase):
    def _run_welcome(self, *, conversation_id: str, sender_name: str = "Long"):
        service = MessagingAutomationService()
        message = TawkMessage(
            text="/start",
            sender_name=sender_name,
            conversation_id=conversation_id,
        )
        return asyncio.run(
            service.handle_customer_message(
                _fake_session(),
                channel="telegram",
                message=message,
                metadata={
                    "conversation_id": conversation_id,
                    "telegram_chat_id": conversation_id,
                    "telegram_language_code": "en",
                    "start_command_kind": "welcome",
                },
            )
        )

    def test_welcome_path_returns_concise_body_when_arm_is_concise(self):
        # Find a conversation_id that hashes to the "concise" arm so we can
        # exercise the concise branch end-to-end without forcing it.
        concise_id = None
        for index in range(200):
            candidate = f"concise-probe-{index}"
            if assign_arm("welcome_copy_v1", candidate) == "concise":
                concise_id = candidate
                break
        self.assertIsNotNone(concise_id, "could not find a concise-arm conversation_id")

        result = self._run_welcome(conversation_id=concise_id)

        self.assertEqual(result.ai_intent, "welcome")
        # Concise body fits in three short lines and does not include the long
        # bullet list from the control variant.
        self.assertIn("BookedAI Manager Bot", result.ai_reply)
        self.assertNotIn("Or type what you want", result.ai_reply)
        self.assertLessEqual(result.ai_reply.count("\n"), 3)
        self.assertEqual(
            result.metadata["experiments"], {"welcome_copy_v1": "concise"}
        )

    def test_welcome_path_returns_control_body_when_arm_is_control(self):
        control_id = None
        for index in range(200):
            candidate = f"control-probe-{index}"
            if assign_arm("welcome_copy_v1", candidate) == "control":
                control_id = candidate
                break
        self.assertIsNotNone(control_id, "could not find a control-arm conversation_id")

        result = self._run_welcome(conversation_id=control_id)

        self.assertEqual(result.ai_intent, "welcome")
        # Control body keeps the longer bullet list referencing /mybookings and /help.
        self.assertIn("Or type what you want", result.ai_reply)
        self.assertEqual(
            result.metadata["experiments"], {"welcome_copy_v1": "control"}
        )

    def test_welcome_result_metadata_stamps_assigned_arm(self):
        result = self._run_welcome(conversation_id="stamp-check-conversation")
        experiments = result.metadata.get("experiments")
        self.assertIsInstance(experiments, dict)
        self.assertIn("welcome_copy_v1", experiments)
        self.assertIn(
            experiments["welcome_copy_v1"], EXPERIMENTS["welcome_copy_v1"]
        )
