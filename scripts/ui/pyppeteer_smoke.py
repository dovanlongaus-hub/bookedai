#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import os
import sys

from pyppeteer import launch


TARGET_URL = os.getenv("UI_SMOKE_URL", "http://localhost:3000")
WAIT_SELECTOR = os.getenv("UI_SMOKE_WAIT_SELECTOR", "#root")
SCREENSHOT_PATH = os.getenv("UI_SMOKE_SCREENSHOT_PATH", "artifacts/ui-smoke.png")
TIMEOUT_MS = int(os.getenv("UI_SMOKE_TIMEOUT_MS", "20000"))


async def run_smoke() -> int:
    browser = await launch(
        headless=True,
        args=["--no-sandbox", "--disable-setuid-sandbox"],
    )
    try:
        page = await browser.newPage()
        await page.goto(TARGET_URL, {"waitUntil": "networkidle2", "timeout": TIMEOUT_MS})
        await page.waitForSelector(WAIT_SELECTOR, {"timeout": TIMEOUT_MS})
        os.makedirs(os.path.dirname(SCREENSHOT_PATH) or ".", exist_ok=True)
        await page.screenshot({"path": SCREENSHOT_PATH, "fullPage": True})
        title = await page.title()
        print(f"ok: loaded={TARGET_URL} title={title!r} screenshot={SCREENSHOT_PATH}")
        return 0
    except Exception as exc:  # pragma: no cover - smoke script behavior
        print(f"error: ui smoke failed: {exc}", file=sys.stderr)
        return 1
    finally:
        await browser.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run_smoke()))
