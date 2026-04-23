# Tenant Enterprise Workspace Requirement Update

Date: `2026-04-21`

## Summary

BookedAI tenant product planning now explicitly treats the next tenant UX wave as an enterprise workspace redesign rather than a cosmetic polish pass.

## Newly locked tenant requirements

- tenant workspace should use a clearer enterprise-style menu or sidebar so each major function is easy to locate after login
- each major workspace area should expose its own guideline content directly inside the tenant portal:
  - overview
  - experience or profile studio
  - catalog
  - plugin
  - bookings
  - integrations
  - billing
  - team
- tenant screens should group controls by business function instead of presenting one long mixed dashboard
- tenant-managed fields should favor direct input or edit or save behavior inside the workspace itself
- tenants should be able to update brand imagery directly from the tenant portal, including logo and hero-style image assets
- tenant introduction and positioning content should support HTML editing with safe preview so operator-facing content can be maintained without repo edits

## Documentation synchronization

This requirement update was written back into:

- `project.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/development/implementation-progress.md`

## Delivery implication

The tenant portal should no longer be treated as complete once auth, billing, team, and catalog seams merely exist.

The next tenant completion bar now also includes:

- clearer enterprise information architecture
- stronger operator guidance inside each section
- direct tenant-managed content controls
- tenant-owned branding and HTML introduction editing
