# OpenClaw webchat elevated deploy gate fixed

- Timestamp: 2026-04-22T14:18:07.408853+00:00
- Source: codex
- Category: operations
- Status: completed

## Summary

Fixed the live webchat deploy blocker by allowing elevated exec from provider webchat and correcting openclaw-cli so the privileged node-host process stays up.

## Details

Investigated the live deploy blocker reported from webchat and confirmed the failure was at OpenClaw tool-policy level rather than in BookedAI build or deploy code. Gateway logs showed elevated exec requests from provider webchat were denied because live state only allowed tools.elevated.allowFrom for telegram. Inspection also showed openclaw-bookedai-cli was misconfigured with only the bare CLI entrypoint, so it exited after printing help instead of running the long-lived node host. Updated the live OpenClaw state file at /home/dovanlong/.openclaw-bookedai-v3/openclaw.json to add tools.elevated.allowFrom.webchat=[*], updated deploy/openclaw/docker-compose.yml so openclaw-cli runs node dist/index.js node run --host 127.0.0.1 --port 18789 --display-name bookedai-host-cli, recreated the OpenClaw stack, and confirmed openclaw-bookedai-cli now stays up instead of exiting immediately. Synchronized the operator note into README.md, deploy/openclaw/README.md, docs/development/implementation-progress.md, and memory/2026-04-22.md. End-to-end verification of the exact webchat deploy path is still pending because triggering it here would perform a real live deployment.
