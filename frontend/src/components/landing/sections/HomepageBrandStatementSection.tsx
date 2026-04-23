import { brandDescriptor, brandPositioning } from '../data';
import { BrandLockup } from '../ui/BrandLockup';
import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';

export function HomepageBrandStatementSection() {
  const proofPills = [
    'Revenue operating layer',
    'Enterprise-style visibility',
    'Booking continuity',
    'Scale-ready posture',
  ];

  return (
    <SectionShell
      id="brand-intro"
      className="pb-2 pt-2 sm:pb-4 sm:pt-3 lg:pb-5"
      width="wide"
    >
      <SectionCard className="relative overflow-hidden border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,251,255,0.98)_58%,rgba(243,247,252,0.99)_100%)] px-5 py-8 shadow-[0_22px_72px_rgba(15,23,42,0.07)] sm:px-10 sm:py-12 lg:px-16 lg:py-14">
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_56%)]" />
        <div className="absolute inset-x-10 bottom-0 h-44 bg-[radial-gradient(circle,rgba(15,23,42,0.08),transparent_65%)] blur-2xl" />
        <div className="absolute inset-4 rounded-[1.65rem] border border-white/70 sm:inset-[1.1rem] sm:rounded-[2rem]" />

        <div className="relative grid gap-6 lg:grid-cols-[1.18fr_0.82fr] lg:items-center">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              BookedAI operating system
            </div>
            <BrandLockup
              surface="light"
              className="justify-start"
              logoClassName="booked-brand-image booked-brand-image--hero-banner w-full max-w-[20rem] sm:max-w-[32rem] lg:max-w-[44rem]"
              descriptorClassName="hidden"
              eyebrowClassName="hidden"
              showEyebrow={false}
            />
            <div className="mt-5 h-px w-24 bg-[linear-gradient(90deg,rgba(20,89,199,0.38),transparent)] sm:w-28" />
            <p className="mt-5 max-w-[40rem] text-[1.06rem] font-semibold leading-7 tracking-[-0.03em] text-[#1d1d1f] sm:text-[1.55rem] sm:leading-9">
              {brandDescriptor}
            </p>
            <p className="mt-3 max-w-[42rem] text-sm leading-6 text-black/64 sm:mt-4 sm:text-[1rem] sm:leading-7">
              {brandPositioning}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {proofPills.map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-white/85 bg-white/86 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {[
              {
                label: 'What the homepage should signal',
                value: 'A serious operating product with workflow depth and commercial clarity',
              },
              {
                label: 'What the investor should see',
                value: 'A scalable control layer, not only a conversational UI',
              },
              {
                label: 'What the operator should understand',
                value: 'This can sit inside real service operations, not only product demos',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.35rem] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-950">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
