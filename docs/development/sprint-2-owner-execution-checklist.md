# BookedAI Sprint 2 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## 1. Purpose

This document is the real execution checklist for Sprint 2, organized by owner.

Sprint 2 is the first execution sprint of Phase 1-2 and should lock the public rebuild blueprint before the implementation-heavy sprint begins.

## 2. Sprint 2 mission

Finish the brand system, landing-page information architecture, design tokens, and component architecture for the premium public rebuild.

## 3. Sprint 2 success criteria

- public narrative system is locked
- design-token system is approved
- component architecture is approved
- required premium UI blocks are specified
- implementation blueprint fits the current frontend repo structure
- Sprint 3 can begin coding with minimal ambiguity

## 4. Owner checklist

## Owner: Product lead

### Required outcomes

- narrative and conversion logic are approved

### Checklist

- review and approve hero copy
- review and approve section-by-section landing copy
- review and approve CTA hierarchy
- review and approve pricing explanation wording
- review and approve FAQ and footer copy
- confirm all copy follows the new tone rules

### Completion evidence

- approved comments or signoff on landing content system

## Owner: Solution architect

### Required outcomes

- public rebuild remains aligned with the broader product model

### Checklist

- review Phase 1-2 implementation package
- confirm public widget vocabulary aligns with later product domains
- confirm no public sections imply unsupported backend truth
- confirm instrumentation requirements are sufficient for later phases
- confirm handoff from Phase 1 narrative into Phase 2 implementation is clean

### Completion evidence

- approved comments or signoff on Phase 1-2 package from an architecture standpoint

## Owner: Product operations or PM

### Required outcomes

- Sprint 2 outputs are organized and implementation-ready

### Checklist

- review Phase 1-2 Epic -> Story -> Task backlog
- map stories to Sprint 2 scope
- confirm dependencies for Sprint 3 coding work
- update sprint register references if needed
- confirm Sprint 2 closeout and Sprint 3 start criteria

### Completion evidence

- approved sprint scope and clear Sprint 3 handoff plan

## Owner: Frontend lead

### Required outcomes

- landing rebuild architecture is feasible and ready to code

### Checklist

- review component tree
- review `docs/architecture/sprint-2-implementation-package.md`
- review `docs/architecture/frontend-theme-design-token-map.md`
- review `docs/architecture/landing-component-tree-and-file-ownership.md`
- review `docs/architecture/landing-page-execution-task-map.md`
- review UI primitive list
- review file mapping against current frontend structure
- review design token application plan
- review hero widget scope and implementation complexity
- flag risky assumptions in responsive behavior or style ownership

### Completion evidence

- approved comments or signoff on frontend architecture and feasibility

## Owner: Backend lead

### Required outcomes

- frontend instrumentation and preview widgets remain compatible with later data work

### Checklist

- review CTA and source instrumentation needs
- review public preview widget naming
- confirm no public copy assumes already-live reporting APIs
- identify any required backend payload additions for later attribution support

### Completion evidence

- approved comments or signoff on public instrumentation assumptions

## Owner: QA or release owner

### Required outcomes

- Sprint 3 implementation can proceed with clear truth and QA constraints

### Checklist

- review Sprint 2 output set
- confirm design and content approvals are explicit
- confirm no unsupported public claims remain
- define minimum QA expectations for Sprint 3 visual build
- confirm closeout criteria are measurable

### Completion evidence

- approved Sprint 2 closeout and Sprint 3 QA start conditions

## 5. Cross-functional review checklist

- content, tokens, and components do not conflict
- pricing wording is consistent with the pricing strategy
- widget labels are consistent with later data-model vocabulary
- implementation blueprint fits the current repo structure
- Sprint 3 coding can start without strategy rework

## 6. Sprint 2 closeout checklist

- freeze content source of truth
- freeze design tokens
- freeze component tree
- freeze widget vocabulary
- complete `docs/architecture/sprint-2-implementation-package.md`
- complete `docs/architecture/frontend-theme-design-token-map.md`
- complete `docs/architecture/landing-component-tree-and-file-ownership.md`
- complete `docs/architecture/landing-page-execution-task-map.md`
- record any open implementation risks
- approve Sprint 3 coding start

## 7. Sprint 3 start criteria

Sprint 3 can start only when:

- Product approves the public narrative system
- Frontend approves the component and styling architecture
- Architecture approves the public commercial vocabulary
- Backend confirms instrumentation assumptions are acceptable
- QA or release owner confirms implementation guardrails are clear
