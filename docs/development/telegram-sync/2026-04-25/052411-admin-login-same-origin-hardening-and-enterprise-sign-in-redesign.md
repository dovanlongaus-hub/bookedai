# Admin login same-origin hardening and enterprise sign-in redesign

- Timestamp: 2026-04-25T05:24:11.533635+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Fixed the remaining admin.bookedai.au login Load failed path by forcing the admin host to use same-origin /api before VITE_API_BASE_URL, normalized browser network login errors, redesigned the admin login screen into an enterprise control-plane entry, pushed commit c00fa63 to main, deployed live, and verified production browser login now posts to https://admin.bookedai.au/api/admin/login.

## Details

Root cause: the previous routing fix made /api work on admin.bookedai.au, but the production frontend bundle could still honor the global VITE_API_BASE_URL and call https://api.bookedai.au/api from the admin browser context. Some browsers can surface that cross-origin/network path as a raw Load failed message.\n\nImplementation: frontend/src/shared/config/api.ts now resolves admin.bookedai.au to same-origin /api before environment overrides. frontend/src/features/admin/api.ts now catches raw TypeError transport failures during login and turns Load failed / Failed to fetch / NetworkError into an operator-readable admin API reachability message. frontend/src/features/admin/login-screen.tsx was rebuilt as a dark enterprise control-plane sign-in surface with secure sign-in treatment, API-route posture, BookedAI branding, and concise operational context.\n\nQA: npm --prefix frontend exec tsc -- --noEmit passed; npm --prefix frontend run build passed; npm --prefix frontend run test:playwright:admin-smoke passed; .venv/bin/python -m pytest backend/tests -q passed with 259 tests; bash scripts/run_release_gate.sh passed. A hostname-mapped Playwright check against the built bundle proved admin login posts to /api/admin/login on the admin origin.\n\nDeploy verification: pushed commit c00fa63 to origin/main, deployed with python3 scripts/telegram_workspace_ops.py deploy-live, bash scripts/healthcheck_stack.sh passed, https://admin.bookedai.au/api/health returned backend JSON, bad-password curl returned backend 401 Invalid admin credentials, and a live Chromium probe confirmed the redesigned login screen submits to https://admin.bookedai.au/api/admin/login with only the expected 401 for an invalid password.
