#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
import shlex
import shutil
import subprocess
import getpass
import errno
import urllib.error
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_HOST_REPO_ROOT = Path("/home/dovanlong/BookedAI")
DEFAULT_OPENCLAW_AGENT_SPEC = REPO_ROOT / "deploy/openclaw/agents/bookedai-booking-customer-agent.json"
LEGACY_OPENCLAW_WHATSAPP_AGENT_SPEC = (
    REPO_ROOT / "deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json"
)
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
    "openclaw_runtime_admin",
    "whatsapp_bot_status",
    "full_project",
}
TRUSTED_HOST_DEPLOY_USERS = {"openclaw", "telegram"}
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


def resolve_nsenter_path() -> str | None:
    if not Path("/hostfs").exists():
        return None

    container_nsenter = shutil.which("nsenter")
    if container_nsenter:
        return container_nsenter

    for candidate in ("/hostfs/usr/bin/nsenter", "/hostfs/bin/nsenter"):
        if Path(candidate).exists():
            return candidate
    return None


def should_use_nsenter_host_exec() -> bool:
    return resolve_nsenter_path() is not None


def current_os_user() -> str:
    return os.getenv("USER") or os.getenv("LOGNAME") or getpass.getuser()


def is_trusted_host_deploy_user() -> bool:
    return current_os_user() in TRUSTED_HOST_DEPLOY_USERS


def is_host_shell_enabled() -> bool:
    return os.getenv("BOOKEDAI_ENABLE_HOST_SHELL", "1").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def build_host_exec_prefix() -> list[str]:
    nsenter_path = resolve_nsenter_path()
    if nsenter_path:
        return [nsenter_path, "--target", "1", "--mount", "--uts", "--ipc", "--net", "--pid"]
    return []


def sudo_available() -> bool:
    return shutil.which("sudo") is not None


def run_host_argv(command: list[str]) -> int:
    host_exec_prefix = build_host_exec_prefix()
    host_command = [*host_exec_prefix, *command]
    if os.geteuid() == 0:
        completed = subprocess.run(host_command, check=False)
        return completed.returncode

    if host_exec_prefix:
        try:
            completed = subprocess.run(host_command, check=False)
            if completed.returncode == 0:
                return completed.returncode
        except PermissionError:
            completed = None
        except OSError as exc:
            if exc.errno != errno.EPERM:
                raise

        sudo_path = shutil.which("sudo")
        if sudo_path:
            completed = subprocess.run([sudo_path, "-n", *host_command], check=False)
            return completed.returncode
        raise ValueError(
            "Host execution found nsenter host context, but this runtime cannot execute nsenter directly "
            "and sudo is not installed to elevate nsenter."
        )

    sudo_path = shutil.which("sudo")
    if not sudo_path:
        raise ValueError(
            "Host execution needs sudo because this runtime has no nsenter host context and is not root, "
            "but sudo is not installed in the current runtime."
        )
    completed = subprocess.run([sudo_path, "-n", *host_command], check=False)
    return completed.returncode


def run_command(command: list[str], *, cwd: Path | None = None) -> int:
    completed = subprocess.run(command, cwd=cwd or REPO_ROOT, check=False)
    return completed.returncode


def run_host_command(command: list[str]) -> int:
    return run_host_argv(command)


def run_host_shell(command: str, *, cwd: Path | None = None) -> int:
    if not is_host_shell_enabled():
        raise ValueError(
            "host-shell is disabled. Set BOOKEDAI_ENABLE_HOST_SHELL=1 to enable the default trusted operator full-host lane."
        )
    shell_command = command if not cwd else f"cd {shlex.quote(str(cwd))} && {command}"
    return run_host_argv(["/bin/bash", "-lc", shell_command])


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
        "current_os_user": current_os_user(),
        "trusted_host_deploy_users": sorted(TRUSTED_HOST_DEPLOY_USERS),
        "trusted_host_deploy_user": is_trusted_host_deploy_user(),
        "host_shell_enabled": is_host_shell_enabled(),
        "sudo_available": sudo_available(),
        "nsenter_path": resolve_nsenter_path(),
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


