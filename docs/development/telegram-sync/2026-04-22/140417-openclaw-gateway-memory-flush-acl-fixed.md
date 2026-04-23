# OpenClaw gateway memory flush ACL fixed

- Timestamp: 2026-04-22T14:04:17.788830+00:00
- Source: codex
- Category: operations
- Status: completed

## Summary

Fixed the remaining EACCES on memory flushes by granting the BookedAI bind mount ACL write access to the gateway runtime user uid 1000, not just the host openclaw user.

## Details

Investigated the failed write to /workspace/bookedai.au/memory/2026-04-22.md and confirmed the live openclaw-bookedai-gateway container runs as uid 1000 (node in-container, ubuntu on this host). The earlier ACL work covered host user openclaw but not the gateway runtime uid, so file writes from the standard OpenClaw runtime could still fail with EACCES on files such as memory/2026-04-22.md. Applied recursive plus default ACL write access for host uid 1000 across /home/dovanlong/BookedAI, preserved the existing bind mount to /workspace/bookedai.au, verified in-container write access on the memory note, removed the temporary probe line, and synchronized the runtime note into README.md, deploy/openclaw/README.md, docs/development/implementation-progress.md, and memory/2026-04-22.md.
