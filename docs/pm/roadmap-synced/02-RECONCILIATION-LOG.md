# Reconciliation Log (02) — Phase + Sprint Conflicts Resolved

Date: `2026-04-27`

Status: `active conflict register for the synced roadmap`

Purpose: ghi nhận mọi mâu thuẫn phát hiện được khi đối chiếu `~50+` tài liệu phase/sprint/roadmap trong `docs/architecture/` và `docs/development/`. Mỗi entry: `Conflict ID`, `sources`, `disagreement`, `resolution applied`, `reasoning`, `impact` (siêu doc nào supersede/amend).

Resolution priority order (xem [00-README.md §2](00-README.md)):

1. [`project.md`](../../../project.md), [`prd.md`](../../../prd.md)
2. [`bookedai-master-roadmap-2026-04-26.md`](../../architecture/bookedai-master-roadmap-2026-04-26.md)
3. [`phase-execution-operating-system-2026-04-26.md`](../../development/phase-execution-operating-system-2026-04-26.md)
4. [`next-phase-implementation-plan-2026-04-25.md`](../../development/next-phase-implementation-plan-2026-04-25.md)
5. [`implementation-progress.md`](../../development/implementation-progress.md)
6. Phase-specific detail packages
7. Sprint owner checklists
8. Older docs lose to newer docs of equal authority

---

## Group A — Phase numbering schemes

### RC-001 — Three competing phase numbering schemes

- **Sources**: [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) (uses `Phase 0-9` + `Phase 17-23`), [implementation-phase-roadmap.md](../../architecture/implementation-phase-roadmap.md) (also has a separate 4-band model `Phase 1-4` Customer-facing/Revenue-ops/Billing/Release in §"Concrete phase deliverables"), [coding-implementation-phases.md](../../architecture/coding-implementation-phases.md) (uses `Coding Phase 0-N` for backend code refactor).
- **Disagreement**: Same word `Phase X` referring to three different concepts (product roadmap phase, agent-execution phase, backend code refactor phase).
- **Resolution applied**: Synced pack uses **product roadmap phase numbering only** (`Phase 0-9` + `Phase 17`, `18`, `19`, `20`, `20.5`, `21`, `22`, `23`). The "agent execution model" 4-band view in `implementation-phase-roadmap.md` is folded into Phase 19/21/23 themes. The "Coding Phase 0-N" view in `coding-implementation-phases.md` is preserved as engineering reference but flagged `STILL-VALID-DETAIL` (not roadmap authority).
- **Reasoning**: Roadmap phases must be a single mental model for leadership/PM/engineering. Source priority #2 wins.
- **Impact**: `implementation-phase-roadmap.md` and `coding-implementation-phases.md` labelled `STILL-VALID-DETAIL` (engineering reference) but no longer the source for phase authority. See [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md).

### RC-002 — Phase 10-16 do not exist in the new roadmap

- **Sources**: Nobody declares `Phase 10`, `Phase 11`, … `Phase 16`. But `Sprint 11` through `Sprint 16` are real shipped sprints, and naive readers expect a matching `Phase 10-16` band.
- **Disagreement**: Phase numbering jumps from `Phase 9` to `Phase 17` with no explanation in some older sprint docs.
- **Resolution applied**: Synced pack documents explicitly that **`Phase 10-16` do not exist as product phases**. `Sprint 11-16` map onto `Phase 7`, `Phase 8`, `Phase 9` per [bookedai-master-roadmap-2026-04-26.md §Sprint Map](../../architecture/bookedai-master-roadmap-2026-04-26.md). [01-MASTER-ROADMAP-SYNCED.md §Sprint Map](01-MASTER-ROADMAP-SYNCED.md) shows the mapping.
- **Reasoning**: This was a renaming/recompression decision after Sprint 16 hardening closeout — the post-Sprint-16 wave restarted phase numbering at `17` to signal a new product chapter. Already documented in [docs/pm/03-EXECUTION-PLAN.md §2](../03-EXECUTION-PLAN.md) and [docs/pm/08-MERGE-MAP.md §MM-002](../08-MERGE-MAP.md).
- **Impact**: Sprint owner checklists for `Sprint 11-16` are still valid for sprint-level deliverables but should not be read as introducing new phases.

### RC-003 — `Phase 20.5` numbering anomaly

