import Image from "next/image";

import { FooterSection } from "@/components/sections/footer-section";
import { HeroSection } from "@/components/sections/hero-section";
import { FadeIn } from "@/components/ui/motion";

const quickSignals = [
  "Capture more qualified enquiries",
  "Convert faster to booking",
  "Automate follow-up, CRM, and customer care",
] as const;

const workflowSteps = [
  {
    step: "01",
    title: "Capture demand wherever it starts",
    body: "Bring website enquiries, calls, chat, and search demand into one guided revenue flow.",
  },
  {
    step: "02",
    title: "Qualify and guide instantly",
    body: "BookedAI.au guides customers to the right service and reduces back-and-forth before booking.",
  },
  {
    step: "03",
    title: "Automate what happens after booking",
    body: "Keep the journey moving with post-booking care, follow-up, CRM sync, and email continuity.",
  },
] as const;

const featureGroups = [
  {
    title: "BookedAI.au gives your team one clearer conversion path",
    items: [
      "Capture demand from website, calls, chat, and search",
      "Guide customers to the right service faster",
      "Reduce drop-off before booking or payment",
      "See clearer visibility into conversion blockers",
    ],
  },
  {
    title: "Automation continues after the booking",
    items: [
      "Trigger automated customer care after booking",
      "Keep CRM records, lifecycle status, and customer context in sync",
      "Send confirmation and continuity emails with the right booking context",
      "Support recovery flows without extra admin overhead",
    ],
  },
] as const;

const proofStats = [
  { label: "Channels connected", value: "Search, web, calls, chat" },
  { label: "What it covers", value: "Enquiry, booking, follow-up, care" },
  { label: "What stays synced", value: "CRM, email, lifecycle context" },
] as const;

const trustBlocks = [
  {
    title: "Capture demand faster",
    body: "Turn website visitors, calls, and chats into structured enquiries your team can act on fast.",
  },
  {
    title: "Convert with less drop-off",
    body: "Guide customers to the right service, booking step, or payment path while intent is still high.",
  },
  {
    title: "Keep care moving automatically",
    body: "Run post-booking care, follow-up, CRM sync, and lifecycle email without adding admin burden.",
  },
] as const;

const proofHighlights = [
  "A real product flow that starts on the homepage and continues in product",
  "Automation built around booking, follow-up, customer care, CRM, and lifecycle email",
  "Built for business owners who need commercial visibility, not just a prettier front end",
] as const;

const pricingCards = [
  {
    name: "Starter",
    audience: "Best for single-location teams or early rollout",
    price: "Get started free",
    body: "For service businesses that need cleaner demand capture, booking guidance, and clear visibility.",
    points: ["Lead capture basics", "Homepage conversion layer", "Simple booking routing", "Core visibility into enquiries"],
  },
  {
    name: "Growth",
    audience: "Best for teams ready to automate more of the booking journey",
    price: "Built to convert",
    body: "For teams ready to connect search, website, booking, and follow-up into a stronger booking engine.",
    points: ["Everything in Starter", "Multi-channel conversion flow", "Booking and payment handoff", "Automated follow-up and recovery support"],
  },
  {
    name: "Scale",
    audience: "Best for teams that need deeper workflow and lifecycle orchestration",
    price: "Custom rollout",
    body: "For teams that want deeper automation across customer care, CRM, lifecycle email, and a tailored revenue workflow.",
    points: ["Advanced follow-up automation", "CRM and lifecycle workflow depth", "Workflow tailoring", "Priority optimization and rollout support"],
  },
] as const;

const faqs = [
  {
    question: "Who is BookedAI.au for?",
    answer: "BookedAI.au is built for service businesses that rely on enquiries, calls, bookings, and follow-up to grow revenue, especially local teams with fragmented demand.",
  },
  {
    question: "What does BookedAI.au improve first?",
    answer: "Most teams start by improving the front of the funnel: clearer enquiry capture, faster qualification, and less drop-off before booking or payment. Then BookedAI.au extends that flow into post-booking care, follow-up, CRM sync, and lifecycle email.",
  },
  {
    question: "Do I need to replace my whole stack?",
    answer: "No. BookedAI.au strengthens the path from demand to booking first, then expands into deeper workflow, customer care, follow-up, CRM sync, and operational visibility over time.",
  },
] as const;

