# chess.bookedai.au standalone sub-project

> Status: implemented (wave-15-c). Build artifact and deploy script live, nginx
> still routes to the shared `web` image by default — flip to Option B below
> when you want chess-only deploys to take effect.

## Why a standalone sub-app

`chess.bookedai.au` is a fully self-contained customer-facing landing
experience for Mai Hung Chess Academy. Its UX needs are decoupled from the
rest of BookedAI: pricing copy, launch promo, CTA wording, locale toggles,
and tournament news change on a chess-marketing cadence — much faster than
the rest of the platform.

Before this change every chess copy tweak forced a full monorepo redeploy
(admin + portal + tenant + futureswim + etc.) because all subdomains share a
single Vite SPA wired through `frontend/src/app/AppRouter.tsx`. The
standalone build gives chess its own independent artifact + deploy path
without forking the source tree.

## How it works

Two Vite apps, one source tree.

| | Main monorepo SPA | Chess sub-app |
|---|---|---|
| HTML shell | `frontend/index.html` | `frontend/chess.html` |
| Entry | `frontend/src/main.tsx` -> `<AppRouter>` | `frontend/src/chess-entry.tsx` -> `<ChessGrandmasterApp>` |
| Vite config | `frontend/vite.config.mts` | `frontend/vite.chess.config.mts` |
| Public dir | `frontend/public/` | `frontend/public-chess/` |
| Build artifact | `frontend/dist/` | `frontend/dist-chess/` |
| npm script | `npm run build` | `npm run build:chess` |
| Subdomains served | admin / portal / tenant / chess / etc. | chess only |

The chess entry skips `<AppRouter>` entirely — when the bundle loads, it
mounts `<ChessGrandmasterApp>` directly. All booking, `/account` redirect,
payment, and profile flows already live inside `ChessGrandmasterApp +
ChessBookingChat + the rest of `components/chess/*`, so nothing has to be
re-wired.

## Shared code map

The two apps share source code (NOT duplicated). Anything below is imported
by both `main.tsx` and `chess-entry.tsx`:

- `frontend/src/apps/public/ChessGrandmasterApp.tsx` — the chess shell
- `frontend/src/components/chess/*` — booking chat, payment selector,
  illustrations, time-slot picker
- `frontend/src/theme/chess-tokens.css` — chess design tokens
- `frontend/src/shared/api/v1.ts` — API client (`/api/v1/chess/*`,
  `/api/v1/students/*`, `/api/v1/tenants/me/students`)

The chess sub-app talks to the BookedAI backend purely through that API
surface — there is zero non-API coupling between the chess artifact and the
rest of the monorepo, so chess and main can deploy on independent cadences
without versioning their interface.

## Build commands

```bash
cd frontend
npm run build           # full monorepo (everything, ~6 MB JS, ~1.5 MB gzip)
npm run build:chess     # chess only -> frontend/dist-chess/ (~640 KB total, ~95 KB JS gzip)
```

`npm run build:chess` runs Vite directly with the chess config — no tsc
prepass (typecheck is invoked by the deploy script). Output:
`frontend/dist-chess/index.html` + `frontend/dist-chess/assets/chess-*.{js,css}`.

For local development of the chess sub-app in isolation:

```bash
npm run preview:chess   # serves dist-chess/ on port 3001
```

## Deploy commands

| Goal | Command |
|---|---|
| Chess copy / CTA / promo only | `bash scripts/deploy_chess.sh` |
| Full stack (backend + frontend + nginx + cron) | `bash scripts/deploy_production.sh` |

`scripts/deploy_chess.sh`:
1. Runs `npx tsc --noEmit -p .` against the whole frontend (chess shares
   the type system with the rest of the monorepo, so a type break elsewhere
   should still fail a chess deploy).
2. Runs `npm run build:chess`.
3. `rsync -av --delete dist-chess/ $NGINX_CHESS_ROOT/`
   (default: `/var/www/chess.bookedai.au`).
4. `nginx -s reload`. No docker / proxy restart.

## When to use which deploy

- **Chess-only deploy** for: chess landing copy, pricing tier numbers, promo
  banner end date, locale string changes, CTA wording, course illustrations,
  Lichess/Zoom links — anything that lives inside `apps/public/Chess*` or
  `components/chess/*` and does NOT touch the API contract or shared types
  used by other apps.
- **Full monorepo deploy** for: backend changes, API shape changes in
  `shared/api/v1.ts`, schema migrations, anything that touches the rest of
  the platform, dependency bumps in `frontend/package.json`.

If you change `shared/api/v1.ts` you should run BOTH deploys (chess for the
new client, full for the backend) — the chess artifact is the older client
unless you redeploy it.

## nginx wiring

### Option A (default today): keep proxying to the docker `web` image

The current production nginx config (`deploy/nginx/bookedai.au.conf`) has
chess.bookedai.au proxy `/` to `http://web:80`, which serves the shared
`frontend/dist/` baked into the docker image. With Option A,
`scripts/deploy_chess.sh` is a no-op against production until the operator
flips to Option B — but you still get `npm run build:chess` for verifying
the chess artifact works in isolation.

Option A is the safe default because `scripts/deploy_production.sh` rebuilds
the docker images on every run; if nginx pointed at a host volume but the
operator forgot to populate it, chess would 404.

### Option B: serve dist-chess/ directly from the host

When you want chess-only deploys to actually flip the live site, replace
the chess.bookedai.au server block in `deploy/nginx/bookedai.au.conf`:

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name chess.bookedai.au;

    ssl_certificate /etc/letsencrypt/live/bookedai.au-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookedai.au-0001/privkey.pem;

    client_max_body_size 20m;

    root /var/www/chess.bookedai.au;
    index index.html;

    location ~ /\.(?!well-known) {
        access_log off;
        log_not_found off;
        return 404;
    }

    # Backend API still proxies to the shared FastAPI container.
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
    }

    # SPA fallback — every client-side route returns index.html.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then `mkdir -p /var/www/chess.bookedai.au` on the host (and mount it into
the nginx container via `docker-compose.yml` volumes if the proxy runs in
docker), and `bash scripts/deploy_chess.sh` will start writing to the live
serving root.

## Future: extracting to its own npm workspace

If the chess sub-app grows enough to warrant its own dependency tree
(e.g. it pulls in chess-engine libraries, Lichess SDK, rating calculators
that the main app doesn't need), the next step is:

1. Convert `frontend/` into an npm workspaces root with two packages:
   `packages/main-spa/` and `packages/chess/`, each with its own
   `package.json`.
2. Move shared code (`apps/public/ChessGrandmasterApp.tsx`,
   `components/chess/*`, `theme/chess-tokens.css`, `shared/api/v1.ts`)
   into `packages/shared/` referenced from both apps.
3. Each package gets its own `tsconfig.json` and Vite config.

Until that day, the current single-`frontend/` two-Vite-config setup is the
minimal-friction split that lets chess iterate independently.
