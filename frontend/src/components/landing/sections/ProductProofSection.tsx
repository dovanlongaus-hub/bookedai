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
  const proofSignals = [
    {
      title: 'Respond',
      body: 'Lead stays warm.',
    },
    {
      title: 'Qualify',
      body: 'Less back-and-forth.',
    },
    {
      title: 'Convert',
      body: 'Clear booking path.',
    },
  ];

  return (
    <section id="solution" className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
      <div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-8 py-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Works across the channels service businesses already use
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
            <div className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
              <div className="grid gap-3">
                {proofSignals.map((item, index) => (
                  <div
                    key={item.title}
                    className="rounded-[1.35rem] border border-white/80 bg-white/90 px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">
                        {index + 1}
                      </div>
                      <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.5rem] bg-[#1d1d1f] p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2997ff]">
                  Conversion layer
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  A clearer booking story in one compact system.
                </div>
                <div className="mt-4 grid gap-3">
                  {[
                    'More live leads stay in play',
                    'Less front-desk repetition',
                    'A scalable SME software wedge',
                  ].map((line) => (
                    <div key={line} className="rounded-[1.1rem] bg-white/8 px-4 py-3 text-sm text-white/80">
                      {line}
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
                  ? 'Buyer-facing impact'
                  : 'Operational and investor-facing impact'}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
