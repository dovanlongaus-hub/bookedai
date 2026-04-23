# OpenClaw repo permission ACL enabled

- Timestamp: 2026-04-22T13:30:23.721857+00:00
- Source: codex
- Category: operations
- Status: completed

## Summary

Provisioned Linux user openclaw and granted ACL-based write access on the host BookedAI repo mount so /workspace/bookedai.au is writable without changing repo ownership.

## Details

Installed the host acl package, created Linux user openclaw, granted execute-only traversal on /home/dovanlong, and granted recursive plus default ACL write access on /home/dovanlong/BookedAI, which is the bind-mount source for /workspace/bookedai.au in the OpenClaw stack. Verified as openclaw by creating, editing, renaming, and deleting test files and a nested directory. Synced the runtime note into README.md, deploy/openclaw/README.md, docs/development/implementation-progress.md, and memory/2026-04-22.md.
