import { DashboardPreviewSection } from "@/components/sections/dashboard-preview-section";
import { FooterSection } from "@/components/sections/footer-section";
import { FinalCTASection } from "@/components/sections/final-cta-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { TestimonialSection } from "@/components/sections/testimonial-section";
import { TrustBar } from "@/components/sections/trust-bar";
import { GlassCard } from "@/components/ui/glass-card";
import { FadeIn, AnimatedBackground } from "@/components/ui/motion";
import { SectionHeading } from "@/components/ui/kpi-widgets";

type CompareRow = {
  tool: string;
  conversations: string;
  bookings: string;
  revenueVisibility: string;
  highlight?: boolean;
};

type FaqItem = {
  question: string;
  answer: string;
};

const leakagePoints = [
  "Search traffic that never converts",
  "Calls that go unanswered",
  "Emails and enquiries that sit too long",
  "Follow-up that never happens",
  "No visibility into revenue won or lost",
] as const;

const systemFeatures = [
  "Multi-channel demand capture",
  "AI voice and website chat",
  "Lead qualification and routing",
  "Booking automation",
  "Revenue dashboard",
  "Missed revenue tracker",
  "Conversion analytics by channel",
  "Stripe / payment visibility",
  "Follow-up recovery workflows",
] as const;

const compareRows: CompareRow[] = [
  { tool: "Traditional chatbot", conversations: "Basic", bookings: "Limited", revenueVisibility: "No" },
  { tool: "Booking software", conversations: "Minimal", bookings: "Yes", revenueVisibility: "Minimal" },
  { tool: "CRM", conversations: "Manual", bookings: "Indirect", revenueVisibility: "Partial" },
  { tool: "BookedAI.au", conversations: "Yes", bookings: "Yes", revenueVisibility: "Yes", highlight: true },
];

const faqItems: FaqItem[] = [
  {
    question: "Is BookedAI.au only for chat and calls?",
    answer:
      "No. BookedAI.au is designed to capture and convert demand across search, website, calls, email, follow-up, and more.",
  },
  {
    question: "How does the commission model work?",
    answer:
      "BookedAI.au starts with a setup fee to build and launch your system. After that, pricing is aligned to successful bookings or revenue generated.",
  },
  {
    question: "Can I see what revenue the system creates?",
    answer:
      "Yes. The product direction includes revenue dashboards, conversion metrics, missed revenue tracking, and payment-linked reporting.",
  },
  {
    question: "What makes this different from a normal booking tool?",
    answer:
      "A normal booking tool waits for the customer to do the work. BookedAI.au actively captures, responds, qualifies, follows up, and helps convert opportunities into revenue.",
  },
];

