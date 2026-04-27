import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

const deploymentModes = [
  {
    title: 'Standalone website',
    body: 'Launch BookedAI on the SME website first so customers can search, book, pay, and receive email confirmation without waiting for a larger portal rollout.',
  },
  {
    title: 'Dedicated customer app',
    body: 'Run a cleaner customer-facing booking app under the SME brand while keeping BookedAI coordination and follow-up underneath.',
  },
  {
    title: 'Linked full portal',
    body: 'Connect the launch flow into the wider BookedAI portal once the customer is ready for deeper team, tenant, and lifecycle flows.',
  },
];

const registerSteps = [
  'Scan the QR or open the registration path.',
  'Choose your deployment mode and service type.',
  'BookedAI continues with setup, free trial, and onboarding email flow.',
];

const qrTargetHref =
  'https://bookedai.au/register-interest?source_section=call_to_action&source_cta=start_free_trial&source_detail=homepage_qr&offer=launch10&deployment=standalone_website&setup=online';
const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrTargetHref)}`;

type RegisterInterestSectionProps = {
  onRegisterNow: () => void;
  onSecondaryAction: () => void;
  secondaryActionLabel?: string;
};

export function RegisterInterestSection({
  onRegisterNow,
  onSecondaryAction,
  secondaryActionLabel = 'Open Product Demo',
}: RegisterInterestSectionProps) {
  return (
    <SectionShell id="register-interest" className="py-14 lg:py-16">
      <SectionCard className="relative overflow-hidden p-7 lg:p-9">
        <div className="absolute inset-x-[15%] top-0 h-28 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.16),transparent_72%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.12),transparent_72%)] blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <SignalPill className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#1459c7]">
              Scan to register
            </SignalPill>
            <h2 className="mt-4 max-w-[12ch] text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-5xl">
              Join the first 10 SME customers with free online setup.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-black/68">
              The homepage should close with one obvious action. Scan the QR, register your
              business, start the trial, choose how you want to launch, and let BookedAI continue
              through setup, subscription, payment-ready flow, and confirmation email on a
              dedicated registration route owned by BookedAI.
            </p>

            <div className="mt-6 grid gap-3">
              {registerSteps.map((step, index) => (
                <SectionCard key={step} tone="subtle" className="flex items-start gap-4 rounded-[1.35rem] px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="text-sm leading-6 text-black/72">{step}</div>
                </SectionCard>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={onRegisterNow} className="booked-button">
                Claim Free Setup
              </button>
              <button
                type="button"
                onClick={onSecondaryAction}
                className="booked-button-secondary"
              >
                {secondaryActionLabel}
              </button>
              <a
                href="mailto:info@bookedai.au?subject=BookedAI%20SME%20Setup%20Registration"
                className="booked-button-secondary inline-flex items-center justify-center"
              >
                Email Registration
              </a>
            </div>
          </div>

          <div className="grid gap-5">
            <SectionCard className="rounded-[2rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="template-kicker text-[11px] tracking-[0.16em]">QR registration block</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                    Fastest path from homepage interest into BookedAI-owned onboarding.
                  </div>
                </div>
                <SignalPill className="bg-emerald-50 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-700">
                  Start from 49$+
                </SignalPill>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[0.46fr_0.54fr] lg:items-center">
                <div className="mx-auto w-full max-w-[16rem] rounded-[1.8rem] border border-black/8 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                  <img
                    src={qrImageSrc}
                    alt="QR code linking to BookedAI setup registration"
                    className="h-auto w-full rounded-[1.2rem]"
                    loading="lazy"
                  />
                </div>

                <div className="grid gap-3">
                  <SectionCard tone="subtle" className="rounded-[1.3rem] px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Starting price
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[#1d1d1f]">
                      Public plans now start from 49$+ for SMEs ready to launch.
                    </div>
                  </SectionCard>
                  <SectionCard tone="subtle" className="rounded-[1.3rem] px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Free experience
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[#1d1d1f]">
                      Start subscription today and get a 30-day free trial across BookedAI plans.
                    </div>
                  </SectionCard>
                  <SectionCard tone="subtle" className="rounded-[1.3rem] px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Commercial model
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[#1d1d1f]">
                      Setup is scoped clearly, then commission only applies to successful BookedAI-attributed bookings.
                    </div>
                  </SectionCard>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-4 md:grid-cols-3">
              {deploymentModes.map((mode) => (
                <SectionCard key={mode.title} tone="subtle" className="h-full rounded-[1.55rem] p-5">
                  <div className="text-sm font-semibold text-[#1d1d1f]">{mode.title}</div>
                  <p className="mt-3 text-sm leading-6 text-black/68">{mode.body}</p>
                </SectionCard>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
