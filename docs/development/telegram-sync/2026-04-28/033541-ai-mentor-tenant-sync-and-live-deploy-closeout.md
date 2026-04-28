# AI Mentor tenant sync and live deploy closeout

- Timestamp: 2026-04-28T03:35:41.150790+00:00
- Source: Codex live deploy 3f8bcb9
- Category: deployment
- Status: closed

## Summary

AI Mentor tenant sync is merged to main, release-gate green, deployed live at 3f8bcb9, and production smoke passed for API, tenant, product, homepage, and AI Mentor embed/widget surfaces.

## Details

Closed the requested AI Mentor tenant sync and deploy on 2026-04-28.

What changed:
- Main now includes the AI Mentor tenant/contact/login refresh and public-intake hardening at commit 3c95d2a.
- Homepage A/B Playwright smoke was stabilized at commit 3f8bcb9 so QA deterministically checks the SME service-business wording and CTA behavior.
- Docs and memory now mark the AI Mentor embed shell as live-verified instead of fully unverified.

Verification:
- Backend targeted pytest suite passed earlier: 35 passed.
- Full frontend release gate passed: build, legacy smoke, live-read smoke, admin smoke, and tenant smoke.
- Live deploy completed with bash scripts/deploy_live_host.sh.
- Stack health passed at 2026-04-28T03:33:43Z.
- API health returned ok; tenant.bookedai.au, product.bookedai.au, bookedai.au, AI Mentor embed URL, and AI Mentor widget asset returned 200.

Follow-up:
- Static OPTIONS on /partner-plugins/ai-mentor-pro-widget.js currently returns 405, so target CORS OPTIONS 204 remains in the D-1 rehearsal checklist if explicit preflight compliance is required.
- Browser-level AI Mentor catalog/booking proof remains the M-01 rehearsal item.
