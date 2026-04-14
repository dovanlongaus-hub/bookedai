# BookedAI Documentation

## Purpose

This `docs/` tree is the professional reference set for the `bookedai.au` platform.

Current synchronized documentation baseline: `1.0.1-stable`.

It separates documentation by:

- system architecture
- module boundaries
- operational governance
- audience-specific usage guidance

## Documentation Structure

### Core references

- [System Overview](./architecture/system-overview.md)
- [Module Hierarchy](./architecture/module-hierarchy.md)
- [Change Governance](./governance/change-governance.md)

### Audience guides

- [End User Guide](./users/end-user-guide.md)
- [SME Customer Guide](./users/sme-customer-guide.md)
- [Administrator Guide](./users/administrator-guide.md)

## Document Ownership

- `project.md` remains the root-level master index and change discipline reference.
- The `docs/architecture/` folder describes the system professionally by layers and module responsibilities.
- The `docs/users/` folder explains the platform from the viewpoint of each audience.
- The `docs/governance/` folder defines how future changes must be summarized, aligned, and documented.

## Maintenance Rule

When any material feature is changed, the related audience guide and architecture section must be reviewed together before implementation is considered complete.
