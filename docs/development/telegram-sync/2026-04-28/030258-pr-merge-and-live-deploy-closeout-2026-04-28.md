# PR Merge And Live Deploy Closeout — 2026-04-28

- Timestamp: 2026-04-28T03:02:58.761913+00:00
- Source: telegram
- Category: deploy
- Status: done

## Summary

Merged all open BookedAI PRs to main and deployed live

## Details

Closed the tenant follow-up release by merging PR #17, #18, #19/#20 via #18, and #21 into main, resolving Telegram/admin handoff conflicts while preserving support handoff fallback/debounce, admin claim TTL suppression, group/channel silence, group keyboard stripping, recent booking recall, and product/homepage hsess context handoff. Pushed main at 9f41d23, ran backend targeted tests (100 passed), frontend release gate (build, legacy smoke, live-read smoke, admin smoke, tenant smoke), deployed with bash scripts/deploy_live_host.sh, and verified stack health plus live API/tenant/product 200 responses.
