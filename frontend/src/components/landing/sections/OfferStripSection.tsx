import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

const offerCards = [
  {
    label: 'Starting price',
    value: '49$+',
    body: 'A clear public entry point for SMEs ready to launch a real BookedAI booking flow.',
  },
  {
    label: 'Trial path',
    value: '30-day free trial',
    body: 'Every public package can start with a low-friction BookedAI trial before a paid rollout.',
  },
  {
    label: 'Performance model',
    value: '6% on successful bookings',
    body: 'Commission applies only when a real completed booking is directly attributable to BookedAI.',
  },
];

type OfferStripSectionProps = {
  onStartTrial: () => void;
  onSeePricing: () => void;
};

export function OfferStripSection({ onStartTrial, onSeePricing }: OfferStripSectionProps) {
  return (
    <SectionShell id="offer-strip" className="py-6 lg:py-8">
      <SectionCard className="overflow-hidden px-5 py-5 lg:px-6 lg:py-6">
        <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div className="max-w-2xl">
            <SignalPill className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#1459c7]">
              Commercial snapshot
            </SignalPill>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-3xl">
              One fast scan should explain the offer, the trial, and the buying model.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-black/66 sm:text-base">
              Keep the homepage clean, premium, and easy to trust. Buyers should understand the
              starting price immediately, then choose whether to register now or review pricing.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={onStartTrial} className="booked-button">
                Start Free Trial
              </button>
              <button type="button" onClick={onSeePricing} className="booked-button-secondary">
                See Pricing
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {offerCards.map((card) => (
              <SectionCard
                key={card.label}
                as="article"
                tone="subtle"
                className="h-full rounded-[1.45rem] px-4 py-4"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {card.label}
                </div>
                <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  {card.value}
                </div>
                <p className="mt-2 text-sm leading-6 text-black/66">{card.body}</p>
              </SectionCard>
            ))}
          </div>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
