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
            Simple pricing for growing service businesses
          </div>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Start freemium. Upgrade as your bookings grow.
          </h2>
          <p className="mt-5 text-lg leading-8 text-brand-muted">
            BookedAI.au starts with a one-time setup fee, then scales on a
            success-based commission model tied to bookings or revenue
            generated. SMEs can begin with a freemium launch and move into
            Pro or Pro Max as they need more channels, automation, and growth
            support.
          </p>
        </div>

        <div className="mt-8 rounded-brand border border-brand-green/30 bg-brand-green/10 px-6 py-5 text-center text-sm leading-7 text-brand-text">
          Launch offer: the first <span className="font-semibold text-white">10 SMEs</span> get
          <span className="font-semibold text-white"> 1 month free after go-live</span> before
          commission begins.
        </div>

        <div className="mt-12 grid gap-6 xl:grid-cols-3">
          <PricingCard
            title="Freemium"
            price="Setup fee + commission"
            description="Launch with the essentials for SME lead capture and booking conversion, then pay a tailored commission only when BookedAI.au helps generate results."
            items={[
              "One-time setup tailored to your business",
              "Website chat and lead capture flows",
              "Core booking automation and routing",
              "Simple attribution and performance tracking",
              "Designed for SMEs validating demand fast",
              "Launch offer: first 10 SMEs get 1 month free",
            ]}
          />

          <PricingCard
            title="Pro"
            price="More automation for growing SMEs"
            description="Upgrade when your team needs stronger conversion, less admin, and better visibility across customer touchpoints."
            items={[
              "Everything in Freemium",
              "Multi-channel follow-up across web, email, and SMS",
              "Calendar, CRM, and payment integrations",
              "Smarter lead qualification and reminder flows",
              "Clearer ROI dashboards for business owners",
              "Best for SMEs scaling bookings without extra headcount",
            ]}
          />

          <PricingCard
            title="Pro Max"
            price="Maximum capability for ambitious SMEs"
            description="Built for service businesses that want deeper automation, stronger conversion coverage, and a more hands-on growth engine."
            items={[
              "Everything in Pro",
              "Advanced AI voice and high-intent enquiry handling",
              "Reactivation, upsell, and repeat-booking journeys",
              "More tailored workflows and revenue logic",
              "Priority optimisation and launch support",
              "Best for SMEs ready to scale with broader automation",
            ]}
          />
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-brand border border-white/10 bg-white/5 px-6 py-8 text-center">
          <p className="max-w-2xl text-sm leading-7 text-brand-muted">
            Commission structure is tailored to your service model, average
            booking value, and sales cycle, so SMEs can start lean and upgrade
            as capability increases. The goal is simple: <span className="font-semibold text-white">we win when you win.</span>
          </p>
          <Button href="#hero">Book a demo</Button>
        </div>
      </div>
    </section>
  );
}
