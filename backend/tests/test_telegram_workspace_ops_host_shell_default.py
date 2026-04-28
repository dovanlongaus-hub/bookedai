"""Regression tests for P1-S4 (2026-04-28): the Telegram operator host-shell
lane must default to OFF when ``BOOKEDAI_ENABLE_HOST_SHELL`` is unset, so that
a leaked Telegram bot token or compromised operator chat cannot bypass the
host-command program allowlist via arbitrary ``/bin/bash -lc`` execution.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.telegram_workspace_ops import is_host_shell_enabled  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_host_shell_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BOOKEDAI_ENABLE_HOST_SHELL", raising=False)


def test_host_shell_defaults_off_when_env_unset() -> None:
    assert is_host_shell_enabled() is False


def test_host_shell_off_when_env_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOOKEDAI_ENABLE_HOST_SHELL", "0")
    assert is_host_shell_enabled() is False


def test_host_shell_on_when_env_one(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOOKEDAI_ENABLE_HOST_SHELL", "1")
    assert is_host_shell_enabled() is True


def test_host_shell_on_when_env_true(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOOKEDAI_ENABLE_HOST_SHELL", "true")
    assert is_host_shell_enabled() is True


def test_host_shell_off_for_arbitrary_string(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BOOKEDAI_ENABLE_HOST_SHELL", "random")
    assert is_host_shell_enabled() is False
