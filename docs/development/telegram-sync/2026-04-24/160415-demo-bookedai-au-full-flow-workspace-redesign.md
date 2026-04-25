# demo.bookedai.au full-flow workspace redesign

- Timestamp: 2026-04-24T16:04:15.610837+00:00
- Source: codex
- Category: frontend-demo
- Status: done

## Summary

Redesigned demo.bookedai.au into a professional academy revenue workflow surface with intake, assessment, placement, booking, payment-truth, and parent-report continuity visible across desktop and mobile.

## Details

Changed the demo runtime presentation rather than the API contract. Added a visible flow rail for intent -> assessment -> placement -> booking -> retain, upgraded the header status treatment, made desktop show intake plus academy matches plus revenue workflow together, and kept mobile as a stacked flow with compact horizontal progress. Result cards now clearly show Assess first until placement is complete, so the UI no longer implies booking can happen before assessment. The revenue workflow panel now exposes lead, booking intent, CRM, payment-truth, portal, and parent-report continuity more clearly. Verified with npm --prefix frontend run build and Playwright screenshots: output/playwright/demo-redesign-desktop-v3.png and output/playwright/demo-redesign-mobile.png. Local Vite browser smoke still shows expected 401 Unauthorized API calls because the page is not connected to an authenticated local backend runtime.
