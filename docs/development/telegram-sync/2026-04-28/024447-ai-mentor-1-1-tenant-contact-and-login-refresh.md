# AI Mentor 1-1 tenant contact and login refresh

- Timestamp: 2026-04-28T02:44:47.654819+00:00
- Source: codex
- Category: tenant-data
- Status: completed

## Summary

Updated AI Mentor 1-1 tenant login/contact identity to aimentor@bookedai.au and +84908444095.

## Details

Changed the AI Mentor 1-1 tenant baseline for slug ai-mentor-doer: login username/email is now aimentor@bookedai.au with password FirstHundred1M$; contact email is aimentor@bookedai.au; phone, WhatsApp, Telegram, and iMessage contact are +84908444095. Updated seed migration 013 for fresh bootstrap and added idempotent migration 023_ai_mentor_contact_login_update.sql so already-seeded tenant3 / 123 environments are upgraded and stale demo credentials are removed. Synced project.md, implementation progress, migration docs, Phase 19 roadmap detail, past-work log, AI Mentor plugin interface doc, and daily memory.
