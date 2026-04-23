#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TRUSTED_TELEGRAM_USER_IDS = {"8426853622"}
DEFAULT_TELEGRAM_ALLOWED_ACTIONS = {
    "sync_doc",
    "sync_repo_docs",
    "build_frontend",
    "deploy_live",
    "test",
    "maintenance",
    "workspace_write",
    "repo_structure",
    "host_command",
    "host_shell",
    "full_project",
}
HOST_COMMAND_ALLOWED_PROGRAMS = {
    "apt",
    "apt-get",
    "docker",
    "docker-compose",
    "journalctl",
    "service",
    "systemctl",
    "timedatectl",
    "ufw",
}


class TelegramAuthorizationError(RuntimeError):
    """Raised when a Telegram actor is not allowed to run an operation."""


def run_command(command: list[str], *, cwd: Path | None = None) -> int:
    completed = subprocess.run(command, cwd=cwd or REPO_ROOT, check=False)
    return completed.returncode


def run_host_command(command: list[str]) -> int:
    if os.geteuid() == 0:
        completed = subprocess.run(command, check=False)
    else:
        completed = subprocess.run(["sudo", "-n", *command], check=False)
    return completed.returncode


def run_host_shell(command: str, *, cwd: Path | None = None) -> int:
    shell_command = command if not cwd else f"cd {shlex.quote(str(cwd))} && {command}"
    if os.geteuid() == 0:
        completed = subprocess.run(
            ["/bin/bash", "-lc", shell_command],
            check=False,
        )
    else:
        completed = subprocess.run(
            ["sudo", "-n", "/bin/bash", "-lc", shell_command],
            check=False,
        )
    return completed.returncode


def run_shell_command(command: str, *, cwd: Path | None = None) -> int:
    completed = subprocess.run(
        command,
        cwd=cwd or REPO_ROOT,
        check=False,
        shell=True,
        executable="/bin/bash",
    )
    return completed.returncode


def _parse_csv_env(value: str | None, *, default: set[str]) -> set[str]:
    if value is None:
        return set(default)
    parsed = {item.strip() for item in value.split(",") if item.strip()}
    return parsed


def resolve_telegram_actor(args: argparse.Namespace) -> str | None:
    explicit = getattr(args, "telegram_user_id", None)
    if explicit:
        return str(explicit).strip() or None

    for env_name in (
        "BOOKEDAI_TELEGRAM_USER_ID",
        "TELEGRAM_USER_ID",
        "OPENCLAW_TELEGRAM_USER_ID",
        "OPENCLAW_TELEGRAM_FROM_ID",
    ):
        env_value = os.getenv(env_name, "").strip()
        if env_value:
            return env_value
    return None


def get_trusted_telegram_user_ids() -> set[str]:
    return _parse_csv_env(
        os.getenv("BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS"),
        default=DEFAULT_TRUSTED_TELEGRAM_USER_IDS,
    )


def get_allowed_actions() -> set[str]:
    return _parse_csv_env(
        os.getenv("BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS"),
        default=DEFAULT_TELEGRAM_ALLOWED_ACTIONS,
    )


def permissions_snapshot(actor_id: str | None) -> dict[str, object]:
    trusted_ids = get_trusted_telegram_user_ids()
    allowed_actions = get_allowed_actions()
    return {
        "actor_id": actor_id,
        "trusted_user_ids": sorted(trusted_ids),
        "allowed_actions": sorted(allowed_actions),
        "actor_is_trusted": bool(actor_id and actor_id in trusted_ids),
    }


def ensure_actor_permission(
    args: argparse.Namespace,
    *,
    required_actions: set[str],
) -> None:
    actor_id = resolve_telegram_actor(args)
    if not actor_id:
        return

    snapshot = permissions_snapshot(actor_id)
    if not snapshot["actor_is_trusted"]:
        raise TelegramAuthorizationError(
            f"Telegram actor {actor_id} is not in BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS."
        )

    allowed_actions = set(snapshot["allowed_actions"])
    if "full_project" in allowed_actions:
        return

    if not required_actions.issubset(allowed_actions):
        missing = ", ".join(sorted(required_actions - allowed_actions))
        raise TelegramAuthorizationError(
            f"Telegram actor {actor_id} is missing required actions: {missing}."
        )


def resolve_workspace_path(path_value: str | None) -> Path:
    requested = Path(path_value or ".")
    target = (REPO_ROOT / requested).resolve() if not requested.is_absolute() else requested.resolve()
    try:
        target.relative_to(REPO_ROOT)
    except ValueError as exc:
        raise ValueError("Workspace command paths must stay inside the BookedAI repo.") from exc
    return target


