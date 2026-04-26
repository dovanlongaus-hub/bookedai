# Homepage chess tenant prompt aligned

- Timestamp: 2026-04-26T01:47:05.500963+00:00
- Source: Codex follow-up implementation and live UAT
- Category: homepage-ux
- Status: deployed

## Summary

Aligned the BookedAI homepage chess quick prompt and proof row with the verified Co Mai Hung Chess tenant runtime, then verified live that the prompt returns a tenant-backed result without public-web fallback warning.

## Details

# Homepage Chess Tenant Prompt Alignment - 2026-04-26

## Summary

The homepage chess quick prompt has been aligned with the verified tenant proof story. Instead of sending visitors into a broad Sydney chess search that could fall back to public web results, the prompt now targets the reviewed Co Mai Hung Chess tenant row directly.

## What Changed

- Replaced `Book a kids chess class near Sydney this week` with `Book Co Mai Hung Chess Sydney pilot class this week`.
- Updated English and Vietnamese homepage suggestion content to use the same tenant-specific chess intent.
- Updated the proof row from broad `Grandmaster Chess` wording to `Co Mai Hung Chess / Verified tenant booking / Grandmaster proof`.

## Verification

- Frontend typecheck passed.
- Frontend production build passed.
- Local Playwright smoke confirmed:
  - prompt is visible
  - Co Mai Hung result appears
  - tenant signal appears
  - no `No strong tenant catalog candidates` fallback warning
  - no horizontal overflow
- Live deploy was run through the standard deploy entrypoint.
- Live Playwright smoke on `https://bookedai.au/?homepage_variant=control` confirmed:
  - prompt is visible
  - Co Mai Hung tenant-backed result appears
  - tenant signal appears
  - no public-web fallback warning
  - no console or request failures
  - no horizontal overflow
- Proxy restart and n8n workflow activation were completed manually after the deploy script returned a late syntax closeout error despite starting the new containers.
- Final stack healthcheck passed, and homepage/API probes returned `200`.

## Investor / SME Impact

The homepage proof now behaves more consistently: the visible chess proof, quick prompt, and runtime search result all point to the same tenant-backed story. That reduces investor doubt and makes the live product demo feel more intentional.
