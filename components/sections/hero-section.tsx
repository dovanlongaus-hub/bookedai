import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

const revenueSignals = [
  { label: "Revenue generated", value: "$84.2k", detail: "Tracked across bookings, deposits, and follow-up recovery." },
  { label: "Bookings generated", value: "146", detail: "Confirmed from search, website, calls, email, and follow-up." },
  { label: "Revenue by channel", value: "7 sources", detail: "Search, website, call, email, follow-up, referral, reactivation." },
];

export function HeroSection() {
  return (
    <section className="section-shell relative px-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-container gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center rounded-pill border border-primaryBlue/20 bg-primaryBlue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primaryBlue">
            The AI Revenue Engine for Service Businesses
          </div>

          <h1 className="mt-6 max-w-5xl text-heroDisplay font-semibold leading-[0.92] tracking-[-0.055em] text-balance text-textPrimary">
            Turn Search, Calls, Emails, and Enquiries Into <span className="gradient-text">Revenue</span>
          </h1>

          <p className="mt-6 max-w-3xl text-bodyLg leading-8 text-textSecondary">
            BookedAI.au captures demand across search, website, calls, email, and follow-up — then converts it into
            confirmed bookings and revenue automatically.
          </p>

          <p className="mt-4 max-w-3xl text-bodyMd leading-7 text-textSecondary">
            Most tools manage conversations. BookedAI.au manages revenue.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg">Schedule My Demo</Button>
            <Button variant="secondary" size="lg">
              See Revenue Dashboard
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-textSecondary">
            <span className="rounded-pill border border-border bg-surfaceAlt px-4 py-2">24/7 AI assistant</span>
            <span className="rounded-pill border border-border bg-surfaceAlt px-4 py-2">Source attribution</span>
            <span className="rounded-pill border border-border bg-surfaceAlt px-4 py-2">Booking automation</span>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:120ms]">
          <GlassCard glow className="animate-float-soft overflow-hidden p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primaryBlue">BookedAI.au</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-textPrimary">Revenue command view</div>
              </div>
              <Logo variant="white" className="h-9 w-auto" />
            </div>

            <div className="mt-5 grid gap-4">
              {revenueSignals.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-white/[0.03] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{item.label}</div>
                  <div className="mt-2 text-3xl font-bold tracking-[-0.04em] text-textPrimary">{item.value}</div>
                  <div className="mt-2 text-sm leading-6 text-textSecondary">{item.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-md border border-border bg-bgSoft/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accentGreen">Payment succeeded</div>
                  <div className="mt-1 text-lg font-semibold text-textPrimary">Deposit paid. Booking confirmed.</div>
                </div>
                <div className="rounded-pill bg-accentGreen/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accentGreen">
                  Live status
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
