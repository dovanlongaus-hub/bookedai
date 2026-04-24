# Portal query-param hardening for booking lookup

- Timestamp: 2026-04-24T01:34:27.958420+00:00
- Source: frontend/src/apps/portal/PortalApp.tsx
- Category: frontend
- Status: done

## Summary

Portal no longer treats generic ?ref= tracker tokens as booking references, preventing false BOOKING NOT AVAILABLE errors like v1-* release ids.

## Details

Updated frontend/src/apps/portal/PortalApp.tsx so the portal lookup bootstrap reads only dedicated booking reference params: booking_reference and camel-case compatibility bookingReference. The previous generic ref fallback could collide with external tracking or release-token query params and surface a false load failure for non-booking values such as v1-e223dff9ce. Also synced docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, and memory/2026-04-24.md to record the regression and the acceptance expectation that portal ignores generic tracking-style ref params.
