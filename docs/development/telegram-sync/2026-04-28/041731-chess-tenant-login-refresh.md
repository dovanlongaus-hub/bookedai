# Chess tenant login refresh

- Timestamp: 2026-04-28T04:17:31.570833+00:00
- Source: tenant.bookedai.au/co-mai-hung-chess-class
- Category: tenant-auth
- Status: completed

## Summary

Updated the live chess tenant login/contact to chess@bookedai.au with password FirstHundredM$, applied migration 025, and verified API plus browser sign-in.

## Details

Changed co-mai-hung-chess-class from stale demo access to the requested tenant credential chess@bookedai.au / FirstHundredM$. Added and applied backend/migrations/sql/025_chess_tenant_contact_login_update.sql live on supabase-db. The migration creates the active chess@bookedai.au tenant_admin membership and credential, aligns tenant settings plus service owner/business email to chess@bookedai.au, and marks stale tenant1 / 123 plus the older chess username credential inactive. Verification passed: live password-auth API returned status ok for chess@bookedai.au with tenant_admin on co-mai-hung-chess-class; old tenant1 / 123 returned 401; live Playwright browser smoke on https://tenant.bookedai.au/co-mai-hung-chess-class signed in successfully, showed Connected as chess@bookedai.au, displayed Tenant Admin, and enabled write controls such as catalog save/publish/archive.
