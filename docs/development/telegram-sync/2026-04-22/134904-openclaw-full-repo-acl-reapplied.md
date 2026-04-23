# OpenClaw full repo ACL reapplied

- Timestamp: 2026-04-22T13:49:04.245946+00:00
- Source: codex
- Category: operations
- Status: completed

## Summary

Re-applied recursive ACLs so Linux user openclaw now has confirmed write access across the full BookedAI repo tree, including the homepage landing section files.

## Details

Re-ran recursive and default ACL grants for Linux user openclaw on /home/dovanlong/BookedAI, which is the host bind source for /workspace/bookedai.au in the OpenClaw runtime. Verified project-wide write access as openclaw by creating, editing, renaming, and deleting test files and nested directories, then explicitly verified direct write access on frontend/src/components/landing/sections/HomepageExecutiveBoardSection.tsx and frontend/src/components/landing/sections/HomepageOverviewSection.tsx. Synced the updated runtime note into README.md, deploy/openclaw/README.md, docs/development/implementation-progress.md, and memory/2026-04-22.md.
