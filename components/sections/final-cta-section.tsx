import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { FadeIn } from "@/components/ui/motion";

const closeoutPoints = [
  "Never miss another opportunity",
  "See where bookings come from",
  "Recover revenue that would normally go cold",
];

export function FinalCTASection() {
  return (
    <section id="final-cta" className="pb-24">
      <div className="container-brand">
        <FadeIn>
          <GlassCard className="overflow-hidden px-6 py-12 lg:px-10 lg:py-14">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <div className="inline-flex items-center rounded-full border border-brand-green/20 bg-brand-green/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">
                  Ready to grow bookings?
                </div>
                <h2 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Stop losing revenue to missed calls, slow follow-up, and disconnected customer journeys.
                </h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-brand-muted">
                  BookedAI.au connects search, website, calls, email, and follow-up into one revenue system built for
                  service businesses that need clearer conversion and less admin drag.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {closeoutPoints.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-brand-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button href="#pricing" size="lg" className="w-full">
                  Book a demo
                </Button>
                <Button href="#how-it-works" variant="secondary" size="lg" className="w-full">
                  See how it works
                </Button>
              </div>
            </div>
          </GlassCard>
        </FadeIn>
      </div>
    </section>
  );
}
