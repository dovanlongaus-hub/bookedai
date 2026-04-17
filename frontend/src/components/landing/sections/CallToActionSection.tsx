import type { CallToActionContent } from '../data';

type CallToActionSectionProps = {
  content: CallToActionContent;
  onStartTrial: () => void;
  onBookDemo: () => void;
};

export function CallToActionSection({
  content,
  onStartTrial,
  onBookDemo,
}: CallToActionSectionProps) {
  const closeSignals = [
    'Reply fast',
    'Recommend clearly',
    'Book without friction',
  ];

  return (
    <section id="call-to-action" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
      <div className="template-card-dark relative overflow-hidden px-8 py-14 text-center lg:px-16 lg:py-16">
        <div
          aria-hidden="true"
          className="absolute inset-x-[18%] top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.24),transparent_72%)] blur-2xl"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">
            {content.kicker}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-6xl">
            {content.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/76">
            {content.body}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {closeSignals.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/84"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              'Works for salons, clinics, swim schools, tutors, trades, and more.',
              'Starts with one clean buying flow instead of a heavy rollout.',
              'Gives buyers a sharper reason to say yes right now.',
            ].map((item) => (
              <div key={item} className="rounded-[1.25rem] bg-white/8 px-4 py-4 text-sm leading-6 text-white/80">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onStartTrial}
              className="rounded-full bg-white px-7 py-3.5 text-base font-semibold text-slate-950 shadow-[0_20px_50px_rgba(255,255,255,0.12)] transition hover:bg-slate-100"
            >
              {content.primaryCta}
            </button>
            <button
              type="button"
              onClick={onBookDemo}
              className="rounded-full border border-white/12 bg-white/8 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/12"
            >
              {content.secondaryCta}
            </button>
          </div>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/58">
            {content.supportingText}
          </p>
        </div>
      </div>
    </section>
  );
}