def resolve_host_path(path_value: str | None) -> Path:
    requested = Path(path_value or "/")
    return requested.resolve()


def resolve_host_command(command: str) -> list[str]:
    try:
        argv = shlex.split(command)
    except ValueError as exc:
        raise ValueError(f"Unable to parse host command: {exc}") from exc

    if not argv:
        raise ValueError("Host command cannot be empty.")

    program = argv[0]
    if program == "sudo":
        raise ValueError("Host command should not include sudo; the wrapper adds sudo automatically.")

    if "/" in program:
        raise ValueError("Host command must start with a bare allowed program name, not a path.")

    if program not in HOST_COMMAND_ALLOWED_PROGRAMS:
        allowed = ", ".join(sorted(HOST_COMMAND_ALLOWED_PROGRAMS))
        raise ValueError(
            f"Host command program '{program}' is not allowed. Allowed programs: {allowed}."
        )

    resolved_program = shutil.which(program)
    if not resolved_program:
        raise ValueError(f"Allowed host command program '{program}' is not available on this host.")

    return [resolved_program, *argv[1:]]


def handle_sync_doc(args: argparse.Namespace) -> int:
    command = [
        "python3",
        "scripts/sync_telegram_update.py",
        "--title",
        args.title,
    ]
    if args.summary:
        command.extend(["--summary", args.summary])
    if args.summary_file:
        command.extend(["--summary-file", args.summary_file])
    if args.details:
        command.extend(["--details", args.details])
    if args.details_file:
        command.extend(["--details-file", args.details_file])
    if args.source:
        command.extend(["--source", args.source])
    if args.category:
        command.extend(["--category", args.category])
    if args.status:
        command.extend(["--status", args.status])
    if args.skip_notion:
        command.append("--skip-notion")
    if args.skip_discord:
        command.append("--skip-discord")
    if args.discord_channel_id:
        command.extend(["--discord-channel-id", args.discord_channel_id])
    if args.require_notion:
        command.append("--require-notion")
    if args.require_discord:
        command.append("--require-discord")
    return run_command(command)


def handle_build_frontend(_args: argparse.Namespace) -> int:
    return run_command(["npm", "run", "build"], cwd=REPO_ROOT / "frontend")


def handle_deploy_live(_args: argparse.Namespace) -> int:
    return run_command(["bash", "scripts/deploy_live_host.sh"], cwd=REPO_ROOT)


def handle_sync_repo_docs(args: argparse.Namespace) -> int:
    command = [
        "python3",
        "scripts/sync_repo_docs_to_notion.py",
    ]
    if args.path:
        for path in args.path:
            command.extend(["--path", path])
    if args.skip_discord:
        command.append("--skip-discord")
    if args.limit is not None:
        command.extend(["--limit", str(args.limit)])
    if args.output_json:
        command.extend(["--output-json", args.output_json])
    return run_command(command)


def handle_test(args: argparse.Namespace) -> int:
    cwd = resolve_workspace_path(args.cwd)
    return run_shell_command(args.command, cwd=cwd)


def handle_maintenance(args: argparse.Namespace) -> int:
    if args.target == "zoho-crm-webhook-auto-renew":
        return run_command(["python3", "scripts/run_zoho_crm_webhook_auto_renew.py"], cwd=REPO_ROOT)
    raise ValueError(f"Unknown maintenance target: {args.target}")


def handle_workspace_command(args: argparse.Namespace) -> int:
    cwd = resolve_workspace_path(args.cwd)
    return run_shell_command(args.command, cwd=cwd)


def handle_host_command(args: argparse.Namespace) -> int:
    command = resolve_host_command(args.command)
    return run_host_command(command)


def handle_host_shell(args: argparse.Namespace) -> int:
    cwd = resolve_host_path(args.cwd)
    return run_host_shell(args.command, cwd=cwd)


