# OpenClaw full deploy host permissions repaired

- Timestamp: 2026-04-27T08:54:02.233795+00:00
- Source: telegram
- Category: operations
- Status: done

## Summary

OpenClaw full deploy host permissions repaired and verified

## Details

Re-applied BookedAI full deploy host permissions for trusted Linux users openclaw and telegram. Both users now have passwordless root sudo, Docker host access, repo ACL read/write including memory files, executable deploy/operator scripts, and trusted Telegram actor 8426853622 retains deploy_live, host_shell, openclaw_runtime_admin, and full_project. Verified by running a full production deploy-live as openclaw; stack health passed at 2026-04-27T08:53:07Z and API/public/OpenClaw hosts returned HTTP 200.
