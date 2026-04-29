# aimentor.bookedai.au — standalone sub-project

This file documents the wave-17 split: aimentor.bookedai.au can be built and
deployed independently of the rest of the BookedAI monorepo, while still
sharing source code and consuming the BookedAI backend through the public
`/api/v1/*` HTTP surface.

## Files in the split

| Path                                       | Purpose                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| `frontend/src/aimentor-entry.tsx`          | Standalone Vite entry (no AppRouter, no other subdomains) |
| `frontend/aimentor.html`                   | HTML shell with aimentor metadata + favicon              |
| `frontend/vite.aimentor.config.mts`        | Vite config → `dist-aimentor/`, port 3002 for preview    |
| `frontend/public-aimentor/`                | Public assets (favicon, robots, etc.)                    |
| `scripts/deploy_aimentor.sh`               | Independent deploy: build + copy into running web container |

Source files live in the same monorepo and are NOT duplicated:

- `frontend/src/apps/public/AIMentorBookedAIApp.tsx` (landing + booking flow)
- `frontend/src/apps/public/AIMentorAccountApp.tsx` (student portal)
- `frontend/src/apps/public/AIMentorZohoOAuthCallbackApp.tsx` (admin OAuth wizard)
- `frontend/src/apps/public/aimentor/AIMentorChat.tsx` (custom chat UI)
- `frontend/src/features/admin/AIMentorZohoCredentialsPanel.tsx`
- `frontend/src/shared/api/v1.ts` (the only coupling to the BookedAI backend)

## Build + preview locally

```bash
cd frontend
npm run build:aimentor       # → dist-aimentor/index.html + assets/
npm run preview:aimentor     # serves dist-aimentor/ on port 3002
```

## Architecture

```
                     ┌───────────────────────────────┐
   aimentor.bookedai.au (browser)
                     │
                     │  GET /                  → static bundle (dist-aimentor/)
                     │  POST /api/v1/aimentor/...  → BookedAI backend
                     ▼
              ┌─────────────┐         ┌───────────────────┐
              │  bookedai-   │         │  bookedai-        │
              │  proxy-1     │ ──────▶ │  web-1 (nginx)    │
              │  (nginx)     │         │  serves dist/ +   │
              └─────────────┘         │  dist-aimentor/   │
                     │                 └─────────┬─────────┘
                     │                           │ /api/*
                     │                           ▼
                     │                 ┌───────────────────┐
                     └────────────────▶│  bookedai-        │
                                       │  backend-1        │
                                       │  (FastAPI)        │
                                       └───────────────────┘
```

The backend is shared. Edit aimentor frontend code → run
`scripts/deploy_aimentor.sh` → only the static bundle in
`/usr/share/nginx/html-aimentor/` of the running web container is replaced.
Nothing else restarts.

## What still needs nginx routing (deferred)

The standalone build produces `dist-aimentor/`, and `deploy_aimentor.sh`
copies it into the running web container at `/usr/share/nginx/html-aimentor/`.
But until nginx is told to **serve** that path for `Host: aimentor.bookedai.au`,
the standalone bundle is dormant: aimentor.bookedai.au still falls through to
the main monorepo SPA's default `/index.html` and uses `AppRouter` to render
`<AIMentorBookedAIApp>`.

To activate the standalone bundle, add to `frontend/nginx/default.conf`:

```nginx
server {
    listen 80;
    server_name aimentor.bookedai.au;

    root /usr/share/nginx/html-aimentor;
    index index.html;

    # share the same /api/ proxy + asset cache rules from the default block
    include /etc/nginx/conf.d/_aimentor_locations.conf;

    location / {
        try_files $uri /index.html;
    }
}
```

…then rebuild the `web` image (one-time) and run `deploy_aimentor.sh` from
then on for static-only updates.

This nginx change is intentionally NOT in this commit — it requires testing
in beta first to avoid taking aimentor.bookedai.au down on a config typo.
Track in a wave-17b PR.

## Why split

Editing copy / CTAs / pricing on aimentor today requires rebuilding the
entire monorepo SPA (which packages every other subdomain too) and waiting
for the full `web` image to rebuild + restart. With the split:

- Re-deploy aimentor in <60s without touching backend or other subdomains
- Smaller bundle on aimentor.bookedai.au (~440KB vs full monorepo bundle)
- Clear coupling boundary: aimentor talks to backend only via `/api/v1/*`
- Mirrors the existing `chess.bookedai.au` standalone pattern
