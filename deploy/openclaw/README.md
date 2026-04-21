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
- Codex credentials are reused from `${CODEX_HOME_DIR}`
- Telegram defaults should stay on DM pairing for safety
