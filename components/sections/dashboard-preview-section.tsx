import { GlassCard } from "@/components/ui/glass-card";

const kpis = [
  { label: "Revenue generated", value: "$84.2k", tone: "text-primaryBlue" },
  { label: "Bookings generated", value: "146", tone: "text-textPrimary" },
  { label: "Average booking value", value: "$577", tone: "text-accentGreen" },
  { label: "Commission due", value: "$8.4k", tone: "text-accentPurple" },
];

const channels = [
  { label: "Search", revenue: "$28.4k", progress: "72%" },
  { label: "Website", revenue: "$18.1k", progress: "56%" },
  { label: "Calls", revenue: "$14.6k", progress: "44%" },
  { label: "Email", revenue: "$9.2k", progress: "31%" },
  { label: "Follow-up", revenue: "$8.7k", progress: "27%" },
];

const risks = [
  "Missed calls value: $3.9k",
  "Unanswered enquiry value: $2.1k",
  "Incomplete payment reminders: 11",
];

export function DashboardPreviewSection() {
  return (
    <section id="dashboard" className="section-shell px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-pill border border-accentGreen/20 bg-accentGreen/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accentGreen">
            Dashboard-forward by default
          </div>
          <h2 className="mt-5 text-h2 font-semibold tracking-[-0.045em] text-textPrimary">
            Revenue visibility across every channel that can win or lose a booking
          </h2>
          <p className="mt-4 text-bodyLg leading-8 text-textSecondary">
            Search, website, calls, email, follow-up, referral, and reactivation should not live in disconnected tools.
            BookedAI.au turns them into one revenue system.
          </p>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <GlassCard glow className="p-7 lg:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {kpis.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-white/[0.03] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{item.label}</div>
                  <div className={`mt-3 text-4xl font-bold tracking-[-0.05em] ${item.tone}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-border bg-bgSoft/85 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Revenue by channel</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-textPrimary">Source attribution with commercial context</div>
                </div>
                <div className="rounded-pill bg-primaryBlue/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primaryBlue">
                  Live preview
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {channels.map((channel) => (
                  <div key={channel.label} className="rounded-md border border-border bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-textPrimary">{channel.label}</div>
                      <div className="text-sm font-semibold text-textSecondary">{channel.revenue}</div>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-pill bg-white/8">
                      <div
                        className="h-full rounded-pill bg-[image:var(--brandGradient)]"
                        style={{ width: channel.progress }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <div className="grid gap-6">
            <GlassCard className="p-7">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-warningAmber">Missed revenue tracker</div>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-textPrimary">$6.0k at risk</div>
              <div className="mt-4 grid gap-3">
                {risks.map((risk) => (
                  <div key={risk} className="rounded-md border border-warningAmber/20 bg-warningAmber/10 px-4 py-3 text-sm leading-6 text-textSecondary">
                    {risk}
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-7">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-accentPurple">Conversion analytics</div>
              <div className="mt-5 grid gap-3">
                {[
                  "Search to enquiry: 11.4%",
                  "Website chat to booking: 18.7%",
                  "Call to booking: 42.1%",
                  "Email enquiry to booking: 23.6%",
                  "Follow-up recovery: 14.8%",
                ].map((metric) => (
                  <div key={metric} className="rounded-md border border-border bg-white/[0.03] px-4 py-3 text-sm font-medium text-textPrimary">
                    {metric}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
