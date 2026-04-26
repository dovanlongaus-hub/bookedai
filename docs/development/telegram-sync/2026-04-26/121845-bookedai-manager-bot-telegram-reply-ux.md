# BookedAI Manager Bot Telegram Reply UX

- Timestamp: 2026-04-26T12:18:45.302007+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Telegram service-search replies now use compact BookedAI-style result summaries with inline actions to open BookedAI, quick-book an option, or expand to Internet search.

## Details

Updated the customer-facing @BookedAI_Manager_Bot service-search reply format so Telegram receives a cleaner BookedAI-style result summary instead of long pipe-delimited rows. Each option now shows the service title, provider, location/price/source posture, a trimmed summary, and a concise quick-book instruction. Reply controls now use Telegram inline buttons: Open BookedAI to view and book, Book 1/2/3 quick actions, and Find more on Internet near me when the search has not already been expanded. The BookedAI web button carries query/service context into bookedai.au so customers can review richer details and complete booking on the website. Verification passed with py_compile for the messaging/webhook path, focused Telegram/chat tests (8 passed), full messaging regression (27 passed), live deploy through python3 scripts/telegram_workspace_ops.py deploy-live, stack health at 2026-04-26T12:17:42Z, and a fresh internal Telegram webhook probe returning HTTP 200 with messages_processed=1. Backend log probe showed the Telegram webhook request completed and did not emit Telegram Bot API token URLs.