def resolve_host_repo_root() -> Path:
    explicit = os.getenv("BOOKEDAI_HOST_REPO_DIR", "").strip()
    if explicit:
        return Path(explicit).resolve()

    if Path("/hostfs").exists() and (Path("/hostfs") / DEFAULT_HOST_REPO_ROOT.relative_to("/")).exists():
        return DEFAULT_HOST_REPO_ROOT

    return REPO_ROOT


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
    if should_use_nsenter_host_exec() or is_trusted_host_deploy_user():
        return run_host_shell("bash scripts/deploy_live_host.sh", cwd=resolve_host_repo_root())
    if shutil.which("docker") is None and is_host_shell_enabled():
        return run_host_shell("bash scripts/deploy_live_host.sh", cwd=resolve_host_repo_root())
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
    snapshot["host_exec_mode"] = "nsenter-host" if should_use_nsenter_host_exec() else "sudo-shell"
    print(json.dumps(snapshot, indent=2, sort_keys=True))
    return 0


def _http_probe(url: str, *, timeout: float = 8.0) -> dict[str, object]:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json,text/plain,*/*",
            "User-Agent": "BookedAI-OpenClaw-WhatsAppBotStatus/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw_body = response.read(4096).decode("utf-8", errors="replace")
            parsed_body: object
            try:
                parsed_body = json.loads(raw_body)
            except json.JSONDecodeError:
                parsed_body = raw_body[:500]
            return {
                "ok": 200 <= response.status < 300,
                "status_code": response.status,
                "body": parsed_body,
            }
    except urllib.error.HTTPError as exc:
        raw_body = exc.read(4096).decode("utf-8", errors="replace")
        parsed_body: object
        try:
            parsed_body = json.loads(raw_body)
        except json.JSONDecodeError:
            parsed_body = raw_body[:500]
        return {
            "ok": False,
            "status_code": exc.code,
            "body": parsed_body,
        }
    except Exception as exc:
        return {
            "ok": False,
            "status_code": None,
            "error": str(exc),
        }


def _http_probe_with_headers(
    url: str,
    *,
    headers: dict[str, str],
    timeout: float = 8.0,
) -> dict[str, object]:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json,text/plain,*/*",
            "User-Agent": "BookedAI-OpenClaw-WhatsAppBotStatus/1.0",
            **headers,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw_body = response.read(4096).decode("utf-8", errors="replace")
            try:
                parsed_body: object = json.loads(raw_body)
            except json.JSONDecodeError:
                parsed_body = raw_body[:500]
            return {
                "ok": 200 <= response.status < 300,
                "status_code": response.status,
                "body": parsed_body,
            }
    except urllib.error.HTTPError as exc:
        raw_body = exc.read(4096).decode("utf-8", errors="replace")
        try:
            parsed_body = json.loads(raw_body)
        except json.JSONDecodeError:
            parsed_body = raw_body[:500]
        return {
            "ok": False,
            "status_code": exc.code,
            "body": parsed_body,
        }
    except Exception as exc:
        return {
            "ok": False,
            "status_code": None,
            "error": str(exc),
        }


