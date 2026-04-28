# AI Mentor 1-1 Pro tenant login refresh

- Timestamp: 2026-04-28T04:25:06.141992+00:00
- Source: tenant.bookedai.au/ai-mentor-doer
- Category: tenant-auth
- Status: completed

## Summary

Updated the live AI Mentor tenant to AI Mentor 1-1 Pro with login aimentor@bookedai.au / FirstHundredM$ and phone/Telegram/WhatsApp +61481993178; verified DB, API, and browser sign-in.

## Details

Changed tenant ai-mentor-doer to display as AI Mentor 1-1 Pro. Refreshed seed migration 013 for fresh bootstrap and added/applied idempotent migration 026_ai_mentor_pro_contact_login_update.sql live on supabase-db. The live DB now has active credential username/email aimentor@bookedai.au with the requested password baseline, contact_phone/support_phone/support_whatsapp/support_telegram/plugin support phone set to +61481993178, and partner plugin name AI Mentor 1-1 Pro. Verification passed: live password-auth API returned status ok with tenant_admin for aimentor@bookedai.au / FirstHundredM$; the previous password returned 401; live Playwright browser smoke on https://tenant.bookedai.au/ai-mentor-doer signed in successfully, showed Connected as aimentor@bookedai.au, displayed Tenant Admin, and enabled catalog write controls such as save/publish/archive.
