# TOOLS.md

## Runtime

- Workspace root: `/workspace/bookedai.au`
- OpenClaw gateway: `http://127.0.0.1:18789`
- Telegram bot: `@Bookedairevenuebot`

## Notes

- Elevated Telegram access is enabled only for the trusted operator user
- Repo files are writable by the OpenClaw runtime user
- Persistent memory files live at `MEMORY.md` and `memory/YYYY-MM-DD.md`
- Master project source of truth: `project.md`
- Supporting docs to sync under it: `README.md`, `DESIGN.md`, and the `docs/` tree
- Live deploys must use host-level elevated execution because Docker is only available on the VPS host, not in the default OpenClaw container runtime
- Preferred live deploy command: `bash scripts/deploy_live_host.sh`
- For Telegram deploy requests, prefer host execution with full security and the wrapper above before falling back to raw `scripts/deploy_production.sh`
- Preferred Telegram operator entrypoint:
  `python3 scripts/telegram_workspace_ops.py ...`
- Use:
  `python3 scripts/telegram_workspace_ops.py sync-doc --title "..." --summary "..." --details-file path/to/doc.md`
  for detailed Notion and Discord updates.
- Use:
  `python3 scripts/telegram_workspace_ops.py sync-repo-docs --skip-discord`
  when the operator wants to publish the current repo documentation set into Notion without posting every page to Discord.
- Use:
  `python3 scripts/telegram_workspace_ops.py build-frontend`
  when the Telegram operator asks to build the BookedAI product surfaces.
- Use:
  `python3 scripts/telegram_workspace_ops.py deploy-live`
  when the Telegram operator explicitly asks to deploy the current BookedAI worktree live on the host.
- Use:
  `python3 scripts/telegram_workspace_ops.py host-command --command "apt-get update"`
  when the Telegram operator needs one of the approved host-level maintenance commands without opening a general-purpose root shell.
- The sync flow always archives the update under `docs/development/telegram-sync/`, then tries Notion sync when `NOTION_API_TOKEN` plus `NOTION_PARENT_PAGE_ID` or `NOTION_DATABASE_ID` are configured, and posts the same summary into Discord when `DISCORD_BOT_TOKEN` and guild or channel settings are configured.
- Discord posts should contain the direct summary text, not just archive or Notion links.
- Notion remains the full-detail destination for long-form change notes and documentation payloads.
- Change-closeout standard for future updates:
  - update the request or requirement document
  - update `docs/development/implementation-progress.md`
  - update the corresponding sprint or phase or roadmap document
  - sync the detailed note to Notion
  - mirror the summary to Discord when the update is operator-relevant