def _http_json_probe(url: str, *, payload: dict[str, object], timeout: float = 8.0) -> dict[str, object]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Accept": "application/json,text/plain,*/*",
            "Content-Type": "application/json",
            "User-Agent": "BookedAI-OpenClaw-WhatsAppBotStatus/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw_body = response.read(4096).decode("utf-8", errors="replace")
            try:
                parsed_body: object = json.loads(raw_body)
            except json.JSONDecodeError:
                parsed_body = raw_body[:500]
            return {
                "ok": 200 <= response.status < 300,
                "status_code": response.status,
                "body": parsed_body,
            }
    except urllib.error.HTTPError as exc:
        raw_body = exc.read(4096).decode("utf-8", errors="replace")
        try:
            parsed_body = json.loads(raw_body)
        except json.JSONDecodeError:
            parsed_body = raw_body[:500]
        return {
            "ok": False,
            "status_code": exc.code,
            "body": parsed_body,
        }
    except Exception as exc:
        return {
            "ok": False,
            "status_code": None,
            "error": str(exc),
        }


def _extract_whatsapp_provider_status(provider_payload: object) -> dict[str, object] | None:
    if not isinstance(provider_payload, dict):
        return None
    data = provider_payload.get("data")
    if not isinstance(data, dict):
        return None
    items = data.get("items")
    if not isinstance(items, list):
        return None
    for item in items:
        if not isinstance(item, dict):
            continue
        provider = str(item.get("provider") or "")
        if "whatsapp" in provider:
            return item
    return None


def _read_dotenv_values(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        raw_text = path.read_text()
    except OSError:
        return {}
    values: dict[str, str] = {}
    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value
    return values


def _extract_evolution_state(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    instance = payload.get("instance")
    if not isinstance(instance, dict):
        return None
    state = str(instance.get("state") or "").strip()
    return state or None


def _provider_mentions_evolution(provider_status: dict[str, object] | None) -> bool:
    if not provider_status:
        return False
    provider = str(provider_status.get("provider") or "")
    if provider == "whatsapp_evolution":
        return True
    safe_config = provider_status.get("safe_config")
    notes = safe_config.get("notes") if isinstance(safe_config, dict) else None
    if not isinstance(notes, list):
        return False
    return any("whatsapp_evolution" in str(note) for note in notes)


def handle_whatsapp_bot_status(args: argparse.Namespace) -> int:
    api_base = args.api_base.rstrip("/")
    bot_base = args.bot_base.rstrip("/")
    invalid_verify_token = args.invalid_verify_token or "bookedai-openclaw-status-invalid"
    challenge = "bookedai-openclaw-whatsapp-status"
    probes = {
        "openclaw_gateway": _http_probe(f"{bot_base}/healthz", timeout=args.timeout),
        "api_health": _http_probe(f"{api_base}/api/health", timeout=args.timeout),
        "provider_status": _http_probe(f"{api_base}/api/v1/integrations/providers/status", timeout=args.timeout),
        "whatsapp_verify_route": _http_probe(
            f"{api_base}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token={invalid_verify_token}&hub.challenge={challenge}",
            timeout=args.timeout,
        ),
        "evolution_webhook_route": _http_json_probe(
            f"{api_base}/api/webhooks/evolution",
            payload={"event": "bookedai.openclaw.status_probe", "data": {}},
            timeout=args.timeout,
        ),
    }
    provider_status = _extract_whatsapp_provider_status(probes["provider_status"].get("body"))
    provider_name = str(provider_status.get("provider") or "") if provider_status else ""
    dotenv_values = _read_dotenv_values(REPO_ROOT / ".env")
    evolution_base = (
        os.getenv("WHATSAPP_EVOLUTION_STATUS_BASE_URL")
        or dotenv_values.get("WHATSAPP_EVOLUTION_STATUS_BASE_URL")
        or os.getenv("WHATSAPP_EVOLUTION_API_URL")
        or dotenv_values.get("WHATSAPP_EVOLUTION_API_URL")
        or ""
    ).rstrip("/")
    if evolution_base == "https://waba.bookedai.au":
        evolution_base = "http://bookedai-evolution:8080"
    evolution_instance = os.getenv("WHATSAPP_EVOLUTION_INSTANCE") or dotenv_values.get("WHATSAPP_EVOLUTION_INSTANCE") or ""
    evolution_api_key = os.getenv("WHATSAPP_EVOLUTION_API_KEY") or dotenv_values.get("WHATSAPP_EVOLUTION_API_KEY") or ""
    should_probe_evolution_state = bool(
        _provider_mentions_evolution(provider_status)
        and evolution_base
        and evolution_instance
        and evolution_api_key
    )
    if should_probe_evolution_state:
        probes["evolution_connection_state"] = _http_probe_with_headers(
            f"{evolution_base}/instance/connectionState/{evolution_instance}",
            headers={"apikey": evolution_api_key},
            timeout=args.timeout,
        )
    verify_status_code = probes["whatsapp_verify_route"].get("status_code")
    evolution_webhook_status_code = probes["evolution_webhook_route"].get("status_code")
    provider_uses_evolution = _provider_mentions_evolution(provider_status)
    evolution_state = _extract_evolution_state(
        probes.get("evolution_connection_state", {}).get("body")
        if isinstance(probes.get("evolution_connection_state"), dict)
        else None
    )
    evolution_ready = evolution_state == "open" if should_probe_evolution_state else True
    channel_webhook_reaches_backend = (
        evolution_webhook_status_code == 200 if provider_uses_evolution else verify_status_code in {200, 403}
    )
    summary = {
        "agent_id": "bookedai-whatsapp-booking-care-agent",
        "agent_name": "BookedAI WhatsApp Booking Agent",
        "agent_scope": (
            "Start WhatsApp booking intake and answer service, booking, payment, provider, "
            "status, support, cancellation, and reschedule questions for records in BookedAI."
        ),
        "agent_manifest": "deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json",
        "channel": "whatsapp",
        "operator_surface": "openclaw",
        "gateway_boundary": "OpenClaw operator gateway plus BookedAI FastAPI/provider webhooks",
        "bookedai_whatsapp_number": "+61455301335",
        "support_email": "info@bookedai.au",
        "openclaw_gateway_live": bool(probes["openclaw_gateway"].get("ok")),
        "api_live": bool(probes["api_health"].get("ok")),
        "whatsapp_provider": provider_name or None,
        "whatsapp_provider_status": provider_status.get("status") if provider_status else "unknown",
        "personal_whatsapp_bridge": provider_uses_evolution,
        "evolution_connection_state": evolution_state,
        "webhook_verify_reaches_backend": verify_status_code in {200, 403},
        "webhook_verify_probe_status_code": verify_status_code,
        "evolution_webhook_reaches_backend": evolution_webhook_status_code == 200,
        "evolution_webhook_probe_status_code": evolution_webhook_status_code,
        "channel_webhook_reaches_backend": channel_webhook_reaches_backend,
        "safe_to_send_customer_messages": bool(
            probes["openclaw_gateway"].get("ok")
            and probes["api_health"].get("ok")
            and provider_status
            and provider_status.get("status") == "connected"
            and channel_webhook_reaches_backend
            and evolution_ready
        ),
        "note": (
            "This is a read-only OpenClaw/operator readiness check for the dedicated BookedAI "
            "WhatsApp booking-care agent; it does not send WhatsApp messages. "
            "When whatsapp_provider is whatsapp_evolution, the customer channel is the personal "
            "WhatsApp QR-session bridge rather than Meta/Twilio Business messaging."
        ),
    }
    print(
        json.dumps(
            {
                "status": "ok" if summary["safe_to_send_customer_messages"] else "attention_required",
                "summary": summary,
                "probes": probes,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if summary["safe_to_send_customer_messages"] else 1


def resolve_openclaw_config_path(path_value: str | None) -> Path:
    if path_value:
        return Path(path_value).expanduser().resolve()
    env_dir = os.getenv("OPENCLAW_CONFIG_DIR", "").strip()
    if env_dir:
        return (Path(env_dir).expanduser() / "openclaw.json").resolve()
    container_path = Path("/home/node/.openclaw/openclaw.json")
    if container_path.exists():
        return container_path
    return Path("/home/dovanlong/.openclaw-bookedai-v3/openclaw.json")


def handle_sync_openclaw_bookedai_agent(args: argparse.Namespace) -> int:
    spec_value = (
        str(LEGACY_OPENCLAW_WHATSAPP_AGENT_SPEC)
        if getattr(args, "legacy_whatsapp_agent", False)
        else args.spec
    )
    spec_path = Path(spec_value).expanduser().resolve()
    config_path = resolve_openclaw_config_path(args.config)
    if not spec_path.exists():
        raise ValueError(f"OpenClaw agent spec not found: {spec_path}")
    if not config_path.exists():
        raise ValueError(f"OpenClaw config not found: {config_path}")

    agent_spec = json.loads(spec_path.read_text())
    agent_id = str(agent_spec.get("id") or "").strip()
    if not agent_id:
        raise ValueError("OpenClaw agent spec must include a non-empty id.")

    config = json.loads(config_path.read_text())
    agents = config.setdefault("agents", {})
    current_list = agents.setdefault("list", [])
    if isinstance(current_list, list):
        agents["list"] = [
            item
            for item in current_list
            if not (isinstance(item, dict) and item.get("id") == agent_id)
        ]
    if isinstance(config.get("meta"), dict):
        config["meta"].pop("bookedaiAgentLastSyncedAt", None)
        config["meta"].pop("bookedaiAgentLastSyncedId", None)
    config_path.write_text(json.dumps(config, indent=2, sort_keys=False) + "\n")

    agent_manifest_dir = config_path.parent / "agents"
    agent_manifest_dir.mkdir(parents=True, exist_ok=True)
    agent_manifest_path = agent_manifest_dir / f"{agent_id}.json"
    previous_manifest_exists = agent_manifest_path.exists()
    if previous_manifest_exists and not args.no_backup:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = agent_manifest_path.with_name(f"{agent_manifest_path.name}.bak.{timestamp}")
        backup_path.write_text(agent_manifest_path.read_text())
    agent_manifest_path.write_text(json.dumps(agent_spec, indent=2, sort_keys=False) + "\n")

    print(
        json.dumps(
            {
                "status": "ok",
                "agent_id": agent_id,
                "agent_name": agent_spec.get("name"),
                "action": "updated" if previous_manifest_exists else "created",
                "config_path": str(config_path),
                "manifest_path": str(agent_manifest_path),
                "spec_path": str(spec_path),
                "runtime_note": "OpenClaw v2026.4.15 keeps the live runtime agent list schema-strict; the BookedAI agent is installed as a manifest and supervised through the operator command/API gateway.",
                "restart_required": False,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


def _write_json_with_optional_backup(path: Path, payload: dict[str, object], *, no_backup: bool) -> bool:
    previous = path.read_text() if path.exists() else None
    rendered = json.dumps(payload, indent=2, sort_keys=False) + "\n"
    if previous == rendered:
        return False
    if previous is not None and not no_backup:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup_path = path.with_name(f"{path.name}.bak.{timestamp}")
        backup_path.write_text(previous)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(rendered)
    return True


def _load_json_object(path: Path, *, default: dict[str, object] | None = None) -> dict[str, object]:
    try:
        exists = path.exists()
    except PermissionError as exc:
        raise ValueError(
            f"Cannot access {path}. Run this from the privileged OpenClaw CLI workspace "
            "or pass explicit --config/--approvals paths that this user can read."
        ) from exc
    if not exists:
        if default is not None:
            return dict(default)
        raise ValueError(f"JSON file not found: {path}")
    try:
        payload = json.loads(path.read_text())
    except PermissionError as exc:
        raise ValueError(
            f"Cannot read {path}. Run this from the privileged OpenClaw CLI workspace "
            "or pass explicit --config/--approvals paths that this user can read."
        ) from exc
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return payload


def _set_if_different(target: dict[str, object], key: str, value: object, changes: list[str], label: str) -> None:
    if target.get(key) != value:
        target[key] = value
        changes.append(f"{label}.{key}")


def _remove_if_present(target: dict[str, object], key: str, changes: list[str], label: str) -> None:
    if key in target:
        target.pop(key)
        changes.append(f"{label}.{key}:removed")


def repair_openclaw_exec_approval_policy(
    *,
    config_path: Path,
    approvals_path: Path,
    ask: str,
    no_backup: bool,
    dry_run: bool,
) -> dict[str, object]:
    config = _load_json_object(config_path)
    approvals = _load_json_object(approvals_path, default={"version": 1})
    config_changes: list[str] = []
    approvals_changes: list[str] = []

    tools = config.setdefault("tools", {})
    if not isinstance(tools, dict):
        raise ValueError(f"Expected object at tools in {config_path}")
    exec_config = tools.setdefault("exec", {})
    if not isinstance(exec_config, dict):
        raise ValueError(f"Expected object at tools.exec in {config_path}")
    _set_if_different(exec_config, "ask", ask, config_changes, "tools.exec")
    if "security" not in exec_config:
        _set_if_different(exec_config, "security", "allowlist", config_changes, "tools.exec")
    _remove_if_present(exec_config, "askFallback", config_changes, "tools.exec")

    if approvals.get("version") is None:
        _set_if_different(approvals, "version", 1, approvals_changes, "root")
    defaults = approvals.setdefault("defaults", {})
    if not isinstance(defaults, dict):
        raise ValueError(f"Expected object at defaults in {approvals_path}")
    _set_if_different(defaults, "ask", ask, approvals_changes, "defaults")
    if "security" not in defaults:
        _set_if_different(defaults, "security", "allowlist", approvals_changes, "defaults")
    if "askFallback" not in defaults:
        _set_if_different(defaults, "askFallback", "deny", approvals_changes, "defaults")

    agents = approvals.get("agents")
    if isinstance(agents, dict):
        for agent_id, agent_config in agents.items():
            if isinstance(agent_config, dict) and agent_config.get("ask") == "always":
                _set_if_different(
                    agent_config,
                    "ask",
                    ask,
                    approvals_changes,
                    f"agents.{agent_id}",
                )

    config_written = False
    approvals_written = False
    if not dry_run:
        config_written = _write_json_with_optional_backup(config_path, config, no_backup=no_backup)
        approvals_written = _write_json_with_optional_backup(approvals_path, approvals, no_backup=no_backup)

    return {
        "status": "ok",
        "dry_run": dry_run,
        "ask": ask,
        "config_path": str(config_path),
        "approvals_path": str(approvals_path),
        "config_changes": config_changes,
        "approvals_changes": approvals_changes,
        "config_written": config_written,
        "approvals_written": approvals_written,
        "restart_required": bool(config_changes or approvals_changes),
        "restart_hint": "Restart openclaw-bookedai-gateway and openclaw-bookedai-cli after applying runtime approval policy changes.",
    }


def enable_openclaw_full_access(
    *,
    config_path: Path,
    approvals_path: Path,
    telegram_allow_from: list[str],
    webchat_allow_from: list[str],
    no_backup: bool,
    dry_run: bool,
) -> dict[str, object]:
    config = _load_json_object(config_path)
    approvals = _load_json_object(approvals_path, default={"version": 1})
    config_changes: list[str] = []
    approvals_changes: list[str] = []

    tools = config.setdefault("tools", {})
    if not isinstance(tools, dict):
        raise ValueError(f"Expected object at tools in {config_path}")
    exec_config = tools.setdefault("exec", {})
    if not isinstance(exec_config, dict):
        raise ValueError(f"Expected object at tools.exec in {config_path}")
    _set_if_different(exec_config, "host", "gateway", config_changes, "tools.exec")
    _set_if_different(exec_config, "security", "full", config_changes, "tools.exec")
    _set_if_different(exec_config, "ask", "off", config_changes, "tools.exec")
    _remove_if_present(exec_config, "askFallback", config_changes, "tools.exec")

    elevated_config = tools.setdefault("elevated", {})
    if not isinstance(elevated_config, dict):
        raise ValueError(f"Expected object at tools.elevated in {config_path}")
    _set_if_different(elevated_config, "enabled", True, config_changes, "tools.elevated")
    elevated_allow_from = elevated_config.setdefault("allowFrom", {})
    if not isinstance(elevated_allow_from, dict):
        raise ValueError(f"Expected object at tools.elevated.allowFrom in {config_path}")
    _set_if_different(
        elevated_allow_from,
        "webchat",
        webchat_allow_from,
        config_changes,
        "tools.elevated.allowFrom",
    )
    _set_if_different(
        elevated_allow_from,
        "telegram",
        telegram_allow_from,
        config_changes,
        "tools.elevated.allowFrom",
    )

    agents = config.setdefault("agents", {})
    if not isinstance(agents, dict):
        raise ValueError(f"Expected object at agents in {config_path}")
    agent_defaults = agents.setdefault("defaults", {})
    if not isinstance(agent_defaults, dict):
        raise ValueError(f"Expected object at agents.defaults in {config_path}")
    _set_if_different(agent_defaults, "elevatedDefault", "full", config_changes, "agents.defaults")

    channels = config.setdefault("channels", {})
    if not isinstance(channels, dict):
        raise ValueError(f"Expected object at channels in {config_path}")
    telegram_config = channels.setdefault("telegram", {})
    if not isinstance(telegram_config, dict):
        raise ValueError(f"Expected object at channels.telegram in {config_path}")
    if telegram_allow_from == ["*"]:
        _set_if_different(telegram_config, "dmPolicy", "open", config_changes, "channels.telegram")
        _set_if_different(telegram_config, "allowFrom", ["*"], config_changes, "channels.telegram")
    else:
        _set_if_different(telegram_config, "dmPolicy", "allowlist", config_changes, "channels.telegram")
        _set_if_different(telegram_config, "allowFrom", telegram_allow_from, config_changes, "channels.telegram")

    if approvals.get("version") is None:
        _set_if_different(approvals, "version", 1, approvals_changes, "root")
    defaults = approvals.setdefault("defaults", {})
    if not isinstance(defaults, dict):
        raise ValueError(f"Expected object at defaults in {approvals_path}")
    _set_if_different(defaults, "security", "full", approvals_changes, "defaults")
    _set_if_different(defaults, "ask", "off", approvals_changes, "defaults")
    _set_if_different(defaults, "askFallback", "full", approvals_changes, "defaults")

    approvals_agents = approvals.get("agents")
    if isinstance(approvals_agents, dict):
        for agent_id, agent_config in approvals_agents.items():
            if isinstance(agent_config, dict):
                _set_if_different(
                    agent_config,
                    "security",
                    "full",
                    approvals_changes,
                    f"agents.{agent_id}",
                )
                _set_if_different(
                    agent_config,
                    "ask",
                    "off",
                    approvals_changes,
                    f"agents.{agent_id}",
                )
                _set_if_different(
                    agent_config,
                    "askFallback",
                    "full",
                    approvals_changes,
                    f"agents.{agent_id}",
                )

    config_written = False
    approvals_written = False
    if not dry_run:
        config_written = _write_json_with_optional_backup(config_path, config, no_backup=no_backup)
        approvals_written = _write_json_with_optional_backup(approvals_path, approvals, no_backup=no_backup)

    return {
        "status": "ok",
        "dry_run": dry_run,
        "mode": "full_access",
        "config_path": str(config_path),
        "approvals_path": str(approvals_path),
        "telegram_allow_from": telegram_allow_from,
        "webchat_allow_from": webchat_allow_from,
        "config_changes": config_changes,
        "approvals_changes": approvals_changes,
        "config_written": config_written,
        "approvals_written": approvals_written,
        "restart_required": bool(config_changes or approvals_changes),
        "restart_hint": "Restart openclaw-bookedai-gateway and openclaw-bookedai-cli after applying full-access runtime policy changes.",
    }


def handle_fix_openclaw_approvals(args: argparse.Namespace) -> int:
    config_path = resolve_openclaw_config_path(args.config)
    approvals_path = (
        Path(args.approvals).expanduser().resolve()
        if args.approvals
        else config_path.parent / "exec-approvals.json"
    )
    result = repair_openclaw_exec_approval_policy(
        config_path=config_path,
        approvals_path=approvals_path,
        ask=args.ask,
        no_backup=args.no_backup,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


def _resolve_openclaw_allow_from(
    explicit: list[str] | None,
    *,
    default: list[str],
    open_to_all: bool = False,
) -> list[str]:
    if open_to_all:
        return ["*"]
    if explicit:
        parsed = [item.strip() for value in explicit for item in value.split(",") if item.strip()]
        return parsed or list(default)
    return list(default)


def handle_enable_openclaw_full_access(args: argparse.Namespace) -> int:
    config_path = resolve_openclaw_config_path(args.config)
    approvals_path = (
        Path(args.approvals).expanduser().resolve()
        if args.approvals
        else config_path.parent / "exec-approvals.json"
    )
    telegram_allow_from = _resolve_openclaw_allow_from(
        args.telegram_allow_from,
        default=sorted(get_trusted_telegram_user_ids()),
        open_to_all=args.telegram_open,
    )
    webchat_allow_from = _resolve_openclaw_allow_from(
        args.webchat_allow_from,
        default=["*"],
    )
    result = enable_openclaw_full_access(
        config_path=config_path,
        approvals_path=approvals_path,
        telegram_allow_from=telegram_allow_from,
        webchat_allow_from=webchat_allow_from,
        no_backup=args.no_backup,
        dry_run=args.dry_run,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
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

    host_exec_parser = subparsers.add_parser(
        "host-exec",
        help="Alias for host-shell: run a sudo-capable fully elevated host command from trusted OpenClaw/Telegram sessions.",
    )
    host_exec_parser.add_argument("--command", required=True)
    host_exec_parser.add_argument("--cwd", default="/")
    host_exec_parser.set_defaults(handler=handle_host_shell)

    permissions_parser = subparsers.add_parser(
        "permissions",
        help="Print the resolved Telegram allowlist and action permissions for the current actor.",
    )
    permissions_parser.set_defaults(handler=handle_permissions)

    whatsapp_status_parser = subparsers.add_parser(
        "whatsapp-bot-status",
        help="Run a read-only OpenClaw/operator readiness check for the BookedAI WhatsApp bot without sending messages.",
    )
    whatsapp_status_parser.add_argument("--api-base", default="https://api.bookedai.au")
    whatsapp_status_parser.add_argument("--bot-base", default="https://bot.bookedai.au")
    whatsapp_status_parser.add_argument("--invalid-verify-token", default="bookedai-openclaw-status-invalid")
    whatsapp_status_parser.add_argument("--timeout", type=float, default=8.0)
    whatsapp_status_parser.set_defaults(handler=handle_whatsapp_bot_status)

    openclaw_agent_parser = subparsers.add_parser(
        "sync-openclaw-bookedai-agent",
        help="Create or update the BookedAI customer booking agent manifest in the OpenClaw runtime config.",
    )
    openclaw_agent_parser.add_argument("--spec", default=str(DEFAULT_OPENCLAW_AGENT_SPEC))
    openclaw_agent_parser.add_argument(
        "--legacy-whatsapp-agent",
        action="store_true",
        help="Sync the older WhatsApp-specific BookedAI booking care agent manifest.",
    )
    openclaw_agent_parser.add_argument("--config")
    openclaw_agent_parser.add_argument("--no-backup", action="store_true")
    openclaw_agent_parser.set_defaults(handler=handle_sync_openclaw_bookedai_agent)

    fix_openclaw_approvals_parser = subparsers.add_parser(
        "fix-openclaw-approvals",
        help="Repair OpenClaw exec approval policy so allow-always is not requested while effective ask mode is always.",
    )
    fix_openclaw_approvals_parser.add_argument("--config")
    fix_openclaw_approvals_parser.add_argument("--approvals")
    fix_openclaw_approvals_parser.add_argument(
        "--ask",
        choices=["on-miss", "off"],
        default="on-miss",
        help="Use on-miss to keep prompts only for untrusted commands; off disables prompts when paired with matching security policy.",
    )
    fix_openclaw_approvals_parser.add_argument("--dry-run", action="store_true")
    fix_openclaw_approvals_parser.add_argument("--no-backup", action="store_true")
    fix_openclaw_approvals_parser.set_defaults(handler=handle_fix_openclaw_approvals)

    openclaw_full_access_parser = subparsers.add_parser(
        "enable-openclaw-full-access",
        help="Enable full OpenClaw elevated/exec access for trusted webchat and Telegram operators.",
    )
    openclaw_full_access_parser.add_argument("--config")
    openclaw_full_access_parser.add_argument("--approvals")
    openclaw_full_access_parser.add_argument(
        "--telegram-allow-from",
        action="append",
        help="Telegram sender id allowlist. May be repeated or comma-separated. Defaults to BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS.",
    )
    openclaw_full_access_parser.add_argument(
        "--telegram-open",
        action="store_true",
        help="Set Telegram dmPolicy=open and allowFrom=['*']. Use only if the bot should accept every Telegram sender.",
    )
    openclaw_full_access_parser.add_argument(
        "--webchat-allow-from",
        action="append",
        help="Webchat sender allowlist. Defaults to '*', matching bot.bookedai.au operator webchat access.",
    )
    openclaw_full_access_parser.add_argument("--dry-run", action="store_true")
    openclaw_full_access_parser.add_argument("--no-backup", action="store_true")
    openclaw_full_access_parser.set_defaults(handler=handle_enable_openclaw_full_access)

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
        "host-exec": {"host_shell"},
        "whatsapp-bot-status": {"whatsapp_bot_status"},
        "sync-openclaw-bookedai-agent": {"workspace_write", "whatsapp_bot_status"},
        "fix-openclaw-approvals": {"openclaw_runtime_admin"},
        "enable-openclaw-full-access": {"openclaw_runtime_admin"},
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
