import { FooterSection } from "@/components/sections/footer-section";
import { HeroSection } from "@/components/sections/hero-section";
import { FadeIn } from "@/components/ui/motion";

const quickSignals = [
  "Search-first homepage",
  "Booking-focused path",
] as const;

const workflowSteps = [
  {
    step: "01",
    title: "Start with a simple search",
    body: "Customers often arrive with only a location or a broad need. The page should help them begin with minimal effort.",
  },
  {
    step: "02",
    title: "Clarify the next step",
    body: "Search, qualification, and clearer prompts make the path easier to understand.",
  },
  {
    step: "03",
    title: "Move toward booking",
    body: "The experience supports call, booking, payment, or follow-up while the customer is still engaged.",
  },
] as const;

const featureGroups = [
  {
    title: "What the homepage now emphasizes",
    items: ["Location-aware search", "Industry suggestions", "Simple first action", "Calmer visual structure"],
  },
] as const;

const industries = [
  "Plumbers",
  "Electricians",
  "Restaurants",
  "Hairdressers",
  "Dentists",
  "Mechanics",
  "Builders",
  "Cafes",
] as const;

const pricingCards = [
  {
    name: "Starter",
    price: "Freemium entry",
    body: "For service businesses validating a cleaner search-to-booking flow.",
    points: ["Homepage search surface", "Lead capture", "Basic booking routing", "Simple visibility layer"],
  },
  {
    name: "Growth",
    price: "Setup + success model",
    body: "For businesses ready to connect search, website, and follow-up into a stronger conversion path.",
    points: ["Everything in Starter", "Multi-channel conversion flow", "Booking and payment handoff", "Better operator insight"],
  },
  {
    name: "Scale",
    price: "Custom expansion",
    body: "For teams that want broader automation, stronger recovery, and deeper commercial visibility.",
    points: ["Advanced follow-up", "Deeper integration support", "Revenue workflow tailoring", "Priority optimization"],
  },
] as const;

const faqs = [
  {
    question: "Is this homepage now meant to feel more like search than a pitch deck?",
    answer: "Yes. The structure is lighter, clearer, and more action-led so users can understand the product quickly and start interacting faster.",
  },
  {
    question: "Does BookedAI only handle chat?",
    answer: "No. The product direction covers search demand, website enquiries, calls, booking flow, follow-up, and commercial visibility.",
  },
  {
    question: "Can this still support local service SMEs?",
    answer: "Yes. The homepage now presents that value in a cleaner marketplace-style format that works well for local service discovery.",
  },
] as const;

export default function Page() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8fafc] text-slate-900">
      <HeroSection />

      <section className="relative z-10 -mt-8 pb-12">
        <div className="container-brand">
          <FadeIn>
            <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-[0_10px_26px_rgba(15,23,42,0.04)] sm:px-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Quick signals
                </span>
                {quickSignals.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="how-it-works" className="py-32 sm:py-36">
        <div className="container-brand">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                How It Works
              </div>
              <h2 className="mt-4 text-4xl font-medium tracking-tight text-slate-900 sm:text-[3.25rem]">
                A quieter structure for discovery and action
              </h2>
              <p className="mt-6 text-[17px] leading-8 text-slate-600">
                One central search action and lighter supporting sections make the page easier to scan.
              </p>
            </div>
          </FadeIn>

          <div className="mt-20 grid gap-6 lg:grid-cols-3">
            {workflowSteps.map((item, index) => (
              <FadeIn key={item.step} delay={0.05 * index}>
                <article className="h-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_8px_22px_rgba(15,23,42,0.035)]">
                  <div className="text-sm font-semibold text-[#3563f6]">{item.step}</div>
                  <h3 className="mt-6 text-[1.55rem] font-medium tracking-tight text-slate-900">{item.title}</h3>
                  <p className="mt-4 text-[15px] leading-8 text-slate-600">{item.body}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="dashboard" className="bg-white py-32 sm:py-36">
        <div className="container-brand">
          <div className="grid gap-12 xl:grid-cols-[0.98fr_1.02fr] xl:items-start">
            <FadeIn>
              <div className="max-w-xl">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Product Direction
                </div>
                <h2 className="mt-4 text-4xl font-medium tracking-tight text-slate-900 sm:text-[3.25rem]">
                  Homepage first
                </h2>
                <p className="mt-6 text-[17px] leading-8 text-slate-600">
                  Instead of overwhelming visitors with too much story up front, the page now prioritizes
                  discovery, intent capture, and clearer next steps.
                </p>
                <div className="mt-12 rounded-[1.75rem] bg-[#eef3ff] p-7">
                  <div className="text-sm font-semibold text-[#3563f6]">Popular industries</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {industries.map((item) => (
                      <span key={item} className="rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.08}>
              <div className="grid gap-6">
                {featureGroups.map((group) => (
                  <section
                    key={group.title}
                    className="rounded-[2rem] border border-slate-200 bg-[#fbfdff] p-8 shadow-[0_8px_22px_rgba(15,23,42,0.03)]"
                  >
                    <div className="text-lg font-medium text-slate-900">{group.title}</div>
                    <ul className="mt-5 space-y-3">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-[15px] leading-7 text-slate-600">
                          <span className="mt-2 h-2 w-2 rounded-full bg-[#3563f6]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-32 sm:py-36">
        <div className="container-brand">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Pricing Path
              </div>
              <h2 className="mt-4 text-4xl font-medium tracking-tight text-slate-900 sm:text-[3.25rem]">
                Simple packages with room to grow
              </h2>
              <p className="mt-6 text-[17px] leading-8 text-slate-600">
                Pricing stays visible and easy to compare, without a heavier landing-page treatment.
              </p>
            </div>
          </FadeIn>

          <div className="mt-20 grid gap-6 xl:grid-cols-3">
            {pricingCards.map((card, index) => (
              <FadeIn key={card.name} delay={0.04 * index}>
                <article className="h-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_8px_22px_rgba(15,23,42,0.035)]">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{card.name}</div>
                  <div className="mt-4 text-3xl font-medium tracking-tight text-slate-900">{card.price}</div>
                  <p className="mt-4 text-[15px] leading-8 text-slate-600">{card.body}</p>
                  <ul className="mt-6 space-y-3">
                    {card.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-[15px] leading-7 text-slate-600">
                        <span className="mt-2 h-2 w-2 rounded-full bg-[#3563f6]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-32 sm:py-36">
        <div className="container-brand">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                FAQ
              </div>
              <h2 className="mt-4 text-4xl font-medium tracking-tight text-slate-900 sm:text-[3.25rem]">
                Common questions
              </h2>
            </div>
          </FadeIn>

          <div className="mt-20 grid gap-6 lg:grid-cols-2">
            {faqs.map((item, index) => (
              <FadeIn key={item.question} delay={0.04 * index}>
                <article className="rounded-[2rem] border border-slate-200 bg-[#fcfdff] p-8 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
                  <h3 className="text-xl font-medium tracking-tight text-slate-900">{item.question}</h3>
                  <p className="mt-4 text-[15px] leading-8 text-slate-600">{item.answer}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-brand">
          <FadeIn>
            <div className="rounded-[2.4rem] border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_10px_28px_rgba(15,23,42,0.035)] sm:px-10">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3563f6]">
                Next Step
              </div>
              <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-medium tracking-tight text-slate-900 sm:text-[3.1rem]">
                Keep the homepage simple
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-slate-600">
                This version keeps the logo and navigation, while moving the rest of the homepage toward
                a cleaner, search-oriented style.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="#hero"
                  className="inline-flex items-center justify-center rounded-full bg-[#3563f6] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  Back To Search
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
