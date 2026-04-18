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
    <section className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <div className="glass-card rounded-lg px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-textSecondary">
              Built for commercial visibility
            </div>
            <div className="h-4 w-px bg-border" />
            {trustItems.map((item) => (
              <span
                key={item}
                className="rounded-pill border border-border bg-surfaceAlt px-3 py-1.5 text-xs font-medium text-textSecondary"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
