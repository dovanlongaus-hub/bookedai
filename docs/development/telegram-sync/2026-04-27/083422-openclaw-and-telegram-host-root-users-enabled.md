# OpenClaw and Telegram host root users enabled

- Timestamp: 2026-04-27T08:34:22.343521+00:00
- Source: host-access
- Category: infrastructure
- Status: completed

## Summary

Granted full host root posture to Linux users openclaw and telegram for VPS repair, deploy, Docker, and container administration.

## Details

Created the missing Linux user telegram, added both openclaw and telegram to the sudo and docker groups, and installed /etc/sudoers.d/99-bookedai-full-root-users with passwordless ALL command access. Validated sudoers syntax with visudo. Verified both users can run sudo -n id as root and sudo -n docker ps against the live host Docker environment, listing the BookedAI, OpenClaw, and Supabase containers. Updated MEMORY.md, README.md, and memory/2026-04-27.md to capture the new host operator posture.
