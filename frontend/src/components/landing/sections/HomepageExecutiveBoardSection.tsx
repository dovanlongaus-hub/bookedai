import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

const summarySignals = [
  {
    label: 'Enterprise read',
    title: 'Reads like a serious operating layer, not a generic AI surface',
    body: 'The page now shows one commercial machine: demand capture, qualification, conversion, and operational continuity in a single narrative.',
    tone: 'from-[#eef6ff] to-white',
  },
  {
    label: 'SME clarity',
    title: 'The value proposition lands in business language, not product jargon',
    body: 'The strongest cues now focus on conversion, control, and commercial visibility so buyers understand the outcome quickly.',
    tone: 'from-[#effcf5] to-white',
  },
  {
    label: 'Investor confidence',
    title: 'The opening minute now signals workflow depth and scale potential',
    body: 'What BookedAI is, why it matters, and why it can compound into a durable software business are easier to parse in sequence.',
    tone: 'from-[#fff7ed] to-white',
  },
];

const workflowColumns = [
  {
    step: '01',
    title: 'Capture demand',
    body: 'Website, chat, demo, and search feed one visible intent lane.',
    chips: ['Website', 'Search', 'Chat'],
  },
  {
    step: '02',
    title: 'Qualify intent',
    body: 'BookedAI structures the request, surfaces fit, and clarifies the strongest next move.',
    chips: ['Intent', 'Fit', 'Ranking'],
  },
  {
    step: '03',
    title: 'Convert to booking',
    body: 'Booking handoff, payment posture, and follow-up remain connected.',
    chips: ['Booking', 'Payment', 'Follow-up'],
  },
  {
    step: '04',
    title: 'Operate with control',
    body: 'Teams share tenant state, audit visibility, and workflow control in one system.',
    chips: ['Tenant', 'Admin', 'Audit'],
  },
];

const boardStats = [
  {
    value: '1',
    label: 'connected path from enquiry to booked outcome',
  },
  {
    value: '3',
    label: 'core messages buyers should understand immediately',
  },
  {
    value: '60s',
    label: 'to communicate product value, workflow depth, and next action',
  },
];

export function HomepageExecutiveBoardSection() {
  return (
    <SectionShell id="homepage-board" className="py-8 lg:py-10" width="wide">
      <SectionCard className="relative overflow-hidden border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,250,255,0.98)_52%,rgba(250,252,255,0.98)_100%)] p-6 shadow-[0_26px_80px_rgba(15,23,42,0.07)] lg:p-8">
        <div className="absolute left-12 top-0 h-40 w-40 rounded-full bg-sky-300/15 blur-3xl" />
        <div className="absolute right-8 bottom-0 h-40 w-40 rounded-full bg-emerald-300/12 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div>
            <SignalPill variant="soft" className="w-fit px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-sky-700">
              Executive homepage board
            </SignalPill>
            <h2 className="mt-4 max-w-[12ch] font-['Space_Grotesk'] text-[2.15rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.85rem] lg:text-[3.45rem]">
              A homepage that feels simple, modern, and enterprise-ready in the first minute.
            </h2>
            <p className="mt-4 max-w-[35rem] text-[1rem] leading-7 text-slate-600">
              The opening experience is now filtered around the signals that matter most to SMEs and investors: what problem BookedAI solves, how value moves through the system, and why the workflow can scale beyond a single assistant surface.
            </p>

            <div className="mt-6 grid gap-3">
              {summarySignals.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-[1.45rem] border border-black/6 bg-gradient-to-br ${item.tone} px-5 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.04)]`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-[1.08rem] font-semibold tracking-[-0.03em] text-slate-950">
                    {item.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <SectionCard className="rounded-[1.9rem] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f2f8ff_100%)] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Visual workflow
                  </div>
                  <div className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">
                    BookedAI in one scan
                  </div>
                </div>
                <SignalPill className="px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-700">
                  Product + operations + revenue
                </SignalPill>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-4">
                {workflowColumns.map((item, index) => (
                  <div key={item.step} className="relative">
                    <div className="rounded-[1.35rem] border border-white/90 bg-white/96 px-4 py-4 shadow-[0_12px_26px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                          {item.step}
                        </div>
                        <div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                      </div>
                      <div className="mt-3 text-base font-semibold tracking-[-0.03em] text-slate-950">
                        {item.title}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{item.body}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.chips.map((chip) => (
                          <div
                            key={chip}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                          >
                            {chip}
                          </div>
                        ))}
                      </div>
                    </div>
                    {index < workflowColumns.length - 1 ? (
                      <div className="pointer-events-none absolute -right-2 top-1/2 hidden h-[2px] w-4 -translate-y-1/2 bg-sky-400 lg:block" />
                    ) : null}
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="grid gap-3 md:grid-cols-3">
              {boardStats.map((item) => (
                <SectionCard
                  key={item.label}
                  className="rounded-[1.45rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]"
                >
                  <div className="text-[1.85rem] font-semibold tracking-[-0.05em] text-slate-950">
                    {item.value}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.label}</div>
                </SectionCard>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
