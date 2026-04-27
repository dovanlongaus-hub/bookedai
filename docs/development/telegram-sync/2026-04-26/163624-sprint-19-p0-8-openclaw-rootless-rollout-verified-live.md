# Sprint 19 P0-8 OpenClaw rootless rollout verified live

- Timestamp: 2026-04-26T16:36:24.769445+00:00
- Source: codex
- Category: change-summary
- Status: submitted

## Summary

Sprint 19 P0-8 is now closed live: OpenClaw was recreated rootless, no hostfs/Docker socket is mounted, default Telegram actions exclude full host/runtime-admin authority, host-shell requires BOOKEDAI_ENABLE_HOST_SHELL=1, gateway health passed, and operator smoke verified reduced authority.

## Details

Completed the live rollout for Sprint 19 P0-8 after the repo-side patch. The live OpenClaw compose stack was recreated through allowlisted host-command. Verification confirmed openclaw-cli runs as uid 1000, the CLI has no /hostfs and no /var/run/docker.sock, live permissions exclude host_shell and full_project, host-shell is rejected unless BOOKEDAI_ENABLE_HOST_SHELL=1 is explicitly set, and the gateway returned {ok:true,status:live} after cold start. Docs and memory were updated from repo-side pending to live closed. Future host-level deploy/admin actions through OpenClaw now require explicit break-glass or a host-side operator path instead of default Telegram full-host authority.
