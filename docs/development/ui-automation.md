# UI automation options

BookedAI supports two browser automation lanes:

- Playwright (already configured in `frontend/`)
- Pyppeteer smoke scripts (`scripts/ui/`)

## Playwright (frontend suite)

Run from repo root:

```bash
cd frontend
npm install
npm run test:playwright:smoke
```

### Basic workflows (tight local gate)

Use this when you want a **short** pass over the main product + bridge paths: homepage shell, bridge auth, internal session proxy, **public catalog proxy** (`tests/example-orchestration-flows.spec.ts`).

```bash
cd frontend
npm install
# Requires UI + bridge reachable from this machine (defaults: UI :3000, bridge :18810).
export PLAYWRIGHT_EXTERNAL_SERVER=1
export PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
export PLAYWRIGHT_BRIDGE_URL=http://127.0.0.1:18810   # from inside Docker frontend use http://172.17.0.1:18810
npm run test:playwright:basic-workflows
```

`npm run test:playwright:basic-workflows` runs `scripts/run_basic_workflows.sh` (example flows only; no `vite preview` when `PLAYWRIGHT_EXTERNAL_SERVER=1`). For the wider legacy homepage responsive cases, use `npm run test:playwright:smoke` (build + preview + multiple specs).

HTTP-only smoke (no browser), from repo root — good right after `docker compose up`:

```bash
bash scripts/smoke_local_basic_workflows.sh
```

Override hosts if needed: `BACKEND_BASE=http://127.0.0.1:8001 BRIDGE_BASE=http://127.0.0.1:18810`.

## Pyppeteer smoke

Install python dependency:

```bash
python3 -m pip install -r scripts/ui/requirements.txt
```

Run smoke against local frontend:

```bash
python3 scripts/ui/pyppeteer_smoke.py
```

Useful environment overrides:

- `UI_SMOKE_URL` (default `http://localhost:3000`)
- `UI_SMOKE_WAIT_SELECTOR` (default `#root`)
- `UI_SMOKE_SCREENSHOT_PATH` (default `artifacts/ui-smoke.png`)
- `UI_SMOKE_TIMEOUT_MS` (default `20000`)
