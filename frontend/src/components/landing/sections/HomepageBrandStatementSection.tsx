import { brandDescriptor, brandPositioning } from '../data';
import { BrandLockup } from '../ui/BrandLockup';
import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

export function HomepageBrandStatementSection() {
  return (
    <SectionShell
      id="brand-intro"
      className="pb-4 pt-3 sm:pb-6 sm:pt-4 lg:pb-8"
      width="wide"
    >
      <SectionCard className="relative overflow-hidden border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(248,251,255,0.96)_58%,rgba(243,247,252,0.98)_100%)] px-5 py-12 text-center shadow-[0_22px_72px_rgba(15,23,42,0.07)] sm:px-10 sm:py-[4.5rem] lg:px-16 lg:py-24">
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_56%)]" />
        <div className="absolute inset-x-10 bottom-0 h-44 bg-[radial-gradient(circle,rgba(15,23,42,0.08),transparent_65%)] blur-2xl" />
        <div className="absolute inset-4 rounded-[1.65rem] border border-white/70 sm:inset-[1.1rem] sm:rounded-[2rem]" />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center">
          <SignalPill
            variant="soft"
            className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#1459c7] sm:px-4 sm:text-[11px]"
          >
            BookedAI.au
          </SignalPill>

          <div className="mt-6 w-full sm:mt-8">
            <BrandLockup
              surface="light"
              className="justify-center"
              logoClassName="booked-brand-image booked-brand-image--hero-banner mx-auto w-full max-w-[18.5rem] sm:max-w-[33rem] lg:max-w-[45rem]"
              descriptorClassName="hidden"
              eyebrowClassName="hidden"
            />
          </div>

          <div className="mt-5 h-px w-20 bg-[linear-gradient(90deg,transparent,rgba(20,89,199,0.38),transparent)] sm:mt-7 sm:w-24" />

          <p className="mt-5 max-w-[38rem] text-[1.1rem] font-semibold leading-7 tracking-[-0.03em] text-[#1d1d1f] sm:mt-7 sm:text-[1.75rem] sm:leading-10">
            {brandDescriptor}
          </p>
          <p className="mt-3 max-w-[40rem] text-sm leading-6 text-black/64 sm:mt-4 sm:max-w-[44rem] sm:text-[1.08rem] sm:leading-8">
            {brandPositioning}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-7 sm:gap-2.5">
            {['Professional product surface', 'Clear commercial positioning', 'Launch-ready experience'].map((item) => (
              <SignalPill
                key={item}
                className="bg-white/82 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-black/58 shadow-[0_10px_20px_rgba(15,23,42,0.05)] sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.18em]"
              >
                {item}
              </SignalPill>
            ))}
          </div>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
