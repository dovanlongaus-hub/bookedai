# Unhealthy stray container removed and GitHub sync prepared

- Timestamp: 2026-04-27T00:12:35.617363+00:00
- Source: codex-container-github-sync
- Category: ops
- Status: completed

## Summary

Removed the stray unhealthy optimistic_greider container after confirming it had no mounts, ports, compose ownership, or restart policy. Stack health passed again at 2026-04-27T00:11:53Z. GitHub sync is proceeding for repo changes except the new workflow file, which requires a GitHub token with workflow scope.

## Details

Operator request: handle the unhealthy container and sync GitHub.

Container remediation:

- Inspected `optimistic_greider` via host Docker.
- It was a standalone `ghcr.io/openclaw/openclaw:latest` container created on `2026-04-25`, not a compose-managed production service.
- It had no mounts, no published ports, no restart policy, and no useful logs.
- Removed it with `docker rm -f optimistic_greider`.
- Verified `docker ps` no longer shows unhealthy containers in the BookedAI/OpenClaw/Supabase stack.
- Stack health passed again at `2026-04-27T00:11:53Z`.

GitHub sync posture:

- Current branch is `main` and `origin/main` is reachable.
- GitHub CLI is authenticated.
- The token lacks `workflow` scope, so the untracked `.github/workflows/release-gate.yml` file is intentionally excluded from this sync to avoid GitHub rejecting the push.
- All other repo changes are being staged, committed, and pushed to `origin/main`.
