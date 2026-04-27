# Backend live redeploy and Telegram operator boundary

- Timestamp: 2026-04-27T05:49:02.050725+00:00
- Source: telegram
- Category: DevOps/Live
- Status: closed

## Summary

Backend/customer-care fixes were redeployed live; trusted Telegram actor 8426853622 has approved deploy and allowlisted host-command authority, while unrestricted host-shell remains break-glass only.

## Details

Deployed through python3 scripts/telegram_workspace_ops.py deploy-live after fixing the deploy-blocking frontend TypeScript error in BookingAssistantDialog.tsx by replacing an undefined MessageIcon reference with lucide-react MessageCircle. Focused backend route tests passed for communication, Telegram webhook, and booking routes (24 passed); frontend TypeScript passed; stack health passed at 2026-04-27T05:48:02Z; live API health returned 200. The operator permission snapshot confirms deploy_live, host_command, build/test/workspace actions and allowlisted host programs are available to trusted actor 8426853622. Full unrestricted host_shell was not enabled and remains gated by BOOKEDAI_ENABLE_HOST_SHELL=1 for explicit audited break-glass sessions.
