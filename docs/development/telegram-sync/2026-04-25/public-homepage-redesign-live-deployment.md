# Public Homepage Redesign Live Deployment

Summary: deployed the redesigned `bookedai.au` homepage live, verified production rendering, and updated stack health checks for the new direct-homepage routing truth.

Details:

- Ran `python3 scripts/telegram_workspace_ops.py deploy-live`.
- The deploy encountered the known transient Docker Compose recreate race (`No such container`) and then recovered through the script's orphan-cleanup retry path.
- Production deploy completed successfully and reported all public surfaces.
- Live `https://bookedai.au` now serves the redesigned homepage directly instead of redirecting to `pitch.bookedai.au`.
- Updated `scripts/healthcheck_stack.sh` so it checks the root homepage shell marker and still probes `pitch.bookedai.au` separately as the deeper investor surface.
- Synchronized deployment state in `project.md`, `README.md`, `docs/development/implementation-progress.md`, and `memory/2026-04-25.md`.

Verification:

- `bash scripts/healthcheck_stack.sh` passed after the healthcheck routing update.
- Live Playwright smoke against `https://bookedai.au` confirmed:
  - page title: `BookedAI | The AI Revenue Engine for Service Businesses`
  - H1: `Turn demand into booked revenue.`
  - desktop nav visible: Live product, Why now, Operating model, Roadmap, Investor pitch, Open app
  - mobile viewport `390px` had `scrollWidth: 390`
  - browser console had zero errors and zero warnings
- Screenshots are stored under `frontend/output/playwright/homepage-live-redesign-2026-04-25/`.
