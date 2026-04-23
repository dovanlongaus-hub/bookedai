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
- The `openclaw-cli` service is the elevated execution surface on this host: it runs as `root`, mounts the host filesystem at `/hostfs`, and mounts `/var/run/docker.sock` so trusted OpenClaw actions can operate across the VPS when needed
- The `openclaw-gateway` service stays in its standard runtime mode so the Control UI and Telegram bridge do not inherit the same broad host privileges
- The gateway can take several minutes to complete a cold start while plugins and channels initialize, so the compose healthcheck keeps a 12 minute startup grace to avoid false `unhealthy` states during normal boot
- Telegram defaults should stay on DM pairing for safety
- OpenClaw Control UI is served directly by the Gateway on port `18789`
- The intended public reverse-proxy host for that UI is `https://bot.bookedai.au/`
- Optional Anthropic-native Claude access can be injected at runtime with `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL`; the compose stack forwards both into the gateway and CLI without requiring secrets in tracked docs.
