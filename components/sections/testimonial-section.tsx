import { FadeIn } from "@/components/ui/motion";
import { ProofQuote, SectionHeading } from "@/components/ui/kpi-widgets";

const testimonials = [
  {
    quote:
      "BookedAI.au gave us one view of search, website chat, missed calls, and follow-up. We stopped guessing where bookings came from.",
    author: "Sarah Nguyen",
    role: "Clinic Operations Lead",
    stat: "+24% booked revenue",
  },
  {
    quote:
      "The biggest shift was speed. Enquiries stopped sitting idle and our team could finally see what converted versus what went cold.",
    author: "Daniel Brooks",
    role: "Founder, Service Studio",
    stat: "6h faster response",
  },
  {
    quote:
      "It feels less like adding another chatbot and more like turning on a revenue operating layer we were missing.",
    author: "Mia Tran",
    role: "Growth Manager, Multi-site Wellness Brand",
    stat: "38% search share",
  },
] as const;

export function TestimonialSection() {
  return (
    <section className="section-y">
      <div className="container-brand">
        <FadeIn>
          <SectionHeading
            eyebrow="Customer Proof"
            title="Teams do not need more disconnected tools. They need clearer results."
            body="BookedAI.au brings together conversion flow, booking outcome, and revenue visibility so teams can see what is working and where value is still leaking."
          />
        </FadeIn>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <FadeIn key={item.author} delay={0.06 * index}>
              <ProofQuote
                quote={item.quote}
                author={item.author}
                role={item.role}
                stat={item.stat}
              />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
