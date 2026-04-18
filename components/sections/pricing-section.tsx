import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

const pricingPoints = [
  "One-time setup fee to launch your revenue engine cleanly.",
  "Success-based commission tied to successful bookings or revenue generated.",
  "Commercial reporting keeps bookings, source attribution, and commission visibility in one place.",
];

const modelRows = [
  { label: "Commercial model", value: "Setup once. Pay based on performance." },
  { label: "Why it wins", value: "We win when you win." },
  { label: "Best for", value: "Clinics, salons, trades, tutoring, studios, and appointment-led SMEs." },
];

export function PricingSection() {
  return (
    <section id="pricing" className="section-shell px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-pill border border-accentPurple/20 bg-accentPurple/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accentPurple">
            Pricing built for revenue outcomes
          </div>
          <h2 className="mt-5 text-h2 font-semibold tracking-[-0.045em] text-textPrimary">
            Setup once. Pay based on performance.
          </h2>
          <p className="mt-4 text-bodyLg leading-8 text-textSecondary">
            Most tools charge whether they create outcomes or not. BookedAI.au is positioned as a performance-aligned
            growth system for service businesses.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.94fr]">
          <GlassCard glow className="p-7 lg:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primaryBlue">Commercial message</div>
            <h3 className="mt-3 text-h3 font-semibold tracking-[-0.03em] text-textPrimary">Most tools manage conversations. BookedAI.au manages revenue.</h3>
            <div className="mt-6 grid gap-4">
              {pricingPoints.map((point) => (
                <div key={point} className="rounded-md border border-border bg-white/[0.03] px-4 py-4 text-sm leading-6 text-textSecondary">
                  {point}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button>Schedule My Demo</Button>
              <Button variant="secondary">Talk Through Pricing</Button>
            </div>
          </GlassCard>

          <GlassCard className="p-7 lg:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-accentGreen">Commercial reporting</div>
            <div className="mt-5 grid gap-4">
              {modelRows.map((row) => (
                <div key={row.label} className="rounded-md border border-border bg-bgSoft/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{row.label}</div>
                  <div className="mt-2 text-base font-semibold leading-7 text-textPrimary">{row.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-warningAmber/20 bg-warningAmber/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-warningAmber">Visibility built in</div>
              <div className="mt-2 text-sm leading-6 text-textSecondary">
                Revenue by source, bookings by source, conversion by channel, commission due, and ROI summary all belong
                in the same operating view.
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
