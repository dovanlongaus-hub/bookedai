import { FadeIn } from "@/components/ui/motion";

const trustItems = [
  "24/7 AI assistant",
  "Voice AI agents",
  "Lead qualification",
  "Booking automation",
  "Calendar integration",
  "CRM integration",
];

export function TrustBar() {
  return (
    <section className="pb-4">
      <div className="container-brand">
        <FadeIn className="glass rounded-brand p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
              Built for commercial visibility
            </div>
            <div className="hidden h-4 w-px bg-white/10 sm:block" />
            {trustItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-brand-muted"
              >
                {item}
              </span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
