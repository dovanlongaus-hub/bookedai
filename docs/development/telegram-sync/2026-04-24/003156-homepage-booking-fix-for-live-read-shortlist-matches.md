# Homepage booking fix for live-read shortlist matches

- Timestamp: 2026-04-24T00:31:56.336503+00:00
- Source: docs/development/implementation-progress.md
- Category: bug-fix
- Status: shipped

## Summary

Fixed the homepage booking regression where some shortlisted matches failed with Selected service was not found, and redeployed the fix live.

## Details

Updated frontend/src/apps/public/HomepageSearchExperience.tsx so non-catalog shortlist matches no longer fall through to the legacy /booking-assistant/session path. Those live-read and public-web matches now stay on the authoritative v1 booking-intent flow, which prevents the Selected service was not found error on the homepage booking form. Production was redeployed with python3 scripts/telegram_workspace_ops.py deploy-live and host health passed again via bash scripts/healthcheck_stack.sh at 2026-04-24T00:31:24Z.
