import type { CallToActionContent } from '../data';

type CallToActionSectionProps = {
  content: CallToActionContent;
  onStartTrial: () => void;
};

export function CallToActionSection({
  content,
  onStartTrial,
}: CallToActionSectionProps) {
  return (
    <section id="demo" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
      <div className="rounded-[2.8rem] border border-black/5 bg-white px-8 py-16 text-center shadow-[0_32px_90px_rgba(15,23,42,0.08)] lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
          {content.kicker}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          {content.title}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          {content.body}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onStartTrial}
            className="rounded-full bg-slate-950 px-7 py-3.5 text-base font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.14)] transition hover:bg-slate-800"
          >
            {content.primaryCta}
          </button>
          <a
            href={content.secondaryHref}
            className="rounded-full border border-black/10 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
          >
            {content.secondaryCta}
          </a>
        </div>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500">
          {content.supportingText}
        </p>
      </div>
    </section>
  );
}
