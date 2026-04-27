# 08 - DECISIONS PENDING

```
═══════════════════════════════════════════════════════════
EXECUTIVE BRIEFING: Open Decisions Requiring Leadership Sign-off
Date: 2026-04-26 | Prepared for: Executive Leadership Team
═══════════════════════════════════════════════════════════
```

## BOTTOM LINE
9 decisions đang open, từ provider posture (WhatsApp) đến pricing tier reframe đến hire plan. Mỗi decision có deadline (đa số trong Sprint 19-22 window `2026-04-27 → 2026-05-24`). 4 decisions trong số đó có blocking effect lên feature shipping. Recommend leadership team review batch trong tuần này, ký từng item, và assign owner.

---

## DECISION #1 — WhatsApp Provider Posture (URGENT)

**Decision**: Confirm Twilio = default; Meta WhatsApp Cloud blocked; Evolution off-path.
**Status**: Decision recorded `2026-04-26`, but outbound delivery vẫn block (Twilio `401 Authenticate`, Meta `Account not registered`).
**Options**: a) Repair Twilio creds (immediate); b) Complete Meta Business verification (~2 weeks); c) Re-enable Evolution as bridge fallback.
**Owner**: CTO + COO
**Deadline**: `2026-04-30`
**Blocking**: Phase 19 channel parity, Sprint 20 customer-care production claim
**Source**: [whatsapp-provider-posture-decision-2026-04-26.md](../development/whatsapp-provider-posture-decision-2026-04-26.md)

---

## DECISION #2 — Sprint 19 P0 Freeze

**Decision**: No new features ship until 8 P0 closed.
**Status**: 2 of 8 closed (P0-3 Telegram secret + Evolution HMAC `closed live 2026-04-26`; P0-7 env checksum guard `closed 2026-04-26`).
**Options**: a) Hard freeze on new features; b) Allow non-blocking features in parallel.
**Owner**: CEO + VP Engineering
**Deadline**: `2026-04-27` (Sprint 19 start)
**Blocking**: Sprint 20 first revenue loop; release governance credibility
**Source**: [full-stack-review-2026-04-26.md](../development/full-stack-review-2026-04-26.md)

---

## DECISION #3 — Pricing Tier Reframe Schedule

**Decision**: Adopt persona tier names `Solo` / `Growing studio` / `Clinic` / `Enterprise` (RF-9) replace `Freemium` / `Pro` / `Pro Max`.
**Status**: Backlogged in Sprint 21; conflicting với `2026-04-25` package vocabulary lock.
**Options**: a) Ship persona tier in Sprint 21 (blocking billing work); b) Keep Freemium/Pro/Pro Max for now, reframe post-Sprint 22; c) Run A/B between two naming conventions (`CW-6` continuing experiment).
**Owner**: CFO + CRO
**Deadline**: `2026-05-17`
**Blocking**: Sprint 21 billing/receivables truth, public pricing page coherence
**Source**: [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md), [pricing-packaging-monetization-strategy.md](../architecture/pricing-packaging-monetization-strategy.md)

---

## DECISION #4 — Commission Base Structure by Vertical

**Decision**: Lock commission base (per-booking vs % attributable revenue vs hybrid) cho mỗi vertical (clinic, swim, chess, beauty, tutor, trades).
**Status**: TBD — pricing doc mention "commission customization factors" nhưng không lock.
**Owner**: CFO + CRO
**Deadline**: `2026-05-10`
**Blocking**: First paying customer contract terms; Phase 21 commission summary widget
**Source**: [pricing-packaging-monetization-strategy.md](../architecture/pricing-packaging-monetization-strategy.md) §"Commission customization factors"

---

## DECISION #5 — First Reference Customer Selection

**Decision**: Confirm Future Swim là first revenue loop reference (Sprint 20) hay swap chess academy.
**Status**: Roadmap names Future Swim cho Sprint 20 ("First Real Revenue Loop"), nhưng chess academy là first vertical template per [prd.md](../../prd.md).
**Options**: a) Future Swim first (per current roadmap); b) Chess academy first (per PRD priority); c) Run parallel.
**Owner**: CEO + CPO
**Deadline**: `2026-05-04` (Sprint 20 start)
**Blocking**: Case-study production, deck refresh, sales motion proof
**Source**: [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md) Sprint 20, [prd.md](../../prd.md) §16

---

## DECISION #6 — Hire Plan Pre-Sprint 23

**Decision**: Approve hiring 1 backend + 1 DevOps + (optional) 1 designer trước Sprint 23 (`2026-05-25`).
**Status**: TBD — engineering velocity hiện founder-led; bus factor 1 risk.
**Owner**: CEO + VP Engineering
**Deadline**: `2026-05-15` (job posts go live)
**Blocking**: Multi-tenant scale execution; prevent founder burnout
**Source**: Implied from velocity in [implementation-progress.md](../development/implementation-progress.md)

---

## DECISION #7 — Pitch Deck Refresh Trigger

**Decision**: Khi nào refresh investor deck — sau Sprint 20 (Future Swim loop documented) hay đợi Sprint 22 (Tenant Revenue Proof dashboard live)?
**Status**: TBD
**Options**: a) Refresh post-Sprint 20 với revenue loop screenshots; b) Wait for Sprint 22 tenant revenue dashboard live.
**Owner**: CEO + CFO
**Deadline**: `2026-05-31`
**Blocking**: Investor outreach timing; fundraising story credibility
**Source**: [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md), [bookedai-fundraising-profit-first-strategy.md](../development/bookedai-fundraising-profit-first-strategy.md)

---

## DECISION #8 — Compliance / Security Audit Path

**Decision**: Plan path đến SOC 2 / ISO 27001 / pen test — khi nào start, internal hay external auditor?
**Status**: Not started; documented gap.
**Owner**: COO + Legal + CTO
**Deadline**: `2026-06-30` (decision); audit start có thể sau
**Blocking**: Enterprise-tier deals, AU Privacy Act compliance evidence
**Source**: Implied gap in [auth-rbac-multi-tenant-security-strategy.md](../architecture/auth-rbac-multi-tenant-security-strategy.md)

---

## DECISION #9 — Channel Expansion Order Post-Phase 19

**Decision**: Sau khi Phase 19 customer-care chạy stable, thứ tự mở channel mới: SMS (Sprint 22 P1) → Apple Messages → email response agent → voice?
**Status**: SMS adapter scheduled Sprint 22 (`P1-4`); Apple Messages mention trong PRD nhưng không scheduled.
**Owner**: CPO + CTO
**Deadline**: `2026-05-24` (Sprint 22 start)
**Blocking**: Phase 23+ horizon planning
**Source**: [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md) Sprint 22, [DESIGN.md](../../DESIGN.md)

---

```
═══════════════════════════════════════════════════════════
Sources: full-stack-review-2026-04-26.md,
bookedai-master-roadmap-2026-04-26.md,
whatsapp-provider-posture-decision-2026-04-26.md,
pricing-packaging-monetization-strategy.md, prd.md,
bookedai-fundraising-profit-first-strategy.md,
implementation-progress.md
Confidence: MEDIUM (decisions identified from doc TBDs and contradictions; some require leadership input data not in repo)
═══════════════════════════════════════════════════════════
```
