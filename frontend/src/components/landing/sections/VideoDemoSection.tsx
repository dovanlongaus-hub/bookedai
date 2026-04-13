import type { VideoDemoContent } from '../data';

type VideoDemoSectionProps = {
  content: VideoDemoContent;
};

export function VideoDemoSection({ content }: VideoDemoSectionProps) {
  return (
    <section id="video-demo" className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
      <div className="grid gap-8 rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.06)] lg:grid-cols-[1.05fr_0.95fr] lg:p-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
            {content.kicker}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {content.title}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {content.body}
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href={content.primaryHref}
              className="rounded-full bg-slate-950 px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
            >
              {content.primaryCta}
            </a>
            <a
              href={content.secondaryHref}
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
            >
              {content.secondaryCta}
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-[#fbfbfd] p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-sm font-semibold text-slate-950">Salon Demo Storyboard</div>
              <div className="mt-1 text-xs text-slate-500">
                Wedding haircut booking flow for tomorrow
              </div>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Ready
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {content.highlights.map((highlight, index) => (
              <div
                key={highlight}
                className="flex items-start gap-3 rounded-[1.4rem] border border-slate-200 bg-white p-4"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-700">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-600">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
