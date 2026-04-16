import type { ProofContent, ProofItem } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type ProductProofSectionProps = {
  content: ProofContent;
  items: ProofItem[];
};

export function ProductProofSection({
  content,
  items,
}: ProductProofSectionProps) {
  const painPoints = [
    {
      title: 'Slow replies',
      body: 'Customers leave when your team cannot answer quickly across web chat, phone, and forms.',
    },
    {
      title: 'Messy qualification',
      body: 'Staff waste time repeating basic questions before they even know whether the lead is worth booking.',
    },
    {
      title: 'Revenue leakage',
      body: 'Without clear handoff, enquiries stall between recommendation, booking, payment, and follow-up.',
    },
  ];

  return (
    <section id="product" className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
      <div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-8 py-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Works across the channels local businesses already use
        </div>
        <div className="grid gap-px bg-slate-200 md:grid-cols-5">
          {content.channels.map((channel) => (
            <div
              key={channel}
              className="bg-white px-6 py-5 text-center text-sm font-medium text-slate-700"
            >
              {channel}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <SectionHeading {...content.section} />

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-black/5 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#f8fbff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-rose-100 bg-white/90 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">
                  Pain points
                </div>
                <div className="mt-4 grid gap-3">
                  {painPoints.map((item, index) => (
                    <div
                      key={item.title}
                      className="rounded-[1.2rem] border border-rose-100 bg-rose-50/70 px-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-[11px] font-semibold text-white">
                          {index + 1}
                        </div>
                        <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-100 bg-white/90 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                  Selling points
                </div>
                <div className="mt-4 grid gap-3">
                  {[
                    ['Instant coverage', 'BookedAI responds 24/7 across the channels local businesses already use.'],
                    ['Booking-ready answers', 'Recommendations include timing, fit, and next action instead of vague chatbot copy.'],
                    ['Operational visibility', 'Teams can review flow state, bookings, escalations, and workflow continuity.'],
                  ].map(([title, body], index) => (
                    <div
                      key={title}
                      className="rounded-[1.2rem] border border-emerald-100 bg-emerald-50/70 px-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                          {index + 1}
                        </div>
                        <div className="text-sm font-semibold text-slate-950">{title}</div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item, index) => (
            <article
              key={item.title}
              className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-black/5 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.04)]"
            >
              <div
                aria-hidden="true"
                className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.06),transparent_70%)]"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-500">
                  {item.eyebrow}
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  0{index + 1}
                </div>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.body}
              </p>
              <div className="mt-5 rounded-[1.2rem] bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-slate-700">
                {index % 2 === 0
                  ? 'This shows up as a buyer-facing product advantage, not just an internal feature.'
                  : 'This reinforces that the system is operationally grounded as well as visually polished.'}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