export default function Page() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8fafc] text-slate-900">
      <HeroSection />

      <section className="relative z-10 -mt-10 pb-12">
        <div className="container-brand">
          <FadeIn>
            <div className="rounded-[2.25rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-6 py-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:px-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  What matters most
                </span>
                {quickSignals.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.04)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="pb-8">
        <div className="container-brand">
          <div className="grid gap-6 lg:grid-cols-3">
            {trustBlocks.map((item, index) => (
              <FadeIn key={item.title} delay={0.04 * index}>
                <article className="h-full rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3563f6]">Why it matters</div>
                  <h3 className="mt-5 text-[1.45rem] font-medium tracking-tight text-slate-900">{item.title}</h3>
                  <p className="mt-4 text-[15px] leading-8 text-slate-600">{item.body}</p>
                </article>
              </FadeIn>
            ))}
          </div>
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
                A clearer path from first enquiry to confirmed booking.
              </h2>
              <p className="mt-6 text-[17px] leading-8 text-slate-600">
                BookedAI.au reduces friction at the front of the funnel, qualifies demand faster, and keeps the journey moving before and after booking.
              </p>
            </div>
          </FadeIn>

          <div className="mt-20 grid gap-6 lg:grid-cols-3">
            {workflowSteps.map((item, index) => (
              <FadeIn key={item.step} delay={0.05 * index}>
                <article className="h-full rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
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
        <div className="container-brand pb-14">
          <FadeIn>
            <div className="overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),linear-gradient(180deg,#081121_0%,#0f172a_100%)] text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
                <div className="flex flex-col justify-center px-8 py-10 sm:px-10 lg:px-12 lg:py-12">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Product proof</div>
                  <h2 className="mt-4 max-w-2xl text-3xl font-medium tracking-tight text-white sm:text-[2.4rem]">
                    One automation layer from enquiry to booking, follow-up, CRM, and customer care.
                  </h2>
                  <p className="mt-5 max-w-2xl text-[15px] leading-8 text-slate-300 sm:text-[16px]">
                    BookedAI.au is built to keep the customer journey moving after the first click, with continuity across care, lifecycle communication, and revenue follow-through.
                  </p>
                  <ul className="mt-7 space-y-3">
                    {proofHighlights.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[15px] leading-7 text-slate-200">
                        <span className="mt-2 h-2 w-2 rounded-full bg-sky-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative min-h-[320px] border-t border-white/10 lg:min-h-[100%] lg:border-l lg:border-t-0">
                  <Image
                    src="/branding/bookedai-homepage-image.webp"
                    alt="BookedAI.au product proof preview"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 48vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.36))]" />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
        <div className="container-brand">
          <div className="grid gap-12 xl:grid-cols-[0.98fr_1.02fr] xl:items-start">
            <FadeIn>
              <div className="max-w-xl">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Why BookedAI.au converts better
                </div>
                <h2 className="mt-4 text-4xl font-medium tracking-tight text-slate-900 sm:text-[3.25rem]">
                  Better demand capture, less revenue leakage, stronger post-booking continuity.
                </h2>
                <p className="mt-6 text-[17px] leading-8 text-slate-600">
                  Instead of treating every enquiry or booking as a disconnected event, BookedAI.au guides the next step and keeps CRM, email, and customer-care continuity aligned.
                </p>
                <div className="mt-12 grid gap-4 rounded-[1.75rem] bg-[#eef3ff] p-7 sm:grid-cols-3">
                  {proofStats.map((item) => (
                    <div key={item.label} className="rounded-[1.25rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                      <div className="mt-3 text-lg font-medium tracking-tight text-slate-900">{item.value}</div>
                    </div>
                  ))}
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
                Pricing
              </div>
              <h2 className="mt-4 text-4xl font-medium tracking-tight text-slate-900 sm:text-[3.25rem]">
                Plans for each stage of growth.
              </h2>
              <p className="mt-6 text-[17px] leading-8 text-slate-600">
                Start with a lighter conversion layer, then expand into booking, payment, post-booking care, follow-up, CRM sync, and lifecycle email as demand grows.
              </p>
            </div>
          </FadeIn>

          <div className="mt-20 grid gap-6 xl:grid-cols-3">
            {pricingCards.map((card, index) => (
              <FadeIn key={card.name} delay={0.04 * index}>
                <article className="h-full rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{card.name}</div>
                  <div className="mt-3 text-sm font-medium text-[#3563f6]">{card.audience}</div>
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
                Questions teams ask most
              </h2>
            </div>
          </FadeIn>

          <div className="mt-20 grid gap-6 lg:grid-cols-2">
            {faqs.map((item, index) => (
              <FadeIn key={item.question} delay={0.04 * index}>
                <article className="rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-8 shadow-[0_12px_26px_rgba(15,23,42,0.04)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
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
            <div className="rounded-[2.6rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-12 text-center shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:px-10">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3563f6]">
                Ready to move faster?
              </div>
              <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-medium tracking-tight text-slate-900 sm:text-[3.1rem]">
                Turn more demand into booked revenue.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-slate-600">
                If your team is losing momentum between enquiry, booking, follow-up, and customer care, BookedAI.au gives you a cleaner automated path forward.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="https://product.bookedai.au/?source=homepage-cta"
                  className="inline-flex items-center justify-center rounded-full bg-[#3563f6] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  Start with BookedAI.au
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View pricing
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
