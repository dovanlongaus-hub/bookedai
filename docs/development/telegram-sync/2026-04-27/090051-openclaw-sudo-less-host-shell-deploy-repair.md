# OpenClaw sudo-less host-shell deploy repair

- Timestamp: 2026-04-27T09:00:51.111508+00:00
- Source: telegram
- Category: operations
- Status: done

## Summary

Fixed sudo-less OpenClaw runtime host-shell deploy path and redeployed live

## Details

Fixed the remaining deploy blocker where host-shell prepended sudo even when nsenter host context was available, causing FileNotFoundError: No such file or directory: 'sudo' in slim OpenClaw runtimes. scripts/telegram_workspace_ops.py now executes nsenter host-context commands directly and only falls back to sudo -n when there is no host namespace prefix and the process is not root. permissions now reports sudo_available and nsenter_path for diagnostics. Verified Python syntax, simulated no-sudo/nsenter execution without trying to exec sudo, ran bash scripts/deploy_live_host.sh on the VPS host, stack health passed at 2026-04-27T08:59:56Z, and API/public/product/OpenClaw probes returned HTTP 200.