- **Sources**: [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) introduces `Phase 20.5 Wallet and Stripe return continuity` between Phase 20 and Phase 21. Older docs do not use a `.5` phase numbering convention anywhere else.
- **Disagreement**: Inconsistent numbering convention; could confuse downstream consumers (Notion, Jira, Linear) that expect integer phase IDs.
- **Resolution applied**: Keep `Phase 20.5` as the canonical name (per source priority #2). Treat as overlay phase that runs concurrently with `Phase 20` and `Phase 21`. In external systems where decimal IDs are unsupported, use string ID `P20.5` or `P20-5`.
- **Reasoning**: Renumbering would force renaming all closeout artifacts already produced under `20.5`.
- **Impact**: Detail file is `phases/phase-20-5-detail.md` (using hyphen for filesystem safety).

---

## Group B — Sprint-to-Phase mapping conflicts

### RC-010 — Sprint 4 phase target ambiguity

- **Sources**: [master-execution-index.md §Sprint Map](../../architecture/master-execution-index.md) says `Sprint 4 → Phase 3, 2`. [bookedai-master-roadmap-2026-04-26.md §Sprint Map](../../architecture/bookedai-master-roadmap-2026-04-26.md) also says `Sprint 4 → Phase 3, 2`. But [phase-1-2-detailed-implementation-package.md](../../architecture/phase-1-2-detailed-implementation-package.md) implies Sprint 4 belongs to Phase 1-2 work.
- **Resolution applied**: Sprint 4 maps to `Phase 3` (primary) + `Phase 2` (carry of commercial data foundation), per master roadmap. The Phase 1-2 association in `phase-1-2-detailed-implementation-package.md` is historical context, not current mapping.
- **Reasoning**: Source priority #2 wins; older detail package is `STILL-VALID-DETAIL`.
- **Impact**: phase-02-detail.md and phase-03-detail.md both list Sprint 4 with the carry annotation.

### RC-011 — Sprint 6 dual-phase target

- **Sources**: Sprint 6 is mapped to `Phase 3, 6` in [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) and [master-execution-index.md](../../architecture/master-execution-index.md). [docs/development/sprint-6-search-quality-execution-package.md](../../development/sprint-6-search-quality-execution-package.md) frames Sprint 6 as primarily Phase 6 (search-quality runner).
- **Disagreement**: Is Sprint 6 primarily Phase 3 or Phase 6?
- **Resolution applied**: Sprint 6 has dual ownership — primary `Phase 3` (multi-channel capture upgrade for Future Swim/chess) + concurrent `Phase 6` (search-quality runner). Both phase detail files cite Sprint 6.
- **Reasoning**: Master roadmap explicitly names dual targets.
- **Impact**: No supersession; phase-03-detail.md and phase-06-detail.md both reference Sprint 6.

### RC-012 — Sprint 9 also dual-phase

- **Sources**: [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) says `Sprint 9 → Phase 4, 7`. [master-execution-index.md](../../architecture/master-execution-index.md) repeats this. [docs/architecture/phase-7-8-detailed-implementation-package.md](../../architecture/phase-7-8-detailed-implementation-package.md) treats Sprint 9 as Phase 7 work.
- **Resolution applied**: Sprint 9 dual ownership: `Phase 4` (revenue workspace reporting) + `Phase 7` (tenant revenue workspace foundation). Both phase detail files cite Sprint 9.
- **Reasoning**: Master roadmap; the Phase 7-8 package is detail-level.
- **Impact**: No supersession; mapping documented in [01-MASTER-ROADMAP-SYNCED.md §Sprint Map](01-MASTER-ROADMAP-SYNCED.md).

### RC-013 — Sprint 10 dual-phase

- **Sources**: Sprint 10 → `Phase 8, 6` per master roadmap and master-execution-index. The Phase 8 detail package treats Sprint 10 as the kickoff for admin platform. Phase 6 carries the search/optimization runner forward.
- **Resolution applied**: Sprint 10 dual ownership documented as `Phase 8` (primary) + `Phase 6` (carry).
- **Impact**: phase-08-detail.md primary; phase-06-detail.md carry.

### RC-014 — Sprint 14 spans Phase 7 and Phase 8

- **Sources**: Sprint 14 → `Phase 7, 8` per master roadmap. Sprint 14 owner checklist covers both tenant billing (Phase 7) and admin support readiness (Phase 8).
- **Resolution applied**: Documented as dual ownership in both detail files.
- **Impact**: No supersession.

---

## Group C — Status disagreements

### RC-020 — Phase 17 P1-7 status: closed vs partial

- **Sources**: [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md) Execution Log §P1-7 marks `2026-04-26` partial (admin Playwright pass green, full product regression rerun terminated `exit 143`). [implementation-progress.md](../../development/implementation-progress.md) entry `2026-04-26 (Phase 17 P1-8 pitch coverage and P1-7 regression closeout)` says P1-7 product regression "now closed locally". [docs/pm/03-EXECUTION-PLAN.md §Phase 17](../03-EXECUTION-PLAN.md) says "partial 2026-04-26".
- **Disagreement**: Is P1-7 closed or partial?
- **Resolution applied**: P1-7 is **closed locally `2026-04-26`** (both `aria-describedby` and admin responsive cards landed and tests pass). Live promotion is a separate concern handled by next deploy. Phase 17 detail file marks P1-7 as `Closed locally; awaiting next live release gate promotion`.
- **Reasoning**: Source priority #5 (`implementation-progress.md`) wins for status; the `partial` framing in the operating system was written before the regression rerun closed.
- **Impact**: [docs/pm/03-EXECUTION-PLAN.md](../03-EXECUTION-PLAN.md) "partial" status should be re-checked next closeout pass.

### RC-021 — Phase 19 P0-2 WhatsApp status framing

- **Sources**: [bookedai-master-roadmap-2026-04-26.md §Phase 19](../../architecture/bookedai-master-roadmap-2026-04-26.md) says "WhatsApp provider posture decision (Meta Cloud or Twilio default)". [phase-execution-operating-system-2026-04-26.md §P0-2](../../development/phase-execution-operating-system-2026-04-26.md) Execution Log says "decision recorded; provider delivery still blocked". [docs/development/whatsapp-provider-posture-decision-2026-04-26.md] says Twilio default but Meta `Account not registered`, Twilio `401 Authenticate`.
- **Disagreement**: Is P0-2 closed (decision) or open (delivery)?
- **Resolution applied**: P0-2 is **decision-closed** but **delivery-carried**. Synced pack tracks two sub-states. [09-OPEN-QUESTIONS.md OQ-001](../09-OPEN-QUESTIONS.md) covers leadership decision; provider delivery is engineering carry-forward into Sprint 20.
- **Impact**: Phase 19 detail file documents both states.

### RC-022 — Phase 7 status: foundation vs implemented

- **Sources**: [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) calls Phase 7 `real foundation implemented`. [phase-7-8-detailed-implementation-package.md](../../architecture/phase-7-8-detailed-implementation-package.md) treats Phase 7 as having multiple unfinished workstreams (P1-1 tenant authenticated UAT, P1-4/P1-5 service split).
- **Resolution applied**: Phase 7 = `Shipped baseline` with explicit carries (`P1-1` → Sprint 20, `P1-4`/`P1-5` → Sprint 21/22).
- **Impact**: phase-07-detail.md captures both the shipped baseline and the carry list.

---

## Group D — Date conflicts

### RC-030 — Phase 17 end date: 2026-04-26 vs 2026-05-03

- **Sources**: [docs/pm/03-EXECUTION-PLAN.md §Phase 17](../03-EXECUTION-PLAN.md) says "End: `2026-05-03` (Sprint 19 đóng)". [next-phase-implementation-plan-2026-04-25.md](../../development/next-phase-implementation-plan-2026-04-25.md) §Phase 17 doesn't lock end date but treats it as overlapping with Sprint 19. [bookedai-master-roadmap-2026-04-26.md §Phase 17](../../architecture/bookedai-master-roadmap-2026-04-26.md) implicitly closes Phase 17 in the Sprint 19 overlay window (`2026-04-27 → 2026-05-03`).
- **Resolution applied**: Phase 17 end = `2026-05-03` (when Sprint 19 closes and all P0/P1 stabilization items are signed). Synced pack uses `2026-05-03`.
- **Impact**: phase-17-detail.md uses `2026-05-03` end date.

### RC-031 — Phase 19 end date: 2026-05-10 vs 2026-05-17

- **Sources**: [docs/pm/03-EXECUTION-PLAN.md §Phase 19](../03-EXECUTION-PLAN.md) says "End: `2026-05-17` (Sprint 21 overlay close)". [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) Whole-project arc says Sprint 19, 20, 21 overlay. Phase 19 detail in next-phase plan implicitly tracks overlap through Sprint 21.
- **Resolution applied**: Phase 19 end = `2026-05-17` (Sprint 21 closeout, when WhatsApp parity P1-3 promotes live and P1-10 ships).
- **Impact**: phase-19-detail.md uses `2026-05-17`.

### RC-032 — Phase 23 start date and span

- **Sources**: Phase 23 is described as "spans Sprint 19, 20, 21, 22 overlays" in [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md). [docs/pm/03-EXECUTION-PLAN.md §Phase 23](../03-EXECUTION-PLAN.md) sets start `2026-04-27`, end `2026-05-31`.
- **Resolution applied**: Phase 23 start = `2026-04-27` (P0-7/P0-8 closeouts begin), end = `2026-05-31` (observability stack live + canonical layer map declared). Some items extend past Sprint 22 close (`2026-05-24`) into Sprint 23 candidate window.
- **Impact**: phase-23-detail.md uses `2026-05-31` end.

### RC-033 — Historical phase end dates marked `(historical)` not concrete

- **Sources**: Phase 0 → Phase 9 lack concrete YYYY-MM-DD end dates in most docs. [phase-0-exit-review.md](../../architecture/phase-0-exit-review.md) is dated `2026-04-17`, suggesting Phase 0 closeout reference. Sprint 1 owner checklist and other historical sprints don't have ISO sprint windows.
- **Resolution applied**: Use `(historical)` marker for Phase 0-9 baseline windows where no concrete date exists. Phase 0 exit reference `2026-04-17`. Phase 9 closeout reference `2026-04-19` (per [project-plan-code-audit-2026-04-19.md](../../development/project-plan-code-audit-2026-04-19.md)). All other historical phases lack concrete end dates.
- **Reasoning**: Avoid fabrication. Mark `[date pending]` where appropriate.
- **Impact**: Open question added — see [09-OPEN-QUESTIONS.md] (no new OQ filed; pack accepts historical phases as `Shipped baseline` regardless of missing dates because closeout reviews exist).

---

## Group E — Naming inconsistencies

### RC-040 — Phase 17 name variants

- **Variants found**: `Full-flow stabilization` (master roadmap, next-phase plan), `Stabilization closeout` (older sprint notes), `Phase 17 Full-Flow Stabilization` (PM execution plan).
- **Resolution applied**: Canonical name = `Full-flow stabilization`. Synced pack uses lowercase capitalization in narrative, Title Case in headings.
- **Impact**: All synced docs use canonical name.

### RC-041 — Phase 19 name variants

- **Variants found**: `Customer-care and status agent` (master roadmap), `Customer-Care And Status Agent` (next-phase plan), `Customer-care/status agent` (some sprint notes), `Messaging Automation Layer` (in agent-lane talk).
- **Resolution applied**: Canonical name = `Customer-care and status agent`. `Messaging Automation Layer` is the technical sub-component (the shared service), not the phase name.
- **Impact**: All synced docs use canonical name; references to `MessagingAutomationService` are technical, not phase-naming.

### RC-042 — Customer-facing bot name

- **Variants found**: `BookedAI WhatsApp Booking Care Agent` (older WhatsApp-only docs), `BookedAI Customer Bot` (intermediate), `BookedAI Manager Bot` (current canonical).
- **Resolution applied**: Canonical = `BookedAI Manager Bot`. This is a Phase 19 messaging policy fact, not a phase rename, but it appears in deliverable text across phases.
- **Impact**: Phase 19 detail uses `BookedAI Manager Bot`; older docs flagged `STALE-ARCHIVE` for the bot-name section.

### RC-043 — `MessagingAutomationService` vs older channel-specific services

- **Variants found**: Older docs reference `WhatsAppBookingCareService`, `TelegramCustomerService`, etc., as separate components. New canonical = single `MessagingAutomationService`.
- **Resolution applied**: Canonical = `MessagingAutomationService` (shared). Channel-specific class references in older docs are flagged as superseded technical names.
- **Impact**: phase-19-detail.md uses `MessagingAutomationService` as the shared layer; channel adapters are sub-modules.

---

## Group F — Deliverable scope creep

### RC-050 — Tenant Revenue Proof dashboard scope

- **Sources**: Originally framed as "investor-only" in [next-phase-implementation-plan-2026-04-25.md §Phase 21](../../development/next-phase-implementation-plan-2026-04-25.md). Later expanded to "limited tenant access" in [bookedai-master-roadmap-2026-04-26.md §Phase 21](../../architecture/bookedai-master-roadmap-2026-04-26.md). Metric set is unresolved ([09-OPEN-QUESTIONS.md OQ-005](../09-OPEN-QUESTIONS.md)).
- **Resolution applied**: Phase 21 deliverable = `Tenant Revenue Proof dashboard, investor-first then limited tenant exposure`. Phase 22 deliverable = `dashboard renders one tenant's real evidence` (Future Swim or chess). Metric set decision deferred to OQ-005.
- **Impact**: phase-21-detail.md and phase-22-detail.md align on this split.

### RC-051 — SMS adapter timing

- **Sources**: [bookedai-master-roadmap-2026-04-26.md §Phase 22](../../architecture/bookedai-master-roadmap-2026-04-26.md) commits SMS adapter to Sprint 22. [09-OPEN-QUESTIONS.md OQ-010](../09-OPEN-QUESTIONS.md) asks whether SMS should slip to post-Sprint-22.
- **Resolution applied**: SMS adapter committed to Sprint 22 unless OQ-010 decision moves it. Synced pack treats SMS as Sprint 22 deliverable; if leadership defers, log update in [zz-CHANGELOG.md](zz-CHANGELOG.md).
- **Impact**: phase-22-detail.md commits SMS as Sprint 22 deliverable, with OQ-010 link as conditional.

### RC-052 — Apple Wallet vs Google Wallet timing

- **Sources**: Phase 20.5 commits both. Some older notes treat Google Wallet as easier and ship earlier than Apple Wallet (which needs cert management).
- **Resolution applied**: Both committed to Phase 20.5 (Sprint 20.5 overlay `2026-05-04 → 2026-05-17`); Apple Wallet certificate management is the gating risk.
- **Impact**: phase-20-5-detail.md notes the Apple cert risk.

### RC-053 — Phase 22 RACI confusion: Backend vs Backend+Data

- **Sources**: [docs/pm/03-EXECUTION-PLAN.md §11](../03-EXECUTION-PLAN.md) Phase 22 RACI says `R = Backend, Data`. [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) Phase 22 deliverables include `BaseRepository` validator (Backend) but also Tenant Revenue Proof dashboard (Data + Frontend).
- **Resolution applied**: Phase 22 R = `Backend, Data, Frontend` (frontend for dashboard surfacing). Synced pack uses `Backend, Data, Frontend` as R for Phase 22.
- **Impact**: phase-22-detail.md updates RACI accordingly.

---

## Group G — ArchiMate review structural conflicts

### RC-060 — 6-layer model conflict

- **Sources**: [archimate/12-architecture-review-findings.md §B6](../../architecture/archimate/12-architecture-review-findings.md). [system-overview.md](../../architecture/system-overview.md) lists `Experience / App / Data / Intelligence / Automation / Platform`. [solution-architecture-master-execution-plan.md](../../architecture/solution-architecture-master-execution-plan.md) lists `Experience / App / Domain / Data / Integration / Platform`.
- **Resolution applied**: This is a Phase 23 doc-sync deliverable ([09-OPEN-QUESTIONS.md OQ-011](../09-OPEN-QUESTIONS.md)). Synced pack does not pick a winner; instead, declares "canonical layer map TBD by OQ-011" in phase-23-detail.md.
- **Impact**: phase-23-detail.md flags OQ-011; both layer-map source docs labelled `PARTIAL-MERGE` in [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md).

### RC-061 — `bookedai.au` root behavior conflict

- **Sources**: [archimate/12-architecture-review-findings.md §C-02](../../architecture/archimate/12-architecture-review-findings.md). [system-overview.md] says "nginx redirect"; [project.md](../../../project.md) `2026-04-25` says root serves homepage directly.
- **Resolution applied**: Code reality wins — `project.md 2026-04-25+` is correct; `system-overview.md` redirect description is obsolete. Out of phase scope; flagged as `STALE-ARCHIVE` for that specific section.
- **Impact**: No phase impact; flag in [03-DOC-AUTHORITY-MAP.md](03-DOC-AUTHORITY-MAP.md).

### RC-062 — `/api/booking-assistant/chat` vs `/api/chat/send`

- **Sources**: [archimate/12-architecture-review-findings.md §C-04](../../architecture/archimate/12-architecture-review-findings.md). API contract docs use one canonical form, messaging design uses another.
- **Resolution applied**: Canonical = `/api/chat/send` (per Messaging Automation policy in Phase 19). Aliases preserved for backwards compat. Out of phase scope.
- **Impact**: phase-19-detail.md notes the canonical entrypoint.

### RC-063 — Public `/api/booking-assistant/session` contract clarity

- **Sources**: [archimate/12-architecture-review-findings.md §C-06](../../architecture/archimate/12-architecture-review-findings.md). Endpoint described as production-critical, but most live bookings use `v1-*` path.
- **Resolution applied**: Real contract: `/api/booking-assistant/session` is the legacy/homepage path; `v1-*` is the canonical post-booking reference path. Both supported. Out of phase scope; tracked in API contract docs.
- **Impact**: phase-17-detail.md notes both paths in stabilization scope.

---

## Group H — Sprint timing conflicts

### RC-070 — Sprint 17 and Sprint 18 timing not formally locked

- **Sources**: Master roadmap and execution plan say Sprint 17 starts `2026-04-13` and Sprint 18 starts `2026-04-20`, but no closeout date is fixed. Both phases continue into Sprint 19 overlay window.
- **Resolution applied**: Treat Sprint 17 and Sprint 18 as **rolling windows** that effectively closed at `2026-04-26` master roadmap publication, with carry-forward into Sprint 19 overlay. Concrete end dates: Sprint 17 = `2026-04-26`, Sprint 18 = `2026-04-26`.
- **Reasoning**: Sprint 17/18 were not strictly time-boxed in the older 2-week cadence; they were thematic windows.
- **Impact**: [01-MASTER-ROADMAP-SYNCED.md §Sprint Map](01-MASTER-ROADMAP-SYNCED.md) marks Sprint 17 and Sprint 18 as ending `2026-04-26`.

### RC-071 — Sprint 23/24 candidate windows

- **Sources**: [bookedai-master-roadmap-2026-04-26.md §Post-Sprint-22 horizon](../../architecture/bookedai-master-roadmap-2026-04-26.md) gives `2026-05-25 → 2026-05-31` for Sprint 23 candidate and `2026-06-01 → 2026-06-07` for Sprint 24 candidate.
- **Resolution applied**: Treat as **indicative**, not committed. Synced pack shows both in Gantt and Sprint Map but marked `Indicative`.
- **Impact**: No phase detail file for Sprint 23/24 (post-22 horizon has no committed phase).

---

---

## Group I — Re-anchor 2026-04-27 (USER-PROVIDED)

### RC-100 — Phase 0 start anchored to 2026-04-11 (overrides historical 2025-Q4 inference)

- **Sources**:
  - Previous publication of `01-MASTER-ROADMAP-SYNCED.md` (sáng `2026-04-27`) suy luận Phase 0 = `2025-Q4 (historical)` based on language in [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) which calls Phase 0-9 "historical baselines".
  - User clarification on `2026-04-27`: Phase 0 actually started `2026-04-11` (Saturday); intensive build sprint runs `2026-04-11 → 2026-04-30`; weekly cadence post-go-live; M-01 chess+swim demo on `2026-04-29`; M-02 go-live lock on `2026-04-30`.
  - Evidence in git log: `5d00edd Initial commit` `2026-04-13`; `2895e09 docs: close out phase 0 planning baseline` `2026-04-17`; ongoing daily commits through `b3097f4 Sync sprint 19 hardening and ops docs` `2026-04-27`.
- **Disagreement**: Whole-project timeline either started 2025-Q4 (prior agent) OR `2026-04-11` (user truth + git evidence).
- **Resolution applied**: User anchor wins — entire pack re-anchored. Phase 0-9 redistributed to `2026-04-11 → 2026-04-26` (Week 1 + Week 2 of intensive build). Phase 17-19 redistributed into Week 3 GO-LIVE window (`2026-04-27 → 2026-04-30`). Phase 20, 20.5, 21, 22, 23 redistributed onto Mon-Sun weekly cadence `2026-05-04 → 2026-06-07`. Phase 23 = final phase = total project completion `2026-06-07`.
- **Reasoning**: User is authoritative; git log evidence corroborates. Historical 2025-Q4 framing in older docs was rhetorical (calling Phase 0-9 "historical baselines" relative to current active Phase 17-23) not literal.
- **Impact**:
  - All 17 phase detail files updated with concrete `2026-04-11 → 2026-06-07` dates.
  - `01-MASTER-ROADMAP-SYNCED.md` §0 added "Date Anchor Update — 2026-04-27".
  - `01-MASTER-ROADMAP-SYNCED.md` §1, §3, §6, §7 fully rewritten with new dates.
  - New strategic anchors added: [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md) (vision + 90/180/365 targets + milestones M-01..M-NN).
  - New register added: [05-CHANGE-REQUESTS.md](05-CHANGE-REQUESTS.md) (CR-001 = this re-anchor).
  - New visual added: [06-BIG-PICTURE.md](06-BIG-PICTURE.md).
  - [zz-CHANGELOG.md](zz-CHANGELOG.md) appended.
- **Open follow-ups**:
  - Sprint 19 compressed window (4 working days) is high risk; tracked at [05-CHANGE-REQUESTS.md §CR-002](05-CHANGE-REQUESTS.md).
  - Phase 17/18/19 carry items into post-go-live Week 1 are explicit and acceptable.

### RC-101 — Sprint 23/24 candidate windows absorbed into weekly cadence

- **Sources**: Previous publication kept `Sprint 23 (cand) 2026-05-25 → 2026-05-31` and `Sprint 24 (cand) 2026-06-01 → 2026-06-07` as "indicative post-22 horizon".
- **Disagreement**: With re-anchor, those weeks now hold concrete phase work (Phase 22 = Week of `2026-05-25`, Phase 23 = Week of `2026-06-01`).
- **Resolution applied**: Sprint 23 and Sprint 24 candidate labels removed; replaced by Sprint 22 (Week of `2026-05-25`) and Sprint 23 (Week of `2026-06-01`) as committed (not indicative) sprints.
- **Impact**: §3 Sprint Map and §6 Gantt updated; Phase 22 and Phase 23 detail files updated.

### RC-102 — Phase 17, 18, 19 end dates compressed for go-live

- **Sources**: Prior publication had Phase 17 end `2026-05-03`, Phase 18 end `2026-05-10`, Phase 19 end `2026-05-17`.
- **Resolution applied**: Phase 17 end = `2026-04-29` (M-01); Phase 18 end = `2026-04-30` (M-02 with carry); Phase 19 end = `2026-04-30` (M-02 with carry P1-2/P1-10 to Week 1 post-go-live). Go-live cadence wins; carry items explicitly logged.
- **Reasoning**: User anchored go-live `2026-04-30` as a hard milestone. Phase 17/18/19 contain critical-path work.
- **Impact**: phase-17, phase-18, phase-19 detail files updated; Sprint 19 compressed to Mon-Thu (4 working days).

---

## Summary

- **Total conflicts catalogued**: 25 (`RC-001` through `RC-102`, with gaps for grouping clarity).
- **Phase numbering reconciled**: 3 conflicts (`RC-001`, `RC-002`, `RC-003`).
- **Sprint mapping reconciled**: 5 conflicts (`RC-010` through `RC-014`).
- **Status reconciled**: 3 conflicts (`RC-020`, `RC-021`, `RC-022`).
- **Date reconciled**: 4 conflicts (`RC-030`, `RC-031`, `RC-032`, `RC-033`).
- **Naming reconciled**: 4 conflicts (`RC-040` through `RC-043`).
- **Deliverable scope reconciled**: 4 conflicts (`RC-050` through `RC-053`).
- **ArchiMate structural noted**: 4 conflicts (`RC-060` through `RC-063`) — out of scope for phase pack but logged.
- **Sprint timing reconciled**: 2 conflicts (`RC-070`, `RC-071`).
- **Re-anchor reconciled**: 3 conflicts (`RC-100`, `RC-101`, `RC-102`).

## Changelog

- `2026-04-27` (re-anchor) — Added RC-100, RC-101, RC-102 capturing user re-anchor of Phase 0 to `2026-04-11`, go-live `2026-04-30`, weekly cadence post-go-live, total project end `2026-06-07`.
- `2026-04-27` initial publication of reconciliation log.
