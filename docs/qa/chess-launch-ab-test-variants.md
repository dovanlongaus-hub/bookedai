# Chess Academy Launch — Phase 1 A/B Test Variants

**Goal:** measure copy / pricing / urgency choices on `chess.bookedai.au` against a single funnel metric — **enroll-form lead conversion** (a successful `POST /api/v1/leads` with `lead_type=chess_program_enquiry`, with or without a booking_intent).

**Traffic assumption:** ~200 unique visitors per week to `chess.bookedai.au` during the first month of launch (paid social + organic).

**Instrumentation pattern (all variants):**
- Visitors are bucketed by `?variant=A1|A2|...` URL parameter or `localStorage` sticky bucket if no param. Default to `A1+B1+C1+D1` (control bundle) if no param.
- The `ChessGrandmasterApp` reads the bucket on mount and renders the matching strings. The bucket id is appended to the lead `attribution` payload as `attribution.variant`.
- Server-side capture: `leads` table picks up the variant via existing `attribution.metadata` JSON column. Daily report runs a `select attribution->>'variant' as v, count(*) from leads where created_at > now() - interval '14 days' group by v`.
- Visit count comes from edge logs (Cloudflare or the load balancer) filtered by `path=/` and `host=chess.bookedai.au`, deduped by `cf_unique_visitor_id` per day.

**Sample-size note:** with ~200 visits/week and a baseline conversion of ~5% (10 leads/week), detecting a +50% relative lift (5% → 7.5%) at 80% power, alpha=0.05 needs ~600 visitors per arm. **Plan for a 2-week minimum, 4-week target** to reach statistical significance for a single pair. Run only **one** pair at a time across all visitors (no multi-variant intersection) until traffic grows.

---

## Variant A — Hero copy

**Hypothesis:** a benefit-led, trial-anchored headline (A1) converts better than an authority-led, audience-segmented headline (A2) for cold paid traffic where the visitor doesn't know what a Vietnamese GM is.

| Bucket | Headline | Sub-line |
|---|---|---|
| **A1 (control)** | "Real grandmaster. Real progress. First 30 min free." | Beginner foundations to tournament-ready coaching. Online or in person. |
| **A2 (challenger)** | "Train chess with a Vietnamese GM. Beginner to tournament." | Online + in person. EN + VI. Pay per session. |

- **Primary metric:** lead conversion rate (lead form submitted / unique visitors).
- **Secondary:** scroll-to-`#programs` rate (proxy for engagement).
- **Hold-out cell to keep:** none — this is the highest-leverage test, run it first.
- **Expected effect size to plan for:** ±15% relative.
- **Duration estimate:** 2 weeks at 200 visits/week × 2 arms = 200 each = under-powered for small effects; extend to 3–4 weeks if the gap is not obvious by day 10.

---

## Variant B — Pricing display

**Hypothesis:** the strikethrough pattern (B1) anchors the parent on the higher original price and amplifies the perceived discount, lifting clicks-to-form. The flat-price + small pill (B2) reads as cleaner / less salesy and may convert higher among Australian / expat parents who dislike "marketing prices".

| Bucket | Pricing card render |
|---|---|
| **B1 (control)** | ~~325,000 VND~~  **260,000 VND** / session — small "20% off launch" pill below |
| **B2 (challenger)** | **260,000 VND** / session — small grey "20% promo" pill, no strikethrough |

- **Primary metric:** click-through from `#programs` card → `#enroll` form (button click, captured in `data-event="program-jump"` log line).
- **Secondary:** lead conversion.
- **Segment to watch:** locale (`vi` vs `en`). Vietnamese visitors tend to respond strongly to strike-through; Australian/EN visitors may be flat. Slice the report by `attribution.locale`.
- **Duration estimate:** 2 weeks; pricing changes are visible immediately so noise is low.

---

## Variant C — Primary CTA

**Hypothesis:** a low-commitment trial CTA (C1) generates more lead volume but lower-quality leads, while the full enrollment CTA with discount (C2) generates fewer but higher-intent leads (more provide a date+time → booking_intent path).

| Bucket | Hero CTA + sticky mobile CTA |
|---|---|
| **C1 (control)** | "Book FREE trial" |
| **C2 (challenger)** | "Enroll now — 20% off" |

- **Primary metric:** lead conversion rate.
- **Critical secondary:** **booking_intent rate** — leads that came with date+time, indicating real intent. Captured by `select count(*) from booking_intents where created_at > … and tenant_id = '<chess>' / count(*) from leads`.
- **Tertiary:** Stripe checkout completion rate (paid funnel conversion).
- **Decision rule:** ship C2 if booking_intent rate is ≥1.5× higher even if raw lead volume is 20% lower; ship C1 only if raw leads are ≥30% higher AND booking_intent rate is no worse than -10%.
- **Duration estimate:** 2–3 weeks. If we see clear traffic split early, end at 2 weeks.

---

## Variant D — Promo urgency

**Hypothesis:** a live ticking countdown (D1) outperforms a soft "Limited time" badge (D2) on first-time visitors who are price-sensitive, but fatigues returning visitors. Mainly a test for paid social cohorts.

| Bucket | Promo banner |
|---|---|
| **D1 (control)** | "Launch 20% off — ends in 13d 04h 22m 18s" (ticks every second) |
| **D2 (challenger)** | "Launch 20% off — limited time" (no countdown, static badge) |

- **Primary metric:** lead conversion rate.
- **Secondary:** banner-click rate (did the visitor click into pricing from the banner?). Captured via `data-event="promo-banner-click"` log line.
- **Risk to watch:** countdown that visibly resets on every page load looks fake. Make sure the seed timestamp is **fixed at launch date** server-side or in build-time env, not generated client-side per session.
- **Duration estimate:** 2 weeks. Stop early if returning-visitor segment shows worse performance with countdown — that's the failure mode we are most worried about.

---

## Run order + governance

1. **Week 1–2:** Variant A (highest impact, top of funnel).
2. **Week 3–4:** Variant C (CTA wording — only after we know the winning headline).
3. **Week 5–6:** Variant B (pricing display).
4. **Week 7–8:** Variant D (promo urgency).

Only one pair runs at a time. Document the winning bucket in `docs/qa/chess-launch-experiment-log.md` (create on first result). Roll the winner into the default render path; archive the loser branch.

**Stop conditions** (any of):
- One arm has ≥3× the conversion of the other after ≥150 visits per arm — call early.
- A variant breaks any QA item in `chess-launch-qa-plan.md` — disable immediately and revert.
- Booking_intent quality (Variant C) is destroyed by the trial CTA — revert and pick C2.

**Tester instrumentation note:** the variant param must round-trip through the lead attribution. Verify on day 1 of each test:
```sql
select attribution->>'variant' as v, count(*) from leads
where created_at > current_date and lead_type = 'chess_program_enquiry'
group by v;
```
Both arms should appear with non-zero counts within 24 hours. If not, the bucketing is broken — fix before continuing.
