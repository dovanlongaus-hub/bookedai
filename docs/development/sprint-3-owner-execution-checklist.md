# BookedAI Sprint 3 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## 1. Purpose

This document is the real execution checklist for Sprint 3, organized by owner.

Sprint 3 is the first implementation-heavy sprint for the public revenue-engine rebuild.

## 2. Sprint 3 mission

Implement the premium landing page foundation, hero experience, core sections, pricing rollout, and public conversion surface using the approved Phase 1-2 blueprint.

## 3. Sprint 3 success criteria

- premium landing page is implemented end to end
- hero and premium UI blocks are live in the frontend
- key sections are implemented with the approved copy
- pricing section clearly presents setup plus commission
- CTA structure works on desktop and mobile
- the page is visually coherent and responsive

## 4. Owner checklist

## Owner: Product lead

### Required outcomes

- implementation preserves approved messaging

### Checklist

- review implemented hero and section copy
- review pricing section implementation
- review FAQ and final CTA implementation
- confirm no section drifts back into chat-first language
- confirm trust and commercial tone are preserved in the UI

### Completion evidence

- approved comments or signoff on implemented copy and conversion flow

## Owner: Solution architect

### Required outcomes

- public implementation still aligns with the strategic product model

### Checklist

- review implemented widget vocabulary
- review pricing and commission explanation in the UI
- confirm public preview widgets still align with later product domains
- confirm no unsupported commercial claims were introduced during implementation
- review Sprint 3 output against Phase 1-2 package

### Completion evidence

- approved comments or signoff on strategic consistency of the implementation

## Owner: Product operations or PM

### Required outcomes

- implementation scope is controlled and handoff into instrumentation polish is clear

### Checklist

- verify Sprint 3 stories are delivered
- record any Sprint 4 carryover items
- confirm pricing and CTA rollout are included
- confirm required sections are complete
- prepare Sprint 4 instrumentation and polish scope

### Completion evidence

- approved sprint closure with clear carryover list if needed

## Owner: Frontend lead

### Required outcomes

- public rebuild is functionally and visually implemented

### Checklist

- implement shared primitives
- implement sticky header and mobile CTA
- implement hero and premium widgets
- implement middle sections
- implement bottom conversion sections
- confirm responsive behavior across core breakpoints
- confirm anchors, hover states, and spacing rhythm

### Completion evidence

- implemented landing page passes internal visual and functional review

## Owner: Backend lead

### Required outcomes

- public conversion flows remain compatible with the existing backend while preparing for attribution support

### Checklist

- review CTA source handling in public flows
- confirm existing demo and consultation submissions are not regressed
- identify any missing payload fields needed for attribution propagation
- confirm no fragile backend assumptions were introduced by frontend implementation

### Completion evidence

- approved comments or signoff on backend compatibility of the public rollout

## Owner: QA or release owner

### Required outcomes

- Sprint 3 output is safe to move into instrumentation polish and release prep

### Checklist

- review desktop and mobile responsiveness
- review sticky header behavior
- review CTA behavior
- review pricing section behavior
- review anchor navigation
- review copy consistency and visual coherence
- confirm no obvious regressions in public conversion paths

### Completion evidence

- approved QA pass or documented issues list for Sprint 4 cleanup

## 5. Cross-functional review checklist

- hero, sections, and footer are implemented
- pricing is visually clear and commercially aligned
- mobile sticky CTA works correctly
- premium UI blocks feel intentional rather than decorative
- implementation remains within the approved narrative guardrails

## 6. Sprint 3 closeout checklist

- confirm all required public sections exist
- confirm premium hero and widgets are complete
- confirm pricing and CTA surfaces are live in the build
- record instrumentation and polish tasks for the next sprint
- confirm no blocking copy or design ambiguity remains

## 7. Sprint 4 start criteria

Sprint 4 can start only when:

- Product approves implemented public copy
- Frontend confirms the landing foundation is stable
- Backend confirms public integration points are intact
- QA or release owner confirms the build is ready for instrumentation and polish