export default function Page() {
  return (
    <main className="bookedai-brand-shell relative overflow-x-hidden">
      <AnimatedBackground />

      <HeroSection />
      <TrustBar />

      <section className="section-y">
        <div className="container-brand">
          <FadeIn>
            <SectionHeading
              eyebrow="Revenue Is Lost Across More Channels Than You Think"
              title="Most businesses do not lose revenue in one place. They lose it everywhere."
              body="A customer finds you on search, visits your website, sends an email, calls after hours, or asks a question but never gets followed up properly. The demand is there — but without a connected system, bookings slip away."
            />
          </FadeIn>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {leakagePoints.map((item, index) => (
              <FadeIn key={item} delay={0.04 * index}>
                <GlassCard className="h-full p-5">
                  <p className="text-sm leading-7 text-brand-text">{item}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section-y">
        <div className="container-brand">
          <FadeIn>
            <SectionHeading
              eyebrow="How It Works"
              title="BookedAI.au connects your demand channels to one revenue system."
              body="Instead of handling search, website, calls, email, and follow-up separately, BookedAI.au brings them together into one conversion engine designed to generate more bookings."
            />
          </FadeIn>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["01", "Capture Demand Everywhere", "From search traffic, website visits, calls, chats, emails, and missed enquiries."],
              ["02", "Respond Instantly", "Engage leads fast with the right answers, qualification questions, and next steps."],
              ["03", "Convert Into Bookings", "Guide qualified prospects into the right service, time slot, and booking flow."],
              ["04", "Track Revenue and Recover Loss", "Measure bookings generated, identify missed revenue, and keep follow-up moving."],
            ].map(([num, title, body], index) => (
              <FadeIn key={num} delay={0.05 * index}>
                <GlassCard className="h-full p-6">
                  <div className="text-sm font-semibold text-brand-blue">{num}</div>
                  <div className="mt-3 text-xl font-semibold">{title}</div>
                  <p className="mt-3 text-sm leading-7 text-brand-muted">{body}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-brand">
          <FadeIn>
            <SectionHeading
              eyebrow="Revenue, Not Just Automation"
              title="This is not just an AI assistant. It is a conversion and revenue system."
              body="BookedAI.au is designed to capture inbound demand, qualify leads, automate booking, track payment progress, and recover missed opportunities across multiple channels."
            />
          </FadeIn>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {systemFeatures.map((item, index) => (
              <FadeIn key={item} delay={0.03 * index}>
                <GlassCard className="h-full p-5">
                  <p className="text-sm font-medium text-brand-text">{item}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <DashboardPreviewSection />
      <PricingSection />
      <TestimonialSection />

      <section className="section-y">
        <div className="container-brand">
          <FadeIn>
            <SectionHeading
              eyebrow="Why BookedAI.au"
              title="Most tools manage conversations. BookedAI.au manages revenue."
              body="Traditional chatbots answer questions. Booking tools store schedules. CRMs organize records. BookedAI.au connects demand capture, follow-up, booking, revenue visibility, and performance-aligned growth."
            />
          </FadeIn>

          <FadeIn delay={0.06}>
            <GlassCard className="mt-12 overflow-hidden p-2 sm:p-3">
              <div className="hidden grid-cols-[1.25fr_1fr_1fr_1fr] gap-4 rounded-[1.35rem] bg-white/5 px-6 py-4 text-sm font-semibold text-white md:grid">
                <div>Tool</div>
                <div>Conversations</div>
                <div>Bookings</div>
                <div>Revenue Visibility</div>
              </div>

              <div className="mt-2 space-y-2">
                {compareRows.map((row) => (
                  <div
                    key={row.tool}
                    className={`grid gap-3 rounded-[1.35rem] border border-white/10 px-5 py-5 text-sm md:grid-cols-[1.25fr_1fr_1fr_1fr] md:items-center md:gap-4 ${
                      row.highlight ? "bg-brand-blue/10 shadow-glow" : "bg-white/5"
                    }`}
                  >
                    <div>
                      <div className={`font-medium ${row.highlight ? "text-white" : "text-brand-text"}`}>{row.tool}</div>
                    </div>
                    <CompareCell label="Conversations" value={row.conversations} highlight={row.highlight} />
                    <CompareCell label="Bookings" value={row.bookings} highlight={row.highlight} />
                    <CompareCell label="Revenue Visibility" value={row.revenueVisibility} highlight={row.highlight} />
                  </div>
                ))}
              </div>
            </GlassCard>
          </FadeIn>
        </div>
      </section>

      <section id="faq" className="section-y">
        <div className="container-brand">
          <FadeIn>
            <SectionHeading
              eyebrow="FAQ"
              title="Questions your customers and investors will both ask"
              body="Use this section to clarify the model, explain the revenue engine angle, and reduce objections before demo booking."
            />
          </FadeIn>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {faqItems.map((item, index) => (
              <FadeIn key={item.question} delay={0.04 * index}>
                <GlassCard className="h-full p-6">
                  <h3 className="text-lg font-semibold">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-brand-muted">{item.answer}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <FinalCTASection />
      <FooterSection />
    </main>
  );
}

function CompareCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 md:block">
      <span className="text-xs uppercase tracking-[0.18em] text-brand-muted md:hidden">{label}</span>
      <span className={highlight ? "font-semibold text-white" : "text-brand-muted"}>{value}</span>
    </div>
  );
}
