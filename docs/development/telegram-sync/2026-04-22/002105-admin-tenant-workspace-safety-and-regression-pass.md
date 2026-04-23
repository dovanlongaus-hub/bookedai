# Admin tenant workspace safety and regression pass

- Timestamp: 2026-04-22T00:21:05.253652+00:00
- Source: codex
- Category: implementation
- Status: completed

## Summary

Admin tenant workspace now has stronger safety rails: published services must be archived before deletion, publish/archive controls are explicit in the UI, delete is two-step, and tenant workspace regression coverage now includes profile/member/catalog governance flows.

## Details

Implemented the next hardening pass for the admin tenant workspace. Frontend tenant management now exposes explicit publish and archive actions, blocks publish from the form until booking-critical fields are present, and requires two-step confirmation before deleting a tenant service. Backend admin tenant delete now returns 422 when a service is still published, forcing archive-before-delete behavior even if the UI is bypassed. Added targeted Playwright coverage for tenant workspace navigation and a full tenant governance flow covering profile save, member access update, publish guardrail, archive, and delete. Verification completed with python3 -m py_compile backend/api/route_handlers.py backend/tests/test_admin_service_quality_routes.py and targeted Playwright passes for admin navigation plus tenant workspace flows. Full frontend tsc still times out in this environment, and backend unit execution is blocked locally because the Python env does not currently include fastapi or pytest.
