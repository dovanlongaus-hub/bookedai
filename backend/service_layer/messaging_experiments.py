"""Lightweight A/B testing harness for the Telegram customer bot.

The harness assigns each Telegram conversation to a deterministic arm per
registered experiment at first contact, persists the assignment in the
``MessagingChannelSession.metadata_json["experiment_assignments"]`` field, and
exposes a flat summary that gets stamped onto outbound message metadata so
analytics can later count conversion by arm by querying
``ConversationEvent.metadata_json -> 'experiments'``.

Assignment is deterministic (sha256 of ``{experiment}:{conversation_id}``) so
returning users always see the same arm, and the registry is intentionally
small and central so the policy decisions are auditable in code review.
"""

from __future__ import annotations

import hashlib
from typing import Any


# Central registry. Add experiments here. Each entry is a list of arm names;
# the first arm is treated as the default control by convention.
EXPERIMENTS: dict[str, list[str]] = {
    # Welcome copy variants on first /start. control = current long body,
    # concise = short three-line variant exercising the same reply keyboard.
    "welcome_copy_v1": ["control", "concise"],
    # Date picker layout variants. Both arms are wired to the existing two-per-row
    # layout for now; this is registered to validate the harness end-to-end and
    # to keep the analytics columns consistent before we ship a real layout swap.
    "picker_layout_v1": ["control", "two_columns"],
}


def assign_arm(
    experiment: str,
    conversation_id: str | None,
    *,
    existing_assignments: dict[str, Any] | None = None,
) -> str:
    """Return the arm assigned to ``conversation_id`` for ``experiment``.

    Sticky: if ``existing_assignments`` already contains a recorded arm for this
    experiment (and that arm is still registered), it is returned unchanged.
    Otherwise a deterministic hash-based pick is made from the registered arms.
    """

    arms = EXPERIMENTS.get(experiment) or []
    if not arms:
        raise KeyError(f"Unknown experiment: {experiment}")

    if existing_assignments:
        prior = existing_assignments.get(experiment)
        if isinstance(prior, str) and prior in arms:
            return prior

    key_source = f"{experiment}:{conversation_id or ''}"
    digest = hashlib.sha256(key_source.encode("utf-8")).digest()
    bucket = int.from_bytes(digest[:4], "big") % len(arms)
    return arms[bucket]


def merge_assignments(
    existing: dict[str, Any] | None,
    new_assignments: dict[str, Any],
) -> dict[str, str]:
    """Merge ``new_assignments`` over ``existing`` with prior assignments winning.

    Existing sticky assignments are preserved; new entries are added only when
    the experiment is not already recorded. Unknown / malformed values are
    discarded so the persisted shape stays predictable.
    """

    merged: dict[str, str] = {}
    if isinstance(existing, dict):
        for key, value in existing.items():
            if isinstance(key, str) and isinstance(value, str):
                merged[key] = value
    for key, value in new_assignments.items():
        if not isinstance(key, str) or not isinstance(value, str):
            continue
        merged.setdefault(key, value)
    return merged


def experiment_arm_summary(assignments: dict[str, Any] | None) -> dict[str, str]:
    """Return a flat ``{experiment: arm}`` map suitable for outbound metadata."""

    summary: dict[str, str] = {}
    if not isinstance(assignments, dict):
        return summary
    for key, value in assignments.items():
        if isinstance(key, str) and isinstance(value, str):
            summary[key] = value
    return summary
