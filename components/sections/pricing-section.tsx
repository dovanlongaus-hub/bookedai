import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

function PricingCard({
  title,
  price,
  description,
  items,
}: {
  title: string;
  price: string;
  description: string;
  items: string[];
}) {
  return (
    <GlassCard className="h-full p-6 lg:p-8">
      <div className="text-sm uppercase tracking-[0.22em] text-brand-muted">
        {title}
      </div>
      <div className="mt-4 text-3xl font-bold text-brand-text">{price}</div>
      <p className="mt-4 text-sm leading-7 text-brand-muted">{description}</p>

      <ul className="mt-6 space-y-3 text-sm text-brand-text">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-brand-green" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="section-y">
      <div className="container-brand">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs uppercase tracking-[0.24em] text-brand-muted">
            Aligned Pricing That Grows With You
          </div>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Setup once. Pay based on performance.
          </h2>
          <p className="mt-5 text-lg leading-8 text-brand-muted">
            BookedAI.au starts with a one-time setup fee to build your AI
            revenue engine around your business. After launch, pricing is tied
            to successful bookings or revenue generated.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <PricingCard
            title="Custom Setup"
            price="One-time setup fee"
            description="We design, configure, integrate, and launch your BookedAI.au system to match your workflows, channels, booking logic, and revenue goals."
            items={[
              "AI voice and chat setup",
              "Search, website, email, and follow-up workflows",
              "Booking automation configuration",
              "Calendar / CRM / payment integration",
              "Revenue dashboard configuration",
              "Testing and launch support",
            ]}
          />

          <PricingCard
            title="Success-Based Commission"
            price="Per booking or revenue generated"
            description="After launch, BookedAI.au pricing is aligned to outcomes. You pay based on the commercial value created through the system."
            items={[
              "Lower risk to adopt",
              "Pricing aligned to results",
              "Clearer ROI visibility",
              "Growth-partner positioning",
              "Channel attribution and commission tracking",
              "Built to scale as bookings grow",
            ]}
          />
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-brand border border-white/10 bg-white/5 px-6 py-8 text-center">
          <p className="max-w-2xl text-sm leading-7 text-brand-muted">
            Commission structure can be tailored to your service model, average
            booking value, and sales cycle. The goal is simple: <span className="font-semibold text-white">we win when you win.</span>
          </p>
          <Button href="#hero">Book a Strategy Demo</Button>
        </div>
      </div>
    </section>
  );
}
