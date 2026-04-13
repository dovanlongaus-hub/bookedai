import type { DemoContent, HeroContent } from '../data';

type HeroSectionProps = {
  content: HeroContent;
  demo: DemoContent;
  onStartTrial: () => void;
};

export function HeroSection({ content, demo, onStartTrial }: HeroSectionProps) {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-14 px-6 pb-24 pt-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-8 lg:pb-36 lg:pt-12">
      <div className="text-center lg:text-left">
        <div className="mb-5 inline-flex items-center rounded-full border border-black/5 bg-white/90 px-4 py-1.5 text-sm text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          {content.eyebrow}
        </div>
        <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-[-0.05em] text-slate-950 sm:text-6xl lg:mx-0 lg:text-8xl lg:leading-[0.92]">
          {content.title}
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 sm:mx-auto sm:text-xl lg:mx-0">
          <span className="font-semibold text-slate-950">{content.bodyLead}</span>{' '}
          {content.bodyRest}
        </p>
        <div className="mt-9 flex flex-col gap-4 sm:items-center sm:justify-center sm:flex-row lg:justify-start">
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
        <p className="mt-6 text-sm text-slate-500">{content.note}</p>
      </div>

      <div className="relative">
        <div className="absolute -inset-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.16),transparent_56%)] blur-3xl" />
        <div className="relative overflow-hidden rounded-[2.5rem] border border-black/5 bg-white/95 p-6 shadow-[0_35px_90px_rgba(15,23,42,0.10)]">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-rose-300" />
            <div className="h-3 w-3 rounded-full bg-amber-300" />
            <div className="h-3 w-3 rounded-full bg-emerald-300" />
          </div>
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">{demo.title}</div>
              <div className="mt-1 text-xs text-slate-500">{demo.subtitle}</div>
            </div>
            <div className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {demo.status}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-[1.35rem] rounded-br-md bg-slate-950 px-4 py-3 text-sm leading-6 text-white">
                {demo.messages[0]}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-[1.35rem] rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {demo.messages[1]}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-[1.35rem] rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {demo.messages[2]}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pl-1">
              {demo.slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
