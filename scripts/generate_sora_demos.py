#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

from openai import OpenAI


SCENARIOS = {
    "salon": {
        "prompt_file": "tmp/sora/prompts/salon.txt",
        "out_file": "frontend/public/bookedai-salon-demo-generated.mp4",
    },
    "swim-school": {
        "prompt_file": "tmp/sora/prompts/swim-school.txt",
        "out_file": "frontend/public/bookedai-swim-school-demo-generated.mp4",
    },
    "clinic": {
        "prompt_file": "tmp/sora/prompts/clinic.txt",
        "out_file": "frontend/public/bookedai-clinic-demo-generated.mp4",
    },
    "tutor": {
        "prompt_file": "tmp/sora/prompts/tutor.txt",
        "out_file": "frontend/public/bookedai-tutor-demo-generated.mp4",
    },
    "trades": {
        "prompt_file": "tmp/sora/prompts/trades.txt",
        "out_file": "frontend/public/bookedai-trades-demo-generated.mp4",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate BookedAI Sora demo videos.")
    parser.add_argument(
        "--scenario",
        choices=[*SCENARIOS.keys(), "all"],
        default="all",
        help="Scenario to generate. Defaults to all.",
    )
    parser.add_argument("--model", default="sora-2", help="Sora model to use.")
    parser.add_argument("--size", default="1280x720", help="Output size.")
    parser.add_argument("--seconds", default="8", help="Clip duration in seconds.")
    parser.add_argument("--poll-interval", type=int, default=10, help="Seconds between status checks.")
    parser.add_argument("--timeout", type=int, default=900, help="Overall timeout per video in seconds.")
    parser.add_argument(
        "--results-dir",
        default="tmp/sora/results",
        help="Directory for JSON metadata outputs.",
    )
    return parser.parse_args()


def ensure_api_key() -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not set in the environment.")
    return api_key


def to_dict(obj: Any) -> dict[str, Any]:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if isinstance(obj, dict):
        return obj
    return dict(obj)


def read_prompt(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def wait_for_completion(
    client: OpenAI,
    video_id: str,
    *,
    poll_interval: int,
    timeout: int,
) -> Any:
    started = time.time()
    while True:
        video = client.videos.retrieve(video_id)
        status = getattr(video, "status", None)
        if status == "completed":
            return video
        if status in {"failed", "cancelled"}:
            raise RuntimeError(f"Video {video_id} ended with status={status}")
        if time.time() - started > timeout:
            raise TimeoutError(f"Timed out waiting for video {video_id} to complete.")
        print(f"[{video_id}] status={status or 'unknown'}")
        time.sleep(poll_interval)


def generate_one(
    client: OpenAI,
    *,
    scenario: str,
    model: str,
    size: str,
    seconds: str,
    poll_interval: int,
    timeout: int,
    results_dir: Path,
    repo_root: Path,
) -> None:
    config = SCENARIOS[scenario]
    prompt_path = repo_root / config["prompt_file"]
    out_path = repo_root / config["out_file"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    results_dir.mkdir(parents=True, exist_ok=True)

    prompt = read_prompt(prompt_path)
    print(f"[{scenario}] creating video from {prompt_path}")
    created = client.videos.create(
        model=model,
        prompt=prompt,
        size=size,
        seconds=seconds,
    )
    created_payload = to_dict(created)
    video_id = created_payload.get("id")
    if not video_id:
        raise RuntimeError(f"[{scenario}] create response did not include a video id.")

    (results_dir / f"{scenario}-create.json").write_text(
        json.dumps(created_payload, indent=2),
        encoding="utf-8",
    )

    final = wait_for_completion(
        client,
        video_id,
        poll_interval=poll_interval,
        timeout=timeout,
    )
    final_payload = to_dict(final)
    (results_dir / f"{scenario}-final.json").write_text(
        json.dumps(final_payload, indent=2),
        encoding="utf-8",
    )

    content = client.videos.download_content(video_id, variant="video")
    out_path.write_bytes(content.content)
    print(f"[{scenario}] downloaded video to {out_path}")


def main() -> int:
    args = parse_args()
    ensure_api_key()

    repo_root = Path(__file__).resolve().parent.parent
    results_dir = repo_root / args.results_dir
    client = OpenAI()

    scenarios = list(SCENARIOS.keys()) if args.scenario == "all" else [args.scenario]
    for scenario in scenarios:
        generate_one(
            client,
            scenario=scenario,
            model=args.model,
            size=args.size,
            seconds=args.seconds,
            poll_interval=args.poll_interval,
            timeout=args.timeout,
            results_dir=results_dir,
            repo_root=repo_root,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