def handle_permissions(args: argparse.Namespace) -> int:
    actor_id = resolve_telegram_actor(args)
    snapshot = permissions_snapshot(actor_id)
    snapshot["allowed_host_programs"] = sorted(HOST_COMMAND_ALLOWED_PROGRAMS)
    print(json.dumps(snapshot, indent=2, sort_keys=True))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Telegram-friendly operator entrypoints for BookedAI workspace sync, test, build, and deploy.",
    )
    parser.add_argument(
        "--telegram-user-id",
        help="Telegram actor id for allowlist enforcement. Can also be provided through BOOKEDAI_TELEGRAM_USER_ID or TELEGRAM_USER_ID.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    sync_parser = subparsers.add_parser(
        "sync-doc",
        help="Archive a Telegram update, push the summary and detailed document to Notion, and mirror a summary into Discord.",
    )
    sync_parser.add_argument("--title", required=True)
    sync_parser.add_argument("--summary")
    sync_parser.add_argument("--summary-file")
    sync_parser.add_argument("--details")
    sync_parser.add_argument("--details-file")
    sync_parser.add_argument("--source", default="telegram")
    sync_parser.add_argument("--category", default="change-summary")
    sync_parser.add_argument("--status", default="submitted")
    sync_parser.add_argument("--skip-notion", action="store_true")
    sync_parser.add_argument("--skip-discord", action="store_true")
    sync_parser.add_argument("--discord-channel-id")
    sync_parser.add_argument("--require-notion", action="store_true")
    sync_parser.add_argument("--require-discord", action="store_true")
    sync_parser.set_defaults(handler=handle_sync_doc)

    build_parser_cmd = subparsers.add_parser(
        "build-frontend",
        help="Build the production frontend bundle used by the BookedAI product surfaces.",
    )
    build_parser_cmd.set_defaults(handler=handle_build_frontend)

    deploy_parser = subparsers.add_parser(
        "deploy-live",
        help="Deploy the current BookedAI worktree live on the VPS host via the approved host-level wrapper.",
    )
    deploy_parser.set_defaults(handler=handle_deploy_live)

    sync_repo_docs_parser = subparsers.add_parser(
        "sync-repo-docs",
        help="Batch sync the repo documentation set to Notion, optionally for only selected markdown paths.",
    )
    sync_repo_docs_parser.add_argument("--path", action="append")
    sync_repo_docs_parser.add_argument("--skip-discord", action="store_true")
    sync_repo_docs_parser.add_argument("--limit", type=int)
    sync_repo_docs_parser.add_argument("--output-json")
    sync_repo_docs_parser.set_defaults(handler=handle_sync_repo_docs)

    test_parser = subparsers.add_parser(
        "test",
        help="Run a repo-scoped validation command from Telegram/OpenClaw after Telegram actor authorization passes.",
    )
    test_parser.add_argument("--command", required=True)
    test_parser.add_argument("--cwd", default=".")
    test_parser.set_defaults(handler=handle_test)

    maintenance_parser = subparsers.add_parser(
        "maintenance",
        help="Run a lightweight maintenance task from Telegram/OpenClaw without opening a general repo shell.",
    )
    maintenance_parser.add_argument(
        "target",
        choices=["zoho-crm-webhook-auto-renew"],
        help="Named maintenance task to run.",
    )
    maintenance_parser.set_defaults(handler=handle_maintenance)

    workspace_parser = subparsers.add_parser(
        "workspace-command",
        help="Run a repo-scoped shell command for broader BookedAI changes, including file moves, refactors, and whole-project deployment helpers.",
    )
    workspace_parser.add_argument("--command", required=True)
    workspace_parser.add_argument("--cwd", default=".")
    workspace_parser.set_defaults(handler=handle_workspace_command)

    host_parser = subparsers.add_parser(
        "host-command",
        help="Run an allowlisted host-level command through sudo without exposing a general-purpose root shell.",
    )
    host_parser.add_argument("--command", required=True)
    host_parser.set_defaults(handler=handle_host_command)

    host_shell_parser = subparsers.add_parser(
        "host-shell",
        help="Run a fully elevated host shell command anywhere on the server for trusted full-project operators.",
    )
    host_shell_parser.add_argument("--command", required=True)
    host_shell_parser.add_argument("--cwd", default="/")
    host_shell_parser.set_defaults(handler=handle_host_shell)

    permissions_parser = subparsers.add_parser(
        "permissions",
        help="Print the resolved Telegram allowlist and action permissions for the current actor.",
    )
    permissions_parser.set_defaults(handler=handle_permissions)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    required_actions_by_command = {
        "build-frontend": {"build_frontend"},
        "deploy-live": {"deploy_live"},
        "test": {"test"},
        "maintenance": {"maintenance"},
        "workspace-command": {"workspace_write", "repo_structure"},
        "host-command": {"host_command"},
        "host-shell": {"host_shell"},
    }
    required_actions = required_actions_by_command.get(args.command)
    if required_actions:
        try:
            ensure_actor_permission(args, required_actions=required_actions)
        except (TelegramAuthorizationError, ValueError) as exc:
            parser.error(str(exc))
    try:
        return args.handler(args)
    except ValueError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    raise SystemExit(main())
