# OpenClaw for BookedAI

This stack runs OpenClaw in a dedicated Docker Compose project while mounting the live BookedAI repository into the container at `/workspace/bookedai.au`.

## Files

- `docker-compose.yml`: isolated OpenClaw gateway + CLI services
- `.env.example`: machine-local variables template

## Local setup

1. Copy `.env.example` to `.env`
2. Set `OPENCLAW_GATEWAY_TOKEN`
3. Set `TELEGRAM_BOT_TOKEN`
4. Start the stack:

```bash
docker compose --env-file deploy/openclaw/.env -f deploy/openclaw/docker-compose.yml up -d
```

## Runtime notes

- OpenClaw state lives in `${OPENCLAW_CONFIG_DIR}`
- The BookedAI repo is mounted read-write at `/workspace/bookedai.au`
- On the current VPS host, that mount source is `/home/dovanlong/BookedAI`; Linux user `openclaw` now has ACL-based write access on the repo tree plus traverse access on `/home/dovanlong`, so file edits made through `/workspace/bookedai.au` can persist cleanly without re-owning the repository
- The repo ACL was re-applied recursively on `2026-04-22` so the permission model now covers the full BookedAI tree, including the landing-page sections `HomepageExecutiveBoardSection.tsx` and `HomepageOverviewSection.tsx`
- The standard `openclaw-gateway` container runs as `node` (`uid 1000`), so the host bind source now also grants ACL write access to host `uid 1000`; without that extra ACL entry, gateway-side memory flushes and repo updates can still fail with `EACCES`
- The webchat elevated-exec path was also fixed on `2026-04-22`: live OpenClaw state now allows provider `webchat` under `tools.elevated.allowFrom`, and `openclaw-cli` now runs the long-lived node host command `openclaw node run --host 127.0.0.1 --port 18789 --display-name bookedai-host-cli` instead of exiting after the CLI help screen
- Codex credentials are reused from `${CODEX_HOME_DIR}`
- The `openclaw-cli` service now runs in the requested full-host default posture (`OPENCLAW_CLI_USER=0:0`, `privileged: true`, `pid: host`) and mounts `/` at `/hostfs` plus `/var/run/docker.sock`, so trusted operator actions can enter the VPS namespaces and control Docker/system services from Telegram/OpenClaw.
- The default Telegram/OpenClaw action vocabulary grants `host_shell`, `openclaw_runtime_admin`, and `full_project` to trusted Telegram actors, alongside repo-scoped commands, read-only status checks, and allowlisted `host-command` programs.
- `python3 scripts/telegram_workspace_ops.py host-shell --command "..." --cwd /` is enabled by default through `BOOKEDAI_ENABLE_HOST_SHELL=1`, making the break-glass full-host lane ambient for trusted operator sessions.
- The live Telegram channel now runs in allowlist mode for the trusted operator instead of DM pairing mode: `channels.telegram.dmPolicy="allowlist"` with `channels.telegram.allowFrom=["8426853622"]`, so trusted Telegram control no longer blocks on pairing approval first
- `openclaw-cli` now also uses `restart: unless-stopped` in compose so the long-lived node host reconnects automatically if it starts before the gateway is ready or exits after an early gateway race
- The `openclaw-gateway` service stays in its standard runtime mode so the Control UI and Telegram bridge do not inherit the same broad host privileges
- The WhatsApp customer-care bot now has a read-only OpenClaw readiness check through `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status`; it checks `bot.bookedai.au`, API health, the WhatsApp provider status, and the WhatsApp verify route without sending a customer message
- The default trusted action vocabulary includes `whatsapp_bot_status`, `host_shell`, `openclaw_runtime_admin`, and `full_project`, so Telegram/OpenClaw operators can run both status checks and full-host repair/deploy commands
- The gateway can take several minutes to complete a cold start while plugins and channels initialize, so the compose healthcheck keeps a 12 minute startup grace to avoid false `unhealthy` states during normal boot
- If an approval action fails with `allow-always is unavailable because the effective policy requires approval every time`, run `python3 scripts/telegram_workspace_ops.py fix-openclaw-approvals` only from an explicitly approved runtime-admin session. This action is no longer part of the default Telegram action set.
- For trusted full control from `bot.bookedai.au` webchat and Telegram, `python3 scripts/telegram_workspace_ops.py enable-openclaw-full-access` remains the runtime policy repair/apply command. The repo default now already grants the trusted operator action set and host-shell environment needed for full access; add `--telegram-open` only if every Telegram sender should be allowed to control the bot.
- Telegram defaults should stay on DM pairing for safety
- OpenClaw Control UI is served directly by the Gateway on port `18789`
- The intended public reverse-proxy host for that UI is `https://bot.bookedai.au/`
- Optional Anthropic-native Claude access can be injected at runtime with `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL`; the compose stack forwards both into the gateway and CLI without requiring secrets in tracked docs.

## Customer booking agent manifest

The always-on BookedAI customer booking agent is defined in the repo at:

```bash
deploy/openclaw/agents/bookedai-booking-customer-agent.json
```

It is the OpenClaw manifest for `BookedAI Booking Customer Agent`, a customer-facing agent that uses OpenAI auth from `OPENAI_API_KEY`, can search BookedAI service data, can widen service discovery to internet/public-web results through BookedAI's AI Engine when enabled, and serves website chat plus Telegram customer threads. It is not the OpenClaw operator/programming bot and has no repo-write, deploy, or host-shell authority.

Sync the manifest into the OpenClaw runtime config directory with:

```bash
python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent
```

The older WhatsApp-specific care manifest remains available for compatibility:

```bash
python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent --legacy-whatsapp-agent
```

## WhatsApp bot operator check

The legacy BookedAI WhatsApp agent is defined in the repo at:

```bash
deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json
```

Run this from the repo directly, through Telegram, or from the OpenClaw CLI workspace mount:

```bash
python3 scripts/telegram_workspace_ops.py whatsapp-bot-status
```

Expected healthy posture:

- OpenClaw gateway is live at `https://bot.bookedai.au/healthz`
- API health is live at `https://api.bookedai.au/api/health`
- `whatsapp_evolution` reports `connected` while WhatsApp Business verification is pending
- the Evolution webhook route reaches FastAPI at `/api/webhooks/evolution`
- when the runtime is switched back to Meta/Twilio Business messaging, the WhatsApp verify route reaches FastAPI and returns either the challenge for a valid token or `403` for the intentionally invalid probe token

OpenClaw v2026.4.15 keeps `openclaw.json` agent runtime entries schema-strict, so BookedAI customer agents are installed as OpenClaw manifests under the runtime `agents/` directory and supervised through the operator command plus BookedAI API gateway. The WhatsApp-specific check is intentionally read-only. Do not use it as a substitute for an approved end-to-end WhatsApp send test from the paired phone/session.
