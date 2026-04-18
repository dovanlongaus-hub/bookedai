import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

const closeoutPoints = [
  "Never miss another opportunity",
  "See where bookings come from",
  "Recover revenue that would normally go cold",
];

export function FinalCTASection() {
  return (
    <section id="final-cta" className="section-shell relative px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <GlassCard glow className="overflow-hidden p-8 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex items-center rounded-pill border border-accentGreen/20 bg-accentGreen/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accentGreen">
                Final conversion prompt
              </div>
              <h2 className="mt-5 max-w-4xl text-h2 font-semibold tracking-[-0.045em] text-textPrimary">
                Stop losing revenue to missed calls, slow follow-up, and disconnected customer journeys.
              </h2>
              <p className="mt-4 max-w-3xl text-bodyLg leading-8 text-textSecondary">
                BookedAI.au connects search, website, calls, email, and follow-up into one revenue system built for
                service businesses that need clearer conversion and less admin drag.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {closeoutPoints.map((item) => (
                  <span
                    key={item}
                    className="rounded-pill border border-border bg-white/[0.03] px-4 py-2 text-sm font-medium text-textSecondary"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full">
                Schedule My Demo
              </Button>
              <Button variant="secondary" size="lg" className="w-full">
                Talk Through Revenue Fit
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
