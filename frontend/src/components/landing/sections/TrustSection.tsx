import type { FAQItem, TrustItem } from '../data';
import { brandName } from '../data';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type TrustSectionProps = {
  items: TrustItem[];
  faqItems: FAQItem[];
};

const headingContent = {
  kicker: 'Proof',
  kickerClassName: 'text-emerald-600',
  title: `Real bookings. Real businesses. Live revenue running through ${brandName}.`,
  body: 'Operators using BookedAI to recover after-hours enquiries, route fit-aware suggestions, and post bookings to the audit ledger before the team even logs in.',
};

const trustSignals = [
  { label: 'Live tenants', value: '3 in production' },
  { label: 'Channels wired', value: '5 (web, SMS, WhatsApp, Telegram, email)' },
  { label: 'Booking → ledger', value: '< 30s' },
];

export function TrustSection({ items, faqItems }: TrustSectionProps) {
  return (
    <SectionShell id="trust" className="py-14 lg:py-16">
      <div className="grid gap-5 lg:grid-cols-[0.68fr_1.32fr]">
        <SectionCard className="border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fcfb_100%)] p-7 shadow-[0_22px_56px_rgba(15,23,42,0.05)] lg:p-8">
          <SectionHeading {...headingContent} />

          <div className="mt-8 grid gap-3">
            {trustSignals.map((item) => (
              <SectionCard key={item.label} as="article" tone="subtle" className="rounded-[1.35rem] border border-black/6 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                  {item.value}
                </div>
              </SectionCard>
            ))}
          </div>

          <SectionCard className="mt-5 rounded-[1.8rem] border border-black/6 bg-white p-5 shadow-apple-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-apple-blue">
              What buyers actually check
            </div>
            <div className="mt-3 text-xl font-semibold tracking-[-0.03em] text-apple-near-black">
              Concrete proof beats positioning.
            </div>
            <div className="mt-4 grid gap-3">
              {[
                'Live tenants you can open: chess.bookedai.au, futureswim.bookedai.au, ai-mentor.bookedai.au.',
                'Bookings posted to the audit ledger inside 30 seconds, with attribution to channel and source.',
                'Operators answer fewer manual questions per week; revenue stops leaking after-hours.',
              ].map((item) => (
                <div key={item} className="rounded-[1.05rem] border border-black/6 bg-white px-4 py-3 text-sm leading-6 text-black/72">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard className="overflow-hidden border border-black/6 bg-white p-6 shadow-[0_22px_56px_rgba(15,23,42,0.05)] lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-sm tracking-[0.14em]">Proof wall</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  Short proof that makes adoption feel safer.
                </div>
              </div>
              <SignalPill className="bg-emerald-50 px-3 py-1 text-xs uppercase tracking-[0.14em] text-emerald-700">
                Scan first
              </SignalPill>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {items.map((item, index) => (
                <SectionCard
                  key={item.name + item.business}
                  as="article"
                  tone="subtle"
                  className="flex h-full flex-col rounded-[1.45rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <SignalPill className="bg-white px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-600">
                      Customer cue
                    </SignalPill>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">“{item.quote}”</p>
                  <div className="mt-auto pt-6">
                    <div className="text-sm font-semibold text-slate-950">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.business}</div>
                  </div>
                </SectionCard>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="rounded-[2.2rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_22px_56px_rgba(15,23,42,0.05)] lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-sm tracking-[0.14em]">FAQ signal board</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  The questions that usually decide whether buyers move forward.
                </div>
              </div>
              <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                Short answers
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {faqItems.map((item) => (
                <SectionCard
                  key={item.question}
                  as="article"
                  tone="subtle"
                  className="flex h-full flex-col rounded-[1.45rem] border border-black/6 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
                </SectionCard>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </SectionShell>
  );
}
